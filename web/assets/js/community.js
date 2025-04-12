document.addEventListener('DOMContentLoaded', function(event) {

    // 定义 baseURL，与 auth.js 保持一致
    const baseURL = 'http://127.0.0.1:8000';
    
    // 获取用户 token 用于授权头
    function getAuthToken() {
        const currentUser = localStorage.getItem('currentUser');
        if (currentUser) {
            try {
                const userData = JSON.parse(currentUser);
                return userData.token;
            } catch (e) {
                console.error('解析用户数据失败:', e);
            }
        }
        return null;
    }
    
    // 创建axios配置
    function createAxiosConfig() {
        const config = {
            headers: {
                'Content-Type': 'application/json'
            },
            withCredentials: true
        };
        
        const token = getAuthToken();
        if (token) {
            config.headers['Authorization'] = `Bearer ${token}`;
        }
        
        return config;
    }
    // 获取筛选和搜索元素
    const sortSelect = document.getElementById('sortSelect');
    const languageSelect = document.getElementById('languageSelect');
    const searchInput = document.getElementById('searchInput');
    const searchBtn = document.querySelector('.search-btn');

    // 当前页码和每页显示数量
    let currentPage = 1;
    const itemsPerPage = 10;

    // 创建声音项元素
    function createVoiceItem(voice) {
        const voiceItem = document.createElement('div');
        voiceItem.className = 'voice-item';
        
        // 使用Base64数据或回退到URL路径
        const voiceImageSrc = voice.voiceAvatarData 
            ? `data:image/jpeg;base64,${voice.voiceAvatarData}` 
            : (voice.voiceAvatar.startsWith('/') 
                ? baseURL + voice.voiceAvatar 
                : voice.voiceAvatar);
        
        const authorImageSrc = voice.authorAvatarData 
            ? `data:image/jpeg;base64,${voice.authorAvatarData}` 
            : (voice.authorAvatar && voice.authorAvatar.startsWith('/') 
                ? baseURL + voice.authorAvatar 
                : 'assets/images/avatar-default.png');
        voiceItem.innerHTML = `
            <div class="voice-avatar">
                <img src="${voiceImageSrc}" alt="${voice.title}" onerror="this.src='assets/images/model-preview.png'">
            </div>
            <div class="voice-info">
                <div class="voice-title">
                    ${voice.title}
                </div>
                <div class="voice-author">
                    <img class="author-avatar" src="${authorImageSrc}" alt="${voice.authorName}" onerror="this.src='assets/images/avatar-default.png'">
                    <span class="author-name">${voice.authorName}</span>
                    <span class="voice-date">${voice.date}</span>
                </div>
                <div class="voice-preview">
                    ${voice.preview}
                </div>
                <div class="voice-actions">
                    <button class="use-voice-btn" data-id="${voice.id}">使用声音</button>
                    <div class="action-buttons-group">
                        <button class="action-btn play-btn" data-id="${voice.id}" data-playing="false">
                            <img src="assets/icons/play.png" alt="播放">
                            <span>${voice.playCount}</span>
                        </button>
                        <button class="action-btn like-btn" data-id="${voice.id}" data-liked="${voice.isLiked || false}">
                            <img src="${voice.isLiked ? 'assets/icons/liked.png' : 'assets/icons/like.png'}" alt="点赞">
                            <span>${voice.likeCount}</span>
                        </button>
                        <button class="action-btn collect-btn" data-id="${voice.id}" data-collected="${voice.isCollected || false}">
                            <img src="${voice.isCollected ? 'assets/icons/collected.png' : 'assets/icons/collect.png'}" alt="收藏">
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
        const useVoiceBtn = voiceItem.querySelector('.use-voice-btn');

        // 播放按钮点击事件
        playBtn.addEventListener('click', async function(event) {
            // 确保阻止默认行为
            event.preventDefault();
            event.stopPropagation(); // 阻止事件冒泡

            const voiceId = this.dataset.id;
            const isPlaying = this.dataset.playing === 'true';
            const img = this.querySelector('img');
            
            // 停止所有其他正在播放的音频
            document.querySelectorAll('.play-btn[data-playing="true"]').forEach(btn => {
                if (btn !== this) {
                    btn.dataset.playing = 'false';
                    btn.querySelector('img').src = 'assets/icons/play.png';
                    if (window.currentAudio) {
                        window.currentAudio.pause();
                    }
                }
            });
            
            if (isPlaying) {
                // 暂停播放
                img.src = 'assets/icons/play.png';
                this.dataset.playing = 'false';
                if (window.currentAudio) {
                    window.currentAudio.pause();
                }
            } else {
                // 开始播放
                img.src = 'assets/icons/playing.png';
                this.dataset.playing = 'true';
                
                // 创建新的音频对象
                if (window.currentAudio) {
                    window.currentAudio.pause();
                }
                
                // 立即更新播放次数UI
                const countSpan = this.querySelector('span');
                const currentCount = parseInt(countSpan.textContent);
                countSpan.textContent = currentCount + 1;
                
                // 调用增加播放次数的API
                try {
                    const playResponse = await axios.post(`${baseURL}/api/v1/community/voices/${voiceId}/play`, {}, createAxiosConfig());
                    console.log('Response data:', playResponse.data);

                    // 如果API返回的播放次数与预期不符，则使用服务器返回的值
                    if (playResponse.data && playResponse.data.playCount !== undefined && playResponse.data.playCount !== currentCount + 1) {
                        countSpan.textContent = playResponse.data.playCount;
                    }
                } catch (error) {
                    console.error('增加播放次数失败:', error);
                    // 如果API请求失败，恢复原始播放次数
                    countSpan.textContent = currentCount;
                }
                
                // 直接获取并播放音频，不依赖上面的请求
                const audioUrl = `${baseURL}/api/v1/community/voices/${voiceId}/audio`;
                window.currentAudio = new Audio();
                
                // 添加错误处理
                window.currentAudio.onerror = function() {
                    console.error('音频加载失败');
                    img.src = 'assets/icons/play.png';
                    playBtn.dataset.playing = 'false';
                    alert('音频加载失败，请稍后重试');
                };

                console.log('音频URL:', audioUrl);
                
                // 获取音频数据
                try {
                    const audioResponse = await axios.get(audioUrl, { 
                        ...createAxiosConfig(),
                        responseType: 'blob',
                    });
                    const audioObjectUrl = URL.createObjectURL(audioResponse.data);
                    console.log(audioResponse.data, audioObjectUrl);

                    window.currentAudio.src = audioObjectUrl;
                    try {
                        await window.currentAudio.play();
                    } catch (playErr) {
                        console.error('播放音频失败:', playErr);
                        img.src = 'assets/icons/play.png';
                        playBtn.dataset.playing = 'false';
                    }
                } catch (error) {
                    console.error('加载音频失败:', error);
                    img.src = 'assets/icons/play.png';
                    playBtn.dataset.playing = 'false';
                    alert('加载音频失败，请稍后重试');
                }
                
                // 播放完成后重置按钮状态
                window.currentAudio.onended = function() {
                    img.src = 'assets/icons/play.png';
                    playBtn.dataset.playing = 'false';
                };
            }
            
            // 返回false阻止默认行为，防止页面刷新
            return false;
        });

        // 点赞按钮点击事件
        likeBtn.addEventListener('click', function(event) {
            // 阻止默认行为和事件冒泡
            event.preventDefault();
            event.stopPropagation();
            
            const voiceId = this.dataset.id;
            const isLiked = this.dataset.liked === 'true';
            const img = this.querySelector('img');
            const count = this.querySelector('span');
            
            // 检查用户是否登录 - 使用同步函数
            const isLoggedIn = checkLoginStatus();
            console.log('用户登录状态:', isLoggedIn);
            if (!isLoggedIn) {
                alert('请先登录后再进行点赞操作');
                return false;
            }
            
            // 立即更新UI，提供即时反馈
            const newLikedState = !isLiked;
            this.dataset.liked = newLikedState.toString();
            img.src = newLikedState ? 'assets/icons/liked.png' : 'assets/icons/like.png';
            const currentCount = parseInt(count.textContent);
            count.textContent = newLikedState ? (currentCount + 1) : Math.max(0, currentCount - 1);
            
            // 使用axios发送点赞请求，使用异步方式避免页面刷新
            axios.post(`${baseURL}/api/v1/community/voices/${voiceId}/like`, {}, createAxiosConfig())
            .then(response => {
                // 根据实际响应更新UI
                const data = response.data;
                if (data.liked !== newLikedState) {
                    // 如果服务器返回的状态与预期不符，则恢复UI
                    this.dataset.liked = data.liked.toString();
                    img.src = data.liked ? 'assets/icons/liked.png' : 'assets/icons/like.png';
                    count.textContent = data.likeCount;
                } else {
                    // 确保计数与服务器一致
                    count.textContent = data.likeCount;
                }
            })
            .catch(error => {
                console.error('点赞请求出错:', error);
                // 恢复原始状态
                this.dataset.liked = isLiked.toString();
                img.src = isLiked ? 'assets/icons/liked.png' : 'assets/icons/like.png';
                count.textContent = currentCount;
                alert('点赞操作失败，请稍后重试');
            });
            
            // 返回false阻止默认行为
            return false;
        });

        // 收藏按钮点击事件
        collectBtn.addEventListener('click', function(event) {
            // 阻止默认行为和事件冒泡
            event.preventDefault();
            event.stopPropagation();
            
            const voiceId = this.dataset.id;
            const isCollected = this.dataset.collected === 'true';
            const img = this.querySelector('img');
            const count = this.querySelector('span');
            
            // 检查用户是否登录 - 使用同步函数
            const isLoggedIn = checkLoginStatus();
            if (!isLoggedIn) {
                alert('请先登录后再进行收藏操作');
                return false;
            }
            
            // 立即更新UI，提供即时反馈
            const newCollectedState = !isCollected;
            this.dataset.collected = newCollectedState.toString();
            img.src = newCollectedState ? 'assets/icons/collected.png' : 'assets/icons/collect.png';
            const currentCount = parseInt(count.textContent);
            count.textContent = newCollectedState ? (currentCount + 1) : Math.max(0, currentCount - 1);
            
            // 使用axios发送收藏请求，使用异步方式避免页面刷新
            axios.post(`${baseURL}/api/v1/community/voices/${voiceId}/collect`, {}, createAxiosConfig())
            .then(response => {
                // 更新UI - 只更新当前按钮和计数，不刷新整个列表
                const data = response.data;
                if (data.collected !== newCollectedState) {
                    // 如果服务器返回的状态与预期不符，则恢复UI
                    this.dataset.collected = data.collected.toString();
                    img.src = data.collected ? 'assets/icons/collected.png' : 'assets/icons/collect.png';
                    count.textContent = data.collectCount;
                } else {
                    // 确保计数与服务器一致
                    count.textContent = data.collectCount;
                }
            })
            .catch(error => {
                console.error('收藏请求出错:', error);
                // 恢复原始状态
                this.dataset.collected = isCollected.toString();
                img.src = isCollected ? 'assets/icons/collected.png' : 'assets/icons/collect.png';
                count.textContent = currentCount;
                alert('收藏操作失败，请稍后重试');
            });
            
            // 返回false阻止默认行为
            return false;
        });
        
        // 使用声音按钮点击事件
        useVoiceBtn.addEventListener('click', function() {
            const voiceId = this.dataset.id;
            
            // 使用axios发送使用声音请求
            axios.get(`${baseURL}/api/v1/community/voices/${voiceId}/use`, createAxiosConfig())
            .then(response => {
                // 跳转到配音界面，带上声音参数
                window.location.href = response.data.redirect_url;
            })
            .catch(error => {
                console.error('使用声音请求出错:', error);
                alert('使用此声音失败，请稍后重试');
            });
        });

        return voiceItem;
    }

    // 创建最佳声音项元素
    function createBestVoiceItem(voice, rank) {
        const voiceItem = document.createElement('div');
        voiceItem.className = 'best-voice-item';
        
        // 使用Base64数据或回退到URL路径
        const voiceImageSrc = voice.voiceAvatarData 
            ? `data:image/jpeg;base64,${voice.voiceAvatarData}` 
            : (voice.voiceAvatar.startsWith('/') 
                ? baseURL + voice.voiceAvatar 
                : voice.voiceAvatar);
        
        const authorImageSrc = voice.authorAvatarData 
            ? `data:image/jpeg;base64,${voice.authorAvatarData}` 
            : (voice.authorAvatar && voice.authorAvatar.startsWith('/') 
                ? baseURL + voice.authorAvatar 
                : 'assets/images/avatar-default.png');
        
        voiceItem.innerHTML = `
            <div class="best-voice-rank">0${rank}</div>
            <div class="best-voice-avatar">
                <img src="${voiceImageSrc}" alt="${voice.title}" onerror="this.src='assets/images/model-preview.png'">
            </div>
            <div class="best-voice-info">
                <div class="best-voice-title">${voice.title}</div>
                <div class="best-voice-author">
                    <img src="${authorImageSrc}" alt="${voice.authorName}" style="width: 20px; height: 20px; border-radius: 50%;" onerror="this.src='assets/images/avatar-default.png'">
                    <span>${voice.authorName}</span>
                </div>
                <div class="best-voice-likes">
                    <i class="iconfont icon-like"></i>
                    <span>${voice.likeCount}</span>
                </div>
            </div>
        `;
        
        // 添加点击事件 - 点击后跳转到使用该声音
        voiceItem.addEventListener('click', function() {
            axios.get(`${baseURL}/api/v1/community/voices/${voice.id}/use`, createAxiosConfig())
            .then(response => {
                window.location.href = response.data.redirect_url;
            })
            .catch(error => {
                console.error('使用声音请求出错:', error);
                alert('使用此声音失败，请稍后重试');
            });
        });
        
        return voiceItem;
    }

    // 加载声音列表
    function loadVoiceList(params = {}) {
        // 构建查询参数
        const queryParams = new URLSearchParams();
        
        if (params.sort) queryParams.append('sort', params.sort);
        if (params.language) queryParams.append('language', params.language);
        if (params.search) queryParams.append('search', params.search);
        
        // 发起API请求
        axios.get(`${baseURL}/api/v1/community/voices?${queryParams.toString()}`, createAxiosConfig())
        .then(response => {
            const data = response.data;
            // 获取全部数据
            const allVoices = data.voices;
            
            // 计算分页 - 前端处理分页逻辑
            const totalItems = allVoices.length;
            const totalPages = Math.ceil(totalItems / itemsPerPage);
            
            // 获取当前页的数据
            const startIndex = (currentPage - 1) * itemsPerPage;
            const endIndex = Math.min(startIndex + itemsPerPage, totalItems);
            const currentPageVoices = allVoices.slice(startIndex, endIndex);
            
            // 更新UI
            updateVoiceList(currentPageVoices);
            updatePagination(totalItems, currentPage, totalPages);
        })
        .catch(error => {
            console.error('获取声音列表出错:', error);
            const voiceList = document.querySelector('.voice-list');
            voiceList.innerHTML = '<div class="error-message">加载声音列表失败，请稍后重试</div>';
        });
    }

    // 更新声音列表显示
    function updateVoiceList(voices) {
        const voiceList = document.querySelector('.voice-list');
        voiceList.innerHTML = '';
        
        if (voices.length === 0) {
            voiceList.innerHTML = '<div class="empty-message">未找到符合条件的声音</div>';
            return;
        }
        
        voices.forEach(voice => {
            const voiceItem = createVoiceItem(voice);
            voiceList.appendChild(voiceItem);
        });
    }
    
    // 更新分页显示
    function updatePagination(total, currentPage, totalPages) {
        const paginationContainer = document.querySelector('.pagination-container');
        
        // 如果容器不存在，创建一个
        if (!paginationContainer) {
            const container = document.createElement('div');
            container.className = 'pagination-container';
            document.querySelector('.content-main').appendChild(container);
        }
        
        const pagination = document.querySelector('.pagination-container');
        pagination.innerHTML = '';
        
        // 只有当总页数大于1时才显示分页
        if (totalPages > 1) {
            const paginationHTML = `
                <div class="pagination">
                    <button class="page-btn prev-btn" ${currentPage === 1 ? 'disabled' : ''}>&lt;</button>
                    <div class="page-numbers"></div>
                    <button class="page-btn next-btn" ${currentPage === totalPages ? 'disabled' : ''}>&gt;</button>
                </div>
                <div class="pagination-info">共 ${total} 个声音，${totalPages} 页</div>
            `;
            
            pagination.innerHTML = paginationHTML;
            
            // 添加页码按钮
            const pageNumbers = pagination.querySelector('.page-numbers');
            
            // 确定要显示的页码范围
            let startPage = Math.max(1, currentPage - 2);
            let endPage = Math.min(totalPages, startPage + 4);
            
            // 调整起始页码，确保显示5个页码
            if (endPage - startPage < 4) {
                startPage = Math.max(1, endPage - 4);
            }
            
            // 添加首页
            if (startPage > 1) {
                const firstBtn = document.createElement('button');
                firstBtn.className = 'page-btn';
                firstBtn.textContent = '1';
                firstBtn.addEventListener('click', () => goToPage(1));
                pageNumbers.appendChild(firstBtn);
                
                if (startPage > 2) {
                    const ellipsis = document.createElement('span');
                    ellipsis.className = 'ellipsis';
                    ellipsis.textContent = '...';
                    pageNumbers.appendChild(ellipsis);
                }
            }
            
            // 添加页码按钮
            for (let i = startPage; i <= endPage; i++) {
                const pageBtn = document.createElement('button');
                pageBtn.className = `page-btn ${i === currentPage ? 'active' : ''}`;
                pageBtn.textContent = i;
                pageBtn.addEventListener('click', () => goToPage(i));
                pageNumbers.appendChild(pageBtn);
            }
            
            // 添加末页
            if (endPage < totalPages) {
                if (endPage < totalPages - 1) {
                    const ellipsis = document.createElement('span');
                    ellipsis.className = 'ellipsis';
                    ellipsis.textContent = '...';
                    pageNumbers.appendChild(ellipsis);
                }
                
                const lastBtn = document.createElement('button');
                lastBtn.className = 'page-btn';
                lastBtn.textContent = totalPages;
                lastBtn.addEventListener('click', () => goToPage(totalPages));
                pageNumbers.appendChild(lastBtn);
            }
            
            // 上一页和下一页按钮事件
            const prevBtn = pagination.querySelector('.prev-btn');
            const nextBtn = pagination.querySelector('.next-btn');
            
            prevBtn.addEventListener('click', () => {
                if (currentPage > 1) {
                    goToPage(currentPage - 1);
                }
            });
            
            nextBtn.addEventListener('click', () => {
                if (currentPage < totalPages) {
                    goToPage(currentPage + 1);
                }
            });
        }
    }
    
    // 跳转到指定页
    function goToPage(page) {
        currentPage = page;
        loadVoiceList({
            sort: sortSelect.value,
            language: languageSelect.value,
            search: searchInput.value,
            page: currentPage
        });
    }

    // 加载最佳声音列表
    function loadBestVoices() {
        // 发起API请求
        axios.get(`${baseURL}/api/v1/community/best-voices`, createAxiosConfig())
        .then(response => {
            updateBestVoices(response.data.bestVoices);
        })
        .catch(error => {
            console.error('获取最佳声音列表出错:', error);
            const bestVoiceList = document.querySelector('.best-voice-list');
            bestVoiceList.innerHTML = '<div class="error-message">加载最佳声音失败，请稍后重试</div>';
        });
    }

    // 更新最佳声音列表显示
    function updateBestVoices(voices) {
        const bestVoiceList = document.querySelector('.best-voice-list');
        bestVoiceList.innerHTML = '';
        
        if (voices.length === 0) {
            bestVoiceList.innerHTML = '<div class="empty-message">暂无最佳声音</div>';
            return;
        }
        
        voices.forEach((voice, index) => {
            const voiceItem = createBestVoiceItem(voice, index + 1);
            bestVoiceList.appendChild(voiceItem);
        });
    }
    
    // 检查用户登录状态的函数
    function checkLoginStatus() {
        const currentUser = localStorage.getItem('currentUser');
        if (currentUser) {
            try {
                const userData = JSON.parse(currentUser);
                return !!userData.token; // 如果token存在并且有效，则返回true
            } catch (e) {
                console.error('解析用户数据失败:', e);
                return false;
            }
        }
        return false;
    }

    // 事件监听器
    sortSelect.addEventListener('change', function() {
        currentPage = 1; // 重置为第一页
        loadVoiceList({ sort: this.value, language: languageSelect.value, search: searchInput.value });
    });

    languageSelect.addEventListener('change', function() {
        currentPage = 1; // 重置为第一页
        loadVoiceList({ sort: sortSelect.value, language: this.value, search: searchInput.value });
    });

    searchBtn.addEventListener('click', function() {
        currentPage = 1; // 重置为第一页
        loadVoiceList({ sort: sortSelect.value, language: languageSelect.value, search: searchInput.value });
    });
    
    // 支持按回车键搜索
    searchInput.addEventListener('keypress', function(event) {
        if (event.key === 'Enter') {
            event.preventDefault();
            currentPage = 1; // 重置为第一页
            loadVoiceList({ sort: sortSelect.value, language: languageSelect.value, search: searchInput.value });
        }
    });

    // 初始加载
    loadVoiceList();
    loadBestVoices();
    
    // 添加轮询功能，每小时自动更新一次声音列表
    setInterval(() => {
        console.log('执行定时轮询，更新声音列表');
        loadVoiceList({ 
            sort: sortSelect.value, 
            language: languageSelect.value, 
            search: searchInput.value 
        });
        loadBestVoices();
    }, 60 * 60 * 1000); // 1小时 = 60分钟 * 60秒 * 1000毫秒
});
