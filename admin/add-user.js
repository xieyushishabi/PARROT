document.addEventListener('DOMContentLoaded', function() {
    const baseURL = 'http://127.0.0.1:8000';
    const saveBtn = document.querySelector('.save-btn');
    
    saveBtn.addEventListener('click', async function() {
        // 获取表单数据
        const formData = {
            username: document.querySelector('input[type="text"]').value.trim(),
            password: document.querySelector('input[type="password"]').value.trim(),
            email: document.querySelector('input[type="email"]').value.trim(),
            age: document.querySelector('input[type="number"]').value.trim(),
            gender: document.querySelector('input[name="gender"]:checked').value.trim(),
            phone_number: document.querySelector('input[type="tel"]').value.trim(),
            // 自动生成当前时间，格式为YYYY-MM-DD HH:MM:SS
            created_at: new Date().toLocaleString('zh-CN', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                hour12: false
            }).replace(/\//g, '-')
        };
        
        // 验证表单数据
        const validationError = validateFormData(formData);
        if (validationError) {
            alert(validationError);
            return;
        }
        
        // 将年龄转换为数字
        formData.age = parseInt(formData.age, 10);
        
        try {
            // 设置请求头
            const headers = {
                'Content-Type': 'application/json'
            };
            
            // 调试信息
            console.log('发送的表单数据:', {
                username: formData.username,
                email: formData.email,
                age: formData.age,
                gender: formData.gender,
                phone_number: formData.phone_number,
                created_at: formData.created_at
            });
            
            // 发送添加用户请求
            const url = `${baseURL}/api/v1/admin/add_user`;
            const response = await axios.post(url, formData, { headers });
            
            // 检查响应状态
            if (response.data && response.data.code === 200) {
                alert('用户添加成功');
                window.location.href = 'manage.html';
            } else {
                console.error('添加用户失败:', response.data.msg);
                alert('添加用户失败: ' + (response.data.msg || '未知错误'));
            }
        } catch (error) {
            console.error('添加用户出错:', error);
            
            // 处理FastAPI返回的错误结构
            if (error.response?.status === 400) {
                // 检查是否为用户名已存在错误
                const detail = error.response?.data?.detail;
                if (detail === "用户名已存在") {
                    alert('添加失败：用户名已存在，请使用其他用户名');
                } else if (detail === "邮箱已被注册") {
                    alert('添加失败：邮箱已被注册，请使用其他邮箱');
                } else {
                    alert('添加用户出错: ' + detail);
                }
            } else if (error.response?.status === 500) {
                // 数据库错误详细信息
                const detail = error.response?.data?.detail;
                if (detail && detail.includes('NOT NULL constraint failed: users.email')) {
                    alert('添加失败：邮箱是必填字段');
                } else {
                    alert('添加用户出错: ' + detail);
                }
            } else {
                // 处理其他类型错误
                const errorMsg = error.response?.data?.detail || 
                                error.message || 
                                '添加用户失败，请稍后再试';
                alert('添加用户出错: ' + errorMsg);
            }
        }
    });
    
    // 验证表单数据的函数
    function validateFormData(data) {
        // 验证用户名
        if (!data.username) {
            return '用户名不能为空';
        }
        
        // 验证密码
        if (!data.password) {
            return '密码不能为空';
        }
        if (data.password.length < 6) {
            return '密码长度不能少于6位';
        }
        
        // 验证邮箱
        if (!data.email) {
            return '邮箱不能为空';
        }
        // 使用正则表达式验证邮箱格式
        const emailRegex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6}$/;
        if (!emailRegex.test(data.email)) {
            return '请输入有效的邮箱地址';
        }
        
        // 验证年龄
        if (!data.age) {
            return '年龄不能为空';
        }
        const age = parseInt(data.age, 10);
        if (isNaN(age) || age < 1 || age > 120) {
            return '年龄必须在1-120之间';
        }
        
        // 验证性别
        if (!data.gender) {
            return '请选择性别';
        }
        if (!['男', '女'].includes(data.gender)) {
            return '性别必须是"男"或"女"';
        }
        
        // 验证手机号
        if (!data.phone_number) {
            return '手机号不能为空';
        }
        if (!/^1[3-9]\d{9}$/.test(data.phone_number)) {
            return '请输入正确的11位手机号码';
        }
        
        // 验证通过
        return null;
    }
});