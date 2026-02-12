import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";

const MODERATION_PROMPT = `You are a content moderation classifier. Analyze the following user message and classify it.

Respond ONLY with valid JSON in this exact format, nothing else:
{
  "safe": true/false,
  "toxicityScore": 0-100,
  "category": "safe" | "sexual_content" | "harassment" | "abusive_language",
  "reason": "brief explanation"
}

Rules:
- "safe": true if the message is appropriate, false if it violates any category.
- "toxicityScore": 0 = completely safe, 100 = extremely toxic. Scale proportionally.
- "category": the primary violation category, or "safe" if no violation.
- "reason": one short sentence explaining the classification.

Be strict about:
- Sexual or explicit content → category: "sexual_content"
- Bullying, threats, intimidation → category: "harassment"  
- Slurs, hate speech, profanity, insults → category: "abusive_language"

Be lenient about:
- Casual conversation, slang, mild humor
- Discussions about sensitive topics in an educational/informative way

User message to classify:
"""
{{MESSAGE}}
"""`;

export async function POST(request: NextRequest) {
    try {
        // Validate API key
        if (!GEMINI_API_KEY) {
            // If no API key configured, pass all messages as safe (dev mode)
            return NextResponse.json({
                safe: true,
                toxicityScore: 0,
                category: "safe",
                reason: "Moderation API key not configured — allowing all messages.",
            });
        }

        const body = await request.json();
        const { message } = body;

        if (!message || typeof message !== "string") {
            return NextResponse.json(
                { error: "Missing or invalid 'message' field." },
                { status: 400 }
            );
        }

        // Don't moderate empty/very short messages
        if (message.trim().length < 2) {
            return NextResponse.json({
                safe: true,
                toxicityScore: 0,
                category: "safe",
                reason: "Message too short to moderate.",
            });
        }

        const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        const prompt = MODERATION_PROMPT.replace("{{MESSAGE}}", message);

        const result = await model.generateContent(prompt);
        const response = result.response;
        const text = response.text().trim();

        // Parse the JSON response from Gemini
        // Strip markdown code fences if present
        const jsonString = text
            .replace(/^```json\s*/i, "")
            .replace(/^```\s*/i, "")
            .replace(/\s*```$/i, "")
            .trim();

        const parsed = JSON.parse(jsonString);

        return NextResponse.json({
            safe: Boolean(parsed.safe),
            toxicityScore: Math.min(100, Math.max(0, Number(parsed.toxicityScore) || 0)),
            category: parsed.category || "safe",
            reason: parsed.reason || "",
        });
    } catch (error) {
        console.error("[Moderation API] Error:", error);

        // On error, fail open (allow message) to avoid blocking users
        return NextResponse.json({
            safe: true,
            toxicityScore: 0,
            category: "safe",
            reason: "Moderation check failed — message allowed by default.",
        });
    }
}
