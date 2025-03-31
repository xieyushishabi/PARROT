document.addEventListener('DOMContentLoaded', function() {
    // 初始化登录相关的元素
    initLoginElements();

    // 初始化其他交互元素
    initTechItems();
    
    // 检查URL参数是否需要显示登录弹窗
    checkUrlForLogin();
});

// 初始化登录相关的元素
function initLoginElements() {
    // 为开始使用按钮添加点击事件
    const startBtn = document.querySelector('.start-btn');
    if (startBtn) {
        startBtn.addEventListener('click', showLoginModal);
    }

    // 为用户头像添加点击事件
    const userAvatar = document.querySelector('#userAvatar');
    if (userAvatar) {
        userAvatar.addEventListener('click', function(e) {
            e.preventDefault();
            showLoginModal();
        });
    }

    // 切换到注册视图
    const switchToRegister = document.querySelector('.switch-to-register');
    if (switchToRegister) {
        switchToRegister.addEventListener('click', function(e) {
            e.preventDefault();
            document.querySelector('.login-view').classList.remove('active');
            document.querySelector('.register-view').classList.add('active');
        });
    }

    // 切换到登录视图
    const switchToLogin = document.querySelector('.switch-to-login');
    if (switchToLogin) {
        switchToLogin.addEventListener('click', function(e) {
            e.preventDefault();
            document.querySelector('.register-view').classList.remove('active');
            document.querySelector('.login-view').classList.add('active');
        });
    }

    // 关闭按钮点击事件
    const closeBtn = document.querySelector('.close-btn');
    if (closeBtn) {
        closeBtn.addEventListener('click', hideLoginModal);
    }
}

// 初始化技术项目的交互
function initTechItems() {
    const techItems = document.querySelectorAll('.tech-item');
    
    techItems.forEach(item => {
        item.addEventListener('click', function() {
            techItems.forEach(otherItem => {
                otherItem.classList.remove('show-desc');
            });
            this.classList.add('show-desc');
        });
    });

    // 点击其他区域时隐藏所有描述
    document.addEventListener('click', function(e) {
        if (!e.target.closest('.tech-item')) {
            techItems.forEach(item => {
                item.classList.remove('show-desc');
            });
        }
    });

    // 鼠标离开技术网格区域时隐藏所有描述
    const techGrid = document.querySelector('.tech-grid-container');
    if (techGrid) {
        techGrid.addEventListener('mouseleave', function() {
            techItems.forEach(item => {
                item.classList.remove('show-desc');
            });
        });
    }
}

// 检查URL参数，如果包含login=true则显示登录弹窗
function checkUrlForLogin() {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('login') === 'true') {
        showLoginModal();
    }
}

// 显示登录弹窗
function showLoginModal() {
    const loginOverlay = document.querySelector('.login-overlay');
    if (loginOverlay) {
        loginOverlay.style.display = 'flex';
        // 默认显示登录视图
        document.querySelector('.login-view').classList.add('active');
        document.querySelector('.register-view').classList.remove('active');
    }
}

// 隐藏登录弹窗
function hideLoginModal() {
    const loginOverlay = document.querySelector('.login-overlay');
    if (loginOverlay) {
        loginOverlay.style.display = 'none';
    }
}
