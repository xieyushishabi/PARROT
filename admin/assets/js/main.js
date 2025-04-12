// 等待DOM加载完成
document.addEventListener('DOMContentLoaded', function() {
    // 获取统计数据
    fetchDashboardStats();
    
    // 初始化图表
    initPieChart();
    initLineChart();
});

// 获取仪表盘统计数据
function fetchDashboardStats() {
    const baseURL = 'http://127.0.0.1:8000';
    
    // 获取基础统计数据
    axios.get(`${baseURL}/api/v1/admin/dashboard/stats`)
        .then(response => {
            if (response.data && response.data.code === 200) {
                updateStatCards(response.data.data);
            } else {
                console.error('获取统计数据失败:', response.data.msg);
            }
        })
        .catch(error => {
            console.error('获取统计数据请求错误:', error);
        });
        
    // 获取功能使用占比数据
    axios.get(`${baseURL}/api/v1/admin/dashboard/feature-usage`)
        .then(response => {
            if (response.data && response.data.code === 200) {
                updatePieChart(response.data.data);
            } else {
                console.error('获取功能使用占比数据失败:', response.data.msg);
            }
        })
        .catch(error => {
            console.error('获取功能使用占比数据请求错误:', error);
        });
        
    // 获取近一周活跃用户数据
    axios.get(`${baseURL}/api/v1/admin/dashboard/active-users`)
        .then(response => {
            if (response.data && response.data.code === 200) {
                updateLineChart(response.data.data);
            } else {
                console.error('获取近一周活跃用户数据失败:', response.data.msg);
            }
        })
        .catch(error => {
            console.error('获取近一周活跃用户数据请求错误:', error);
        });
}

// 更新统计卡片数据
function updateStatCards(data) {
    const visitElement = document.querySelector('.stat-card:nth-child(1) .stat-value');
    const userElement = document.querySelector('.stat-card:nth-child(2) .stat-value');
    const contentElement = document.querySelector('.stat-card:nth-child(3) .stat-value');
    
    if (visitElement && data.visits !== undefined) {
        visitElement.textContent = data.visits.toLocaleString();
    }
    
    if (userElement && data.users !== undefined) {
        userElement.textContent = data.users.toLocaleString();
    }
    
    if (contentElement && data.contents !== undefined) {
        contentElement.textContent = data.contents.toLocaleString();
    }
}

// 全局变量来储存图表实例
let pieChart = null;
let lineChart = null;

// 初始化饼图
function initPieChart() {
    const pieData = {
        labels: ['教育教学', '智能配音', '声音克隆'],
        datasets: [{
            data: [46.55, 36.09, 17.36],
            backgroundColor: [
                '#4169E1',
                '#4CAF50',
                '#87CEEB'
            ]
        }]
    };
    
    // 配置饼图
    pieChart = new Chart(document.getElementById('pieChart'), {
        type: 'doughnut',
        data: pieData,
        options: {
            responsive: true,
            plugins: {
                legend: {
                    position: 'bottom'
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const value = context.raw || 0;
                            return `${value}%`;
                        }
                    }
                }
            },
            cutout: '60%'
        }
    });
    
    return pieChart;
}

// 更新饼图数据
function updatePieChart(data) {
    if (!pieChart) return;
    
    // 准备新数据
    const newData = [
        data.education || 0,
        data.dubbing || 0,
        data.cloning || 0
    ];
    
    // 更新图表数据
    pieChart.data.datasets[0].data = newData;
    pieChart.update();
}

// 初始化折线图
function initLineChart() {
    const lineData = {
        labels: ['周一', '周二', '周三', '周四', '周五', '周六', '周日'],
        datasets: [{
            label: '活跃用户数',
            data: [250, 180, 300, 220, 250, 400, 350],
            borderColor: '#4169E1',
            tension: 0.4,
            fill: false
        }]
    };

    // 配置折线图
    lineChart = new Chart(document.getElementById('lineChart'), {
        type: 'line',
        data: lineData,
        options: {
            responsive: true,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        stepSize: 100
                    }
                }
            }
        }
    });
    
    return lineChart;
}

// 更新折线图数据
function updateLineChart(data) {
    if (!lineChart) return;
    
    // 提取星期几标签和用户数量
    const labels = data.map(item => item.weekday);
    const userData = data.map(item => item.user_count);
    
    // 更新图表数据
    lineChart.data.labels = labels;
    lineChart.data.datasets[0].data = userData;
    lineChart.update();
}