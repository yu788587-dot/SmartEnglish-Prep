import io
import json
from typing import Any

import pandas as pd
from fastapi import APIRouter, HTTPException, Query, UploadFile
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from app.database import SessionLocal
from app.models.entities import (
    Essay,
    EssayReview,
    Note,
    PracticeRecord,
    StudySession,
    TranslationExercise,
    WrongQuestion,
)

router = APIRouter()

APP_ID = "SmartEnglish-Prep"
SCHEMA_VERSION = 1


def _collect() -> dict[str, list[dict[str, Any]]]:
    with SessionLocal() as session:
        return {
            "essays": [
                {
                    "id": r.id,
                    "topicId": r.topic_id,
                    "content": r.content,
                    "wordCount": r.word_count,
                    "createdAt": r.created_at,
                }
                for r in session.query(Essay).all()
            ],
            "essayReviews": [
                {
                    "id": r.id,
                    "essayId": r.essay_id,
                    "model": r.model,
                    "overall": r.overall,
                    "createdAt": r.created_at,
                }
                for r in session.query(EssayReview).all()
            ],
            "practiceRecords": [
                {
                    "id": r.id,
                    "questionId": r.question_id,
                    "module": r.module,
                    "attemptId": r.attempt_id,
                    "isCorrect": r.is_correct,
                    "durationS": r.duration_s,
                    "createdAt": r.created_at,
                }
                for r in session.query(PracticeRecord).all()
            ],
            "wrongQuestions": [
                {
                    "id": r.id,
                    "questionId": r.question_id,
                    "resolved": r.resolved,
                    "reviewCount": r.review_count,
                }
                for r in session.query(WrongQuestion).all()
            ],
            "translationExercises": [
                {
                    "id": r.id,
                    "sourceText": r.source_text[:200],
                    "userTranslation": r.user_translation,
                    "createdAt": r.created_at,
                }
                for r in session.query(TranslationExercise).all()
            ],
            "notes": [
                {
                    "id": r.id,
                    "word": r.word,
                    "createdAt": r.created_at,
                }
                for r in session.query(Note).all()
            ],
            "studySessions": [
                {
                    "id": r.id,
                    "module": r.module,
                    "startAt": r.start_at,
                    "durationS": r.duration_s,
                }
                for r in session.query(StudySession).all()
            ],
        }


@router.get("/export-data")
def export_data(format: str = Query(default="json")) -> Any:
    """导出服务器端学习数据。format=json(完整备份结构)或 xlsx(人读报表,pandas)。"""
    data = _collect()
    if format == "json":
        return {
            "app": APP_ID,
            "schemaVersion": SCHEMA_VERSION,
            "exportedAt": __import__("datetime").datetime.now().isoformat(),
            "data": data,
        }
    if format == "xlsx":
        buffer = io.BytesIO()
        with pd.ExcelWriter(buffer, engine="openpyxl") as writer:
            for sheet, rows in data.items():
                frame = pd.DataFrame(rows)
                frame.to_excel(writer, sheet_name=sheet[:31], index=False)
        buffer.seek(0)
        return StreamingResponse(
            buffer,
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": "attachment; filename=smartenglish-prep-server.xlsx"},
        )
    raise HTTPException(status_code=400, detail="format must be json or xlsx")


class ImportRecord(BaseModel):
    model_config = {"extra": "allow"}
    id: str


class ImportBody(BaseModel):
    data: dict[str, list[ImportRecord]]


@router.post("/import-data")
async def import_data(body: ImportBody) -> dict:
    """导入学习数据 JSON(与前端备份同构;按 id upsert,不做删除)。"""
    written = 0
    with SessionLocal() as session:
        for r in body.data.get("essays", []):
            session.merge(
                Essay(
                    id=r.id,
                    content=str(r.model_dump().get("content", "")),
                    word_count=int(r.model_dump().get("wordCount", 0) or 0),
                    topic_id=r.model_dump().get("topicId"),
                )
            )
            written += 1
        for r in body.data.get("studySessions", []):
            d = r.model_dump()
            session.merge(
                StudySession(
                    id=r.id,
                    module=str(d.get("module", "reading")),
                    start_at=str(d.get("startAt", "")),
                    duration_s=int(d.get("durationS", 0) or 0),
                )
            )
            written += 1
        session.commit()
    return {"written": written, "note": "M7 范围:essays 与 studySessions 两表;其余表随 M8 扩展"}


@router.post("/import-upload")
async def import_upload(file: UploadFile) -> dict:
    """接受前端导出的 JSON 备份文件,内容转发到 import-data 逻辑。"""
    raw = await file.read()
    try:
        body = json.loads(raw)
    except json.JSONDecodeError as e:
        raise HTTPException(status_code=400, detail=f"Invalid JSON: {e}") from e
    parsed = ImportBody.model_validate(body)
    return await import_data(parsed)
