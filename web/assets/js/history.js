/**
 * 音频历史记录页面脚本
 */

// API基础URL
const API_BASE_URL = 'http://localhost:8000/api';

// DOM元素
const historyListEl = document.getElementById('historyList');
const loadingHistoryEl = document.getElementById('loadingHistory');
const emptyHistoryEl = document.getElementById('emptyHistory');
const audioPlayerEl = document.getElementById('audioPlayer');
const audioPlayerContainerEl = document.getElementById('audioPlayerContainer');
const closePlayerButtonEl = document.getElementById('closePlayer');
const downloadCurrentAudioButtonEl = document.getElementById('downloadCurrentAudio');
const searchInputEl = document.getElementById('searchInput');
const filterButtonEl = document.getElementById('filterButton');
const filterMenuEl = document.getElementById('filterMenu');
const paginationEl = document.getElementById('pagination');

// 新音频播放器元素
const playPauseButtonEl = document.getElementById('playPauseButton');
const progressCurrentEl = document.getElementById('progressCurrent');
const currentTimeEl = document.getElementById('currentTime');
const totalTimeEl = document.getElementById('totalTime');
const progressBarEl = document.querySelector('.progress-bar');
const currentAudioTitleEl = document.getElementById('currentAudioTitle');
const currentAudioVoiceEl = document.getElementById('currentAudioVoice');

// 状态管理
const state = {
    allRecords: [],  // 所有历史记录
    filteredRecords: [], // 筛选后的记录
    currentFilter: 'all', // 当前筛选状态
    searchQuery: '', // 搜索关键词
    currentPage: 1, // 当前页码
    recordsPerPage: 9, // 每页显示数量
    isPlaying: false, // 是否正在播放音频
    currentPlayingId: null // 当前播放的音频ID
};

// 页面加载时初始化
document.addEventListener('DOMContentLoaded', async () => {
    // 初始化事件监听
    initEventListeners();
    
    // 获取历史记录
    await fetchHistoryRecords();
});

/**
 * 初始化事件监听器
 */
function initEventListeners() {
    // 搜索输入框事件
    searchInputEl.addEventListener('input', debounce(() => {
        state.searchQuery = searchInputEl.value.trim().toLowerCase();
        state.currentPage = 1; // 重置到第一页
        applyFiltersAndSearch();
    }, 300));
    
    // 播放/暂停按钮事件
    playPauseButtonEl.addEventListener('click', () => {
        if (state.isPlaying) {
            pauseAudio(state.currentPlayingId);
        } else if (state.currentPlayingId) {
            playAudio(state.currentPlayingId);
        }
    });
    
    // 音频进度条交互
    progressBarEl.addEventListener('click', (e) => {
        if (!audioPlayerEl.duration) return;
        
        const rect = progressBarEl.getBoundingClientRect();
        const percent = (e.clientX - rect.left) / rect.width;
        audioPlayerEl.currentTime = percent * audioPlayerEl.duration;
        updateProgress();
    });
    
    // 监听音频播放事件
    audioPlayerEl.addEventListener('timeupdate', updateProgress);
    
    // 监听音频加载完成事件
    audioPlayerEl.addEventListener('loadedmetadata', () => {
        totalTimeEl.textContent = formatTime(audioPlayerEl.duration);
    });
    
    // 监听音频播放完成事件
    audioPlayerEl.addEventListener('ended', () => {
        state.isPlaying = false;
        updatePlayPauseButton();
        progressCurrentEl.style.width = '0%';
        currentTimeEl.textContent = '0:00';
        state.currentPlayingId = null;
        updatePlayButtons();
    });
    
    // 关闭播放器
    closePlayerButtonEl.addEventListener('click', () => {
        pauseAudio(state.currentPlayingId);
        audioPlayerContainerEl.classList.remove('visible');
    });
    
    // 下载当前音频
    downloadCurrentAudioButtonEl.addEventListener('click', () => {
        if (state.currentPlayingId) {
            downloadAudio(state.currentPlayingId);
        }
    });
    
    // 点击过滤器按钮
    filterButtonEl.addEventListener('click', (e) => {
        e.stopPropagation(); // 阻止事件冒泡
        
        // 切换菜单显示状态
        if (filterMenuEl.style.display === 'none' || !filterMenuEl.style.display) {
            // 获取按钮的位置和尺寸
            const buttonRect = filterButtonEl.getBoundingClientRect();
            const viewportHeight = window.innerHeight;
            
            // 计算菜单应该显示的位置
            // 默认在按钮下方显示
            let topPosition = buttonRect.bottom + 5;
            let leftPosition = buttonRect.left;
            
            // 确保菜单不会超出屏幕右边界
            if (leftPosition + 180 > window.innerWidth) {
                leftPosition = buttonRect.right - 180;
            }
            
            // 设置菜单位置
            filterMenuEl.style.top = `${topPosition}px`;
            filterMenuEl.style.left = `${leftPosition}px`;
            filterMenuEl.style.right = 'auto';
            filterMenuEl.style.bottom = 'auto';
            
            // 如果菜单超出屏幕底部，改为在按钮上方显示
            setTimeout(() => {
                const menuRect = filterMenuEl.getBoundingClientRect();
                if (menuRect.bottom > viewportHeight) {
                    filterMenuEl.style.top = 'auto';
                    filterMenuEl.style.bottom = `${window.innerHeight - buttonRect.top + 5}px`;
                }
                
                // 显示菜单
                filterMenuEl.style.display = 'block';
                filterMenuEl.style.visibility = 'visible';
            }, 0);
        } else {
            filterMenuEl.style.display = 'none';
        }
    });
    
    // 点击其他区域关闭过滤菜单
    document.addEventListener('click', (e) => {
        if (!filterButtonEl.contains(e.target) && !filterMenuEl.contains(e.target)) {
            filterMenuEl.style.display = 'none';
        }
    });
    
    // 在窗口大小变化时重新计算菜单位置
    window.addEventListener('resize', () => {
        if (filterMenuEl.style.display === 'block') {
            // 重新获取按钮位置
            const buttonRect = filterButtonEl.getBoundingClientRect();
            const viewportHeight = window.innerHeight;
            
            // 重新计算并设置菜单位置
            let topPosition = buttonRect.bottom + 5;
            let leftPosition = buttonRect.left;
            
            // 确保菜单不会超出屏幕右边界
            if (leftPosition + 180 > window.innerWidth) {
                leftPosition = buttonRect.right - 180;
            }
            
            // 根据菜单大小和按钮位置决定置上还是置下
            const menuHeight = filterMenuEl.offsetHeight || 150; // 预估如果还没有计算出高度
            
            if (topPosition + menuHeight > viewportHeight) {
                // 如果向下展示会超出屏幕，则向上展示
                filterMenuEl.style.top = 'auto';
                filterMenuEl.style.bottom = `${window.innerHeight - buttonRect.top + 5}px`;
            } else {
                // 向下展示
                filterMenuEl.style.top = `${topPosition}px`;
                filterMenuEl.style.bottom = 'auto';
            }
            
            filterMenuEl.style.left = `${leftPosition}px`;
        }
    });
    
    // 过滤菜单项点击事件
    const filterItems = document.querySelectorAll('.filter-item');
    filterItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.stopPropagation(); // 阻止事件传播
            
            const filter = item.getAttribute('data-filter');
            state.currentFilter = filter;
            state.currentPage = 1; // 重置到第一页
            
            // 更新按钮文本
            filterButtonEl.querySelector('span').textContent = item.textContent;
            
            // 更新激活状态
            filterItems.forEach(i => i.classList.remove('active'));
            item.classList.add('active');
            
            // 关闭菜单
            filterMenuEl.style.display = 'none';
            
            // 应用过滤
            applyFiltersAndSearch();
        });
    });
    
    // 给首个过滤项添加激活状态
    if (filterItems.length > 0) {
        filterItems[0].classList.add('active');
    }

    // 音频播放结束事件
    audioPlayerEl.addEventListener('ended', () => {
        state.isPlaying = false;
        state.currentPlayingId = null;
        updatePlayButtons();
    });
}

/**
 * 获取历史记录数据
 */
async function fetchHistoryRecords() {
    try {
        showLoading(true);
        
        const response = await fetch(`${API_BASE_URL}/v1/tts/history`);
        if (!response.ok) {
            throw new Error('获取历史记录失败');
        }
        
        const data = await response.json();
        
        // 存储所有记录
        state.allRecords = data.history || [];
        
        // 初始应用过滤和搜索
        applyFiltersAndSearch();
        
    } catch (error) {
        console.error('获取历史记录出错:', error);
        showError(error.message);
    } finally {
        showLoading(false);
    }
}

/**
 * 应用过滤器和搜索
 */
function applyFiltersAndSearch() {
    // 先过滤状态
    let filtered = state.allRecords;
    
    if (state.currentFilter !== 'all') {
        filtered = filtered.filter(record => record.status === state.currentFilter);
    }
    
    // 再进行搜索
    if (state.searchQuery) {
        filtered = filtered.filter(record => {
            const text = record.text.toLowerCase();
            const voiceName = (record.voice_name || '').toLowerCase();
            return text.includes(state.searchQuery) || voiceName.includes(state.searchQuery);
        });
    }
    
    // 更新过滤后的记录
    state.filteredRecords = filtered;
    
    // 渲染分页
    renderPagination();
    
    // 渲染当前页的记录
    renderCurrentPageRecords();
}

/**
 * 渲染当前页的记录
 */
function renderCurrentPageRecords() {
    const startIndex = (state.currentPage - 1) * state.recordsPerPage;
    const endIndex = startIndex + state.recordsPerPage;
    const currentRecords = state.filteredRecords.slice(startIndex, endIndex);
    
    // 清空历史记录列表
    historyListEl.innerHTML = '';
    
    // 如果没有历史记录，显示空状态
    if (state.filteredRecords.length === 0) {
        showEmptyState(true);
        historyListEl.style.display = 'none';
        return;
    }
    
    showEmptyState(false);
    historyListEl.style.display = 'grid';
    
    // 渲染每条历史记录
    currentRecords.forEach(record => {
        const historyItem = createHistoryItem(record);
        historyListEl.appendChild(historyItem);
    });
}

/**
 * 渲染分页导航
 */
function renderPagination() {
    const totalPages = Math.ceil(state.filteredRecords.length / state.recordsPerPage);
    
    // 清空分页容器
    paginationEl.innerHTML = '';
    
    // 如果只有1页或者没有数据，则不显示分页
    if (totalPages <= 1) {
        return;
    }
    
    // 上一页按钮
    if (state.currentPage > 1) {
        const prevBtn = document.createElement('button');
        prevBtn.textContent = '上一页';
        prevBtn.addEventListener('click', () => {
            state.currentPage--;
            renderCurrentPageRecords();
            renderPagination();
        });
        paginationEl.appendChild(prevBtn);
    }
    
    // 根据页数生成分页按钮
    let startPage = Math.max(1, state.currentPage - 2);
    let endPage = Math.min(totalPages, startPage + 4);
    
    // 调整开始页，确保显示5个页码按钮（如果有足够的页面）
    if (endPage - startPage < 4 && totalPages > 4) {
        startPage = Math.max(1, endPage - 4);
    }
    
    for (let i = startPage; i <= endPage; i++) {
        const pageBtn = document.createElement('button');
        pageBtn.textContent = i;
        
        if (i === state.currentPage) {
            pageBtn.classList.add('active');
        }
        
        pageBtn.addEventListener('click', () => {
            state.currentPage = i;
            renderCurrentPageRecords();
            renderPagination();
        });
        
        paginationEl.appendChild(pageBtn);
    }
    
    // 下一页按钮
    if (state.currentPage < totalPages) {
        const nextBtn = document.createElement('button');
        nextBtn.textContent = '下一页';
        nextBtn.addEventListener('click', () => {
            state.currentPage++;
            renderCurrentPageRecords();
            renderPagination();
        });
        paginationEl.appendChild(nextBtn);
    }
}

/**
 * 创建单个历史记录项
 * @param {Object} record - 历史记录数据
 * @returns {HTMLElement} - 历史记录DOM元素
 */
function createHistoryItem(record) {
    const item = document.createElement('div');
    item.className = 'history-item';
    item.dataset.id = record.task_id;
    item.id = `history-item-${record.task_id}`;
    
    // 创建状态标签
    const statusClass = getStatusClass(record.status);
    const statusText = getStatusText(record.status);
    
    // 格式化创建时间
    const createdAt = formatDate(record.created_at);
    
    // 语音信息
    const voiceInfo = record.voice_id || '默认';
    
    // 创建历史记录HTML
    item.innerHTML = `
        <span class="status ${statusClass}">${statusText}</span>
        <div class="history-text">${record.text}</div>
        <div class="history-info">
            <span>创建时间: ${createdAt}</span>
            <span>音色: ${voiceInfo}</span>
        </div>
        <div class="history-actions">
            ${record.status === 'completed' ? `
                <button class="play" data-task-id="${record.task_id}">
                    <i class="iconfont icon-play"></i>播放
                </button>
                <button class="download" data-task-id="${record.task_id}">
                    <i class="iconfont icon-download"></i>下载
                </button>
            ` : ''}
            <button class="delete" data-task-id="${record.task_id}">
                <i class="iconfont icon-delete"></i>删除
            </button>
        </div>
    `;
    
    // 添加事件监听
    if (record.status === 'completed') {
        // 播放按钮
        const playBtn = item.querySelector('.play');
        playBtn.addEventListener('click', () => playAudio(record.task_id));
        
        // 下载按钮
        const downloadBtn = item.querySelector('.download');
        downloadBtn.addEventListener('click', () => downloadAudio(record.task_id));
    }
    
    // 删除按钮
    const deleteBtn = item.querySelector('.delete');
    deleteBtn.addEventListener('click', () => deleteRecord(record.task_id));
    
    return item;
}

/**
 * 获取状态对应的CSS类
 * @param {string} status - 状态值
 * @returns {string} - CSS类名
 */
function getStatusClass(status) {
    switch (status) {
        case 'completed': return 'completed';
        case 'processing': return 'processing';
        case 'failed': return 'failed';
        default: return '';
    }
}

/**
 * 获取状态对应的文本
 * @param {string} status - 状态值
 * @returns {string} - 状态文本
 */
function getStatusText(status) {
    switch (status) {
        case 'completed': return '已完成';
        case 'processing': return '处理中';
        case 'failed': return '失败';
        default: return '未知';
    }
}

/**
 * 格式化日期显示
 * @param {string} dateString - ISO日期字符串
 * @returns {string} - 格式化后的日期字符串
 */
function formatDate(dateString) {
    if (!dateString) return '未知时间';
    
    try {
        const date = new Date(dateString);
        return date.toLocaleString('zh-CN', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });
    } catch (e) {
        return dateString;
    }
}

/**
 * 防抖函数
 * @param {Function} func - 需要防抖的函数
 * @param {number} delay - 延迟时间(毫秒)
 * @returns {Function} - 防抖后的函数
 */
function debounce(func, delay) {
    let timer = null;
    return function(...args) {
        if (timer) clearTimeout(timer);
        timer = setTimeout(() => {
            func.apply(this, args);
        }, delay);
    };
}

/**
 * 更新所有播放按钮的状态
 */
function updatePlayButtons() {
    const allPlayButtons = document.querySelectorAll('.history-actions .play');
    allPlayButtons.forEach(btn => {
        const taskId = btn.getAttribute('data-task-id');
        if (state.isPlaying && state.currentPlayingId === taskId) {
            btn.innerHTML = '<i class="iconfont icon-pause"></i>暂停';
        } else {
            btn.innerHTML = '<i class="iconfont icon-play"></i>播放';
        }
    });
    
    // 同时更新主播放器按钮
    updatePlayPauseButton();
}

/**
 * 更新主播放/暂停按钮状态
 */
function updatePlayPauseButton() {
    if (state.isPlaying) {
        playPauseButtonEl.innerHTML = '<i class="iconfont icon-pause"></i>';
    } else {
        playPauseButtonEl.innerHTML = '<i class="iconfont icon-play"></i>';
    }
}

/**
 * 格式化时间显示
 * @param {number} seconds - 时间秒数
 * @returns {string} - 格式化的时间字符串 (mm:ss)
 */
function formatTime(seconds) {
    if (!seconds || isNaN(seconds)) return '0:00';
    
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}

/**
 * 更新音频播放进度
 */
function updateProgress() {
    if (!audioPlayerEl.duration) return;
    
    const percent = (audioPlayerEl.currentTime / audioPlayerEl.duration) * 100;
    progressCurrentEl.style.width = `${percent}%`;
    currentTimeEl.textContent = formatTime(audioPlayerEl.currentTime);
}

/**
 * 播放音频
 * @param {string} taskId - 任务ID
 */
async function playAudio(taskId) {
    try {
        // 如果已经在播放该音频，则暂停
        if (state.isPlaying && state.currentPlayingId === taskId) {
            pauseAudio(taskId);
            return;
        }
        
        // 如果在播放其他音频，先暂停
        if (state.isPlaying && state.currentPlayingId) {
            pauseAudio(state.currentPlayingId);
        }
        
        // 显示播放器
        audioPlayerContainerEl.classList.add('visible');
        
        // 更新状态
        state.isPlaying = true;
        state.currentPlayingId = taskId;
        
        // 更新所有播放按钮状态
        updatePlayButtons();
        
        // 获取当前播放的记录信息
        const currentRecord = state.allRecords.find(r => r.task_id === taskId);
        if (currentRecord) {
            // 更新播放器标题和音色信息
            currentAudioTitleEl.textContent = currentRecord.text.length > 40 
                ? `${currentRecord.text.substring(0, 40)}...` 
                : currentRecord.text;
            
            currentAudioVoiceEl.textContent = `音色: ${currentRecord.voice_id || '标准'}`;
        }
        
        // 播放音频
        audioPlayerEl.src = `${API_BASE_URL}/v1/tts/history/${taskId}/audio`;
        // 重置进度条
        progressCurrentEl.style.width = '0%';
        currentTimeEl.textContent = '0:00';
        
        const playPromise = audioPlayerEl.play();
        
        if (playPromise !== undefined) {
            playPromise.then(() => {
                // 播放成功
                updatePlayPauseButton();
            }).catch(error => {
                console.error('播放失败:', error);
                state.isPlaying = false;
                updatePlayPauseButton();
                showNotification('播放失败，请点击重试', 'error');
            });
        }
    } catch (error) {
        console.error('播放音频出错:', error);
        state.isPlaying = false;
        state.currentPlayingId = null;
        updatePlayButtons();
        
        // 显示友好的错误提示
        const errorMsg = error.name === 'NotAllowedError' 
            ? '浏览器需要交互才能播放音频。请点击播放按钮重试。' 
            : '播放音频失败，请稍后再试';
        
        showNotification(errorMsg, 'error');
    }
}

/**
 * 暂停音频播放
 * @param {string} taskId - 任务ID
 * @param {boolean} hidePlayer - 是否隐藏播放器，默认不隐藏
 */
function pauseAudio(taskId, hidePlayer = false) {
    // 暂停音频播放
    audioPlayerEl.pause();
    
    // 更新状态
    state.isPlaying = false;
    
    // 更新所有播放按钮状态
    updatePlayButtons();
    updatePlayPauseButton();
    
    // 如果需要隐藏播放器
    if (hidePlayer) {
        audioPlayerContainerEl.classList.remove('visible');
    }
}

/**
 * 下载音频
 * @param {string} taskId - 任务ID
 */
function downloadAudio(taskId) {
    try {
        const downloadUrl = `${API_BASE_URL}/v1/tts/history/${taskId}/audio`;
        
        // 获取当前记录信息用于文件名
        const currentRecord = state.allRecords.find(r => r.task_id === taskId);
        let fileName = `PARROT音频_${taskId}.wav`;
        
        // 如果有文本，使用文本前10个字作为文件名
        if (currentRecord && currentRecord.text) {
            const shortText = currentRecord.text.substring(0, 10).trim();
            fileName = `PARROT音频_${shortText}${shortText.length < 10 ? '' : '...'}.wav`;
        }
        
        // 创建一个临时链接并模拟点击
        const a = document.createElement('a');
        a.href = downloadUrl;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        
        // 显示下载成功通知
        showNotification('音频下载成功', 'success');
    } catch (error) {
        console.error('下载音频出错:', error);
        showNotification('下载音频失败，请稍后再试', 'error');
    }
}

/**
 * 删除配音记录
 * @param {string} taskId - 任务ID
 */
async function deleteRecord(taskId) {
    if (!confirm('确定要删除这条音频记录吗？删除后无法恢复')) {
        return;
    }
    
    // 如果正在播放该记录的音频，先暂停
    if (state.isPlaying && state.currentPlayingId === taskId) {
        pauseAudio(taskId);
    }
    
    try {
        // 显示删除中状态
        const item = document.querySelector(`#history-item-${taskId}`);
        if (item) {
            item.style.opacity = '0.5';
            item.style.pointerEvents = 'none';
        }
        
        const response = await fetch(`${API_BASE_URL}/v1/tts/history/${taskId}`, {
            method: 'DELETE'
        });
        
        if (!response.ok) {
            throw new Error('删除记录失败');
        }
        
        // 删除成功后从当前记录中移除
        state.allRecords = state.allRecords.filter(record => record.task_id !== taskId);
        
        // 渲染更新后的记录
        applyFiltersAndSearch();
        
        // 显示成功通知
        showNotification('删除音频记录成功', 'success');
    } catch (error) {
        console.error('删除记录出错:', error);
        showNotification('删除记录失败，请稍后再试', 'error');
        
        // 恢复项目的正常状态
        const item = document.querySelector(`#history-item-${taskId}`);
        if (item) {
            item.style.opacity = '';
            item.style.pointerEvents = '';
        }
    }
}

/**
 * 显示/隐藏加载中状态
 * @param {boolean} show - 是否显示
 */
function showLoading(show) {
    loadingHistoryEl.style.display = show ? 'block' : 'none';
}

/**
 * 显示/隐藏空状态
 * @param {boolean} show - 是否显示
 */
function showEmptyState(show) {
    emptyHistoryEl.style.display = show ? 'block' : 'none';
}

/**
 * 显示错误信息
 * @param {string} message - 错误信息
 */
function showError(message) {
    emptyHistoryEl.innerHTML = `<p>加载失败: ${message}。请<a href="javascript:location.reload()">刷新页面</a>重试</p>`;
    emptyHistoryEl.style.display = 'block';
}

/**
 * 显示通知信息
 * @param {string} message - 通知内容
 * @param {string} type - 通知类型 (success, error, info, warning)
 * @param {number} duration - 显示时长(毫秒)
 */
function showNotification(message, type = 'info', duration = 3000) {
    // 获取对应类型的图标
    let icon = '';
    switch(type) {
        case 'success':
            icon = '<i class="iconfont icon-check-circle" style="color: #28a745;"></i>';
            break;
        case 'error':
            icon = '<i class="iconfont icon-close-circle" style="color: #dc3545;"></i>';
            break;
        case 'warning':
            icon = '<i class="iconfont icon-warning" style="color: #ffc107;"></i>';
            break;
        case 'info':
        default:
            icon = '<i class="iconfont icon-info-circle" style="color: #17a2b8;"></i>';
            break;
    }
    
    // 创建通知元素
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    
    // 设置通知内容
    notification.innerHTML = `
        <div class="notification-icon">${icon}</div>
        <div class="notification-content">${message}</div>
        <div class="notification-close"><i class="iconfont icon-close"></i></div>
    `;
    
    // 添加到页面
    document.body.appendChild(notification);
    
    // 添加延迟动画效果
    setTimeout(() => {
        notification.classList.add('show');
    }, 10);
    
    // 自动隐藏
    const timer = setTimeout(() => {
        closeNotification(notification);
    }, duration);
    
    // 点击关闭按钮关闭通知
    const closeBtn = notification.querySelector('.notification-close');
    closeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        clearTimeout(timer);
        closeNotification(notification);
    });
    
    // 鼠标悬停时暂停自动关闭计时
    notification.addEventListener('mouseenter', () => {
        clearTimeout(timer);
    });
    
    // 鼠标移出时恢复自动关闭计时
    notification.addEventListener('mouseleave', () => {
        timer = setTimeout(() => {
            closeNotification(notification);
        }, duration);
    });
}

/**
 * 关闭通知
 * @param {HTMLElement} notification - 通知元素
 */
function closeNotification(notification) {
    notification.classList.remove('show');
    notification.classList.add('hide');
    
    // 隐藏后移除元素
    setTimeout(() => {
        notification.remove();
    }, 300);
}
