from fastapi import APIRouter
from .auth import router as auth_router
from .profile import router as profile_router
from .admin import router as admin_router
from .tts import router as tts_router

# 创建API路由聚合器
api_router = APIRouter()

# 注册各模块路由
api_router.include_router(auth_router)
api_router.include_router(profile_router)
api_router.include_router(admin_router)
api_router.include_router(tts_router)
