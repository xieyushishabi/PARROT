document.addEventListener('DOMContentLoaded', function() {
    // 获取DOM元素
    const playButton = document.querySelector('.control-btn.play');
    const timeDisplay = document.querySelector('.time-display');
    const aspectRatioSelect = document.querySelector('.aspect-ratio select');
    const resolutionSelect = document.querySelector('.resolution select');
    const bitrateSelect = document.querySelector('.bitrate select');
    
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
    importBtn.addEventListener('click', function() {
        // 创建文件输入元素
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.ppt,.pptx';
        input.multiple = false;
        
        input.addEventListener('change', function(e) {
            if (e.target.files.length > 0) {
                const file = e.target.files[0];
                console.log('Selected file:', file.name);
                // 这里添加处理PPT文件的逻辑
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