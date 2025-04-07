document.addEventListener('DOMContentLoaded', function() {
    const baseURL = 'http://127.0.0.1:8000';
    let currentVoiceId = null;
    let audioPlayer = null;

    // 从URL获取语音ID
    function getVoiceIdFromUrl() {
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get('voiceId');
    }

    // 加载语音资源详情
    async function loadVoiceDetail() {
        try {
            currentVoiceId = getVoiceIdFromUrl();
            
            if (!currentVoiceId) {
                alert('未找到语音资源ID，即将返回列表页');
                window.location.href = 'resource-review.html';
                return;
            }
            
            const response = await axios.get(`${baseURL}/api/v1/admin/voices/${currentVoiceId}`);
            
            if (response.data && response.data.code === 200) {
                const voiceData = response.data.data;
                renderVoiceDetail(voiceData);
            } else {
                console.error('获取语音资源详情失败:', response.data.msg);
                alert('获取语音资源详情失败: ' + (response.data.msg || '未知错误'));
            }
        } catch (error) {
            console.error('获取语音资源详情出错:', error);
            alert('获取语音资源详情失败: ' + (error.response?.data?.msg || error.message || '未知错误'));
            window.location.href = 'resource-review.html';
        }
    }

    // 渲染语音资源详情
    function renderVoiceDetail(voiceData) {
        // 更新页面标题
        const detailHeader = document.querySelector('.detail-header h2');
        if (detailHeader) {
            detailHeader.textContent = `用户 ${voiceData.user.username} 创建的语音`;
        }

        // 更新资源项内容
        const resourceItem = document.querySelector('.resource-item');
        if (resourceItem) {
            // 设置封面图像
            const resourceImage = resourceItem.querySelector('.resource-image');
            if (resourceImage) {
                if (voiceData.avatar) {
                    resourceImage.src = `data:image/jpeg;base64,${voiceData.avatar}`;
                } else {
                    resourceImage.src = 'images/default-cover.jpg'; // 使用默认封面
                }
            }

            // 设置标题
            const title = resourceItem.querySelector('h3');
            if (title) {
                title.textContent = voiceData.title;
            }

            // 设置用户信息
            const infoRows = resourceItem.querySelectorAll('.info-row p');
            if (infoRows.length >= 3) {
                infoRows[0].innerHTML = `用户名: <span>${voiceData.user.username}</span>`;
                infoRows[1].innerHTML = `上传时间: <span>${voiceData.created_at}</span>`;
                infoRows[2].innerHTML = `类型: <span>${voiceData.language}</span>`;
            }

            // 设置用户头像 - 修复这里
            const avatarImg = resourceItem.querySelector('.avatar');
            if (avatarImg && voiceData.user.avatar) {
                avatarImg.src = `data:image/jpeg;base64,${voiceData.user.avatar}`;
            }

            // 更新按钮状态
            const approveBtn = resourceItem.querySelector('.approve-btn');
            const rejectBtn = resourceItem.querySelector('.reject-btn');  // 修复了这里的语法错误
            
            if (approveBtn && rejectBtn) {
                if (voiceData.status === 'passed') {
                    approveBtn.classList.add('active');
                    rejectBtn.classList.remove('active');
                } else if (voiceData.status === 'failed') {
                    approveBtn.classList.remove('active');
                    rejectBtn.classList.add('active');
                } else {
                    approveBtn.classList.remove('active');
                    rejectBtn.classList.remove('active');
                }
            }

            // 添加语音预览描述
            const previewElement = document.createElement('div');
            previewElement.className = 'resource-preview';
            previewElement.innerHTML = `<p>预览: ${voiceData.preview}</p>`;
            
            // 查找合适的位置插入预览描述
            const resourceInfo = resourceItem.querySelector('.resource-info');
            if (resourceInfo) {
                resourceInfo.appendChild(previewElement);
            }
            
            // 添加统计信息
            const statsElement = document.createElement('div');
            statsElement.className = 'resource-stats';
            statsElement.innerHTML = `
                <p>播放: ${voiceData.play_count || 0} 次</p>
                <p>点赞: ${voiceData.like_count || 0} 次</p>
                <p>收藏: ${voiceData.collect_count || 0} 次</p>
            `;
            resourceInfo.appendChild(statsElement);
        }
    }

    // 播放音频
    function playAudio() {
        if (!currentVoiceId) return;
        
        // 停止之前正在播放的音频
        if (audioPlayer) {
            audioPlayer.pause();
            audioPlayer = null;
        }
        
        // 创建新的音频对象
        audioPlayer = new Audio(`${baseURL}/api/v1/admin/voices/${currentVoiceId}/audio`);
        audioPlayer.play().catch(error => {
            console.error('播放音频失败:', error);
            alert('播放音频失败，请确保音频文件存在并且格式正确');
        });
    }

    // 审核语音资源
    async function reviewVoice(status) {
        if (!currentVoiceId) return;
        
        try {
            const response = await axios.put(`${baseURL}/api/v1/admin/voices/${currentVoiceId}/review`, {
                status: status
            });
            
            if (response.data && response.data.code === 200) {
                alert(response.data.msg || '审核成功');
                
                // 更新按钮状态
                const approveBtn = document.querySelector('.approve-btn');
                const rejectBtn = document.querySelector('.reject-btn');
                
                if (approveBtn && rejectBtn) {
                    if (status === 'passed') {
                        approveBtn.classList.add('active');
                        rejectBtn.classList.remove('active');
                    } else if (status === 'failed') {
                        approveBtn.classList.remove('active');
                        rejectBtn.classList.add('active');
                    }
                }
            } else {
                alert('审核失败: ' + (response.data.msg || '未知错误'));
            }
        } catch (error) {
            console.error('审核语音资源出错:', error);
            alert('审核失败: ' + (error.response?.data?.msg || error.message || '未知错误'));
        }
    }

    // 加载语音资源详情
    loadVoiceDetail();

    // 绑定试听按钮事件
    const listenBtn = document.querySelector('.listen-btn');
    if (listenBtn) {
        listenBtn.addEventListener('click', playAudio);
    }

    // 绑定审核按钮事件
    const approveBtn = document.querySelector('.approve-btn');
    if (approveBtn) {
        approveBtn.addEventListener('click', function() {
            reviewVoice('passed');
        });
    }

    const rejectBtn = document.querySelector('.reject-btn');
    if (rejectBtn) {
        rejectBtn.addEventListener('click', function() {
            reviewVoice('failed');
        });
    }

    // 绑定返回按钮事件
    const backBtn = document.querySelector('.back-btn');
    if (backBtn) {
        backBtn.addEventListener('click', function(e) {
            e.preventDefault();
            window.location.href = 'resource-review.html';
        });
    }
    
    // 退出登录按钮
    const logoutBtn = document.querySelector('.logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function() {
            const confirmLogout = confirm('确定要退出登录吗？');
            if (confirmLogout) {
                window.location.href = 'login.html';
            }
        });
    }
});
