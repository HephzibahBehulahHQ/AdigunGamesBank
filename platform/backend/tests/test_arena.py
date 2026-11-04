import asyncio
import json
import threading
from concurrent.futures import ThreadPoolExecutor

import pytest
from sqlalchemy import select, func

from app import judging, main, providers


PROMPT = "Explain why a series circuit has the same current throughout."


def match_request(keys=None, **values):
    return {"prompt": PROMPT, "providers": keys or ["openai", "kimi"], **values}


def test_no_configuration_never_invents_live_answers(api, player):
    health = api.get("/api/health").json()
    assert set(health["providers"]) == set(providers.PROVIDERS)
    assert not any(health["providers"].values())
    assert all(not value["availability_verified"] for value in health["provider_details"].values())
    response = api.post("/api/arena/matches", headers=player(), json=match_request())
    assert response.status_code == 503
    with main.SessionLocal() as db:
        assert db.scalar(select(func.count(main.Match.id))) == 0


def test_kimi_and_adigun_configuration_has_no_invented_model(api, configure, monkeypatch):
    configure("kimi", "adigun")
    assert api.get("/api/health").json()["providers"]["kimi"]
    monkeypatch.delenv("ADIGUN_AI_BASE_URL")
    assert not api.get("/api/health").json()["providers"]["adigun"]
    monkeypatch.setenv("ADIGUN_AI_BASE_URL", "http://public.example.com/v1")
    assert not providers.provider_ready("adigun")
    monkeypatch.setenv("ADIGUN_AI_BASE_URL", "https://user:password@example.com/v1")
    assert not providers.provider_ready("adigun")
    monkeypatch.setenv("ADIGUN_AI_BASE_URL", "https://operator.example.com/v1")
    assert providers.provider_ready("adigun")
    health = api.get("/api/health").json()
    assert "unit-test-credential" not in json.dumps(health)
    assert health["provider_details"]["adigun"]["model"] == "unit-test-model-adigun"


def test_competitors_start_together_and_unjudged_quality_stays_unknown(api, configure, player, monkeypatch):
    configure("openai", "kimi")
    calls, gate = [], {}
    async def test_double(key, prompt):
        assert prompt == PROMPT
        if "event" not in gate:
            gate["event"] = asyncio.Event()
        calls.append(key)
        if len(calls) == 2:
            gate["event"].set()
        await asyncio.wait_for(gate["event"].wait(), 0.5)
        return "Explicit test-double response for " + key
    monkeypatch.setattr(providers, "call_provider", test_double)
    headers = player()
    response = api.post("/api/arena/matches", headers=headers, json=match_request())
    assert response.status_code == 200, response.text
    data = response.json()
    assert set(calls) == {"openai", "kimi"}
    assert data["mode"] == "live"
    assert all(answer["state"] == "ok" for answer in data["responses"])
    assert all(answer["final_score"] is None and answer["accuracy"] is None for answer in data["responses"])
    assert data["ranking"]["winner"] is None
    assert not data["ranking"]["scores_complete"]
    history = api.get("/api/arena/history", headers=headers).json()
    assert len(history) == 1
    assert history[0]["responses"][0]["model"].startswith("unit-test-model-")
    assert history[0]["created_at"].endswith("+00:00")


@pytest.mark.parametrize("failure", ["empty", "exception", "timeout"])
def test_failed_provider_is_not_ranked_or_given_fake_text(api, configure, player, monkeypatch, failure):
    configure("openai", "kimi")
    async def test_double(key, prompt):
        if key == "openai":
            return "Explicit successful test response"
        if failure == "empty":
            return ""
        if failure == "timeout":
            raise TimeoutError("sensitive provider details")
        raise RuntimeError("secret-token-must-not-escape")
    monkeypatch.setattr(providers, "call_provider", test_double)
    response = api.post("/api/arena/matches", headers=player(), json=match_request())
    assert response.status_code == 200
    failed = response.json()["responses"][1]
    assert failed["state"] == ("timeout" if failure == "timeout" else "error")
    assert failed["body"] == ""
    assert failed["final_score"] is None
    assert "secret-token" not in response.text
    assert "sensitive provider details" not in response.text


def test_atomic_reservation_prevents_overlapping_billable_calls(api, configure, player, monkeypatch):
    configure("openai", "kimi")
    started, release = threading.Event(), threading.Event()
    calls = []
    async def test_double(key, prompt):
        calls.append(key)
        started.set()
        while not release.is_set():
            await asyncio.sleep(0.01)
        return "Explicit concurrency test response"
    monkeypatch.setattr(providers, "call_provider", test_double)
    headers = player()
    with ThreadPoolExecutor(max_workers=1) as pool:
        first = pool.submit(api.post, "/api/arena/matches", headers=headers, json=match_request())
        assert started.wait(2)
        try:
            second = api.post("/api/arena/matches", headers=headers, json=match_request())
            assert second.status_code == 429
            assert len(calls) == 2
        finally:
            release.set()
        assert first.result(timeout=3).status_code == 200
    with main.SessionLocal() as db:
        assert db.scalar(select(func.count(main.ArenaLease.user_id))) == 0


def test_capacity_and_per_minute_limits_apply_before_provider_calls(api, configure, player, monkeypatch):
    configure("openai", "kimi")
    calls = []
    async def test_double(key, prompt):
        calls.append(key)
        return "Explicit quota test response"
    monkeypatch.setattr(providers, "call_provider", test_double)
    headers = player()
    for _ in range(3):
        assert api.post("/api/arena/matches", headers=headers, json=match_request()).status_code == 200
    assert api.post("/api/arena/matches", headers=headers, json=match_request()).status_code == 429
    assert len(calls) == 6


def test_history_and_ratings_are_owned_by_the_signed_in_player(api, configure, player, monkeypatch):
    configure("openai", "kimi")
    async def test_double(key, prompt):
        return "Explicit ownership test response"
    monkeypatch.setattr(providers, "call_provider", test_double)
    first = player()
    second = player("other@example.com")
    match = api.post("/api/arena/matches", headers=first, json=match_request()).json()
    path = "/api/arena/" + match["id"] + "/rate"
    assert api.post(path, headers=second, json={"model_key": "kimi", "rating": 5}).status_code == 404
    assert api.get("/api/arena/history", headers=second).json() == []
    assert api.post(path, headers=first, json={"model_key": "kimi", "rating": 4}).status_code == 200
    saved = api.get("/api/arena/history", headers=first).json()[0]["responses"]
    assert next(answer for answer in saved if answer["key"] == "kimi")["rating"] == 4
    assert api.get("/api/arena/history").status_code == 401


def test_judge_provenance_and_formula_are_returned_and_saved(api, configure, player, monkeypatch):
    configure("openai", "kimi", "ollama")
    monkeypatch.setenv("JUDGE_PROVIDER", "ollama")
    async def competitor_double(key, prompt):
        return "Explicit judged test response for " + key
    async def judge_double(key, prompt):
        assert key == "ollama"
        assert "UNTRUSTED_DATA_JSON" in prompt
        assert "unit-test-model-openai" not in prompt
        return json.dumps([
            {"id": "answer_0", "accuracy": 0.8, "quality": 0.7, "suggestions": 0.6, "reason": "Test rubric estimate; not independent fact verification."},
            {"id": "answer_1", "accuracy": 0.6, "quality": 0.5, "suggestions": 0.4, "reason": "A separate test rubric estimate."},
        ])
    monkeypatch.setattr(providers, "call_provider", competitor_double)
    monkeypatch.setattr(judging, "call_provider", judge_double)
    headers = player()
    response = api.post("/api/arena/matches", headers=headers, json=match_request())
    assert response.status_code == 200, response.text
    data = response.json()
    first = data["responses"][0]
    assert first["judge_provider"] == "ollama"
    assert first["judge_model"] == "unit-test-model-ollama"
    assert first["accuracy_source"] == "model_judge_estimate"
    expected = round(100 * (0.5 * 0.8 + 0.3 * 0.7 + 0.1 * 0.6 + 0.1 * first["speed_score"]), 2)
    assert first["final_score"] == expected
    assert data["ranking"]["winner"] == "openai"
    assert data["ranking"]["scores_complete"]
    history = api.get("/api/arena/history", headers=headers).json()[0]
    assert history["responses"][0]["judge_reason"] == first["judge_reason"]


@pytest.mark.parametrize("bad_metric", [float("nan"), float("inf"), True, -1, 2, "0.9"])
def test_malformed_judge_score_remains_unknown(api, configure, player, monkeypatch, bad_metric):
    configure("openai", "kimi", "ollama")
    monkeypatch.setenv("JUDGE_PROVIDER", "ollama")
    async def competitor_double(key, prompt):
        return "Explicit test response"
    async def judge_double(key, prompt):
        return json.dumps([{"id": "answer_0", "accuracy": bad_metric, "quality": 0.8, "suggestions": 0.8, "reason": "Test invalid metric."}])
    monkeypatch.setattr(providers, "call_provider", competitor_double)
    monkeypatch.setattr(judging, "call_provider", judge_double)
    data = api.post("/api/arena/matches", headers=player(), json=match_request()).json()
    assert all(answer["final_score"] is None for answer in data["responses"])
    assert data["ranking"]["winner"] is None


def test_judge_cannot_score_its_own_provider(api, configure, player, monkeypatch):
    configure("openai", "kimi")
    monkeypatch.setenv("JUDGE_PROVIDER", "openai")
    async def competitor_double(key, prompt):
        return "Explicit conflict test response"
    async def judge_double(key, prompt):
        assert "conflict test response" in prompt
        return json.dumps([{"id": "answer_0", "accuracy": 0.7, "quality": 0.7, "suggestions": 0.7, "reason": "Estimated by the other provider."}])
    monkeypatch.setattr(providers, "call_provider", competitor_double)
    monkeypatch.setattr(judging, "call_provider", judge_double)
    data = api.post("/api/arena/matches", headers=player(), json=match_request()).json()
    assert data["responses"][0]["judge_state"] == "self_judging_excluded"
    assert data["responses"][0]["final_score"] is None
    assert data["ranking"]["winner"] is None


def test_request_validation_and_payload_bound(api, configure, player):
    headers = player()
    configure("openai", "kimi")
    for data in [match_request(["kimi", "kimi"]), match_request(["kimi", "invented"]), match_request(prompt=" " * 30), match_request(task_type="coding", tests=[])]:
        assert api.post("/api/arena/matches", headers=headers, json=data).status_code == 422
    assert api.post("/api/arena/matches", headers=headers, content=b"x" * 65_537).status_code == 413


@pytest.mark.parametrize("case", [
    {"args": [10**400], "expected": 0},
    {"args": [-(10**400)], "expected": 0},
    {"args": [], "expected": 10**400},
    {"args": [], "expected": -(10**400)},
])
def test_oversized_integers_rejected_before_admission_or_provider_calls(api, configure, player, monkeypatch, case):
    configure("openai", "kimi")
    calls = []
    async def test_double(key, prompt):
        calls.append(key)
        return "Explicit numeric-boundary test response"
    monkeypatch.setattr(providers, "call_provider", test_double)
    response = api.post("/api/arena/matches", headers=player(), json=match_request(task_type="coding", tests=[case]))
    assert response.status_code == 422
    assert response.json()["detail"] == "Number exceeds the limit"
    assert calls == []
    with main.SessionLocal() as db:
        assert db.scalar(select(func.count(main.Match.id))) == 0
        assert db.scalar(select(func.count(main.ArenaLease.user_id))) == 0


def test_disabled_models_cannot_be_called(api, configure, player):
    configure("openai", "kimi")
    with main.SessionLocal() as db:
        model = db.scalar(select(main.Model).where(main.Model.key == "kimi"))
        model.enabled = False
        db.commit()
    assert not api.get("/api/health").json()["providers"]["kimi"]
    assert api.post("/api/arena/matches", headers=player(), json=match_request()).status_code == 503


def test_production_registration_requires_operator_opt_in(api, monkeypatch):
    monkeypatch.setenv("APP_ENV", "production")
    monkeypatch.delenv("ALLOW_REGISTRATION")
    assert not api.get("/api/health").json()["registration_allowed"]
    assert api.post("/api/auth/register", json={"email": "new@example.com", "display_name": "New", "password": "test-only-long-password"}).status_code == 403
