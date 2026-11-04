"""Live-only provider adapters. Configuration is not proof of provider availability."""

import asyncio
import json
import os
import time
from dataclasses import dataclass
from urllib.parse import quote, urlsplit

import httpx

CALL_TIMEOUT_SECONDS = 50
MAX_RESPONSE_BYTES = 512_000
MAX_ANSWER_CHARS = 32_000


@dataclass(frozen=True)
class Provider:
    label: str
    key_env: str
    model_env: str
    base_url: str
    protocol: str
    base_env: str = ""


PROVIDERS = {
    "openai": Provider("ChatGPT (OpenAI API)", "OPENAI_API_KEY", "OPENAI_MODEL", "https://api.openai.com/v1", "responses"),
    "anthropic": Provider("Claude", "ANTHROPIC_API_KEY", "ANTHROPIC_MODEL", "https://api.anthropic.com/v1", "messages"),
    "gemini": Provider("Gemini", "GEMINI_API_KEY", "GEMINI_MODEL", "https://generativelanguage.googleapis.com/v1beta", "gemini"),
    "deepseek": Provider("DeepSeek", "DEEPSEEK_API_KEY", "DEEPSEEK_MODEL", "https://api.deepseek.com", "chat"),
    "grok": Provider("Grok", "XAI_API_KEY", "GROK_MODEL", "https://api.x.ai/v1", "responses"),
    "kimi": Provider("Kimi", "KIMI_API_KEY", "KIMI_MODEL", "https://api.moonshot.ai/v1", "chat", "KIMI_BASE_URL"),
    "adigun": Provider("Adigun AI", "ADIGUN_AI_API_KEY", "ADIGUN_AI_MODEL", "", "chat", "ADIGUN_AI_BASE_URL"),
    "ollama": Provider("Ollama", "OLLAMA_API_KEY", "OLLAMA_MODEL", "", "chat", "OLLAMA_BASE_URL"),
}
LABELS = {key: provider.label for key, provider in PROVIDERS.items()}


def _configured(value: str) -> bool:
    return bool(value.strip()) and not value.lower().startswith(("replace-", "your-", "<"))


def provider_config(key: str) -> dict:
    provider = PROVIDERS[key]
    base = os.getenv(provider.base_env, provider.base_url) if provider.base_env else provider.base_url
    base = base.strip().rstrip("/")
    model = os.getenv(provider.model_env, "").strip()
    secret = os.getenv(provider.key_env, "").strip()
    # Ollama permits an explicitly configured, private local service without a key.
    if key == "ollama" and not secret:
        secret = "ollama"
    missing = []
    if not _configured(model):
        missing.append(provider.model_env)
    if not _configured(secret):
        missing.append(provider.key_env)
    try:
        url = urlsplit(base)
        local = url.hostname in {"localhost", "127.0.0.1", "::1", "host.docker.internal"}
        valid_url = bool(url.hostname) and not url.username and not url.password and not url.query and not url.fragment
        valid_url = valid_url and (url.scheme == "https" or (key == "ollama" and local and url.scheme == "http"))
    except ValueError:
        valid_url = False
    if not valid_url:
        missing.append(provider.base_env or "HTTPS endpoint")
    return {"base_url": base, "model": model, "secret": secret, "missing": missing}


def provider_ready(key: str) -> bool:
    return key in PROVIDERS and not provider_config(key)["missing"]


def provider_status(key: str, enabled: bool = True) -> dict:
    config = provider_config(key)
    return {
        "label": LABELS[key],
        "model": config["model"] or None,
        "configured": enabled and os.getenv("AI_MODE", "disabled").lower() == "live" and not config["missing"],
        "enabled": enabled,
        "missing": config["missing"],
        "availability_verified": False,
    }


def _request(key: str, prompt: str) -> tuple[str, dict, dict]:
    provider = PROVIDERS[key]
    config = provider_config(key)
    if config["missing"]:
        raise ValueError("Provider configuration is incomplete")
    base, model, secret = config["base_url"], config["model"], config["secret"]
    headers = {"Content-Type": "application/json"}
    if provider.protocol == "messages":
        headers.update({"x-api-key": secret, "anthropic-version": "2023-06-01"})
        return base + "/messages", headers, {"model": model, "max_tokens": 1200, "messages": [{"role": "user", "content": prompt}]}
    if provider.protocol == "gemini":
        headers["x-goog-api-key"] = secret
        model = model.removeprefix("models/")
        return base + "/models/" + quote(model, safe="") + ":generateContent", headers, {
            "contents": [{"role": "user", "parts": [{"text": prompt}]}],
            "generationConfig": {"maxOutputTokens": 1200},
        }
    headers["Authorization"] = "Bearer " + secret
    if provider.protocol == "responses":
        return base + "/responses", headers, {"model": model, "input": prompt, "max_output_tokens": 1200, "store": False}
    return base + "/chat/completions", headers, {"model": model, "messages": [{"role": "user", "content": prompt}], "max_tokens": 1200, "stream": False}


def _answer(key: str, data: dict) -> str:
    protocol = PROVIDERS[key].protocol
    if protocol == "messages":
        answer = "\n".join(block["text"] for block in data.get("content", []) if block.get("type") == "text")
    elif protocol == "gemini":
        candidates = data.get("candidates", [])
        answer = "\n".join(part.get("text", "") for part in (candidates[0].get("content", {}).get("parts", []) if candidates else []) if not part.get("thought"))
    elif protocol == "responses":
        answer = "\n".join(part["text"] for item in data.get("output", []) if item.get("type") == "message" for part in item.get("content", []) if part.get("type") == "output_text")
    else:
        choices = data.get("choices", [])
        answer = choices[0].get("message", {}).get("content", "") if choices else ""
    if not isinstance(answer, str) or not answer.strip():
        raise ValueError("The provider returned no answer text")
    if len(answer) > MAX_ANSWER_CHARS:
        raise ValueError("The provider response exceeded the answer limit")
    return answer.strip()


async def call_provider(key: str, prompt: str) -> str:
    url, headers, payload = _request(key, prompt)
    # Native async I/O is cancelled on timeout; no orphan background SDK threads.
    # Redirects are disabled so an endpoint cannot forward credentials elsewhere.
    async with httpx.AsyncClient(timeout=httpx.Timeout(45, connect=10), follow_redirects=False) as client:
        async with asyncio.timeout(CALL_TIMEOUT_SECONDS):
            async with client.stream("POST", url, headers=headers, json=payload) as response:
                response.raise_for_status()
                body = bytearray()
                async for chunk in response.aiter_bytes():
                    body.extend(chunk)
                    if len(body) > MAX_RESPONSE_BYTES:
                        raise ValueError("The provider response exceeded the transport limit")
    return _answer(key, json.loads(body))


async def compete(key: str, prompt: str, enabled: bool = True) -> dict:
    status = provider_status(key, enabled)
    result = {
        "key": key, "label": LABELS[key], "model": status["model"], "body": "",
        "latency_ms": None, "accuracy": None, "quality": None, "suggestions": None,
        "final_score": None, "judge_provider": None, "judge_model": None,
        "judge_reason": None, "source": "unavailable", "state": "unconfigured", "error": None,
    }
    if not status["configured"]:
        result["error"] = "Provider disabled or missing its server-side configuration."
        return result
    started = time.perf_counter()
    try:
        async with asyncio.timeout(CALL_TIMEOUT_SECONDS):
            result["body"] = await call_provider(key, prompt)
        if not result["body"].strip():
            raise ValueError("Empty provider response")
        result.update(state="ok", source="live_unscored")
    except (TimeoutError, httpx.TimeoutException):
        result.update(state="timeout", source="live", error="Provider exceeded the 50-second response deadline.")
    except Exception:
        # Provider exception strings can contain credentials, prompts, or private URLs.
        result.update(state="error", source="live", error="Provider request failed. Check server configuration and provider availability.")
    result["latency_ms"] = round((time.perf_counter() - started) * 1000, 1)
    return result
