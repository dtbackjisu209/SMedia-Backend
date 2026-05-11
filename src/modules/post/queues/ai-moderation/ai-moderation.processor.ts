import type { Job } from 'bullmq';
import { env } from '../../../../core/config/env.js';
import { AppDataSource } from '../../../../data-source.js';
import notificationService from '../../../notification/notification.service.js';
import postRepository from '../../post.repository.js';
import { enqueuePostDeleteCleanup } from '../post-delete/post-delete.producer.js';
import type { AiModerationJobData } from './ai-moderation.dto.js';

type GeminiModerationResult = {
	violated: boolean;
	reasons: string[];
	confidence: number;
};

type GeminiPart =
	| { text: string }
	| { inlineData: { mimeType: string; data: string } };

const MODERATION_PROMPT = `Kiem tra toan bo noi dung cua post: caption va tung anh/video.
Chi can 1 thanh phan vi pham thi TOAN BAI VI PHAM.

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

const callGeminiModeration = async (data: AiModerationJobData): Promise<GeminiModerationResult> => {
	if (!env.gemini.apiKey) {
		throw new Error('Missing GEMINI_API_KEY');
	}

	const mediaParts = await Promise.all(
		data.mediaItems.map((item) => fetchMediaAsGeminiPart(item.mediaUrl, item.mediaType)),
	);
	const parts: GeminiPart[] = [
		{ text: MODERATION_PROMPT },
		{
			text: JSON.stringify({
				postId: data.postId,
				caption: data.caption ?? '',
				media: data.mediaItems.map((item, index) => ({
					index,
					mediaType: item.mediaType,
					mediaUrl: item.mediaUrl,
				})),
			}),
		},
		...mediaParts,
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

export const processAiModeration = async (job: Job<AiModerationJobData>): Promise<void> => {
	const moderation = await callGeminiModeration(job.data);
	if (!moderation.violated) {
		return;
	}

	const candidate = await postRepository.getPostDeleteCandidate(job.data.postId);
	if (!candidate) {
		return;
	}

	await AppDataSource.transaction(async (manager) => {
		const deleted = await postRepository.deletePostGraphById(job.data.postId, manager);
		if (!deleted) {
			throw new Error(`Post ${job.data.postId} disappeared before moderation delete`);
		}
	});

	await enqueuePostDeleteCleanup({
		postId: job.data.postId,
		authorId: candidate.authorId,
		media: candidate.media,
		deletedAtIso: new Date().toISOString(),
	});

	await notificationService.notifyPostRemovedForCommunityViolation(
		candidate.authorId,
		job.data.postId,
	);

	console.log('[ai-moderation] post removed for community violation:', {
		postId: job.data.postId,
		authorId: candidate.authorId,
		reasons: moderation.reasons,
		confidence: moderation.confidence,
	});
};
