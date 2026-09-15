from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_prefix="SEP_", env_file=".env", extra="ignore")

    app_name: str = "SmartEnglish-Prep"
    version: str = "1.1.0"
    database_url: str = "sqlite:///./app.db"
    # 可选 AI 代理使用;留空表示后端不代理 AI
    ai_base_url: str = ""
    ai_api_key: str = ""
    ai_model: str = ""


settings = Settings()
