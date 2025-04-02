from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, BackgroundTasks
from fastapi.responses import FileResponse, JSONResponse
import os
import uuid
import time
import shutil
from typing import Optional, List, Dict, Any
import subprocess
import logging
import json
from pathlib import Path
import sys
import psutil
import threading
from datetime import datetime

# 设置日志
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# 添加MegaTTS3到系统路径
sys.path.append(os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(__file__)))), "MegaTTS3"))

# MegaTTS3路径
MEGATTS3_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(__file__)))), "MegaTTS3")

# 创建存储目录
UPLOAD_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(__file__)))), "storage", "uploads")
OUTPUT_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(__file__)))), "storage", "outputs")
VOICE_SAMPLES_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(__file__)))), "storage", "voice_samples")
HISTORY_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(__file__)))), "storage", "history")

# 确保目录存在
os.makedirs(UPLOAD_DIR, exist_ok=True)
os.makedirs(OUTPUT_DIR, exist_ok=True)
os.makedirs(VOICE_SAMPLES_DIR, exist_ok=True)
os.makedirs(HISTORY_DIR, exist_ok=True)

# 创建路由
router = APIRouter(prefix="/tts", tags=["TTS"])

# TTS生成任务队列
tts_tasks = {}

# 历史记录存储
tts_history = {}
tts_history_lock = threading.Lock()

# 并发控制信号量 - 允许多个TTS任务同时运行
tts_semaphore = threading.Semaphore(2)  # 允许2个TTS任务同时运行

# 资源监控阈值 - 提高以允许更多CPU使用
CPU_THRESHOLD = 95  # CPU使用率阈值(%)
MEMORY_THRESHOLD = 90  # 内存使用率阈值(%)

# 历史记录JSON文件路径
HISTORY_FILE = os.path.join(HISTORY_DIR, "tts_history.json")

# 加载历史记录
def load_history():
    global tts_history
    try:
        if os.path.exists(HISTORY_FILE):
            with open(HISTORY_FILE, 'r', encoding='utf-8') as f:
                tts_history = json.load(f)
                logger.info(f"已加载{len(tts_history)}条TTS历史记录")
        else:
            tts_history = {}
            logger.info("历史记录文件不存在，创建新的历史记录")
            # 确保历史记录目录存在
            os.makedirs(os.path.dirname(HISTORY_FILE), exist_ok=True)
            # 创建空的历史记录文件
            with open(HISTORY_FILE, 'w', encoding='utf-8') as f:
                json.dump({}, f, ensure_ascii=False, indent=2)
    except Exception as e:
        logger.error(f"加载历史记录失败: {e}")
        tts_history = {}

# 保存历史记录
def save_history():
    try:
        with tts_history_lock:
            with open(HISTORY_FILE, 'w', encoding='utf-8') as f:
                json.dump(tts_history, f, ensure_ascii=False, indent=2)
        logger.info(f"已保存{len(tts_history)}条TTS历史记录")
    except Exception as e:
        logger.error(f"保存历史记录失败: {e}")

# 添加历史记录
def add_history_record(task_id, params, output_path=None, status="processing"):
    try:
        with tts_history_lock:
            tts_history[task_id] = {
                "task_id": task_id,
                "created_at": datetime.now().isoformat(),
                "text": params.get("text", ""),
                "voice_id": params.get("voiceId", ""),
                "emotion": params.get("emotion", "默认"),
                "params": params,
                "status": status,
                "output_path": output_path
            }
        # 异步保存历史记录，避免阻塞主线程
        threading.Thread(target=save_history).start()
    except Exception as e:
        logger.error(f"添加历史记录失败: {e}")

# 更新历史记录状态
def update_history_status(task_id, status, output_path=None):
    try:
        with tts_history_lock:
            if task_id in tts_history:
                tts_history[task_id]["status"] = status
                if output_path:
                    tts_history[task_id]["output_path"] = output_path
                tts_history[task_id]["updated_at"] = datetime.now().isoformat()
        # 异步保存历史记录，避免阻塞主线程
        threading.Thread(target=save_history).start()
    except Exception as e:
        logger.error(f"更新历史记录状态失败: {e}")

# 初始化时加载历史记录
load_history()

@router.post("/generate")
async def generate_tts(
    background_tasks: BackgroundTasks,
    text: str = Form(...),
    voice_sample: Optional[UploadFile] = File(None),
    p_w: float = Form(2.0),  # 清晰度权重
    t_w: float = Form(3.0),  # 相似度权重
):
    """
    使用MegaTTS3生成语音
    """
    # 检查系统资源
    cpu_percent = psutil.cpu_percent(interval=0.5)
    memory_percent = psutil.virtual_memory().percent
    
    # 检查是否有正在运行的TTS任务
    active_tasks = sum(1 for task in tts_tasks.values() if task.get("status") == "processing")
    
    logger.info(f"当前系统状态: CPU使用率={cpu_percent}%, 内存使用率={memory_percent}%, 活动TTS任务={active_tasks}")
    
    # 资源检查
    if cpu_percent > CPU_THRESHOLD or memory_percent > MEMORY_THRESHOLD:
        logger.warning(f"系统资源不足: CPU={cpu_percent}%, 内存={memory_percent}%")
        raise HTTPException(
            status_code=503,  # Service Unavailable
            detail="系统资源不足，请稍后再试。当前任务处理可能导致系统不稳定。"
        )
    
    # 检查正在处理的任务数量
    if active_tasks >= 2:  # 允许最多2个并行任务
        logger.warning(f"已有{active_tasks}个TTS任务正在处理中，拒绝新的请求")
        raise HTTPException(
            status_code=429,  # Too Many Requests
            detail="系统负载过高，请稍后再试"
        )
    
    task_id = str(uuid.uuid4())
    
    # 准备参数
    params = {
        "text": text,
        "voice_sample": voice_sample.filename if voice_sample else "default",
        "p_w": p_w,
        "t_w": t_w
    }
    
    # 创建任务信息
    tts_tasks[task_id] = {
        "status": "pending",
        "created_at": time.time(),
        "text": text,
        "output_path": None,
        "error": None,
        "cpu_usage_start": cpu_percent,
        "memory_usage_start": memory_percent
    }
    
    # 添加到历史记录
    add_history_record(task_id, params)
    
    try:
        # 处理上传的语音样本
        input_wav = None
        if voice_sample:
            # 生成唯一文件名
            file_extension = os.path.splitext(voice_sample.filename)[1]
            voice_sample_path = os.path.join(UPLOAD_DIR, f"{uuid.uuid4()}{file_extension}")
            
            # 保存上传的文件
            with open(voice_sample_path, "wb") as f:
                shutil.copyfileobj(voice_sample.file, f)
            
            input_wav = voice_sample_path
        else:
            # 使用默认语音样本
            input_wav = os.path.join(MEGATTS3_PATH, "assets", "Chinese_prompt.wav")
        
        # 生成输出路径
        output_filename = f"{task_id}.wav"
        output_path = os.path.join(OUTPUT_DIR, output_filename)
        
        # 更新任务信息
        tts_tasks[task_id]["output_path"] = output_path
        tts_tasks[task_id]["status"] = "processing"
        
        # 添加后台任务
        background_tasks.add_task(
            run_tts_generation,
            task_id,
            input_wav,
            text,
            output_path,
            p_w,
            t_w
        )
        
        return {
            "task_id": task_id,
            "status": "processing",
            "message": "TTS生成任务已提交，请使用任务ID查询状态"
        }
        
    except Exception as e:
        logger.error(f"生成TTS时出错: {str(e)}")
        tts_tasks[task_id]["status"] = "failed"
        tts_tasks[task_id]["error"] = str(e)
        raise HTTPException(status_code=500, detail=f"生成TTS时出错: {str(e)}")


@router.get("/status/{task_id}")
async def get_tts_status(task_id: str):
    """
    获取TTS生成任务状态
    """
    if task_id not in tts_tasks:
        logger.warning(f"请求了不存在的任务ID: {task_id}")
        raise HTTPException(status_code=404, detail="任务不存在")
    
    task = tts_tasks[task_id]
    current_time = time.time()
    elapsed_time = current_time - task["created_at"]
    
    # 创建响应数据
    response_data = {
        "task_id": task_id,
        "status": task["status"],
        "created_at": task["created_at"],
        "elapsed_seconds": round(elapsed_time, 2),
        "error": task["error"] if "error" in task else None
    }
    
    # 根据状态添加额外信息
    if task["status"] == "processing":
        # 添加任务进度估计
        # 估计TTS处理时间大约需要180秒，根据实际情况调整
        estimated_total_time = 180  # 估计总时间（秒）
        progress = min(95, (elapsed_time / estimated_total_time) * 100)  # 最高95%，留一点余地
        response_data["progress"] = round(progress, 1)
        
        # 估计剩余时间
        if progress < 95:
            remaining_time = max(0, estimated_total_time - elapsed_time)
            response_data["estimated_remaining_seconds"] = round(remaining_time, 0)
    
    elif task["status"] == "completed" and "processing_time" in task:
        response_data["processing_time"] = task["processing_time"]
        
        # 检查输出文件是否存在
        if "output_path" in task and os.path.exists(task["output_path"]):
            response_data["file_size"] = os.path.getsize(task["output_path"])
            response_data["file_ready"] = True
        else:
            response_data["file_ready"] = False
    
    logger.info(f"任务状态请求: {task_id}, 状态: {task['status']}, 已耗时: {elapsed_time:.2f}秒")
    return response_data


@router.get("/tasks")
async def get_all_tasks():
    """
    获取所有TTS任务列表
    """
    # 提取每个任务的基本信息
    tasks_info = []
    for task_id, task in tts_tasks.items():
        task_info = {
            "task_id": task_id,
            "status": task["status"],
            "created_at": task["created_at"],
            "elapsed_seconds": round(time.time() - task["created_at"], 2)
        }
        tasks_info.append(task_info)
    
    # 按创建时间排序，最新的任务在前面
    tasks_info.sort(key=lambda x: x["created_at"], reverse=True)
    
    logger.info(f"请求任务列表，当前共有 {len(tasks_info)} 个任务")
    return tasks_info

@router.get("/check_file/{task_id}")
async def check_tts_file(task_id: str):
    """
    检查TTS音频文件是否存在
    """
    # 检查任务是否存在于任务队列中
    if task_id not in tts_tasks:
        logger.warning(f"检查不存在的任务ID: {task_id}")
        return {"exists": False, "reason": "任务不存在"}
    
    # 获取任务信息
    task = tts_tasks[task_id]
    
    # 检查任务状态
    if task.get("status") != "completed" and "output_path" not in task:
        return {"exists": False, "reason": f"任务状态: {task.get('status')}"}
    
    # 如果任务中有输出路径，检查该路径下的文件
    output_path = task.get("output_path")
    
    # 如果没有输出路径，尝试在输出目录中查找以任务ID命名的文件
    if not output_path:
        potential_path = os.path.join(OUTPUT_DIR, f"{task_id}.wav")
        if os.path.exists(potential_path) and os.path.getsize(potential_path) > 0:
            # 更新任务状态和输出路径
            tts_tasks[task_id]["status"] = "completed"
            tts_tasks[task_id]["output_path"] = potential_path
            logger.info(f"找到任务ID {task_id} 的音频文件: {potential_path}")
            return {"exists": True, "path": potential_path}
        else:
            return {"exists": False, "reason": "找不到输出文件"}
    
    # 检查输出文件是否存在且非空
    if os.path.exists(output_path) and os.path.getsize(output_path) > 0:
        logger.info(f"任务ID {task_id} 的音频文件存在: {output_path}")
        return {"exists": True, "path": output_path}
    else:
        logger.warning(f"任务ID {task_id} 的输出文件不存在或为空: {output_path}")
        return {"exists": False, "reason": "找不到有效的输出文件"}

@router.get("/download/{task_id}")
async def download_tts(task_id: str):
    """
    下载生成的TTS音频文件
    """
    if task_id not in tts_tasks:
        logger.warning(f"尝试下载不存在的任务ID: {task_id}")
        raise HTTPException(status_code=404, detail="任务不存在")
    
    task = tts_tasks[task_id]
    
    if task["status"] != "completed":
        logger.warning(f"尝试下载未完成的任务: {task_id}, 当前状态: {task['status']}")
        raise HTTPException(status_code=400, detail=f"任务尚未完成，当前状态: {task['status']}")
    
    if not os.path.exists(task["output_path"]):
        logger.error(f"任务ID {task_id} 的输出文件丢失: {task['output_path']}")
        raise HTTPException(status_code=404, detail="生成的音频文件不存在")
    
    logger.info(f"下载任务ID {task_id} 的音频文件: {task['output_path']}")
    
    # 检查文件大小
    file_size = os.path.getsize(task["output_path"])
    if file_size == 0:
        logger.error(f"任务ID {task_id} 的输出文件大小为0字节: {task['output_path']}")
        raise HTTPException(status_code=500, detail="生成的音频文件内容为空")
    
    logger.info(f"成功响应下载请求，任务ID: {task_id}, 文件大小: {file_size} 字节")
    
    return FileResponse(
        path=task["output_path"],
        filename=f"parrot_tts_{task_id}.wav",  # 使用更有意义的文件名
        media_type="audio/wav"
    )


@router.get("/voices")
async def list_voice_samples():
    """
    列出所有可用的语音样本
    """
    try:
        samples = []
        for filename in os.listdir(VOICE_SAMPLES_DIR):
            if filename.endswith(('.wav', '.mp3')):
                samples.append({
                    "id": filename.split('.')[0],
                    "name": filename,
                    "path": os.path.join(VOICE_SAMPLES_DIR, filename)
                })
        
        # 加入默认样本
        default_samples_dir = os.path.join(MEGATTS3_PATH, "assets")
        for filename in os.listdir(default_samples_dir):
            if filename.endswith('.wav') and "prompt" in filename:
                samples.append({
                    "id": f"default_{filename.split('.')[0]}",
                    "name": f"默认 - {filename}",
                    "path": os.path.join(default_samples_dir, filename),
                    "is_default": True
                })
        
        return {"voice_samples": samples}
    except Exception as e:
        logger.error(f"列出语音样本时出错: {str(e)}")
        raise HTTPException(status_code=500, detail=f"列出语音样本时出错: {str(e)}")


@router.post("/voice-samples/upload")
async def upload_voice_sample(
    voice_file: UploadFile = File(...),
    name: str = Form(...)
):
    """
    上传新的语音样本
    """
    try:
        # 验证文件格式
        if not voice_file.filename.endswith(('.wav', '.mp3')):
            raise HTTPException(status_code=400, detail="不支持的文件格式，仅支持WAV和MP3格式")
        
        # 生成唯一文件名
        file_extension = os.path.splitext(voice_file.filename)[1]
        file_id = str(uuid.uuid4())
        filename = f"{name.replace(' ', '_')}_{file_id}{file_extension}"
        file_path = os.path.join(VOICE_SAMPLES_DIR, filename)
        
        # 保存上传的文件
        with open(file_path, "wb") as f:
            shutil.copyfileobj(voice_file.file, f)
        
        return {
            "id": file_id,
            "name": name,
            "filename": filename,
            "path": file_path,
            "message": "语音样本上传成功"
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"上传语音样本时出错: {str(e)}")
        raise HTTPException(status_code=500, detail=f"上传语音样本时出错: {str(e)}")


def run_tts_generation(task_id, input_wav, text, output_path, p_w, t_w):
    """
    运行MegaTTS3生成TTS
    """
    logger.info(f"开始处理TTS任务: {task_id}, 文本长度: {len(text)}字符")
    # 使用信号量控制并发
    if not tts_semaphore.acquire(blocking=False):
        logger.warning(f"无法获取TTS信号量，任务 {task_id} 被拒绝")
        tts_tasks[task_id]["status"] = "failed"
        tts_tasks[task_id]["error"] = "系统繁忙，无法处理新的TTS请求"
        return
    
    try:
        # 更新任务状态
        tts_tasks[task_id]["status"] = "processing"
        
        # 准备命令
        cmd = [
            "python",
            os.path.join(MEGATTS3_PATH, "tts", "infer_cli.py"),
            "--input_wav", input_wav,
            "--input_text", text,
            "--output_dir", os.path.dirname(output_path),
            "--p_w", str(p_w),
            "--t_w", str(t_w)
        ]
        
        # 注意：尝试使用的优化参数(--num_threads和--optimize_memory)不被MegaTTS3支持
        # 我们将保留并发任务处理的优化
        
        # 设置环境变量
        env = os.environ.copy()
        env["PYTHONPATH"] = MEGATTS3_PATH + ":" + env.get("PYTHONPATH", "")
        # 设置当前工作目录为MegaTTS3目录，这很重要，因为模型会从相对路径加载
        os.chdir(MEGATTS3_PATH)
        
        # 执行命令
        logger.info(f"执行命令: {' '.join(cmd)}")
        logger.info(f"当前工作目录: {os.getcwd()}")
        logger.info(f"环境变量PYTHONPATH: {env['PYTHONPATH']}")
        
        # 检查模型文件是否存在
        required_paths = [
            os.path.join(MEGATTS3_PATH, "checkpoints", "duration_lm", "config.yaml"),
            os.path.join(MEGATTS3_PATH, "checkpoints", "diffusion_transformer", "config.yaml"),
            os.path.join(MEGATTS3_PATH, "checkpoints", "aligner_lm", "config.yaml"),
            os.path.join(MEGATTS3_PATH, "checkpoints", "wavvae", "config.yaml")
        ]
        
        # g2p模型使用的是config.json格式，不是config.yaml
        g2p_config_path = os.path.join(MEGATTS3_PATH, "checkpoints", "g2p", "config.json")
        if not os.path.exists(g2p_config_path):
            logger.error(f"缺少必要的g2p模型文件: {g2p_config_path}")
        
        for path in required_paths:
            if not os.path.exists(path):
                logger.error(f"缺少必要的模型文件: {path}")
        
        # 检查符号链接
        symlink_paths = [
            "./checkpoints/duration_lm",
            "./checkpoints/diffusion_transformer",
            "./checkpoints/aligner_lm",
            "./checkpoints/g2p",
            "./checkpoints/wavvae"
        ]
        
        for path in symlink_paths:
            if not os.path.exists(path):
                logger.error(f"符号链接不存在: {path}")
        
        logger.info(f"开始执行MegaTTS3命令: {' '.join(cmd)}")
        process = subprocess.Popen(
            cmd,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            env=env
        )
        
        # 设置超时时间为10分钟
        try:
            stdout, stderr = process.communicate(timeout=600)
            logger.info("MegaTTS3命令执行完成")
        except subprocess.TimeoutExpired:
            process.kill()
            logger.error("MegaTTS3命令执行超时")
            stdout, stderr = process.communicate()
        
        if process.returncode != 0:
            logger.error(f"TTS生成失败，返回码: {process.returncode}")
            logger.error(f"标准输出: {stdout.decode('utf-8')}")
            logger.error(f"标准错误: {stderr.decode('utf-8')}")
            
            tts_tasks[task_id]["status"] = "failed"
            tts_tasks[task_id]["error"] = stderr.decode('utf-8')
            return
        
        # 处理输出
        # MegaTTS3会生成带有时间戳的文件，需要重命名
        output_dir = os.path.dirname(output_path)
        logger.info(f"检查输出目录: {output_dir}")
        all_files = os.listdir(output_dir)
        logger.info(f"输出目录中的所有文件: {all_files}")
        # MegaTTS3实际生成的文件是以'[P]'开头的，而不是'gen_'
        generated_files = [f for f in all_files if f.endswith('.wav') and (f.startswith('[P]') or f.startswith('gen_'))]
        
        if not generated_files:
            raise Exception("TTS生成未产生输出文件")
        
        # 取最新生成的文件
        generated_files.sort(key=lambda x: os.path.getmtime(os.path.join(output_dir, x)), reverse=True)
        latest_file = os.path.join(output_dir, generated_files[0])
        
        # 重命名为任务ID
        output_file = os.path.join(output_dir, f"{task_id}.wav")
        shutil.copy(latest_file, output_file)
        
        # 删除原始的[P]文件以节省空间
        try:
            if os.path.exists(latest_file) and os.path.basename(latest_file).startswith('[P]'):
                logger.info(f"删除原始文件: {latest_file}")
                os.remove(latest_file)
        except Exception as e:
            logger.warning(f"删除原始文件失败: {e}")
        
        # 记录资源使用情况
        cpu_percent_end = psutil.cpu_percent(interval=0.5)
        memory_percent_end = psutil.virtual_memory().percent
        
        # 更新任务状态
        tts_tasks[task_id]["status"] = "completed"
        tts_tasks[task_id]["output_path"] = output_file
        tts_tasks[task_id]["cpu_usage_end"] = cpu_percent_end
        tts_tasks[task_id]["memory_usage_end"] = memory_percent_end
        tts_tasks[task_id]["processing_time"] = time.time() - tts_tasks[task_id]["created_at"]
        
        # 更新历史记录状态
        update_history_status(task_id, "completed", output_file)
        
        logger.info(f"TTS生成成功，任务ID: {task_id}, 处理时间: {tts_tasks[task_id]['processing_time']:.2f}秒")
        logger.info(f"资源使用: CPU从{tts_tasks[task_id]['cpu_usage_start']}%上升到{cpu_percent_end}%, "  
                  f"内存从{tts_tasks[task_id]['memory_usage_start']}%上升到{memory_percent_end}%")
    
    except Exception as e:
        logger.error(f"TTS生成过程中出错: {str(e)}")
        tts_tasks[task_id]["status"] = "failed"
        tts_tasks[task_id]["error"] = str(e)
        
        # 更新历史记录状态
        update_history_status(task_id, "failed")
    finally:
        # 释放信号量
        tts_semaphore.release()
        
        # 输出任务完成信息
        task_status = tts_tasks[task_id]["status"]
        task_completion_info = json.dumps({
            "task_id": task_id,
            "status": task_status,
            "processing_time": tts_tasks[task_id].get("processing_time", 0),
            "error": tts_tasks[task_id].get("error", None)
        }, ensure_ascii=False)
        
        if task_status == "completed":
            logger.info(f"任务成功完成: {task_completion_info}")
        else:
            logger.error(f"任务失败: {task_completion_info}")


@router.get("/history")
async def get_tts_history():
    """
    获取TTS生成历史记录
    """
    try:
        # 转换历史记录为列表并按创建时间倒序排序
        history_list = list(tts_history.values())
        history_list.sort(key=lambda x: x.get("created_at", ""), reverse=True)
        return {"history": history_list}
    except Exception as e:
        logger.error(f"获取历史记录失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/history/{task_id}")
async def get_tts_history_item(task_id: str):
    """
    获取指定ID的TTS历史记录
    """
    if task_id not in tts_history:
        raise HTTPException(status_code=404, detail="记录不存在")
    return tts_history[task_id]

@router.get("/history/{task_id}/audio")
async def get_tts_history_audio(task_id: str):
    """
    获取历史记录中的音频文件
    """
    if task_id not in tts_history:
        raise HTTPException(status_code=404, detail="记录不存在")
    
    record = tts_history[task_id]
    if record["status"] != "completed" or not record.get("output_path"):
        raise HTTPException(status_code=404, detail="音频文件未生成或生成失败")
    
    output_path = record["output_path"]
    if not os.path.exists(output_path):
        raise HTTPException(status_code=404, detail="音频文件不存在")
    
    return FileResponse(output_path, media_type="audio/wav", filename=f"PARROT配音_{task_id}.wav")

@router.delete("/history/{task_id}")
async def delete_tts_history_item(task_id: str):
    """
    删除指定ID的TTS历史记录
    """
    if task_id not in tts_history:
        raise HTTPException(status_code=404, detail="记录不存在")
    
    with tts_history_lock:
        # 尝试删除音频文件
        try:
            output_path = tts_history[task_id].get("output_path")
            if output_path and os.path.exists(output_path):
                os.remove(output_path)
        except Exception as e:
            logger.error(f"删除音频文件失败: {e}")
        
        # 删除记录
        del tts_history[task_id]
    
    # 保存历史记录
    threading.Thread(target=save_history).start()
    
    return {"success": True, "message": "记录已删除"}
