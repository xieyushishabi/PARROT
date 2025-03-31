// 用户认证相关功能
class Auth {
    constructor() {
        this.baseURL = 'http://127.0.0.1:8000';
        this.users = this.loadUsers();
        this.currentUser = this.loadCurrentUser();
        this.initEventListeners();
        this.updateUIState();
        
        // 配置axios默认设置
        axios.defaults.withCredentials = true;
        axios.defaults.headers.common['Content-Type'] = 'application/json';
    }

    // 从localStorage加载当前用户
    loadCurrentUser() {
        const userJson = localStorage.getItem('currentUser');
        return userJson ? JSON.parse(userJson) : null;
    }

    // 加载用户数据
    loadUsers() {
        const usersData = localStorage.getItem('users');
        return usersData ? JSON.parse(usersData) : [];
    }

    // 保存用户数据
    saveUsers() {
        localStorage.setItem('users', JSON.stringify(this.users));
    }

    // 验证密码
    validatePassword(password) {
        if (password.length < 6) {
            throw new Error('密码不能少于6个字符');
        }
        return true;
    }
    
    // 验证邮箱
    validateEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            throw new Error('请输入有效的邮箱地址');
        }
        return true;
    }

    // 注册新用户
    async register(username, password, email) {
        try {
            // 验证密码和邮箱
            this.validatePassword(password);
            this.validateEmail(email);
            
            const userData = {
                'email':email,
                'username':username,
                'password':password
            };
            const response = await axios.post(`${this.baseURL}/api/v1/auth/register`, userData);
            // 如果请求成功但后端返回错误信息
            if (response.data && response.data.error) {
                throw new Error(response.data.error);
            }

            const newUser= response.data.user;

            this.users.push(newUser);
            this.saveUsers();
            return newUser;
        } catch (error) {
            // 处理网络错误或服务器返回的错误
            console.error('注册失败:', error);
            if (error.response?.status === 422) {
                const details = error.response.data?.detail;
                if (Array.isArray(details) && details.length > 0) {
                    throw new Error(`验证错误: ${details[0].msg}`);
                }
            }
            
            // 处理其他错误
            const errorMsg = error.response?.data?.detail?.error || 
                            error.response?.data?.message || 
                            error.message || 
                            '注册失败，请稍后再试';
            throw new Error(errorMsg);
        }
    }

    // 用户登录
    async login(username, password) {
        try {
            const loginData = {
                'username': username,
                'password': password
            };
            
            // 设置请求头
            const config = {
                headers: {
                    'Content-Type': 'application/json',
                }
            };
            
            const response = await axios.post(`${this.baseURL}/api/v1/auth/login`, loginData, config);
            
            // 检查响应状态
            if (!response.data || response.data.code !== 200) {
                throw new Error(response.data?.msg || '登录失败');
            }

            // 获取用户信息和令牌
            const userData = {
                username: username,
                token: response.data.data.access_token
            };

            // 存储用户信息
            this.currentUser = userData;
            localStorage.setItem('currentUser', JSON.stringify(userData));
            
            // 更新UI状态
            this.updateUIState();
            
            // 关闭登录弹窗
            const loginOverlay = document.querySelector('.login-overlay');
            if (loginOverlay) {
                loginOverlay.style.display = 'none';
            }
            
            return userData;
        } catch (error) {
            // 处理网络错误或服务器返回的错误
            console.error('登录失败:', error);
            
            // 处理特定状态码的错误
            if (error.response?.status === 401) {
                throw new Error('用户名或密码错误');
            }
            
            // 处理其他错误
            const errorMsg = error.response?.data?.msg || 
                           error.response?.data?.message || 
                           error.message || 
                           '登录失败，请稍后再试';
            throw new Error(errorMsg);
        }
    }

    // 用户登出
    logout() {
        this.currentUser = null;
        localStorage.removeItem('currentUser');
        this.updateUIState();
        // 如果在user.html页面，跳转到首页
        if (window.location.pathname.endsWith('user.html')) {
            window.location.href = 'index.html';
        }
    }

    // 更新UI状态
    updateUIState() {
        const userAvatar = document.querySelector('#userAvatar');
        const username = document.querySelector('#username');
        
        if (this.currentUser) {
            if (userAvatar) {
                userAvatar.querySelector('img').src = 'assets/images/avatar-default.png';
                userAvatar.href = 'user.html';
            }
            if (username) {
                username.textContent = this.currentUser.username;
            }
        } else {
            if (userAvatar) {
                userAvatar.querySelector('img').src = 'assets/images/avatar-default.png';
                userAvatar.href = '#';
            }
            if (username) {
                username.textContent = '';
            }
        }
    }

    // 初始化事件监听
    initEventListeners() {
        // 为导航栏用户头像添加点击事件
        const navUser = document.querySelector('.nav-user');
        if (navUser) {
            // 移除之前可能添加的事件监听器
            navUser.removeEventListener('click', this._handleNavUserClick);
            
            // 使用箭头函数保留this上下文
            this._handleNavUserClick = (e) => {
                e.stopPropagation();
                e.preventDefault(); // 阻止默认行为
                
                // 如果用户已登录，则跳转到用户个人信息页面
                if (this.currentUser) {
                    window.location.href = 'user.html';
                } else {
                    // 否则显示登录弹窗
                    const loginOverlay = document.querySelector('.login-overlay');
                    if (loginOverlay) {
                        loginOverlay.style.display = 'flex';
                        
                        // 确保显示登录视图，隐藏注册视图
                        const loginView = document.querySelector('.login-view');
                        const registerView = document.querySelector('.register-view');
                        
                        if (loginView && registerView) {
                            loginView.style.display = 'block';
                            registerView.style.display = 'none';
                            
                            // 支持使用classList的情况
                            loginView.classList.add('active');
                            registerView.classList.remove('active');
                        }
                    } else {
                        // 如果当前页面没有登录弹窗，则跳转到首页并打开登录弹窗
                        window.location.href = 'index.html?login=true';
                    }
                }
            };
            
            // 使用捕获阶段，确保我们的处理程序先执行
            navUser.addEventListener('click', this._handleNavUserClick, true);
        }

        // 注册表单提交
        const registerForm = document.querySelector('.register-form');
        if (registerForm) {
            registerForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const username = registerForm.querySelector('input[name="username"]').value;
                const password = registerForm.querySelector('input[name="password"]').value;
                const email = registerForm.querySelector('input[name="email"]').value;

                try {
                    // 前端验证
                    this.validatePassword(password);
                    this.validateEmail(email);
                    
                    // 等待注册API完成
                    const user = await this.register(username, password, email);
                    
                    // 只有在成功返回用户数据后才提示成功
                    alert('注册成功！');
                    
                    // 清空注册表单
                    registerForm.reset();
                    
                    // 切换到登录视图
                    document.querySelector('.register-view').classList.remove('active');
                    document.querySelector('.login-view').classList.add('active');
                } catch (error) {
                    alert(error.message);
                }
            });
        }

        // 登录表单提交
        const loginForm = document.querySelector('.login-form');
        if (loginForm) {
            loginForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const username = loginForm.querySelector('input[name="username"]').value;
                const password = loginForm.querySelector('input[name="password"]').value;

                try {
                    const user = await this.login(username, password);
                    alert('登录成功！');
                    // 关闭登录弹窗
                    document.querySelector('.login-overlay').style.display = 'none';
                    // 更新用户头像和状态
                    this.updateUserUI(user);
                    
                    // 登录成功后重定向到首页
                    window.location.href = 'index.html';
                } catch (error) {
                    alert(error.message);
                }
            });
        }

        // 切换注册/登录视图的按钮
        const switchToRegister = document.querySelector('.switch-to-register');
        const switchToLogin = document.querySelector('.switch-to-login');

        if (switchToRegister) {
            switchToRegister.addEventListener('click', () => {
                document.querySelector('.login-view').style.display = 'none';
                document.querySelector('.register-view').style.display = 'block';
            });
        }

        if (switchToLogin) {
            switchToLogin.addEventListener('click', () => {
                document.querySelector('.register-view').style.display = 'none';
                document.querySelector('.login-view').style.display = 'block';
            });
        }

        // 打开登录弹窗
        const startBtn = document.querySelector('.start-btn');
        if (startBtn) {
            startBtn.addEventListener('click', () => {
                document.querySelector('.login-overlay').style.display = 'flex';
            });
        }

        // 关闭登录弹窗
        const closeBtn = document.querySelector('.close-btn');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                document.querySelector('.login-overlay').style.display = 'none';
            });
        }
    }

    // 处理用户头像点击事件
    handleUserAvatarClick(event) {
        // 这个方法不再需要，使用_handleNavUserClick代替
    }

    // 更新用户界面
    updateUserUI(user) {
        const navUser = document.querySelector('.nav-user');
        if (navUser) {
            const avatar = navUser.querySelector('img');
            // 这里可以根据用户信息更新头像
            // avatar.src = user.avatar || 'assets/images/avatar-default.png';
        }
    }
}

// 初始化认证系统
document.addEventListener('DOMContentLoaded', () => {
    window.auth = new Auth();
});
