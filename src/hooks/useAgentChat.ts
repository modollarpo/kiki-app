"use client";
import { useState, useCallback, useRef } from "react";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  model?: string;
  tokens?: number;
  timestamp: Date;
}

interface UseAgentChatOptions {
  token?: string;
  initialMessage?: string;
}

export function useAgentChat(options: UseAgentChatOptions = {}) {
  const { token, initialMessage } = options;
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content: initialMessage || "I'm SyncBrain — your AI intelligence layer. Ask me anything about your advertising data.",
      timestamp: new Date(),
    },
  ]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim() || isStreaming) return;

    const userMsg: ChatMessage = { role: "user", content: content.trim(), timestamp: new Date() };
    setMessages(prev => [...prev, userMsg]);
    setIsStreaming(true);
    setError(null);

    // Cancel any in-flight request
    abortRef.current?.abort();
    abortRef.current = new AbortController();

    try {
      const chatHistory = messages.map(m => ({ role: m.role, content: m.content }));
      chatHistory.push({ role: "user", content: content.trim() });

      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          messages: chatHistory,
          taskType: content.toLowerCase().includes("creative")
            ? "creative"
            : content.toLowerCase().includes("analy")
              ? "analysis"
              : "general",
        }),
        signal: abortRef.current.signal,
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `Request failed: ${res.status}`);
      }

      const data = await res.json();

      setMessages(prev => [...prev, {
        role: "assistant",
        content: data.content,
        model: data.model,
        tokens: data.usage?.total_tokens,
        timestamp: new Date(),
      }]);
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") return;
      const msg = e instanceof Error ? e.message : "Unknown error";
      setError(msg);

      // Fallback message so the conversation doesn't break
      setMessages(prev => [...prev, {
        role: "assistant",
        content: `I encountered an issue processing that request: ${msg}. Please try again or rephrase your question.`,
        model: "error-fallback",
        timestamp: new Date(),
      }]);
    } finally {
      setIsStreaming(false);
    }
  }, [messages, token, isStreaming]);

  const clearMessages = useCallback(() => {
    setMessages([{
      role: "assistant",
      content: initialMessage || "I'm SyncBrain — your AI intelligence layer. Ask me anything about your advertising data.",
      timestamp: new Date(),
    }]);
    setError(null);
  }, [initialMessage]);

  const totalTokens = messages.reduce((sum, m) => sum + (m.tokens || 0), 0);

  return {
    messages,
    sendMessage,
    isStreaming,
    error,
    clearMessages,
    totalTokens,
  };
}
