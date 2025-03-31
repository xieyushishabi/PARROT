// 通用功能
document.addEventListener('DOMContentLoaded', function() {
    // 导航栏交互
    const navItems = document.querySelectorAll('.nav-item a');
    navItems.forEach(item => {
        item.addEventListener('click', function(e) {
            navItems.forEach(i => i.classList.remove('active'));
            this.classList.add('active');
        });
    });

    // 切换到注册视图
    document.querySelector('.switch-to-register').addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation(); // 阻止事件冒泡
        document.querySelector('.login-view').style.display = 'none';
        document.querySelector('.register-view').style.display = 'block';
    });

    // 切换到登录视图
    document.querySelector('.switch-to-login').addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation(); // 阻止事件冒泡
        document.querySelector('.register-view').style.display = 'none';
        document.querySelector('.login-view').style.display = 'block';
    });

    // 登录按钮点击事件
    document.querySelector('.login-btn').addEventListener('click', function(e) {
        e.stopPropagation(); // 阻止事件冒泡
        // 这里添加登录逻辑
        console.log('登录按钮被点击');
    });

    // 注册按钮点击事件
    document.querySelector('.register-btn').addEventListener('click', function(e) {
        e.stopPropagation(); // 阻止事件冒泡
        // 这里添加注册逻辑
        console.log('注册按钮被点击');
    });

    // 关闭按钮点击事件
    document.querySelector('.close-btn').addEventListener('click', function(e) {
        e.stopPropagation(); // 阻止事件冒泡
        hideLoginModal();
    });

    // 阻止登录弹窗内的点击事件冒泡
    document.querySelector('.login-modal').addEventListener('click', function(e) {
        e.stopPropagation();
    });
});

// 检查登录状态
function checkLoginStatus() {
    // 这里可以根据实际情况检查用户是否已登录
    // 例如检查 localStorage 或 cookie 中的登录状态
    return false; // 暂时返回 false，表示未登录
}

// 显示登录弹窗
function showLoginModal() {
    const overlay = document.querySelector('.login-overlay');
    overlay.style.display = 'flex';
    // 确保显示登录视图，隐藏注册视图
    document.querySelector('.login-view').style.display = 'block';
    document.querySelector('.register-view').style.display = 'none';
}

// 隐藏登录弹窗
function hideLoginModal() {
    document.querySelector('.login-overlay').style.display = 'none';
} 