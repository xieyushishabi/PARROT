document.addEventListener('DOMContentLoaded', function() {
    // 更新数字统计
    function updateStats() {
        const textarea = document.querySelector('.text-editor-container textarea');
        if (!textarea) return;
        
        const text = textarea.value;
        const wordCount = text.length;
        const wordCountElement = document.querySelector('.word-count');
        const durationElement = document.querySelector('.duration');
        
        if (wordCountElement) {
            wordCountElement.textContent = `字数统计 ${wordCount}/8000`;
        }
        
        if (durationElement) {
            // 计算预估时长 (每个字3秒)
            const totalSeconds = wordCount * 3;
            const minutes = Math.floor(totalSeconds / 60);
            const seconds = totalSeconds % 60;
            const duration = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
            durationElement.textContent = `预估时长 ${duration}`;
        }
        
        // 如果超过字数限制，显示提示
        const wordLimitTip = document.querySelector('.word-limit-tip');
        if (wordLimitTip) {
            if (wordCount >= 8000) {
                wordLimitTip.style.display = 'block';
                textarea.value = text.slice(0, 8000);
            } else {
                wordLimitTip.style.display = 'none';
            }
        }
    }

    // 音色数据
    const voices = [
        
        {
            id: 1,
            name: "刘德华",
            avatar: "assets/images/avatars/刘德华",
            description: "华仔经典音色，温柔磁性，适合演绎情歌和抒情歌曲",
            tags: ["磁性", "温柔", "经典"],
            popular: 3421,
            type: "male"
        },
        {
            id: 2,
            name: "张学友",
            avatar: "assets/images/avatars/张学友.jpeg",
            description: "学友天王的标志性声线，高音清亮，情感细腻",
            tags: ["高音", "情感", "细腻"],
            popular: 3156,
            type: "male"
        },
        {
            id: 3,
            name: "周杰伦",
            avatar: "assets/images/avatars/周杰伦",
            description: "周董独特的音色，中国风说唱特色，慵懒感和韵律感",
            tags: ["特色", "慵懒", "韵律"],
            popular: 3789,
            type: "male"
        },
        {
            id: 4,
            name: "陈奕迅",
            avatar: "assets/images/avatars/陈奕迅",
            description: "Eason独特的沙哑声线，情感真挚饱满，都市情歌",
            tags: ["沙哑", "情感", "都市"],
            popular: 3567,
            type: "male"
        }
    ];

    // 创建音色卡片
    function createVoiceCard(voice) {
        return `
            <div class="voice-card" data-voice-id="${voice.id}">
                <div class="voice-avatar">
                    <img src="${voice.avatar}" alt="${voice.name}">
                </div>
                <div class="voice-info">
                    <h3 class="voice-name">${voice.name}</h3>
                    <p class="voice-description">${voice.description}</p>
                    <div class="voice-tags">
                        ${voice.tags.map(tag => `<span class="tag">${tag}</span>`).join('')}
                    </div>
                    <div class="voice-stats">
                        <span class="popular-count">
                            <i class="iconfont icon-fire"></i>
                            ${voice.popular}
                        </span>
                    </div>
                </div>
            </div>
        `;
    }

    // 渲染音色列表
    function renderVoiceList() {
        const voiceContainer = document.querySelector('.voice-list');
        if (voiceContainer) {
            voiceContainer.innerHTML = voices.map(voice => createVoiceCard(voice)).join('');
            
            // 添加点击事件
            document.querySelectorAll('.voice-card').forEach(card => {
                card.addEventListener('click', function() {
                    const voiceId = this.dataset.voiceId;
                    const selectedVoice = voices.find(v => v.id === parseInt(voiceId));
                    if (selectedVoice) {
                        // 移除其他卡片的选中状态
                        document.querySelectorAll('.voice-card').forEach(c => {
                            c.classList.remove('selected');
                        });
                        // 添加选中状态
                        this.classList.add('selected');
                        // 这里可以添加选择音色后的其他操作
                    }
                });
            });
        }
    }

    // 初始化
    renderVoiceList();
    
    // 添加文本框事件监听
    const textarea = document.querySelector('.text-editor-container textarea');
    if (textarea) {
        textarea.addEventListener('input', updateStats);
        // 初始化统计
        updateStats();
    }
});
