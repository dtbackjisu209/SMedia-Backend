import { GoogleGenerativeAI } from "@google/generative-ai";
import { env } from "../config/env.js";

const genAI = new GoogleGenerativeAI(env.gemini.apiKey || "");

export interface ModerationResult {
  status: "SAFE" | "WARNING" | "VIOLATION";
  reason: string;
  category: "violence" | "hate" | "sexual" | "spam" | "normal";
}

export class ContentModerationService {
  private static model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

  public static async moderateContent(text: string, mediaUrl?: string, mediaType?: 'image' | 'video'): Promise<ModerationResult> {
    if (!env.gemini.apiKey) {
      console.warn("GEMINI_API_KEY is not set. Content moderation skipped.");
      return { status: "SAFE", reason: "Moderation skipped", category: "normal" };
    }

    try {
      let prompt = `Analyze the following content for a social media story and classify it according to safety guidelines.
      Response must be in JSON format:
      {
        "status": "SAFE | WARNING | VIOLATION",
        "reason": "Brief explanation in Vietnamese",
        "category": "violence | hate | sexual | spam | normal"
      }

      Content rules:
      - SAFE: Normal content, no issues.
      - WARNING: Sensitive content, mildly controversial, or borderline but not clearly violating.
      - VIOLATION: Explicit violence, hate speech, sexual content, or severe spam.

      Text to analyze: "${text}"
      `;

      const contents: any[] = [{ role: "user", parts: [{ text: prompt }] }];
      
      const result = await this.model.generateContent(contents);
      const response = await result.response;
      const responseText = response.text();
      
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]) as ModerationResult;
      }
      
      throw new Error("Invalid response format from Gemini");
    } catch (error) {
      console.error("Gemini Moderation Error:", error);
      return { status: "SAFE", reason: "Error during moderation", category: "normal" };
    }
  }
}
