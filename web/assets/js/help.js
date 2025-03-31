document.addEventListener('DOMContentLoaded', function() {
    const sidebarBtns = document.querySelectorAll('.sidebar-btn');
    const tutorialContents = document.querySelectorAll('.tutorial-content');
    const feedbackContent = document.querySelector('.feedback-content');

    // 设置视频封面
    const videoPlaceholders = document.querySelectorAll('.video-placeholder');
    const coverPattern = [1, 1, 2, 2, 3, 3, 4, 4];  // 每个视频封面重复使用
    videoPlaceholders.forEach((placeholder, index) => {
        if (index < coverPattern.length) {
            placeholder.style.backgroundImage = `url('assets/images/videos/视频封面${coverPattern[index]}')`;
            placeholder.style.backgroundSize = 'cover';
            placeholder.style.backgroundPosition = 'center';
        }
    });

    sidebarBtns.forEach((btn, index) => {
        btn.addEventListener('click', () => {
            // 移除所有按钮的激活状态
            sidebarBtns.forEach(b => b.classList.remove('active'));
            // 添加当前按钮的激活状态
            btn.classList.add('active');

            // 处理内容显示
            if (index === sidebarBtns.length - 1) {  // 最后一个按钮（意见反馈）
                tutorialContents.forEach(content => content.classList.remove('active'));
                feedbackContent.classList.add('active');
            } else {
                feedbackContent.classList.remove('active');
                // 隐藏所有教程内容
                tutorialContents.forEach(content => content.classList.remove('active'));
                // 显示当前选中的教程内容
                tutorialContents[index].classList.add('active');
            }
        });
    });

    // 检查URL中是否有#feedback
    if (window.location.hash === '#feedback') {
        // 找到所有按钮
        const buttons = document.querySelectorAll('.sidebar-btn');
        // 移除所有按钮的active类
        buttons.forEach(btn => btn.classList.remove('active'));
        // 给意见反馈按钮添加active类
        buttons[4].classList.add('active');  // 第5个按钮是意见反馈

        // 隐藏所有内容
        document.querySelectorAll('.tutorial-content').forEach(content => {
            content.classList.remove('active');
        });
        // 显示意见反馈内容
        document.querySelector('.feedback-content').classList.add('active');
        
        // 平滑滚动到意见反馈部分
        document.getElementById('feedback').scrollIntoView({ behavior: 'smooth' });
    }
});
