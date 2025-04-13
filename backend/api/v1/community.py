from fastapi import APIRouter, Depends, HTTPException, status, Query, Path
from fastapi.responses import FileResponse, Response
from typing import Optional, List
from sqlalchemy.orm import Session
from sqlalchemy import desc, func
import logging
import os
import uuid
import datetime
import traceback  # 添加导入以便打印详细错误信息
import base64  # 添加导入以支持base64编码

from backend.database.database import get_db
from backend.database.models import Voice, VoiceLike, VoiceCollection, User, UserOperationHistory
from backend.core.security import get_current_user, get_optional_user

# 设置日志
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# 创建路由
router = APIRouter(tags=["社区"], prefix="/community")

# 声音输出目录路径
OUTPUT_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(__file__)))), "storage", "outputs")
# 确保输出目录存在
os.makedirs(OUTPUT_DIR, exist_ok=True)

@router.get("/voices")
async def get_voices(
    sort: Optional[str] = Query("recommend", description="排序方式: recommend(推荐), newest(最新), clicks(点击量), likes(点赞量), collections(收藏量)"),
    language: Optional[str] = Query(None, description="语言筛选: zh(中文), en(英文)"),
    search: Optional[str] = Query(None, description="搜索关键词"),
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user)
):
    """
    获取声音列表，支持排序和筛选，返回所有符合条件的声音
    """
    try:
        logger.info(f"获取声音列表请求 - 排序:{sort}, 语言:{language}, 搜索:{search}")
        print('1')
        # 验证排序参数
        valid_sort_options = ["recommend", "newest", "clicks", "likes", "collections"]
        if sort not in valid_sort_options:
            logger.warning(f"无效的排序参数: {sort}, 使用默认排序")
            sort = "recommend"
            
        # 基本查询 - 只查询已通过审核且公开的声音
        try:
            query = db.query(Voice).filter(
                Voice.status == "passed",
                Voice.is_public == True
            )
            
            # 按语言筛选
            if language:
                query = query.filter(Voice.language == language)
            
            # 搜索关键词
            if search:
                search_term = f"%{search}%"
                query = query.filter(
                    (Voice.title.ilike(search_term)) | 
                    (Voice.preview.ilike(search_term))
                )
            
            # 排序
            if sort == "newest":
                query = query.order_by(desc(Voice.created_at))
            elif sort == "clicks":
                # 确保null值处理
                query = query.order_by(desc(func.coalesce(Voice.play_count, 0)))
            elif sort == "likes":
                query = query.order_by(desc(func.coalesce(Voice.like_count, 0)))
            elif sort == "collections":
                query = query.order_by(desc(func.coalesce(Voice.collect_count, 0)))
            else:  # recommend - 默认使用综合排序
                # 使用点赞数、收藏数和播放数的加权和进行排序，确保null处理
                query = query.order_by(desc(
                    func.coalesce(Voice.like_count, 0) * 3 + 
                    func.coalesce(Voice.collect_count, 0) * 2 + 
                    func.coalesce(Voice.play_count, 0)
                ))
            
            # 获取所有符合条件的声音
            total = query.count()
            logger.info(f"找到符合条件的声音总数: {total}")
            
            voices = query.all()
            logger.info(f"获取到 {len(voices)} 个声音记录")
            
        except Exception as query_e:
            logger.error(f"执行声音查询时出错: {str(query_e)}\n{traceback.format_exc()}")
            raise HTTPException(status_code=500, detail=f"数据库查询失败: {str(query_e)}")
        
        # 构建响应
        result = []
        for voice in voices:
            try:
                # 查询作者信息
                author = db.query(User).filter(User.id == voice.user_id).first()
                author_name = author.username if author else "未知用户"
                author_id = voice.user_id if voice.user_id else 0
                
                # 获取声音和用户头像的base64编码
                voice_avatar_base64 = None
                user_avatar_base64 = None
                
                if voice.avatar:
                    try:
                        voice_avatar_base64 = base64.b64encode(voice.avatar).decode('utf-8')
                    except Exception as avatar_e:
                        logger.error(f"编码声音头像失败: {str(avatar_e)}")
                
                if author and hasattr(author, 'avatar') and author.avatar:
                    try:
                        user_avatar_base64 = base64.b64encode(author.avatar).decode('utf-8')
                    except Exception as user_avatar_e:
                        logger.error(f"编码用户头像失败: {str(user_avatar_e)}")
                
                # 检查当前用户是否点赞、收藏
                is_liked = False
                is_collected = False
                
                if current_user:
                    try:
                        is_liked = db.query(VoiceLike).filter(
                            VoiceLike.user_id == current_user.id,
                            VoiceLike.voice_id == voice.id
                        ).first() is not None
                        
                        is_collected = db.query(VoiceCollection).filter(
                            VoiceCollection.user_id == current_user.id,
                            VoiceCollection.voice_id == voice.id
                        ).first() is not None
                    except Exception as user_e:
                        logger.error(f"检查用户点赞收藏状态失败: {str(user_e)}")
                        # 继续处理，保持默认值False
                
                # 格式化日期
                created_date = voice.created_at.strftime("%Y/%m/%d") if voice.created_at else "未知日期"
                
                # 确保所有数值字段都有默认值
                result.append({
                    "id": voice.id,
                    "title": voice.title or "无标题",
                    "voiceAvatarData": voice_avatar_base64,  # 添加Base64编码的图像数据
                    "authorName": author_name,
                    "authorId": author_id,
                    "authorAvatar": f"/api/v1/users/{author_id}/avatar", # 保留原有路径
                    "authorAvatarData": user_avatar_base64,  # 添加Base64编码的用户头像
                    "date": created_date,
                    "preview": voice.preview or "",
                    "playCount": voice.play_count or 0,
                    "likeCount": voice.like_count or 0,
                    "collectCount": voice.collect_count or 0,
                    "isLiked": is_liked,
                    "isCollected": is_collected,
                    "language": voice.language or "unknown"
                })
            except Exception as item_e:
                logger.error(f"处理声音项目ID:{voice.id}时出错: {str(item_e)}\n{traceback.format_exc()}")
                # 跳过此项继续处理其他项
                continue
        
        return {
            "voices": result,
            "total": total
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"获取声音列表时出错: {str(e)}\n{traceback.format_exc()}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, 
            detail=f"获取声音列表时出错，请联系管理员。错误详情: {str(e)}"
        )

@router.get("/best-voices")
async def get_best_voices(
    db: Session = Depends(get_db),
):
    """
    获取点赞数最高的前三个声音
    """
    try:
        logger.info("获取最佳声音列表请求")
        
        # 查询点赞数最高的前三个声音（已通过审核且公开的）
        voices = db.query(Voice).filter(
            Voice.status == "passed",
            Voice.is_public == True
        ).order_by(desc(Voice.like_count)).limit(3).all()
        
        # 构建响应
        result = []
        for voice in voices:
            try:
                # 查询作者信息
                author = db.query(User).filter(User.id == voice.user_id).first()
                author_name = author.username if author else "未知用户"
                
                # 获取声音和用户头像的base64编码
                voice_avatar_base64 = None
                user_avatar_base64 = None
                
                if voice.avatar:
                    try:
                        voice_avatar_base64 = base64.b64encode(voice.avatar).decode('utf-8')
                    except Exception as avatar_e:
                        logger.error(f"编码声音头像失败: {str(avatar_e)}")
                
                if author and hasattr(author, 'avatar') and author.avatar:
                    try:
                        user_avatar_base64 = base64.b64encode(author.avatar).decode('utf-8')
                    except Exception as user_avatar_e:
                        logger.error(f"编码用户头像失败: {str(user_avatar_e)}")
                
                result.append({
                    "id": voice.id,
                    "title": voice.title,
                    "voiceAvatarData": voice_avatar_base64,  # 添加Base64编码的图像数据
                    "authorName": author_name,
                    "authorId": voice.user_id,
                    "authorAvatar": f"/api/v1/users/{voice.user_id}/avatar", # 保留原有路径
                    "authorAvatarData": user_avatar_base64,  # 添加Base64编码的用户头像
                    "likeCount": voice.like_count or 0  # 防止None值
                })
            except Exception as item_e:
                logger.error(f"处理最佳声音项目时出错: {str(item_e)}\n{traceback.format_exc()}")
                # 跳过此项继续处理其他项
                continue
        
        return {"bestVoices": result}
        
    except Exception as e:
        logger.error(f"获取最佳声音列表时出错: {str(e)}\n{traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"获取最佳声音列表时出错: {str(e)}")

@router.get("/voices/{voice_id}/avatar")
async def get_voice_avatar(
    voice_id: int = Path(..., description="声音ID"),
    db: Session = Depends(get_db)
):
    """
    获取声音的头像图片
    """
    try:
        logger.info(f"获取声音头像请求 - ID:{voice_id}")
        
        # 查询声音
        voice = db.query(Voice).filter(Voice.id == voice_id).first()
        
        if not voice:
            logger.warning(f"声音ID {voice_id} 不存在")
            raise HTTPException(status_code=404, detail="声音不存在")
        
        # 如果声音没有头像，返回默认头像
        if not voice.avatar:
            default_avatar_path = os.path.join(
                os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(__file__)))),
                "web", "assets", "images", "model-preview.png"
            )
            if not os.path.exists(default_avatar_path):
                logger.warning(f"默认头像文件不存在: {default_avatar_path}")
                # 如果默认头像不存在，返回一个简单的响应
                return Response(content=b"", media_type="image/png")
                
            return FileResponse(default_avatar_path, media_type="image/png")
        
        # 返回声音头像
        return Response(content=voice.avatar, media_type="image/jpeg")
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"获取声音头像时出错: {str(e)}\n{traceback.format_exc()}")
        # 返回一个默认响应而不是抛出500错误
        default_avatar_path = os.path.join(
            os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(__file__)))),
            "web", "assets", "images", "model-preview.png"
        )
        if os.path.exists(default_avatar_path):
            return FileResponse(default_avatar_path, media_type="image/png")
        else:
            # 如果连默认头像也无法访问，返回空内容
            return Response(content=b"", media_type="image/png")

@router.get("/voices/{voice_id}/audio")
async def get_voice_audio(
    voice_id: int = Path(..., description="声音ID"),
    db: Session = Depends(get_db)
):
    """
    获取声音的音频文件（用于试听）
    """
    try:
        logger.info(f"获取声音音频请求 - ID:{voice_id}")
        
        # 查询声音
        voice = db.query(Voice).filter(Voice.id == voice_id).first()
        
        if not voice:
            logger.warning(f"声音ID {voice_id} 不存在")
            raise HTTPException(status_code=404, detail="声音不存在")
        
        # 检查音频文件路径
        if not voice.audio_data:
            logger.warning(f"声音ID {voice_id} 音频路径为空")
            raise HTTPException(status_code=404, detail="音频文件路径不存在")
            
        if not os.path.exists(voice.audio_data):
            logger.warning(f"声音ID {voice_id} 音频文件不存在: {voice.audio_data}")
            raise HTTPException(status_code=404, detail="音频文件不存在")
        
        # 根据文件路径获取扩展名
        file_extension = os.path.splitext(voice.audio_data)[1].lower()  # 例如 .mp3, .wav
        content_type_map = {
            '.wav': 'audio/wav',
            '.mp3': 'audio/mpeg',
            '.ogg': 'audio/ogg',
            '.m4a': 'audio/mp4',
            '.flac': 'audio/flac'
        }

        # 默认为wav，如果找不到对应的类型
        media_type = content_type_map.get(file_extension, 'audio/wav')

        # 保留原文件扩展名，如果没有则默认为.wav
        if file_extension:
            filename = f"{voice.title}{file_extension}"
        else:
            filename = f"{voice.title}.wav"

        return FileResponse(
            voice.audio_data,
            media_type=media_type,
            filename=filename
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"获取声音音频时出错: {str(e)}\n{traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"获取声音音频时出错: {str(e)}")

@router.post("/voices/{voice_id}/play")
async def increase_play_count(
    voice_id: int = Path(..., description="声音ID"),
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user)
):
    """
    增加声音播放次数，立即更新UI显示，10分钟后更新数据库
    """
    try:
        logger.info(f"增加声音播放次数请求 - ID:{voice_id}")
        
        # 查询声音
        voice = db.query(Voice).filter(Voice.id == voice_id).first()
        
        if not voice:
            logger.warning(f"声音ID {voice_id} 不存在")
            raise HTTPException(status_code=404, detail="声音不存在")
        
        # 立即返回更新后的播放次数用于UI显示
        current_play_count = (voice.play_count or 0) + 1
        
        # 创建定时任务，10分钟后更新数据库
        async def update_play_count():
            try:
                await asyncio.sleep(600)  # 等待10分钟
                async with async_session() as session:
                    voice = await session.query(Voice).filter(Voice.id == voice_id).first()
                    if voice:
                        voice.play_count = current_play_count
                        await session.commit()
                        logger.info(f"声音ID {voice_id} 播放次数已延迟更新到 {current_play_count}")
                        
                        # 如果用户已登录，记录操作历史
                        if current_user:
                            try:
                                operation = UserOperationHistory(
                                    user_id=current_user.id,
                                    operation_type="play",
                                    operation_detail=f"播放声音: {voice.title}",
                                    resource_id=voice.id,
                                    resource_type="voice"
                                )
                                session.add(operation)
                                await session.commit()
                            except Exception as op_e:
                                logger.error(f"记录播放操作历史失败: {str(op_e)}")
            except Exception as e:
                logger.error(f"延迟更新播放次数失败: {str(e)}")
        
        # 启动异步任务
        asyncio.create_task(update_play_count())
        
        return {"success": True, "playCount": current_play_count}
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"增加播放次数时出错: {str(e)}\n{traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"增加播放次数时出错: {str(e)}")

@router.post("/voices/{voice_id}/like")
async def like_voice(
    voice_id: int = Path(..., description="声音ID"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    点赞声音，立即更新UI显示，10分钟后更新数据库
    """
    try:
        logger.info(f"声音点赞请求 - ID:{voice_id}, 用户ID:{current_user.id}")
        
        # 查询声音
        voice = db.query(Voice).filter(Voice.id == voice_id).first()
        
        if not voice:
            logger.warning(f"声音ID {voice_id} 不存在")
            raise HTTPException(status_code=404, detail="声音不存在")
        
        # 检查是否已点赞
        existing_like = db.query(VoiceLike).filter(
            VoiceLike.user_id == current_user.id,
            VoiceLike.voice_id == voice.id
        ).first()
        
        # 计算新的点赞状态和数量
        new_like_status = not bool(existing_like)
        current_like_count = (voice.like_count or 0) + (1 if new_like_status else -1)
        current_like_count = max(0, current_like_count)  # 确保不会小于0
        
        # 创建定时任务，10分钟后更新数据库
        async def update_like_status():
            try:
                await asyncio.sleep(600)  # 等待10分钟
                async with async_session() as session:
                    voice = await session.query(Voice).filter(Voice.id == voice_id).first()
                    if voice:
                        if new_like_status:
                            # 添加点赞
                            new_like = VoiceLike(user_id=current_user.id, voice_id=voice.id)
                            session.add(new_like)
                            voice.like_count = current_like_count
                            
                            # 添加操作历史
                            try:
                                operation = UserOperationHistory(
                                    user_id=current_user.id,
                                    operation_type="like",
                                    operation_detail=f"点赞声音: {voice.title}",
                                    resource_id=voice.id,
                                    resource_type="voice"
                                )
                                session.add(operation)
                            except Exception as op_e:
                                logger.error(f"添加操作历史失败: {str(op_e)}")
                        else:
                            # 取消点赞
                            existing_like = await session.query(VoiceLike).filter(
                                VoiceLike.user_id == current_user.id,
                                VoiceLike.voice_id == voice.id
                            ).first()
                            if existing_like:
                                await session.delete(existing_like)
                                voice.like_count = current_like_count
                        
                        await session.commit()
                        logger.info(f"声音ID {voice_id} 点赞状态已延迟更新，点赞数: {current_like_count}")
            except Exception as e:
                logger.error(f"延迟更新点赞状态失败: {str(e)}")
        
        # 启动异步任务
        asyncio.create_task(update_like_status())
        
        return {"liked": new_like_status, "likeCount": current_like_count}
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"点赞声音时出错: {str(e)}\n{traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"点赞声音时出错: {str(e)}")

import asyncio
from sqlalchemy.ext.asyncio import AsyncSession
from backend.database.database import async_session

@router.post("/voices/{voice_id}/collect")
async def collect_voice(
    voice_id: int = Path(..., description="声音ID"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    收藏声音，立即更新UI显示，10分钟后更新数据库
    """
    try:
        logger.info(f"声音收藏请求 - ID:{voice_id}, 用户ID:{current_user.id}")
        
        # 查询声音
        voice = db.query(Voice).filter(Voice.id == voice_id).first()
        
        if not voice:
            logger.warning(f"声音ID {voice_id} 不存在")
            raise HTTPException(status_code=404, detail="声音不存在")
        
        # 检查是否已收藏
        existing_collection = db.query(VoiceCollection).filter(
            VoiceCollection.user_id == current_user.id,
            VoiceCollection.voice_id == voice.id
        ).first()
        
        # 计算新的收藏状态和数量
        new_collect_status = not bool(existing_collection)
        current_collect_count = (voice.collect_count or 0) + (1 if new_collect_status else -1)
        current_collect_count = max(0, current_collect_count)  # 确保不会小于0
        
        # 创建定时任务，10分钟后更新数据库
        async def update_collect_status():
            try:
                await asyncio.sleep(600)  # 等待10分钟
                async with async_session() as session:
                    voice = await session.query(Voice).filter(Voice.id == voice_id).first()
                    if voice:
                        if new_collect_status:
                            # 添加收藏
                            new_collection = VoiceCollection(user_id=current_user.id, voice_id=voice.id)
                            session.add(new_collection)
                            voice.collect_count = current_collect_count
                            
                            # 添加操作历史
                            try:
                                operation = UserOperationHistory(
                                    user_id=current_user.id,
                                    operation_type="collect",
                                    operation_detail=f"收藏声音: {voice.title}",
                                    resource_id=voice.id,
                                    resource_type="voice"
                                )
                                session.add(operation)
                            except Exception as op_e:
                                logger.error(f"添加操作历史失败: {str(op_e)}")
                        else:
                            # 取消收藏
                            existing_collection = await session.query(VoiceCollection).filter(
                                VoiceCollection.user_id == current_user.id,
                                VoiceCollection.voice_id == voice.id
                            ).first()
                            if existing_collection:
                                await session.delete(existing_collection)
                                voice.collect_count = current_collect_count
                        
                        await session.commit()
                        logger.info(f"声音ID {voice_id} 收藏状态已延迟更新，收藏数: {current_collect_count}")
            except Exception as e:
                logger.error(f"延迟更新收藏状态失败: {str(e)}")
        
        # 启动异步任务
        asyncio.create_task(update_collect_status())
        
        return {"collected": new_collect_status, "collectCount": current_collect_count}
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"收藏声音时出错: {str(e)}\n{traceback.format_exc()}")
        db.rollback()  # 回滚事务
        raise HTTPException(status_code=500, detail=f"收藏声音时出错: {str(e)}")

@router.get("/voices/{voice_id}/use")
async def use_voice(
    voice_id: int = Path(..., description="声音ID"),
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user)
):
    """
    使用声音（获取声音信息用于跳转到配音界面）
    """
    try:
        logger.info(f"使用声音请求 - ID:{voice_id}, 用户ID:{current_user.id if current_user else '匿名用户'}")
        
        # 查询声音
        voice = db.query(Voice).filter(Voice.id == voice_id).first()
        
        if not voice:
            logger.warning(f"声音ID {voice_id} 不存在")
            raise HTTPException(status_code=404, detail="声音不存在")
        
        # 记录操作历史（如果用户已登录）
        if current_user:
            try:
                operation = UserOperationHistory(
                    user_id=current_user.id,
                    operation_type="use",
                    operation_detail=f"使用声音: {voice.title}",
                    resource_id=voice.id,
                    resource_type="voice"
                )
                db.add(operation)
                db.commit()
            except Exception as op_e:
                logger.error(f"记录使用声音操作历史失败: {str(op_e)}")
                db.rollback()
        
        # 返回声音信息
        return {
            "id": voice.id,
            "title": voice.title,
            "audio_path": voice.audio_data,
            "redirect_url": f"http://127.0.0.1:5500/web/dub.html?voice={voice.id}&name={voice.title}"
        }
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"使用声音时出错: {str(e)}\n{traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"使用声音时出错: {str(e)}")

@router.get("/my-collections")
async def get_my_collections(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    获取当前用户收藏的声音列表
    """
    try:
        logger.info(f"获取用户收藏的声音列表请求 - 用户ID:{current_user.id}")
        
        # 查询用户收藏的声音
        collections = db.query(VoiceCollection).filter(
            VoiceCollection.user_id == current_user.id
        ).all()
        
        voice_ids = [c.voice_id for c in collections]
        voices = db.query(Voice).filter(Voice.id.in_(voice_ids)).all()
        
        # 构建响应
        result = []
        for voice in voices:
            try:
                # 查询作者信息
                author = db.query(User).filter(User.id == voice.user_id).first()
                author_name = author.username if author else "未知用户"
                
                # 查询收藏时间
                collection = next((c for c in collections if c.voice_id == voice.id), None)
                collected_at = collection.created_at.strftime("%Y/%m/%d") if collection and collection.created_at else "未知日期"
                
                result.append({
                    "id": voice.id,
                    "title": voice.title,
                    "authorName": author_name,
                    "authorId": voice.user_id,
                    "date": voice.created_at.strftime("%Y/%m/%d") if voice.created_at else "未知日期",
                    "collectedAt": collected_at,
                    "preview": voice.preview,
                    "playCount": voice.play_count or 0,
                    "likeCount": voice.like_count or 0,
                    "collectCount": voice.collect_count or 0
                })
            except Exception as item_e:
                logger.error(f"处理用户收藏的声音项目时出错: {str(item_e)}\n{traceback.format_exc()}")
                # 跳过此项继续处理其他项
                continue
        
        return {"collections": result}
        
    except Exception as e:
        logger.error(f"获取用户收藏列表时出错: {str(e)}\n{traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"获取用户收藏列表时出错: {str(e)}")