document.addEventListener('DOMContentLoaded', function() {
    // 用于存储用户数据
    let userData = [];
    const baseURL = 'http://127.0.0.1:8000';
    let usersPerPage = 8; // 改为可变的每页显示条数
    let currentPage = 1; // 当前页码
    let lastSearchParams = {}; // 存储最后一次的搜索参数
    let selectedItems = new Set(); // 存储选中项的ID
    
    // 初始化日期选择器
    const datePickerElement = document.getElementById('date-search');
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
    
    // 从后端获取用户数据
    async function fetchUsers(searchParams = {}) {
        try {
            // 保存搜索参数以便切换页面大小时使用
            lastSearchParams = {...searchParams};
            
            // 构建查询参数
            let url = `${baseURL}/api/v1/admin/users`;
            if (Object.keys(searchParams).length > 0) {
                const queryParams = new URLSearchParams();
                for (const [key, value] of Object.entries(searchParams)) {
                    if (value) queryParams.append(key, value);
                }
                url += `?${queryParams.toString()}`;
            }
            
            const response = await axios.get(url);
            
            if (response.data && response.data.code === 200) {
                userData = response.data.data.users;
                renderTable(currentPage);
                updatePagination();
                updatePageSizeDisplay(); // 更新页面大小显示
            } else {
                console.error('获取用户数据失败:', response.data.msg);
                alert('获取用户数据失败: ' + (response.data.msg || '未知错误'));
            }
        } catch (error) {
            console.error('获取用户数据出错:', error);
            alert('获取用户数据失败，请检查API服务是否正常运行');
            
            // 如果API调用失败，显示空表格
            userData = [];
            renderTable(currentPage);
            updatePagination();
        }
    }

    // 渲染表格数据
    function renderTable(page) {
        const start = (page - 1) * usersPerPage;
        const end = page * usersPerPage;
        const pageData = userData.slice(start, end);
        
        const tbody = document.querySelector('.user-table tbody');
        
        if (pageData.length === 0) {
            tbody.innerHTML = `<tr><td colspan="8" style="text-align: center;">暂无用户数据</td></tr>`;
            return;
        }
        
        tbody.innerHTML = pageData.map((user, index) => `
            <tr>
                <td><input type="checkbox" class="item-checkbox" data-id="${user.id}" ${selectedItems.has(user.id) ? 'checked' : ''}></td>
                <td>${start + index + 1}</td>
                <td>${user.username}</td>
                <td>${user.phone}</td>
                <td>${user.password}</td>
                <td>${user.gender}</td>
                <td>${user.register_time || user.registerTime}</td>
                <td>
                    <div class="action-btns">
                        <button class="action-btn edit-btn" data-id="${user.id}">修改</button>
                        <button class="action-btn detail-btn" data-id="${user.id}">详情</button>
                        <button class="action-btn delete-btn" data-id="${user.id}">删除</button>
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

        // 为每个按钮添加事件处理
        document.querySelectorAll('.edit-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                const userId = this.dataset.id;
                window.location.href = `change-user.html?userId=${encodeURIComponent(userId)}`;
            });
        });

        document.querySelectorAll('.detail-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                const userId = this.dataset.id;
                // 修改从userId参数为id参数，与后端API保持一致
                window.location.href = `user-detail.html?id=${encodeURIComponent(userId)}`;
            });
        });

        document.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', async function() {
                const userId = this.dataset.id;
                const confirmDelete = confirm('确定要删除该用户吗？');
                if (confirmDelete) {
                    try {
                        const response = await axios.delete(`${baseURL}/api/v1/admin/delete_user/${userId}`);
                        if (response.data && response.data.code === 200) {
                            alert('用户删除成功');
                            userData = userData.filter(user => user.id != userId);
                            renderTable(currentPage); // 重新渲染当前页面的数据
                            updatePagination();
                        } else {
                            alert('删除用户失败: ' + (response.data.msg || '未知错误'));
                        }
                    } catch (error) {
                        console.error('删除用户出错:', error);
                        alert('删除用户失败，请检查API服务是否正常运行');
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

    // 更新分页区域
    function updatePagination() {
        const totalPages = Math.ceil(userData.length / usersPerPage);
        const pageNav = document.querySelector('.page-nav');
        pageNav.innerHTML = ''; // 清空现有页码

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
                const totalPages = Math.ceil(userData.length / usersPerPage);
                if (currentPage < totalPages) {
                    currentPage++;
                    renderTable(currentPage);
                    updatePagination();
                }
            });
        }

        // 更新总数
        document.querySelector('.total').textContent = `共 ${userData.length} 条`;
    }

    // 更新页面大小显示
    function updatePageSizeDisplay() {
        // 更新当前显示的页面大小
        const currentPageSizeElement = document.querySelector('.current-page-size');
        if (currentPageSizeElement) {
            currentPageSizeElement.textContent = `${usersPerPage}条/页`;
        }
        
        // 更新下拉菜单中的活动项
        const dropdownItems = document.querySelectorAll('.dropdown-item');
        dropdownItems.forEach(item => {
            if (parseInt(item.dataset.value) === usersPerPage) {
                item.classList.add('active');
            } else {
                item.classList.remove('active');
            }
        });
    }

    // 切换每页显示数量
    function changePageSize(newSize) {
        // 保存当前页面的相对位置
        const currentTopItem = (currentPage - 1) * usersPerPage + 1;
        
        // 更新每页显示数量
        usersPerPage = newSize;
        
        // 计算新的当前页码，尽量保持查看的是同一批数据
        currentPage = Math.ceil(currentTopItem / usersPerPage);
        if (currentPage === 0) currentPage = 1;
        
        // 重新获取数据
        fetchUsers(lastSearchParams);
    }

    // 为页面大小选择器添加事件
    const dropdownItems = document.querySelectorAll('.dropdown-item');
    if (dropdownItems) {
        dropdownItems.forEach(item => {
            item.addEventListener('click', function() {
                const newSize = parseInt(this.dataset.value);
                if (newSize !== usersPerPage) {
                    changePageSize(newSize);
                }
            });
        });
    }

    // 搜索功能
    const searchBtn = document.getElementById('search-button');
    searchBtn.addEventListener('click', function() {
        const username = document.getElementById('username-search').value.trim();
        const phone = document.getElementById('phone-search').value.trim();
        const dateRange = document.getElementById('date-search').value.trim();
        
        // 准备搜索参数
        const searchParams = {};
        if (username) searchParams.username = username;
        if (phone) searchParams.phone = phone;
        if (dateRange) {
            searchParams.date_range = dateRange;
            console.log("筛选日期范围:", dateRange); // 添加调试输出
        }
        
        // 重置到第一页
        currentPage = 1;
        
        // 使用搜索参数获取数据
        fetchUsers(searchParams);
    });

    // 批量删除用户
    async function batchDeleteUsers() {
        if (selectedItems.size === 0) {
            alert('请至少选择一个用户');
            return;
        }
        
        const confirmDelete = confirm(`确定要删除选中的 ${selectedItems.size} 个用户吗？此操作不可恢复！`);
        if (!confirmDelete) return;
        
        try {
            const response = await axios.post(`${baseURL}/api/v1/admin/batch_delete_users`, {
                user_ids: Array.from(selectedItems)
            });
            
            if (response.data && response.data.code === 200) {
                alert(`成功删除 ${response.data.data.deleted_count} 个用户`);
                selectedItems.clear(); // 清空选中项
                fetchUsers(lastSearchParams); // 重新获取数据
            } else {
                alert(`批量删除失败: ${response.data.msg || '未知错误'}`);
            }
        } catch (error) {
            console.error('批量删除用户出错:', error);
            alert(`批量删除失败: ${error.response?.data?.msg || error.message || '未知错误'}`);
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
    
    // 为批量删除按钮添加事件
    const batchDeleteBtn = document.querySelector('.batch-delete-btn');
    if (batchDeleteBtn) {
        batchDeleteBtn.addEventListener('click', function() {
            batchDeleteUsers();
        });
    }

    // 初始化表格和分页 - 从API获取数据
    fetchUsers();
    updatePageSizeDisplay(); // 初始化页面大小显示

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
            const totalPages = Math.ceil(userData.length / usersPerPage);
            
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

    // 添加用户按钮点击事件
    const addUserBtn = document.querySelector('.add-user-btn');
    if (addUserBtn) {
        addUserBtn.addEventListener('click', function() {
            window.location.href = 'add-user.html'; // 确保路径正确
        });
    } else {
        console.error('Add User Button not found');
    }

    // 退出登录按钮
    const logoutBtn = document.querySelector('.logout-btn');
    logoutBtn.addEventListener('click', function() {
        const confirmLogout = confirm('确定要退出登录吗？');
        if (confirmLogout) {
            window.location.href = 'login.html'; // 或者其他登录页面
        }
    });
});
