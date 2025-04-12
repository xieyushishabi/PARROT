from datetime import datetime, timedelta
from typing import Optional
from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi import Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from backend.database.database import get_db
import logging

from backend.core.config import settings

# 密码哈希上下文
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# OAuth2 密码Bearer模式
oauth2_scheme = OAuth2PasswordBearer(tokenUrl=f"{settings.API_V1_STR}/auth/login")

# 日志记录器
logger = logging.getLogger(__name__)

def verify_password(plain_password, hashed_password):
    """验证密码"""
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    """获取密码哈希"""
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    """创建访问令牌"""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt

async def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db) 
):
    """获取当前用户"""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="无法验证凭据",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception
        
        # 从数据库获取用户
        from backend.database.models import User  # 导入User模型
        user = db.query(User).filter(User.email == email).first()
        
        if user is None:
            raise credentials_exception
            
        return user  # 返回完整的User对象
    
    except JWTError:
        raise credentials_exception

# 定义可选的OAuth2密码Bearer模式
# 这允许请求中没有认证令牌
class OptionalOAuth2PasswordBearer(OAuth2PasswordBearer):
    async def __call__(self, request: Request = None):
        if request is None:
            return None
        try:
            return await super().__call__(request)
        except HTTPException:
            return None

# 创建可选的OAuth2实例
optional_oauth2_scheme = OptionalOAuth2PasswordBearer(tokenUrl=f"{settings.API_V1_STR}/auth/login")

async def get_optional_user(
    token: Optional[str] = Depends(optional_oauth2_scheme),
    db: Session = Depends(get_db)
):
    """
    获取当前用户（可选的，不存在则返回None）
    """
    try:
        if not token:
            return None
            
        # 正常的用户认证逻辑
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            return None
        
        # 从数据库获取用户
        from backend.database.models import User
        user = db.query(User).filter(User.email == email).first()
        return user
    
    except Exception as e:
        # 如果认证过程中出现任何错误，只需返回None
        logger.warning(f"可选用户认证失败: {str(e)}")
        return None