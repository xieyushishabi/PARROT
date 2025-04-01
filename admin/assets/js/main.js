// 等待DOM加载完成
document.addEventListener('DOMContentLoaded', function() {
    // 饼图数据
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

    // 折线图数据
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

    // 配置饼图
    const pieChart = new Chart(document.getElementById('pieChart'), {
        type: 'doughnut',
        data: pieData,
        options: {
            responsive: true,
            plugins: {
                legend: {
                    position: 'bottom'
                }
            },
            cutout: '60%'
        }
    });

    // 配置折线图
    const lineChart = new Chart(document.getElementById('lineChart'), {
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
}); 