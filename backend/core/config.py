import os
import secrets
from pydantic_settings import BaseSettings
from typing import Any, Dict, List, Optional, Union

class Settings(BaseSettings):
    PROJECT_NAME: str = "Parrot Sound API"
    API_V1_STR: str = "/api/v1"
    SECRET_KEY: str = secrets.token_urlsafe(32)
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days
    
    # 服务器配置
    HOST: str = "127.0.0.1"
    PORT: int = 8000
    DEBUG: bool = True
    
    # 数据库位置
    DATABASE_URL: str = "sqlite:///./backend/parrot_sound.db"
    
    # JWT配置
    ALGORITHM: str = "HS256"
    
    class Config:
        case_sensitive = True
        env_file = ".env"

settings = Settings()
