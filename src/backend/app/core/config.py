from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    database_url: str = "postgresql+psycopg://burndo:burndo@localhost:5432/burndo"
    cors_origins: str = "http://localhost:5173"
    session_ttl_days: int = 14
    password_reset_ttl_minutes: int = 15
    cookie_secure: bool = False
    cookie_name: str = "burndo_session"
    smtp_host: str = "localhost"
    smtp_port: int = 1025
    smtp_from: str = "noreply@burndo.local"
    frontend_origin: str = "http://localhost:5173"
    default_timezone: str = "Europe/Moscow"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    @property
    def cors_origin_list(self) -> list[str]:
        return [item.strip() for item in self.cors_origins.split(",") if item.strip()]


settings = Settings()
