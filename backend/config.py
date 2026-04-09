from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    DATABASE_URL: str = "postgresql+asyncpg://aidb_user:aidb_secret_2024@localhost:5432/aidb"
    REDIS_URL: str = "redis://localhost:6379/0"
    SECRET_KEY: str = "your-super-secret-key-change-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440

    # 포인트 설정
    POINT_PER_VIEW: int = 30
    FREE_VIEW_COUNT: int = 3

    # 공공데이터 API
    LOCALDATA_API_KEY: str = ""
    LOCALDATA_BASE_URL: str = "https://www.localdata.go.kr/platform/rest/TO0/openDataApi"

    class Config:
        env_file = ".env"

settings = Settings()
