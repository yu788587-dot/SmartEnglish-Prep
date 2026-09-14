from typing import Any

from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from app.services.llm import (
    UpstreamError,
    UpstreamNotConfigured,
    upstream_json,
    upstream_stream,
)

router = APIRouter()


class ChatMessageIn(BaseModel):
    role: str
    content: str


class ChatIn(BaseModel):
    messages: list[ChatMessageIn]
    json_mode: bool = False
    stream: bool = False


@router.post("/chat")
async def chat(body: ChatIn) -> Any:
    """AI 代理:JSON 模式返回 {content};流式模式透传上游 SSE。"""
    messages = [m.model_dump() for m in body.messages]
    try:
        if body.stream:
            return StreamingResponse(
                upstream_stream(messages, json_mode=body.json_mode),
                media_type="text/event-stream",
            )
        content = await upstream_json(messages, json_mode=body.json_mode)
    except UpstreamNotConfigured as e:
        raise HTTPException(status_code=503, detail=str(e)) from e
    except UpstreamError as e:
        raise HTTPException(status_code=502, detail=str(e)) from e
    return {"content": content}
