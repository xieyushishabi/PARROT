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

## 🔄 最新更新 (2025-04-03)

### 性能优化
- **并发处理**：TTS任务并发处理数提升至2个，优化任务队列
- **资源利用**：提高CPU和内存使用率阈值，充分利用系统资源

### 音频生成界面优化
- **描通一键式生成**：简化音频生成流程，将生成请求直接发送至后台处理
- **音色卡片优化**：改进音色选择界面，统一卡片大小，每行显示两个卡片
- **直观选择反馈**：增强音色选择直观性，添加清晰的选中状态反馈
- **记录管理集成**：优化音频记录页面，准确显示音色名称和生成时间

### 前端方案改进
- **界面统一**：统一所有页面设计风格，优化音频播放器UI
- **功能增强**：改进菜单显示和过滤功能，添加响应式设计
- **兼容性**：增强兼容性处理，确保各种环境下正常显示

### 系统管理
- **服务脚本**：完善一键式服务启动与停止脚本
- **日志记录**：优化日志功能，便于问题排查

## 📅 开发计划
- [x] AI生成配音文案
- [x] 帮助中心功能完善
- [ ] 声音克隆技术集成
- [ ] 社区资源（音色数据库搭建）

## 📞 联系方式
- **邮箱**：PARROTADMIN123@163.com
- **反馈**：平台「帮助中心」-「意见反馈」页面

© 2025 PARROT团队，保留所有权利。
