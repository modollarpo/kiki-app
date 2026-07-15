import { NextRequest, NextResponse } from "next/server";
import {
  AZURE_OPENAI_CONFIG,
  buildAzureOpenAIUrl,
  buildAzureOpenAIHeaders,
  selectModelForTask,
  SYSTEM_PROMPTS,
  type ModelTier,
} from "@/lib/azure-openai";

interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface ChatRequest {
  messages: ChatMessage[];
  model?: ModelTier;
  taskType?: "routing" | "classification" | "summarization" | "creative" | "analysis" | "general";
  maxTokens?: number;
  temperature?: number;
}

export async function POST(req: NextRequest) {
  try {
    const body: ChatRequest = await req.json();
    const { messages, model, taskType = "general", maxTokens, temperature } = body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: "Messages array is required" }, { status: 400 });
    }

    const selectedTier = model || selectModelForTask(taskType);
    const config = AZURE_OPENAI_CONFIG[selectedTier];

    // Build messages with system prompt if not included
    const systemMessage: ChatMessage = {
      role: "system",
      content: SYSTEM_PROMPTS.syncbrain,
    };
    const fullMessages = messages[0]?.role === "system" ? messages : [systemMessage, ...messages];

    const url = buildAzureOpenAIUrl(config.deploymentName);
    const headers = buildAzureOpenAIHeaders();

    const payload = {
      messages: fullMessages,
      max_tokens: maxTokens || config.maxTokens,
      temperature: temperature ?? 0.7,
      top_p: 0.95,
      frequency_penalty: 0,
      presence_penalty: 0,
    };

    const response = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error("Azure OpenAI error:", error);
      return NextResponse.json(
        { error: "AI service temporarily unavailable", detail: response.status },
        { status: 502 }
      );
    }

    const data = await response.json();
    const choice = data.choices?.[0];

    if (!choice) {
      return NextResponse.json({ error: "No response generated" }, { status: 500 });
    }

    return NextResponse.json({
      content: choice.message.content,
      model: config.modelName,
      usage: data.usage,
      finishReason: choice.finish_reason,
    });
  } catch (error) {
    console.error("Chat API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
