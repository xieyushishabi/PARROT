document.addEventListener('DOMContentLoaded', function() {
    // 基础API URL
    const baseURL = 'http://127.0.0.1:8000';
    
    // 状态管理
    const state = {
        userId: null,
        username: '',
        allRecords: [], // 保存所有历史记录
        currentPage: 1,
        recordsPerPage: 10, // 每页显示的记录数
        totalPages: 1
    };
    
    // 获取用户ID
    const urlParams = new URLSearchParams(window.location.search);
    state.userId = urlParams.get('id');
    
    if (!state.userId) {
        alert('未找到用户ID，请返回用户管理页面重试');
        window.location.href = 'manage.html';
        return;
    }
    
    // 更新页面标题
    const updatePageTitle = (username) => {
        const titleElement = document.querySelector('.detail-header h2');
        if (titleElement) {
            titleElement.textContent = `用户 ${username} 历史操作记录`;
        }
    };
    
    // 获取用户历史记录
    const fetchUserHistory = async () => {
        try {
            // 显示加载状态
            const contentArea = document.querySelector('.detail-content');
            contentArea.innerHTML = '<div class="loading">正在加载用户历史记录...</div>';
            
            // 发起API请求，获取所有历史记录
            const response = await axios.get(`${baseURL}/api/v1/admin/users/${state.userId}/history`);
            
            // 检查响应状态
            if (response.data && response.data.code === 200) {
                // 更新用户名
                state.username = response.data.data.user.username;
                updatePageTitle(state.username);
                
                // 保存所有记录
                state.allRecords = response.data.data.history;
                
                // 计算总页数
                state.totalPages = Math.ceil(state.allRecords.length / state.recordsPerPage);
                
                // 渲染当前页的历史记录
                renderCurrentPageRecords();
                
                // 更新分页控件
                updatePagination();
                
                // 更新页面大小显示
                updatePageSizeDisplay();
            } else {
                showError('获取用户历史记录失败: ' + (response.data.msg || '未知错误'));
            }
        } catch (error) {
            console.error('获取用户历史记录出错:', error);
            showError('获取用户历史记录失败: ' + (error.response?.data?.msg || error.message || '未知错误'));
        }
    };
    
    // 渲染当前页的历史记录
    const renderCurrentPageRecords = () => {
        const contentArea = document.querySelector('.detail-content');
        
        // 如果没有记录
        if (!state.allRecords || state.allRecords.length === 0) {
            contentArea.innerHTML = '<div class="empty-message">暂无操作记录</div>';
            return;
        }
        
        // 计算当前页显示的记录范围
        const startIndex = (state.currentPage - 1) * state.recordsPerPage;
        const endIndex = Math.min(startIndex + state.recordsPerPage, state.allRecords.length);
        const currentPageRecords = state.allRecords.slice(startIndex, endIndex);
        
        // 渲染记录列表
        let html = '';
        
        currentPageRecords.forEach(record => {
            // 格式化操作类型显示
            const operationType = formatOperationType(record.operation_type);
            
            // 使用资源图片
            let imgSrc = '';
            if (record.preview_image) {
                imgSrc = `data:image/jpeg;base64,${record.preview_image}`;
            } else {
                imgSrc = 'assets/images/placeholder.jpg'; // 默认图片（目前没有）
            }
            
            html += `
                <div class="history-item">
                    <img src="${imgSrc}" alt="预览图" class="history-image">
                    <div class="history-content">
                        <div class="history-text">${operationType}：${record.operation_detail || '无详细描述'}</div>
                        <div class="history-time">${record.created_at}</div>
                        ${record.resource_id ? `<div class="resource-id">资源ID: ${record.resource_id}</div>` : ''}
                    </div>
                </div>
            `;
        });
        
        contentArea.innerHTML = html;
    };
    
    // 格式化操作类型
    const formatOperationType = (type) => {
        const typeMap = {
            'dub': '智能配音',
            'clone': '声音克隆',
            'teaching': '教育教学',
            'collect': '收藏声音',
            'like': '点赞声音',
            'upload': '上传资源',
            'delete': '删除资源',
            'review': '资源审核',
            'download': '下载资源',
            'share': '分享资源',
            'comment': '评论资源',
            'edit': '编辑资源',
            'play': '播放声音'
        };
        
        return typeMap[type] || type;
    };
    
    // 显示错误信息
    const showError = (message) => {
        const contentArea = document.querySelector('.detail-content');
        contentArea.innerHTML = `<div class="error-message">${message}</div>`;
    };
    
    // 更新分页控件
    const updatePagination = () => {
        const totalPages = Math.ceil(state.allRecords.length / state.recordsPerPage);
        const pageNav = document.querySelector('.page-nav');
        
        if (!pageNav) return;
        
        pageNav.innerHTML = ''; // 清空现有页码
        
        // 添加上一页按钮
        if (state.currentPage > 1) {
            pageNav.innerHTML += `<button class="prev-btn">&lt;</button>`;
        }
        
        // 添加页码按钮
        // 显示当前页附近的页码
        let startPage = Math.max(1, state.currentPage - 2);
        let endPage = Math.min(totalPages, startPage + 4);
        
        // 如果页码不足5个，调整起始页
        if (endPage - startPage < 4 && totalPages > 4) {
            startPage = Math.max(1, endPage - 4);
        }
        
        for (let i = startPage; i <= endPage; i++) {
            pageNav.innerHTML += `<button class="page-btn ${i === state.currentPage ? 'active' : ''}">${i}</button>`;
        }
        
        // 添加下一页按钮
        if (state.currentPage < totalPages) {
            pageNav.innerHTML += `<button class="next-btn">&gt;</button>`;
        }
        
        // 更新总数
        document.querySelector('.total').textContent = `共 ${state.allRecords.length} 条`;
        
        // 更新跳转输入框的值
        const gotoInput = document.querySelector('.goto input');
        if (gotoInput) {
            gotoInput.value = state.currentPage;
        }
        
        // 为页码按钮添加点击事件
        document.querySelectorAll('.page-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                state.currentPage = parseInt(this.textContent);
                renderCurrentPageRecords();
                updatePagination();
            });
        });
        
        // 为上一页按钮添加点击事件
        const prevBtn = pageNav.querySelector('.prev-btn');
        if (prevBtn) {
            prevBtn.addEventListener('click', function() {
                if (state.currentPage > 1) {
                    state.currentPage--;
                    renderCurrentPageRecords();
                    updatePagination();
                }
            });
        }
        
        // 为下一页按钮添加点击事件
        const nextBtn = pageNav.querySelector('.next-btn');
        if (nextBtn) {
            nextBtn.addEventListener('click', function() {
                if (state.currentPage < totalPages) {
                    state.currentPage++;
                    renderCurrentPageRecords();
                    updatePagination();
                }
            });
        }
    };
    
    // 更新页面大小显示
    const updatePageSizeDisplay = () => {
        // 更新当前显示的页面大小
        const currentPageSizeElement = document.querySelector('.current-page-size');
        if (currentPageSizeElement) {
            currentPageSizeElement.textContent = `${state.recordsPerPage}条/页`;
        }
        
        // 更新下拉菜单中的活动项
        const dropdownItems = document.querySelectorAll('.dropdown-item');
        dropdownItems.forEach(item => {
            if (parseInt(item.dataset.value) === state.recordsPerPage) {
                item.classList.add('active');
            } else {
                item.classList.remove('active');
            }
        });
    };
    
    // 切换每页显示数量
    const changePageSize = (newSize) => {
        // 保存当前页面的相对位置
        const currentTopItem = (state.currentPage - 1) * state.recordsPerPage + 1;
        
        // 更新每页显示数量
        state.recordsPerPage = newSize;
        
        // 计算新的当前页码，尽量保持查看的是同一批数据
        state.currentPage = Math.ceil(currentTopItem / state.recordsPerPage);
        if (state.currentPage === 0) state.currentPage = 1;
        
        // 重新计算总页数
        state.totalPages = Math.ceil(state.allRecords.length / state.recordsPerPage);
        
        // 重新渲染数据和分页
        renderCurrentPageRecords();
        updatePagination();
        updatePageSizeDisplay();
    };
    
    // 为页面大小选择器添加事件
    const dropdownItems = document.querySelectorAll('.dropdown-item');
    if (dropdownItems) {
        dropdownItems.forEach(item => {
            item.addEventListener('click', function() {
                const newSize = parseInt(this.dataset.value);
                if (newSize !== state.recordsPerPage) {
                    changePageSize(newSize);
                }
            });
        });
    }
    
    // 添加页码跳转功能
    const gotoInput = document.querySelector('.goto input');
    if (gotoInput) {
        // 处理回车键事件
        gotoInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                handleGotoPage();
            }
        });
        
        // 处理失去焦点事件
        gotoInput.addEventListener('blur', function() {
            handleGotoPage();
        });
        
        function handleGotoPage() {
            const pageNum = parseInt(gotoInput.value);
            const totalPages = Math.ceil(state.allRecords.length / state.recordsPerPage);
            
            if (!isNaN(pageNum) && pageNum > 0 && pageNum <= totalPages) {
                state.currentPage = pageNum;
                renderCurrentPageRecords();
                updatePagination();
            } else {
                // 如果输入无效，重置为当前页码
                gotoInput.value = state.currentPage;
                alert(`请输入有效页码 (1-${totalPages})`);
            }
        }
    }
    
    // 初始化 - 获取用户历史记录
    fetchUserHistory();
    
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