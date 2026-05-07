import json
from types import SimpleNamespace

import pytest
from fastapi.testclient import TestClient

import chat as chat_module
from main import app


@pytest.fixture(name="client")
def client_fixture():
    with TestClient(app) as client:
        yield client


def fake_completion_factory(payload: dict):
    """Build a litellm.completion stand-in returning the given JSON payload."""

    def _fake(**kwargs):
        return SimpleNamespace(
            choices=[SimpleNamespace(message=SimpleNamespace(content=json.dumps(payload)))]
        )

    return _fake


def test_chat_returns_assistant_message(client, monkeypatch):
    payload = {
        "message": "Hi! What's Party A's full legal name?",
        "extracted_fields": {},
        "complete": False,
    }
    monkeypatch.setattr(chat_module, "completion", fake_completion_factory(payload))

    resp = client.post("/api/chat", json={"messages": [], "values": {}})

    assert resp.status_code == 200
    assert resp.json() == payload


def test_chat_round_trips_extracted_fields(client, monkeypatch):
    payload = {
        "message": "Got it. What's Party A's address?",
        "extracted_fields": {"party_a_name": "Acme Corp"},
        "complete": False,
    }
    monkeypatch.setattr(chat_module, "completion", fake_completion_factory(payload))

    resp = client.post(
        "/api/chat",
        json={
            "messages": [
                {"role": "assistant", "content": "What's Party A's name?"},
                {"role": "user", "content": "Acme Corp"},
            ],
            "values": {},
        },
    )

    assert resp.status_code == 200
    assert resp.json()["extracted_fields"] == {"party_a_name": "Acme Corp"}


def test_chat_passes_messages_and_system_prompt(client, monkeypatch):
    captured = {}

    def fake_completion(**kwargs):
        captured.update(kwargs)
        return SimpleNamespace(
            choices=[
                SimpleNamespace(
                    message=SimpleNamespace(
                        content=json.dumps(
                            {"message": "ok", "extracted_fields": {}, "complete": False}
                        )
                    )
                )
            ]
        )

    monkeypatch.setattr(chat_module, "completion", fake_completion)

    client.post(
        "/api/chat",
        json={
            "messages": [{"role": "user", "content": "hello"}],
            "values": {"party_a_name": "Acme"},
        },
    )

    msgs = captured["messages"]
    assert msgs[0]["role"] == "system"
    assert "Mutual Non-Disclosure Agreement" in msgs[0]["content"]
    assert "Acme" in msgs[0]["content"]  # already-filled values surfaced
    assert msgs[-1] == {"role": "user", "content": "hello"}
    assert captured["model"] == "openrouter/openai/gpt-oss-120b"
    assert captured["extra_body"] == {"provider": {"order": ["cerebras"]}}
