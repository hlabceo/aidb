from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    DATABASE_URL: str = "postgresql+asyncpg://aidb_user:aidb_secret_2024@localhost:5432/aidb"
    REDIS_URL: str = "redis://localhost:6379/0"
    SECRET_KEY: str = "your-super-secret-key-change-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440

    # 포인트 설정
    POINT_PER_VIEW: int = 30
    FREE_VIEW_COUNT: int = 3

    # 공공데이터포털 API (data.go.kr)
    DATA_GO_KR_API_KEY: str = ""
    DATA_GO_KR_BASE_URL: str = "https://apis.data.go.kr/1741000"

settings = Settings()
