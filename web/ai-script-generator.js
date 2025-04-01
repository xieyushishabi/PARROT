/**
 * AI生成配音文案功能
 * 使用DeepSeek API生成符合指定要求的配音文案
 */

// DeepSeek API 配置
const DEEPSEEK_API_KEY = 'sk-7542d260458241e888feae169762ced2';
const DEEPSEEK_API_URL = 'https://api.deepseek.com/v1/chat/completions';

document.addEventListener('DOMContentLoaded', function() {
    // 设置事件监听器
    setupEventListeners();
});

// 设置事件监听器
function setupEventListeners() {
    // 获取页面上已有的生成文案按钮
    const createBtn = document.querySelector('.create-btn');
    const aiPromptInput = document.querySelector('.input-section input');
    const textArea = document.querySelector('.text-area textarea');
    
    if (!createBtn || !aiPromptInput || !textArea) {
        console.error('找不到必要的页面元素');
        return;
    }
    
    // 为已有的创作文章按钮添加事件
    createBtn.addEventListener('click', async function() {
        const prompt = aiPromptInput.value.trim();
        
        if (!prompt) {
            alert('请输入文案主题或关键内容描述');
            return;
        }
        
        // 显示加载状态
        const originalText = createBtn.textContent;
        createBtn.textContent = '生成中...';
        createBtn.disabled = true;
        
        try {
            // 默认使用中等长度和日常风格
            const script = await generateScript(prompt, 'medium', 'casual');
            
            try {
                // 清理文本，移除可能的特殊字符和多余空白
                const cleanedScript = cleanGeneratedText(script);
                console.log('处理前:', script.length, '字符, 处理后:', cleanedScript.length, '字符');
                
                // 直接更新DOM元素的值
                textArea.value = '';
                setTimeout(() => {
                    // 清空后再设置值，避免浏览器缓存问题
                    textArea.value = cleanedScript;
                    // 手动触发输入事件以更新字数统计
                    textArea.dispatchEvent(new Event('input'));
                    console.log('已成功插入文案，最终长度:', textArea.value.length);
                }, 50);
            } catch (error) {
                console.error('插入文本时出错:', error);
            }
            
        } catch (error) {
            console.error('生成文案失败:', error);
            alert('生成文案失败，请稍后重试');
        } finally {
            // 恢复按钮状态
            createBtn.textContent = originalText;
            createBtn.disabled = false;
        }
    });
}

// 生成文案的主函数
async function generateScript(topic, length = 'medium', style = 'casual') {
    try {
        // 构建提示词
        const prompt = `请生成一篇${getStyleText(style)}风格的${getLengthText(length)}配音文案，主题是: ${topic}。
        要求：
        1. 语言流畅，适合朗读
        2. 内容生动有趣，能吸引听众
        3. 段落结构清晰
        4. 只返回文案内容，不要包含其他解释`;
        
        return await generateScriptWithDeepseek(prompt);
    } catch (error) {
        console.error('生成脚本失败:', error);
        throw error;
    }
}

// 根据选择获取长度描述
function getLengthText(length) {
    switch(length) {
        case 'short': return '短(100字以内)';
        case 'medium': return '中等(300字左右)';
        case 'long': return '长(500字以上)';
        default: return '中等(300字左右)';
    }
}

// 根据选择获取风格描述
function getStyleText(style) {
    switch(style) {
        case 'formal': return '正式';
        case 'casual': return '日常';
        case 'humorous': return '幽默';
        case 'professional': return '专业';
        default: return '日常';
    }
}

// 使用DeepSeek API生成文案
async function generateScriptWithDeepseek(prompt) {
    try {
        console.log('正在调用DeepSeek API生成文案...');
        
        const response = await fetch(DEEPSEEK_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${DEEPSEEK_API_KEY}`
            },
            body: JSON.stringify({
                model: 'deepseek-chat',
                messages: [
                    {
                        role: 'user',
                        content: prompt
                    }
                ],
                temperature: 0.7,
                max_tokens: 2000
            })
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error?.message || '请求失败');
        }
        
        const data = await response.json();
        console.log('文案生成成功');
        // 获取API返回的原始文本
        const rawText = data.choices[0].message.content;
        
        // 确保有效文本
        if (!rawText || typeof rawText !== 'string') {
            console.error('无效的API响应内容:', data);
            throw new Error('从 API 返回的文本无效');
        }
        
        return rawText;
    } catch (error) {
        console.error('DeepSeek API请求失败:', error);
        throw error;
    }
}

// 清理生成的文本，移除可能的特殊字符和格式化问题
function cleanGeneratedText(text) {
    if (!text) return '';
    
    // 输出原始文本信息便于调试
    console.log('原始文本:', text.length, '字符');
    
    // 移除所有HTML标签
    let cleaned = text.replace(/<[^>]*>/g, '');
    
    // 移除可能的不可见特殊字符
    cleaned = cleaned.replace(/[\u200B-\u200D\uFEFF\u2028\u2029\u0000-\u001F]/g, '');
    
    // 处理首尾空白
    cleaned = cleaned.trim();
    
    // 将多个连续的空行替换为一个空行
    cleaned = cleaned.replace(/\n\s*\n\s*\n/g, '\n\n');
    
    // 移除可能的代码块格式或Markdown标记
    cleaned = cleaned.replace(/```[\s\S]*?```/g, '');
    cleaned = cleaned.replace(/~~~[\s\S]*?~~~/g, '');
    
    // 移除可能的Markdown标题标记
    cleaned = cleaned.replace(/^#+\s+.*$/gm, '');
    
    // 移除可能的Markdown列表标记
    cleaned = cleaned.replace(/^[\*\-\+]\s+/gm, '');
    cleaned = cleaned.replace(/^\d+\.\s+/gm, '');
    
    // 移除可能的其他Markdown格式
    cleaned = cleaned.replace(/\*\*|__|~~|`/g, '');
    
    // 再次整理首尾空白
    cleaned = cleaned.trim();
    
    console.log('清理后文本:', cleaned.length, '字符');
    return cleaned;
}
