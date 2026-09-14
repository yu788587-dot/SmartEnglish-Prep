"""ORM 模型,与 frontend/src/db/types.ts 及 docs/执行计划.md 第 3 节 ER 图同构。

主键统一为 36 位 UUID 字符串;user_id 默认 'local'(单用户),为多用户扩展预留。
JSON 字段(SQLite)用 Text 存 JSON 字符串,序列化由服务层负责。
"""

from datetime import datetime, timezone

from sqlalchemy import Boolean, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


def utcnow_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    created_at: Mapped[str] = mapped_column(String(32), default=utcnow_iso)


class Passage(Base):
    __tablename__ = "passages"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    title: Mapped[str] = mapped_column(String(255))
    module: Mapped[str] = mapped_column(String(16))  # reading|writing|translation|listening
    level: Mapped[str] = mapped_column(String(16), default="general")
    content_md: Mapped[str] = mapped_column(Text)
    source: Mapped[str | None] = mapped_column(String(255), default=None)
    created_at: Mapped[str] = mapped_column(String(32), default=utcnow_iso)


class Question(Base):
    __tablename__ = "questions"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    passage_id: Mapped[str] = mapped_column(ForeignKey("passages.id"))
    type: Mapped[str] = mapped_column(String(16))  # mcq|tfng|match|gap
    stem: Mapped[str] = mapped_column(Text)
    options_json: Mapped[str] = mapped_column(Text, default="[]")
    answer: Mapped[str] = mapped_column(Text)
    explanation: Mapped[str | None] = mapped_column(Text, default=None)
    order: Mapped[int] = mapped_column(Integer, default=0)


class Topic(Base):
    __tablename__ = "topics"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    exam_type: Mapped[str] = mapped_column(String(16))  # ielts_t2|ielts_t1|cet4|cet6
    prompt: Mapped[str] = mapped_column(Text)
    category: Mapped[str | None] = mapped_column(String(64), default=None)


class TranslationTopic(Base):
    __tablename__ = "translation_topics"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    title: Mapped[str] = mapped_column(String(255))
    source_text: Mapped[str] = mapped_column(Text)
    ref_translation: Mapped[str] = mapped_column(Text)


class Essay(Base):
    __tablename__ = "essays"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    user_id: Mapped[str] = mapped_column(String(36), default="local")
    topic_id: Mapped[str | None] = mapped_column(ForeignKey("topics.id"), default=None)
    prompt: Mapped[str | None] = mapped_column(Text, default=None)
    content: Mapped[str] = mapped_column(Text)
    word_count: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[str] = mapped_column(String(32), default=utcnow_iso)
    updated_at: Mapped[str] = mapped_column(String(32), default=utcnow_iso)


class EssayReview(Base):
    __tablename__ = "essay_reviews"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    essay_id: Mapped[str] = mapped_column(ForeignKey("essays.id"))
    model: Mapped[str] = mapped_column(String(128))
    scores_json: Mapped[str] = mapped_column(Text, default="{}")
    overall: Mapped[float] = mapped_column(Float, default=0)
    feedback_json: Mapped[str] = mapped_column(Text, default="{}")
    summary: Mapped[str | None] = mapped_column(Text, default=None)
    created_at: Mapped[str] = mapped_column(String(32), default=utcnow_iso)


class PracticeRecord(Base):
    __tablename__ = "practice_records"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    user_id: Mapped[str] = mapped_column(String(36), default="local")
    question_id: Mapped[str] = mapped_column(ForeignKey("questions.id"))
    passage_id: Mapped[str] = mapped_column(ForeignKey("passages.id"))
    module: Mapped[str] = mapped_column(String(16))
    # 一次交卷产生的所有记录共享同一 attempt_id,用于统计每次得分
    attempt_id: Mapped[str | None] = mapped_column(String(36), default=None)
    user_answer_json: Mapped[str] = mapped_column(Text, default="null")
    is_correct: Mapped[bool] = mapped_column(Boolean, default=False)
    duration_s: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[str] = mapped_column(String(32), default=utcnow_iso)


class WrongQuestion(Base):
    __tablename__ = "wrong_questions"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    user_id: Mapped[str] = mapped_column(String(36), default="local")
    record_id: Mapped[str] = mapped_column(ForeignKey("practice_records.id"))
    question_id: Mapped[str] = mapped_column(ForeignKey("questions.id"))
    review_count: Mapped[int] = mapped_column(Integer, default=0)
    next_review_at: Mapped[str | None] = mapped_column(String(32), default=None)
    resolved: Mapped[bool] = mapped_column(Boolean, default=False)


class TranslationExercise(Base):
    __tablename__ = "translation_exercises"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    user_id: Mapped[str] = mapped_column(String(36), default="local")
    source_text: Mapped[str] = mapped_column(Text)
    ref_translation: Mapped[str | None] = mapped_column(Text, default=None)
    user_translation: Mapped[str] = mapped_column(Text)
    ai_feedback_json: Mapped[str | None] = mapped_column(Text, default=None)
    created_at: Mapped[str] = mapped_column(String(32), default=utcnow_iso)


class Note(Base):
    __tablename__ = "notes"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    user_id: Mapped[str] = mapped_column(String(36), default="local")
    word: Mapped[str] = mapped_column(String(128))
    context: Mapped[str | None] = mapped_column(Text, default=None)
    ai_explanation_json: Mapped[str | None] = mapped_column(Text, default=None)
    tags_json: Mapped[str | None] = mapped_column(Text, default=None)
    created_at: Mapped[str] = mapped_column(String(32), default=utcnow_iso)


class StudySession(Base):
    __tablename__ = "study_sessions"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    user_id: Mapped[str] = mapped_column(String(36), default="local")
    module: Mapped[str] = mapped_column(String(16))
    start_at: Mapped[str] = mapped_column(String(32))
    duration_s: Mapped[int] = mapped_column(Integer, default=0)


class AiConversation(Base):
    __tablename__ = "ai_conversations"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    user_id: Mapped[str] = mapped_column(String(36), default="local")
    role_mode: Mapped[str] = mapped_column(String(64), default="default")
    messages_json: Mapped[str] = mapped_column(Text, default="[]")
    updated_at: Mapped[str] = mapped_column(String(32), default=utcnow_iso)


class Setting(Base):
    __tablename__ = "settings"

    key: Mapped[str] = mapped_column(String(64), primary_key=True)
    value: Mapped[str] = mapped_column(Text)  # JSON 字符串
