document.addEventListener('DOMContentLoaded', function() {
    // 初始化auth实例
    const auth = new Auth();
    // 将auth实例保存为全局变量，以便其他函数访问
    window.auth = auth;

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

    // 确认修改密码按钮事件 - 确保页面加载时就绑定事件
    const confirmPasswordButton = document.querySelector('.btn-confirm');
    if (confirmPasswordButton) {
        confirmPasswordButton.addEventListener('click', (e) => {
            e.preventDefault(); // 阻止表单默认提交行为
            if (!confirmPasswordButton.classList.contains('disabled-btn')) {
                changePassword(auth);
            } else {
                preventPasswordChange(e);
            }
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
        item.addEventListener('click', function(e) {
            e.preventDefault();
            
            // 如果是禁用状态，则不执行后续操作
            if (this.classList.contains('disabled')) {
                alert('请先完善您的账户信息，然后才能使用其他功能。');
                return;
            }
            
            // 如果是退出登录按钮，不执行下面的页面切换逻辑
            if (this.classList.contains('logout-btn')) {
                return;
            }
            
            // 移除所有active类
            menuItems.forEach(i => i.classList.remove('active'));
            // 添加当前点击项的active类
            this.classList.add('active');
            
            // 根据点击的菜单项切换显示内容
            if (this.textContent.includes('历史作品')) {
                infoSection.style.display = 'none';
                passwordSection.style.display = 'none';
                historySection.style.display = 'block';
                interactionSection.style.display = 'none';
                
                // 默认选中音频标签
                const historyTabs = document.querySelectorAll('.history-section .tab-item');
                historyTabs.forEach(t => t.classList.remove('active'));
                historyTabs[0].classList.add('active');  // 选中第一个标签（音频）
                
            } else if (this.textContent.includes('账号信息')) {
                infoSection.style.display = 'block';
                passwordSection.style.display = 'block';
                historySection.style.display = 'none';
                interactionSection.style.display = 'none';
                
            } else if (this.textContent.includes('互动信息')) {
                infoSection.style.display = 'none';
                passwordSection.style.display = 'none';
                historySection.style.display = 'none';
                interactionSection.style.display = 'block';
                
                // 默认选中我收藏的声音标签
                const interactionTabs = document.querySelectorAll('.interaction-section .tab-item');
                interactionTabs.forEach(t => t.classList.remove('active'));
                interactionTabs[0].classList.add('active');  // 选中第一个标签（我收藏的声音）
                
                // 显示加载中提示
                const listContainer = document.querySelector('.interaction-section .history-list');
                listContainer.className = 'history-list';
                listContainer.innerHTML = '<div class="loading">加载中...</div>';
                
                // 加载收藏的声音数据
                loadCollectedVoices(auth).then(collectedItems => {
                    listContainer.innerHTML = collectedItems;
                }).catch(error => {
                    console.error('加载收藏声音失败:', error);
                    listContainer.innerHTML = '<div class="no-content">加载失败，请稍后再试</div>';
                });
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
    let originalItems = historyList.innerHTML; // 保存原始的作品HTML
    
    // 加载音频历史作品
    async function loadAudioHistory(auth) {
        try {
            // 构建请求配置
            const config = {
                headers: {
                    'Authorization': `Bearer ${auth.currentUser.token}`
                }
            };
            
            // 调用API获取音频历史
            const response = await axios.get(
                `${auth.baseURL}/api/v1/user/history/audio`, 
                config
            );
            
            if (response.data.code !== 200) {
                throw new Error(response.data.msg || '获取音频历史失败');
            }
            
            const audioData = response.data.data;
            
            // 生成HTML
            let audioItemsHtml = '';
            if (audioData.items && audioData.items.length > 0) {
                audioData.items.forEach(item => {
                    audioItemsHtml += `
                        <div class="history-item" data-id="${item.id}">
                            <div class="item-cover">
                                <img src="data:image/jpeg;base64,${item.coverData}" alt="作品封面">
                                <div class="item-tag">${item.tag}</div>
                            </div>
                            <div class="item-info">
                                <div class="item-title">
                                    <input type="text" value="${item.title}" class="title-input">
                                    <button class="btn-save-title">保存</button>
                                </div>
                                <div class="item-meta">${item.created_at} 编辑 · ${item.duration}</div>
                            </div>
                        </div>
                    `;
                });
            } else {
                audioItemsHtml = '<div class="no-content">暂无音频作品</div>';
            }
            
            // 更新列表
            historyList.innerHTML = audioItemsHtml;
            originalItems = audioItemsHtml; // 更新原始内容
            
            // 设置历史项目的事件
            setupHistoryItemEvents();
            
            return audioData;
        } catch (error) {
            console.error('加载音频历史失败:', error);
            historyList.innerHTML = '<div class="no-content">加载失败，请稍后再试</div>';
            return null;
        }
    }
    
    // 加载视频历史作品
    async function loadVideoHistory(auth) {
        try {
            // 构建请求配置
            const config = {
                headers: {
                    'Authorization': `Bearer ${auth.currentUser.token}`
                }
            };
            
            // 调用API获取视频历史
            const response = await axios.get(
                `${auth.baseURL}/api/v1/user/history/video`, 
                config
            );
            
            if (response.data.code !== 200) {
                throw new Error(response.data.msg || '获取视频历史失败');
            }
            
            const videoData = response.data.data;
            
            // 生成HTML
            let videoItemsHtml = '';
            if (videoData.items && videoData.items.length > 0) {
                videoData.items.forEach(item => {
                    videoItemsHtml += `
                        <div class="history-item" data-id="${item.id}">
                            <div class="item-cover">
                                <img src="data:image/jpeg;base64,${item.coverData}" alt="作品封面">
                                <div class="item-tag">${item.tag}</div>
                            </div>
                            <div class="item-info">
                                <div class="item-title">
                                    <input type="text" value="${item.title}" class="title-input">
                                    <button class="btn-save-title">保存</button>
                                </div>
                                <div class="item-meta">${item.created_at} 编辑 · ${item.duration}</div>
                            </div>
                        </div>
                    `;
                });
            } else {
                videoItemsHtml = '<div class="no-content">暂无视频作品</div>';
            }
            
            // 更新列表
            historyList.innerHTML = videoItemsHtml;
            
            // 设置历史项目的事件
            setupHistoryItemEvents();
            
            return videoData;
        } catch (error) {
            console.error('加载视频历史失败:', error);
            historyList.innerHTML = '<div class="no-content">加载失败，请稍后再试</div>';
            return null;
        }
    }
    
    // 加载克隆声音历史作品
    async function loadVoiceHistory(auth) {
        try {
            // 构建请求配置
            const config = {
                headers: {
                    'Authorization': `Bearer ${auth.currentUser.token}`
                }
            };
            
            // 调用API获取克隆声音历史
            const response = await axios.get(
                `${auth.baseURL}/api/v1/user/history/voice`, 
                config
            );
            
            if (response.data.code !== 200) {
                throw new Error(response.data.msg || '获取克隆声音历史失败');
            }
            
            const voiceData = response.data.data;
            
            // 生成HTML
            let voiceItemsHtml = '';
            if (voiceData.items && voiceData.items.length > 0) {
                voiceData.items.forEach(item => {
                    voiceItemsHtml += `
                        <div class="history-item" data-id="${item.id}">
                            <div class="item-cover">
                                <img src="data:image/jpeg;base64,${item.coverData}" alt="作品封面">
                                <div class="item-tag">${item.tag}</div>
                            </div>
                            <div class="item-info">
                                <div class="item-title">
                                    <input type="text" value="${item.title}" class="title-input">
                                    <button class="btn-save-title">保存</button>
                                </div>
                                <div class="item-meta">${item.created_at} 编辑 · ${item.duration}</div>
                            </div>
                        </div>
                    `;
                });
            } else {
                voiceItemsHtml = '<div class="no-content">暂无克隆声音作品</div>';
            }
            
            // 更新列表
            historyList.innerHTML = voiceItemsHtml;
            
            // 设置历史项目的事件
            setupHistoryItemEvents();
            
            return voiceData;
        } catch (error) {
            console.error('加载克隆声音历史失败:', error);
            historyList.innerHTML = '<div class="no-content">加载失败，请稍后再试</div>';
            return null;
        }
    }
    
    tabItems.forEach(tab => {
        tab.addEventListener('click', (e) => {
            e.preventDefault();
            // 移除所有标签的active类
            tabItems.forEach(t => t.classList.remove('active'));
            // 添加当前标签的active类
            tab.classList.add('active');
            
            // 根据标签切换内容并从API加载数据
            if (tab.textContent === '视频') {
                loadVideoHistory(auth);
            } else if (tab.textContent === '我的声音') {
                loadVoiceHistory(auth);
            } else {
                loadAudioHistory(auth);
            }
        });
    });
    
    // 初始加载音频历史作品
    loadAudioHistory(auth);

    // 添加保存作品标题功能
    function setupTitleSaveButtons() {
        const saveButtons = document.querySelectorAll('.btn-save-title');
        saveButtons.forEach(button => {
            button.addEventListener('click', async function() {
                const historyItem = this.closest('.history-item');
                const itemId = historyItem.getAttribute('data-id');
                const titleInput = historyItem.querySelector('.title-input');
                const newTitle = titleInput.value.trim();
                
                if (!newTitle) {
                    alert('标题不能为空');
                    return;
                }
                
                try {
                    // 构建请求配置
                    const config = {
                        headers: {
                            'Authorization': `Bearer ${auth.currentUser.token}`
                        }
                    };
                    
                    // 这里可以添加保存标题的API调用
                    // 目前仅显示成功消息
                    alert('标题保存成功！');
                } catch (error) {
                    console.error('保存标题失败:', error);
                    alert('保存失败，请稍后再试');
                }
            });
        });
    }
    
    // 在加载历史作品后设置标题保存按钮事件
    function setupHistoryItemEvents() {
        setupTitleSaveButtons();
    }
    
    // 添加互动信息标签页切换功能
    const interactionTabs = document.querySelectorAll('.interaction-section .tab-item');
    const interactionList = document.querySelector('.interaction-section .history-list');

    // 加载用户收藏的声音
    async function loadCollectedVoices(auth) {
        try {
            // 构建请求配置
            const config = {
                headers: {
                    'Authorization': `Bearer ${auth.currentUser.token}`
                }
            };
            
            // 调用API获取用户收藏的声音
            const response = await axios.get(
                `${auth.baseURL}/api/v1/user/collections`, 
                config
            );
            
            if (response.data.code !== 200) {
                throw new Error(response.data.msg || '获取收藏声音失败');
            }
            
            const voiceData = response.data.data;
            
            // 生成HTML
            let collectedItemsHtml = '';
            if (voiceData.items && voiceData.items.length > 0) {
                voiceData.items.forEach(item => {
                    collectedItemsHtml += `
                        <div class="history-item" data-id="${item.id}">
                            <div class="item-cover">
                                <img src="data:image/jpeg;base64,${item.coverData}" alt="作品封面">
                                <div class="item-tag">${item.tag}</div>
                            </div>
                            <div class="item-info">
                                <div class="item-title">
                                    <input type="text" value="${item.title}" class="title-input" readonly>
                                </div>
                                <div class="item-meta">${item.created_at} 收藏 · ${item.duration}</div>
                                <div class="item-author">作者: ${item.author.username}</div>
                            </div>
                        </div>
                    `;
                });
            } else {
                collectedItemsHtml = '<div class="no-content">暂无收藏声音</div>';
            }
            
            return collectedItemsHtml;
            
        } catch (error) {
            console.error('加载收藏声音失败:', error);
            return '<div class="no-content">加载失败，请稍后再试</div>';
        }
    }

    // 加载用户喜欢的声音
    async function loadLikedVoices(auth) {
        try {
            // 构建请求配置
            const config = {
                headers: {
                    'Authorization': `Bearer ${auth.currentUser.token}`
                }
            };
            
            // 调用API获取用户喜欢的声音
            const response = await axios.get(
                `${auth.baseURL}/api/v1/user/likes`, 
                config
            );
            
            if (response.data.code !== 200) {
                throw new Error(response.data.msg || '获取喜欢声音失败');
            }
            
            const voiceData = response.data.data;
            
            // 生成HTML
            let likedItemsHtml = '';
            if (voiceData.items && voiceData.items.length > 0) {
                voiceData.items.forEach(item => {
                    likedItemsHtml += `
                        <div class="history-item" data-id="${item.id}">
                            <div class="item-cover">
                                <img src="data:image/jpeg;base64,${item.coverData}" alt="作品封面">
                                <div class="item-tag">${item.tag}</div>
                            </div>
                            <div class="item-info">
                                <div class="item-title">
                                    <input type="text" value="${item.title}" class="title-input" readonly>
                                </div>
                                <div class="item-meta">${item.created_at} 点赞 · ${item.duration}</div>
                                <div class="item-author">作者: ${item.author.username}</div>
                            </div>
                        </div>
                    `;
                });
            } else {
                likedItemsHtml = '<div class="no-content">暂无喜欢声音</div>';
            }
            
            return likedItemsHtml;
            
        } catch (error) {
            console.error('加载喜欢声音失败:', error);
            return '<div class="no-content">加载失败，请稍后再试</div>';
        }
    }

    // 加载谁赞过我的声音
    async function loadLikedByUsers(auth) {
        try {
            // 构建请求配置
            const config = {
                headers: {
                    'Authorization': `Bearer ${auth.currentUser.token}`
                }
            };
            
            // 调用API获取谁赞过用户的声音
            const response = await axios.get(
                `${auth.baseURL}/api/v1/user/liked-by`, 
                config
            );
            
            if (response.data.code !== 200) {
                throw new Error(response.data.msg || '获取点赞用户失败');
            }
            
            const likeData = response.data.data;
            
            // 生成HTML
            let likedByItemsHtml = '';
            if (likeData.items && likeData.items.length > 0) {
                likeData.items.forEach(item => {
                    // 处理头像
                    let avatarSrc = 'assets/images/avatar-default.png';
                    if (item.user.avatar) {
                        avatarSrc = `data:image/jpeg;base64,${item.user.avatar}`;
                    }
                    
                    likedByItemsHtml += `
                        <div class="interaction-user" data-id="${item.id}">
                            <div class="user-wrapper">
                                <div class="user-avatar">
                                    <img src="${avatarSrc}" alt="用户头像">
                                </div>
                                <div class="user-info">
                                    <div class="user-name">${item.user.username}</div>
                                    <div class="like-time">${item.created_at}</div>
                                </div>
                            </div>
                            <div class="liked-content">
                                <div class="liked-text">赞了你的声音</div>
                                <div class="liked-image">
                                    <img src="${item.voice.cover}" alt="作品封面">
                                </div>
                            </div>
                        </div>
                    `;
                });
            } else {
                likedByItemsHtml = '<div class="no-content">暂无用户点赞</div>';
            }
            
            return likedByItemsHtml;
            
        } catch (error) {
            console.error('加载点赞用户失败:', error);
            return '<div class="no-content">加载失败，请稍后再试</div>';
        }
    }

    // 加载谁收藏过我的声音
    async function loadCollectedByUsers(auth) {
        try {
            // 构建请求配置
            const config = {
                headers: {
                    'Authorization': `Bearer ${auth.currentUser.token}`
                }
            };
            
            // 调用API获取谁收藏过用户的声音
            const response = await axios.get(
                `${auth.baseURL}/api/v1/user/collected-by`, 
                config
            );
            
            if (response.data.code !== 200) {
                throw new Error(response.data.msg || '获取收藏用户失败');
            }
            
            const collectionData = response.data.data;
            
            // 生成HTML
            let collectedByItemsHtml = '';
            if (collectionData.items && collectionData.items.length > 0) {
                collectionData.items.forEach(item => {
                    // 处理头像
                    let avatarSrc = 'assets/images/avatar-default.png';
                    if (item.user.avatar) {
                        avatarSrc = `data:image/jpeg;base64,${item.user.avatar}`;
                    }
                    
                    collectedByItemsHtml += `
                        <div class="interaction-user" data-id="${item.id}">
                            <div class="user-wrapper">
                                <div class="user-avatar">
                                    <img src="${avatarSrc}" alt="用户头像">
                                </div>
                                <div class="user-info">
                                    <div class="user-name">${item.user.username}</div>
                                    <div class="like-time">${item.created_at}</div>
                                </div>
                            </div>
                            <div class="liked-content">
                                <div class="liked-text">收藏了你的声音</div>
                                <div class="liked-image">
                                    <img src="${item.voice.cover}" alt="作品封面">
                                </div>
                            </div>
                        </div>
                    `;
                });
            } else {
                collectedByItemsHtml = '<div class="no-content">暂无用户收藏</div>';
            }
            
            return collectedByItemsHtml;
            
        } catch (error) {
            console.error('加载收藏用户失败:', error);
            return '<div class="no-content">加载失败，请稍后再试</div>';
        }
    }

    // 修改标签切换逻辑
    interactionTabs.forEach(tab => {
        tab.addEventListener('click', async (e) => {
            e.preventDefault();
            interactionTabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            
            // 获取列表容器
            const listContainer = document.querySelector('.interaction-section .history-list, .interaction-section .interaction-list');
            
            // 显示加载中提示
            listContainer.innerHTML = '<div class="loading">加载中...</div>';
            
            try {
                if (tab.textContent === '我收藏的声音') {
                    listContainer.className = 'history-list';  // 使用网格布局
                    const collectedItems = await loadCollectedVoices(auth);
                    listContainer.innerHTML = collectedItems;
                } else if (tab.textContent === '我喜欢的声音') {
                    listContainer.className = 'history-list';  // 使用网格布局
                    const likedItems = await loadLikedVoices(auth);
                    listContainer.innerHTML = likedItems;
                } else if (tab.textContent === '谁赞过我') {
                    listContainer.className = 'interaction-list';  // 使用列表布局
                    const likedByItems = await loadLikedByUsers(auth);
                    listContainer.innerHTML = likedByItems;
                } else if (tab.textContent === '谁收藏过') {
                    listContainer.className = 'interaction-list';  // 使用列表布局
                    const collectedByItems = await loadCollectedByUsers(auth);
                    listContainer.innerHTML = collectedByItems;
                }
            } catch (error) {
                console.error('加载互动信息失败:', error);
                listContainer.innerHTML = '<div class="no-content">加载失败，请稍后再试</div>';
            }
        });
    });
    
    // 初始加载互动信息 - 默认加载我收藏的声音
    document.querySelector('.menu-item:nth-child(3)').addEventListener('click', async function() {
        if (this.classList.contains('active')) {
            const listContainer = document.querySelector('.interaction-section .history-list');
            listContainer.innerHTML = '<div class="loading">加载中...</div>';
            try {
                const collectedItems = await loadCollectedVoices(auth);
                listContainer.innerHTML = collectedItems;
            } catch (error) {
                console.error('初始加载收藏声音失败:', error);
                listContainer.innerHTML = '<div class="no-content">加载失败，请稍后再试</div>';
            }
        }
    });

    // 检查用户信息是否已完善
    checkProfileStatusFromAPI(auth).then(isProfileComplete => {
        lockFunctionality(isProfileComplete);
        lockNavigation(isProfileComplete);
    });
});

// 使用API检查用户信息是否已完善
async function checkProfileStatusFromAPI(auth) {
    try {
        // 如果未登录，跳转到首页
        if (!auth.currentUser) {
            window.location.href = 'index.html';
            return false;
        }
        
        // 构建请求配置
        const config = {
            headers: {
                'Authorization': `Bearer ${auth.currentUser.token}`
            }
        };
        
        // 调用后端API检查用户资料状态
        const response = await axios.get(`${auth.baseURL}/api/v1/user/profile/status`, config);
        console.log('用户资料状态:', response.data);
        if (response.data.code !== 200) {
            console.error('获取用户资料状态失败:', response.data.msg);
            return false;
        }
        
        // 返回API响应中的is_completed状态
        return response.data.data.is_completed;
        
    } catch (error) {
        console.error('检查用户资料状态失败:', error);
        const errorMsg = error.response?.data?.msg || 
                      error.response?.data?.message || 
                      error.message || 
                      '检查用户资料状态失败';
        console.error(errorMsg);
        return false;
    }
}

// 锁定其他功能，只允许完善个人信息
function lockFunctionality(isProfileComplete) {
    const menuItems = document.querySelectorAll('.menu-item:not(.active):not(.logout-btn)');
    const infoSection = document.querySelector('.info-section');
    const saveButton = document.querySelector('.btn-save');
    const confirmPasswordButton = document.querySelector('.btn-confirm'); // 添加确认修改密码按钮
    
    // 当用户信息不完整时
    if (!isProfileComplete) {
        // 添加信息不完整的提示
        const notificationEl = document.querySelector('.profile-incomplete-notice');
        if (!notificationEl) {
            const notification = document.createElement('div');
            notification.className = 'profile-incomplete-notice';
            notification.innerHTML = `
                <div class="alert alert-warning">
                    <span class="alert-icon">⚠️</span>
                    <span class="alert-message">请完善您的账户信息才能使用其他功能</span>
                </div>
            `;
            infoSection.insertBefore(notification, infoSection.firstChild);
        }
        
        // 禁用其他菜单项
        menuItems.forEach(item => {
            item.classList.add('disabled');
        });
        
        // 高亮保存按钮以提示用户
        if (saveButton) {
            saveButton.classList.add('highlight-save');
        }
        
        // 禁用确认修改密码按钮
        if (confirmPasswordButton) {
            confirmPasswordButton.classList.add('disabled-btn');
            confirmPasswordButton.disabled = true; // 添加HTML禁用属性
            confirmPasswordButton.title = '请先完善您的账户信息，然后才能修改密码'; // 添加提示文本
    
        }
        
        // 确保只显示账号信息部分
        document.querySelector('.info-section').style.display = 'block';
        document.querySelector('.password-section').style.display = 'block';
        document.querySelector('.history-section').style.display = 'none';
        document.querySelector('.interaction-section').style.display = 'none';
        
        // 确保账号信息菜单项为活跃状态
        const accountMenuItem = document.querySelector('.menu-item:nth-child(1)');
        if (accountMenuItem) {
            menuItems.forEach(item => item.classList.remove('active'));
            accountMenuItem.classList.add('active');
            accountMenuItem.classList.remove('disabled'); // 确保账号信息菜单不被禁用
        }
        
        // 添加密保问题到账户信息表单
        addSecurityQuestionsToInfoForm();
        
    } else {
        // 如果信息已完善，移除警告信息
        const notificationEl = document.querySelector('.profile-incomplete-notice');
        if (notificationEl) {
            notificationEl.remove();
        }
        
        // 启用其他菜单项
        menuItems.forEach(item => {
            item.classList.remove('disabled');
        });
        
        // 恢复保存按钮样式
        if (saveButton) {
            saveButton.classList.remove('highlight-save');
        }
        
        // 启用确认修改密码按钮
        if (confirmPasswordButton) {
            confirmPasswordButton.classList.remove('disabled-btn');
            confirmPasswordButton.disabled = false;
            confirmPasswordButton.removeAttribute('title');

        }
        
        // 移除账户信息表单中的密保问题
        removeSecurityQuestionsFromInfoForm();
    }
}

// 添加密保问题到账户信息表单
function addSecurityQuestionsToInfoForm() {
    const infoForm = document.querySelector('.info-form');
    
    // 如果表单中已经有密保问题，则不再添加
    if (document.querySelector('.info-form .security-questions-wrapper')) {
        return;
    }
    
    // 创建密保问题容器
    const securityQuestionsWrapper = document.createElement('div');
    securityQuestionsWrapper.className = 'security-questions-wrapper';
    
    // 添加标题
    const title = document.createElement('h3');
    title.textContent = '请设置密保问题';
    securityQuestionsWrapper.appendChild(title);
    
    // 添加三个密保问题
    const securityQuestions = [
        { label: '密保问题1：您的生日是？', name: 'securityQuestion1' },
        { label: '密保问题2：您母亲的名字是？', name: 'securityQuestion2' },
        { label: '密保问题3：您就读的小学是？', name: 'securityQuestion3' }
    ];
    
    // 创建与修改密码部分相同的密保问题容器
    const questionsContainer = document.createElement('div');
    questionsContainer.className = 'security-questions';
    
    // 按顺序添加密保问题
    securityQuestions.forEach(question => {
        const questionGroup = document.createElement('div');
        questionGroup.className = 'security-question';
        
        const questionLabel = document.createElement('label');
        questionLabel.textContent = question.label;
        
        const questionInput = document.createElement('input');
        questionInput.type = 'text';
        questionInput.name = question.name;
        questionInput.placeholder = '请输入答案';
        questionInput.required = true;
        
        questionGroup.appendChild(questionLabel);
        questionGroup.appendChild(questionInput);
        questionsContainer.appendChild(questionGroup);
    });
    
    securityQuestionsWrapper.appendChild(questionsContainer);
    infoForm.appendChild(securityQuestionsWrapper);
}

// 从账户信息表单中移除密保问题
function removeSecurityQuestionsFromInfoForm() {
    const securityQuestionsWrapper = document.querySelector('.info-form .security-questions-wrapper');
    if (securityQuestionsWrapper) {
        securityQuestionsWrapper.remove();
    }
}

// 新增：锁定导航栏功能
function lockNavigation(isProfileComplete) {
    const navItems = document.querySelectorAll('.nav-bar .nav-item a');
    
    if (!isProfileComplete) {
        // 为导航栏项目添加提示和禁用效果
        navItems.forEach(item => {
            // 排除当前页面的链接
            if (!item.href.includes('user.html')) {
                const originalHref = item.getAttribute('href');
                
                // 存储原始href作为自定义属性
                if (!item.hasAttribute('data-original-href')) {
                    item.setAttribute('data-original-href', originalHref);
                }
                
                // 移除href属性使链接不可点击
                item.removeAttribute('href');
                
                // 添加禁用样式
                item.classList.add('nav-disabled');
                
                // 添加点击事件
                item.addEventListener('click', preventNavigation);
            }
        });
    } else {
        // 如果资料已完善，恢复导航功能
        navItems.forEach(item => {
            if (item.hasAttribute('data-original-href')) {
                item.href = item.getAttribute('data-original-href');
                item.removeAttribute('data-original-href');
            }
            
            item.classList.remove('nav-disabled');
            item.removeEventListener('click', preventNavigation);
        });
        
        // 移除顶部通知，如果存在的话
        const notification = document.querySelector('.top-notification');
        if (notification) {
            notification.remove();
        }
    }
}

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

        // 添加：通过API检查个人信息完整性并应用限制
        const isProfileComplete = await checkProfileStatusFromAPI(auth);
        lockFunctionality(isProfileComplete);
        // 同时锁定导航
        lockNavigation(isProfileComplete);
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
            console.log('正在上传用户选择的头像文件:', avatarInput.files[0].name);
            formData.append('avatar', avatarInput.files[0]);
        } else {
            // 如果用户没有选择头像，获取默认头像并上传
            console.log('用户未选择头像，使用默认头像');
            try {
                // 获取默认头像
                const defaultAvatarUrl = "assets/images/avatar-default.png";
                const response = await fetch(defaultAvatarUrl);
                const blob = await response.blob();
                const defaultAvatarFile = new File([blob], "default-avatar.png", { type: "image/png" });
                
                // 将默认头像添加到表单数据
                formData.append('avatar', defaultAvatarFile);
                console.log('已添加默认头像到上传数据');
            } catch (avatarError) {
                console.error('获取默认头像失败:', avatarError);
            }
        }
        
        // 添加密保问题答案（如果存在）
        const securityQuestion1 = document.querySelector('input[name="securityQuestion1"]');
        const securityQuestion2 = document.querySelector('input[name="securityQuestion2"]');
        const securityQuestion3 = document.querySelector('input[name="securityQuestion3"]');
        
        if (securityQuestion1 && securityQuestion2 && securityQuestion3) {
            // 验证密保问题必填
            if (!securityQuestion1.value || !securityQuestion2.value || !securityQuestion3.value) {
                alert('请填写所有密保问题答案！');
                return;
            }
            
            formData.append('security_question1_answer', securityQuestion1.value);
            formData.append('security_question2_answer', securityQuestion2.value);
            formData.append('security_question3_answer', securityQuestion3.value);
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

        // 添加：通过API检查信息是否完整并解锁功能
        const isProfileComplete = await checkProfileStatusFromAPI(auth);
        lockFunctionality(isProfileComplete);
        // 同时解锁导航
        lockNavigation(isProfileComplete);
        
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

// 防止导航事件
function preventNavigation(e) {
    e.preventDefault();
    alert('请先完善您的个人资料，然后才能使用其他功能。');
}

// 阻止修改密码的函数
function preventPasswordChange(e) {
    e.preventDefault();
    alert('请先完善您的账户信息，然后才能修改密码。');
}