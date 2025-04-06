document.addEventListener('DOMContentLoaded', function() {
    // 初始化变量
    let resourceData = [];
    const baseURL = 'http://127.0.0.1:8000';
    const itemsPerPage = 8; // 每页显示的条数
    let currentPage = 1; // 当前页码
    let totalPages = 1; // 总页数
    let audioPlayer = null; // 当前播放的音频对象

    // 初始化日期选择器
    const datePickerElement = document.querySelector('.date-picker');
    if (datePickerElement) {
        flatpickr(datePickerElement, {
            locale: "zh",
            dateFormat: "Y-m-d",
            mode: "range", // 允许选择日期范围
            allowInput: true,
            placeholder: "请选择日期范围"
        });
    }

    // 从后端获取语音资源数据
    async function fetchVoices(searchParams = {}) {
        try {
            // 构建查询参数
            const queryParams = new URLSearchParams();
            
            // 添加分页参数
            queryParams.append('page', currentPage);
            queryParams.append('page_size', itemsPerPage);
            
            // 添加搜索参数
            if (searchParams.username) queryParams.append('username', searchParams.username);
            if (searchParams.upload_time) queryParams.append('upload_time', searchParams.upload_time);
            if (searchParams.title) queryParams.append('title', searchParams.title);
            if (searchParams.status) queryParams.append('status', searchParams.status);
            
            const url = `${baseURL}/api/v1/admin/voices?${queryParams.toString()}`;
            const response = await axios.get(url);
            
            if (response.data && response.data.code === 200) {
                const data = response.data.data;
                resourceData = data.voices;
                
                // 更新总页数和当前页
                totalPages = data.pages;
                if (currentPage > totalPages && totalPages > 0) {
                    currentPage = totalPages;
                    return fetchVoices(searchParams); // 重新获取数据
                }
                
                renderTable(resourceData);
                updatePagination(data.total, currentPage, totalPages);
            } else {
                console.error('获取语音资源数据失败:', response.data.msg);
                alert('获取语音资源数据失败: ' + (response.data.msg || '未知错误'));
            }
        } catch (error) {
            console.error('获取语音资源数据出错:', error);
            alert('获取语音资源数据失败，请检查API服务是否正常运行');
            
            // 如果API调用失败，显示空表格
            resourceData = [];
            renderTable(resourceData);
            updatePagination(0, 1, 1);
        }
    }

    // 渲染表格数据
    function renderTable(data) {
        const tbody = document.querySelector('.resource-table tbody');
        
        if (data.length === 0) {
            tbody.innerHTML = `<tr><td colspan="7" style="text-align: center;">暂无语音资源数据</td></tr>`;
            return;
        }
        
        tbody.innerHTML = data.map((resource, index) => `
            <tr>
                <td>${resource.index}</td>
                <td>${resource.username}</td>
                <td>${resource.title}</td>
                <td>${resource.uploadTime}</td>
                <td>
                    <button class="play-btn" data-url="${resource.audioUrl}" data-id="${resource.id}">
                        <img src="images/icons/play-icon.png" alt="播放图标" class="play-icon">
                    </button>
                </td>
                <td>
                    <div class="task-status ${resource.status}">
                        <i class="status-icon"></i>
                        ${getStatusText(resource.status)}
                    </div>
                </td>
                <td>
                    <div class="action-btns">
                        <button class="action-btn detail-btn" data-id="${resource.id}">详情</button>
                        <button class="action-btn delete-btn" data-id="${resource.id}">删除</button>
                    </div>
                </td>
            </tr>
        `).join('');

        // 添加播放按钮点击事件
        document.querySelectorAll('.play-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                const audioUrl = this.dataset.url;
                const voiceId = this.dataset.id;
                playAudio(audioUrl, voiceId);
            });
        });

        // 添加详情按钮点击事件
        document.querySelectorAll('.detail-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                const voiceId = this.dataset.id;
                window.location.href = `resource-detail.html?voiceId=${encodeURIComponent(voiceId)}`;
            });
        });

        // 添加删除按钮点击事件
        document.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', async function() {
                const voiceId = this.dataset.id;
                const confirmDelete = confirm('确定要删除该语音资源吗？');
                if (confirmDelete) {
                    try {
                        const response = await axios.delete(`${baseURL}/api/v1/admin/voices/${voiceId}`);
                        if (response.data && response.data.code === 200) {
                            alert('语音资源删除成功');
                            fetchVoices(); // 重新获取数据
                        } else {
                            alert('删除语音资源失败: ' + (response.data.msg || '未知错误'));
                        }
                    } catch (error) {
                        console.error('删除语音资源出错:', error);
                        alert('删除语音资源失败: ' + (error.response?.data?.msg || error.message || '未知错误'));
                    }
                }
            });
        });
    }

    // 播放音频
    function playAudio(audioUrl, voiceId) {
        // 停止之前正在播放的音频
        if (audioPlayer) {
            audioPlayer.pause();
            audioPlayer = null;
        }
        
        // 创建新的音频对象
        audioPlayer = new Audio(`${baseURL}/api/v1/voices/${voiceId}/audio`);
        audioPlayer.play().catch(error => {
            console.error('播放音频失败:', error);
            alert('播放音频失败，请确保音频文件存在并且格式正确');
        });
    }

    // 更新分页区域
    function updatePagination(totalItems, currentPage, totalPages) {
        document.querySelector('.total').textContent = `共 ${totalItems} 条`;
        
        const pageNav = document.querySelector('.page-nav');
        pageNav.innerHTML = '';

        // 添加上一页按钮
        pageNav.innerHTML += `<button class="prev-btn">&lt;</button>`;

        // 添加页码按钮
        if (totalPages <= 5) {
            // 如果总页数少于等于5，直接显示所有页码
            for (let i = 1; i <= totalPages; i++) {
                pageNav.innerHTML += `<button class="page-btn ${i === currentPage ? 'active' : ''}">${i}</button>`;
            }
        } else {
            // 如果总页数大于5，显示当前页附近的页码和省略号
            if (currentPage <= 3) {
                // 当前页靠近开头
                for (let i = 1; i <= 4; i++) {
                    pageNav.innerHTML += `<button class="page-btn ${i === currentPage ? 'active' : ''}">${i}</button>`;
                }
                pageNav.innerHTML += `<span class="ellipsis">...</span>`;
                pageNav.innerHTML += `<button class="page-btn">${totalPages}</button>`;
            } else if (currentPage >= totalPages - 2) {
                // 当前页靠近结尾
                pageNav.innerHTML += `<button class="page-btn">1</button>`;
                pageNav.innerHTML += `<span class="ellipsis">...</span>`;
                for (let i = totalPages - 3; i <= totalPages; i++) {
                    pageNav.innerHTML += `<button class="page-btn ${i === currentPage ? 'active' : ''}">${i}</button>`;
                }
            } else {
                // 当前页在中间
                pageNav.innerHTML += `<button class="page-btn">1</button>`;
                pageNav.innerHTML += `<span class="ellipsis">...</span>`;
                for (let i = currentPage - 1; i <= currentPage + 1; i++) {
                    pageNav.innerHTML += `<button class="page-btn ${i === currentPage ? 'active' : ''}">${i}</button>`;
                }
                pageNav.innerHTML += `<span class="ellipsis">...</span>`;
                pageNav.innerHTML += `<button class="page-btn">${totalPages}</button>`;
            }
        }

        // 添加下一页按钮
        pageNav.innerHTML += `<button class="next-btn">&gt;</button>`;

        // 为页码按钮添加点击事件
        document.querySelectorAll('.page-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                currentPage = parseInt(this.textContent);
                fetchVoices();
            });
        });

        // 为上一页按钮添加点击事件
        const prevBtn = pageNav.querySelector('.prev-btn');
        if (prevBtn) {
            prevBtn.addEventListener('click', function() {
                if (currentPage > 1) {
                    currentPage--;
                    fetchVoices();
                }
            });
        }

        // 为下一页按钮添加点击事件
        const nextBtn = pageNav.querySelector('.next-btn');
        if (nextBtn) {
            nextBtn.addEventListener('click', function() {
                if (currentPage < totalPages) {
                    currentPage++;
                    fetchVoices();
                }
            });
        }

        // 更新跳转页码的输入框
        const gotoInput = document.querySelector('.goto input');
        if (gotoInput) {
            gotoInput.value = currentPage;
        }
    }

    // 获取状态文本
    function getStatusText(status) {
        switch(status) {
            case 'pending': return '待审核';
            case 'passed': return '已通过';
            case 'failed': return '未通过';
            default: return '未知状态';
        }
    }

    // 搜索功能
    const searchBtn = document.querySelector('.search-btn');
    if (searchBtn) {
        searchBtn.addEventListener('click', function() {
            const usernameInput = document.getElementById('username-search');
            const titleInput = document.getElementById('title-search');
            const dateInput = document.querySelector('.date-picker');
            const statusSelect = document.getElementById('status-search');
            
            const searchParams = {};
            if (usernameInput && usernameInput.value.trim()) {
                searchParams.username = usernameInput.value.trim();
            }
            
            if (titleInput && titleInput.value.trim()) {
                searchParams.title = titleInput.value.trim();
            }
            
            if (dateInput && dateInput.value.trim()) {
                searchParams.upload_time = dateInput.value.trim();
            }
            
            if (statusSelect && statusSelect.value) {
                searchParams.status = statusSelect.value;
            }
            
            // 重置到第一页
            currentPage = 1;
            
            // 使用搜索参数获取数据
            fetchVoices(searchParams);
        });
    }

    // 页码跳转功能
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
            
            if (!isNaN(pageNum) && pageNum > 0 && pageNum <= totalPages) {
                currentPage = pageNum;
                fetchVoices();
            } else {
                // 如果输入无效，重置为当前页码
                gotoInput.value = currentPage;
                alert(`请输入有效页码 (1-${totalPages})`);
            }
        }
    }

    // 初始化 - 从API获取数据
    fetchVoices();
    
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