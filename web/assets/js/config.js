/**
 * PARROT应用配置文件
 * 包含可以修改的全局设置
 */

// 管理员配置
const ADMIN_CONFIG = {
    // 意见反馈收件邮箱 - 修改此处可以更改接收反馈的邮箱地址
    FEEDBACK_EMAIL: 'PARROTADMIN123@163.com',
    
    // 反馈邮件主题
    FEEDBACK_SUBJECT: 'PARROT音响用户反馈',
    
    // 是否发送备份邮件
    SEND_BACKUP_EMAIL: true
};

// 导出配置供其他文件使用
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { ADMIN_CONFIG };
} else {
    // 在浏览器环境中直接暴露到全局
    window.ADMIN_CONFIG = ADMIN_CONFIG;
}
