// 音频上传功能
const uploadBox = document.querySelector('.upload-box');
const audioFileInput = uploadBox.querySelector('.file-input');
const uploadPreview = uploadBox.querySelector('.audio-preview');

uploadBox.addEventListener('click', function() {
    audioFileInput.click();
});

audioFileInput.addEventListener('change', function() {
    const file = this.files[0];
    if (!file) return;

    // 检查文件类型
    if (file.type !== 'audio/mp3') {
        alert('请选择 MP3 格式的音频文件');
        return;
    }

    // 检查文件大小（50MB = 50 * 1024 * 1024 字节）
    if (file.size > 50 * 1024 * 1024) {
        alert('文件大小不能超过 50MB');
        return;
    }

    // 成功上传后可以在这里修改预览图片
    // uploadPreview.src = '上传成功后的新图片路径';

    // 清空文件输入框，允许重复选择同一个文件
    this.value = '';
});

document.addEventListener('DOMContentLoaded', function() {
    const container = document.querySelector('.scroll-container');
    
    // 设置容器样式
    container.style.height = 'calc(100vh - 60px)';
    container.style.overflowY = 'auto';
    
    // 检查内容是否需要滚动
    function checkScroll() {
        if (container.scrollHeight > container.clientHeight) {
            container.style.overflowY = 'auto';
        } else {
            container.style.overflowY = 'hidden';
        }
    }
    
    // 页面加载和窗口大小改变时检查
    checkScroll();
    window.addEventListener('resize', checkScroll);
}); 