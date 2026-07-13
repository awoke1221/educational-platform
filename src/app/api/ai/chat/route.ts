import { NextRequest, NextResponse } from "next/server";

const MODEL = process.env.DEEPSEEK_MODEL || "deepseek-chat";
const API_URL =
  process.env.DEEPSEEK_API_URL ||
  "https://api.deepseek.com/v1/chat/completions";

function buildSystemPrompt() {
  return `You are Adoni AI, an advanced, premium AI assistant for Adonay TikTok Academy.

Core behavior:
- Read the user's message carefully and identify the underlying intent before answering.
- Think in steps: understand the question, determine whether it is informational, procedural, or support-related, and respond accordingly.
- Be highly relevant, precise, and helpful.
- Prefer concise answers, but when the user needs guidance, provide structured, polished support.
- Use professional markdown formatting when useful, including short bullets, steps, and clear section headings.
- Speak with confidence, warmth, and clarity, like a senior customer success specialist.

Advanced reasoning rules:
- If the request is vague, ask one focused clarifying question instead of guessing.
- If the user asks about courses, enrollment, lessons, progress, certificates, payments, or platform access, answer directly and practically.
- If the user asks something unrelated to the platform, politely redirect them to Adonay TikTok Academy topics.
- Do not invent facts, course details, or private account information.
- Do not provide random suggestions that are not connected to the user's actual question.
- If the user appears frustrated, respond calmly and professionally.
- If the request is complex, break it into clear steps and make the answer easy to follow.

Platform context:
- Adonay TikTok Academy is an online learning platform where students can explore courses, enroll, access lessons, track progress, and receive support.
- Your job is to help users navigate this platform effectively and confidently.
- Keep every answer grounded in this website and its educational services.
`;
}

export async function POST(request: NextRequest) {
  try {
    const { message, history = [] } = await request.json();

    if (!message || typeof message !== "string") {
      return NextResponse.json(
        { error: "A message is required." },
        { status: 400 },
      );
    }

    const apiKey = process.env.DEEPSEEK_API_KEY?.trim();
    if (!apiKey) {
      return NextResponse.json(
        {
          error:
            "The AI assistant is not configured yet. Please add a DeepSeek API key.",
        },
        { status: 503 },
      );
    }

    const response = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: "system", content: buildSystemPrompt() },
          ...history.map((entry: { role: string; content: string }) => ({
            role: entry.role === "assistant" ? "assistant" : "user",
            content: entry.content,
          })),
          { role: "user", content: message },
        ],
        temperature: 0.65,
        max_tokens: 650,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json(
        {
          error: "The AI provider rejected the request.",
          details: errorText,
        },
        { status: response.status },
      );
    }

    const data = await response.json();
    const reply = data?.choices?.[0]?.message?.content?.trim();

    if (!reply) {
      return NextResponse.json(
        { error: "The AI provider returned an empty response." },
        { status: 502 },
      );
    }

    return NextResponse.json({ reply });
  } catch (error) {
    console.error("AI chat error", error);
    return NextResponse.json(
      { error: "The assistant encountered an unexpected error." },
      { status: 500 },
    );
  }
}
