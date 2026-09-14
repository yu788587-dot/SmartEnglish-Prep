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


def test_ai_proxy_unconfigured_returns_503() -> None:
    from app.services.llm import upstream_ready

    client = TestClient(app)
    if upstream_ready():
        # CI/本地环境默认未配置 upstream;若开发者本机配置了则跳过该断言
        return
    resp = client.post(
        "/api/ai/chat",
        json={"messages": [{"role": "user", "content": "hi"}]},
    )
    assert resp.status_code == 503
    assert "not configured" in resp.json()["detail"]


def test_questions_import_and_list() -> None:
    client = TestClient(app)
    with TestClient(app):
        body = {
            "passages": [
                {
                    "id": "test-p1",
                    "title": "Test passage",
                    "module": "reading",
                    "level": "general",
                    "content_md": "Line one.\n\nLine two.",
                }
            ],
            "questions": [
                {
                    "id": "test-q1",
                    "passage_id": "test-p1",
                    "type": "mcq",
                    "stem": "Pick one",
                    "options_json": '[{"key":"A","text":"x"}]',
                    "answer": "A",
                    "order": 1,
                }
            ],
        }
        resp = client.post("/api/questions/import", json=body)
        assert resp.status_code == 200
        listing = client.get("/api/questions").json()
        assert any(p["id"] == "test-p1" for p in listing["passages"])
        assert any(q["id"] == "test-q1" for q in listing["questions"])
        resp = client.delete("/api/questions")
        assert resp.status_code == 200


def test_data_roundtrip() -> None:
    client = TestClient(app)
    with TestClient(app):
        resp = client.post(
            "/api/import-data",
            json={
                "data": {
                    "essays": [
                        {
                            "id": "test-e1",
                            "topicId": None,
                            "content": "Test essay body.",
                            "wordCount": 3,
                        }
                    ],
                    "studySessions": [
                        {
                            "id": "test-s1",
                            "module": "reading",
                            "startAt": "2026-09-15T00:00:00+00:00",
                            "durationS": 60,
                        }
                    ],
                }
            },
        )
        assert resp.status_code == 200
        exported = client.get("/api/export-data?format=json").json()
        assert exported["app"] == "SmartEnglish-Prep"
        assert any(e["id"] == "test-e1" for e in exported["data"]["essays"])
        assert any(s["id"] == "test-s1" for s in exported["data"]["studySessions"])
        xlsx = client.get("/api/export-data?format=xlsx")
        assert xlsx.status_code == 200
        assert len(xlsx.content) > 200
