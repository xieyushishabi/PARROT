document.addEventListener('DOMContentLoaded', function() {
    // 获取筛选和搜索元素
    const sortSelect = document.getElementById('sortSelect');
    const languageSelect = document.getElementById('languageSelect');
    const searchInput = document.getElementById('searchInput');
    const searchBtn = document.querySelector('.search-btn');

    // 创建声音项元素
    function createVoiceItem(voice) {
        const voiceItem = document.createElement('div');
        voiceItem.className = 'voice-item';
        
        voiceItem.innerHTML = `
            <div class="voice-avatar">
                <img src="${voice.voiceAvatar}" alt="${voice.title}">
            </div>
            <div class="voice-info">
                <div class="voice-title">
                    ${voice.title}
                </div>
                <div class="voice-author">
                    <img class="author-avatar" src="assets/images/avatar-default.png" alt="${voice.authorName}">
                    <span class="author-name">${voice.authorName}</span>
                    <span class="voice-date">${voice.date}</span>
                </div>
                <div class="voice-preview">
                    ${voice.preview}
                </div>
                <div class="voice-actions">
                    <button class="use-voice-btn">使用声音</button>
                    <div class="action-buttons-group">
                        <button class="action-btn play-btn" data-playing="false">
                            <img src="assets/icons/play.png" alt="播放">
                            <span>${voice.playCount}</span>
                        </button>
                        <button class="action-btn like-btn" data-liked="false">
                            <img src="assets/icons/like.png" alt="点赞">
                            <span>${voice.likeCount}</span>
                        </button>
                        <button class="action-btn collect-btn" data-collected="false">
                            <img src="assets/icons/collect.png" alt="收藏">
                            <span>${voice.collectCount}</span>
                        </button>
                    </div>
                </div>
            </div>
        `;

        // 添加点击事件处理
        const playBtn = voiceItem.querySelector('.play-btn');
        const likeBtn = voiceItem.querySelector('.like-btn');
        const collectBtn = voiceItem.querySelector('.collect-btn');

        // 播放按钮点击事件
        playBtn.addEventListener('click', function() {
            const isPlaying = this.dataset.playing === 'true';
            const img = this.querySelector('img');
            if (isPlaying) {
                img.src = 'assets/icons/play.png';
                this.dataset.playing = 'false';
            } else {
                img.src = 'assets/icons/playing.png';
                this.dataset.playing = 'true';
            }
        });

        // 点赞按钮点击事件
        likeBtn.addEventListener('click', function() {
            const isLiked = this.dataset.liked === 'true';
            const img = this.querySelector('img');
            const count = this.querySelector('span');
            if (isLiked) {
                img.src = 'assets/icons/like.png';
                this.dataset.liked = 'false';
                count.textContent = parseInt(count.textContent) - 1;
            } else {
                img.src = 'assets/icons/liked.png';
                this.dataset.liked = 'true';
                count.textContent = parseInt(count.textContent) + 1;
            }
        });

        // 收藏按钮点击事件
        collectBtn.addEventListener('click', function() {
            const isCollected = this.dataset.collected === 'true';
            const img = this.querySelector('img');
            const count = this.querySelector('span');
            if (isCollected) {
                img.src = 'assets/icons/collect.png';
                this.dataset.collected = 'false';
                count.textContent = parseInt(count.textContent) - 1;
            } else {
                img.src = 'assets/icons/collected.png';
                this.dataset.collected = 'true';
                count.textContent = parseInt(count.textContent) + 1;
            }
        });

        return voiceItem;
    }

    // 创建最佳声音项元素
    function createBestVoiceItem(voice, rank) {
        const voiceItem = document.createElement('div');
        voiceItem.className = 'best-voice-item';
        
        voiceItem.innerHTML = `
            <div class="best-voice-rank">0${rank}</div>
            <div class="best-voice-avatar">
                <img src="${voice.voiceAvatar}" alt="${voice.title}">
            </div>
            <div class="best-voice-info">
                <div class="best-voice-title">${voice.title}</div>
                <div class="best-voice-author">
                    <img src="assets/images/avatar-default.png" alt="${voice.authorName}" style="width: 20px; height: 20px; border-radius: 50%;">
                    <span>${voice.authorName}</span>
                </div>
                <div class="best-voice-likes">
                    <i class="iconfont icon-like"></i>
                    <span>${voice.likeCount}</span>
                </div>
            </div>
        `;
        
        return voiceItem;
    }

    // 加载声音列表
    function loadVoiceList(params = {}) {
        // 模拟API数据
        const mockData = [
            {
                voiceAvatar: 'assets/images/avatars/刘德华',
                title: '刘德华',
                authorName: '音色达人',
                date: '2025/1/22',
                preview: '华仔经典音色，完美还原温柔磁性的嗓音特点，适合演绎情歌和抒情歌曲。',
                playCount: 2131,
                likeCount: 2131,
                collectCount: 2131
            },
            {
                voiceAvatar: 'assets/images/avatars/张学友.jpeg',
                title: '张学友',
                authorName: '声音工匠',
                date: '2025/1/22',
                preview: '学友天王的标志性声线，高音清亮，情感细腻，是演绎经典粤语歌曲的理想选择。',
                playCount: 1988,
                likeCount: 1988,
                collectCount: 1988
            },
            {
                voiceAvatar: 'assets/images/avatars/周杰伦',
                title: '周杰伦',
                authorName: '配音专家',
                date: '2025/1/22',
                preview: '周董独特的音色，完美还原中国风说唱特色，带有标志性的慵懒感和韵律感。',
                playCount: 1856,
                likeCount: 1856,
                collectCount: 1856
            },
            {
                voiceAvatar: 'assets/images/avatars/陈奕迅',
                title: '陈奕迅',
                authorName: '音乐匠人',
                date: '2025/1/22',
                preview: 'Eason独特的沙哑声线，情感真挚饱满，特别适合演绎都市情歌和感性歌曲。',
                playCount: 1723,
                likeCount: 1723,
                collectCount: 1723
            }
        ];

        updateVoiceList(mockData);
    }

    // 更新声音列表显示
    function updateVoiceList(data) {
        const voiceList = document.querySelector('.voice-list');
        voiceList.innerHTML = '';
        
        data.forEach(voice => {
            const voiceItem = createVoiceItem(voice);
            voiceList.appendChild(voiceItem);
        });
    }

    // 加载最佳声音列表
    function loadBestVoices() {
        // 模拟API数据
        const mockData = [
            {
                voiceAvatar: 'assets/images/avatars/刘德华',
                title: '刘德华',
                authorName: '音色达人',
                likeCount: 2131
            },
            {
                voiceAvatar: 'assets/images/avatars/张学友.jpeg',
                title: '张学友',
                authorName: '声音工匠',
                likeCount: 1988
            },
            {
                voiceAvatar: 'assets/images/avatars/周杰伦',
                title: '周杰伦',
                authorName: '配音专家',
                likeCount: 1856
            }
        ];

        updateBestVoices(mockData);
    }

    // 更新最佳声音列表显示
    function updateBestVoices(data) {
        const bestVoiceList = document.querySelector('.best-voice-list');
        bestVoiceList.innerHTML = '';
        
        data.forEach((voice, index) => {
            const voiceItem = createBestVoiceItem(voice, index + 1);
            bestVoiceList.appendChild(voiceItem);
        });
    }

    // 事件监听器
    sortSelect.addEventListener('change', function() {
        loadVoiceList({ sort: this.value });
    });

    languageSelect.addEventListener('change', function() {
        loadVoiceList({ language: this.value });
    });

    searchBtn.addEventListener('click', function() {
        loadVoiceList({ search: searchInput.value });
    });

    // 初始加载
    loadVoiceList();
    loadBestVoices();
});
