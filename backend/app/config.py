from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str = "postgresql+asyncpg://sentinela_user:senha@localhost:5432/sentinela"
    redis_url: str = "redis://localhost:6379"
    ollama_endpoint: str = "http://localhost:11434"
    ollama_model: str = "medgemma:4b"
    jwt_secret: str = "dev_secret_change_in_production"
    jwt_algorithm: str = "HS256"
    jwt_expire_minutes: int = 1440
    environment: str = "development"

    @property
    def is_dev(self) -> bool:
        return self.environment == "development"


settings = Settings()
