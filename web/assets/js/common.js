// 通用功能
document.addEventListener('DOMContentLoaded', function() {
    // 导航栏交互
    const navItems = document.querySelectorAll('.nav-item a');
    if (navItems && navItems.length > 0) {
        navItems.forEach(item => {
            item.addEventListener('click', function(e) {
                navItems.forEach(i => i.classList.remove('active'));
                this.classList.add('active');
            });
        });
    }

    // 切换到注册视图
    const switchToRegisterBtn = document.querySelector('.switch-to-register');
    if (switchToRegisterBtn) {
        switchToRegisterBtn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation(); // 阻止事件冒泡
            const loginView = document.querySelector('.login-view');
            const registerView = document.querySelector('.register-view');
            if (loginView) loginView.style.display = 'none';
            if (registerView) registerView.style.display = 'block';
        });
    }

    // 切换到登录视图
    const switchToLoginBtn = document.querySelector('.switch-to-login');
    if (switchToLoginBtn) {
        switchToLoginBtn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation(); // 阻止事件冒泡
            const registerView = document.querySelector('.register-view');
            const loginView = document.querySelector('.login-view');
            if (registerView) registerView.style.display = 'none';
            if (loginView) loginView.style.display = 'block';
        });
    }

    // 登录按钮点击事件
    const loginBtn = document.querySelector('.login-btn');
    if (loginBtn) {
        loginBtn.addEventListener('click', function(e) {
            e.stopPropagation(); // 阻止事件冒泡
            // 这里添加登录逻辑
            console.log('登录按钮被点击');
        });
    }

    // 注册按钮点击事件
    const registerBtn = document.querySelector('.register-btn');
    if (registerBtn) {
        registerBtn.addEventListener('click', function(e) {
            e.stopPropagation(); // 阻止事件冒泡
            // 这里添加注册逻辑
            console.log('注册按钮被点击');
        });
    }

    // 关闭按钮点击事件
    const closeBtn = document.querySelector('.close-btn');
    if (closeBtn) {
        closeBtn.addEventListener('click', function(e) {
            e.stopPropagation(); // 阻止事件冒泡
            hideLoginModal();
        });
    }

    // 阻止登录弹窗内的点击事件冒泡
    const loginModal = document.querySelector('.login-modal');
    if (loginModal) {
        loginModal.addEventListener('click', function(e) {
            e.stopPropagation();
        });
    }
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
    if (overlay) {
        overlay.style.display = 'flex';
        // 确保显示登录视图，隐藏注册视图
        const loginView = document.querySelector('.login-view');
        const registerView = document.querySelector('.register-view');
        if (loginView) loginView.style.display = 'block';
        if (registerView) registerView.style.display = 'none';
    }
}

// 隐藏登录弹窗
function hideLoginModal() {
    const overlay = document.querySelector('.login-overlay');
    if (overlay) overlay.style.display = 'none';
}
