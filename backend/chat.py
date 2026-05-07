"""LLM-driven chat for filling in the Mutual NDA template.

Uses LiteLLM via OpenRouter, routed to Cerebras as the inference provider,
with Pydantic Structured Outputs.
"""

from __future__ import annotations

import json
from typing import Literal

from litellm import completion
from pydantic import BaseModel

MODEL = "openrouter/openai/gpt-oss-120b"
EXTRA_BODY = {"provider": {"order": ["cerebras"]}}

NDA_FIELDS: list[dict] = [
    {"name": "party_a_name", "label": "Party A Name", "type": "text"},
    {"name": "party_a_address", "label": "Party A Address", "type": "text"},
    {"name": "party_b_name", "label": "Party B Name", "type": "text"},
    {"name": "party_b_address", "label": "Party B Address", "type": "text"},
    {"name": "effective_date", "label": "Effective Date", "type": "date (YYYY-MM-DD)"},
    {"name": "purpose", "label": "Purpose of Disclosure", "type": "text"},
    {"name": "confidentiality_period_years", "label": "Confidentiality Period (Years)", "type": "integer"},
    {"name": "governing_law_state", "label": "Governing Law (State / Country)", "type": "text"},
]


class ChatMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: str


class ChatRequest(BaseModel):
    messages: list[ChatMessage]
    values: dict[str, str]


class ChatResponse(BaseModel):
    message: str
    extracted_fields: dict[str, str]
    complete: bool


def build_system_prompt(values: dict[str, str]) -> str:
    """System prompt describing the field schema and current state."""
    field_lines = "\n".join(
        f"- {f['name']} ({f['type']}): {f['label']}" for f in NDA_FIELDS
    )
    filled = {k: v for k, v in values.items() if v}
    missing = [f["name"] for f in NDA_FIELDS if not values.get(f["name"])]
    return (
        "You help a user draft a Mutual Non-Disclosure Agreement by chatting with them. "
        "Ask short, friendly questions to gather these fields:\n"
        f"{field_lines}\n\n"
        f"Already filled: {json.dumps(filled)}\n"
        f"Still missing: {missing}\n\n"
        "Rules:\n"
        "1. On the first turn (no prior user messages) greet briefly and ask for the next missing field.\n"
        "2. After each user reply, extract any field values they provided into `extracted_fields` "
        "(keys must exactly match the field names above). Use ISO YYYY-MM-DD for dates and digits for numbers.\n"
        "3. Then ask for the next missing field, one or two at a time.\n"
        "4. If all fields are filled, set `complete` to true and tell the user the document is ready to download.\n"
        "5. Keep messages short and conversational."
    )


def run_chat(req: ChatRequest) -> ChatResponse:
    """Call the LLM and return a structured chat response."""
    messages = [{"role": "system", "content": build_system_prompt(req.values)}]
    messages.extend(m.model_dump() for m in req.messages)

    response = completion(
        model=MODEL,
        messages=messages,
        response_format=ChatResponse,
        reasoning_effort="low",
        extra_body=EXTRA_BODY,
    )
    raw = response.choices[0].message.content
    return ChatResponse.model_validate_json(raw)
