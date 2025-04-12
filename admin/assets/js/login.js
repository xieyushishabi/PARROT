document.addEventListener('DOMContentLoaded', function() {
    const baseURL = 'http://127.0.0.1:8000';
    const loginBtn = document.getElementById('login-btn');
    const usernameInput = document.getElementById('username');
    const passwordInput = document.getElementById('password');
    const errorMessage = document.getElementById('error-message');
    
    // 按下回车键时触发登录
    passwordInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            handleLogin();
        }
    });
    
    // 点击登录按钮时触发登录
    loginBtn.addEventListener('click', handleLogin);
    
    // 处理登录逻辑
    async function handleLogin() {
        // 清除之前的错误信息
        errorMessage.textContent = '';
        
        // 获取输入值
        const username = usernameInput.value.trim();
        const password = passwordInput.value;
        
        // 验证输入
        if (!username) {
            showError('请输入用户名');
            return;
        }
        
        if (!password) {
            showError('请输入密码');
            return;
        }
        
        // 禁用登录按钮，显示加载状态
        loginBtn.disabled = true;
        loginBtn.textContent = '登录中...';
        
        try {
            // 发送登录请求
            const response = await axios.post(`${baseURL}/api/v1/admin/login`, {
                username: username,
                password: password
            });
            
            // 检查响应状态
            if (response.data && response.data.code === 200) {
                // 登录成功，跳转到管理平台首页
                window.location.href = 'index.html';
            } else {
                // 登录失败，显示错误信息
                showError(response.data.msg || '登录失败，请检查用户名和密码');
            }
        } catch (error) {
            console.error('登录出错:', error);
            
            // 显示错误信息
            if (error.response && error.response.data) {
                showError(error.response.data.msg || error.response.data.detail || '登录失败，请检查用户名和密码');
            } else {
                showError('登录失败，请检查网络连接');
            }
        } finally {
            // 恢复登录按钮状态
            loginBtn.disabled = false;
            loginBtn.textContent = '登 录';
        }
    }
    
    // 显示错误信息
    function showError(message) {
        errorMessage.textContent = message;
        // 为错误消息添加抖动效果
        errorMessage.classList.add('shake');
        setTimeout(() => {
            errorMessage.classList.remove('shake');
        }, 500);
    }
    
    // 添加CSS样式以实现抖动效果
    const style = document.createElement('style');
    style.textContent = `
        @keyframes shake {
            0%, 100% { transform: translateX(0); }
            10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); }
            20%, 40%, 60%, 80% { transform: translateX(5px); }
        }
        .shake {
            animation: shake 0.5s;
        }
    `;
    document.head.appendChild(style);
});