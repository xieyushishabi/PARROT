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