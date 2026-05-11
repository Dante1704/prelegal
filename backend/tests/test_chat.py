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


def fake_completion_factory(payload: dict, captured: dict | None = None):
    """Build a litellm.completion stand-in returning the given JSON payload."""

    def _fake(**kwargs):
        if captured is not None:
            captured.update(kwargs)
        return SimpleNamespace(
            choices=[SimpleNamespace(message=SimpleNamespace(content=json.dumps(payload)))]
        )

    return _fake


# --- Selection stage -----------------------------------------------------


def test_selection_stage_greets_when_no_template_id(client, monkeypatch):
    captured = {}
    payload = {
        "message": "Hi! Which document would you like to create?",
        "selected_template_id": None,
        "suggested_template_id": None,
    }
    monkeypatch.setattr(chat_module, "completion", fake_completion_factory(payload, captured))

    resp = client.post("/api/chat", json={"messages": [], "values": {}})

    assert resp.status_code == 200
    assert resp.json()["message"].startswith("Hi")
    # System prompt should advertise the catalogue.
    system = captured["messages"][0]["content"]
    assert "nda" in system and "employment_contract" in system


def test_selection_stage_picks_supported_template(client, monkeypatch):
    payload = {
        "message": "Great — let's draft an Employment Contract.",
        "selected_template_id": "employment_contract",
        "suggested_template_id": None,
    }
    monkeypatch.setattr(chat_module, "completion", fake_completion_factory(payload))

    resp = client.post(
        "/api/chat",
        json={
            "messages": [{"role": "user", "content": "I need an employment contract"}],
            "values": {},
        },
    )

    assert resp.status_code == 200
    assert resp.json()["selected_template_id"] == "employment_contract"


def test_selection_stage_suggests_closest_when_unsupported(client, monkeypatch):
    payload = {
        "message": "We can't generate a partnership agreement, but a service agreement is close.",
        "selected_template_id": None,
        "suggested_template_id": "service_agreement",
    }
    monkeypatch.setattr(chat_module, "completion", fake_completion_factory(payload))

    resp = client.post(
        "/api/chat",
        json={"messages": [{"role": "user", "content": "I want a partnership agreement"}], "values": {}},
    )

    body = resp.json()
    assert body["selected_template_id"] is None
    assert body["suggested_template_id"] == "service_agreement"


# --- Filling stage -------------------------------------------------------


def test_fill_stage_uses_chosen_template_fields(client, monkeypatch):
    captured = {}
    payload = {
        "message": "What's the employer's full legal name?",
        "extracted_fields": {},
        "complete": False,
    }
    monkeypatch.setattr(chat_module, "completion", fake_completion_factory(payload, captured))

    resp = client.post(
        "/api/chat",
        json={"messages": [], "values": {}, "template_id": "employment_contract"},
    )

    assert resp.status_code == 200
    system = captured["messages"][0]["content"]
    assert "Employment Contract" in system
    assert "employer_name" in system  # template-specific field surfaced


def test_fill_stage_extracts_fields(client, monkeypatch):
    payload = {
        "message": "Got it. What's the disclosing party's address?",
        "extracted_fields": {"disclosing_party_name": "Acme Corp"},
        "complete": False,
    }
    monkeypatch.setattr(chat_module, "completion", fake_completion_factory(payload))

    resp = client.post(
        "/api/chat",
        json={
            "messages": [
                {"role": "assistant", "content": "What's the disclosing party's name?"},
                {"role": "user", "content": "Acme Corp"},
            ],
            "values": {},
            "template_id": "nda",
        },
    )

    assert resp.status_code == 200
    assert resp.json()["extracted_fields"] == {"disclosing_party_name": "Acme Corp"}


def test_fill_stage_surfaces_already_filled_values(client, monkeypatch):
    captured = {}
    payload = {"message": "ok", "extracted_fields": {}, "complete": False}
    monkeypatch.setattr(chat_module, "completion", fake_completion_factory(payload, captured))

    client.post(
        "/api/chat",
        json={
            "messages": [{"role": "user", "content": "hello"}],
            "values": {"disclosing_party_name": "Acme"},
            "template_id": "nda",
        },
    )

    assert "Acme" in captured["messages"][0]["content"]
    assert captured["model"] == "openrouter/openai/gpt-oss-120b"
    assert captured["extra_body"] == {"provider": {"order": ["cerebras"]}}
