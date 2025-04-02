from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from backend.api.v1 import api_router
from backend.core.config import settings
from backend.database.database import Base, engine

# 创建FastAPI应用实例
app = FastAPI(
    title="Parrot Sound API",
    description="鹦音坊 AI语音平台 API",
    version="1.0.0",
)

# 配置CORS
origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:3001",
    "http://127.0.0.1:3001",
    "http://127.0.0.1:5500",  #windows
    "http://127.0.0.1:46511",  # 添加代理服务器地址
    "http://localhost:8080",  # 添加Python HTTP服务器
    "http://127.0.0.1:8080",  # 添加Python HTTP服务器IP
    "http://127.0.0.1:35041",  # 添加Cascade代理服务器
    "*",  # 暂时允许所有源（仅用于开发环境）
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 包含所有API路由
app.include_router(api_router, prefix="/api/v1")

# 初始化数据库
Base.metadata.create_all(bind=engine)

# 定义根路径
@app.get("/")
async def read_root():
    return {"message": "欢迎使用鹦音坊API!"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
