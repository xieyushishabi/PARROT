from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_
from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel
import os
from fastapi.responses import FileResponse

from backend.core.models import AdminUserCreate, APIResponse, UserUpdate, VoiceReviewRequest, BatchVoiceReviewRequest, BatchUserDeleteRequest
from backend.database.models import User, Voice, UserOperationHistory
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

@router.post("/batch_delete_users", response_model=APIResponse)
def batch_delete_users(
    delete_data: BatchUserDeleteRequest,
    db: Session = Depends(get_db)
):
    """
    批量删除用户
    
    - delete_data: 包含要删除的用户ID列表
    """
    if not delete_data.user_ids:
        return {
            "code": 400,
            "msg": "用户ID列表不能为空",
            "data": None
        }
    
    # 查找所有指定的用户
    users = db.query(User).filter(User.id.in_(delete_data.user_ids)).all()
    
    # 检查是否找到所有用户
    found_ids = [user.id for user in users]
    not_found_ids = [id for id in delete_data.user_ids if id not in found_ids]
    
    if not_found_ids:
        return {
            "code": 404,
            "msg": f"部分用户不存在: {', '.join(map(str, not_found_ids))}",
            "data": None
        }
    
    # 批量删除用户
    deleted_count = 0
    try:
        for user in users:
            db.delete(user)
            deleted_count += 1
        
        db.commit()
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"批量删除用户失败: {str(e)}"
        )
    
    return {
        "code": 200,
        "msg": f"成功删除 {deleted_count} 个用户",
        "data": {
            "deleted_count": deleted_count,
            "deleted_ids": found_ids
        }
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

@router.post("/voices/batch_review", response_model=APIResponse)
def batch_review_voices(
    review_data: BatchVoiceReviewRequest,
    db: Session = Depends(get_db)
):
    """
    批量审核语音资源
    
    - review_data: 包含多个语音资源ID和状态的数据
    """
    # 验证状态值是否有效
    if review_data.status not in ["passed", "failed", "pending"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="无效的审核状态，应为 'passed'、'failed' 或 'pending'"
        )
    
    # 查找所有指定的语音资源
    voices = db.query(Voice).filter(Voice.id.in_(review_data.voice_ids)).all()
    
    # 检查是否找到所有资源
    found_ids = [voice.id for voice in voices]
    not_found_ids = [id for id in review_data.voice_ids if id not in found_ids]
    
    if not_found_ids:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"部分语音资源不存在: {', '.join(map(str, not_found_ids))}"
        )
    
    # 批量更新审核状态
    updated_count = 0
    try:
        for voice in voices:
            voice.status = review_data.status
            # 同时更新is_public字段以保持兼容性
            voice.is_public = (review_data.status == "passed")
            updated_count += 1
        
        db.commit()
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"批量审核语音资源失败: {str(e)}"
        )
    
    return {
        "code": 200,
        "msg": f"已成功将 {updated_count} 个语音资源状态更新为{review_data.status}",
        "data": {
            "updated_count": updated_count,
            "status": review_data.status
        }
    }

@router.post("/voices/batch_delete", response_model=APIResponse)
def batch_delete_voices(
    delete_data: BatchUserDeleteRequest,  # 复用现有的BatchUserDeleteRequest模型
    db: Session = Depends(get_db)
):
    """
    批量删除语音资源
    
    - delete_data: 包含要删除的语音资源ID列表 (voice_ids 与 user_ids 字段用途相同)
    """
    if not delete_data.user_ids:
        return {
            "code": 400,
            "msg": "语音资源ID列表不能为空",
            "data": None
        }
    
    # 获取所有指定的语音资源
    voices = db.query(Voice).filter(Voice.id.in_(delete_data.user_ids)).all()
    
    # 检查是否找到所有语音资源
    found_ids = [voice.id for voice in voices]
    not_found_ids = [id for id in delete_data.user_ids if id not in found_ids]
    
    if not_found_ids:
        return {
            "code": 404,
            "msg": f"部分语音资源不存在: {', '.join(map(str, not_found_ids))}",
            "data": None
        }
    
    # 批量删除语音资源
    deleted_count = 0
    audio_files_to_delete = []
    
    try:
        # 首先收集需要删除的音频文件路径
        for voice in voices:
            if voice.audio_data and os.path.exists(voice.audio_data):
                audio_files_to_delete.append(voice.audio_data)
            
            db.delete(voice)
            deleted_count += 1
        
        db.commit()
        
        # 删除关联的音频文件
        for file_path in audio_files_to_delete:
            try:
                os.remove(file_path)
            except Exception as e:
                print(f"删除音频文件失败: {file_path}, 错误: {str(e)}")
                
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"批量删除语音资源失败: {str(e)}"
        )
    
    return {
        "code": 200,
        "msg": f"成功删除 {deleted_count} 个语音资源",
        "data": {
            "deleted_count": deleted_count,
            "deleted_ids": found_ids
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
    
    # 获取语音所属用户ID和标题，用于记录操作历史
    user_id = voice.user_id
    voice_title = voice.title
    
    # 删除语音资源记录
    try:
        db.delete(voice)
        
        # 添加管理员删除语音的操作记录
        if user_id:
            operation_history = UserOperationHistory(
                user_id=user_id,
                operation_type="delete",
                operation_detail=f"管理员删除了您的语音资源: {voice_title}",
                resource_id=voice_id,
                resource_type="voice"
            )
            db.add(operation_history)
        
        db.commit()
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"删除语音资源失败: {str(e)}"
        )
    
    # 在数据库事务完成后，尝试删除关联的音频文件
    if audio_file_path and os.path.exists(audio_file_path):
        try:
            os.remove(audio_file_path)
        except Exception as e:
            # 记录错误但不影响响应
            print(f"删除音频文件失败: {audio_file_path}, 错误: {str(e)}")
    
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

@router.get("/users/{user_id}/history", response_model=APIResponse)
def get_user_history(
    user_id: int,
    db: Session = Depends(get_db)
):
    """
    获取用户操作历史记录
    
    - user_id: 用户ID
    """
    # 查找用户
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="用户不存在"
        )
    
    # 获取用户操作历史记录，不再使用分页
    history_records = db.query(UserOperationHistory)\
        .filter(UserOperationHistory.user_id == user_id)\
        .order_by(UserOperationHistory.created_at.desc())\
        .all()
    
    # 格式化历史记录
    formatted_records = []
    for record in history_records:
        # 初始化预览图片为None
        preview_image = None
        
        # 如果是与Voice资源相关的操作，尝试获取模型图片
        if record.resource_type == "voice" and record.resource_id:
            try:
                # 查询对应的Voice记录
                voice = db.query(Voice).get(record.resource_id)
                
                # 如果找到了音频资源并且有头像数据，转换为Base64字符串
                if voice and voice.avatar:
                    import base64
                    preview_image = base64.b64encode(voice.avatar).decode('utf-8')
            except Exception as e:
                print(f"获取资源图片时出错: {e}")
        
        formatted_records.append({
            "id": record.id,
            "operation_type": record.operation_type,
            "operation_detail": record.operation_detail,
            "resource_id": record.resource_id,
            "resource_type": record.resource_type,
            "preview_image": preview_image,  # 添加预览图片Base64数据
            "created_at": record.created_at.strftime("%Y-%m-%d %H:%M:%S")
        })
    
    return {
        "code": 200,
        "msg": "获取用户操作历史记录成功",
        "data": {
            "user": {
                "id": user.id,
                "username": user.username,
            },
            "history": formatted_records,
            "total": len(formatted_records)
        }
    }

