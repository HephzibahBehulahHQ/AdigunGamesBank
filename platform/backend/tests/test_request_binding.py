"""Match identity uses actual submitted evidence; provider calls here are doubles."""
from sqlalchemy import create_engine, text

from app import main, providers


def test_coding_match_echoes_exact_prompt_and_cases_in_response_and_owned_history(api, configure, player, monkeypatch):
    configure("openai", "kimi")
    calls = []

    async def transport_double(key, prompt):
        calls.append((key, prompt))
        return "def scale(value):\n    return value * 3"

    monkeypatch.setattr(providers, "call_provider", transport_double)
    headers = player()
    prompt = "Return exactly one function scale(value) that multiplies its input by three."
    cases = [{"args": [2], "expected": 6}, {"args": [-4], "expected": -12}]
    response = api.post("/api/arena/matches", headers=headers, json={
        "prompt": prompt, "task_type": "coding", "providers": ["openai", "kimi"], "tests": cases,
    })
    assert response.status_code == 200
    match = response.json()
    assert match["prompt"] == prompt
    assert match["tests"] == cases
    assert len(calls) == 2 and all(call[1] == prompt for call in calls)
    saved = api.get("/api/arena/history", headers=headers).json()[0]
    assert saved["id"] == match["id"]
    assert saved["prompt"] == prompt and saved["tests"] == cases
    assert api.get("/api/arena/history", headers=player("different@example.com")).json() == []


def test_additive_migration_preserves_legacy_records_and_unknown_request_evidence():
    database = create_engine("sqlite:///:memory:")
    with database.begin() as connection:
        connection.execute(text("CREATE TABLE matches (id TEXT PRIMARY KEY, prompt TEXT)"))
        connection.execute(text("CREATE TABLE scores (id INTEGER PRIMARY KEY)"))
        connection.execute(text("INSERT INTO matches (id, prompt) VALUES ('legacy', 'Original prompt')"))
        main.migrate_optional_columns(connection)
        main.migrate_optional_columns(connection)
        row = connection.execute(text("SELECT id, prompt, tests_json FROM matches")).one()
        assert tuple(row) == ("legacy", "Original prompt", None)
    database.dispose()
