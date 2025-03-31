from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from typing import Optional
import base64

# 修改导入路径
from backend.core.security import get_current_user, get_password_hash
from backend.database.models import User
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
            "avatar": current_user.avatar is not None
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
    
    # 处理密保问题逻辑
    if (current_user.security_question1_answer is None or 
        current_user.security_question2_answer is None or 
        current_user.security_question3_answer is None):
        # 密保问题尚未设置，直接保存
        current_user.security_question1_answer = security_question1_answer
        current_user.security_question2_answer = security_question2_answer
        current_user.security_question3_answer = security_question3_answer
    else:
        # 密保问题已设置，需要验证
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
