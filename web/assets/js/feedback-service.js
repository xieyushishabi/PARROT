/**
 * 意见反馈服务
 * 实现用户提交反馈发送到管理员邮箱
 */
// 预加载EmailJS库
document.write('<script src="https://cdn.jsdelivr.net/npm/@emailjs/browser@3/dist/email.min.js"></script>');

// 全局变量标记EmailJS是否可用
window.emailJSAvailable = false;

document.addEventListener('DOMContentLoaded', function() {
    console.log('意见反馈模块初始化');
    
    // 动态添加CSS样式
    addFeedbackStyles();
    
    // 初始化侧边栏按钮点击事件
    initSidebarButtons();
    
    // 初始化反馈表单处理
    initFeedbackForm();
    
    // 检查并初始化EmailJS
    initEmailJS();
});

/**
 * 动态添加反馈表单样式
 */
function addFeedbackStyles() {
    const styleEl = document.createElement('style');
    styleEl.textContent = `
        /* 禁用状态的提交按钮 */
        .submit-btn:disabled {
            background: #9baee4 !important;
            cursor: not-allowed !important;
        }

        /* 反馈消息提示 */
        .feedback-message {
            margin-top: 15px;
            padding: 12px;
            border-radius: 4px;
            font-size: 14px;
            text-align: center;
            transition: opacity 0.5s ease;
        }

        .feedback-message.success {
            background-color: #e8f5e9;
            color: #2e7d32;
            border: 1px solid #c8e6c9;
        }

        .feedback-message.error {
            background-color: #ffebee;
            color: #c62828;
            border: 1px solid #ffcdd2;
        }
    `;
    document.head.appendChild(styleEl);
}

/**
 * 初始化EmailJS
 */
function initEmailJS() {
    // 检查EmailJS是否已加载
    if (typeof emailjs !== 'undefined') {
        try {
            // 用一个公共测试ID就够了，不需要实际发送邮件时会使用FormSubmit
            emailjs.init("user_test");
            window.emailJSAvailable = true;
            console.log('EmailJS库已成功初始化');
        } catch (error) {
            console.error('EmailJS初始化失败:', error);
            window.emailJSAvailable = false;
        }
    } else {
        console.warn('EmailJS库未找到，将使用备用方式发送邮件');
        window.emailJSAvailable = false;
    }
}

/**
 * 初始化侧边栏按钮点击事件
 */
function initSidebarButtons() {
    const sidebarBtns = document.querySelectorAll('.sidebar-btn');
    const tutorialContents = document.querySelectorAll('.tutorial-content');
    const feedbackContent = document.querySelector('.feedback-content');
    
    if (!sidebarBtns || !tutorialContents || !feedbackContent) {
        console.error('找不到侧边栏按钮或内容区域');
        return;
    }
    
    console.log('注册侧边栏按钮点击事件，按钮数量:', sidebarBtns.length);
    
    // 添加按钮点击事件
    sidebarBtns.forEach((btn, index) => {
        btn.addEventListener('click', function() {
            console.log('点击了按钮:', index, btn.textContent.trim());
            
            // 移除所有按钮的激活状态
            sidebarBtns.forEach(b => b.classList.remove('active'));
            // 添加当前按钮的激活状态
            btn.classList.add('active');
            
            // 处理内容显示
            if (index === sidebarBtns.length - 1) {  // 最后一个按钮（意见反馈）
                tutorialContents.forEach(content => content.classList.remove('active'));
                feedbackContent.classList.add('active');
            } else {
                feedbackContent.classList.remove('active');
                // 隐藏所有教程内容
                tutorialContents.forEach(content => content.classList.remove('active'));
                // 显示当前选中的教程内容
                if (tutorialContents[index]) {
                    tutorialContents[index].classList.add('active');
                }
            }
        });
    });
    
    // 处理URL参数
    if (window.location.hash === '#feedback') {
        const feedbackBtn = sidebarBtns[sidebarBtns.length - 1];
        if (feedbackBtn) {
            feedbackBtn.click(); // 模拟点击方式激活反馈按钮
        }
    }
}

/**
 * 初始化反馈表单处理
 */
function initFeedbackForm() {
    const submitBtn = document.querySelector('.submit-btn');
    if (!submitBtn) return;
    
    submitBtn.addEventListener('click', function() {
        // 获取表单数据
        const usageTimeEl = document.querySelector('input[name="usage-time"]:checked');
        if (!usageTimeEl || !usageTimeEl.nextSibling) {
            showFeedbackMessage('请选择使用时间', 'error');
            return;
        }
        
        const usageTime = usageTimeEl.nextSibling.textContent.trim();
        const contactInfo = document.querySelector('.contact-input').value.trim();
        const problemDesc = document.querySelector('.feedback-item textarea').value.trim();
        
        // 表单验证
        if (!contactInfo) {
            showFeedbackMessage('请提供您的联系方式', 'error');
            return;
        }
        
        if (!problemDesc) {
            showFeedbackMessage('请描述您的问题或意见', 'error');
            return;
        }
        
        // 显示加载状态
        submitBtn.disabled = true;
        submitBtn.textContent = '提交中...';
        
        // 准备发送的数据
        const feedbackData = {
            usageTime: usageTime,
            contactInfo: contactInfo,
            problemDesc: problemDesc,
            timestamp: new Date().toISOString(),
            adminEmail: window.ADMIN_CONFIG ? window.ADMIN_CONFIG.FEEDBACK_EMAIL : 'PARROTADMIN123@163.com',
            subject: window.ADMIN_CONFIG ? window.ADMIN_CONFIG.FEEDBACK_SUBJECT : 'PARROT音响用户反馈'
        };
        
        // 发送反馈
        sendFeedback(feedbackData);
    });
}

/**
 * 发送反馈到管理员邮箱
 * @param {Object} data - 反馈数据
 */
async function sendFeedback(data) {
    try {
        console.log('开始发送反馈数据');
        
        // 主要使用FormSubmit.co服务发送邮件，不依赖EmailJS
        const formData = new FormData();
        formData.append('usage_time', data.usageTime);
        formData.append('contact_info', data.contactInfo);
        formData.append('problem_description', data.problemDesc);
        formData.append('_subject', data.subject || 'PARROT音响用户反馈');
        
        // 直接模拟表单提交，更可靠
        const formSubmitUrl = 'https://formsubmit.co/' + data.adminEmail;
        
        // 创建一个隐藏的iframe来处理表单提交
        const iframe = document.createElement('iframe');
        iframe.name = 'hidden_feedback_iframe';
        iframe.style.display = 'none';
        document.body.appendChild(iframe);
        
        // 创建表单并提交
        const form = document.createElement('form');
        form.method = 'POST';
        form.action = formSubmitUrl;
        form.target = 'hidden_feedback_iframe';
        
        // 添加表单字段
        for (const [key, value] of formData.entries()) {
            const input = document.createElement('input');
            input.type = 'hidden';
            input.name = key;
            input.value = value;
            form.appendChild(input);
        }
        
        // 添加表单到文档并提交
        document.body.appendChild(form);
        form.submit();
        
        // 如果可用，也使用EmailJS发送备份邮件
        if (window.emailJSAvailable && typeof emailjs !== 'undefined') {
            try {
                await emailjs.send(
                    'service_test',  // 使用默认服务ID
                    'template_test', // 使用默认模板ID
                    {
                        to_email: data.adminEmail,
                        usage_time: data.usageTime,
                        contact_info: data.contactInfo,
                        problem_desc: data.problemDesc,
                        timestamp: data.timestamp
                    }
                );
                console.log('EmailJS备用服务发送成功');
            } catch (err) {
                console.warn('EmailJS备用发送失败，但不影响主要提交:', err);
            }
        }
        
        // 处理清理工作
        setTimeout(() => {
            form.remove();
            iframe.remove();
        }, 2000);
        
        // 显示成功信息
        showFeedbackMessage('反馈已成功提交，感谢您的宝贵意见！', 'success');
        resetFeedbackForm();
        
    } catch (error) {
        console.error('发送反馈失败:', error);
        showFeedbackMessage('反馈提交失败，请稍后再试', 'error');
    } finally {
        resetSubmitButton();
    }
}

/**
 * 恢复提交按钮状态
 */
function resetSubmitButton() {
    const submitBtn = document.querySelector('.submit-btn');
    if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = '确认提交';
    }
}

/**
 * 显示反馈消息
 * @param {string} message - 要显示的消息
 * @param {string} type - 消息类型 (success/error)
 */
function showFeedbackMessage(message, type) {
    // 检查是否已存在消息元素
    let messageElement = document.querySelector('.feedback-message');
    
    // 如果不存在，创建一个新元素
    if (!messageElement) {
        messageElement = document.createElement('div');
        messageElement.className = 'feedback-message';
        const feedbackElement = document.querySelector('.feedback');
        feedbackElement.appendChild(messageElement);
    }
    
    // 设置消息内容和样式
    messageElement.textContent = message;
    messageElement.className = `feedback-message ${type}`;
    
    // 自动隐藏成功消息
    if (type === 'success') {
        setTimeout(() => {
            messageElement.style.opacity = '0';
            setTimeout(() => {
                messageElement.remove();
            }, 500);
        }, 3000);
    }
}

/**
 * 重置反馈表单
 */
function resetFeedbackForm() {
    const firstRadio = document.querySelector('input[name="usage-time"]');
    if (firstRadio) firstRadio.checked = true;
    
    const contactInput = document.querySelector('.contact-input');
    if (contactInput) contactInput.value = '';
    
    const textarea = document.querySelector('.feedback-item textarea');
    if (textarea) textarea.value = '';
}
