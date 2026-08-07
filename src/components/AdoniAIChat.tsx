"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { FiLoader, FiSend, FiX } from "react-icons/fi";

type Message = {
  id: string;
  role: "assistant" | "user";
  content: string;
  timestamp: string;
};

const STORAGE_KEY = "adoni-ai-chat-history";

export default function AdoniAIChat() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const endRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as Message[];
        if (Array.isArray(parsed) && parsed.length > 0) {
          setMessages(parsed);
          return;
        }
      }
    } catch {
      // Ignore malformed saved history
    }

    setMessages([
      {
        id: crypto.randomUUID(),
        role: "assistant",
        content:
          "Hello! I’m  AI, your premium learning assistant for Adonay TikTok Academy. I can help with courses, enrollment, lessons, payments, and student support.",
        timestamp: new Date().toLocaleTimeString([], {
          hour: "numeric",
          minute: "2-digit",
        }),
      },
    ]);
  }, []);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
    if (messages.length > 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
    }
  }, [messages]);

  const lastMessage = useMemo(() => messages[messages.length - 1], [messages]);

  async function handleSubmit(event?: React.FormEvent) {
    event?.preventDefault();

    const trimmed = input.trim();
    if (!trimmed || isLoading) return;

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: trimmed,
      timestamp: new Date().toLocaleTimeString([], {
        hour: "numeric",
        minute: "2-digit",
      }),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: trimmed,
          history: messages.slice(-8),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "The assistant could not respond right now.",
        );
      }

      const assistantMessage: Message = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: data.reply || "I’m here and ready to help.",
        timestamp: new Date().toLocaleTimeString([], {
          hour: "numeric",
          minute: "2-digit",
        }),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content:
            "I’m temporarily unavailable, but your request is important. Please try again in a moment or contact support directly.",
          timestamp: new Date().toLocaleTimeString([], {
            hour: "numeric",
            minute: "2-digit",
          }),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="fixed bottom-20 right-3 z-50 flex flex-col items-end gap-3 sm:bottom-6 sm:right-6 md:bottom-6 lg:bottom-6">
      {isOpen ? (
        <div className="w-[min(92vw,420px)] overflow-hidden rounded-[24px] border border-[#e5d6b1] bg-white/95 shadow-[0_25px_90px_rgba(0,0,0,0.18)] backdrop-blur-xl dark:border-[#334155] dark:bg-[#111827]/95">
          <div className="flex items-center justify-between border-b border-[#f1e5c0] bg-gradient-to-r from-[#0f172a] via-[#1b2a4a] to-[#a30000] px-4 py-3 text-white dark:border-[#334155]">
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-white/15">
                <img
                  src="/logo-adlms.jpg"
                  alt="Adonay TikTok Academy"
                  className="h-full w-full object-cover"
                />
              </div>
              <div>
                <p className="text-sm font-semibold">AI</p>
                <p className="text-[11px] text-white/80">
                  Professional support • Instant answers
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="rounded-full p-2 text-white/90 transition hover:bg-white/10"
              aria-label="Close chat"
            >
              <FiX className="text-sm" />
            </button>
          </div>

          <div className="flex max-h-[60vh] flex-col bg-[radial-gradient(circle_at_top_left,_rgba(163,0,0,0.04),_transparent_42%)] p-3 sm:max-h-[70vh]">
            <div className="flex-1 space-y-3 overflow-y-auto rounded-[18px] border border-[#efe5c8] bg-white/70 p-3 shadow-inner dark:border-[#334155] dark:bg-[#0f172a]/70">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl px-3 py-2.5 text-sm shadow-sm ${
                      message.role === "user"
                        ? "bg-gradient-to-r from-[#a30000] to-[#c22727] text-white"
                        : "bg-[#f8f7f2] text-[#172033] dark:bg-[#1f2937] dark:text-[#e5e7eb]"
                    }`}
                  >
                    <div className="mb-1 flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] opacity-70">
                      {message.role === "user" ? "You" : " AI"}
                      <span>•</span>
                      <span>{message.timestamp}</span>
                    </div>
                    <div className="prose prose-sm max-w-none break-words dark:prose-invert">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {message.content}
                      </ReactMarkdown>
                    </div>
                  </div>
                </div>
              ))}

              {isLoading ? (
                <div className="flex justify-start">
                  <div className="rounded-2xl bg-[#f8f7f2] px-3 py-2.5 text-sm text-[#172033] shadow-sm dark:bg-[#1f2937] dark:text-[#e5e7eb]">
                    <div className="flex items-center gap-2">
                      <FiLoader className="animate-spin" />
                      AI is crafting answer…
                    </div>
                  </div>
                </div>
              ) : null}
              <div ref={endRef} />
            </div>

            <form
              id="adoni-ai-form"
              onSubmit={handleSubmit}
              className="mt-3 flex items-end gap-2"
            >
              <label className="flex-1">
                <span className="sr-only">Type your message</span>
                <textarea
                  value={input}
                  onChange={(event) => setInput(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && !event.shiftKey) {
                      event.preventDefault();
                      handleSubmit();
                    }
                  }}
                  placeholder="Ask about courses, lessons, enrollment, or support…"
                  rows={2}
                  className="w-full resize-none rounded-2xl border border-[#d8b35f] bg-[#fffdf7] px-3 py-2.5 text-sm text-[#111827] shadow-sm outline-none transition placeholder:text-[#7c6b3d] focus:border-[#a30000] focus:ring-2 focus:ring-[#a30000]/20 dark:border-[#64748b] dark:bg-[#111827] dark:text-[#f8fafc] dark:placeholder:text-[#94a3b8]"
                />
              </label>
              <button
                type="submit"
                disabled={isLoading || !input.trim()}
                className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-r from-[#a30000] to-[#c22727] text-white shadow-lg transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-50"
                aria-label="Send message"
              >
                {isLoading ? <FiLoader className="animate-spin" /> : <FiSend />}
              </button>
            </form>
          </div>
        </div>
      ) : null}

      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="group flex items-center gap-3 rounded-full bg-gradient-to-r from-[#0f172a] via-[#1b2a4a] to-[#a30000] px-4 py-3 text-white shadow-[0_20px_60px_rgba(0,0,0,0.25)] transition hover:scale-[1.02]"
      >
        <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-white/15">
          <img
            src="/logo-adlms.jpg"
            alt="Adonay TikTok Academy"
            className="h-full w-full object-cover"
          />
        </div>
        <div className="text-left">
          <p className="text-sm font-semibold">AI</p>
        </div>
      </button>
    </div>
  );
}
