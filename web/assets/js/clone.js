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

document.addEventListener('DOMContentLoaded', function () {
    // 录音完成界面的提交按钮点击事件
    const completeSubmitBtn = document.querySelector('.record-complete .submit-record-btn');
    completeSubmitBtn.addEventListener('click', function() {
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
            <button class="delete-btn" onclick="showDeleteDialog(this)">
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
        const audio = document.querySelector('audio');
        if (audio) {
            audio.src = '';
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
        if (!file.type.includes('audio/mpeg') && !file.type.includes('audio/mp3')) {
            showToast('请选择 MP3 格式的音频文件');
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
        const audio = new Audio();
        audio.addEventListener('loadedmetadata', function () {
            const duration = audio.duration;
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
        audio.addEventListener('error', function () {
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
        audio.src = URL.createObjectURL(file);
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
            if (!file.type.includes('audio/mpeg') && !file.type.includes('audio/mp3')) {
                showToast('请选择 MP3 格式的音频文件');
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
            const audio = new Audio();
            audio.addEventListener('loadedmetadata', function() {
                const duration = audio.duration;
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

            audio.addEventListener('error', function() {
                showToast('音频文件加载失败，请重试');
                // 恢复上传框默认显示
                uploadIcon.style.display = 'block';
                uploadTitle.textContent = '上传音频文件';
                uploadTip.style.display = 'block';
                uploadBox.classList.remove('has-file');
                hasUploadedAudio = false;
            });

            audio.src = URL.createObjectURL(file);
        }
    });

    // 音频上传的提交按钮点击事件
    uploadSubmitBtn.addEventListener('click', function () {
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
            <button class="delete-btn" onclick="showDeleteDialog(this)">
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

    // 停止录制并显示录音完成界面
    function stopRecording(duration) {
        clearInterval(recordTimer);
        const recordDuration = recordComplete.querySelector('.record-duration');
        
        // 创建音频元素（如果不存在）
        let audio = recordComplete.querySelector('audio');
        if (!audio) {
            audio = document.createElement('audio');
            recordComplete.appendChild(audio);
            // 这里应该设置录制的音频源
            audio.src = 'path/to/recorded/audio.mp3';  // 需要替换为实际录制的音频路径
        }

        // 监听音频播放结束事件
        audio.addEventListener('ended', function() {
            const playBtn = recordComplete.querySelector('.play-btn img');
            playBtn.src = 'assets/icons/play.png';
        });

        // 更新录音时长显示
        const wholeSeconds = Math.floor(duration);
        const milliseconds = Math.floor((duration % 1) * 1000);
        recordDuration.textContent = `${wholeSeconds.toString().padStart(2, '0')}:${milliseconds.toString().padStart(3, '0')}`;

        recordInterface.style.display = 'none';
        uploadDefault.style.display = 'none';
        recordComplete.style.display = 'flex';
    }

    // 开始录制按钮点击事件
    startRecordBtn.addEventListener('click', function () {
        const recordTitle = document.querySelector('.record-title');

        if (!this.classList.contains('recording')) {
            // 开始录制
            this.classList.add('recording');
            this.textContent = '停止录制';
            recordTitle.textContent = '00:000';
            recordTipDefault.style.display = 'block';
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
                    stopRecording(seconds);
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

            stopRecording(seconds);
        }
    });

    // 重置按钮点击事件
    const resetBtn = document.querySelector('.record-interface .reset-btn');
    resetBtn.addEventListener('click', function () {
        startRecordBtn.classList.remove('recording');
        startRecordBtn.textContent = '开始录制';
        startRecordBtn.style.display = 'block';
        const recordTitle = document.querySelector('.record-title');
        recordTitle.textContent = '请录制30秒左右的音频';
        document.querySelector('.audio-wave').style.display = 'none';
        resetBtn.style.display = 'none';
        submitRecordBtn.disabled = true;
        clearInterval(recordTimer);
    });

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
    }
    hideDeleteDialog();
}

// 添加全局的音频播放处理函数
function handlePlayClick(btn) {
    const img = btn.querySelector('img');
    // 修改音频元素的查找范围，限定在录音完成界面内
    const audio = document.querySelector('.record-complete audio');
    
    if (!audio) return;
    
    if (audio.paused) {
        audio.play();
        img.src = 'assets/icons/pause.png';
    } else {
        audio.pause();
        img.src = 'assets/icons/play.png';
    }

    // 添加音频播放结束事件监听
    audio.addEventListener('ended', function() {
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
