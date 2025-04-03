/**
 * 智能配音服务
 * 处理文本转语音、音频合成和下载功能
 */

class DubbingService {
    constructor() {
        this.API_BASE_URL = 'http://127.0.0.1:8000/api';
        this.audioContext = null;
        this.audioBuffer = null;
        this.audioSource = null;
        this.isPlaying = false;
    }

    /**
     * 初始化音频上下文
     */
    initAudioContext() {
        if (!this.audioContext) {
            try {
                window.AudioContext = window.AudioContext || window.webkitAudioContext;
                this.audioContext = new AudioContext();
            } catch (e) {
                console.error('Web Audio API 不支持', e);
                return false;
            }
        }
        return true;
    }

    /**
     * 从后端获取配音
     * @param {Object} params - 配音参数
     * @returns {Promise} - 返回音频数据
     */
    // 轮询任务状态的方法
    async pollTaskStatus(taskId) {
        let status = 'processing';
        let maxAttempts = 120; // 最多等待120次 (4分钟)
        let attempt = 0;
        let audioData = null;
        
        console.log(`开始轮询任务 ${taskId} 的状态`);
        this.showLoadingState(true, '正在生成语音，请耐心等待...');
        
        while (status === 'processing' && attempt < maxAttempts) {
            // 等待2秒
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            // 检查任务状态
            try {
                const statusResponse = await fetch(`${this.API_BASE_URL}/v1/tts/status/${taskId}`);
                if (!statusResponse.ok) {
                    console.error(`获取状态失败: ${statusResponse.status}`);
                    throw new Error(`获取状态失败: ${statusResponse.status}`);
                }
                
                const statusData = await statusResponse.json();
                status = statusData.status;
                console.log(`任务 ${taskId} 当前状态: ${status}`, statusData);
                
                // 更新加载提示
                if (status === 'processing') {
                    attempt++;
                    
                    let loadingMessage;
                    if (statusData.progress) {
                        loadingMessage = `正在生成语音 (${statusData.progress}%)...`;
                    } else if (statusData.estimated_remaining_time) {
                        const minutes = Math.ceil(statusData.estimated_remaining_time / 60);
                        loadingMessage = `正在生成语音，预计还需 ${minutes} 分钟...`;
                    } else {
                        loadingMessage = `正在生成语音，请耐心等待...(${attempt}/${maxAttempts})`;
                    }
                    
                    this.showLoadingState(true, loadingMessage);
                }
                
                // 如果任务完成，退出循环
                if (status === 'completed') {
                    console.log(`TTS任务 ${taskId} 已完成，准备下载音频`);
                    break;
                }
            } catch (error) {
                console.warn(`检查任务 ${taskId} 状态时出错:`, error);
                // 继续轮询，不终止流程
            }
        }
        
        if (status === 'failed') {
            console.error(`任务 ${taskId} 失败，最终状态: ${status}`);
            throw new Error('配音生成失败，请查看服务器日志');
        }
        
        if (status !== 'completed') {
            console.error(`任务 ${taskId} 等待超时，最终状态: ${status}`);
            // 尝试检查outputs目录中是否有该任务ID的文件
            try {
                // 用于检查是否存在已生成的文件的标志
                const checkFileResponse = await fetch(`${this.API_BASE_URL}/v1/tts/check_file/${taskId}`);
                if (checkFileResponse.ok) {
                    const fileData = await checkFileResponse.json();
                    if (fileData.exists) {
                        console.log(`找到任务 ${taskId} 的文件，尝试下载...`);
                        status = 'completed';
                    }
                }
            } catch (error) {
                console.warn('检查文件存在性失败:', error);
            }
            
            // 如果仍然不是completed状态
            if (status !== 'completed') {
                throw new Error('配音生成等待超时');
            }
        }
        
        try {
            // 下载音频
            console.log(`任务 ${taskId} 完成，开始下载音频`);
            this.showLoadingState(true, '正在准备音频...');
            const audioResponse = await fetch(`${this.API_BASE_URL}/v1/tts/download/${taskId}`);
            
            if (!audioResponse.ok) {
                console.error(`任务 ${taskId} 获取音频失败: ${audioResponse.status}`);
                throw new Error(`获取音频失败: ${audioResponse.status}`);
            }
            
            // 返回音频数据
            console.log(`任务 ${taskId} 音频下载成功，正在处理数据`);
            audioData = await audioResponse.arrayBuffer();
            console.log(`任务 ${taskId} 音频数据处理完成，大小: ${audioData.byteLength} 字节`);
            return audioData;
        } catch (error) {
            console.error(`下载任务 ${taskId} 音频失败:`, error);
            throw error;
        }
    }

    async generateDubbing(params) {
        let taskId = null;
        let loadingActive = false;
        let audioData = null;

        try {
            console.log('开始生成配音...');
            // 清除可能存在的任何通知和加载状态
            this._removeAllNotifications();
            this._removeAllLoadingOverlays();

            // 显示加载状态
            loadingActive = true;
            this.showLoadingState(true, '正在准备生成配音...');
            
            // 在生成配音前删除所有可能存在的错误通知
            const notifications = document.querySelectorAll('.notification');
            notifications.forEach(notification => notification.remove());
            
            // 创建表单数据
            const formData = new FormData();
            formData.append('text', params.text);
            
            // 添加语音样本参数
            if (params.voiceSample) {
                // 判断是文件还是字符串
                if (params.voiceSample instanceof File) {
                    console.log('使用上传的音色文件:', params.voiceSample.name);
                    formData.append('voice_sample', params.voiceSample);
                } else {
                    // 如果是字符串，传递音色名称
                    console.log('使用指定的音色名称:', params.voiceSample);
                    formData.append('voice_name', params.voiceSample);
                }
            }
            
            // 添加其他参数
            if (params.p_w) formData.append('p_w', params.p_w);
            if (params.t_w) formData.append('t_w', params.t_w);
            
            console.log('发送TTS生成请求...');
            // 发送TTS生成请求
            const generateResponse = await fetch(`${this.API_BASE_URL}/v1/tts/generate`, {
                method: 'POST',
                body: formData,
            });
            
            if (!generateResponse.ok) {
                const errorData = await generateResponse.json();
                console.warn('TTS生成请求失败:', generateResponse.status, errorData);
                
                // 采用特殊处理429错误 - 查找已存在的任务并继续轮询
                if (generateResponse.status === 429) {
                    console.log('已有TTS任务正在处理中，自动切换到轮询模式');
                    
                    // 获取正在运行的任务ID
                    try {
                        const statusResponse = await fetch(`${this.API_BASE_URL}/v1/tts/tasks`);  
                        if (statusResponse.ok) {
                            const tasks = await statusResponse.json();
                            console.log('获取到任务列表:', tasks);
                            // 获取正在运行的任务
                            const runningTasks = tasks.filter(t => t.status === 'processing');
                            if (runningTasks.length > 0) {
                                // 使用第一个运行中的任务
                                taskId = runningTasks[0].task_id;
                                console.log(`找到正在运行的任务：${taskId}，切换到该任务`);
                                this.showLoadingState(true, '正在追踪已有的TTS任务...');
                                
                                // 进入轮询
                                audioData = await this.pollTaskStatus(taskId);
                                console.log(`成功获取到任务 ${taskId} 的音频数据，大小: ${audioData.byteLength} 字节`);
                                return audioData;
                            } else {
                                console.log('没有找到正在运行的任务，检查是否有已完成的任务');
                                const completedTasks = tasks.filter(t => t.status === 'completed');
                                if (completedTasks.length > 0) {
                                    // 使用第一个已完成的任务
                                    taskId = completedTasks[0].task_id;
                                    console.log(`找到已完成的任务：${taskId}，直接下载音频`);
                                    this.showLoadingState(true, '正在获取已完成的TTS任务音频...');
                                    
                                    // 直接下载音频
                                    try {
                                        const audioResponse = await fetch(`${this.API_BASE_URL}/v1/tts/download/${taskId}`);
                                        if (audioResponse.ok) {
                                            audioData = await audioResponse.arrayBuffer();
                                            console.log(`成功获取到任务 ${taskId} 的音频数据，大小: ${audioData.byteLength} 字节`);
                                            return audioData;
                                        } else {
                                            console.warn(`下载已完成任务 ${taskId} 的音频失败:`, audioResponse.status);
                                        }
                                    } catch (audioError) {
                                        console.error(`下载已完成任务 ${taskId} 的音频出错:`, audioError);
                                    }
                                }
                            }
                        } else {
                            console.warn('获取任务列表失败:', statusResponse.status);
                        }
                        
                        // 如果找不到任务，显示等待消息
                        console.log('未找到可用任务，等待后重试');
                        this.showLoadingState(true, '正在等待当前任务完成...');
                        await new Promise(resolve => setTimeout(resolve, 2000));
                        return await this.generateDubbing(params);
                    } catch (error) {
                        console.error('检索运行中任务失败:', error);
                        // 消除情况，不向用户显示错误
                        this.showLoadingState(false);  // 隐藏加载状态
                        return null; // 返回null而不是抛出错误
                    }
                }
                
                throw new Error(`生成配音失败: ${errorData.detail || generateResponse.status}`);
            }
            
            // 获取任务ID
            const responseData = await generateResponse.json();
            taskId = responseData.task_id;
            console.log(`成功创建TTS任务，ID: ${taskId}`);
            
            // 使用专门的轮询方法处理任务状态
            console.log(`使用轮询方法跟踪任务 ${taskId} 的状态`);
            audioData = await this.pollTaskStatus(taskId);
            console.log(`成功获取到任务 ${taskId} 的音频数据，大小: ${audioData.byteLength} 字节`);
            return audioData;
        } catch (error) {
            console.error('生成配音失败:', error);
            
            // null 返回值表示429错误，有任务已在运行
            if (error === null) {
                return null;
            }
            
            // 特殊错误不显示通知
            if (error && error.message) {
                // 对于这些错误不展示通知
                const silentErrors = [
                    'CONCURRENT_TASK_SILENT_ERROR',
                    '配音生成等待超时',
                    '已有TTS任务正在处理中'
                ];
                
                const shouldShowError = !silentErrors.some(errMsg => error.message.includes(errMsg));
                
                if (shouldShowError) {
                    this._removeAllNotifications();
                    this.showNotification('生成配音失败，请重试', 'error');
                }
            } else {
                this._removeAllNotifications();
                this.showNotification('生成配音失败，请重试', 'error');
            }
            return null; // 返回null而不是抛出错误，避免上层捕获并显示错误
        } finally {
            // 只有在loadingActive为true时才关闭加载状态，避免关闭稍后才会显示的加载状态
            if (loadingActive) {
                console.log('关闭加载状态，加载状态:', loadingActive);
                this.showLoadingState(false, '加载状态: 隐藏');
            } else {
                console.log('保持加载状态不变，当前加载状态:', loadingActive);
            }
        }
    }

    /**
     * 播放音频
     * @param {ArrayBuffer} audioData - 音频数据
     */
    async playAudio(audioData) {
        if (!audioData || audioData.byteLength === 0) {
            console.error('音频数据为空，无法播放');
            this.showNotification('音频数据为空，无法播放', 'error');
            return;
        }
        
        if (!this.initAudioContext()) {
            console.error('无法初始化音频上下文');
            this.showNotification('无法初始化音频播放器', 'error');
            return;
        }

        try {
            // 如果正在播放，先停止
            if (this.isPlaying) {
                this.stopAudio();
            }

            // 确保我们有一个新副本的数据（避免ArrayBuffer已被分离的错误）
            const audioDataCopy = audioData.slice(0);
            console.log(`准备解码音频数据，大小: ${audioDataCopy.byteLength} 字节`);
            
            // 解码音频数据
            this.audioBuffer = await this.audioContext.decodeAudioData(audioDataCopy);
            
            // 创建音频源
            this.audioSource = this.audioContext.createBufferSource();
            this.audioSource.buffer = this.audioBuffer;
            this.audioSource.connect(this.audioContext.destination);
            
            // 播放完成后的处理
            this.audioSource.onended = () => {
                this.isPlaying = false;
                this.updatePlayButton(false);
            };
            
            // 开始播放
            this.audioSource.start();
            this.isPlaying = true;
            this.updatePlayButton(true);
        } catch (error) {
            console.error('播放音频失败:', error);
            this.showNotification('播放音频失败', 'error');
        }
    }

    /**
     * 停止音频播放
     */
    stopAudio() {
        if (this.audioSource && this.isPlaying) {
            this.audioSource.stop();
            this.audioSource.disconnect();
            this.isPlaying = false;
            this.updatePlayButton(false);
        }
    }

    /**
     * 更新播放按钮状态
     * @param {boolean} isPlaying - 是否正在播放
     */
    updatePlayButton(isPlaying) {
        const playButton = document.querySelector('.btn-preview');
        if (playButton) {
            if (isPlaying) {
                playButton.textContent = '停止';
                playButton.classList.add('playing');
            } else {
                playButton.textContent = '试听';
                playButton.classList.remove('playing');
            }
        }
    }

    /**
     * 下载音频文件
     * @param {ArrayBuffer} audioData - 音频数据
     * @param {string} fileName - 文件名
     */
    downloadAudio(audioData, fileName = 'parrot_dubbing.mp3') {
        try {
            const blob = new Blob([audioData], { type: 'audio/mp3' });
            const url = URL.createObjectURL(blob);
            
            const a = document.createElement('a');
            a.href = url;
            a.download = fileName;
            document.body.appendChild(a);
            a.click();
            
            // 清理
            setTimeout(() => {
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
            }, 100);
            
            this.showNotification('音频下载成功', 'success');
        } catch (error) {
            console.error('下载音频失败:', error);
            this.showNotification('下载音频失败', 'error');
        }
    }

    /**
     * 显示加载状态
     * @param {boolean} isLoading - 是否正在加载
     * @param {string} message - 加载消息
     */
    showLoadingState(isLoading, message = '处理中...') {
        console.log(`加载状态: ${isLoading ? '显示' : '隐藏'}, 消息: ${message}`);
        
        // 使用自定义ID来确保我们能找到正确的元素
        const loadingOverlayId = 'parrot-loading-overlay';
        const loadingOverlay = document.getElementById(loadingOverlayId);
        
        if (!loadingOverlay && isLoading) {
            // 创建加载遮罩
            const overlay = document.createElement('div');
            overlay.className = 'loading-overlay';
            overlay.id = loadingOverlayId;
            
            const spinner = document.createElement('div');
            spinner.className = 'loading-spinner';
            
            const loadingText = document.createElement('div');
            loadingText.className = 'loading-text';
            loadingText.textContent = message;
            
            overlay.appendChild(spinner);
            overlay.appendChild(loadingText);
            document.body.appendChild(overlay);
            console.log('已创建加载遮罩');
        } else if (loadingOverlay && !isLoading) {
            try {
                // 移除加载遮罩
                loadingOverlay.remove();
                console.log('已移除加载遮罩', isLoading, message);
            } catch (error) {
                console.warn('移除加载遮罩时出错:', error);
            }
        } else if (!loadingOverlay && !isLoading) {
            console.log('无需移除加载遮罩，因为它不存在');
        } else if (loadingOverlay && isLoading) {
            // 更新已存在遮罩的文本
            const textElement = loadingOverlay.querySelector('.loading-text');
            if (textElement) {
                textElement.textContent = message;
                console.log(`已更新加载文本: ${message}`);
            }
        }
    }
    
    /**
     * 移除所有加载遮罩
     * @private
     */
    _removeAllLoadingOverlays() {
        // 移除所有加载遮罩元素
        const overlays = document.querySelectorAll('.loading-overlay');
        if (overlays.length > 0) {
            console.log(`正在移除${overlays.length}个加载遮罩`);
            overlays.forEach(overlay => overlay.remove());
        }
    }

    /**
     * 显示通知消息
     * @param {string} message - 消息内容
     * @param {string} type - 消息类型 (success, error, info, warning)
     * @param {number} duration - 显示时长(毫秒)
     */
    showNotification(message, type = 'info', duration = 3000) {
        console.log(`显示通知 [${type}]: ${message}`);
        
        // 添加ID方便识别
        const notificationId = `notification-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
        
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.id = notificationId;
        notification.innerHTML = message; // 使用innerHTML支持HTML内容
        notification.dataset.type = type; // 添加数据属性以便识别类型
        
        // 记录到控制台，特别是对于错误
        if (type === 'error') {
            console.error(`通知错误: ${message}`);
        } else if (type === 'warning') {
            console.warn(`通知警告: ${message}`);
        }
        
        document.body.appendChild(notification);
        console.log(`通知已添加到页面 ID: ${notificationId}`);
        
        // 添加点击关闭功能
        notification.addEventListener('click', () => {
            notification.remove();
            console.log(`用户点击关闭通知 ID: ${notificationId}`);
        });
        
        // 指定时间后移除通知
        setTimeout(() => {
            notification.classList.add('fade-out');
            setTimeout(() => {
                if (document.body.contains(notification)) {
                    document.body.removeChild(notification);
                    console.log(`通知已自动移除 ID: ${notificationId}`);
                }
            }, 300);
        }, duration);
    }
    
    /**
     * 移除所有通知消息
     * @private
     */
    _removeAllNotifications() {
        // 移除所有通知元素
        const notifications = document.querySelectorAll('.notification');
        if (notifications.length > 0) {
            console.log(`正在移除${notifications.length}个通知`);
            notifications.forEach(notification => notification.remove());
        }
    }
}

// 导出服务实例
const dubbingService = new DubbingService();
