document.addEventListener('DOMContentLoaded', function() {
    // 模拟资源数据
    let resourceData = [
        {
            id: 1,
            username: 'A100100100',
            title: '语音资源1',
            uploadTime: '2023-01-01',
            status: 'pending', // pending, passed, failed
            audioUrl: 'path/to/audio1.mp3'
        },
        // 添加更多模拟数据以测试分页
        {
            id: 2,
            username: 'B200200200',
            title: '语音资源2',
            uploadTime: '2023-01-02',
            status: 'passed',
            audioUrl: 'path/to/audio2.mp3'
        },
        // ... 继续添加数据直到有400条
    ];

    const itemsPerPage = 8; // 每页显示的条数
    let currentPage = 1; // 当前页码

    // 渲染表格数据
    function renderTable(data, page = 1) {
        const tbody = document.querySelector('.resource-table tbody');
        const start = (page - 1) * itemsPerPage;
        const end = start + itemsPerPage;
        const pageData = data.slice(start, end);

        tbody.innerHTML = pageData.map((resource, index) => `
            <tr>
                <td>${start + index + 1}</td>
                <td>${resource.username}</td>
                <td>${resource.title}</td>
                <td>${resource.uploadTime}</td>
                <td>
                    <button class="play-btn" data-url="${resource.audioUrl}">
                        
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
                        <button class="action-btn detail-btn">详情</button>
                        <button class="action-btn delete-btn" data-id="${resource.id}">删除</button>
                    </div>
                </td>
            </tr>
        `).join('');

        // 更新总数显示
        document.querySelector('.total').textContent = `共 ${data.length} 条`;

        // 更新分页按钮
        updatePagination(data.length, page);

        // 添加删除按钮点击事件
        document.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                const resourceId = this.dataset.id;
                const confirmDelete = confirm('确定要删除该资源吗？');
                if (confirmDelete) {
                    resourceData = resourceData.filter(resource => resource.id != resourceId);
                    renderTable(resourceData, currentPage);
                }
            });
        });
    }

    // 更新分页按钮
    function updatePagination(totalItems, currentPage) {
        const totalPages = Math.ceil(totalItems / itemsPerPage);
        const pageNav = document.querySelector('.page-nav');
        pageNav.innerHTML = '';

        for (let i = 1; i <= totalPages; i++) {
            const pageBtn = document.createElement('button');
            pageBtn.className = 'page-btn';
            if (i === currentPage) {
                pageBtn.classList.add('active');
            }
            pageBtn.textContent = i;
            pageBtn.addEventListener('click', function() {
                renderTable(resourceData, i);
            });
            pageNav.appendChild(pageBtn);
        }
    }

    function getStatusText(status) {
        switch(status) {
            case 'pending': return '待审核';
            case 'passed': return '已通过';
            case 'failed': return '未通过';
            default: return '未知状态';
        }
    }

    // 初始化表格
    renderTable(resourceData);

    // 添加详情按钮点击事件
    document.querySelectorAll('.detail-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            window.location.href = 'resource-detail.html';
        });
    });

    // ... 其他功能代码 ...
}); 