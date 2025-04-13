document.addEventListener('DOMContentLoaded', function() {
    // 获取DOM元素
    const playButton = document.querySelector('.control-btn.play');
    const timeDisplay = document.querySelector('.time-display');
    const aspectRatioSelect = document.querySelector('.aspect-ratio select');
    const resolutionSelect = document.querySelector('.resolution select');
    const bitrateSelect = document.querySelector('.bitrate select');
    const trackContent = document.querySelector('.track-content');
    const watermark = document.querySelector('.watermark');
    
    // 存储每个PPT页面对应的字幕
    let subtitles = {};
    // 添加变量跟踪上一次更新的字幕文本，避免重复更新DOM
    let lastSubtitleText = '';
    
    // 添加记录页面访问的函数
    function recordVisit() {
        const baseURL = 'http://127.0.0.1:8000';
        let userInfo = null;
        let isLoggedIn = false;
        
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

        axios.post(`${baseURL}/api/v1/admin/record-visit`, params, config)
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

        // 添加点击事件，点击时在中央区域显示PPT图片
        resourceItem.addEventListener('click', function() {
            // 获取视频容器区域
            const videoContainer = document.querySelector('.video-container');
            if (videoContainer) {
                // 确保视频容器中有一个用于显示PPT的元素
                let pptDisplay = videoContainer.querySelector('.ppt-display');
                if (!pptDisplay) {
                    pptDisplay = document.createElement('div');
                    pptDisplay.className = 'ppt-display';
                    videoContainer.insertBefore(pptDisplay, videoContainer.firstChild);
                }
                
                // 设置中央区域显示当前PPT图片
                pptDisplay.innerHTML = `<img src="${imageUrl}" alt="PPT页面 ${index + 1}" class="ppt-display-image">`;
                
                // 显示该页面对应的字幕
                if (subtitles[index]) {
                    watermark.textContent = subtitles[index];
                } else {
                    watermark.textContent = '字幕在此显示';
                }
                
                // 更新字幕输入区域
                updateSubtitleInput(index);
            }
        });

        return resourceItem;
    }

    // 导入PPT按钮点击事件
    importBtn.addEventListener('click', function() {
        // 创建文件输入元素
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.ppt,.pptx';
        input.multiple = false;
        
        input.addEventListener('change', async function(e) {
            e.preventDefault(); // 阻止默认表单提交行为
            if (e.target.files.length > 0) {
                const file = e.target.files[0];
                const formData = new FormData();
                formData.append('file', file);

                // 禁用导入按钮，防止重复提交
                importBtn.disabled = true;
                
                // 显示加载提示
                loadingIndicator.style.display = 'block';
                
                try {
                    // 上传PPT文件并获取处理后的图片列表
                    const response = await axios.post(`${baseURL}/api/v1/teaching/upload-ppt`, formData, {
                        headers: {
                            'Content-Type': 'multipart/form-data'
                        }
                    });

                    if (response.data.code === 200 && response.data.images) {
                        // 清空现有的资源项
                        resourceList.innerHTML = '';
                        
                        // 添加新的资源项
                        response.data.images.forEach((base64Data, index) => {
                            const imageUrl = `data:image/png;base64,${base64Data}`;
                            const resourceItem = createResourceItem(imageUrl, index);
                            resourceList.appendChild(resourceItem);
                        });
                        
                        alert('PPT上传成功');
                    } else {
                        throw new Error(response.data.msg || '处理PPT文件失败');
                    }
                } catch (error) {
                    console.error('上传PPT文件失败:', error);
                    alert('上传PPT文件失败: ' + (error.response?.data?.detail?.msg || error.message || '未知错误'));
                } finally {
                    // 隐藏加载提示
                    loadingIndicator.style.display = 'none';
                    // 重新启用导入按钮
                    importBtn.disabled = false;
                    // 清空文件输入框
                    input.value = '';
                }
            }
        });
        
        input.click();
    });

    // 使用HTML中静态创建的按钮
    const selectPptBtn = document.querySelector('.select-ppt-btn');

    // 选择PPT按钮点击事件
    selectPptBtn.addEventListener('click', async function() {
        try {
            // 获取已上传的PPT列表
            const response = await axios.get(`${baseURL}/api/v1/teaching/ppt-list`);
            
            if (response.data.code === 200) {
                // 清空现有的资源项和字幕
                resourceList.innerHTML = '';
                subtitles = {};

                // 添加新的资源项
                response.data.images.forEach((imageData, index) => {
                    console.log(`处理第${index + 1}张PPT图片`);
                    // 将base64数据转换为图片URL
                    const imageUrl = `data:image/png;base64,${imageData}`;
                    const resourceItem = createResourceItem(imageUrl, index);
                    
                    // 设置图片源为base64数据
                    const img = resourceItem.querySelector('img');
                    if (img) {
                        img.src = imageUrl;
                        // 添加加载错误处理
                        img.onerror = function() {
                            console.error('图片加载失败:', index + 1);
                            img.src = 'assets/images/placeholder.png'; // 设置默认图片
                        };
                    }
                    resourceList.appendChild(resourceItem);
                });
            } else {
                throw new Error(response.data.message || '获取PPT列表失败');
            }
        } catch (error) {
            console.error('获取PPT列表失败:', error);
            alert('获取PPT列表失败: ' + (error.response?.data?.message || error.message || '未知错误'));
        }
    });

    // 创建字幕输入区域
    function createSubtitleInput() {
        const subtitleContainer = document.createElement('div');
        subtitleContainer.className = 'subtitle-input-container';
        subtitleContainer.style.width = '100%';
        subtitleContainer.style.height = '100%';
        subtitleContainer.innerHTML = `
            <textarea class="subtitle-input" placeholder="请在此输入字幕..." style="width: 100%; height: 100%; resize: none; box-sizing: border-box;"></textarea>
        `;
        trackContent.appendChild(subtitleContainer);
    
        // 添加字幕输入事件监听
        const textarea = subtitleContainer.querySelector('.subtitle-input');
        textarea.addEventListener('input', function() {
            // 获取当前选中的PPT页面索引
            const currentIndex = getCurrentPPTIndex();
            if (currentIndex !== -1) {
                // 更新字幕内容
                const newText = this.value || '字幕在此显示';
                subtitles[currentIndex] = this.value;
                
                // 只有当文本真正改变时才更新DOM，避免不必要的重渲染
                if (lastSubtitleText !== newText) {
                    watermark.textContent = newText;
                    lastSubtitleText = newText;
                }
            }
        });
    }

    // 更新字幕输入区域的内容
    function updateSubtitleInput(index) {
        const textarea = document.querySelector('.subtitle-input');
        if (textarea) {
            const subtitleText = subtitles[index] || '';
            textarea.value = subtitleText;
            
            // 同时更新字幕显示和lastSubtitleText变量
            const displayText = subtitleText || '字幕在此显示';
            if (lastSubtitleText !== displayText) {
                watermark.textContent = displayText;
                lastSubtitleText = displayText;
            }
        }
    }

    // 获取当前选中的PPT页面索引
    function getCurrentPPTIndex() {
        const pptDisplay = document.querySelector('.ppt-display img');
        if (pptDisplay) {
            const alt = pptDisplay.getAttribute('alt');
            const match = alt.match(/PPT页面 (\d+)/);
            if (match) {
                return parseInt(match[1]) - 1;
            }
        }
        return -1;
    }

    // 创建字幕输入区域
    createSubtitleInput();

    // 创建提示对话框
    function createModal(title, message) {
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.style.position = 'fixed';
        modal.style.top = '0';
        modal.style.left = '0';
        modal.style.width = '100%';
        modal.style.height = '100%';
        modal.style.backgroundColor = 'rgba(0,0,0,0.5)';
        modal.style.display = 'flex';
        modal.style.justifyContent = 'center';
        modal.style.alignItems = 'center';
        modal.style.zIndex = '1000';
        
        const modalContent = document.createElement('div');
        modalContent.className = 'modal-content';
        modalContent.style.backgroundColor = 'white';
        modalContent.style.padding = '20px';
        modalContent.style.borderRadius = '5px';
        modalContent.style.maxWidth = '500px';
        modalContent.style.width = '80%';
        
        const modalHeader = document.createElement('div');
        modalHeader.className = 'modal-header';
        modalHeader.style.borderBottom = '1px solid #eee';
        modalHeader.style.marginBottom = '15px';
        modalHeader.style.paddingBottom = '10px';
        
        const modalTitle = document.createElement('h3');
        modalTitle.textContent = title;
        modalTitle.style.margin = '0';
        
        const modalBody = document.createElement('div');
        modalBody.className = 'modal-body';
        modalBody.innerHTML = message;
        
        const modalFooter = document.createElement('div');
        modalFooter.className = 'modal-footer';
        modalFooter.style.marginTop = '15px';
        modalFooter.style.paddingTop = '10px';
        modalFooter.style.borderTop = '1px solid #eee';
        modalFooter.style.textAlign = 'right';
        
        const closeBtn = document.createElement('button');
        closeBtn.textContent = '关闭';
        closeBtn.style.padding = '6px 12px';
        closeBtn.style.backgroundColor = '#6c757d';
        closeBtn.style.color = 'white';
        closeBtn.style.border = 'none';
        closeBtn.style.borderRadius = '4px';
        closeBtn.style.cursor = 'pointer';
        
        closeBtn.addEventListener('click', function() {
            document.body.removeChild(modal);
        });
        
        modalHeader.appendChild(modalTitle);
        modalFooter.appendChild(closeBtn);
        
        modalContent.appendChild(modalHeader);
        modalContent.appendChild(modalBody);
        modalContent.appendChild(modalFooter);
        
        modal.appendChild(modalContent);
        document.body.appendChild(modal);
        
        return modal;
    }

    // 为顶部工具栏中的生成视频按钮添加事件监听
    const generateVideoBtn = document.querySelector('.tool-btn.generate');
    if (generateVideoBtn) {
        generateVideoBtn.addEventListener('click', async function(e) {
            // 阻止默认行为，防止表单提交和页面刷新
            e.preventDefault();
            
            console.log('生成视频按钮被点击');
            try {
                // 获取当前显示的PPT图片
                const pptDisplay = document.querySelector('.ppt-display img');
                if (!pptDisplay) {
                    alert('请先选择PPT页面!');
                    return;
                }
                
                // 获取当前图片的base64数据
                const imageUrl = pptDisplay.src;
                const imageBase64 = imageUrl.split(',')[1]; // 提取base64部分
                
                // 获取用户输入的字幕
                const subtitle = document.querySelector('.subtitle-input').value;
                if (!subtitle || subtitle.trim() === '') {
                    alert('请输入字幕内容!');
                    return;
                }
                
                // 创建处理中的提示模态框
                const processingModal = createModal('生成中', '<p>正在生成视频，请稍候...</p><div class="progress-bar" style="width:100%;height:20px;background-color:#eee;border-radius:10px;margin-top:15px;"><div class="progress" style="width:0%;height:100%;background-color:#4CAF50;border-radius:10px;"></div></div>');
                const progressBar = processingModal.querySelector('.progress');
                
                // 发送请求到后端生成TTS
                const response = await axios.post('http://127.0.0.1:8000/api/v1/teaching/generate-video', {
                    subtitle: subtitle,
                    image_base64: imageBase64
                });

                // 更新进度条显示处理中
                progressBar.style.width = '100%';

                if (response.data.code === 200) {
                    // 保存任务ID，以供下载功能使用
                    window.currentVideoTaskId = response.data.task_id;
                    localStorage.setItem('currentVideoTaskId', response.data.task_id);
                    
                    // 关闭处理模态框
                    document.body.removeChild(processingModal);
                    
                    // 显示成功信息，修改下载链接的行为，避免页面跳转
                    const successModal = createModal('生成成功', `
                        <p>视频生成成功!</p>
                        <button id="downloadVideoBtn" style="display:inline-block;margin-top:10px;padding:6px 12px;background-color:#4CAF50;color:white;text-decoration:none;border-radius:4px;border:none;cursor:pointer;">下载视频</button>
                    `);
                    
                    // 为下载按钮添加点击事件
                    const downloadBtn = successModal.querySelector('#downloadVideoBtn');
                    if (downloadBtn) {
                        downloadBtn.addEventListener('click', function(e) {
                            e.preventDefault();
                            // 使用新窗口下载，避免页面跳转
                            window.open(`http://127.0.0.1:8000/api/v1/teaching/download-video/${response.data.task_id}`, '_blank');
                        });
                    }
                } else {
                    // 关闭处理模态框
                    document.body.removeChild(processingModal);
                    
                    // 显示错误信息
                    alert('提交视频生成请求失败: ' + response.data.message);
                }
                
            } catch (error) {
                alert('生成视频失败: ' + (error.response?.data?.detail || error.message));
            }
        });
    }

    // 加载数字人和背景图片
    loadAvatarsAndBackgrounds();

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
    
    // 添加条件检查，确保元素存在才添加事件监听器
    if (expandBtn) {
        expandBtn.addEventListener('click', function() {
            if (!timeline.classList.contains('expanded')) {
                // 展开时初始化轨道
                initTracks();
                timeline.classList.add('expanded');
                this.classList.add('expanded');
                // 确保btnText存在
                const btnText = this.querySelector('.btn-text') || this;
                if (btnText) {
                    btnText.textContent = '收起轨道';
                }
            } else {
                // 收起时恢复原始时间轴
                timeline.classList.remove('expanded');
                this.classList.remove('expanded');
                // 确保btnText存在
                const btnText = this.querySelector('.btn-text') || this;
                if (btnText) {
                    btnText.textContent = '展开轨道';
                }
                if (timelineTracks) {
                    timelineTracks.innerHTML = ''; // 清空轨道内容
                }
            }
        });
    }

    // 获取下载按钮元素
    const downloadBtn = document.querySelector('.tool-btn.download');
    
    // 添加点击事件监听器
    if (downloadBtn) {
        downloadBtn.addEventListener('click', downloadVideo);
    }
});

// 下载视频函数
function downloadVideo() {
    // 获取当前正在处理或已完成的任务ID
    const taskId = getCurrentTaskId();
    
    if (!taskId) {
        showMessage('没有可下载的视频，请先生成视频');
        return;
    }
    
    // 构建下载视频的API URL
    const baseURL = 'http://127.0.0.1:8000'; // 确保API基础URL正确
    const downloadUrl = `${baseURL}/api/v1/teaching/download-video/${taskId}`;
    
    // 显示下载中提示
    showMessage('正在准备下载...');
    
    // 使用fetch API检查视频是否准备好
    fetch(`${baseURL}/api/v1/teaching/video-status/${taskId}`)
        .then(response => {
            if (!response.ok) {
                throw new Error('获取视频状态失败');
            }
            return response.json();
        })
        .then(data => {
            if (data.status === 'completed') {
                // 创建一个隐藏的a标签来下载文件
                const a = document.createElement('a');
                a.style.display = 'none';
                a.href = downloadUrl;
                a.download = `teaching_video_${taskId}.mp4`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                
                showMessage('视频下载已开始');
            } else if (data.status === 'failed') {
                showMessage(`视频生成失败: ${data.error || '未知错误'}`);
            } else {
                showMessage(`视频尚未准备好，当前状态: ${data.status}`);
            }
        })
        .catch(error => {
            console.error('下载视频失败:', error);
            showMessage('获取视频状态失败，请稍后重试');
        });
}

// 获取当前任务ID的函数
function getCurrentTaskId() {
    // 尝试从多个可能的位置获取任务ID
    return window.currentVideoTaskId || 
           localStorage.getItem('currentVideoTaskId') || 
           sessionStorage.getItem('currentVideoTaskId');
}

// 显示消息的辅助函数
function showMessage(message) {
    // 如果页面中存在toast组件，则优先使用toast显示消息
    if (typeof toast === 'function') {
        toast(message);
    } else {
        // 否则使用alert
        alert(message);
    }
}

// 加载数字人和背景图片的函数
function loadAvatarsAndBackgrounds() {
    const avatarContainer = document.querySelector('.avatar-panel .avatar-list');
    const bgContainer = document.querySelector('.background-panel .background-list');
    
    // 创建加载提示
    const createLoadingIndicator = (container, text) => {
        const loadingDiv = document.createElement('div');
        loadingDiv.className = 'loading-indicator';
        loadingDiv.textContent = text;
        container.appendChild(loadingDiv);
        return loadingDiv;
    };
    
    // 清空并显示加载中 - 数字人部分
    if (avatarContainer) {
        avatarContainer.innerHTML = '';
        const avatarLoading = createLoadingIndicator(avatarContainer, '正在加载数字人...');
        
        // 从本地文件夹加载数字人
        const avatars = [
            { name: '女老师', path: 'assets/images/avatar/teacher.png' },
            { name: '雷军', path: 'assets/images/avatar/leijun.webp' }
        ];
        
        // 移除加载提示
        avatarLoading.remove();
        
        // 遍历数字人数据并创建元素
        avatars.forEach(avatar => {
            const avatarItem = document.createElement('div');
            avatarItem.className = 'avatar-item';
            avatarItem.innerHTML = `
                <img src="${avatar.path}" alt="${avatar.name}">
                <p class="avatar-name">${avatar.name}</p>
            `;
            
            // 添加点击事件，选中数字人
            avatarItem.addEventListener('click', function() {
                document.querySelectorAll('.avatar-item').forEach(item => {
                    item.classList.remove('selected');
                });
                this.classList.add('selected');
                
                // 在中央区域显示选中的数字人（可选）
                const videoContainer = document.querySelector('.video-container');
                if (videoContainer) {
                    // 检查是否已存在数字人元素
                    let avatarDisplay = videoContainer.querySelector('.avatar-display');
                    if (!avatarDisplay) {
                        avatarDisplay = document.createElement('div');
                        avatarDisplay.className = 'avatar-display';
                        // 根据需要调整层级顺序，确保数字人显示在正确的位置
                        videoContainer.appendChild(avatarDisplay);
                    }
                    
                    // 设置数字人显示
                    avatarDisplay.innerHTML = `<img src="${avatar.path}" alt="${avatar.name}" class="avatar-display-image">`;
                }
            });
            
            avatarContainer.appendChild(avatarItem);
        });
    }
    
    // 获取背景图片列表
    if (bgContainer) {
        bgContainer.innerHTML = '';
        const bgLoading = createLoadingIndicator(bgContainer, '正在加载背景...');
        
        // 从本地文件夹加载背景图片
        const backgrounds = [
            { name: '简约1', path: 'assets/images/bg/bg1.jpg' },
            { name: '简约2', path: 'assets/images/bg/bg2.jpg' }
        ];
        
        // 移除加载提示
        bgLoading.remove();
        
        // 遍历背景数据并创建元素
        backgrounds.forEach(bg => {
            const bgItem = document.createElement('div');
            bgItem.className = 'background-item';
            bgItem.innerHTML = `
                <img src="${bg.path}" alt="${bg.name}">
                <p class="bg-name">${bg.name}</p>
            `;
            
            // 添加点击事件，选中背景
            bgItem.addEventListener('click', function() {
                document.querySelectorAll('.background-item').forEach(item => {
                    item.classList.remove('selected');
                });
                this.classList.add('selected');
                
                // 在视频容器中应用背景
                const videoContainer = document.querySelector('.video-container');
                if (videoContainer) {
                    videoContainer.style.backgroundImage = `url(${bg.path})`;
                    videoContainer.style.backgroundSize = 'cover';
                    videoContainer.style.backgroundPosition = 'center';
                }
            });
            
            bgContainer.appendChild(bgItem);
        });
    }
}

// 确保定义了API基础URL
const API_BASE_URL = window.API_BASE_URL || '';
