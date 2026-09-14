"""可选 AI 代理:服务器持有 upstream Key,前端零配置可用。

Upstream 为任意 OpenAI 兼容 /chat/completions;未配置时抛 UpstreamNotConfigured,
API 层转 503(前端据此提示)。
"""

from collections.abc import AsyncIterator
from typing import Any

import httpx

from app.core.config import settings


class UpstreamNotConfigured(Exception):
    pass


class UpstreamError(Exception):
    pass


def upstream_ready() -> bool:
    return bool(settings.ai_base_url and settings.ai_api_key and settings.ai_model)


def _headers() -> dict[str, str]:
    return {"Authorization": f"Bearer {settings.ai_api_key}"}


def _payload(messages: list[dict[str, str]], json_mode: bool, stream: bool) -> dict[str, Any]:
    payload: dict[str, Any] = {
        "model": settings.ai_model,
        "messages": messages,
        "temperature": 0.3,
    }
    if json_mode:
        payload["response_format"] = {"type": "json_object"}
    if stream:
        payload["stream"] = True
    return payload


async def upstream_json(
    messages: list[dict[str, str]], json_mode: bool = False
) -> str:
    """非流式:返回 message content。"""
    if not upstream_ready():
        raise UpstreamNotConfigured(
            "Server-side AI upstream is not configured (set SEP_AI_BASE_URL / SEP_AI_API_KEY / SEP_AI_MODEL)"
        )
    url = settings.ai_base_url.rstrip("/") + "/chat/completions"
    async with httpx.AsyncClient(timeout=120) as client:
        try:
            resp = await client.post(url, headers=_headers(), json=_payload(messages, json_mode, False))
        except httpx.HTTPError as e:
            raise UpstreamError(f"Upstream request failed: {e}") from e
    if resp.status_code >= 400:
        raise UpstreamError(f"Upstream returned HTTP {resp.status_code}")
    content = resp.json().get("choices", [{}])[0].get("message", {}).get("content")
    if not isinstance(content, str):
        raise UpstreamError("Upstream response has no message content")
    return content


async def upstream_stream(
    messages: list[dict[str, str]], json_mode: bool = False
) -> AsyncIterator[bytes]:
    """流式:透传上游 SSE 字节流。"""
    if not upstream_ready():
        raise UpstreamNotConfigured(
            "Server-side AI upstream is not configured (set SEP_AI_BASE_URL / SEP_AI_API_KEY / SEP_AI_MODEL)"
        )
    url = settings.ai_base_url.rstrip("/") + "/chat/completions"
    async with httpx.AsyncClient(timeout=120) as client:
        try:
            resp = await client.send(
                client.build_request("POST", url, headers=_headers(), json=_payload(messages, json_mode, True)),
                stream=True,
            )
        except httpx.HTTPError as e:
            raise UpstreamError(f"Upstream request failed: {e}") from e
        try:
            async for chunk in resp.aiter_bytes():
                yield chunk
        finally:
            await resp.aclose()
