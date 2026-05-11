from fastapi.testclient import TestClient

from main import app


def test_list_templates_returns_all_six():
    with TestClient(app) as client:
        resp = client.get("/api/templates")
    assert resp.status_code == 200
    data = resp.json()
    ids = {t["id"] for t in data}
    assert ids == {
        "nda",
        "employment_contract",
        "service_agreement",
        "independent_contractor",
        "lease_agreement",
        "letter_of_intent",
    }
    for entry in data:
        assert {"id", "name", "category", "description"} <= set(entry)


def test_get_template_returns_full_definition():
    with TestClient(app) as client:
        resp = client.get("/api/templates/nda")
    assert resp.status_code == 200
    data = resp.json()
    assert data["id"] == "nda"
    assert isinstance(data["fields"], list) and data["fields"]
    assert "{{" in data["content"]


def test_get_template_unknown_id_returns_404():
    with TestClient(app) as client:
        resp = client.get("/api/templates/does_not_exist")
    assert resp.status_code == 404
