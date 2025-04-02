#!/bin/bash

# PARROT系统停止脚本
# 一键停止前端和后端服务器

# 设置颜色
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # 恢复颜色

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
    kill -9 $pid &>/dev/null
    sleep 1
    log_message "端口 ${port} 上的${process_type}服务已停止" "${GREEN}"
    return 0
  else
    log_message "端口 ${port} 上没有运行的${process_type}服务" "${YELLOW}"
    return 1
  fi
}

# 显示停止信息
show_intro() {
  echo -e "\n${GREEN}==================================================${NC}"
  echo -e "${GREEN}          PARROT 语音平台 - 服务停止脚本          ${NC}"
  echo -e "${GREEN}==================================================${NC}"
  echo -e "本脚本将停止以下服务:"
  echo -e "  - 后端API服务器 (端口 8000)"
  echo -e "  - 前端Web服务器 (端口 8080)"
  echo -e "${GREEN}==================================================${NC}\n"
}

# 主函数
main() {
  show_intro
  
  local backend_stopped=false
  local frontend_stopped=false
  
  # 停止后端服务
  if kill_process 8000 "后端"; then
    backend_stopped=true
  fi
  
  # 停止前端服务
  if kill_process 8080 "前端"; then
    frontend_stopped=true
  fi
  
  # 显示结果
  echo -e "\n${GREEN}==================================================${NC}"
  
  if $backend_stopped || $frontend_stopped; then
    echo -e "${GREEN}          PARROT 语音平台 - 服务已停止          ${NC}"
    if $backend_stopped; then
      echo -e "  - 后端API服务器已停止"
    fi
    if $frontend_stopped; then
      echo -e "  - 前端Web服务器已停止"
    fi
  else
    echo -e "${YELLOW}          PARROT 语音平台 - 没有运行中的服务          ${NC}"
    echo -e "  - 未找到运行中的服务"
  fi
  
  echo -e "\n要重新启动服务，请运行: ${GREEN}bash $(dirname "$0")/start_servers.sh${NC}"
  echo -e "\n${GREEN}==================================================${NC}\n"
}

# 执行主函数
main
