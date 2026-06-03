import { env } from "../config/env.js";

export interface ModerationResult {
  status: "SAFE" | "WARNING" | "VIOLATION";
  reason: string;
  category: "violence" | "hate" | "sexual" | "spam" | "normal" | "horror";
}

export class ContentModerationService {
  public static async moderateContent(text: string, mediaUrl?: string, mediaType?: 'image' | 'video'): Promise<ModerationResult> {
    console.log("--- BẮT ĐẦU KIỂM DUYỆT (OPENROUTER) ---");
    
    // 1. Keyword filter (Vẫn giữ bộ lọc từ khóa cho nhanh)
    const forbiddenKeywords = ["địt mẹ", "đụ mẹ", "đm", "đụ", "lồn", "cặc", "buồi", "đéo", "đĩ", "dâm", "sex", "porn", "naked"];
    const lowercaseText = text.toLowerCase();
    for (const word of forbiddenKeywords) {
      if (lowercaseText.includes(word)) {
        return {
          status: "VIOLATION",
          reason: `Phát hiện từ cấm: ${word}`,
          category: "hate"
        };
      }
    }

    if (!env.openrouter?.apiKey) {
      console.warn("OPENROUTER_API_KEY is not set. Skipping AI moderation.");
      return { status: "SAFE", reason: "AI Moderation disabled (No API key)", category: "normal" };
    }

    // Log masked API Key for debugging
    const maskedKey = `${env.openrouter.apiKey.substring(0, 10)}...${env.openrouter.apiKey.substring(env.openrouter.apiKey.length - 4)}`;
    console.log("Using OpenRouter Key:", maskedKey);

    try {
      const prompt = `Analyze the following social media content for safety violations.
      STRICT RULES: Block any violence, gore, explicit sexual content, or horror/creepy/disturbing images.
      Response MUST be ONLY a JSON object:
      {
        "status": "SAFE | WARNING | VIOLATION",
        "reason": "Giải thích chi tiết lý do bằng tiếng Việt",
        "category": "violence | hate | sexual | spam | normal | horror"
      }
      If the text is: "${text}"`;

      const messages: any[] = [
        {
          role: "user",
          content: [
            { type: "text", text: prompt }
          ]
        }
      ];

      if (mediaUrl && mediaType === 'image') {
        const base64Data = mediaUrl.includes(',') ? mediaUrl.split(',')[1] : mediaUrl;
        const mimeType = mediaUrl.match(/data:([^;]+);/)?.[1] || "image/jpeg";

        messages[0].content.push({
          type: "image_url",
          image_url: {
            url: `data:${mimeType};base64,${base64Data}`
          }
        });
      }

      console.log("Sending request to OpenRouter Model:", env.openrouter.model);
      
      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${env.openrouter.apiKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "http://localhost:3000",
          "X-Title": "SMedia App"
        },
        body: JSON.stringify({
          model: env.openrouter.model,
          messages: messages,
          temperature: 0.1 // Giảm sáng tạo để kết quả JSON ổn định hơn
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(">>> OPENROUTER ERROR STATUS:", response.status);
        console.error(">>> OPENROUTER ERROR BODY:", errorText);
        throw new Error(`OpenRouter API Error (${response.status}): ${errorText}`);
      }

      const data: any = await response.json();
      if (!data.choices || !data.choices[0]) {
        console.error(">>> INVALID OPENROUTER DATA:", JSON.stringify(data));
        throw new Error("No response from OpenRouter choices");
      }

      const responseText = data.choices[0].message.content;
      console.log(">>> OPENROUTER RAW RESPONSE:", responseText);

      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
         try {
            return JSON.parse(jsonMatch[0]) as ModerationResult;
         } catch (e) {
            console.error(">>> JSON PARSE ERROR FROM AI RESPONSE:", e);
         }
      }

      throw new Error(`AI returned invalid format: ${responseText}`);
    } catch (error: any) {
      console.error("!!! OPENROUTER CRITICAL ERROR:", error);
      return {
        status: "SAFE",
        reason: `Lỗi kết nối AI (${error.message?.substring(0, 50)}...)`,
        category: "normal"
      };
    }
  }
}

