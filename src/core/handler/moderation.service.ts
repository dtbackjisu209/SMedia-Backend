import { GoogleGenerativeAI } from "@google/generative-ai";
import { env } from "../config/env.js";

const genAI = new GoogleGenerativeAI(env.gemini.apiKey || "");

export interface ModerationResult {
  status: "SAFE" | "WARNING" | "VIOLATION";
  reason: string;
  category: "violence" | "hate" | "sexual" | "spam" | "normal";
}

export class ContentModerationService {
  private static model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-latest" });

  public static async moderateContent(text: string, mediaUrl?: string, mediaType?: 'image' | 'video'): Promise<ModerationResult> {
    console.log("Checking content for moderation:", text);
    
    // 1. Keyword filter (Fast, no API needed)
    const forbiddenKeywords = [ "chửi thề", "bạo lực", "máu me", "tình dục", "phân biệt chủng tộc", "kỳ thị", "quấy rối" ,"địt mẹ", "đụ mẹ", "đm", "đụ", "lồn", "cặc", "buồi", "đéo", "đĩ", "dâm", "loz", "tl", "cc"];
    const lowercaseText = text.toLowerCase();
    for (const word of forbiddenKeywords) {
      if (lowercaseText.includes(word)) {
        console.log("Violation detected by keyword filter:", word);
        return {
          status: "VIOLATION",
          reason: `Phát hiện từ cấm: ${word}`,
          category: "hate"
        };
      }
    }

    // 2. AI Moderation
    if (!env.gemini.apiKey) {
      console.warn("GEMINI_API_KEY is not set. Content moderation skipped.");
      return { status: "WARNING", reason: "AI Moderation skipped (no API key)", category: "normal" };
    }

    try {
      let prompt = `Analyze the following social media content (text and potentially an image/video) for safety violations.
      Strictly detect: offensive language, profanity, violence (bạo lực), Gore (máu me), sexual content (kêu dâm, đồi trụy), hate speech, and DISTURBING/HORROR content (kinh dị, đáng sợ) in Vietnamese or English.
      If the media contains nudity, sexually suggestive poses, explicit content, OR extreme horror/disturbing imagery, it MUST be marked as VIOLATION.
      
      Response must be ONLY a JSON object:
      {
        "status": "SAFE | WARNING | VIOLATION",
        "reason": "Giải thích ngắn gọn bằng tiếng Việt",
        "category": "violence | hate | sexual | spam | normal"
      }

      Violation Rules:
      - VIOLATION if: Contains profanity (chửi thề), violent threats, graphic violence, explicit sexual content/nudity, or highly disturbing/shoking horror imagery.
      - WARNING if: Harassment, slightly inappropriate, or mild horror/creepy content.
      - SAFE if: Normal friendly content.

      Text: "${text}"
      `;

      const parts: any[] = [{ text: prompt }];

      if (mediaUrl && (mediaType === 'image' || mediaType === 'video')) {
        const base64Data = mediaUrl.includes(',') ? mediaUrl.split(',')[1] : mediaUrl;
        parts.push({
          inlineData: {
            mimeType: mediaType === 'image' ? "image/jpeg" : "video/mp4",
            data: base64Data
          }
        });
      }

      const result = await this.model.generateContent({ contents: [{ role: "user", parts }] });
      const response = await result.response;
      const responseText = response.text();
      
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]) as ModerationResult;
        console.log("AI Moderation Result:", parsed);
        return parsed;
      }
      
      throw new Error("Invalid response format from Gemini");
    } catch (error) {
      console.error("Gemini Moderation Error details:", error);
      return {
        status: "WARNING",
        reason: "Không thể kiểm duyệt bằng AI",
        category: "normal"
      };
    }
  }

}

