from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, LargeBinary, UniqueConstraint
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
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
    
    # 添加与声音相关的关系
    voices = relationship("Voice", back_populates="author")
    voice_likes = relationship("VoiceLike", back_populates="user")
    voice_collections = relationship("VoiceCollection", back_populates="user")

class Voice(Base):
    """声音数据库模型"""
    __tablename__ = "voices"
    
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False, comment="声音标题")
    preview = Column(String, nullable=False, comment="声音预览描述")
    avatar = Column(LargeBinary, nullable=True, comment="声音头像/封面图像数据")
    language = Column(String, default="zh", comment="声音语言类型，如中文、英文")
    audio_data = Column(String, nullable=False, comment="声音音频文件存储路径")
    is_public = Column(Boolean, default=True, comment="是否公开")
    
    # 统计数据
    play_count = Column(Integer, default=0, comment="播放次数")
    like_count = Column(Integer, default=0, comment="点赞次数")
    collect_count = Column(Integer, default=0, comment="收藏次数")
    
    # 外键关系
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, comment="作者ID")
    author = relationship("User", back_populates="voices")
    
    # 反向关系
    likes = relationship("VoiceLike", back_populates="voice", cascade="all, delete-orphan")
    collections = relationship("VoiceCollection", back_populates="voice", cascade="all, delete-orphan")
    
    # 时间戳
    created_at = Column(DateTime(timezone=True), server_default=func.now(), comment="创建时间")
    updated_at = Column(DateTime(timezone=True), onupdate=func.now(), comment="更新时间")

class VoiceLike(Base):
    """用户声音点赞关系表"""
    __tablename__ = "voice_likes"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, comment="用户ID")
    voice_id = Column(Integer, ForeignKey("voices.id"), nullable=False, comment="声音ID")
    created_at = Column(DateTime(timezone=True), server_default=func.now(), comment="点赞时间")
    
    # 关系
    user = relationship("User", back_populates="voice_likes")
    voice = relationship("Voice", back_populates="likes")
    
    # 唯一约束确保一个用户只能给一个声音点一次赞
    __table_args__ = (
        UniqueConstraint('user_id', 'voice_id', name='uq_user_voice_like'),
    )

class VoiceCollection(Base):
    """用户声音收藏关系表"""
    __tablename__ = "voice_collections"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, comment="用户ID")
    voice_id = Column(Integer, ForeignKey("voices.id"), nullable=False, comment="声音ID")
    created_at = Column(DateTime(timezone=True), server_default=func.now(), comment="收藏时间")
    
    # 关系
    user = relationship("User", back_populates="voice_collections")
    voice = relationship("Voice", back_populates="collections")
    
    # 唯一约束确保一个用户只能收藏一个声音一次
    __table_args__ = (
        UniqueConstraint('user_id', 'voice_id', name='uq_user_voice_collection'),
    )
