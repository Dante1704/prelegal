const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface ChatResponse {
  message: string;
  selected_template_id: string | null;
  suggested_template_id: string | null;
  extracted_fields: Record<string, string>;
  complete: boolean;
}

export async function sendChat(
  messages: ChatMessage[],
  values: Record<string, string>,
  template_id: string | null
): Promise<ChatResponse> {
  const res = await fetch(`${API_BASE}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages, values, template_id }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.detail ?? "Chat request failed");
  }
  return res.json();
}
