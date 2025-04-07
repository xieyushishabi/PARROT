document.addEventListener('DOMContentLoaded', function() {
    // 初始化变量
    let resourceData = [];
    const baseURL = 'http://127.0.0.1:8000';
    let itemsPerPage = 8; // 初始每页显示的条数，现在是可变的
    let currentPage = 1; // 当前页码
    let totalPages = 1; // 总页数
    let audioPlayer = null; // 当前播放的音频对象
    let selectedItems = new Set(); // 存储选中项的ID
    let lastSearchParams = {}; // 存储最后一次的搜索参数

    // 初始化日期选择器
    const datePickerElement = document.querySelector('.date-picker');
    if (datePickerElement) {
        flatpickr(datePickerElement, {
            locale: "zh",
            dateFormat: "Y-m-d",
            mode: "range", // 允许选择日期范围
            allowInput: true,
            placeholder: "请选择日期范围",
            rangeSeparator: " to " // 确保范围分隔符与后端一致
        });
    }

    // 从后端获取语音资源数据
    async function fetchVoices(searchParams = {}) {
        try {
            // 保存搜索参数以便切换页面大小时使用
            lastSearchParams = {...searchParams};
            
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
                totalPages = Math.ceil(data.total / itemsPerPage); // 使用总记录数计算总页数
                if (currentPage > totalPages && totalPages > 0) {
                    currentPage = totalPages;
                    return fetchVoices(searchParams); // 重新获取数据
                }
                
                // 清空选中项
                selectedItems.clear();
                
                renderTable(currentPage); // 渲染表格数据
                updatePagination();
                updatePageSizeDisplay(); // 更新页面大小显示
            } else {
                console.error('获取语音资源数据失败:', response.data.msg);
                alert('获取语音资源数据失败: ' + (response.data.msg || '未知错误'));
            }
        } catch (error) {
            console.error('获取语音资源数据出错:', error);
            alert('获取语音资源数据失败，请检查API服务是否正常运行');
            
            // 如果API调用失败，显示空表格
            resourceData = [];
            renderTable(currentPage);
            updatePagination();
        }
    }

    // 渲染表格数据
    function renderTable(page) {
        const start = (page - 1) * itemsPerPage;
        const end = page * itemsPerPage;
        const pageData = resourceData.slice(start, end);

        const tbody = document.querySelector('.resource-table tbody');
        
        if (pageData.length === 0) {
            tbody.innerHTML = `<tr><td colspan="8" style="text-align: center;">暂无语音资源数据</td></tr>`;
            return;
        }
        
        tbody.innerHTML = pageData.map((resource, index) => `
            <tr>
                <td><input type="checkbox" class="item-checkbox" data-id="${resource.id}" ${selectedItems.has(resource.id) ? 'checked' : ''}></td>
                <td>${start + index + 1}</td>
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

        // 添加复选框事件
        document.querySelectorAll('.item-checkbox').forEach(checkbox => {
            checkbox.addEventListener('change', function() {
                const id = this.dataset.id;
                if (this.checked) {
                    selectedItems.add(id);
                } else {
                    selectedItems.delete(id);
                }
                updateSelectAllCheckbox();
            });
        });

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
        
        // 更新全选复选框状态
        updateSelectAllCheckbox();
    }
    
    // 更新全选复选框状态
    function updateSelectAllCheckbox() {
        const selectAllCheckbox = document.getElementById('select-all');
        const checkboxes = document.querySelectorAll('.item-checkbox');
        if (checkboxes.length > 0 && checkboxes.length === selectedItems.size) {
            selectAllCheckbox.checked = true;
            selectAllCheckbox.indeterminate = false;
        } else if (selectedItems.size > 0) {
            selectAllCheckbox.indeterminate = true;
        } else {
            selectAllCheckbox.checked = false;
            selectAllCheckbox.indeterminate = false;
        }
    }

    // 播放音频
    function playAudio(audioUrl, voiceId) {
        // 停止之前正在播放的音频
        if (audioPlayer) {
            audioPlayer.pause();
            audioPlayer = null;
        }
        
        // 创建新的音频对象
        audioPlayer = new Audio(`${baseURL}/api/v1/admin/voices/${voiceId}/audio`);
        audioPlayer.play().catch(error => {
            console.error('播放音频失败:', error);
            alert('播放音频失败，请确保音频文件存在并且格式正确');
        });
    }

    // 更新分页区域
    function updatePagination() {
        const totalPages = Math.ceil(resourceData.length / itemsPerPage);
        const pageNav = document.querySelector('.page-nav');
        pageNav.innerHTML = '';

        // 添加上一页按钮
        if (currentPage > 1) {
            pageNav.innerHTML += `<button class="prev-btn">&lt;</button>`;
        }

        // 添加页码按钮
        for (let i = 1; i <= totalPages; i++) {
            pageNav.innerHTML += `<button class="page-btn ${i === currentPage ? 'active' : ''}">${i}</button>`;
        }

        // 添加下一页按钮
        if (currentPage < totalPages) {
            pageNav.innerHTML += `<button class="next-btn">&gt;</button>`;
        }

        // 为页码按钮添加点击事件
        document.querySelectorAll('.page-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                currentPage = parseInt(this.textContent);
                renderTable(currentPage);
                updatePagination();
            });
        });

        // 为上一页按钮添加点击事件
        const prevBtn = pageNav.querySelector('.prev-btn');
        if (prevBtn) {
            prevBtn.addEventListener('click', function() {
                if (currentPage > 1) {
                    currentPage--;
                    renderTable(currentPage);
                    updatePagination();
                }
            });
        }

        // 为下一页按钮添加点击事件
        const nextBtn = pageNav.querySelector('.next-btn');
        if (nextBtn) {
            nextBtn.addEventListener('click', function() {
                if (currentPage < totalPages) {
                    currentPage++;
                    renderTable(currentPage);
                    updatePagination();
                }
            });
        }

        document.querySelector('.total').textContent = `共 ${resourceData.length} 条`;
    }

    // 更新页面大小显示
    function updatePageSizeDisplay() {
        // 更新当前显示的页面大小
        const currentPageSizeElement = document.querySelector('.current-page-size');
        if (currentPageSizeElement) {
            currentPageSizeElement.textContent = `${itemsPerPage}条/页`;
        }
        
        // 更新下拉菜单中的活动项
        const dropdownItems = document.querySelectorAll('.dropdown-item');
        dropdownItems.forEach(item => {
            if (parseInt(item.dataset.value) === itemsPerPage) {
                item.classList.add('active');
            } else {
                item.classList.remove('active');
            }
        });
    }

    // 切换每页显示数量
    function changePageSize(newSize) {
        // 保存当前页面的相对位置
        const currentTopItem = (currentPage - 1) * itemsPerPage + 1;
        
        // 更新每页显示数量
        itemsPerPage = newSize;
        
        // 计算新的当前页码，尽量保持查看的是同一批数据
        currentPage = Math.ceil(currentTopItem / itemsPerPage);
        if (currentPage === 0) currentPage = 1;
        
        // 重新获取数据
        fetchVoices(lastSearchParams);
    }

    // 为页面大小选择器添加事件
    const dropdownItems = document.querySelectorAll('.dropdown-item');
    if (dropdownItems) {
        dropdownItems.forEach(item => {
            item.addEventListener('click', function() {
                const newSize = parseInt(this.dataset.value);
                if (newSize !== itemsPerPage) {
                    changePageSize(newSize);
                }
            });
        });
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
                // 确保日期范围格式正确
                searchParams.upload_time = dateInput.value.trim();
                console.log("筛选日期范围:", searchParams.upload_time); // 添加调试输出
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
            const totalPages = Math.ceil(resourceData.length / itemsPerPage);
            
            if (!isNaN(pageNum) && pageNum > 0 && pageNum <= totalPages) {
                currentPage = pageNum;
                renderTable(currentPage);
                updatePagination();
            } else {
                // 如果输入无效，重置为当前页码
                gotoInput.value = currentPage;
                alert(`请输入有效页码 (1-${totalPages})`);
            }
        }
    }

    // 批量处理审核
    async function batchReviewVoices(status) {
        if (selectedItems.size === 0) {
            alert('请至少选择一条语音资源');
            return;
        }
        
        const confirmAction = confirm(`确定要将选中的 ${selectedItems.size} 条语音资源${status === 'passed' ? '通过' : '不通过'}审核吗？`);
        if (!confirmAction) return;
        
        try {
            const response = await axios.post(`${baseURL}/api/v1/admin/voices/batch_review`, {
                voice_ids: Array.from(selectedItems),
                status: status
            });
            
            if (response.data && response.data.code === 200) {
                alert(`批量${status === 'passed' ? '通过' : '不通过'}操作成功`);
                selectedItems.clear(); // 清空选中项
                fetchVoices(); // 重新获取数据
            } else {
                alert(`批量操作失败: ${response.data.msg || '未知错误'}`);
            }
        } catch (error) {
            console.error('批量处理审核出错:', error);
            alert(`批量操作失败: ${error.response?.data?.msg || error.message || '未知错误'}`);
        }
    }
    
    // 为全选复选框添加事件
    const selectAllCheckbox = document.getElementById('select-all');
    if (selectAllCheckbox) {
        selectAllCheckbox.addEventListener('change', function() {
            const checkboxes = document.querySelectorAll('.item-checkbox');
            checkboxes.forEach(checkbox => {
                checkbox.checked = this.checked;
                const id = checkbox.dataset.id;
                if (this.checked) {
                    selectedItems.add(id);
                } else {
                    selectedItems.delete(id);
                }
            });
        });
    }
    
    // 为批量通过按钮添加事件
    const batchPassBtn = document.querySelector('.batch-pass-btn');
    if (batchPassBtn) {
        batchPassBtn.addEventListener('click', function() {
            batchReviewVoices('passed');
        });
    }
    
    // 为批量不通过按钮添加事件
    const batchFailBtn = document.querySelector('.batch-fail-btn');
    if (batchFailBtn) {
        batchFailBtn.addEventListener('click', function() {
            batchReviewVoices('failed');
        });
    }
    
    // 批量删除功能
    async function batchDeleteVoices() {
        if (selectedItems.size === 0) {
            alert('请至少选择一条语音资源');
            return;
        }
        
        const confirmAction = confirm(`确定要删除选中的 ${selectedItems.size} 条语音资源吗？此操作不可恢复！`);
        if (!confirmAction) return;
        
        try {
            const response = await axios.post(`${baseURL}/api/v1/admin/voices/batch_delete`, {
                user_ids: Array.from(selectedItems)  // 复用现有的user_ids字段
            });
            
            if (response.data && response.data.code === 200) {
                alert(`批量删除操作成功，已删除 ${response.data.data.deleted_count} 条资源`);
                selectedItems.clear(); // 清空选中项
                fetchVoices(); // 重新获取数据
            } else {
                alert(`批量删除失败: ${response.data.msg || '未知错误'}`);
            }
        } catch (error) {
            console.error('批量删除语音资源出错:', error);
            alert(`批量删除失败: ${error.response?.data?.msg || error.message || '未知错误'}`);
        }
    }
    
    // 为批量删除按钮添加事件
    const batchDeleteBtn = document.querySelector('.batch-delete-btn');
    if (batchDeleteBtn) {
        batchDeleteBtn.addEventListener('click', function() {
            batchDeleteVoices();
        });
    }

    // 初始化 - 从API获取数据
    fetchVoices();
    updatePageSizeDisplay(); // 初始化页面大小显示
    
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