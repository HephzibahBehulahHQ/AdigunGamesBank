import asyncio
import json
import os

import httpx
import pytest

from app import providers


@pytest.mark.parametrize("key", list(providers.PROVIDERS))
def test_each_adapter_sends_real_protocol_shape_to_mock_transport(monkeypatch, configure, key):
    configure(key)
    request_log = []
    def handler(request):
        request_log.append(request)
        data = json.loads(request.content)
        protocol = providers.PROVIDERS[key].protocol
        if protocol == "responses":
            assert data["input"] == "Test protocol prompt"
            assert data["store"] is False
            payload = {"output": [{"type": "message", "content": [{"type": "output_text", "text": "Explicit mocked protocol response"}]}]}
        elif protocol == "messages":
            assert request.headers["anthropic-version"] == "2023-06-01"
            assert data["messages"][0]["content"] == "Test protocol prompt"
            payload = {"content": [{"type": "text", "text": "Explicit mocked protocol response"}]}
        elif protocol == "gemini":
            assert "key=" not in str(request.url)
            assert request.headers["x-goog-api-key"] == "unit-test-credential"
            assert data["contents"][0]["parts"][0]["text"] == "Test protocol prompt"
            payload = {"candidates": [{"content": {"parts": [{"text": "Explicit mocked protocol response"}, {"text": "private reasoning", "thought": True}]}}]}
        else:
            assert data["messages"][0]["content"] == "Test protocol prompt"
            payload = {"choices": [{"message": {"content": "Explicit mocked protocol response"}}]}
        return httpx.Response(200, json=payload)
    original_client = httpx.AsyncClient
    monkeypatch.setattr(providers.httpx, "AsyncClient", lambda **kwargs: original_client(transport=httpx.MockTransport(handler), **kwargs))
    result = asyncio.run(providers.call_provider(key, "Test protocol prompt"))
    assert result == "Explicit mocked protocol response"
    assert len(request_log) == 1
    assert json.loads(request_log[0].content)["model"] == os.environ[providers.PROVIDERS[key].model_env] if key != "gemini" else ":generateContent" in str(request_log[0].url)


def test_transport_does_not_follow_redirect_with_secret(monkeypatch, configure):
    configure("kimi")
    seen = []
    def handler(request):
        seen.append(request)
        return httpx.Response(307, headers={"location": "https://attacker.invalid"})
    original = httpx.AsyncClient
    monkeypatch.setattr(providers.httpx, "AsyncClient", lambda **kwargs: original(transport=httpx.MockTransport(handler), **kwargs))
    with pytest.raises(httpx.HTTPStatusError):
        asyncio.run(providers.call_provider("kimi", "test"))
    assert len(seen) == 1


def test_transport_rejects_oversized_response(monkeypatch, configure):
    configure("kimi")
    original = httpx.AsyncClient
    monkeypatch.setattr(providers.httpx, "AsyncClient", lambda **kwargs: original(transport=httpx.MockTransport(lambda request: httpx.Response(200, content=b"x" * (providers.MAX_RESPONSE_BYTES + 1))), **kwargs))
    with pytest.raises(ValueError):
        asyncio.run(providers.call_provider("kimi", "test"))
