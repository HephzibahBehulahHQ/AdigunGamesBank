"""All provider calls in this suite are explicit test doubles, never live output."""

import os
import sys
import tempfile
from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
_bootstrap = tempfile.TemporaryDirectory(prefix="adigun-api-test-")
os.environ["DATABASE_URL"] = "sqlite:///" + str(Path(_bootstrap.name) / "bootstrap.db")
os.environ["APP_ENV"] = "test"
os.environ["JWT_SECRET"] = "test-only-secret-not-for-production-12345"

from app import main, providers  # noqa: E402


@pytest.fixture
def api(monkeypatch, tmp_path):
    for provider in providers.PROVIDERS.values():
        for key in (provider.key_env, provider.model_env, provider.base_env):
            if key:
                monkeypatch.delenv(key, raising=False)
    for key in ("JUDGE_PROVIDER", "ARENA_MAX_CONCURRENT_MATCHES", "ADMIN_EMAIL", "ADMIN_BOOTSTRAP_TOKEN"):
        monkeypatch.delenv(key, raising=False)
    monkeypatch.setenv("APP_ENV", "test")
    monkeypatch.setenv("AI_MODE", "live")
    monkeypatch.setenv("ALLOW_REGISTRATION", "true")
    database = create_engine("sqlite:///" + str(tmp_path / "test.db"), connect_args={"check_same_thread": False})
    factory = sessionmaker(bind=database, expire_on_commit=False)
    main.Base.metadata.create_all(database)
    monkeypatch.setattr(main, "SessionLocal", factory)
    with factory() as db:
        db.add(main.AdmissionLock(id=1, touched=0))
        db.add_all(main.Model(key=key, label=provider.label, provider=key, enabled=True) for key, provider in providers.PROVIDERS.items())
        db.commit()
    # Fail closed if a test forgets to install its own mock transport.
    async def forbidden_call(*args, **kwargs):
        raise AssertionError("Tests must not contact live model providers")
    monkeypatch.setattr(providers, "call_provider", forbidden_call)
    monkeypatch.setattr(main, "_test_database", database, raising=False)
    with TestClient(main.app) as client:
        yield client
    database.dispose()


@pytest.fixture
def configure(monkeypatch):
    def configure_keys(*keys):
        for key in keys:
            provider = providers.PROVIDERS[key]
            monkeypatch.setenv(provider.key_env, "unit-test-credential")
            monkeypatch.setenv(provider.model_env, "unit-test-model-" + key)
            if provider.base_env and not provider.base_url:
                monkeypatch.setenv(provider.base_env, "https://test-provider.invalid/v1")
    return configure_keys


@pytest.fixture
def player(api):
    def register(email="player@example.com"):
        response = api.post("/api/auth/register", json={"email": email, "password": "test-only-long-password", "display_name": "Test Player"})
        assert response.status_code == 200, response.text
        return {"Authorization": "Bearer " + response.json()["token"]}
    return register
