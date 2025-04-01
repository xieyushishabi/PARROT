document.addEventListener('DOMContentLoaded', function() {
    // 获取用户ID
    const urlParams = new URLSearchParams(window.location.search);
    const userId = urlParams.get('userId'); // 从URL中获取userId
    const baseURL = 'http://127.0.0.1:8000';

    // 获取用户数据并填充表单
    async function fetchUserData(userId) {
        try {
            const url = `${baseURL}/api/v1/admin/users`;
            const params = { id: userId }; // 使用id参数查询
            
            const response = await axios.get(url, { params });
            console.log('API响应:', response.data);
            
            if (response.data && response.data.code === 200) {
                const users = response.data.data.users;
                if (users && users.length > 0) {
                    fillForm(users[0]);
                } else {
                    console.error('未找到用户数据');
                    alert('未找到用户ID：' + userId);
                }
            } else {
                console.error('获取用户数据失败:', response.data.msg);
                alert('获取用户数据失败: ' + (response.data.msg || '未知错误'));
            }
        } catch (error) {
            console.error('获取用户数据出错:', error);
            alert('获取用户数据失败，请检查API服务是否正常运行');
            
            // 如果API调用失败，填充默认值
            const defaultUserData = {
                username: '',
                password: '',
                age: '',
                gender: '',
                phone: '',
                register_time: ''
            };
            fillForm(defaultUserData);
        }
    }

    // 填充表单函数
    function fillForm(userData) {
        // 确保所有字段都正确填充
        document.querySelector('input[type="text"]').value = userData.username || '';
        document.querySelector('input[type="password"]').value = userData.password || '';
        document.querySelector('input[type="number"]').value = userData.age || ''; 
        
        // 修正性别选择器，获取第二个文本输入框（避免选择用户名输入框）
        const genderInput = document.querySelectorAll('input[type="text"]')[1];
        if (genderInput) {
            genderInput.value = userData.gender || '';
        }
        
        document.querySelector('input[type="tel"]').value = userData.phone || '';
        document.querySelector('.date-picker').value = userData.register_time || userData.registerTime || '';
    }

    // 初始化检查
    if (userId) {
        fetchUserData(userId);
    } else {
        console.error('未提供用户ID');
        alert('未提供用户ID，无法获取用户信息');
    }

    // 保存修改
    const saveBtn = document.querySelector('.save-btn');
    saveBtn.addEventListener('click', async function() {
        // 获取表单数据
        const formData = {
            username: document.querySelector('input[type="text"]').value.trim(),
            password: document.querySelector('input[type="password"]').value.trim(),
            age: document.querySelector('input[type="number"]').value.trim(),
            gender: document.querySelectorAll('input[type="text"]')[1].value.trim(),
            phone_number: document.querySelector('input[type="tel"]').value.trim(),
            created_at: document.querySelector('.date-picker').value.trim()
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
            
            // 从URL获取用户ID
            const urlParams = new URLSearchParams(window.location.search);
            const userId = urlParams.get('userId');
            
            if (!userId) {
                throw new Error('用户ID不存在，无法更新数据');
            }
            
            // 发送更新请求
            const url = `${baseURL}/api/v1/admin/update_user/${userId}`;
            const response = await axios.post(url, formData, { headers });
            
            // 检查响应状态
            if (response.data && response.data.code === 200) {
                alert('用户信息更新成功');
                window.location.href = 'manage.html';
            } else {
                console.error('更新用户数据失败:', response.data.msg);
                alert('更新用户数据失败: ' + (response.data.msg || '未知错误'));
            }
        } catch (error) {
            console.error('更新用户数据出错:', error);
            
            // 处理FastAPI返回的错误结构
            if (error.response?.status === 400) {
                // 检查是否为用户名已存在错误
                const detail = error.response?.data?.detail;
                if (detail === "用户名已存在") {
                    alert('更新失败：用户名已存在，请使用其他用户名');
                } else {
                    alert('更新用户数据出错: ' + detail);
                }
            } else {
                // 处理其他类型错误
                const errorMsg = error.response?.data?.detail || 
                                error.message || 
                                '更新数据失败，请稍后再试';
                alert('更新用户数据出错: ' + errorMsg);
            }
        }
    });
    
    // 验证表单数据的函数
    function validateFormData(data) {
        // 验证用户名
        if (!data.username) {
            return '用户名不能为空';
        }
        
        // 验证密码（如果提供了密码）
        if (data.password && data.password.length < 6) {
            return '密码长度不能少于6位';
        }
        
        // 验证年龄
        if (data.age) {
            const age = parseInt(data.age, 10);
            if (isNaN(age) || age < 1 || age > 120) {
                return '年龄必须在1-120之间';
            }
        }
        
        // 验证性别
        if (data.gender && !['男', '女'].includes(data.gender)) {
            return '性别必须是"男"或"女"';
        }
        
        // 验证手机号
        if (data.phone_number && !/^1[3-9]\d{9}$/.test(data.phone_number)) {
            return '请输入正确的11位手机号码';
        }
        
        // 验证注册时间格式
        if (data.created_at) {
            // 检查日期格式 YYYY-MM-DD HH:MM:SS
            const dateTimeRegex = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/;
            if (!dateTimeRegex.test(data.created_at)) {
                return '日期格式错误，应为 YYYY-MM-DD HH:MM:SS';
            }
            
            const date = new Date(data.created_at);
            if (isNaN(date.getTime())) {
                return '请输入有效的日期和时间';
            }
        }
        
        // 验证通过
        return null;
    }
});