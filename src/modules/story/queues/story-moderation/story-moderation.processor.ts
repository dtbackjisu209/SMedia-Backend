import type { Job } from 'bullmq';
import { env } from '../../../../core/config/env.js';
import { AppDataSource } from '../../../../data-source.js';
import { Story } from '../../../../database/entity/story.entity.js';
import { StoryView } from '../../../../database/entity/storyView.entity.js';
import notificationService from '../../../notification/notification.service.js';
import type { StoryModerationJobData } from './story-moderation.dto.js';

type GeminiModerationResult = {
	violated: boolean;
	reasons: string[];
	confidence: number;
};

type GeminiPart =
	| { text: string }
	| { inlineData: { mimeType: string; data: string } };

const MODERATION_PROMPT = `Kiem tra toan bo noi dung cua story: caption va anh/video dinh kem.
Chi can 1 thanh phan vi pham thi STORY VI PHAM.

Yeu to vi pham:
- Bao luc, mau me, kinh di
- Khieu dam, 18+, goi duc
- Ngon tu thu dich, xuc pham
- Thong tin sai lech, lua dao, scam
- Spam, quang cao trai phep

Chi tra ve JSON dung schema:
{
  "violated": true/false,
  "reasons": ["ly do cu the neu co"],
  "confidence": 0.0-1.0
}`;

const normalizeModerationResult = (value: unknown): GeminiModerationResult => {
	const record = value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
	const reasons = Array.isArray(record.reasons)
		? record.reasons.filter((reason): reason is string => typeof reason === 'string')
		: [];
	const confidence = typeof record.confidence === 'number' ? record.confidence : 0;

	return {
		violated: record.violated === true,
		reasons,
		confidence: Math.max(0, Math.min(1, confidence)),
	};
};

const extractJsonObject = (text: string): unknown => {
	try {
		return JSON.parse(text);
	} catch {
		const match = text.match(/\{[\s\S]*\}/);
		if (!match) {
			throw new Error('Gemini response did not contain a JSON object');
		}
		return JSON.parse(match[0]);
	}
};

const fetchMediaAsGeminiPart = async (
	mediaUrl: string,
	fallbackType: 'image' | 'video',
): Promise<GeminiPart> => {
	const response = await fetch(mediaUrl);
	if (!response.ok) {
		throw new Error(`Failed to fetch media for moderation: ${response.status} ${response.statusText}`);
	}

	const mimeType = response.headers.get('content-type')?.split(';')[0]?.trim()
		|| (fallbackType === 'video' ? 'video/mp4' : 'image/jpeg');
	const data = Buffer.from(await response.arrayBuffer()).toString('base64');

	return {
		inlineData: {
			mimeType,
			data,
		},
	};
};

const callGeminiModeration = async (data: StoryModerationJobData): Promise<GeminiModerationResult> => {
	if (!env.gemini.apiKey) {
		throw new Error('Missing GEMINI_API_KEY');
	}

	const mediaPart = await fetchMediaAsGeminiPart(data.mediaUrl, data.mediaType);
	const parts: GeminiPart[] = [
		{ text: MODERATION_PROMPT },
		{
			text: JSON.stringify({
				storyId: data.storyId,
				caption: data.caption ?? '',
				media: {
					mediaType: data.mediaType,
					mediaUrl: data.mediaUrl,
				},
			}),
		},
		mediaPart,
	];

	const response = await fetch(
		`https://generativelanguage.googleapis.com/v1beta/models/${env.gemini.model}:generateContent?key=${env.gemini.apiKey}`,
		{
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({
				contents: [
					{
						role: 'user',
						parts,
					},
				],
				generationConfig: {
					temperature: 0,
					responseMimeType: 'application/json',
				},
			}),
		},
	);

	if (!response.ok) {
		const body = await response.text();
		throw new Error(`Gemini moderation failed: ${response.status} ${body}`);
	}

	const json = await response.json() as {
		candidates?: Array<{
			content?: {
				parts?: Array<{ text?: string }>;
			};
		}>;
	};
	const text = json.candidates?.[0]?.content?.parts
		?.map((part) => part.text ?? '')
		.join('')
		.trim();

	if (!text) {
		throw new Error('Gemini moderation returned an empty response');
	}

	return normalizeModerationResult(extractJsonObject(text));
};

export const processStoryModeration = async (job: Job<StoryModerationJobData>): Promise<void> => {
	const moderation = await callGeminiModeration(job.data);
	if (!moderation.violated) {
		return;
	}

	const storyRepository = AppDataSource.getRepository(Story);
	const story = await storyRepository.findOne({
		where: { id: job.data.storyId },
		relations: ['user'],
	});
	if (!story) {
		return;
	}

	await AppDataSource.transaction(async (manager) => {
		await manager.getRepository(StoryView).delete({ story_id: story.id });
		await manager.getRepository(Story).remove(story);
	});

	await notificationService.notifyStoryRemovedForCommunityViolation(story.user.id, story.id);

	console.log('[story-moderation] story removed for community violation:', {
		storyId: job.data.storyId,
		authorId: story.user.id,
		reasons: moderation.reasons,
		confidence: moderation.confidence,
	});
};
