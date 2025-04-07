<div align="center">
  <img src="web/assets/images/logo.png" alt="PARROT Sound" width="200">
  <h1>PARROT智能音频平台</h1>
  <p><strong>智能配音 · 声音克隆 · 教育教学</strong></p>
</div>

## 📋 项目概述

PARROT是一个现代化的智能音频处理平台，集成AI配音、声音克隆和教育教学功能，适用于影视配音、教学课件制作等场景。

### 核心功能
- **智能配音**：支持多风格的AI配音，适用于广告、影视等多场景
- **声音克隆**：基于少量样本实现高质量声音克隆
- **教育教学**：为教育领域提供专业音频制作工具
- **AI文案生成**：智能生成适合配音的专业文案
- **社区资源**：建立音色资源库，促进用户间资源共享

## 🚀 快速开始

### 系统要求
- Python 3.8+, Node.js 14+
- 现代Web浏览器（Chrome, Firefox, Edge等）

### 服务启动
```bash
# 一键启动所有服务（前端和后端）
bash start_servers.sh

# 一键停止所有服务
bash stop_servers.sh
```

服务启动后：
- 前端界面：http://localhost:8080
- 后端API文档：http://localhost:8000/docs
- 日志位置：`/logs` 目录

### 模型文件设置（Linux环境）
```bash
# 在checkpoints目录下创建符号链接，链接到MegaTTS3的模型文件
cd checkpoints
ln -s /path/to/MegaTTS3/checkpoints/aligner_lm aligner_lm
ln -s /path/to/MegaTTS3/checkpoints/diffusion_transformer diffusion_transformer
ln -s /path/to/MegaTTS3/checkpoints/duration_lm duration_lm
ln -s /path/to/MegaTTS3/checkpoints/g2p g2p
ln -s /path/to/MegaTTS3/checkpoints/wavvae wavvae
```

注意：请将上述路径中的`/path/to/MegaTTS3/checkpoints/`替换为您系统中MegaTTS3实际的路径，文件名已经是正确的模型文件名称。

## 🔧 技术栈
- **前端**：HTML5, CSS3, JavaScript
- **后端**：Python, FastAPI
- **AI模型**：集成第三方AI配音和声音克隆服务

## 🔄 最新更新 (2025-04-07)

### checkpoints
- **便于部署**：把github上的符号链接删了，每个使用者自己设置符号链接

### 声音克隆界面（clone）
- **功能实现**：实现上传音频和录音功能（存储在voice_samples），能正确的获取我的已通过审核的声音
- **待完善**：我的声音部分现在是只能查看，是否需要添加使用声音和试听功能？
- **待完善**：上传不能检测语言，现在默认都是中文
- **bug**：点击提交之后立即刷新，不会等showToast显示出来几秒再刷新
注：我上传的是我的电脑路径，所以你可以把我上传的都删除一下

### 管理员端
- **功能实现**：获取语音资源，对语音资源进行操作
- **bug**：所有生成的时间都不对，都和真正时间相差几个小时
- **待完善**：添加批量处理功能，保存修改按钮功能没实现。添加管理员账号登录界面

## 📅 开发计划
- [x] AI生成配音文案
- [x] 帮助中心功能完善
- [ ] 声音克隆技术集成
- [ ] 社区资源（音色数据库搭建）

## 📞 联系方式
- **邮箱**：PARROTADMIN123@163.com
- **反馈**：平台「帮助中心」-「意见反馈」页面

© 2025 PARROT团队，保留所有权利。
