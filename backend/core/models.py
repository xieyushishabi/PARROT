from pydantic import BaseModel, EmailStr, Field, validator
from typing import Optional, Any
from fastapi import UploadFile
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import Optional, Tuple, List
from datetime import datetime
from backend.database.models import User 

# 用户注册请求模型
class UserCreate(BaseModel):
    username: str
    email: str
    password: str

# 登录请求模型
class LoginRequest(BaseModel):
    username: str
    password: str

# 管理员登录请求模型
class AdminLogin(BaseModel):
    """管理员登录请求"""
    username: str = Field(..., description="管理员用户名")
    password: str = Field(..., description="管理员密码")

    class Config:
        json_schema_extra = {
            "example": {
                "username": "admin",
                "password": "admin123"
            }
        }

# API 响应模型
class APIResponse(BaseModel):
    code: int
    msg: str
    data: dict = None

# Pydantic 模型 - 用户相关
class UserBase(BaseModel):
    """用户基础信息"""
    email: EmailStr = Field(..., description="用户邮箱")
    username: str = Field(..., description="用户名")

class UserCreate(UserBase):
    """用户创建请求"""
    password: str = Field(..., min_length=6, description="用户密码")

class UserLogin(BaseModel):
    """用户登录请求"""
    email: EmailStr = Field(..., description="用户邮箱")
    password: str = Field(..., description="用户密码")

    class Config:
        json_schema_extra = {
            "example": {
                "email": "user@example.com",
                "password": "password123"
            }
        }

class TokenData(BaseModel):
    """令牌数据"""
    email: Optional[str] = Field(None, description="用户邮箱")
    username: Optional[str] = Field(None, description="用户名")

# 用户资料更新模型
class ProfileUpdate(BaseModel):
    phone_number: Optional[str] = None
    age: Optional[int] = None
    gender: Optional[str] = None
    avatar: Optional[UploadFile] = None
    
    @validator('phone_number')
    def validate_phone(cls, v):
        if v and (not v.isdigit() or len(v) != 11):
            raise ValueError('无效的手机号码')
        return v
    
    @validator('age')
    def validate_age(cls, v):
        if v is not None and (v < 0 or v > 120):
            raise ValueError('年龄必须在0-120之间')
        return v
    
    @validator('gender')
    def validate_gender(cls, v):
        # 如果为空则直接返回
        if v is None:
            return v
            
        # 适配英文性别值
        valid_genders = {'male', 'female', 'other', '男', '女', '其他'}
        if v not in valid_genders:
            raise ValueError("性别必须是 男、女、其他 或 male、female、other")
            
        # 将英文转换为中文
        gender_mapping = {
            'male': '男',
            'female': '女',
            'other': '其他'
        }
        return gender_mapping.get(v, v)

# 用户资料响应模型
class ProfileResponse(BaseModel):
    username: str
    email: str
    phone_number: Optional[str] = None
    age: Optional[int] = None
    gender: Optional[str] = None
    avatar: Optional[bool] = None  # 是否有头像

def get_users(
    db: Session,
    username: Optional[str] = None,
    phone: Optional[str] = None,
    register_date: Optional[str] = None,
    skip: int = 0,
    limit: int = 100
) -> Tuple[List[User], int]:
    """
    获取用户列表，支持筛选
    
    Args:
        db: 数据库会话
        username: 用户名过滤
        phone: 手机号过滤
        register_date: 注册日期过滤
        skip: 跳过的记录数
        limit: 返回的最大记录数
        
    Returns:
        Tuple[List[User], int]: 用户列表和总记录数
    """
    query = db.query(User)
    
    # 添加筛选条件
    if username:
        query = query.filter(User.username.like(f"%{username}%"))
    if phone:
        query = query.filter(User.phone.like(f"%{phone}%"))
    if register_date:
        # 假设register_date格式为"YYYY-MM-DD"
        try:
            date = datetime.strptime(register_date, "%Y-%m-%d")
            query = query.filter(
                func.date(User.created_at) == date.date()
            )
        except ValueError:
            pass  # 日期格式不正确，忽略该筛选条件
    
    # 获取总记录数
    total = query.count()
    
    # 分页
    users = query.offset(skip).limit(limit).all()
    
    return users, total

# 用户信息更新请求模型
class UserUpdate(BaseModel):
    username: Optional[str] = None
    age: Optional[int] = None
    gender: Optional[str] = None
    phone_number: Optional[str] = None
    created_at: Optional[str] = None
    password: Optional[str] = None

class AdminUserCreate(BaseModel):
    username: str
    password: str
    phone_number: str
    email: str
    age: Optional[int] = None
    gender: Optional[str] = None
    created_at: Optional[str] = None