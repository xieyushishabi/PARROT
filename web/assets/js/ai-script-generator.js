/**
 * AI生成配音文案功能
 * 使用DeepSeek API生成符合指定要求的配音文案
 */

// DeepSeek API 配置
const DEEPSEEK_API_KEY = 'sk-7542d260458241e888feae169762ced2';
const DEEPSEEK_API_URL = 'https://api.deepseek.com/v1/chat/completions';

document.addEventListener('DOMContentLoaded', function() {
    // 添加AI生成文案UI
    addAiScriptGeneratorUI();
    
    // 设置事件监听器
    setupEventListeners();
});

// 添加AI生成文案UI到控制面板
function addAiScriptGeneratorUI() {
    const controlPanel = document.querySelector('.control-panel');
    if (!controlPanel) return;
    
    // 创建AI文案生成区域
    const aiScriptSection = document.createElement('div');
    aiScriptSection.className = 'ai-script-section';
    aiScriptSection.innerHTML = `
        <h3>AI生成配音文案</h3>
        <div class="ai-script-inputs">
            <textarea id="ai-prompt" rows="3" placeholder="输入文案主题或关键内容描述"></textarea>
            <div class="ai-script-controls">
                <select id="ai-script-length">
                    <option value="short">短文案</option>
                    <option value="medium" selected>中等长度</option>
                    <option value="long">长文案</option>
                </select>
                <select id="ai-script-style">
                    <option value="casual" selected>日常风格</option>
                    <option value="formal">正式风格</option>
                    <option value="humorous">幽默风格</option>
                    <option value="professional">专业风格</option>
                </select>
            </div>
            <div class="ai-controls">
                <button id="generate-script-btn" class="generate-script-btn">生成文案</button>
                <div id="ai-loading" class="ai-loading" style="display: none;">
                    <div class="spinner"></div>
                    <span>生成中...</span>
                </div>
            </div>
        </div>
    `;
    
    // 添加样式
    const styleElement = document.createElement('style');
    styleElement.textContent = `
        /* AI生成配音文案功能样式 */
        .ai-script-section {
            padding: 15px;
            border-bottom: 1px solid #e5e5e5;
            margin-bottom: 10px;
        }
        
        .ai-script-section h3 {
            font-size: 16px;
            margin-bottom: 10px;
            color: #333;
        }
        
        .ai-script-inputs {
            display: flex;
            flex-direction: column;
            gap: 10px;
        }
        
        .ai-script-inputs textarea {
            width: 100%;
            padding: 8px;
            border: 1px solid #ddd;
            border-radius: 4px;
            resize: none;
            font-size: 14px;
        }
        
        .ai-script-controls {
            display: flex;
            gap: 8px;
        }
        
        .ai-script-controls select {
            flex: 1;
            padding: 6px;
            border: 1px solid #ddd;
            border-radius: 4px;
            background-color: white;
        }
        
        .generate-script-btn {
            padding: 8px 15px;
            background-color: #1890ff;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-weight: bold;
            transition: background-color 0.3s;
        }
        
        .generate-script-btn:hover {
            background-color: #40a9ff;
        }
        
        .generate-script-btn:disabled {
            background-color: #b0b0b0;
            cursor: not-allowed;
        }
        
        .ai-loading {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 10px;
            color: #1890ff;
        }
        
        .spinner {
            width: 20px;
            height: 20px;
            border: 3px solid rgba(24, 144, 255, 0.3);
            border-radius: 50%;
            border-top-color: #1890ff;
            animation: spin 1s linear infinite;
        }
        
        @keyframes spin {
            to { transform: rotate(360deg); }
        }
    `;
    
    document.head.appendChild(styleElement);
    
    // 插入到控制面板最前面
    const firstChild = controlPanel.firstChild;
    controlPanel.insertBefore(aiScriptSection, firstChild);
}

// 设置事件监听器
function setupEventListeners() {
    const generateBtn = document.getElementById('generate-script-btn');
    if (!generateBtn) {
        // 等待DOM加载完成
        setTimeout(setupEventListeners, 500);
        return;
    }
    
    const aiPrompt = document.getElementById('ai-prompt');
    const aiScriptLength = document.getElementById('ai-script-length');
    const aiScriptStyle = document.getElementById('ai-script-style');
    const aiLoading = document.getElementById('ai-loading');
    const textArea = document.querySelector('.text-area textarea');
    
    generateBtn.addEventListener('click', async function() {
        if (!aiPrompt.value.trim()) {
            alert('请输入文案主题或关键内容描述');
            return;
        }
        
        // 显示加载状态
        aiLoading.style.display = 'flex';
        generateBtn.disabled = true;
        
        try {
            const length = aiScriptLength.value;
            const style = aiScriptStyle.value;
            
            // 构建提示词
            const prompt = `请生成一篇${getStyleText(style)}风格的${getLengthText(length)}配音文案，主题是: ${aiPrompt.value}。
            要求：
            1. 语言流畅，适合朗读
            2. 内容生动有趣，能吸引听众
            3. 段落结构清晰
            4. 只返回文案内容，不要包含其他解释`;
            
            const script = await generateScriptWithDeepseek(prompt);
            
            // 将生成的文案填入编辑区
            textArea.value = script;
            // 触发字数统计更新事件
            const event = new Event('input');
            textArea.dispatchEvent(event);
            
        } catch (error) {
            console.error('生成文案失败:', error);
            alert('生成文案失败，请稍后重试');
        } finally {
            // 隐藏加载状态
            aiLoading.style.display = 'none';
            generateBtn.disabled = false;
        }
    });
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
        return data.choices[0].message.content.trim();
    } catch (error) {
        console.error('DeepSeek API请求失败:', error);
        throw error;
    }
}
