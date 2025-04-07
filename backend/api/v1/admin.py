from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_
from typing import Optional
from datetime import datetime
from pydantic import BaseModel
import os
from fastapi.responses import FileResponse

from backend.core.models import AdminUserCreate, APIResponse, UserUpdate, VoiceReviewRequest
from backend.database.models import User, Voice
from backend.database.database import get_db
from backend.core.security import get_password_hash

router = APIRouter(tags=["管理"], prefix="/admin")

@router.get("/users", response_model=APIResponse)
def get_user_list(
    id: Optional[int] = None,
    username: Optional[str] = None,
    phone: Optional[str] = None,
    date_range: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """
    获取用户信息列表，支持按条件筛选
    
    - id: 按用户ID筛选
    - username: 按用户名筛选（模糊匹配）
    - phone: 按手机号筛选（模糊匹配）
    - date_range: 按注册时间筛选（格式：YYYY-MM-DD 或 YYYY-MM-DD to YYYY-MM-DD）
    """
    # 构建查询条件
    query = db.query(User)
    
    # 按ID筛选
    if id is not None:
        query = query.filter(User.id == id)
    
    # 按用户名筛选
    if username:
        query = query.filter(User.username.like(f"%{username}%"))
    
    # 按手机号筛选
    if phone:
        query = query.filter(User.phone_number.like(f"%{phone}%"))
    
    # 按日期范围筛选
    if date_range:
        try:
            # 调试输出
            print(f"处理注册时间筛选: {date_range}")
            
            # 尝试查找可能的分隔符：" to "、"至"、"到"、"-"、" - "
            separators = [" to ", "至", "到", " - ", "-"]
            found_separator = None
            
            for sep in separators:
                if sep in date_range:
                    found_separator = sep
                    break
            
            if found_separator:
                # 日期范围格式
                start_date_str, end_date_str = date_range.split(found_separator)
                start_date = datetime.strptime(start_date_str.strip(), "%Y-%m-%d")
                end_date = datetime.strptime(end_date_str.strip(), "%Y-%m-%d")
                # 设置为当天结束时间
                end_date = end_date.replace(hour=23, minute=59, second=59)
                
                print(f"日期范围筛选: {start_date} 到 {end_date}")
                
                query = query.filter(and_(
                    User.created_at >= start_date,
                    User.created_at <= end_date
                ))
            else:
                # 单个日期格式
                date = datetime.strptime(date_range.strip(), "%Y-%m-%d")
                next_day = date.replace(hour=23, minute=59, second=59)
                
                print(f"单日期筛选: {date} 到 {next_day}")
                
                query = query.filter(and_(
                    User.created_at >= date,
                    User.created_at <= next_day
                ))
        except ValueError as e:
            # 日期格式错误，记录错误并忽略该筛选条件
            print(f"日期解析错误: {e}")
            pass
    
    # 执行查询
    users = query.all()
    
    # 格式化用户数据
    user_list = []
    for idx, user in enumerate(users):
        user_list.append({
            "id": user.id,
            "index": idx + 1,  # 序号
            "username": user.username,
            "phone": user.phone_number,
            "password": "******",
            "gender": "男" if user.gender == "male" else "女" if user.gender == "female" else user.gender,  # 确保性别为中文
            "age": user.age,
            "register_time": user.created_at.strftime("%Y-%m-%d %H:%M:%S") if user.created_at else ""
        })
    
    return {
        "code": 200,
        "msg": "获取用户列表成功",
        "data": {
            "users": user_list,
            "total": len(user_list)
        }
    }

@router.post("/update_user/{user_id}", response_model=APIResponse)
def update_user_info(
    user_id: int,
    user_data: UserUpdate,
    db: Session = Depends(get_db)
):
    """
    修改用户信息
    
    - user_id: 要修改的用户ID
    - user_data: 包含用户名、年龄、性别、手机号、注册时间、密码（可选）的数据
    """
    # 查找用户
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="用户不存在"
        )
    
    # 更新用户信息
    if user_data.username is not None:
        # 检查用户名是否已被其他用户使用
        existing_user = db.query(User).filter(
            User.username == user_data.username,
            User.id != user_id  # 排除当前用户
        ).first()
        
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="用户名已存在"
            )
        
        user.username = user_data.username
    
    if user_data.age is not None:
        user.age = user_data.age
    
    if user_data.gender is not None:
        # 处理性别格式（转换中文到英文存储）
        if user_data.gender == "男":
            user.gender = "male"
        elif user_data.gender == "女":
            user.gender = "female"
        else:
            user.gender = user_data.gender
    
    if user_data.phone_number is not None:
        user.phone_number = user_data.phone_number
    
    if user_data.created_at is not None:
        try:
            user.created_at = datetime.strptime(user_data.created_at, "%Y-%m-%d %H:%M:%S")
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="日期格式错误，应为 YYYY-MM-DD HH:MM:SS"
            )
    
    if user_data.password is not None and user_data.password.strip():
        user.hashed_password = get_password_hash(user_data.password)
    
    # 提交更改
    try:
        db.commit()
        db.refresh(user)
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"更新用户信息失败: {str(e)}"
        )
    
    # 返回更新后的用户信息
    updated_user = {
        "id": user.id,
        "username": user.username,
        "phone": user.phone_number,
        "gender": "男" if user.gender == "male" else "女" if user.gender == "female" else user.gender,
        "age": user.age,
        "register_time": user.created_at.strftime("%Y-%m-%d %H:%M:%S") if user.created_at else ""
    }
    
    return {
        "code": 200,
        "msg": "用户信息更新成功",
        "data": updated_user
    }

@router.post("/add_user", response_model=APIResponse)
def add_user(
    user_data: AdminUserCreate,
    db: Session = Depends(get_db)
):
    """
    添加新用户
    
    - user_data: 包含用户名、密码、手机号、邮箱、年龄、性别、注册时间的数据
    """
    # 检查用户名是否已存在
    existing_user = db.query(User).filter(User.username == user_data.username).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="用户名已存在"
        )
    
    # 检查邮箱是否已存在
    if user_data.email:
        existing_email_user = db.query(User).filter(User.email == user_data.email).first()
        if existing_email_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="邮箱已存在"
            )
    
    # 创建新用户
    new_user = User(
        username=user_data.username,
        hashed_password=get_password_hash(user_data.password),
        phone_number=user_data.phone_number,
        email=user_data.email,  # 添加邮箱字段
        age=user_data.age,
    )
    
    # 处理性别格式（转换中文到英文存储）
    if user_data.gender:
        if user_data.gender == "男":
            new_user.gender = "male"
        elif user_data.gender == "女":
            new_user.gender = "female"
        else:
            new_user.gender = user_data.gender
    
    # 处理注册时间
    if user_data.created_at:
        try:
            new_user.created_at = datetime.strptime(user_data.created_at, "%Y-%m-%d %H:%M:%S")
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="日期格式错误，应为 YYYY-MM-DD HH:MM:SS"
            )
    
    # 提交到数据库
    try:
        db.add(new_user)
        db.commit()
        db.refresh(new_user)
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"添加用户失败: {str(e)}"
        )
    
    # 返回新用户信息
    created_user = {
        "id": new_user.id,
        "username": new_user.username,
        "phone": new_user.phone_number,
        "email": new_user.email,  # 返回邮箱字段
        "gender": "男" if new_user.gender == "male" else "女" if new_user.gender == "female" else new_user.gender,
        "age": new_user.age,
        "register_time": new_user.created_at.strftime("%Y-%m-%d %H:%M:%S") if new_user.created_at else ""
    }
    
    return {
        "code": 200,
        "msg": "用户添加成功",
        "data": created_user
    }

@router.delete("/delete_user/{user_id}", response_model=APIResponse)
def delete_user(
    user_id: int,
    db: Session = Depends(get_db)
):
    """
    删除用户
    
    - user_id: 要删除的用户ID
    """
    # 查找用户
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="用户不存在"
        )
    
    # 删除用户
    try:
        db.delete(user)
        db.commit()
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"删除用户失败: {str(e)}"
        )
    
    return {
        "code": 200,
        "msg": "用户删除成功",
        "data": {"id": user_id}
    }
    
@router.get("/voices", response_model=APIResponse)
def get_voices_list(
    title: Optional[str] = None,
    username: Optional[str] = None,
    upload_time: Optional[str] = None,
    status: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """
    获取语音资源列表，支持按条件筛选
    
    - title: 按标题筛选（模糊匹配）
    - username: 按用户名筛选（模糊匹配）
    - upload_time: 按上传时间筛选（格式：YYYY-MM-DD 或 YYYY-MM-DD to YYYY-MM-DD）
    - status: 按审核状态筛选 (pending/passed/failed)
    """
    # 联合查询Voice和User表
    query = db.query(Voice, User).join(User, User.id == Voice.user_id)
    
    # 按标题筛选
    if title:
        query = query.filter(Voice.title.like(f"%{title}%"))
    
    # 按用户名筛选
    if username:
        query = query.filter(User.username.like(f"%{username}%"))
    
    # 按上传时间筛选
    if upload_time:
        try:
            # 调试输出
            print(f"处理上传时间筛选: {upload_time}")
            
            # 尝试查找可能的分隔符：" to "、"至"、"到"、"-"、" - "
            separators = [" to ", "至", "到", " - ", "-"]
            found_separator = None
            
            for sep in separators:
                if sep in upload_time:
                    found_separator = sep
                    break
            
            if found_separator:
                # 日期范围格式
                start_date_str, end_date_str = upload_time.split(found_separator)
                start_date = datetime.strptime(start_date_str.strip(), "%Y-%m-%d")
                end_date = datetime.strptime(end_date_str.strip(), "%Y-%m-%d")
                # 设置为当天结束时间
                end_date = end_date.replace(hour=23, minute=59, second=59)
                
                print(f"日期范围筛选: {start_date} 到 {end_date}")
                
                query = query.filter(and_(
                    Voice.created_at >= start_date,
                    Voice.created_at <= end_date
                ))
            else:
                # 单个日期格式
                date = datetime.strptime(upload_time.strip(), "%Y-%m-%d")
                next_day = date.replace(hour=23, minute=59, second=59)
                
                print(f"单日期筛选: {date} 到 {next_day}")
                
                query = query.filter(and_(
                    Voice.created_at >= date,
                    Voice.created_at <= next_day
                ))
        except ValueError as e:
            # 日期格式错误，记录错误并忽略该筛选条件
            print(f"日期解析错误: {e}")
            pass
    
    # 按审核状态筛选
    if status:
        query = query.filter(Voice.status == status)
    
    # 执行查询
    results = query.all()
    
    # 格式化返回数据
    voice_list = []
    for idx, (voice, user) in enumerate(results):
        voice_list.append({
            "id": voice.id,
            "index": idx + 1,  # 序号
            "username": user.username,
            "title": voice.title,
            "uploadTime": voice.created_at.strftime("%Y-%m-%d %H:%M:%S") if voice.created_at else "",
            "status": voice.status,  # 直接使用status字段
            "audioUrl": voice.audio_data,  # 音频文件路径
            "preview": voice.preview,
            "language": voice.language
        })
    
    return {
        "code": 200,
        "msg": "获取语音资源列表成功",
        "data": {
            "voices": voice_list,
            "total": len(voice_list)
        }
    }

@router.get("/voices/{voice_id}", response_model=APIResponse)
def get_voice_detail(
    voice_id: int,
    db: Session = Depends(get_db)
):
    """
    获取单个语音资源详情
    
    - voice_id: 语音资源ID
    """
    # 联合查询获取语音和用户信息
    result = db.query(Voice, User).join(User, User.id == Voice.user_id).filter(Voice.id == voice_id).first()
    
    if not result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="语音资源不存在"
        )
    
    voice, user = result
    
    # 将二进制头像数据转换为Base64字符串（如果存在）
    avatar_base64 = None
    if voice.avatar:
        import base64
        avatar_base64 = base64.b64encode(voice.avatar).decode('utf-8')
    
    # 将用户头像数据转换为Base64字符串（如果存在）
    user_avatar_base64 = None
    if user.avatar:
        import base64
        user_avatar_base64 = base64.b64encode(user.avatar).decode('utf-8')
    
    # 格式化详情数据
    voice_detail = {
        "id": voice.id,
        "title": voice.title,
        "preview": voice.preview,
        "avatar": avatar_base64,  # Base64编码的图像数据
        "avatar_url": f"/api/v1/voices/{voice.id}/avatar",  # 或提供获取头像的URL
        "language": voice.language,
        "audio_url": f"/api/v1/voices/{voice.id}/audio",  # 提供获取音频的URL
        "is_public": voice.is_public,
        "status": voice.status,  # 直接使用status字段
        "play_count": voice.play_count,
        "like_count": voice.like_count,
        "collect_count": voice.collect_count,
        "created_at": voice.created_at.strftime("%Y-%m-%d %H:%M:%S") if voice.created_at else "",
        "user": {
            "id": user.id,
            "username": user.username,
            "avatar": user_avatar_base64  # 添加用户头像的Base64编码数据
        }
    }
    return {
        "code": 200,
        "msg": "获取语音资源详情成功",
        "data": voice_detail
    }

@router.put("/voices/{voice_id}/review", response_model=APIResponse)
def review_voice(
    voice_id: int,
    review_data: VoiceReviewRequest,
    db: Session = Depends(get_db)
):
    """
    审核语音资源
    
    - voice_id: 要审核的语音资源ID
    - review_data: 包含审核状态的数据（passed或failed）
    """
    # 查找语音资源
    voice = db.query(Voice).filter(Voice.id == voice_id).first()
    if not voice:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="语音资源不存在"
        )
    
    # 更新审核状态
    if review_data.status in ["passed", "failed", "pending"]:
        voice.status = review_data.status
        # 同时更新is_public字段以保持兼容性
        voice.is_public = (review_data.status == "passed")
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="无效的审核状态，应为 'passed'、'failed' 或 'pending'"
        )
    
    # 提交更改
    try:
        db.commit()
        db.refresh(voice)
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"审核语音资源失败: {str(e)}"
        )
    
    return {
        "code": 200,
        "msg": f"语音资源已{'通过' if review_data.status == 'passed' else '拒绝'}审核",
        "data": {
            "id": voice.id,
            "status": voice.status
        }
    }

@router.delete("/voices/{voice_id}", response_model=APIResponse)
def delete_voice(
    voice_id: int,
    db: Session = Depends(get_db)
):
    """
    删除语音资源
    
    - voice_id: 要删除的语音资源ID
    """
    # 查找语音资源
    voice = db.query(Voice).filter(Voice.id == voice_id).first()
    if not voice:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="语音资源不存在"
        )
    
    # 获取音频文件路径，以便删除文件
    audio_file_path = voice.audio_data
    
    # 删除语音资源记录
    try:
        db.delete(voice)
        db.commit()
        
        # 删除关联的音频文件
        if audio_file_path and os.path.exists(audio_file_path):
            import os
            os.remove(audio_file_path)
            
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"删除语音资源失败: {str(e)}"
        )
    
    return {
        "code": 200,
        "msg": "语音资源删除成功",
        "data": {"id": voice_id}
    }

@router.get("/voices/{voice_id}/audio")
def get_voice_audio(
    voice_id: int,
    db: Session = Depends(get_db)
):
    """
    获取语音资源的音频文件
    
    - voice_id: 语音资源ID
    """
    # 查找语音资源
    voice = db.query(Voice).filter(Voice.id == voice_id).first()
    if not voice:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="语音资源不存在"
        )
    
    # 获取音频文件路径
    audio_path = voice.audio_data
    
    # 检查文件是否存在
    if not audio_path or not os.path.exists(audio_path):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="音频文件不存在"
        )
    
    # 返回音频文件
    return FileResponse(audio_path, media_type="audio/wav", filename=f"声音资源_{voice.id}.wav")

