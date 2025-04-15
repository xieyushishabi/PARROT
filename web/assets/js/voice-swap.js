/**
 * 声音置换页面的JavaScript文件
 * 实现文件上传、媒体播放、声音选择、字幕提取和声音置换功能
 */

document.addEventListener('DOMContentLoaded', function() {
    // 初始化页面元素
    initializeElements();
    // 加载声音列表
    loadVoices();
    // 设置事件监听
    setupEventListeners();
});

// 全局变量
let uploadedFile = null;
let mediaType = null;
let mediaBlob = null;
let selectedVoice = null;
let extractedSubtitles = null;
let processingTimeout = null;

// 初始化页面元素引用
function initializeElements() {
    // 上传区域元素
    window.uploadArea = document.getElementById('uploadArea');
    window.uploadFileInput = document.getElementById('uploadFile');
    window.filePreview = document.getElementById('filePreview');
    window.fileName = document.getElementById('fileName');
    window.fileSize = document.getElementById('fileSize');
    window.fileType = document.getElementById('fileType');
    window.fileTypeIcon = document.getElementById('fileTypeIcon');
    window.deleteFileBtn = document.getElementById('deleteFile');
    
    // 媒体播放器元素
    window.mediaPlayer = document.getElementById('mediaPlayer');
    window.videoPlayer = document.getElementById('videoPlayer');
    window.audioPlayer = document.getElementById('audioPlayer');
    
    // 声音选择元素
    window.voiceGrid = document.getElementById('voiceGrid');
    window.processBtn = document.getElementById('processBtn');
    
    // 字幕区域元素
    window.subtitleSection = document.getElementById('subtitleSection');
    window.subtitleBox = document.getElementById('subtitleBox');
    
    // 结果区域元素
    window.resultSection = document.getElementById('resultSection');
    window.resultPlayer = document.getElementById('resultPlayer');
    window.downloadBtn = document.getElementById('downloadBtn');
    window.shareBtn = document.getElementById('shareBtn');
    
    // 处理中弹窗元素
    window.processingOverlay = document.getElementById('processingOverlay');
}

// 设置事件监听
function setupEventListeners() {
    // 上传按钮点击事件
    const uploadButton = uploadArea.querySelector('.upload-btn');
    uploadButton.addEventListener('click', function() {
        uploadFileInput.click();
    });
    
    // 文件选择事件
    uploadFileInput.addEventListener('change', handleFileSelect);
    
    // 点击上传区域触发文件选择
    uploadArea.addEventListener('click', function(e) {
        // 避免重复触发按钮的点击事件
        if (e.target !== uploadButton && e.target.parentElement !== uploadButton) {
            uploadFileInput.click();
        }
    });
    
    // 拖拽文件相关事件
    uploadArea.addEventListener('dragover', handleDragOver);
    uploadArea.addEventListener('dragleave', handleDragLeave);
    uploadArea.addEventListener('drop', handleFileDrop);
    
    // 删除文件按钮事件
    deleteFileBtn.addEventListener('click', handleFileDelete);
    
    // 处理按钮事件
    processBtn.addEventListener('click', startProcessing);
    
    // 下载按钮事件
    downloadBtn.addEventListener('click', downloadResult);
    
    // 分享按钮事件
    shareBtn.addEventListener('click', shareResult);
}

// 处理文件选择
function handleFileSelect(e) {
    const file = e.target.files[0];
    if (file) {
        processFile(file);
    }
}

// 处理拖拽经过
function handleDragOver(e) {
    e.preventDefault();
    e.stopPropagation();
    uploadArea.classList.add('drag-over');
}

// 处理拖拽离开
function handleDragLeave(e) {
    e.preventDefault();
    e.stopPropagation();
    uploadArea.classList.remove('drag-over');
}

// 处理文件放置
function handleFileDrop(e) {
    e.preventDefault();
    e.stopPropagation();
    uploadArea.classList.remove('drag-over');
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        const file = e.dataTransfer.files[0];
        processFile(file);
    }
}

// 处理文件删除
function handleFileDelete() {
    // 重置状态
    uploadedFile = null;
    mediaType = null;
    mediaBlob = null;
    uploadFileInput.value = '';
    
    // 隐藏元素
    filePreview.classList.remove('show');
    mediaPlayer.classList.remove('show');
    subtitleSection.classList.remove('show');
    processBtn.disabled = true;
    
    // 停止视频/音频播放
    videoPlayer.pause();
    audioPlayer.pause();
    
    // 清除视频/音频源
    videoPlayer.src = '';
    audioPlayer.src = '';
    
    // 重置显示状态
    videoPlayer.style.display = 'none';
    audioPlayer.style.display = 'none';
}

// 处理文件
function processFile(file) {
    // 检查文件大小（最大100MB）
    const maxSize = 100 * 1024 * 1024; // 100MB
    if (file.size > maxSize) {
        alert('文件过大，请选择小于100MB的文件');
        return;
    }
    
    // 检查文件类型
    const fileExtension = file.name.split('.').pop().toLowerCase();
    const videoTypes = ['mp4', 'avi', 'mov', 'wmv', 'flv', 'webm'];
    const audioTypes = ['mp3', 'wav', 'ogg', 'aac', 'flac'];
    
    if (videoTypes.includes(fileExtension)) {
        mediaType = 'video';
        fileTypeIcon.textContent = '视频';
    } else if (audioTypes.includes(fileExtension)) {
        mediaType = 'audio';
        fileTypeIcon.textContent = '音频';
    } else {
        alert('不支持的文件类型，请选择音频或视频文件');
        return;
    }
    
    // 保存文件引用
    uploadedFile = file;
    
    // 更新文件预览信息
    fileName.textContent = file.name;
    fileSize.textContent = formatFileSize(file.size);
    fileType.textContent = mediaType === 'video' ? '视频文件' : '音频文件';
    filePreview.classList.add('show');
    
    // 创建文件URL并更新播放器
    mediaBlob = URL.createObjectURL(file);
    
    if (mediaType === 'video') {
        videoPlayer.style.display = 'block';
        audioPlayer.style.display = 'none';
        videoPlayer.src = mediaBlob;
    } else {
        videoPlayer.style.display = 'none';
        audioPlayer.style.display = 'block';
        audioPlayer.src = mediaBlob;
    }
    
    mediaPlayer.classList.add('show');
    
    // 模拟提取字幕（实际项目中应该调用API）
    extractSubtitles(file);
    
    // 启用处理按钮（需要选择声音后才可点击）
    if (selectedVoice) {
        processBtn.disabled = false;
    }
}

// 格式化文件大小
function formatFileSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    else if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    else return (bytes / 1048576).toFixed(1) + ' MB';
}

// 模拟提取字幕
function extractSubtitles(file) {
    // 显示加载状态
    subtitleBox.innerHTML = '正在识别语音并提取字幕，请稍候...';
    subtitleSection.classList.add('show');
    
    // 模拟API调用延迟
    setTimeout(() => {
        // 模拟字幕数据（实际应通过API获取）
        const subtitleData = [
            { text: '大家好，欢迎来到鹦音坊AI语音平台。' }
        ];
        
        // 保存字幕数据
        extractedSubtitles = subtitleData;
        
        // 构建字幕显示HTML，去掉时间戳
        let subtitlesHtml = '';
        subtitleData.forEach(sub => {
            subtitlesHtml += `<p>${sub.text}</p>`;
        });
        
        // 更新字幕显示
        subtitleBox.innerHTML = subtitlesHtml;
        
    }, 2000); // 模拟2秒的处理时间
}

// 加载可选声音
function loadVoices() {
    // 模拟声音数据，实际项目中应从API获取
    const voiceData = [
        {
            id: 'voice1',
            name: '男声-标准',
avatar: 'assets/images/avatar-6.png',
            tags: ['男声', '标准'],
            description: '标准男声，专业播音腔，适合正式场合'
        },
        {
            id: 'voice2',
            name: '女声-温柔',
avatar: 'assets/images/avatar-3.png',
            tags: ['女声', '温柔'],
            description: '温柔女声，亲切自然，适合讲解和叙事'
        },
        {
            id: 'voice3',
            name: '男声-磁性',
            tags: ['男声', '磁性'],
            description: '磁性男声，低沉有力，适合解说和广告'
        },
        {
            id: 'voice4',
            name: '女声-活泼',
            tags: ['女声', '活泼'],
            description: '活泼女声，青春洋溢，适合年轻化内容'
        },
        {
            id: 'voice5',
            name: '男声-英语',
            tags: ['男声', '英语'],
            description: '英语男声，标准发音，适合英语教学'
        },
        {
            id: 'voice6',
            name: '女声-英语',
            tags: ['女声', '英语'],
            description: '英语女声，清晰流畅，适合英语解说'
        }
    ];
    
    // 构建声音卡片
    let voiceCardsHtml = '';
    voiceData.forEach(voice => {
        const tagsHtml = voice.tags.map(tag => `<span class="voice-tag">${tag}</span>`).join('');
        
        voiceCardsHtml += `
            <div class="voice-card" data-voice-id="${voice.id}" onclick="selectVoiceCard(this)">
                <div class="voice-card-header">
                    <img src="${voice.avatar}" class="voice-avatar" alt="${voice.name}">
                    <h3 class="voice-name">${voice.name}</h3>
                </div>
                <div class="voice-tags">
                    ${tagsHtml}
                </div>
                <p class="voice-description">${voice.description}</p>
            </div>
        `;
    });
    
    // 更新声音网格
    voiceGrid.innerHTML = voiceCardsHtml;
}

// 选择声音卡片
window.selectVoiceCard = function(element) {
    // 移除所有声音卡片的选中状态
    const allCards = document.querySelectorAll('.voice-card');
    allCards.forEach(card => card.classList.remove('selected'));
    
    // 添加选中状态到当前卡片
    element.classList.add('selected');
    
    // 保存选中的声音ID
    selectedVoice = element.getAttribute('data-voice-id');
    
    // 如果已上传文件，启用处理按钮
    if (uploadedFile) {
        processBtn.disabled = false;
    }
};

// 开始处理声音置换
function startProcessing() {
    // 检查必要条件
    if (!uploadedFile || !selectedVoice) {
        alert('请上传媒体文件并选择一个声音');
        return;
    }
    
    // 显示处理中状态
    processingOverlay.classList.add('show');
    
    // 模拟处理过程（实际项目中应调用API）
    processingTimeout = setTimeout(() => {
        // 隐藏处理中状态
        processingOverlay.classList.remove('show');
        
        // 显示处理结果
        showProcessResult();
    }, 5000); // 模拟5秒的处理时间
}

// 显示处理结果
function showProcessResult() {
    // 在实际项目中，这里应该接收API返回的处理结果
    // 这里我们使用原始媒体作为模拟结果
    
    // 设置结果播放器
    if (mediaType === 'video') {
        resultPlayer.src = mediaBlob;
    } else {
        // 如果是音频，我们需要创建一个带有静态图像的视频
        resultPlayer.src = mediaBlob;
        // 实际中，可能需要转换为视频或使用自定义音频播放器
    }
    
    // 显示结果区域
    resultSection.classList.add('show');
    
    // 滚动到结果区域
    resultSection.scrollIntoView({ behavior: 'smooth' });
}

// 下载处理结果
function downloadResult() {
    // 创建下载链接（实际项目中应有真实的处理结果文件）
    const a = document.createElement('a');
    a.href = mediaBlob;
    a.download = `置换后的-${uploadedFile.name}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
}

// 分享处理结果
function shareResult() {
    // 示例实现，实际项目中可能需要集成社交分享或生成分享链接
    if (navigator.share) {
        navigator.share({
            title: '我通过鹦音坊创建的声音置换',
            text: '快来听听我用AI声音置换的媒体！',
            // url: 实际分享URL
        })
        .then(() => console.log('分享成功'))
        .catch(error => console.log('分享失败', error));
    } else {
        // 如果浏览器不支持原生分享
        alert('分享链接已复制到剪贴板，您可以粘贴给朋友！');
    }
}