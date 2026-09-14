from contextlib import asynccontextmanager
from datetime import datetime, timezone

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from app.api.ai import router as ai_router
from app.api.data import router as data_router
from app.api.health import router as health_router
from app.api.questions import router as questions_router
from app.core.config import settings
from app.database import Base, SessionLocal, engine
from app.models import entities  # noqa: F401  确保模型注册到 Base.metadata


@asynccontextmanager
async def lifespan(_: FastAPI):
    # M0:直接 create_all;引入迁移策略后替换(Alembic 或以导出文件为迁移载体)
    Base.metadata.create_all(bind=engine)
    _ensure_local_user()
    yield


def _ensure_local_user() -> None:
    """单用户模式:保证 id='local' 的默认用户存在。"""
    from app.models.entities import User

    with Session(engine) as session:
        if session.get(User, "local") is None:
            session.add(User(id="local", created_at=datetime.now(timezone.utc).isoformat()))
            session.commit()


app = FastAPI(title=settings.app_name, version=settings.version, lifespan=lifespan)

# 个人自用 + 本地优先:放开 CORS 以便前端直连;部署到公网前应收敛
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health_router, prefix="/api")
app.include_router(ai_router, prefix="/api/ai", tags=["ai"])
app.include_router(questions_router, prefix="/api/questions", tags=["questions"])
app.include_router(data_router, prefix="/api", tags=["data"])
