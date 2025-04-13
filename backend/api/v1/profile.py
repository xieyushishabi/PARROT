from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status, Query
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from typing import Optional, List, Dict, Any
import base64
from sqlalchemy import desc, and_, join

# 修改导入路径
from backend.core.security import get_current_user, get_password_hash
from backend.database.models import User, Voice, UserOperationHistory, VoiceCollection, VoiceLike
from backend.database.database import get_db
from backend.core.models import ProfileUpdate, ProfileResponse, APIResponse

router = APIRouter(prefix="/user", tags=["用户"])

# 更新用户资料（包括头像）
@router.post("/profile")
async def profile(
    phone_number: Optional[str] = Form(None),
    age: Optional[int] = Form(None),
    gender: Optional[str] = Form(None),
    avatar: Optional[UploadFile] = File(None),
    security_question1_answer: Optional[str] = Form(None),
    security_question2_answer: Optional[str] = Form(None),
    security_question3_answer: Optional[str] = Form(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # 验证输入
    profile_data = ProfileUpdate(
        phone_number=phone_number,
        age=age,
        gender=gender
    )
    
    # 更新文本资料
    if profile_data.phone_number:
        current_user.phone_number = profile_data.phone_number
    
    if profile_data.age is not None:
        current_user.age = profile_data.age
    
    if profile_data.gender:
        current_user.gender = profile_data.gender
    
    # 处理密保问题
    if security_question1_answer:
        current_user.security_question1_answer = security_question1_answer
    
    if security_question2_answer:
        current_user.security_question2_answer = security_question2_answer
    
    if security_question3_answer:
        current_user.security_question3_answer = security_question3_answer
    
    # 处理头像
    if avatar:
        # 验证文件类型
        if not avatar.content_type.startswith('image/'):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={"msg": "只允许上传图片文件"}
            )
        
        # 读取文件内容
        image_data = await avatar.read()
        # 将头像数据直接存储到数据库中
        current_user.avatar = image_data
    
    # 保存更新后的用户资料到数据库
    db.commit()
    db.refresh(current_user)
    
    return APIResponse(
        code=200,
        msg="用户资料更新成功",
        data={
            "username": current_user.username,
            "email": current_user.email,
            "phone_number": current_user.phone_number,
            "age": current_user.age,
            "gender": current_user.gender,
            "avatar": current_user.avatar is not None,
            "security_questions_set": all([
                current_user.security_question1_answer,
                current_user.security_question2_answer,
                current_user.security_question3_answer
            ])
        }
    )

# 获取用户资料
@router.get("/profile")
async def get_profile(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    avatar_data = None
    if current_user.avatar:
        avatar_data = base64.b64encode(current_user.avatar).decode('utf-8')

    # 返回用户资料
    return APIResponse(
        code=200,
        msg="获取用户资料成功",
        data={
            "username": current_user.username,
            "email": current_user.email,
            "phone_number": current_user.phone_number,
            "age": current_user.age,
            "gender": current_user.gender,
            "avatar": avatar_data
        }
    )

# 查询用户是否完善个人资料
@router.get("/profile/status")
async def check_profile_status(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # 检查用户是否已完善资料（以手机号是否设置为判断标准）
    is_completed = current_user.phone_number is not None
    print(current_user.phone_number,is_completed)

    return APIResponse(
        code=200,
        msg="查询成功",
        data={
            "is_completed": is_completed,
            "status": "已完善" if is_completed else "未完善"
        }
    )

# 修改密码
@router.post("/change-password")
async def change_password(
    security_question1_answer: str = Form(...),
    security_question2_answer: str = Form(...),
    security_question3_answer: str = Form(...),
    new_password: str = Form(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # 验证密码格式和一致性
    if len(new_password) < 6 or len(new_password) > 20:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"msg": "密码长度必须在6-20个字符之间"}
        )
    
    # 直接验证密保问题答案
    if (current_user.security_question1_answer != security_question1_answer or
        current_user.security_question2_answer != security_question2_answer or
        current_user.security_question3_answer != security_question3_answer):
        return APIResponse(
            code=400,
            msg="密保问题回答错误",
            data={}
        )
    
    # 更新密码
    current_user.hashed_password = get_password_hash(new_password)
    
    # 保存更新
    db.commit()
    db.refresh(current_user)
    
    return APIResponse(
        code=200,
        msg="密码修改成功",
        data={}
    )

# 获取用户历史作品 - 音频
@router.get("/history/audio")
async def get_user_audio_history(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """获取用户的音频历史作品"""
    try:
        # 查询用户的音频历史记录 - 使用UserOperationHistory表
        query = db.query(UserOperationHistory).filter(
            UserOperationHistory.user_id == current_user.id,
            UserOperationHistory.operation_type == "upload",  # 音频类型为upload
            UserOperationHistory.resource_type == "audio"
        ).order_by(desc(UserOperationHistory.created_at))
        
        # 获取所有记录
        items = query.all()
        
        # 构建响应数据
        result = []
        for item in items:
            # 构建每个音频项的数据
            audio_item = {
                "id": item.id,
                "title": item.operation_detail or "未命名音频",
                "cover": "assets/images/cover1.jpg",  # 默认封面
                "tag": "生成副本",
                "created_at": item.created_at.strftime("%Y-%m-%d"),
                "duration": "5分40秒",  # 这里可以从资源中获取实际时长
                "resource_id": item.resource_id
            }
            result.append(audio_item)
        
        return APIResponse(
            code=200,
            msg="获取音频历史成功",
            data={
                "items": result
            }
        )
    except Exception as e:
        return APIResponse(
            code=500,
            msg=f"获取音频历史失败: {str(e)}",
            data={}
        )

# 获取用户历史作品 - 视频
@router.get("/history/video")
async def get_user_video_history(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """获取用户的视频历史作品"""
    try:
        # 查询用户的视频历史记录 - 使用UserOperationHistory表
        query = db.query(UserOperationHistory).filter(
            UserOperationHistory.user_id == current_user.id,
            UserOperationHistory.operation_type == "upload",  # 视频类型为upload
            UserOperationHistory.resource_type == "video"
        ).order_by(desc(UserOperationHistory.created_at))
        
        # 获取所有记录
        items = query.all()
        
        # 构建响应数据
        result = []
        for item in items:
            # 构建每个视频项的数据
            video_item = {
                "id": item.id,
                "title": item.operation_detail or "未命名视频",
                "cover": "assets/images/cover2.jpg",  # 默认封面
                "tag": "生成副本",
                "created_at": item.created_at.strftime("%Y-%m-%d"),
                "duration": "3分20秒",  # 这里可以从资源中获取实际时长
                "resource_id": item.resource_id
            }
            result.append(video_item)
        
        return APIResponse(
            code=200,
            msg="获取视频历史成功",
            data={
                "items": result
            }
        )
    except Exception as e:
        return APIResponse(
            code=500,
            msg=f"获取视频历史失败: {str(e)}",
            data={}
        )

# 获取用户历史作品 - 克隆声音
@router.get("/history/voice")
async def get_user_voice_history(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """获取用户的克隆声音历史作品"""
    try:
        # 查询用户的声音克隆历史 - 使用Voice表
        query = db.query(Voice).filter(
            Voice.user_id == current_user.id
        ).order_by(desc(Voice.created_at))
        
        # 获取所有记录
        voices = query.all()
        
        # 构建响应数据
        result = []
        for voice in voices:
            # 获取声音头像的base64编码
            voice_avatar_base64 = base64.b64encode(voice.avatar).decode('utf-8') if voice.avatar else None

            # 构建每个声音项的数据
            voice_item = {
                "id": voice.id,
                "title": voice.title or "未命名声音",
                "cover": f"/api/v1/community/voices/{voice.id}/avatar",  # 使用API路径获取封面
                "coverData": voice_avatar_base64,  # 添加Base64编码的图像数据
                "tag": "声音克隆",
                "created_at": voice.created_at.strftime("%Y-%m-%d") if voice.created_at else "",
                "duration": "4分15秒",  # 这里可以从资源中获取实际时长
                "play_count": voice.play_count,
                "like_count": voice.like_count,
                "collect_count": voice.collect_count
            }
            result.append(voice_item)
        
        return APIResponse(
            code=200,
            msg="获取克隆声音历史成功",
            data={
                "items": result
            }
        )
    except Exception as e:
        return APIResponse(
            code=500,
            msg=f"获取克隆声音历史失败: {str(e)}",
            data={}
        )

# 获取用户收藏的声音
@router.get("/collections")
async def get_user_collections(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """获取用户收藏的声音列表"""
    try:
        # 查询用户收藏的声音 - 使用VoiceCollection表关联Voice表
        query = db.query(Voice).join(
            VoiceCollection, 
            VoiceCollection.voice_id == Voice.id
        ).filter(
            VoiceCollection.user_id == current_user.id
        ).order_by(desc(VoiceCollection.created_at))
        
        # 获取所有记录
        voices = query.all()
        
        # 构建响应数据
        result = []
        for voice in voices:
            # 获取收藏时间
            collection = db.query(VoiceCollection).filter(
                VoiceCollection.user_id == current_user.id,
                VoiceCollection.voice_id == voice.id
            ).first()
            
            # 获取声音头像的base64编码
            voice_avatar_base64 = base64.b64encode(voice.avatar).decode('utf-8') if voice.avatar else None
            
            # 构建每个声音项的数据
            voice_item = {
                "id": voice.id,
                "title": voice.title or "未命名声音",
                "coverData": voice_avatar_base64,  # 添加Base64编码的图像数据
                "tag": "收藏声音",
                "created_at": collection.created_at.strftime("%Y-%m-%d") if collection else "",
                "duration": "5分40秒",  # 这里可以从资源中获取实际时长
                "author": {
                    "id": voice.user_id,
                    "username": voice.author.username if voice.author else "未知用户"
                },
                "play_count": voice.play_count,
                "like_count": voice.like_count,
                "collect_count": voice.collect_count
            }
            result.append(voice_item)
        
        return APIResponse(
            code=200,
            msg="获取收藏声音成功",
            data={
                "items": result
            }
        )
    except Exception as e:
        return APIResponse(
            code=500,
            msg=f"获取收藏声音失败: {str(e)}",
            data={}
        )

# 获取用户喜欢的声音
@router.get("/likes")
async def get_user_likes(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """获取用户喜欢的声音列表"""
    try:
        # 查询用户喜欢的声音 - 使用VoiceLike表关联Voice表
        query = db.query(Voice).join(
            VoiceLike, 
            VoiceLike.voice_id == Voice.id
        ).filter(
            VoiceLike.user_id == current_user.id
        ).order_by(desc(VoiceLike.created_at))
        
        # 获取所有记录
        voices = query.all()
        
        # 构建响应数据
        result = []
        for voice in voices:
            # 获取点赞时间
            like = db.query(VoiceLike).filter(
                VoiceLike.user_id == current_user.id,
                VoiceLike.voice_id == voice.id
            ).first()
            
            # 获取声音头像的base64编码
            voice_avatar_base64 = base64.b64encode(voice.avatar).decode('utf-8') if voice.avatar else None
            
            # 构建每个声音项的数据
            voice_item = {
                "id": voice.id,
                "title": voice.title or "未命名声音",
                "coverData": voice_avatar_base64,  # 添加Base64编码的图像数据
                "tag": "喜欢声音",
                "created_at": like.created_at.strftime("%Y-%m-%d") if like else "",
                "duration": "6分50秒",  # 这里可以从资源中获取实际时长
                "author": {
                    "id": voice.user_id,
                    "username": voice.author.username if voice.author else "未知用户"
                },
                "play_count": voice.play_count,
                "like_count": voice.like_count,
                "collect_count": voice.collect_count
            }
            result.append(voice_item)
        
        return APIResponse(
            code=200,
            msg="获取喜欢声音成功",
            data={
                "items": result
            }
        )
    except Exception as e:
        return APIResponse(
            code=500,
            msg=f"获取喜欢声音失败: {str(e)}",
            data={}
        )

# 获取谁赞过用户的声音
@router.get("/liked-by")
async def get_liked_by_users(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """获取谁赞过用户的声音"""
    try:
        # 查询赞过用户声音的记录 - 使用VoiceLike表关联Voice表和User表
        query = db.query(VoiceLike, Voice, User).join(
            Voice, VoiceLike.voice_id == Voice.id
        ).join(
            User, VoiceLike.user_id == User.id
        ).filter(
            Voice.user_id == current_user.id
        ).order_by(desc(VoiceLike.created_at))
        
        # 获取所有记录
        likes = query.all()
        
        # 构建响应数据
        result = []
        for like, voice, user in likes:
            # 获取声音头像的base64编码
            voice_avatar_base64 = base64.b64encode(voice.avatar).decode('utf-8') if voice.avatar else None
            
            # 构建每个点赞记录的数据
            like_item = {
                "id": like.id,
                "created_at": like.created_at.strftime("%Y-%m-%d"),
                "user": {
                    "id": user.id,
                    "username": user.username,
                    "avatar": base64.b64encode(user.avatar).decode('utf-8') if user.avatar else None
                },
                "voice": {
                    "id": voice.id,
                    "title": voice.title or "未命名声音",
                    "coverData": voice_avatar_base64  # 添加Base64编码的图像数据
                }
            }
            result.append(like_item)
        
        return APIResponse(
            code=200,
            msg="获取点赞用户成功",
            data={
                "items": result
            }
        )
    except Exception as e:
        return APIResponse(
            code=500,
            msg=f"获取点赞用户失败: {str(e)}",
            data={}
        )

# 获取谁收藏过用户的声音
@router.get("/collected-by")
async def get_collected_by_users(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """获取谁收藏过用户的声音"""
    try:
        # 查询收藏过用户声音的记录 - 使用VoiceCollection表关联Voice表和User表
        query = db.query(VoiceCollection, Voice, User).join(
            Voice, VoiceCollection.voice_id == Voice.id
        ).join(
            User, VoiceCollection.user_id == User.id
        ).filter(
            Voice.user_id == current_user.id
        ).order_by(desc(VoiceCollection.created_at))
        
        # 获取所有记录
        collections = query.all()
        
        # 构建响应数据
        result = []
        for collection, voice, user in collections:
            # 获取声音头像的base64编码
            voice_avatar_base64 = base64.b64encode(voice.avatar).decode('utf-8') if voice.avatar else None
            
            # 构建每个收藏记录的数据
            collection_item = {
                "id": collection.id,
                "created_at": collection.created_at.strftime("%Y-%m-%d"),
                "user": {
                    "id": user.id,
                    "username": user.username,
                    "avatar": base64.b64encode(user.avatar).decode('utf-8') if user.avatar else None
                },
                "voice": {
                    "id": voice.id,
                    "title": voice.title or "未命名声音",
                    "coverData": voice_avatar_base64  # 添加Base64编码的图像数据
                }
            }
            result.append(collection_item)
        
        return APIResponse(
            code=200,
            msg="获取收藏用户成功",
            data={
                "items": result
            }
        )
    except Exception as e:
        return APIResponse(
            code=500,
            msg=f"获取收藏用户失败: {str(e)}",
            data={}
        )
