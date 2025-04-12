from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker

from backend.core.config import settings

# 创建数据库引擎
engine = create_engine(
    settings.DATABASE_URL, connect_args={"check_same_thread": False}
)

# 创建异步数据库引擎
async_engine = create_async_engine(
    settings.DATABASE_URL.replace('sqlite:///', 'sqlite+aiosqlite:///'),
    connect_args={"check_same_thread": False}
)

# 创建会话工厂
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# 创建异步会话工厂
async_session = sessionmaker(
    async_engine,
    class_=AsyncSession,
    expire_on_commit=False
)

# 创建基础模型类
Base = declarative_base()

# 依赖函数，用于在API端点中获取数据库会话
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
