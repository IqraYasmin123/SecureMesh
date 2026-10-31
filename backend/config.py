from pydantic_settings import BaseSettings
from functools import lru_cache
import base64

class Settings(BaseSettings):
    SECRET_KEY: str = "securemesh-dev-secret-change-in-prod"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    DATABASE_URL: str = "sqlite:///./securemesh.db"
    ENCRYPTION_KEY: str = ""
    DEMO_ADMIN_PASSWORD: str = "Admin@SecureMesh2024"
    DEMO_ANALYST_PASSWORD: str = "Analyst@SecureMesh2024"
    DEMO_VIEWER_PASSWORD: str = "Viewer@SecureMesh2024"

    model_config = {"env_file": ".env", "extra": "ignore"}

    def get_encryption_key_bytes(self) -> bytes:
        if self.ENCRYPTION_KEY:
            try:
                return base64.b64decode(self.ENCRYPTION_KEY)
            except Exception:
                pass
        # Derive a deterministic key from SECRET_KEY for demo purposes
        import hashlib
        return hashlib.sha256(self.SECRET_KEY.encode()).digest()

@lru_cache()
def get_settings() -> Settings:
    return Settings()
