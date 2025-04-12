document.addEventListener('DOMContentLoaded', function() {
    // 获取DOM元素
    const playButton = document.querySelector('.control-btn.play');
    const timeDisplay = document.querySelector('.time-display');
    const aspectRatioSelect = document.querySelector('.aspect-ratio select');
    const resolutionSelect = document.querySelector('.resolution select');
    const bitrateSelect = document.querySelector('.bitrate select');
    
    // 添加记录页面访问的函数
    function recordVisit() {
        const baseURL = 'http://127.0.0.1:8000';
        
        try {
            // 尝试获取并解析用户信息
            const userDataStr = localStorage.getItem('currentUser');
            if (userDataStr) {
                userInfo = JSON.parse(userDataStr);
                // 检查是否有token，用来判断用户是否已登录
                isLoggedIn = userInfo && userInfo.token ? true : false;
            }
        } catch (error) {
            console.error('解析用户信息失败:', error);
            userInfo = null;
            isLoggedIn = false;
        }
        const config = {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        };
        // 如果有token，添加到请求头
        if (isLoggedIn && userInfo.token) {
            config.headers['Authorization'] = `Bearer ${userInfo.token}`;
        }

        // 调用API记录访问
        const params = new URLSearchParams();
        params.append('feature_type', "education");

        axios.post(`${baseURL}/api/v1/admin/record-visit`, params,config)
        .catch(error => {
            console.error('记录页面访问失败:', error);
        });
    }
    // 记录页面访问
    recordVisit();

    // 播放/暂停切换
    let isPlaying = false;
    playButton.addEventListener('click', function() {
        isPlaying = !isPlaying;
        if (isPlaying) {
            this.querySelector('i').classList.remove('icon-play');
            this.querySelector('i').classList.add('icon-pause');
        } else {
            this.querySelector('i').classList.remove('icon-pause');
            this.querySelector('i').classList.add('icon-play');
        }
    });

    // 导入PPT按钮点击事件
    const importBtn = document.querySelector('.import-btn');
    const resourceList = document.querySelector('.resource-list');
    const baseURL = 'http://127.0.0.1:8000';

    // 创建加载提示元素
    const loadingIndicator = document.createElement('div');
    loadingIndicator.className = 'loading-indicator';
    loadingIndicator.textContent = '正在处理PPT...';
    loadingIndicator.style.display = 'none';
    document.querySelector('.resource-panel').appendChild(loadingIndicator);

    // 创建资源项
    function createResourceItem(imageUrl, index) {
        const resourceItem = document.createElement('div');
        resourceItem.className = 'resource-item';
        resourceItem.innerHTML = `
            <img src="${imageUrl}" alt="PPT页面 ${index + 1}">
            <div class="resource-actions">
                <button class="delete-btn"><i class="icon-delete"></i></button>
            </div>
        `;

        // 添加删除按钮事件
        const deleteBtn = resourceItem.querySelector('.delete-btn');
        deleteBtn.addEventListener('click', function() {
            resourceItem.remove();
        });

        return resourceItem;
    }

    importBtn.addEventListener('click', function() {
        // 创建文件输入元素
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.ppt,.pptx';
        input.multiple = false;
        
        input.addEventListener('change', async function(e) {
            if (e.target.files.length > 0) {
                const file = e.target.files[0];
                const formData = new FormData();
                formData.append('file', file);

                // 显示加载提示
                loadingIndicator.style.display = 'block';
                
                try {
                    // 上传PPT文件并获取处理后的图片列表
                    const response = await axios.post(`${baseURL}/api/v1/teaching/upload-ppt`, formData, {
                        headers: {
                            'Content-Type': 'multipart/form-data'
                        }
                    });

                    if (response.data.code === 200) {
                        // 清空现有的资源项
                        resourceList.innerHTML = '';

                        // 添加新的资源项
                        response.data.images.forEach((imageUrl, index) => {
                            const resourceItem = createResourceItem(imageUrl, index);
                            resourceList.appendChild(resourceItem);
                        });
                    } else {
                        throw new Error(response.data.message || '处理PPT文件失败');
                    }
                } catch (error) {
                    console.error('上传PPT文件失败:', error);
                    alert('上传PPT文件失败: ' + (error.response?.data?.message || error.message || '未知错误'));
                } finally {
                    // 隐藏加载提示
                    loadingIndicator.style.display = 'none';
                }
            }
        });
        
        input.click();
    });

    // 删除资源项
    document.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const resourceItem = this.closest('.resource-item');
            resourceItem.remove();
        });
    });

    // 添加资源按钮点击事件
    const addResourceBtn = document.querySelector('.add-resource');
    addResourceBtn.addEventListener('click', function() {
        // 创建文件输入元素
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.multiple = false;
        
        input.addEventListener('change', function(e) {
            if (e.target.files.length > 0) {
                const file = e.target.files[0];
                // 这里添加处理图片文件的逻辑
            }
        });
        
        input.click();
    });

    // 获取所有需要的DOM元素
    const avatarBtn = document.querySelector('.tool-item[title="数字人"]');
    const voiceBtn = document.querySelector('.tool-item[title="声音"]');
    const bgBtn = document.querySelector('.tool-item[title="背景"]');
    const subtitleBtn = document.querySelector('.tool-item[title="字幕"]');
    const avatarPanel = document.querySelector('.avatar-panel');
    const voicePanel = document.querySelector('.voice-panel');
    const bgPanel = document.querySelector('.background-panel');
    const subtitlePanel = document.querySelector('.subtitle-panel');
    const centerPanel = document.querySelector('.center-panel');
    const musicBtn = document.querySelector('.tool-item[title="音乐"]');
    const musicPanel = document.querySelector('.music-panel');

    // 工具按钮点击事件
    document.querySelectorAll('.tool-item').forEach(tool => {
        tool.addEventListener('click', function() {
            // 移除其他按钮的active状态
            document.querySelectorAll('.tool-item').forEach(item => {
                if (item !== this) {
                    item.classList.remove('active');
                }
            });
            
            // 切换当前按钮的active状态
            this.classList.toggle('active');

            // 如果按钮变为非active状态，隐藏所有面板
            if (!this.classList.contains('active')) {
                hideAllPanels();
                return;
            }

            // 根据当前点击的按钮显示对应面板
            hideAllPanels();  // 先隐藏所有面板
            if (this === avatarBtn) {
                avatarPanel.classList.add('show');
                centerPanel.classList.add('narrow');
            } else if (this === voiceBtn) {
                voicePanel.classList.add('show');
                centerPanel.classList.add('narrow');
            } else if (this === bgBtn) {
                bgPanel.classList.add('show');
                centerPanel.classList.add('narrow');
            } else if (this === subtitleBtn) {
                subtitlePanel.classList.add('show');
                centerPanel.classList.add('narrow');
            } else if (this === musicBtn) {
                musicPanel.classList.add('show');
                centerPanel.classList.add('narrow');
            }
        });
    });

    // 隐藏所有面板的辅助函数
    function hideAllPanels() {
        avatarPanel.classList.remove('show');
        voicePanel.classList.remove('show');
        bgPanel.classList.remove('show');
        subtitlePanel.classList.remove('show');
        musicPanel.classList.remove('show');
        centerPanel.classList.remove('narrow');
    }

    // 滑块值更新
    document.querySelectorAll('.slider').forEach(slider => {
        const valueDisplay = slider.nextElementSibling;
        slider.addEventListener('input', function() {
            let value = this.value;
            if (this.step === '0.1') {
                value += 'x';
            }
            valueDisplay.textContent = value;
        });
    });

    // 情感按钮点击
    document.querySelectorAll('.emotion-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.emotion-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
        });
    });

    // 更新时间显示
    function updateTimeDisplay(currentTime, totalTime) {
        timeDisplay.textContent = `${formatTime(currentTime)}/${formatTime(totalTime)}`;
    }

    // 格式化时间
    function formatTime(seconds) {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = Math.floor(seconds % 60);
        const ms = Math.floor((seconds % 1) * 100);
        
        return `${padZero(h)}:${padZero(m)}:${padZero(s)}:${padZero(ms)}`;
    }

    // 补零
    function padZero(num) {
        return num.toString().padStart(2, '0');
    }

    // 初始化时间显示
    updateTimeDisplay(0, 0);

    // 展开/收起时间轴功能
    const expandBtn = document.querySelector('.expand-timeline-btn');
    const timeline = document.querySelector('.timeline');
    const timelineTracks = document.querySelector('.timeline-tracks');
    
    // 创建轨道标签和内容
    const trackLabels = [
        'T', // 文本轨道
        '数字人',
        '声音'
    ];
    
    // 初始化轨道HTML
    function initTracks() {
        const tracksHTML = `
            <div class="track-labels">
                ${trackLabels.map(label => `<div class="track-label">${label}</div>`).join('')}
            </div>
            <div class="track-content">
                ${trackLabels.map(label => `
                    <div class="track-row">
                        <div class="track-items"></div>
                    </div>
                `).join('')}
            </div>
        `;
        timelineTracks.innerHTML = tracksHTML;
    }
    
    expandBtn.addEventListener('click', function() {
        if (!timeline.classList.contains('expanded')) {
            // 展开时初始化轨道
            initTracks();
            timeline.classList.add('expanded');
            this.classList.add('expanded');
            btnText.textContent = '收起轨道';
        } else {
            // 收起时恢复原始时间轴
            timeline.classList.remove('expanded');
            this.classList.remove('expanded');
            btnText.textContent = '展开轨道';
            timelineTracks.innerHTML = ''; // 清空轨道内容
        }
    });
});