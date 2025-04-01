document.addEventListener('DOMContentLoaded', function() {
    // 用于存储用户数据
    let userData = [];
    const baseURL = 'http://127.0.0.1:8000';
    const usersPerPage = 8; // 每页显示8条数据
    let currentPage = 1; // 当前页码
    
    // 初始化日期选择器
    const datePickerElement = document.getElementById('date-search');
    if (datePickerElement) {
        flatpickr(datePickerElement, {
            locale: "zh",
            dateFormat: "Y-m-d",
            mode: "range", // 允许选择日期范围
            allowInput: true,
            placeholder: "请选择日期范围"
        });
    }
    
    // 从后端获取用户数据
    async function fetchUsers(searchParams = {}) {
        try {
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
        tbody.innerHTML = pageData.map((user, index) => `
            <tr>
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
                window.location.href = `user-detail.html?userId=${encodeURIComponent(userId)}`;
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
        if (dateRange) searchParams.date_range = dateRange;
        
        // 重置到第一页
        currentPage = 1;
        
        // 使用搜索参数获取数据
        fetchUsers(searchParams);
    });

    // 初始化表格和分页 - 从API获取数据
    fetchUsers();

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
