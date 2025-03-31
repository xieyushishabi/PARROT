from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import timedelta
from pydantic import BaseModel

from backend.core.models import UserCreate, APIResponse, LoginRequest
from backend.database.models import User  
from backend.core.security import get_password_hash, verify_password, create_access_token
from backend.core.config import settings
from backend.database.database import get_db

router = APIRouter(tags=["认证"], prefix="/auth")

@router.post("/register")
async def register(user: UserCreate, db: Session = Depends(get_db)):
    """
    注册新用户
    """
    # 检查邮箱是否已存在
    db_user = db.query(User).filter(User.email == user.email).first()
    if db_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"error": "邮箱已被注册"}
        )
    
    # 检查用户名是否已存在
    db_user = db.query(User).filter(User.username == user.username).first()
    if db_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"error": "用户名已被使用"}
        )
    
    # 创建新用户
    hashed_password = get_password_hash(user.password)
    db_user = User(
        email=user.email,
        username=user.username,
        hashed_password=hashed_password
    )
    
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    
    user_data = {
        "id": db_user.id,
        "email": db_user.email,
        "username": db_user.username,
        "is_active": db_user.is_active,
        "created_at": db_user.created_at
    }
    
    return APIResponse(code=200, msg="注册成功", data=user_data)

@router.post("/login")
async def login(login_data: LoginRequest, db: Session = Depends(get_db)):
    """
    用户登录
    """
    # 查找用户
    user = db.query(User).filter(User.email == login_data.username).first()
    if not user:
        user = db.query(User).filter(User.username == login_data.username).first()
    
    if not user or not verify_password(login_data.password, user.hashed_password):
        return APIResponse(
            code=401, 
            msg="账号或密码错误",
            data=None
        )
    
    # 创建访问令牌
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.email},
        expires_delta=access_token_expires
    )
    
    return APIResponse(code=200, msg="登录成功", data={
        "access_token": access_token,
    })
