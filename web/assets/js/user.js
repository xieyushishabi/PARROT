document.addEventListener('DOMContentLoaded', function() {
    // 初始化auth实例
    const auth = new Auth();

    // 检查登录状态
    if (!auth.currentUser) {
        window.location.href = 'index.html';
        return;
    }

    // 显示用户信息
    const usernameInput = document.getElementById('username');
    if (usernameInput) {
        usernameInput.value = auth.currentUser.username;
    }

    // 获取用户资料并填充表单
    loadUserProfile(auth);

    // 退出按钮事件
    const logoutBtn = document.querySelector('.logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            auth.logout();
        });
    }
    
    // 保存用户资料按钮事件
    const saveBtn = document.querySelector('.btn-save');
    if (saveBtn) {
        saveBtn.addEventListener('click', (e) => {
            e.preventDefault();
            saveUserProfile(auth);
        });
    }

    // 取消按钮事件
    const cancelBtn = document.querySelector('.btn-cancel');
    if (cancelBtn) {
        cancelBtn.addEventListener('click', (e) => {
            e.preventDefault();
            loadUserProfile(auth); // 重新加载用户资料
        });
    }

    // 用户中心页面特定功能

    // 菜单切换
    const menuItems = document.querySelectorAll('.menu-item');
    const infoSection = document.querySelector('.info-section');
    const passwordSection = document.querySelector('.password-section');
    const historySection = document.querySelector('.history-section');
    const interactionSection = document.querySelector('.interaction-section');
    
    menuItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            // 移除所有active类
            menuItems.forEach(i => i.classList.remove('active'));
            // 添加当前点击项的active类
            item.classList.add('active');
            
            // 根据点击的菜单项切换显示内容
            if (item.textContent.includes('历史作品')) {
                infoSection.style.display = 'none';
                passwordSection.style.display = 'none';
                historySection.style.display = 'block';
                interactionSection.style.display = 'none';
                
                // 默认选中音频标签
                const historyTabs = document.querySelectorAll('.history-section .tab-item');
                historyTabs.forEach(t => t.classList.remove('active'));
                historyTabs[0].classList.add('active');  // 选中第一个标签（音频）
                
            } else if (item.textContent.includes('账号信息')) {
                infoSection.style.display = 'block';
                passwordSection.style.display = 'block';
                historySection.style.display = 'none';
                interactionSection.style.display = 'none';
                
            } else if (item.textContent.includes('互动信息')) {
                infoSection.style.display = 'none';
                passwordSection.style.display = 'none';
                historySection.style.display = 'none';
                interactionSection.style.display = 'block';
                
                // 默认选中我收藏的声音标签
                const interactionTabs = document.querySelectorAll('.interaction-section .tab-item');
                interactionTabs.forEach(t => t.classList.remove('active'));
                interactionTabs[0].classList.add('active');  // 选中第一个标签（我收藏的声音）
                
                // 显示默认内容
                const listContainer = document.querySelector('.interaction-section .history-list');
                listContainer.className = 'history-list';
                listContainer.innerHTML = collectedItems;
            }
        });
    });

    // 头像上传预览
    const avatarPreview = document.querySelector('.avatar-preview');
    const avatarInput = document.createElement('input');
    avatarInput.type = 'file';
    avatarInput.accept = 'image/*';
    avatarInput.id = 'avatarInput'; // 添加ID以便于后续获取
    // 将文件输入框添加到DOM，但设置为隐藏
    avatarInput.style.display = 'none';
    document.body.appendChild(avatarInput);

    avatarPreview.addEventListener('click', () => {
        avatarInput.click();
    });

    avatarInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                const img = avatarPreview.querySelector('img');
                img.src = e.target.result;
            };
            reader.readAsDataURL(file);
        }
    });

    // 添加标签页切换功能
    const tabItems = document.querySelectorAll('.tab-item');
    const historyList = document.querySelector('.history-list');
    const originalItems = historyList.innerHTML; // 保存原始的10个作品

    // 创建视频作品的HTML
    const videoItems = `
        <div class="history-item">
            <div class="item-cover">
                <img src="assets/images/cover1.jpg" alt="作品封面">
                <div class="item-tag">生成副本</div>
            </div>
            <div class="item-info">
                <div class="item-title">
                    <input type="text" value="视频作品1" class="title-input">
                    <button class="btn-save-title">保存</button>
                </div>
                <div class="item-meta">2025-01-26 编辑 · 5分40秒</div>
            </div>
        </div>
        <div class="history-item">
            <div class="item-cover">
                <img src="assets/images/cover2.jpg" alt="作品封面">
                <div class="item-tag">生成副本</div>
            </div>
            <div class="item-info">
                <div class="item-title">
                    <input type="text" value="视频作品2" class="title-input">
                    <button class="btn-save-title">保存</button>
                </div>
                <div class="item-meta">2025-01-25 编辑 · 3分20秒</div>
            </div>
        </div>
        <div class="history-item">
            <div class="item-cover">
                <img src="assets/images/cover3.jpg" alt="作品封面">
                <div class="item-tag">生成副本</div>
            </div>
            <div class="item-info">
                <div class="item-title">
                    <input type="text" value="视频作品3" class="title-input">
                    <button class="btn-save-title">保存</button>
                </div>
                <div class="item-meta">2025-01-24 编辑 · 4分15秒</div>
            </div>
        </div>
    `;

    // 创建声音作品的HTML
    const voiceItems = `
        <div class="history-item">
            <div class="item-cover">
                <img src="assets/images/cover1.jpg" alt="作品封面">
                <div class="item-tag">生成副本</div>
            </div>
            <div class="item-info">
                <div class="item-title">
                    <input type="text" value="声音作品1" class="title-input">
                    <button class="btn-save-title">保存</button>
                </div>
                <div class="item-meta">2025-01-26 编辑 · 5分40秒</div>
            </div>
        </div>
        <div class="history-item">
            <div class="item-cover">
                <img src="assets/images/cover2.jpg" alt="作品封面">
                <div class="item-tag">生成副本</div>
            </div>
            <div class="item-info">
                <div class="item-title">
                    <input type="text" value="声音作品2" class="title-input">
                    <button class="btn-save-title">保存</button>
                </div>
                <div class="item-meta">2025-01-25 编辑 · 3分20秒</div>
            </div>
        </div>
    `;
    
    tabItems.forEach(tab => {
        tab.addEventListener('click', (e) => {
            e.preventDefault();
            // 移除所有标签的active类
            tabItems.forEach(t => t.classList.remove('active'));
            // 添加当前标签的active类
            tab.classList.add('active');
            
            // 根据标签切换内容
            if (tab.textContent === '视频') {
                historyList.innerHTML = videoItems;
            } else if (tab.textContent === '我的声音') {
                historyList.innerHTML = voiceItems;
            } else {
                historyList.innerHTML = originalItems;
            }
        });
    });

    // 添加互动信息标签页切换功能
    const interactionTabs = document.querySelectorAll('.interaction-section .tab-item');
    const interactionList = document.querySelector('.interaction-section .history-list');

    // 创建我收藏的声音内容（3个作品）
    const collectedItems = `
        <div class="history-item">
            <div class="item-cover">
                <img src="assets/images/cover1.jpg" alt="作品封面">
                <div class="item-tag">生成副本</div>
            </div>
            <div class="item-info">
                <div class="item-title">
                    <input type="text" value="收藏的声音1" class="title-input">
                    <button class="btn-save-title">保存</button>
                </div>
                <div class="item-meta">2025-01-26 收藏 · 5分40秒</div>
            </div>
        </div>
        <div class="history-item">
            <div class="item-cover">
                <img src="assets/images/cover2.jpg" alt="作品封面">
                <div class="item-tag">生成副本</div>
            </div>
            <div class="item-info">
                <div class="item-title">
                    <input type="text" value="收藏的声音2" class="title-input">
                    <button class="btn-save-title">保存</button>
                </div>
                <div class="item-meta">2025-01-25 收藏 · 3分20秒</div>
            </div>
        </div>
        <div class="history-item">
            <div class="item-cover">
                <img src="assets/images/cover3.jpg" alt="作品封面">
                <div class="item-tag">生成副本</div>
            </div>
            <div class="item-info">
                <div class="item-title">
                    <input type="text" value="收藏的声音3" class="title-input">
                    <button class="btn-save-title">保存</button>
                </div>
                <div class="item-meta">2025-01-24 收藏 · 4分15秒</div>
            </div>
        </div>
    `;

    // 创建我喜欢的声音内容（3个作品）
    const likedItems = `
        <div class="history-item">
            <div class="item-cover">
                <img src="assets/images/cover4.jpg" alt="作品封面">
                <div class="item-tag">生成副本</div>
            </div>
            <div class="item-info">
                <div class="item-title">
                    <input type="text" value="喜欢的声音1" class="title-input">
                    <button class="btn-save-title">保存</button>
                </div>
                <div class="item-meta">2025-01-23 点赞 · 6分50秒</div>
            </div>
        </div>
        <div class="history-item">
            <div class="item-cover">
                <img src="assets/images/cover5.jpg" alt="作品封面">
                <div class="item-tag">生成副本</div>
            </div>
            <div class="item-info">
                <div class="item-title">
                    <input type="text" value="喜欢的声音2" class="title-input">
                    <button class="btn-save-title">保存</button>
                </div>
                <div class="item-meta">2025-01-22 点赞 · 2分30秒</div>
            </div>
        </div>
        <div class="history-item">
            <div class="item-cover">
                <img src="assets/images/cover6.jpg" alt="作品封面">
                <div class="item-tag">生成副本</div>
            </div>
            <div class="item-info">
                <div class="item-title">
                    <input type="text" value="喜欢的声音3" class="title-input">
                    <button class="btn-save-title">保存</button>
                </div>
                <div class="item-meta">2025-01-21 点赞 · 7分10秒</div>
            </div>
        </div>
    `;

    // 创建谁赞过我的内容
    const likedByItems = `
        <div class="interaction-user">
            <div class="user-wrapper">
                <div class="user-avatar">
                    <img src="assets/images/avatar-default.png" alt="用户头像">
                </div>
                <div class="user-info">
                    <div class="user-name">用户名字</div>
                    <div class="like-time">2025-01-29</div>
                </div>
            </div>
            <div class="liked-content">
                <div class="liked-text">赞了你的声音</div>
                <div class="liked-image">
                    <img src="assets/images/cover1.jpg" alt="作品封面">
                </div>
            </div>
        </div>
        <div class="interaction-user">
            <div class="user-wrapper">
                <div class="user-avatar">
                    <img src="assets/images/avatar-default.png" alt="用户头像">
                </div>
                <div class="user-info">
                    <div class="user-name">用户名字</div>
                    <div class="like-time">2025-01-29</div>
                </div>
            </div>
            <div class="liked-content">
                <div class="liked-text">赞了你的声音</div>
                <div class="liked-image">
                    <img src="assets/images/cover2.jpg" alt="作品封面">
                </div>
            </div>
        </div>
    `;

    // 创建谁收藏过的内容
    const collectedByItems = `
        <div class="interaction-user">
            <div class="user-wrapper">
                <div class="user-avatar">
                    <img src="assets/images/avatar-default.png" alt="用户头像">
                </div>
                <div class="user-info">
                    <div class="user-name">用户名字</div>
                    <div class="like-time">2025-01-29</div>
                </div>
            </div>
            <div class="liked-content">
                <div class="liked-text">收藏了你的声音</div>
                <div class="liked-image">
                    <img src="assets/images/cover3.jpg" alt="作品封面">
                </div>
            </div>
        </div>
        <div class="interaction-user">
            <div class="user-wrapper">
                <div class="user-avatar">
                    <img src="assets/images/avatar-default.png" alt="用户头像">
                </div>
                <div class="user-info">
                    <div class="user-name">用户名字</div>
                    <div class="like-time">2025-01-29</div>
                </div>
            </div>
            <div class="liked-content">
                <div class="liked-text">收藏了你的声音</div>
                <div class="liked-image">
                    <img src="assets/images/cover4.jpg" alt="作品封面">
                </div>
            </div>
        </div>
    `;

    // 修改标签切换逻辑
    interactionTabs.forEach(tab => {
        tab.addEventListener('click', (e) => {
            e.preventDefault();
            interactionTabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            
            // 获取列表容器
            const listContainer = document.querySelector('.interaction-section .history-list, .interaction-section .interaction-list');
            
            if (tab.textContent === '我收藏的声音') {
                listContainer.className = 'history-list';  // 使用网格布局
                listContainer.innerHTML = collectedItems;
            } else if (tab.textContent === '我喜欢的声音') {
                listContainer.className = 'history-list';  // 使用网格布局
                listContainer.innerHTML = likedItems;
            } else if (tab.textContent === '谁赞过我') {
                listContainer.className = 'interaction-list';  // 使用列表布局
                listContainer.innerHTML = likedByItems;
            } else if (tab.textContent === '谁收藏过') {
                listContainer.className = 'interaction-list';  // 使用列表布局
                listContainer.innerHTML = collectedByItems;
            }
        });
    });

    // 修改密码按钮事件
    const changePasswordBtn = document.querySelector('.password-section .btn-confirm');
    if (changePasswordBtn) {
        changePasswordBtn.addEventListener('click', (e) => {
            e.preventDefault();
            changePassword(auth);
        });
    }
});

// 添加一个性别转换函数
function convertGender(gender, toEnglish = false) {
    if (!gender) return null;
    
    const genderMap = {
        '男': 'male',
        '女': 'female',
        '其他': 'other',
        'male': '男',
        'female': '女',
        'other': '其他'
    };
    
    return genderMap[gender] || gender;
}

// 获取用户资料函数
async function loadUserProfile(auth) {
    try {
        // 构建请求配置
        const config = {
            headers: {
                'Authorization': `Bearer ${auth.currentUser.token}`
            }
        };
        
        // 获取用户资料
        const response = await axios.get(`${auth.baseURL}/api/v1/user/profile`, config);
        console.log('用户资料:', response.data);
        if (response.data.code !== 200) {
            throw new Error(response.data.msg || '获取用户资料失败');
        }

        const userData = response.data.data;
        
        // 填充表单数据
        const phoneInput = document.querySelector('.form-group:nth-child(3) .form-input');
        const ageInput = document.querySelector('.form-group:nth-child(4) .form-input');
        const genderRadios = document.querySelectorAll('input[name="gender"]');
        
        if (phoneInput && userData.phone_number) {
            phoneInput.value = userData.phone_number;
        }
        
        if (ageInput && userData.age !== null) {
            ageInput.value = userData.age;
        }
        
        if (genderRadios.length >= 2 && userData.gender) {
            const englishGender = convertGender(userData.gender, true);
            if (englishGender === 'male') {
                genderRadios[0].checked = true;
            } else if (englishGender === 'female') {
                genderRadios[1].checked = true;
            }
        }
        
        // 更新头像
        const avatarImg = document.querySelector('.avatar-preview img');
        if (avatarImg) {
            if (userData.avatar) {
                // 直接使用返回的base64数据
                avatarImg.src = `data:image/jpeg;base64,${userData.avatar}`;
            } else {
                // 如果没有头像，显示默认头像
                avatarImg.src = "assets/images/avatar-default.png";
            }
        }
    } catch (error) {
        console.error('获取用户资料失败:', error);
        const errorMsg = error.response?.data?.msg || 
                      error.response?.data?.message || 
                      error.message || 
                      '获取用户资料失败，请稍后再试';
        alert(errorMsg);
    }
}

// 保存用户资料函数
async function saveUserProfile(auth) {
    try {
        const phoneInput = document.querySelector('.form-group:nth-child(3) .form-input');
        const ageInput = document.querySelector('.form-group:nth-child(4) .form-input');
        const genderRadios = document.querySelectorAll('input[name="gender"]');
        const avatarInput = document.getElementById('avatarInput');
        
        // 验证手机号
        if (phoneInput && phoneInput.value) {
            const phoneRegex = /^1[3-9]\d{9}$/;
            if (!phoneRegex.test(phoneInput.value)) {
                alert('请输入有效的11位手机号码！');
                return;
            }
        }
        
        // 验证年龄
        if (ageInput && ageInput.value) {
            const age = parseInt(ageInput.value);
            if (isNaN(age) || age < 0 || age > 120) {
                alert('年龄必须是0-120之间的有效数字！');
                return;
            }
        }

        // 创建FormData对象
        const formData = new FormData();
        
        // 添加表单数据
        if (phoneInput && phoneInput.value) {
            formData.append('phone_number', phoneInput.value);
        }
        
        if (ageInput && ageInput.value) {
            formData.append('age', ageInput.value);
        }
        
        // 添加性别
        if (genderRadios[0].checked) {
            formData.append('gender', 'male');
        } else if (genderRadios[1].checked) {
            formData.append('gender', 'female');
        }
        
        // 添加头像文件（如果有）
        if (avatarInput && avatarInput.files && avatarInput.files.length > 0) {
            console.log('正在上传头像文件:', avatarInput.files[0].name);
            formData.append('avatar', avatarInput.files[0]);
        }
        
        // 构建请求配置
        const config = {
            headers: {
                'Authorization': `Bearer ${auth.currentUser.token}`,
                'Content-Type': 'multipart/form-data'
            }
        };
        
        // 发送请求
        const response = await axios.post(`${auth.baseURL}/api/v1/user/profile`, formData, config);
        
        if (response.data.code !== 200) {
            throw new Error(response.data.msg || '更新用户资料失败');
        }

        // 上传成功后立即刷新头像显示
        if (avatarInput && avatarInput.files && avatarInput.files.length > 0) {
            const avatarImg = document.querySelector('.avatar-preview img');
            if (avatarImg) {
                // 使用完全不同的时间戳确保不会缓存
                const timestamp = new Date().getTime();
                avatarImg.src = `${auth.baseURL}/api/v1/user/avatar?username=${auth.currentUser.username}&t=${timestamp}`;
                
                // 打印URL用于调试
                console.log('更新后的头像URL:', `${auth.baseURL}/api/v1/user/avatar?username=${auth.currentUser.username}&t=${timestamp}`);
            }
        }
        
        alert('用户资料更新成功！');
        
    } catch (error) {
        console.error('更新用户资料失败:', error);
        const errorMsg = error.response?.data?.msg || 
                      error.response?.data?.message || 
                      error.message || 
                      '更新用户资料失败，请稍后再试';
        alert(errorMsg);
    }
}

// 修改密码函数
async function changePassword(auth) {
    try {
        // 获取密保问题答案
        const securityAnswers = document.querySelectorAll('.security-question input');
        const securityQuestion1Answer = securityAnswers[0].value.trim();
        const securityQuestion2Answer = securityAnswers[1].value.trim();
        const securityQuestion3Answer = securityAnswers[2].value.trim();
        
        // 获取新密码输入
        const passwordInputs = document.querySelectorAll('.password-inputs input');
        const newPassword = passwordInputs[0].value.trim();
        const confirmPassword = passwordInputs[1].value.trim();
        
        // 验证密保问题是否回答
        if (!securityQuestion1Answer || !securityQuestion2Answer || !securityQuestion3Answer) {
            alert('请回答所有密保问题！');
            return;
        }
        
        // 验证新密码是否输入
        if (!newPassword) {
            alert('请输入新密码！');
            return;
        }
        
        // 验证密码长度
        if (newPassword.length < 6 || newPassword.length > 20) {
            alert('密码长度必须在6-20个字符之间！');
            return;
        }
        
        // 验证两次输入的密码是否一致
        if (newPassword !== confirmPassword) {
            alert('两次输入的密码不一致！');
            return;
        }
        
        // 创建FormData对象
        const formData = new FormData();
        formData.append('security_question1_answer', securityQuestion1Answer);
        formData.append('security_question2_answer', securityQuestion2Answer);
        formData.append('security_question3_answer', securityQuestion3Answer);
        formData.append('new_password', newPassword);
        
        // 构建请求配置
        const config = {
            headers: {
                'Authorization': `Bearer ${auth.currentUser.token}`,
                'Content-Type': 'multipart/form-data'
            }
        };
        
        // 发送请求
        const response = await axios.post(`${auth.baseURL}/api/v1/user/change-password`, formData, config);
        
        if (response.data.code !== 200) {
            throw new Error(response.data.msg || '修改密码失败');
        }
        
        // 清空表单
        securityAnswers.forEach(input => input.value = '');
        passwordInputs.forEach(input => input.value = '');
        
        alert('密码修改成功！');
        
    } catch (error) {
        console.error('修改密码失败:', error);
        const errorMsg = error.response?.data?.msg || 
                      error.response?.data?.message || 
                      error.message || 
                      '修改密码失败，请稍后再试';
        alert(errorMsg);
    }
}