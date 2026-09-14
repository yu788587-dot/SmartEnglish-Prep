from fastapi.testclient import TestClient

from app.main import app


def test_health() -> None:
    client = TestClient(app)
    resp = client.get("/api/health")
    assert resp.status_code == 200
    body = resp.json()
    assert body["status"] == "ok"
    assert body["app"] == "SmartEnglish-Prep"


def test_local_user_seeded() -> None:
    from sqlalchemy import select

    from app.database import SessionLocal, engine
    from app.models.entities import User

    # 进入 TestClient 上下文会触发 lifespan(startup:建表 + 种子用户)
    with TestClient(app):
        with SessionLocal() as session:
            user = session.scalar(select(User).where(User.id == "local"))
            assert user is not None
    engine.dispose()
