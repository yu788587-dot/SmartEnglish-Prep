from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from app.database import SessionLocal
from app.models.entities import Passage, Question

router = APIRouter()


class PassageIn(BaseModel):
    id: str = Field(min_length=1)
    title: str
    module: str = "reading"
    level: str = "general"
    content_md: str
    source: str | None = None
    created_at: str | None = None


class QuestionIn(BaseModel):
    id: str = Field(min_length=1)
    passage_id: str
    type: str
    stem: str
    options_json: str = "[]"
    answer: str
    explanation: str | None = None
    order: int = 0


class QuestionImportIn(BaseModel):
    passages: list[PassageIn]
    questions: list[QuestionIn]


@router.get("")
def list_questions() -> dict:
    with SessionLocal() as session:
        passages = session.query(Passage).all()
        questions = session.query(Question).all()
        return {
            "passages": [
                {
                    "id": p.id,
                    "title": p.title,
                    "module": p.module,
                    "level": p.level,
                    "contentMd": p.content_md,
                    "createdAt": p.created_at,
                }
                for p in passages
            ],
            "questions": [
                {
                    "id": q.id,
                    "passageId": q.passage_id,
                    "type": q.type,
                    "stem": q.stem,
                    "options": q.options_json,
                    "answer": q.answer,
                    "order": q.order,
                }
                for q in questions
            ],
        }


@router.post("/import")
def import_questions(body: QuestionImportIn) -> dict:
    """批量导入/更新题库(按 id upsert)。"""
    with SessionLocal() as session:
        for p in body.passages:
            row = session.get(Passage, p.id)
            if row is None:
                row = Passage(id=p.id)
            row.title = p.title
            row.module = p.module
            row.level = p.level
            row.content_md = p.content_md
            row.source = p.source
            if p.created_at:
                row.created_at = p.created_at
            session.merge(row)
        for q in body.questions:
            row = session.get(Question, q.id)
            if row is None:
                row = Question(id=q.id)
            row.passage_id = q.passage_id
            row.type = q.type
            row.stem = q.stem
            row.options_json = q.options_json
            row.answer = q.answer
            row.explanation = q.explanation
            row.order = q.order
            session.merge(row)
        session.commit()
    return {"passages": len(body.passages), "questions": len(body.questions)}


@router.delete("")
def clear_questions() -> dict:
    with SessionLocal() as session:
        n_q = session.query(Question).delete()
        n_p = session.query(Passage).delete()
        session.commit()
    return {"questions": n_q, "passages": n_p}
