from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, LargeBinary, UniqueConstraint
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from backend.database.database import Base

class Admin(Base):
    """管理员数据库模型"""
    __tablename__ = "admins"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True, nullable=False, comment="管理员用户名")
    password = Column(String, nullable=False, comment="管理员密码")

class SiteVisit(Base):
    """站点访问智能配音界面记录数据库模型"""
    __tablename__ = "site_visits"
    
    id = Column(Integer, primary_key=True, index=True)
    visit_date = Column(DateTime(timezone=True), server_default=func.now(), comment="访问日期")
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True, comment="访问用户ID，未登录为空")

class FeatureUsage(Base):
    """功能使用记录模型"""
    __tablename__ = "feature_usages"
    
    id = Column(Integer, primary_key=True, index=True)
    feature_type = Column(String, nullable=False, comment="功能类型：教育教学、智能配音、声音克隆")
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True, comment="使用用户ID，未登录可为空")
    timestamp = Column(DateTime(timezone=True), server_default=func.now(), comment="使用时间")

class UserDailyActivity(Base):
    """用户每日活跃记录"""
    __tablename__ = "user_daily_activities"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, comment="用户ID")
    activity_date = Column(DateTime(timezone=True), server_default=func.now(), comment="活动日期")
    activity_count = Column(Integer, default=1, comment="活动次数")
    
    __table_args__ = (
        UniqueConstraint('user_id', 'activity_date', name='uq_user_daily_activity'),
    )

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
    operations = relationship("UserOperationHistory", backref="user")

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
    status = Column(String, default="pending", comment="审核状态：pending(待审核)、passed(已通过)、failed(未通过)")
    
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

class UserOperationHistory(Base):
    """用户操作历史数据库模型"""
    __tablename__ = "user_operation_history"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, comment="用户ID")
    operation_type = Column(String, nullable=False, comment="操作类型，如：配音、克隆、教学等")
    operation_detail = Column(String, nullable=True, comment="操作详情描述")
    resource_id = Column(Integer, nullable=True, comment="关联资源ID，如音频ID等")
    resource_type = Column(String, nullable=True, comment="资源类型，如音频、视频等")
    created_at = Column(DateTime(timezone=True), server_default=func.now(), comment="操作时间")

class TeachingAvatar(Base):
    """数字人资源数据库模型"""
    __tablename__ = "teaching_avatars"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False, comment="数字人名称")
    avatar_path = Column(String, nullable=False, comment="数字人图像存储路径")
    gender = Column(String, nullable=True, comment="性别：男、女")
    pose_type = Column(String, nullable=True, comment="姿势类型")
    is_system = Column(Boolean, default=True, comment="是否系统预设")
    
    # 外键关系(仅自定义头像需要)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True, comment="创建者ID")
    
    # 时间戳
    created_at = Column(DateTime(timezone=True), server_default=func.now(), comment="创建时间")

class TeachingBackground(Base):
    """背景资源数据库模型"""
    __tablename__ = "teaching_backgrounds"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False, comment="背景名称")
    background_path = Column(String, nullable=False, comment="背景图像存储路径")
    category = Column(String, nullable=True, comment="背景类别")
    is_system = Column(Boolean, default=True, comment="是否系统预设")
    
    # 外键关系(仅自定义背景需要)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True, comment="创建者ID")
    
    # 时间戳
    created_at = Column(DateTime(timezone=True), server_default=func.now(), comment="创建时间")

class TeachingMusic(Base):
    """音乐资源数据库模型"""
    __tablename__ = "teaching_music"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False, comment="音乐名称")
    music_path = Column(String, nullable=False, comment="音乐文件存储路径")
    duration = Column(Integer, nullable=False, comment="音乐时长(秒)")
    category = Column(String, nullable=True, comment="音乐类别")
    is_system = Column(Boolean, default=True, comment="是否系统预设")
    
    # 外键关系(仅自定义音乐需要)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True, comment="创建者ID")
    
    # 时间戳
    created_at = Column(DateTime(timezone=True), server_default=func.now(), comment="创建时间")

class TeachingResource(Base):
    """教学资源数据库模型"""
    __tablename__ = "teaching_resources"
    
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False, comment="教学资源标题")
    description = Column(String, nullable=True, comment="教学资源描述")
    ppt_path = Column(String, nullable=True, comment="PPT文件存储路径")
    ppt_images_dir = Column(String, nullable=True, comment="PPT图片目录路径")
    
    # 关联资源
    avatar_id = Column(Integer, ForeignKey("teaching_avatars.id"), nullable=True)
    background_id = Column(Integer, ForeignKey("teaching_backgrounds.id"), nullable=True)
    music_id = Column(Integer, ForeignKey("teaching_music.id"), nullable=True)
    
    # 外键关系
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, comment="创建者ID")
    
    # 时间戳
    created_at = Column(DateTime(timezone=True), server_default=func.now(), comment="创建时间")
    updated_at = Column(DateTime(timezone=True), onupdate=func.now(), comment="更新时间")

class Teaching(Base):
    """教学内容数据库模型"""
    __tablename__ = "teachings"
    
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False, comment="教学标题")
    description = Column(String, nullable=True, comment="教学描述")
    status = Column(String, default="draft", comment="状态：draft(草稿)、published(已发布)")
    is_public = Column(Boolean, default=True, comment="是否公开")
    
    # 关联资源
    resource_id = Column(Integer, ForeignKey("teaching_resources.id"), nullable=False)
    resource = relationship("TeachingResource")
    
    # 外键关系
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, comment="创建者ID")
    user = relationship("User")
    
    # 时间戳
    created_at = Column(DateTime(timezone=True), server_default=func.now(), comment="创建时间")
    updated_at = Column(DateTime(timezone=True), onupdate=func.now(), comment="更新时间")    
    category = Column(String, nullable=True, comment="音乐类别：放松、紧张等")
    is_system = Column(Boolean, default=True, comment="是否系统预设")
    
    # 外键关系(仅自定义音乐需要)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True, comment="创建者ID")
    
    # 时间戳
    created_at = Column(DateTime(timezone=True), server_default=func.now(), comment="创建时间")
