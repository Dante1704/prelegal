import pytest
from fastapi.testclient import TestClient
from sqlmodel import Session, SQLModel, StaticPool, create_engine

from main import app, get_session


@pytest.fixture(name="client")
def client_fixture():
    test_engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    SQLModel.metadata.create_all(test_engine)

    def override_session():
        with Session(test_engine) as session:
            yield session

    app.dependency_overrides[get_session] = override_session
    with TestClient(app) as client:
        yield client
    app.dependency_overrides.clear()


def test_health(client):
    resp = client.get("/api/health")
    assert resp.status_code == 200
    assert resp.json()["status"] == "ok"


def test_signup_returns_token(client):
    resp = client.post("/api/auth/signup", json={"email": "user@example.com", "password": "password123"})
    assert resp.status_code == 200
    data = resp.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"


def test_signup_duplicate_email(client):
    client.post("/api/auth/signup", json={"email": "dup@example.com", "password": "password123"})
    resp = client.post("/api/auth/signup", json={"email": "dup@example.com", "password": "password123"})
    assert resp.status_code == 400


def test_signup_short_password(client):
    resp = client.post("/api/auth/signup", json={"email": "user@example.com", "password": "short"})
    assert resp.status_code == 400


def test_signin_correct_credentials(client):
    client.post("/api/auth/signup", json={"email": "signin@example.com", "password": "password123"})
    resp = client.post("/api/auth/signin", json={"email": "signin@example.com", "password": "password123"})
    assert resp.status_code == 200
    assert "access_token" in resp.json()


def test_signin_wrong_password(client):
    client.post("/api/auth/signup", json={"email": "wrong@example.com", "password": "password123"})
    resp = client.post("/api/auth/signin", json={"email": "wrong@example.com", "password": "wrongpass"})
    assert resp.status_code == 401


def test_signin_nonexistent_user(client):
    resp = client.post("/api/auth/signin", json={"email": "nobody@example.com", "password": "password123"})
    assert resp.status_code == 401
