"use client";

import { useEffect, useRef, useState } from "react";
import { sendChat, type ChatMessage } from "@/lib/chat";

interface Props {
  values: Record<string, string>;
  onExtract: (extracted: Record<string, string>) => void;
}

export default function NdaChat({ values, onExtract }: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const greetedRef = useRef(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  async function exchange(history: ChatMessage[]) {
    setLoading(true);
    setError(null);
    try {
      const res = await sendChat(history, values);
      if (Object.keys(res.extracted_fields).length > 0) {
        onExtract(res.extracted_fields);
      }
      setMessages([...history, { role: "assistant", content: res.message }]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Chat failed");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (greetedRef.current) return;
    greetedRef.current = true;
    void exchange([]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (el && typeof el.scrollTo === "function") {
      el.scrollTo({ top: el.scrollHeight });
    }
  }, [messages, loading]);

  async function handleSend() {
    const text = input.trim();
    if (!text || loading) return;
    setInput("");
    const next: ChatMessage[] = [...messages, { role: "user", content: text }];
    setMessages(next);
    await exchange(next);
  }

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-gray-200 px-6 py-3">
        <h2 className="text-lg font-semibold text-gray-900">Chat with assistant</h2>
        <p className="text-xs text-gray-500">Tell the AI about your NDA — fields will fill in automatically.</p>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
        {messages.map((m, i) => (
          <div
            key={i}
            className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
              m.role === "user"
                ? "ml-auto bg-blue-600 text-white"
                : "mr-auto bg-gray-100 text-gray-900"
            }`}
          >
            {m.content}
          </div>
        ))}
        {loading && (
          <div className="mr-auto rounded-lg bg-gray-100 px-3 py-2 text-sm text-gray-500">…</div>
        )}
        {error && <div className="text-sm text-red-600">{error}</div>}
      </div>

      <div className="border-t border-gray-200 px-6 py-3">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void handleSend();
          }}
          className="flex gap-2"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type your reply…"
            disabled={loading}
            className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Send
          </button>
        </form>
      </div>
    </div>
  );
}
