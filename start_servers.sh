#!/bin/bash

# PARROT系统启动脚本
# 一键启动前端和后端服务器

# 设置颜色
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # 恢复颜色

# 设置路径
BASE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" &>/dev/null && pwd)"
BACKEND_DIR="${BASE_DIR}/backend"
FRONTEND_DIR="${BASE_DIR}/web"
LOG_DIR="${BASE_DIR}/logs"
BACKEND_LOG="${LOG_DIR}/backend.log"
FRONTEND_LOG="${LOG_DIR}/frontend.log"

# 确保日志目录存在
mkdir -p "${LOG_DIR}"

# 打印带时间戳的消息
log_message() {
  local timestamp=$(date "+%Y-%m-%d %H:%M:%S")
  local message="$1"
  local color="$2"
  echo -e "${color}[${timestamp}] ${message}${NC}"
}

# 终止进程
kill_process() {
  local port="$1"
  local process_type="$2"
  
  log_message "检查端口 ${port} 上的${process_type}进程..." "${YELLOW}"
  
  local pid=$(lsof -ti:${port})
  if [ -n "$pid" ]; then
    log_message "终止端口 ${port} 上的进程 (PID: ${pid})..." "${YELLOW}"
    kill -9 $pid &>/dev/null || true
    sleep 1
    log_message "端口 ${port} 已释放" "${GREEN}"
  else
    log_message "端口 ${port} 空闲" "${GREEN}"
  fi
}

# 检查服务状态
check_service() {
  local port="$1"
  local name="$2"
  local attempts=5
  local delay=1
  
  log_message "检查${name}服务状态..." "${YELLOW}"
  
  for ((i=1; i<=attempts; i++)); do
    if curl -s "http://localhost:${port}" &>/dev/null; then
      log_message "${name}服务运行正常 (http://localhost:${port})" "${GREEN}"
      return 0
    fi
    
    log_message "等待${name}服务启动 (尝试 ${i}/${attempts})..." "${YELLOW}"
    sleep $delay
  done
  
  log_message "${name}服务可能未成功启动，请检查日志" "${RED}"
  return 1
}

# 显示启动信息
show_intro() {
  echo -e "\n${GREEN}==================================================${NC}"
  echo -e "${GREEN}          PARROT 语音平台 - 服务启动脚本          ${NC}"
  echo -e "${GREEN}==================================================${NC}"
  echo -e "本脚本将启动以下服务:"
  echo -e "  - 后端API服务器 (端口 8000)"
  echo -e "  - 前端Web服务器 (端口 8080)"
  echo -e "${GREEN}==================================================${NC}\n"
}

# 启动后端服务器
start_backend() {
  log_message "启动后端服务器..." "${YELLOW}"
  cd "${BASE_DIR}" || exit 1
  nohup python -m uvicorn backend.main:app --host 0.0.0.0 --port 8000 > "${BACKEND_LOG}" 2>&1 &
  local backend_pid=$!
  log_message "后端服务器进程已启动 (PID: ${backend_pid})" "${GREEN}"
}

# 启动前端服务器
start_frontend() {
  log_message "启动前端服务器..." "${YELLOW}"
  cd "${FRONTEND_DIR}" || exit 1
  nohup python -m http.server 8080 > "${FRONTEND_LOG}" 2>&1 &
  local frontend_pid=$!
  log_message "前端服务器进程已启动 (PID: ${frontend_pid})" "${GREEN}"
}

# 显示服务信息
show_services() {
  echo -e "\n${GREEN}==================================================${NC}"
  echo -e "${GREEN}          PARROT 语音平台 - 服务已启动          ${NC}"
  echo -e "${GREEN}==================================================${NC}"
  echo -e "服务访问地址:"
  echo -e "  - 前端界面: ${GREEN}http://localhost:8080${NC}"
  echo -e "  - 配音页面: ${GREEN}http://localhost:8080/dub.html${NC}"
  echo -e "  - 后端API: ${GREEN}http://localhost:8000/docs${NC}"
  echo -e "\n日志文件位置:"
  echo -e "  - 后端日志: ${BACKEND_LOG}"
  echo -e "  - 前端日志: ${FRONTEND_LOG}"
  echo -e "\n要停止服务，请运行: ${YELLOW}bash ${BASE_DIR}/stop_servers.sh${NC}"
  echo -e "\n${GREEN}==================================================${NC}\n"
}

# 主函数
main() {
  show_intro
  
  # 终止已存在的进程
  kill_process 8000 "后端"
  kill_process 8080 "前端"
  
  # 启动服务
  start_backend
  start_frontend
  
  # 验证服务
  sleep 3
  check_service 8000 "后端"
  check_service 8080 "前端"
  
  # 显示服务信息
  show_services
}

# 执行主函数
main
