from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, LargeBinary
from sqlalchemy.sql import func
from backend.database.database import Base

class User(Base):
    """用户数据库模型"""
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False, comment="用户邮箱")
    username = Column(String, unique=True, index=True, nullable=False, comment="用户名")
    hashed_password = Column(String, nullable=False, comment="哈希后的密码")
    is_active = Column(Boolean, default=True, comment="是否激活")
    created_at = Column(DateTime(timezone=True), server_default=func.now(), comment="创建时间")
    updated_at = Column(DateTime(timezone=True), onupdate=func.now(), comment="更新时间")
    
    phone_number = Column(String, nullable=True, comment="手机号")
    age = Column(Integer, nullable=True, comment="年龄")
    gender = Column(String, default="男", comment="性别")
    avatar = Column(LargeBinary, nullable=True, comment="用户头像图像数据")
    security_question1_answer = Column(String, nullable=True, comment="密保问题1:您的生日是？")
    security_question2_answer = Column(String, nullable=True, comment="密保问题2:您母亲的名字是？")
    security_question3_answer = Column(String, nullable=True, comment="密保问题3:您就读的小学是？")
