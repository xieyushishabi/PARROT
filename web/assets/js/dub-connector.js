/**
 * 配音连接器 - 连接配音服务与现有界面
 */

document.addEventListener('DOMContentLoaded', function() {
    // 确保dubbing-service.js已加载
    if (typeof dubbingService === 'undefined') {
        console.error('配音服务未加载，请检查dubbing-service.js文件');
        return;
    }

    // 获取主要元素
    const previewButton = document.querySelector('.btn-preview');
    const exportButton = document.querySelector('.btn-export');
    const textarea = document.querySelector('.text-editor-container textarea');
    const voiceBtn = document.querySelector('.voice-btn');
    
    // 存储当前音频数据
    let currentAudioData = null;
    
    // 防抖标志，防止重复点击
    let isProcessing = false;
    
    // 定义选中样式处理
    function setupSelectionHandlers() {
        // 音色选择
        const voiceItems = document.querySelectorAll('.voice-item');
        voiceItems.forEach(item => {
            item.addEventListener('click', function() {
                voiceItems.forEach(v => v.classList.remove('selected'));
                this.classList.add('selected');
            });
        });
        
        // 情感选择
        const emotionTags = document.querySelectorAll('.emotion-tag');
        emotionTags.forEach(tag => {
            tag.addEventListener('click', function() {
                emotionTags.forEach(t => t.classList.remove('selected'));
                this.classList.add('selected');
            });
        });
    }
    
    // 初始化选择处理
    setupSelectionHandlers();
    
    // 处理试听按钮点击事件
    if (previewButton) {
        previewButton.addEventListener('click', async function() {
            // 检查是否已在处理中
            if (isProcessing) {
                console.log('请求已在处理中，忽略重复点击');
                return;
            }
            
            // 检查是否有文本内容
            if (!textarea || !textarea.value.trim()) {
                showMessage('请先输入文本内容', 'error');
                return;
            }
            
            // 如果正在播放，则停止播放
            if (dubbingService.isPlaying) {
                dubbingService.stopAudio();
                return;
            }
            
            // 设置按钮为禁用状态
            previewButton.classList.add('disabled');
            isProcessing = true;

            try {
                // 移除现有通知
                const notifications = document.querySelectorAll('.notification');
                notifications.forEach(notification => notification.remove());
                
                // 准备参数
                const params = {
                    text: textarea.value,
                    p_w: 2.0,  // 默认清晰度权重
                    t_w: 3.0   // 默认相似度权重
                };
                
                // 获取选中的音色
                const selectedVoice = document.querySelector('.voice-item.selected');
                if (selectedVoice && selectedVoice.dataset.voiceId) {
                    params.voiceId = selectedVoice.dataset.voiceId;
                }
                
                // 获取情感设置
                const selectedEmotion = document.querySelector('.emotion-tag.selected');
                if (selectedEmotion) {
                    params.emotion = selectedEmotion.textContent.trim();
                }
                
                // 获取其他控制参数(速度、音调等)
                const speedControl = document.querySelector('.speed-control .value-input');
                if (speedControl) {
                    params.speed = parseFloat(speedControl.value) || 1.0;
                }
                
                const pitchControl = document.querySelector('.pitch-control .value-input');
                if (pitchControl) {
                    params.pitch = parseFloat(pitchControl.value) || 0.0;
                }
                
                // 根据情感调整清晰度和相似度权重
                if (params.emotion) {
                    // 对于更具表现力的情感，增加相似度权重
                    if (['热情', '兴奋', '激动', '悲伤', '生气'].includes(params.emotion)) {
                        params.t_w = 4.0;
                    }
                }
                
                // 生成配音
                currentAudioData = await dubbingService.generateDubbing(params);
                
                // 只在成功生成音频时播放
                if (currentAudioData) {
                    console.log('音频数据生成成功，准备播放');
                    await dubbingService.playAudio(currentAudioData);
                } else {
                    console.log('未生成音频数据，可能有其他任务正在运行');
                }
                
            } catch (error) {
                // 只有当确实发生错误时才进入这里
                // 由于我们已经修改了generateDubbing返回null而不是抛出错误
                // 所以这里应该只对真正的错误进行处理
                if (error) {
                    console.error('配音生成过程中发生错误:', error);
                    // 如果是机器人预期的正常错误，不显示错误提示
                    if (!error.message || (
                        !error.message.includes('已有TTS任务正在处理中') && 
                        !error.message.includes('CONCURRENT_TASK_SILENT_ERROR')
                    )) {
                        showMessage('配音生成失败，请重试', 'error');
                    } else {
                        console.log('任务冲突，继续等待当前任务完成...');
                    }
                }
            } finally {
                // 重置状态
                setTimeout(() => {
                    isProcessing = false;
                    previewButton.classList.remove('disabled');
                }, 2000); // 延迟2秒以防止过快重复点击
            }
        });
    }
    
    // 处理导出按钮点击事件
    if (exportButton) {
        exportButton.addEventListener('click', function() {
            if (!currentAudioData) {
                showMessage('请先生成配音', 'error');
                return;
            }
            
            // 导出音频
            dubbingService.downloadAudio(currentAudioData, `PARROT配音_${new Date().toISOString().slice(0, 10)}.mp3`);
        });
    }
    
    // 显示消息提示
    function showMessage(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        notification.style.position = 'fixed';
        notification.style.top = '20px';
        notification.style.right = '20px';
        notification.style.padding = '15px 20px';
        notification.style.borderRadius = '4px';
        notification.style.color = 'white';
        notification.style.fontWeight = 'bold';
        notification.style.zIndex = '1001';
        notification.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.2)';
        
        if (type === 'error') {
            notification.style.backgroundColor = '#e74c3c';
        } else if (type === 'success') {
            notification.style.backgroundColor = '#2ecc71';
        } else {
            notification.style.backgroundColor = '#3498db';
        }
        
        document.body.appendChild(notification);
        
        // 2秒后移除通知
        setTimeout(() => {
            notification.style.opacity = '0';
            notification.style.transition = 'opacity 0.3s ease';
            setTimeout(() => {
                if (document.body.contains(notification)) {
                    document.body.removeChild(notification);
                }
            }, 300);
        }, 2000);
    }
    
    // 添加必要的样式
    const style = document.createElement('style');
    style.textContent = `
        .btn-preview.playing {
            background-color: #e74c3c;
        }
        
        .btn-preview.disabled {
            opacity: 0.6;
            cursor: not-allowed;
            background-color: #cccccc;
        }
        
        .loading-overlay {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background-color: rgba(0, 0, 0, 0.7);
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            z-index: 1000;
        }
        
        .loading-spinner {
            width: 50px;
            height: 50px;
            border: 5px solid #f3f3f3;
            border-top: 5px solid #3498db;
            border-radius: 50%;
            animation: spin 1s linear infinite;
            margin-bottom: 20px;
        }
        
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
        
        .loading-text {
            color: white;
            font-size: 18px;
        }
    `;
    document.head.appendChild(style);
    
    console.log('配音连接器初始化完成');
});
