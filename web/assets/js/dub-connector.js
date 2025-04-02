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
    
    // 处理试听按钮点击事件 - 由dub.js中的handlePreviewClick统一处理，此处禁用
    /* 
    注意：此事件处理器已禁用，防止与dub.js中的处理器冲突，避免同时触发两个TTS任务
    在测试中发现，当试听按钮被点击时，会同时启动两个TTS任务，这是因为:
    1. dub.js中的handlePreviewClick函数
    2. dub-connector.js中的事件监听器（此处）
    都会处理同一个按钮点击事件，导致同时发送两个请求到后端
    */
    
    // 为避免冲突，此处不再添加事件监听器
    // if (previewButton) {
    //     previewButton.addEventListener('click', async function() {
    //         // 事件处理代码已移除
    //     });
    // }
    
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
