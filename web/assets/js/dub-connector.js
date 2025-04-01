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
    
    // 处理试听按钮点击事件
    if (previewButton) {
        previewButton.addEventListener('click', async function() {
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

            try {
                // 准备参数
                const params = {
                    text: textarea.value,
                    // 这里可以根据实际界面添加更多参数，如音色、音量等
                };
                
                // 生成配音
                currentAudioData = await dubbingService.generateDubbing(params);
                
                // 播放配音
                await dubbingService.playAudio(currentAudioData);
                
            } catch (error) {
                console.error('配音生成失败:', error);
                showMessage('配音生成失败，请重试', 'error');
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
