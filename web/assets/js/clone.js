function showToast(message) {
    const toast = document.querySelector('.toast-message');
    const toastText = toast.querySelector('.toast-text');
    
    // 先移除可能存在的动画
    toast.style.animation = 'none';
    toast.offsetHeight; // 触发重绘
    
    // 重新添加动画
    toast.style.animation = 'fadeInOut 2s ease-in-out';
    
    toast.style.display = 'block';
    toastText.textContent = message;
    
    // 2秒后隐藏
    setTimeout(() => {
        toast.style.display = 'none';
    }, 2000);
}

// API基础URL
const API_BASE_URL = 'http://127.0.0.1:8000/api/v1';

// 上传语音样本
async function uploadVoiceSample(params) {
    try {
        // 获取认证令牌
        const userJson = localStorage.getItem('currentUser');
        const currentUser = userJson ? JSON.parse(userJson) : null;
        const token = currentUser ? currentUser.token : null;
        if (!token) {
            // 如果没有令牌，提示用户登录
            showToast('请先登录后再上传声音样本');
            throw new Error('用户未登录');
        }

        const formData = new FormData();
        
        // 添加必要的字段
        formData.append('title', params.title);
        formData.append('preview', params.preview || '暂无描述');
        
        // 音频文件
        if (params.voiceFile) {
            formData.append('voice_file', params.voiceFile);
        } else {
            throw new Error('请提供音频文件');
        }
        
        // 头像/封面图片
        if (params.avatar) {
            formData.append('avatar', params.avatar);
        }
        
        // 公开/私有设置
        formData.append('is_public', params.isPublic);
        
        // 语言设置，默认中文
        formData.append('language', params.language || 'zh');
        
        console.log('发送语音样本上传请求...');
        
        // 发送请求，确保正确设置Authorization头
        const response = await fetch(`${API_BASE_URL}/tts/voice-samples/upload`, {
            method: 'POST',
            body: formData,
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!response.ok) {
            // 特别处理401错误
            if (response.status === 401) {
                showToast('登录已过期，请重新登录');
                // 清除失效的令牌
                localStorage.removeItem('token');
                
                throw new Error('登录已过期');
            }
            
            // 处理其他错误
            const errorData = await response.json();
            const errorMessage = errorData.detail || errorData.message || '上传失败，服务器返回错误';
            throw new Error(errorMessage);
        }
        
        return await response.json();
    } catch (error) {
        console.error('上传语音样本失败:', error);
        const errorMessage = error.message || (typeof error === 'object' ? JSON.stringify(error) : String(error));
        showToast(errorMessage || '上传失败，请重试');
        throw error;
    }
}

// 获取我的声音样本
async function getMyVoiceSamples() {
    try {
        // 获取认证令牌
        const userJson = localStorage.getItem('currentUser');
        const currentUser = userJson ? JSON.parse(userJson) : null;
        const token = currentUser ? currentUser.token : null;
        
        if (!token) {
            // 用户未登录，显示提示
            const voiceItems = document.querySelector('.voice-items');
            voiceItems.innerHTML = '<p class="no-voice-tip">请先登录后查看您的声音</p>';
            return;
        }

        // 发送请求获取声音样本
        const response = await fetch(`${API_BASE_URL}/tts/voice-samples/my`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!response.ok) {
            // 处理错误
            if (response.status === 401) {
                // 登录已过期
                localStorage.removeItem('currentUser');
                const voiceItems = document.querySelector('.voice-items');
                voiceItems.innerHTML = '<p class="no-voice-tip">登录已过期，请重新登录</p>';
                return;
            }
            
            throw new Error('获取声音样本失败');
        }
        
        const data = await response.json();
        const voiceSamples = data.voice_samples || [];
        
        // 更新UI
        const voiceItems = document.querySelector('.voice-items');
        
        if (voiceSamples.length === 0) {
            // 没有声音样本
            voiceItems.innerHTML = '<p class="no-voice-tip">暂无我的声音</p>';
            return;
        }
        
        // 清空现有内容
        voiceItems.innerHTML = '';
        
        // 添加声音样本
        voiceSamples.forEach(sample => {
            // 格式化日期
            let dateStr = '未知日期';
            if (sample.created_at) {
                const date = new Date(sample.created_at);
                dateStr = `${date.getFullYear()}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getDate().toString().padStart(2, '0')}`;
            }
            
            const voiceItem = document.createElement('div');
            voiceItem.className = 'voice-item';
            voiceItem.innerHTML = `
                <div class="voice-avatar">
                    <img src="${API_BASE_URL}/tts/voice-samples/${sample.id}/avatar" alt="模型头像">
                </div>
                <div class="voice-info">
                    <h3>${sample.title}</h3>
                    <p class="voice-desc">${sample.preview || '暂无描述文本'}</p>
                    <div class="date-wrapper">
                        <img src="assets/icons/time-icon.png" alt="时间" class="time-icon">
                        <span class="date">${dateStr}</span>
                    </div>
                </div>
                <button class="delete-btn" onclick="showDeleteDialog(this)" data-voice-id="${sample.id}">
                    <img src="assets/icons/delete-icon.png" alt="删除" class="delete-icon">
                </button>
            `;
            
            voiceItems.appendChild(voiceItem);
        });
    } catch (error) {
        console.error('获取声音样本失败:', error);
        const voiceItems = document.querySelector('.voice-items');
        voiceItems.innerHTML = '<p class="no-voice-tip">获取声音样本失败，请刷新页面重试</p>';
    }
}

// 删除声音样本
async function deleteVoiceSample(voiceId) {
    try {
        // 获取认证令牌
        const userJson = localStorage.getItem('currentUser');
        const currentUser = userJson ? JSON.parse(userJson) : null;
        const token = currentUser ? currentUser.token : null;
        
        if (!token) {
            showToast('请先登录后再操作');
            return false;
        }

        const response = await fetch(`${API_BASE_URL}/tts/voice-samples/${voiceId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!response.ok) {
            if (response.status === 401) {
                showToast('登录已过期，请重新登录');
                localStorage.removeItem('currentUser');
                return false;
            }
            
            const errorData = await response.json();
            throw new Error(errorData.detail || '删除失败');
        }
        
        return true;
    } catch (error) {
        console.error('删除声音样本失败:', error);
        showToast('删除失败: ' + (error.message || '未知错误'));
        return false;
    }
}

// 添加录音相关变量
let mediaRecorder = null;
let audioChunks = [];
let audioBlob = null;
let audioStream = null;

// 实现开始录音功能
async function startRecording() {
    try {
        // 请求麦克风权限
        audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        
        // 创建MediaRecorder实例
        mediaRecorder = new MediaRecorder(audioStream);
        
        // 清空之前的数据
        audioChunks = [];
        
        // 收集录音数据
        mediaRecorder.addEventListener('dataavailable', event => {
            if (event.data.size > 0) {
                audioChunks.push(event.data);
            }
        });
        
        // 当录音停止时的处理
        mediaRecorder.addEventListener('stop', () => {
            // 创建音频Blob
            audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
            
            // 创建音频URL
            const audioUrl = URL.createObjectURL(audioBlob);
            
            // 找到或创建音频元素并设置源
            const recordingAudio = ensureAudioElement();
            recordingAudio.src = audioUrl;
        });
        
        // 开始录音
        mediaRecorder.start();
        return true;
    } catch (error) {
        console.error('无法访问麦克风:', error);
        showToast('无法访问麦克风，请检查权限设置');
        return false;
    }
}

// 实现停止录音功能
function stopRecording() {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
        mediaRecorder.stop();
        
        // 关闭麦克风流
        if (audioStream) {
            audioStream.getTracks().forEach(track => track.stop());
            audioStream = null;
        }
        
        return true;
    }
    return false;
}

// 确保录音完成界面有音频元素
function ensureAudioElement() {
    const recordComplete = document.querySelector('.record-complete');
    let audio = recordComplete.querySelector('audio');
    
    if (!audio) {
        audio = document.createElement('audio');
        audio.controls = false; // 不显示默认控件，使用自定义播放按钮
        audio.style.display = 'none'; // 隐藏但仍然可以播放
        recordComplete.appendChild(audio);
    }
    
    return audio;
}

document.addEventListener('DOMContentLoaded', function () {
    // 获取用户的声音样本
    getMyVoiceSamples();
    
    // 录音完成界面的提交按钮点击事件
    const completeSubmitBtn = document.querySelector('.record-complete .submit-record-btn');
    completeSubmitBtn.addEventListener('click', async function() {
        // 首先检查用户是否已登录
        const userJson = localStorage.getItem('currentUser');
        const currentUser = userJson ? JSON.parse(userJson) : null;
        if (!currentUser || !currentUser.token) {
            showToast('请先登录后再上传声音样本');
            return;
        }

        // 检查模型照片
        const modelPreview = document.querySelector('.preview-image');
        if (modelPreview.src.includes('model-preview.png')) {
            showToast('未上传模型照片');
            return;
        }

        // 检查模型名称
        const modelName = document.querySelector('.model-name').value.trim();
        if (!modelName) {
            showToast('未填写模型昵称');
            return;
        }

        // 获取描述文本
        const modelDesc = document.querySelector('.model-description').value.trim();
        
        // 获取公开/私有设置
        const isPublic = document.querySelector('.btn-public').classList.contains('active');
        
        try {
            // 检查是否有录音数据
            if (!audioBlob) {
                showToast('录音数据不完整，请重新录制');
                return;
            }
            
            // 将录音Blob转换为文件对象
            const audioFile = new File([audioBlob], 'recording.wav', { type: 'audio/wav' });
            
            // 将图片转换为文件
            let avatarFile = null;
            if (!modelPreview.src.includes('model-preview.png')) {
                // 仅当用户上传了图片时才处理
                avatarFile = await fetch(modelPreview.src)
                    .then(r => r.blob())
                    .then(blob => new File([blob], 'avatar.jpg', { type: 'image/jpeg' }));
            }
            
            // 准备上传参数
            const uploadParams = {
                title: modelName,
                preview: modelDesc,
                voiceFile: audioFile,
                avatar: avatarFile,
                isPublic: isPublic,
                language: 'zh'
            };
            
            completeSubmitBtn.disabled = true;
            completeSubmitBtn.textContent = '上传中...';
            
            // 调用API上传
            const result = await uploadVoiceSample(uploadParams);
            console.log('上传成功:', result);
            
            // 添加新的声音条目
            const voiceItems = document.querySelector('.voice-items');
            const noVoiceTip = voiceItems.querySelector('.no-voice-tip');
            if (noVoiceTip) {
                noVoiceTip.remove();
            }

            const currentDate = new Date();
            const dateStr = `${currentDate.getFullYear()}/${(currentDate.getMonth() + 1).toString().padStart(2, '0')}/${currentDate.getDate().toString().padStart(2, '0')}`;

            const newVoiceItem = document.createElement('div');
            newVoiceItem.className = 'voice-item';
            newVoiceItem.innerHTML = `
                <div class="voice-avatar">
                    <img src="${modelPreview.src}" alt="模型头像">
                </div>
                <div class="voice-info">
                    <h3>${modelName}</h3>
                    <p class="voice-desc">${modelDesc || '暂无描述文本'}</p>
                    <div class="date-wrapper">
                        <img src="assets/icons/time-icon.png" alt="时间" class="time-icon">
                        <span class="date">${dateStr}</span>
                    </div>
                </div>
                <button class="delete-btn" onclick="showDeleteDialog(this)" data-voice-id="${result.id}">
                    <img src="assets/icons/delete-icon.png" alt="删除" class="delete-icon">
                </button>
            `;

            voiceItems.insertBefore(newVoiceItem, voiceItems.firstChild);

            // 显示提交成功提示
            showToast('提交成功');

            // 清空模型详情
            modelPreview.src = 'assets/images/model-preview.png';
            document.querySelector('.model-name').value = '';
            document.querySelector('.model-description').value = '';
            document.querySelector('.image-upload').classList.remove('has-image');

            // 返回上传界面
            const recordComplete = document.querySelector('.record-complete');
            const uploadDefault = document.querySelector('.upload-default');
            recordComplete.style.display = 'none';
            uploadDefault.style.display = 'block';

            // 重置录音界面状态
            const startRecordBtn = document.querySelector('.record-interface .start-record-btn');
            startRecordBtn.classList.remove('recording');
            startRecordBtn.textContent = '开始录制';
            const recordTitle = document.querySelector('.record-title');
            recordTitle.textContent = '请录制30秒左右的音频';
            document.querySelector('.record-tip-default').style.display = 'block';
            document.querySelector('.record-tip-recording').style.display = 'none';
            clearInterval(window.recordTimer);

            // 清空已录制的音频
            const recordedAudioElement = ensureAudioElement();
            recordedAudioElement.src = '';
            
            // 清空录音数据
            audioBlob = null;
            audioChunks = [];
        } catch (error) {
            console.error('上传失败:', error);
            const errorMessage = error.message || (typeof error === 'object' ? JSON.stringify(error) : String(error));
            showToast('上传失败: ' + errorMessage);
        } finally {
            completeSubmitBtn.disabled = false;
            completeSubmitBtn.textContent = '提 交';
        }
    });

    // 公开/私有按钮切换
    const visibilityBtns = document.querySelectorAll('.visibility-toggle button');
    visibilityBtns.forEach(btn => {
        btn.addEventListener('click', function () {
            visibilityBtns.forEach(b => b.classList.remove('active'));
            this.classList.add('active');
        });
    });

    // 图片上传功能
    const imageUpload = document.querySelector('.image-upload');
    const fileInput = imageUpload.querySelector('.file-input');
    const previewImage = imageUpload.querySelector('.preview-image');

    imageUpload.addEventListener('click', function () {
        fileInput.click();
    });

    fileInput.addEventListener('change', function () {
        const file = this.files[0];
        if (file) {
            // 检查文件类型
            if (!file.type.startsWith('image/')) {
                showToast('请选择图片文件');
                return;
            }

            // 创建预览
            const reader = new FileReader();
            reader.onload = function (e) {
                previewImage.src = e.target.result;
                imageUpload.classList.add('has-image');
            };
            reader.readAsDataURL(file);
        }
    });

    // 添加拖拽事件监听
    imageUpload.addEventListener('dragover', function(e) {
        e.preventDefault();
        e.stopPropagation();
        this.classList.add('dragging');
    });

    imageUpload.addEventListener('dragleave', function(e) {
        e.preventDefault();
        e.stopPropagation();
        this.classList.remove('dragging');
    });

    imageUpload.addEventListener('drop', function(e) {
        e.preventDefault();
        e.stopPropagation();
        this.classList.remove('dragging');

        const file = e.dataTransfer.files[0];
        if (file) {
            // 检查文件类型
            if (!file.type.startsWith('image/')) {
                showToast('请选择图片文件');
                return;
            }

            // 创建预览
            const reader = new FileReader();
            reader.onload = function(e) {
                previewImage.src = e.target.result;
                imageUpload.classList.add('has-image');
            };
            reader.readAsDataURL(file);
        }
    });

    // 音频上传功能
    const uploadBox = document.querySelector('.upload-box');
    const audioFileInput = uploadBox.querySelector('.file-input');
    
    // 设置accept属性以同时接受MP3和WAV文件
    audioFileInput.setAttribute('accept', 'audio/mpeg, audio/mp3, audio/wav');
    
    const uploadIcon = uploadBox.querySelector('i');
    const uploadTitle = uploadBox.querySelector('h3');
    const uploadTip = uploadBox.querySelector('p');
    const uploadSubmitBtn = document.querySelector('.upload-default .submit-btn');
    let hasUploadedAudio = false;  // 添加标记，记录是否已上传音频

    uploadBox.addEventListener('click', function () {
        audioFileInput.click();
    });

    audioFileInput.addEventListener('change', function () {
        const file = this.files[0];
        if (!file) return;

        // 检查文件类型
        if (!file.type.includes('audio/mpeg') && !file.type.includes('audio/mp3') && !file.type.includes('audio/wav')) {
            showToast('请选择 MP3 或 WAV 格式的音频文件');
            return;
        }

        // 检查文件大小（50MB = 50 * 1024 * 1024 字节）
        if (file.size > 50 * 1024 * 1024) {
            showToast('文件大小不能超过 50MB');
            return;
        }

        // 更新上传框显示
        uploadIcon.style.display = 'none';
        uploadTitle.textContent = file.name;
        uploadTip.style.display = 'none';
        uploadBox.classList.add('has-file');
        hasUploadedAudio = true;  // 标记已上传音频

        // 检查音频时长
        const audioElement = new Audio();
        audioElement.addEventListener('loadedmetadata', function () {
            const duration = audioElement.duration;
            if (duration < 10 || duration > 45) {
                showToast(duration < 10 ? '音频时长未达10秒' : '音频时长超过45秒');
                audioFileInput.value = '';
                // 恢复上传框默认显示
                uploadIcon.style.display = 'block';
                uploadTitle.textContent = '上传音频文件';
                uploadTip.style.display = 'block';
                uploadBox.classList.remove('has-file');
                hasUploadedAudio = false;  // 重置标记
                return;
            }
        });

        // 处理加载失败的情况
        audioElement.addEventListener('error', function () {
            showToast('音频文件加载失败，请重试');
            audioFileInput.value = '';
            // 恢复上传框默认显示
            uploadIcon.style.display = 'block';
            uploadTitle.textContent = '上传音频文件';
            uploadTip.style.display = 'block';
            uploadBox.classList.remove('has-file');
            hasUploadedAudio = false;  // 重置标记
        });

        // 加载音频文件
        audioElement.src = URL.createObjectURL(file);
    });

    // 添加拖拽事件监听
    uploadBox.addEventListener('dragover', function(e) {
        e.preventDefault();
        e.stopPropagation();
        this.classList.add('dragging');
    });

    uploadBox.addEventListener('dragleave', function(e) {
        e.preventDefault();
        e.stopPropagation();
        this.classList.remove('dragging');
    });

    uploadBox.addEventListener('drop', function(e) {
        e.preventDefault();
        e.stopPropagation();
        this.classList.remove('dragging');

        const file = e.dataTransfer.files[0];
        if (file) {
            // 检查文件类型
            if (!file.type.includes('audio/mpeg') && !file.type.includes('audio/mp3') && !file.type.includes('audio/wav')) {
                showToast('请选择 MP3 或 WAV 格式的音频文件');
                return;
            }

            // 检查文件大小
            if (file.size > 50 * 1024 * 1024) {
                showToast('文件大小不能超过 50MB');
                return;
            }

            // 更新上传框显示
            uploadIcon.style.display = 'none';
            uploadTitle.textContent = file.name;
            uploadTip.style.display = 'none';
            uploadBox.classList.add('has-file');
            hasUploadedAudio = true;

            // 检查音频时长
            const droppedAudio = new Audio();
            droppedAudio.addEventListener('loadedmetadata', function() {
                const duration = droppedAudio.duration;
                if (duration < 10 || duration > 45) {
                    showToast(duration < 10 ? '音频时长未达10秒' : '音频时长已达45秒');
                    // 恢复上传框默认显示
                    uploadIcon.style.display = 'block';
                    uploadTitle.textContent = '上传音频文件';
                    uploadTip.style.display = 'block';
                    uploadBox.classList.remove('has-file');
                    hasUploadedAudio = false;
                    return;
                }
            });

            droppedAudio.addEventListener('error', function() {
                showToast('音频文件加载失败，请重试');
                // 恢复上传框默认显示
                uploadIcon.style.display = 'block';
                uploadTitle.textContent = '上传音频文件';
                uploadTip.style.display = 'block';
                uploadBox.classList.remove('has-file');
                hasUploadedAudio = false;
            });

            droppedAudio.src = URL.createObjectURL(file);
        }
    });

    // 音频上传的提交按钮点击事件
    uploadSubmitBtn.addEventListener('click', async function () {
        // 首先检查用户是否已登录
        const userJson = localStorage.getItem('currentUser');
        const currentUser = userJson ? JSON.parse(userJson) : null;
        if (!currentUser || !currentUser.token) {
            showToast('请先登录后再上传声音样本');
            return;
        }

        // 检查是否已上传音频文件
        if (!hasUploadedAudio) {
            showToast('请上传音频文件');
            return;
        }

        // 检查模型照片
        const modelPreview = document.querySelector('.preview-image');
        if (modelPreview.src.includes('model-preview.png')) {
            showToast('未上传模型照片');
            return;
        }

        // 检查模型名称
        const modelName = document.querySelector('.model-name').value.trim();
        if (!modelName) {
            showToast('未填写模型昵称');
            return;
        }

        // 获取描述文本
        const modelDesc = document.querySelector('.model-description').value.trim();
        
        // 获取公开/私有设置
        const isPublic = document.querySelector('.btn-public').classList.contains('active');
        
        try {
            // 获取上传的音频文件
            const audioFile = audioFileInput.files[0];
            if (!audioFile) {
                showToast('请选择音频文件');
                return;
            }
            
            // 将图片转换为文件
            let avatarFile = null;
            if (!modelPreview.src.includes('model-preview.png')) {
                // 如果是dataURL格式，需要转换为文件
                if (modelPreview.src.startsWith('data:')) {
                    avatarFile = await fetch(modelPreview.src)
                        .then(r => r.blob())
                        .then(blob => new File([blob], 'avatar.jpg', { type: 'image/jpeg' }));
                } else if (fileInput.files && fileInput.files[0]) {
                    // 如果已有文件，直接使用
                    avatarFile = fileInput.files[0];
                }
            }
            
            // 准备上传参数
            const uploadParams = {
                title: modelName,
                preview: modelDesc,
                voiceFile: audioFile,
                avatar: avatarFile,
                isPublic: isPublic,
                language: 'zh'
            };
            
            uploadSubmitBtn.disabled = true;
            uploadSubmitBtn.textContent = '上传中...';
            
            // 调用API上传
            const result = await uploadVoiceSample(uploadParams);
            console.log('上传成功:', result);
            
            // 添加新的声音条目
            const voiceItems = document.querySelector('.voice-items');
            const noVoiceTip = voiceItems.querySelector('.no-voice-tip');
            if (noVoiceTip) {
                noVoiceTip.remove();
            }

            const currentDate = new Date();
            const dateStr = `${currentDate.getFullYear()}/${(currentDate.getMonth() + 1).toString().padStart(2, '0')}/${currentDate.getDate().toString().padStart(2, '0')}`;

            const newVoiceItem = document.createElement('div');
            newVoiceItem.className = 'voice-item';
            newVoiceItem.innerHTML = `
                <div class="voice-avatar">
                    <img src="${modelPreview.src}" alt="模型头像">
                </div>
                <div class="voice-info">
                    <h3>${modelName}</h3>
                    <p class="voice-desc">${modelDesc || '暂无描述文本'}</p>
                    <div class="date-wrapper">
                        <img src="assets/icons/time-icon.png" alt="时间" class="time-icon">
                        <span class="date">${dateStr}</span>
                    </div>
                </div>
                <button class="delete-btn" onclick="showDeleteDialog(this)" data-voice-id="${result.id}">
                    <img src="assets/icons/delete-icon.png" alt="删除" class="delete-icon">
                </button>
            `;

            voiceItems.insertBefore(newVoiceItem, voiceItems.firstChild);

            // 显示提交成功提示
            showToast('提交成功');
            
            // 清空所有输入
            modelPreview.src = 'assets/images/model-preview.png';
            document.querySelector('.model-name').value = '';
            document.querySelector('.model-description').value = '';
            document.querySelector('.image-upload').classList.remove('has-image');
            uploadIcon.style.display = 'block';
            uploadTitle.textContent = '上传音频文件';
            uploadTip.style.display = 'block';
            uploadBox.classList.remove('has-file');
            audioFileInput.value = '';
            hasUploadedAudio = false;
            
        } catch (error) {
            console.error('上传失败:', error);
            const errorMessage = error.message || (typeof error === 'object' ? JSON.stringify(error) : String(error));
            showToast('上传失败: ' + errorMessage);
        } finally {
            uploadSubmitBtn.disabled = false;
            uploadSubmitBtn.textContent = '提 交';
        }
    });

    // 录音功能
    const recordBox = document.querySelector('.record-box');
    const uploadDefault = document.querySelector('.upload-default');
    const recordInterface = document.querySelector('.record-interface');
    const recordComplete = document.querySelector('.record-complete');
    const backBtn = document.querySelector('.record-interface .back-btn');
    const startRecordBtn = document.querySelector('.record-interface .start-record-btn');
    const recordTitle = document.querySelector('.record-title');
    const recordTipDefault = document.querySelector('.record-tip-default');
    const recordTipRecording = document.querySelector('.record-tip-recording');
    let startTime;
    let recordTimer;

    // 录音完成界面的重置按钮点击事件
    document.querySelector('.record-complete .reset-btn').addEventListener('click', function() {
        // 返回上传音频界面
        recordComplete.style.display = 'none';
        uploadDefault.style.display = 'block';
        recordInterface.style.display = 'none';

        // 重置录音状态
        startRecordBtn.classList.remove('recording');
        startRecordBtn.textContent = '开始录制';
        recordTitle.textContent = '请录制30秒左右的音频';
        recordTipDefault.style.display = 'block';
        recordTipRecording.style.display = 'none';
        clearInterval(recordTimer);
        
        // 清空录音数据
        audioBlob = null;
        audioChunks = [];
        const recordedAudioElement = ensureAudioElement();
        recordedAudioElement.src = '';
    });

    // 录音完成界面的返回按钮点击事件
    document.querySelector('.record-complete .back-btn').addEventListener('click', function() {
        // 返回录音界面
        recordComplete.style.display = 'none';
        recordInterface.style.display = 'flex';
        uploadDefault.style.display = 'none';

        // 重置为开始录制状态
        startRecordBtn.classList.remove('recording');
        startRecordBtn.textContent = '开始录制';
        recordTitle.textContent = '00:000';  // 计时器归零
        recordTipDefault.style.display = 'block';
        recordTipRecording.style.display = 'none';
    });

    recordBox.addEventListener('click', function () {
        uploadDefault.style.display = 'none';
        recordInterface.style.display = 'flex';
    });

    // 返回按钮点击事件
    backBtn.addEventListener('click', function () {
        recordInterface.style.display = 'none';
        uploadDefault.style.display = 'block';
        // 重置录音状态
        startRecordBtn.classList.remove('recording');
        startRecordBtn.textContent = '开始录制';
        recordTitle.textContent = '请录制30秒左右的音频';
        clearInterval(recordTimer);
    });

    // 开始录制按钮点击事件
    startRecordBtn.addEventListener('click', async function () {
        const recordTitle = document.querySelector('.record-title');

        if (!this.classList.contains('recording')) {
            // 开始录制
            const started = await startRecording();
            if (!started) return; // 如果录音启动失败，直接返回
            
            this.classList.add('recording');
            this.textContent = '停止录制';
            recordTitle.textContent = '00:000';
            recordTipDefault.style.display = 'none';
            recordTipRecording.style.display = 'block';

            startTime = Date.now();
            // 开始计时
            recordTimer = setInterval(() => {
                const elapsedTime = Date.now() - startTime;
                const seconds = elapsedTime / 1000;
                const wholeSeconds = Math.floor(seconds);
                const milliseconds = Math.floor((elapsedTime % 1000));
                recordTitle.textContent = `${wholeSeconds.toString().padStart(2, '0')}:${milliseconds.toString().padStart(3, '0')}`;

                // 检查是否超过45秒
                if (seconds >= 45) {
                    showToast('录制时长已达45秒');
                    stopRecording();
                    stopRecordingUI(seconds);
                }
            }, 10);
        } else {
            // 停止录制
            const elapsedTime = Date.now() - startTime;
            const seconds = elapsedTime / 1000;
            if (seconds < 10) {
                showToast('录制时长未达10秒');
                return;
            }

            stopRecording();
            stopRecordingUI(seconds);
        }
    });

    // 封装停止录制的UI部分
    function stopRecordingUI(duration) {
        clearInterval(recordTimer);
        const recordDuration = recordComplete.querySelector('.record-duration');
        
        // 更新录音时长显示
        const wholeSeconds = Math.floor(duration);
        const milliseconds = Math.floor((duration % 1) * 1000);
        recordDuration.textContent = `${wholeSeconds.toString().padStart(2, '0')}:${milliseconds.toString().padStart(3, '0')}`;

        recordInterface.style.display = 'none';
        uploadDefault.style.display = 'none';
        recordComplete.style.display = 'flex';
    }

    // 删除声音条目
    const deleteButtons = document.querySelectorAll('.delete-btn');
    deleteButtons.forEach(btn => {
        btn.addEventListener('click', () => showDeleteDialog(btn));
    });
});

let currentDeleteBtn = null;

// 显示删除确认弹窗
function showDeleteDialog(btn) {
    currentDeleteBtn = btn;
    const overlay = document.getElementById('deleteOverlay');
    overlay.classList.add('show');
}

// 隐藏删除确认弹窗
function hideDeleteDialog() {
    const overlay = document.getElementById('deleteOverlay');
    overlay.classList.remove('show');
    currentDeleteBtn = null;
}

// 确认删除
function confirmDelete() {
    if (currentDeleteBtn) {
        const voiceId = currentDeleteBtn.getAttribute('data-voice-id');
        if (voiceId) {
            // 调用API删除声音样本
            deleteVoiceSample(voiceId).then(success => {
                if (success) {
                    // 获取要删除的声音条目
                    const voiceItem = currentDeleteBtn.closest('.voice-item');
                    // 删除该条目
                    voiceItem.remove();

                    // 检查是否已删除所有声音条目
                    const voiceItems = document.querySelector('.voice-items');
                    if (!voiceItems.children.length) {
                        // 添加提示文本
                        const noVoiceTip = document.createElement('p');
                        noVoiceTip.className = 'no-voice-tip';
                        noVoiceTip.textContent = '暂无我的声音';
                        voiceItems.appendChild(noVoiceTip);
                    }
                    
                    showToast('删除成功');
                }
            });
        }
    }
    hideDeleteDialog();
}

// 修改播放按钮的处理函数
function handlePlayClick(btn) {
    const img = btn.querySelector('img');
    const audioPlayer = ensureAudioElement();
    
    if (!audioPlayer.src) {
        showToast('无可播放的录音');
        return;
    }
    
    if (audioPlayer.paused) {
        audioPlayer.play();
        img.src = 'assets/icons/pause.png';
    } else {
        audioPlayer.pause();
        img.src = 'assets/icons/play.png';
    }

    // 添加音频播放结束事件监听
    audioPlayer.addEventListener('ended', function() {
        img.src = 'assets/icons/play.png';
    });
}

// 添加窗口resize监听
let resizeTimer;
window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
        // 动态调整布局
        const container = document.querySelector('.scroll-container');
        if (window.innerWidth < 768) {
            container.classList.add('mobile-view');
        } else {
            container.classList.remove('mobile-view');
        }
    }, 100);
});

// 初始化检查
window.dispatchEvent(new Event('resize'));
