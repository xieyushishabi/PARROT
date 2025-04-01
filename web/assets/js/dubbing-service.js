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
    async generateDubbing(params) {
        try {
            // 显示加载状态
            this.showLoadingState(true, '正在生成配音...');
            
            // 这里模拟API调用，等待后端API完成后替换
            // const response = await fetch(`${this.API_BASE_URL}/tts`, {
            //     method: 'POST',
            //     headers: {
            //         'Content-Type': 'application/json'
            //     },
            //     body: JSON.stringify(params)
            // });
            
            // if (!response.ok) {
            //     throw new Error(`服务器错误: ${response.status}`);
            // }
            
            // const audioData = await response.arrayBuffer();
            // return audioData;

            // 模拟等待，实际项目中请删除这段代码并取消上面注释
            await new Promise(resolve => setTimeout(resolve, 1500));
            
            // 使用示例音频文件进行测试
            const response = await fetch('assets/audio/example.wav');
            if (!response.ok) {
                throw new Error('示例音频加载失败');
            }
            const audioData = await response.arrayBuffer();
            return audioData;
        } catch (error) {
            console.error('生成配音失败:', error);
            this.showNotification('生成配音失败，请重试', 'error');
            throw error;
        } finally {
            this.showLoadingState(false);
        }
    }

    /**
     * 播放音频
     * @param {ArrayBuffer} audioData - 音频数据
     */
    async playAudio(audioData) {
        if (!this.initAudioContext()) {
            return;
        }

        try {
            // 如果正在播放，先停止
            if (this.isPlaying) {
                this.stopAudio();
            }

            // 解码音频数据
            this.audioBuffer = await this.audioContext.decodeAudioData(audioData);
            
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
        const loadingOverlay = document.querySelector('.loading-overlay');
        
        if (!loadingOverlay && isLoading) {
            // 创建加载遮罩
            const overlay = document.createElement('div');
            overlay.className = 'loading-overlay';
            
            const spinner = document.createElement('div');
            spinner.className = 'loading-spinner';
            
            const loadingText = document.createElement('div');
            loadingText.className = 'loading-text';
            loadingText.textContent = message;
            
            overlay.appendChild(spinner);
            overlay.appendChild(loadingText);
            document.body.appendChild(overlay);
        } else if (loadingOverlay && !isLoading) {
            // 移除加载遮罩
            document.body.removeChild(loadingOverlay);
        }
    }

    /**
     * 显示通知消息
     * @param {string} message - 消息内容
     * @param {string} type - 消息类型 (success, error, info)
     */
    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        // 2秒后移除通知
        setTimeout(() => {
            notification.classList.add('fade-out');
            setTimeout(() => {
                if (document.body.contains(notification)) {
                    document.body.removeChild(notification);
                }
            }, 300);
        }, 2000);
    }
}

// 导出服务实例
const dubbingService = new DubbingService();
