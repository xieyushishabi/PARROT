document.addEventListener('DOMContentLoaded', function() {
    // 获取用户ID
    const urlParams = new URLSearchParams(window.location.search);
    const userId = urlParams.get('id');

    // 这里可以添加获取用户历史记录的逻辑
    console.log('加载用户ID:', userId, '的历史记录');
}); 