from fastapi import APIRouter, Depends, HTTPException, File, UploadFile, Form, Query, Body, status
from fastapi.responses import JSONResponse, FileResponse
from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session
from backend.database.database import get_db
from backend.core.security import get_current_user
import json
import os
import shutil
from uuid import uuid4
import logging
from datetime import datetime
from pathlib import Path
import win32com.client
import pythoncom
import comtypes.client
import base64
import requests
import tempfile
import time
from moviepy.editor import ImageClip, AudioFileClip, CompositeVideoClip
from pydantic import BaseModel
import threading
from concurrent.futures import ThreadPoolExecutor

# 配置日志
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

router = APIRouter(tags=["教育"], prefix="/teaching")

# 存储上传的文件的目录路径
UPLOAD_DIR = os.path.join("storage", "teaching")
os.makedirs(UPLOAD_DIR, exist_ok=True)

# 资源的子目录
PPT_DIR = os.path.join(UPLOAD_DIR, "ppt")
AVATAR_DIR = os.path.join(UPLOAD_DIR, "avatars")
BACKGROUND_DIR = os.path.join(UPLOAD_DIR, "backgrounds")
MUSIC_DIR = os.path.join(UPLOAD_DIR, "music")
OUTPUT_DIR = os.path.join(UPLOAD_DIR, "output")

# 创建必要的目录
for directory in [PPT_DIR, AVATAR_DIR, BACKGROUND_DIR, MUSIC_DIR, OUTPUT_DIR]:
    os.makedirs(directory, exist_ok=True)

# 定义请求模型
class VideoGenerationRequest(BaseModel):
    subtitle: str
    image_base64: str

# 用于跟踪生成的视频的字典
video_tasks = {}

# 创建一个线程池来处理后台任务
executor = ThreadPoolExecutor(max_workers=5)

@router.post("/upload-ppt")
async def upload_ppt(file: UploadFile = File(...)):
    # 初始化变量
    powerpoint = None
    presentation = None
    ppt_path = None
    
    try:
        # 检查文件类型
        if not file.filename.endswith(('.ppt', '.pptx')):
            raise HTTPException(
                status_code=400,
                detail={"msg": "只支持PPT文件格式(.ppt, .pptx)"}
            )

        # 生成唯一的文件名
        unique_id = str(uuid4())
        unique_filename = f"{unique_id}_{file.filename}"
        ppt_path = os.path.join(PPT_DIR, unique_filename)
        abs_ppt_path = os.path.abspath(ppt_path)
        
        logger.info(f"保存PPT文件到: {abs_ppt_path}")
        
        # 保存上传的PPT文件
        with open(ppt_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        # 创建存储PPT图片的目录
        image_dir_name = f"{unique_id}_images"
        images_dir = os.path.join(PPT_DIR, image_dir_name)
        abs_images_dir = os.path.abspath(images_dir)
        
        # 确保图片目录存在
        logger.info(f"创建图片目录: {abs_images_dir}")
        os.makedirs(abs_images_dir, exist_ok=True)

        # 初始化COM对象
        logger.info("初始化COM对象")
        pythoncom.CoInitialize()
        
        # 创建PowerPoint应用实例
        logger.info("创建PowerPoint应用实例")
        powerpoint = win32com.client.Dispatch("Powerpoint.Application")
        
        # 打开PPT文件
        logger.info(f"打开PPT文件: {abs_ppt_path}")
        presentation = powerpoint.Presentations.Open(abs_ppt_path)

        # 转换PPT的每一页为图片
        image_paths = []
        slides_count = presentation.Slides.Count
        logger.info(f"PPT共有{slides_count}页")
        
        for i in range(1, slides_count + 1):
            image_filename = f"slide_{i}.png"
            image_path = os.path.join(images_dir, image_filename)
            abs_image_path = os.path.abspath(image_path)
            
            logger.info(f"导出PPT第{i}页到: {abs_image_path}")
            
            # 导出图片
            presentation.Slides(i).Export(abs_image_path, "PNG")
            
            # 验证图片是否成功导出
            if not os.path.exists(abs_image_path):
                logger.error(f"导出图片失败: {abs_image_path}")
                raise Exception(f"导出图片失败: {abs_image_path}")
            
            # 读取图片并转换为base64
            with open(abs_image_path, "rb") as image_file:
                image_data = image_file.read()
                base64_data = base64.b64encode(image_data).decode('utf-8')
                image_paths.append(base64_data)
            logger.info(f"成功导出并编码PPT第{i}页")

        logger.info("所有PPT页面导出完成")
        return {
            "code": 200,
            "msg": "PPT上传并处理成功",
            "images": image_paths
        }

    except Exception as e:
        logger.error(f"处理PPT文件时出错: {str(e)}")
        # 如果出错，尝试删除已创建的文件
        if ppt_path and os.path.exists(ppt_path):
            try:
                os.remove(ppt_path)
                logger.info(f"已删除PPT文件: {ppt_path}")
            except Exception as cleanup_error:
                logger.error(f"删除PPT文件失败: {str(cleanup_error)}")
        
        raise HTTPException(
            status_code=500,
            detail={"msg": f"处理PPT文件时出错: {str(e)}"}
        )
    finally:
        # 确保资源被正确释放
        try:
            if presentation:
                presentation.Close()
                logger.info("已关闭PPT文件")
            if powerpoint:
                powerpoint.Quit()
                logger.info("已退出PowerPoint应用")
        except Exception as close_error:
            logger.error(f"关闭PowerPoint应用时出错: {str(close_error)}")
        finally:
            # 确保COM对象被正确释放
            pythoncom.CoUninitialize()
            logger.info("已释放COM对象")

@router.get("/ppt/{dir_name}/{image_name}")
async def get_ppt_image(dir_name: str, image_name: str):
    image_path = os.path.join(PPT_DIR, dir_name, image_name)
    print(f"请求图片路径: {image_path}")
    if not os.path.exists(image_path):
        logger.error(f"图片不存在: {image_path}")
        raise HTTPException(status_code=404, detail=f"图片不存在: {image_path}")
    
    # 读取图片文件并转换为base64
    try:
        with open(image_path, "rb") as image_file:
            image_data = image_file.read()
            file_size_kb = len(image_data) / 1024
            logger.info(f"读取图片文件成功: {image_path}, 大小: {file_size_kb:.2f}KB")
            
            base64_data = base64.b64encode(image_data).decode('utf-8')
            base64_size_kb = len(base64_data) / 1024
            logger.info(f"图片base64编码成功, 编码后大小: {base64_size_kb:.2f}KB")
            
            # 验证base64数据的头部格式（调试用）
            if len(base64_data) > 20:
                logger.info(f"Base64数据前20个字符: {base64_data[:20]}...")
                
            return {"code": 200, "msg": "获取图片成功", "data": base64_data}
    except Exception as e:
        logger.error(f"读取图片文件失败: {str(e)}")
        raise HTTPException(status_code=500, detail=f"读取图片文件失败: {str(e)}")

@router.get("/ppt-list")
async def get_ppt_list():
    """获取所有已上传的PPT图片列表"""
    try:
        ppt_images = []
        dir_count = 0
        total_images = 0
        
        # 遍历PPT目录下的所有文件夹
        logger.info(f"开始扫描PPT目录: {PPT_DIR}")
        for dir_name in os.listdir(PPT_DIR):
            if dir_name.endswith('_images'):
                dir_count += 1
                image_dir = os.path.join(PPT_DIR, dir_name)
                if os.path.isdir(image_dir):
                    # 获取该文件夹下的所有图片
                    images = sorted([f for f in os.listdir(image_dir) if f.startswith('slide_') and f.endswith('.png')])
                    images_count = len(images)
                    total_images += images_count
                    logger.info(f"目录 {dir_name} 中找到 {images_count} 张图片")
                    
                    # 读取每张图片并转换为base64编码
                    for image in images:
                        image_path = os.path.join(image_dir, image)
                        try:
                            with open(image_path, "rb") as image_file:
                                image_data = image_file.read()
                                file_size_kb = len(image_data) / 1024
                                logger.info(f"读取图片文件: {image}, 大小: {file_size_kb:.2f}KB")
                                
                                base64_data = base64.b64encode(image_data).decode('utf-8')
                                ppt_images.append(base64_data)
                                logger.info(f"图片 {image} 成功转换为base64")
                        except Exception as img_error:
                            logger.error(f"处理图片 {image_path} 时出错: {str(img_error)}")
        
        logger.info(f"总共扫描了 {dir_count} 个目录，找到并编码了 {total_images} 张图片")
        logger.info(f"成功编码的图片数量: {len(ppt_images)}")
        
        # 打印部分base64数据的信息（如果有的话）
        if ppt_images:
            sample = ppt_images[0] if ppt_images else ""
            sample_preview = sample[:20] + "..." if len(sample) > 20 else sample
            logger.info(f"Base64样本预览: {sample_preview}")
        else:
            logger.info("没有找到任何图片")
        
        return {
            "code": 200,
            "msg": "获取PPT列表成功",
            "images": ppt_images
        }
    except Exception as e:
        logger.error(f"获取PPT列表失败: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail={"msg": f"获取PPT列表失败: {str(e)}"}
        )

@router.post("/generate-video")
async def generate_video(request_data: VideoGenerationRequest):
    """
    生成教学视频：将静态图像和TTS生成的音频合成为视频
    """
    task_id = str(uuid4())
    logger.info(f"收到视频生成请求，任务ID: {task_id}")
    
    try:
        # 创建任务状态
        video_tasks[task_id] = {
            "status": "queued",  # 初始状态改为队列中
            "created_at": time.time(),
            "progress": 0,
            "error": None,
            "output_path": None
        }
        
        # 将base64图像保存到临时文件
        image_data = base64.b64decode(request_data.image_base64)
        
        # 创建临时目录存储处理过程中的文件
        task_dir = os.path.join(OUTPUT_DIR, task_id)
        os.makedirs(task_dir, exist_ok=True)
        
        # 保存图像文件
        image_path = os.path.join(task_dir, "slide.png")
        with open(image_path, "wb") as f:
            f.write(image_data)
        
        # 在单独的线程中处理视频生成任务，直接使用预设音频文件
        executor.submit(
            process_video_generation_with_preset_audio,
            task_id=task_id,
            subtitle=request_data.subtitle,
            image_path=image_path,
            task_dir=task_dir
        )
        
        return {
            "code": 200,
            "message": "视频生成任务已提交到队列",
            "task_id": task_id
        }
            
    except Exception as e:
        logger.error(f"提交视频生成任务失败: {str(e)}")
        if task_id in video_tasks:
            video_tasks[task_id]["status"] = "failed"
            video_tasks[task_id]["error"] = str(e)
        return {
            "code": 500,
            "message": f"提交视频生成任务失败: {str(e)}",
            "task_id": task_id
        }

def process_video_generation_with_preset_audio(task_id: str, subtitle: str, image_path: str, task_dir: str):
    """
    在后台处理视频生成任务，使用预设的音频文件
    """
    try:
        # 更新任务状态
        video_tasks[task_id]["status"] = "processing"
        video_tasks[task_id]["progress"] = 10
        
        logger.info(f"跳过TTS生成，直接使用预设音频文件")
        # 直接使用预设的音频文件
        preset_audio_path = os.path.join("storage", "test", "ppt.mp3")
        
        if not os.path.exists(preset_audio_path):
            logger.error(f"预设音频文件不存在: {preset_audio_path}")
            video_tasks[task_id]["status"] = "failed"
            video_tasks[task_id]["error"] = f"预设音频文件不存在: {preset_audio_path}"
            return
        
        # 复制预设音频到任务目录
        audio_path = os.path.join(task_dir, "audio.mp3")
        shutil.copy(preset_audio_path, audio_path)
        logger.info(f"已复制预设音频文件到: {audio_path}")
        
        # 更新进度
        video_tasks[task_id]["progress"] = 70
        
        # 使用moviepy生成视频
        logger.info("开始生成视频")
        # 加载音频文件并获取其时长
        audio_clip = AudioFileClip(audio_path)
        duration = audio_clip.duration
        
        # 创建与音频时长相同的静态图像视频剪辑
        image_clip = ImageClip(image_path).set_duration(duration)
        
        # 合成视频
        video = CompositeVideoClip([image_clip])
        video = video.set_audio(audio_clip)
        
        # 设置视频输出路径
        output_path = os.path.join(OUTPUT_DIR, f"{task_id}.mp4")
        
        # 写入视频文件
        video.write_videofile(
            output_path,
            fps=24,
            codec='libx264',
            audio_codec='aac',
            temp_audiofile=os.path.join(task_dir, 'temp-audio.m4a'),
            remove_temp=True
        )
        
        logger.info(f"视频生成成功: {output_path}")
        
        # 更新任务状态
        video_tasks[task_id]["status"] = "completed"
        video_tasks[task_id]["output_path"] = output_path
        video_tasks[task_id]["progress"] = 100
        
        # 创建描述文件记录视频信息
        video_info = {
            "title": f"自动生成的教学视频_{task_id}",
            "description": subtitle,
            "video_path": output_path,
            "duration": int(duration),
            "resolution": "1280x720",
            "file_size": os.path.getsize(output_path),
            "created_at": time.strftime("%Y-%m-%d %H:%M:%S"),
            "status": "generated"
        }
        
        # 将视频信息保存为JSON文件
        info_file_path = os.path.join(task_dir, "video_info.json")
        with open(info_file_path, "w", encoding="utf-8") as f:
            json.dump(video_info, f, ensure_ascii=False, indent=4)
            
        logger.info(f"已保存视频信息到: {info_file_path}")
        
    except Exception as e:
        logger.error(f"视频生成失败: {str(e)}")
        video_tasks[task_id]["status"] = "failed"
        video_tasks[task_id]["error"] = str(e)

@router.get("/video-status/{task_id}")
async def get_video_status(task_id: str):
    """
    获取视频生成任务的状态
    """
    if task_id not in video_tasks:
        raise HTTPException(status_code=404, detail="任务不存在")
    
    task = video_tasks[task_id]
    current_time = time.time()
    elapsed_time = current_time - task["created_at"]
    
    return {
        "status": task["status"],
        "created_at": task["created_at"],
        "elapsed_seconds": round(elapsed_time, 2),
        "progress": task.get("progress", 0),
        "error": task.get("error")
    }

@router.get("/download-video/{task_id}")
async def download_video(task_id: str):
    """
    下载生成的视频
    """
    if task_id not in video_tasks:
        raise HTTPException(status_code=404, detail="视频任务不存在")
    
    task = video_tasks[task_id]
    if task["status"] != "completed":
        raise HTTPException(status_code=400, detail=f"视频尚未生成完成，当前状态: {task['status']}")
    
    output_path = task.get("output_path")
    if not output_path or not os.path.exists(output_path):
        raise HTTPException(status_code=404, detail="视频文件不存在")
    
    return FileResponse(
        path=output_path,
        filename=f"teaching_video_{task_id}.mp4",
        media_type="video/mp4"
    )

@router.get("/get-avatars")
async def get_avatars(db: Session = Depends(get_db)):
    """
    获取所有数字人信息，包含base64编码的图片
    """
    try:
        from backend.database.models import TeachingAvatar
        
        # 查询数据库中的数字人数据
        avatars = db.query(TeachingAvatar).all()
        result = []
        
        for avatar in avatars:
            avatar_path = avatar.avatar_path
            
            # 检查文件是否存在
            if not os.path.isabs(avatar_path):
                # 如果是相对路径，转换为绝对路径
                avatar_path = os.path.join(AVATAR_DIR, os.path.basename(avatar_path))
            
            # 默认图片路径，当实际图片不存在时使用
            default_avatar_path = os.path.join("storage", "defaults", "default_avatar.png")
            
            # 如果文件不存在，使用默认图片
            if not os.path.exists(avatar_path) and os.path.exists(default_avatar_path):
                avatar_path = default_avatar_path
                logger.warning(f"数字人图片不存在，使用默认图片: {avatar_path}")
            elif not os.path.exists(avatar_path):
                logger.error(f"数字人图片不存在且默认图片也不存在: {avatar_path}")
                continue
            
            # 读取图片文件并转换为base64
            try:
                with open(avatar_path, "rb") as image_file:
                    image_data = image_file.read()
                    base64_data = base64.b64encode(image_data).decode('utf-8')
                    
                    result.append({
                        "id": avatar.id,
                        "name": avatar.name,
                        "gender": avatar.gender,
                        "pose_type": avatar.pose_type,
                        "is_system": avatar.is_system,
                        "image_base64": base64_data
                    })
                    logger.info(f"成功编码数字人图片: {avatar.name}")
            except Exception as img_error:
                logger.error(f"处理数字人图片时出错: {str(img_error)}")
        
        logger.info(f"成功获取 {len(result)} 个数字人信息")
        return {
            "code": 200,
            "msg": "获取数字人列表成功",
            "data": result
        }
    except Exception as e:
        logger.error(f"获取数字人列表失败: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail={"msg": f"获取数字人列表失败: {str(e)}"}
        )

@router.get("/get-backgrounds")
async def get_backgrounds(db: Session = Depends(get_db)):
    """
    获取所有背景图片信息，包含base64编码的图片
    """
    try:
        from backend.database.models import TeachingBackground
        
        # 查询数据库中的背景图片数据
        backgrounds = db.query(TeachingBackground).all()
        result = []
        
        for bg in backgrounds:
            bg_path = bg.background_path
            
            # 检查文件是否存在
            if not os.path.isabs(bg_path):
                # 如果是相对路径，转换为绝对路径
                bg_path = os.path.join(BACKGROUND_DIR, os.path.basename(bg_path))
            
            # 默认背景路径，当实际背景不存在时使用
            default_bg_path = os.path.join("storage", "defaults", "default_background.png")
            
            # 如果文件不存在，使用默认背景
            if not os.path.exists(bg_path) and os.path.exists(default_bg_path):
                bg_path = default_bg_path
                logger.warning(f"背景图片不存在，使用默认背景: {bg_path}")
            elif not os.path.exists(bg_path):
                logger.error(f"背景图片不存在且默认背景也不存在: {bg_path}")
                continue
            
            # 读取图片文件并转换为base64
            try:
                with open(bg_path, "rb") as image_file:
                    image_data = image_file.read()
                    base64_data = base64.b64encode(image_data).decode('utf-8')
                    
                    result.append({
                        "id": bg.id,
                        "name": bg.name,
                        "category": bg.category,
                        "is_system": bg.is_system,
                        "image_base64": base64_data
                    })
                    logger.info(f"成功编码背景图片: {bg.name}")
            except Exception as img_error:
                logger.error(f"处理背景图片时出错: {str(img_error)}")
        
        logger.info(f"成功获取 {len(result)} 个背景图片信息")
        return {
            "code": 200,
            "msg": "获取背景图片列表成功",
            "data": result
        }
    except Exception as e:
        logger.error(f"获取背景图片列表失败: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail={"msg": f"获取背景图片列表失败: {str(e)}"}
        )

