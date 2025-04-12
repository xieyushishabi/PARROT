from fastapi import APIRouter, Depends, HTTPException, File, UploadFile, Form, Query, Body, status
from fastapi.responses import JSONResponse, FileResponse
from typing import List, Optional
from sqlalchemy.orm import Session
from backend.database.models import Teaching, TeachingResource, TeachingAvatar, TeachingBackground, TeachingMusic, UserOperationHistory
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
            
            # 生成相对URL路径
            relative_path = f"/api/v1/teaching/ppt/{image_dir_name}/{image_filename}"
            image_paths.append(relative_path)
            logger.info(f"成功导出PPT第{i}页: {relative_path}")

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
    if not os.path.exists(image_path):
        logger.error(f"图片不存在: {image_path}")
        raise HTTPException(status_code=404, detail=f"图片不存在: {image_path}")
    return FileResponse(image_path)

