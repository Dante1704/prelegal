"""LLM-driven chat for selecting a legal-document template and filling it in.

Two stages, dispatched by whether `template_id` is set on the request:

- Selection: ask the user which document they want; suggest the closest
  supported template if they ask for something we don't have.
- Filling: gather field values for the chosen template.

Uses LiteLLM via OpenRouter, routed to Cerebras, with Pydantic Structured Outputs.
"""

from __future__ import annotations

import json
from typing import Literal

from litellm import completion
from pydantic import BaseModel

from templates import list_summaries, load_template

MODEL = "openrouter/openai/gpt-oss-120b"
EXTRA_BODY = {"provider": {"order": ["cerebras"]}}


class ChatMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: str


class ChatRequest(BaseModel):
    messages: list[ChatMessage]
    values: dict[str, str] = {}
    template_id: str | None = None


class ChatResponse(BaseModel):
    """Unified response shape across both stages.

    Selection-stage replies set `selected_template_id` or `suggested_template_id`.
    Filling-stage replies set `extracted_fields` and `complete`.
    """

    message: str
    selected_template_id: str | None = None
    suggested_template_id: str | None = None
    extracted_fields: dict[str, str] = {}
    complete: bool = False


def _build_select_prompt() -> str:
    """System prompt for the selection stage."""
    summaries = list_summaries()
    catalogue = "\n".join(
        f'- id="{t["id"]}", name="{t["name"]}", category={t["category"]}: {t["description"]}'
        for t in summaries
    )
    ids = [t["id"] for t in summaries]
    return (
        "You help a user pick a legal-document template to draft. "
        "We support exactly these templates:\n"
        f"{catalogue}\n\n"
        f"Valid ids: {ids}\n\n"
        "Rules:\n"
        "1. On the first turn (no prior user messages) greet briefly and ask what document they want.\n"
        "2. Once the user names a document, decide:\n"
        "   - If it clearly matches one of the supported ids, set `selected_template_id` to that id "
        "and reply with a short confirmation like 'Great — let's draft a <name>.'\n"
        "   - If it does NOT match anything we support, set `selected_template_id` to null and "
        "set `suggested_template_id` to the closest supported id. Explain briefly that we "
        "can't generate that specific document, but offer the closest one we can.\n"
        "   - If the request is ambiguous (e.g. just 'a contract'), ask a clarifying question "
        "and leave both ids null.\n"
        "3. Keep `extracted_fields` empty and `complete` false in this stage.\n"
        "4. Keep messages short and friendly."
    )


def _build_fill_prompt(template: dict, values: dict[str, str]) -> str:
    """System prompt for the filling stage, driven by the template's fields."""
    field_lines = "\n".join(
        f"- {f['name']} ({f['type']}): {f['label']}" for f in template["fields"]
    )
    filled = {k: v for k, v in values.items() if v}
    missing = [f["name"] for f in template["fields"] if not values.get(f["name"])]
    return (
        f"You help a user draft a {template['name']} by chatting with them. "
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
        "5. Keep `selected_template_id` and `suggested_template_id` null in this stage.\n"
        "6. Keep messages short and conversational."
    )


def _call_llm(system_prompt: str, history: list[ChatMessage]) -> ChatResponse:
    messages = [{"role": "system", "content": system_prompt}]
    messages.extend(m.model_dump() for m in history)
    response = completion(
        model=MODEL,
        messages=messages,
        response_format=ChatResponse,
        reasoning_effort="low",
        extra_body=EXTRA_BODY,
    )
    return ChatResponse.model_validate_json(response.choices[0].message.content)


def run_chat(req: ChatRequest) -> ChatResponse:
    """Dispatch to the selection or filling stage based on `template_id`."""
    if req.template_id is None:
        return _call_llm(_build_select_prompt(), req.messages)
    template = load_template(req.template_id)
    return _call_llm(_build_fill_prompt(template, req.values), req.messages)
