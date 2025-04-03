document.addEventListener('DOMContentLoaded', function() {
    // 状态数据
    let state = {
        selectedVoiceId: null,
        volume: 1,
        pitch: 0,
        speed: 1,
        emotion: 'default',
        currentAudioData: null,
        isGenerating: false,
        // 缓存机制
        cache: {
            text: '',
            voiceId: null,
            params: null,
            audioData: null
        }
    };

    // 初始化元素引用
    const elements = {
        // 添加调试输出代码
        initialize: function() {
            console.log('正在初始化元素引用...');
            // 检查生成音频按钮是否存在
            const previewBtn = document.querySelector('.btn-preview');
            console.log('生成音频按钮状态:', previewBtn ? '已找到' : '未找到');
            if (!previewBtn) {
                console.error('无法找到生成音频按钮！请检查HTML结构。');
            }
            return this;
        },
        textarea: document.querySelector('.text-editor-container textarea'),
        wordCount: document.querySelector('.word-count'),
        duration: document.querySelector('.duration'),
        wordLimitTip: document.querySelector('.word-limit-tip'),
        voiceList: document.querySelector('.voice-list'),
        volumeSlider: document.querySelector('.control-item input[type="range"]:nth-of-type(1)'),
        volumeInput: document.querySelector('.control-item input[type="text"]:nth-of-type(1)'),
        pitchSlider: document.querySelector('.control-item input[type="range"]:nth-of-type(2)'),
        pitchInput: document.querySelector('.control-item input[type="text"]:nth-of-type(2)'),
        speedSlider: document.querySelector('.control-item input[type="range"]:nth-of-type(3)'),
        speedInput: document.querySelector('.control-item input[type="text"]:nth-of-type(3)'),
        emotionTags: document.querySelectorAll('.emotion-tag'),
        previewButton: document.querySelector('.btn-preview'),
        exportButton: document.querySelector('.btn-export'),
        clearButton: document.querySelector('.btn-clear'),
        confirmDialog: document.querySelector('.confirm-dialog'),
        confirmYesButton: document.querySelector('.confirm-btn'),
        confirmNoButton: document.querySelector('.cancel-btn'),
        fileInput: document.getElementById('file-input'),
        importButton: document.querySelector('.btn-guide'),
        createScriptBtn: document.querySelector('.create-btn'),
        scriptInput: document.querySelector('.input-section input')
    };

    // 更新数字统计
    function updateStats() {
        if (!elements.textarea) return;
        
        const text = elements.textarea.value;
        const wordCount = text.length;
        
        if (elements.wordCount) {
            elements.wordCount.textContent = `字数统计 ${wordCount}/8000`;
        }
        
        if (elements.duration) {
            // 计算预估时长 (按平均每分钟300字)
            const totalSeconds = Math.ceil(wordCount / 5);
            const hours = Math.floor(totalSeconds / 3600);
            const minutes = Math.floor((totalSeconds % 3600) / 60);
            const seconds = totalSeconds % 60;
            const duration = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
            elements.duration.textContent = `预估时长 ${duration}`;
        }
        
        // 字数限制检查
        if (elements.wordLimitTip) {
            if (wordCount >= 8000) {
                elements.wordLimitTip.style.display = 'block';
                elements.textarea.value = text.slice(0, 8000);
            } else {
                elements.wordLimitTip.style.display = 'none';
            }
        }
    }

    // 音色数据 - 从服务器获取
    let voices = [];
    
    // 从API获取音色列表
    async function fetchVoiceList() {
        try {
            const response = await fetch('http://127.0.0.1:8000/api/v1/tts/voices');
            if (!response.ok) {
                throw new Error(`获取音色列表失败: ${response.status}`);
            }
            
            const data = await response.json();
            console.log('获取音色列表成功:', data);
            
            // 将API返回的音色格式化为前端需要的格式
            voices = data.voice_samples.map((sample, index) => {
                // 为每个音色生成一个随机的用户头像和描述
                const avatarIndex = (index % 6) + 1; // 1-6之间循环
                const popular = Math.floor(Math.random() * 3000) + 1000; // 1000-4000之间的随机数
                
                // 根据文件名判断性别
                const isFemale = sample.name.includes('女') || sample.name.includes('腔');
                const type = isFemale ? 'female' : 'male';
                
                // 根据名称设置描述和标签
                let description = "专业配音，清晰自然";
                let tags = ["专业", "清晰", "自然"];
                
                // 针对特定音色设置特殊描述
                if (sample.name.includes('cctv')) {
                    description = "专业播音腔，标准普通话";
                    tags = ["播音", "权威", "标准"];
                } else if (sample.name.includes('剑魔')) {
                    description = "低沉磁性，具有力量感";
                    tags = ["磁性", "力量", "特色"];
                } else if (sample.name.includes('女声')) {
                    description = "温柔甜美，清晰自然";
                    tags = ["甜美", "温柔", "清晰"];
                } else if (sample.name.includes('英语')) {
                    description = "英语发音标准，语调自然";
                    tags = ["英语", "国际化", "专业"];
                } else if (sample.name.includes('蔡徐坤')) {
                    description = "独特音色，有辨识度";
                    tags = ["特色", "年轻", "活力"];
                }
                
                return {
                    id: sample.id,
                    name: sample.name,
                    avatar: `assets/images/avatar-${avatarIndex}.png`,
                    description: description,
                    tags: tags,
                    popular: popular,
                    type: type,
                    // 保存原始路径，用于API调用
                    path: sample.path
                };
            });
            
            // 如果没有获取到音色，使用默认音色
            if (voices.length === 0) {
                voices = [{
                    id: 'default',
                    name: "默认音色",
                    avatar: "assets/images/avatar-default.png",
                    description: "系统默认音色，清晰自然",
                    tags: ["标准", "清晰", "自然"],
                    popular: 5000,
                    type: "male"
                }];
            }
            
            return voices;
        } catch (error) {
            console.error('获取音色列表失败:', error);
            dubbingService.showNotification('获取音色列表失败，使用默认音色', 'error');
            
            // 返回默认音色
            voices = [{
                id: 'default',
                name: "默认音色",
                avatar: "assets/images/avatar-default.png",
                description: "系统默认音色，清晰自然",
                tags: ["标准", "清晰", "自然"],
                popular: 5000,
                type: "male"
            }];
            return voices;
        }
    }

    // 创建音色卡片
    function createVoiceCard(voice) {
        // 为各个音色设置适当的标签和描述
        let description = "";
        let tags = [];
        let avatar = "assets/images/avatar-1.png";
        
        // 根据音色名称设置不同的标签和描述
        if (voice.name.includes('女声')) {
            description = "温柔的女性音色\n适合生活场景配音";
            tags = ["女声", "温柔", "亲切"];
            avatar = "assets/images/avatar-3.png";
        } else if (voice.name.includes('蔡徐坤')) {
            description = "独特音色\n具有较高辨识度";
            tags = ["特色", "年轻", "个性"];
            avatar = "assets/images/avatar-4.png";
        } else if (voice.name.includes('剑魔')) {
            description = "低沉磁性男声\n适合游戏和影视配音";
            tags = ["磁性", "低沉", "力量"];
            avatar = "assets/images/avatar-5.png";
        } else if (voice.name.includes('英语')) {
            description = "标准英语发音\n适合教学和国际化内容";
            tags = ["英语", "标准", "清晰"];
            avatar = "assets/images/avatar-6.png";
        } else if (voice.name.includes('cctv')) {
            description = "专业播音腔\n标准普通话发音";
            tags = ["权威", "正式", "播音"];
            avatar = "assets/images/avatar-1.png";
        } else {
            description = "标准音色\n适合各类场景配音";
            tags = ["标准", "清晰", "自然"];
            avatar = "assets/images/avatar-2.png";
        }
        
        return `
            <div class="voice-card" data-voice-id="${voice.id}">
                <div class="selection-indicator">
                    <i class="fas fa-check-circle"></i>
                </div>
                <img src="${avatar}" alt="${voice.name}">
                <div class="voice-info">
                    <h3>${voice.name}</h3>
                    <div class="tag-wrapper">
                        ${tags.map(tag => `<span class="tag">${tag}</span>`).join('')}
                    </div>
                    <p>${description.replace('\n', '<br>')}</p>
                </div>
            </div>
        `;
    }

    // 渲染音色列表
    async function renderVoiceList() {
        if (elements.voiceList) {
            try {
                // 显示加载中的提示
                elements.voiceList.innerHTML = '<div class="loading-voices">\u6b63\u5728\u52a0\u8f7d\u53ef\u7528\u97f3\u8272...</div>';
                
                // 如果音色列表为空，先获取音色列表
                if (voices.length === 0) {
                    await fetchVoiceList();
                }
                
                // 显示音色卡片
                elements.voiceList.innerHTML = voices.map(voice => createVoiceCard(voice)).join('');
                
                // 添加点击事件
                document.querySelectorAll('.voice-card').forEach(card => {
                    card.addEventListener('click', function() {
                        // 获取音色ID
                        const voiceId = this.dataset.voiceId;
                        const selectedVoice = voices.find(v => v.id === voiceId);
                        
                        if (selectedVoice) {
                            // 更新状态
                            state.selectedVoiceId = voiceId;
                            state.selectedVoicePath = selectedVoice.path; // 保存音色路径供配音生成时使用
                            
                            // 更新UI选中状态
                            document.querySelectorAll('.voice-card').forEach(c => {
                                c.classList.remove('selected');
                            });
                            this.classList.add('selected');
                            
                            // 更新右侧小头像
                            const voiceBtn = document.querySelector('.voice-btn');
                            if (voiceBtn) {
                                voiceBtn.innerHTML = `
                                    <img src="${selectedVoice.avatar}" alt="${selectedVoice.name}">
                                    ${selectedVoice.name}
                                `;
                            }
                            
                            // 显示当前选择的音色信息
                            const currentVoiceInfo = document.querySelector('.current-voice-info') || document.createElement('div');
                            currentVoiceInfo.className = 'current-voice-info';
                            currentVoiceInfo.innerHTML = `当前选择的音色: <strong>${selectedVoice.name}</strong>`;
                            
                            // 如果元素不存在，添加到DOM
                            if (!document.querySelector('.current-voice-info')) {
                                const controlPanel = document.querySelector('.control-panel');
                                if (controlPanel) {
                                    controlPanel.insertBefore(currentVoiceInfo, controlPanel.firstChild);
                                }
                            }
                            
                            // 通知用户已选择新音色
                            dubbingService.showNotification(`已选择音色: ${selectedVoice.name}`, 'info');
                            
                            console.log('选择音色:', selectedVoice);
                        }
                    });
                });
                
                // 默认选中第一个音色
                if (voices.length > 0 && !state.selectedVoiceId) {
                    const firstVoiceCard = document.querySelector('.voice-card');
                    if (firstVoiceCard) {
                        firstVoiceCard.click();
                    }
                }
            } catch (error) {
                console.error('渲染音色列表失败:', error);
                elements.voiceList.innerHTML = '<div class="error-message">\u52a0\u8f7d\u97f3\u8272\u5217\u8868\u5931\u8d25\uff0c\u8bf7\u5237\u65b0\u9875\u9762\u91cd\u8bd5</div>';
            }
        }
        }
    }
    
    // 初始化控制面板事件
    function initControlPanelEvents() {
        // 音量控制
        if (elements.volumeSlider && elements.volumeInput) {
            elements.volumeSlider.addEventListener('input', function() {
                const value = parseFloat(this.value);
                elements.volumeInput.value = value;
                state.volume = value;
            });
            
            elements.volumeInput.addEventListener('change', function() {
                let value = parseFloat(this.value);
                // 限制范围
                value = Math.min(Math.max(value, 0), 2);
                this.value = value;
                elements.volumeSlider.value = value;
                state.volume = value;
            });
        }
        
        // 音调控制
        if (elements.pitchSlider && elements.pitchInput) {
            elements.pitchSlider.addEventListener('input', function() {
                const value = parseInt(this.value);
                elements.pitchInput.value = value;
                state.pitch = value;
            });
            
            elements.pitchInput.addEventListener('change', function() {
                let value = parseInt(this.value);
                // 限制范围
                value = Math.min(Math.max(value, -500), 500);
                this.value = value;
                elements.pitchSlider.value = value;
                state.pitch = value;
            });
        }
        
        // 语速控制
        if (elements.speedSlider && elements.speedInput) {
            elements.speedSlider.addEventListener('input', function() {
                const value = parseFloat(this.value);
                elements.speedInput.value = value;
                state.speed = value;
            });
            
            elements.speedInput.addEventListener('change', function() {
                let value = parseFloat(this.value);
                // 限制范围
                value = Math.min(Math.max(value, 0.5), 2);
                this.value = value;
                elements.speedSlider.value = value;
                state.speed = value;
            });
        }
        
        // 情感选择
        if (elements.emotionTags) {
            elements.emotionTags.forEach(tag => {
                tag.addEventListener('click', function() {
                    // 移除其他标签的选中状态
                    elements.emotionTags.forEach(t => t.classList.remove('selected'));
                    // 添加选中状态
                    this.classList.add('selected');
                    // 更新状态
                    state.emotion = this.textContent.trim();
                });
            });
        }
    }
    
    // 生成音频按钮事件处理
    async function handlePreviewClick() {
        console.log('点击生成音频按钮');
        // 检查按钮是否正常触发事件
        if (!elements.textarea || !elements.textarea.value.trim()) {
            dubbingService.showNotification('请先输入文本内容', 'error');
            return;
        }
        
        // 如果当前正在播放，则停止播放
        if (dubbingService.isPlaying) {
            dubbingService.stopAudio();
            return;
        }
        
        try {
            // 检查是否选择了音色
            if (!state.selectedVoiceId) {
                dubbingService.showNotification('请先选择一个音色', 'warning');
                return;
            }
            
            state.isGenerating = true;
            
            // 获取选定的音色
            const selectedVoice = voices.find(v => v.id === state.selectedVoiceId);
            if (!selectedVoice) {
                throw new Error('无法找到选定的音色');
            }
            
            // 准备配音参数
            const params = {
                text: elements.textarea.value,
                // 传递选定的音色名称
                voiceSample: selectedVoice.name,
                // 通用参数
                p_w: 2.0, // 清晰度权重
                t_w: 3.0, // 相似度权重
                volume: state.volume,
                pitch: state.pitch,
                speed: state.speed,
                emotion: state.emotion
            };
            
            console.log('选定音色参数:', params.voiceSample);
            
            // 记录日志
            console.log('生成新的音频数据, 使用音色:', selectedVoice.name, selectedVoice);
            
            // 显示生成提示
            dubbingService.showNotification(`正在生成音频 (音色: ${selectedVoice.name})...`, 'info');
            
            // 生成配音
            const audioData = await dubbingService.generateDubbing(params);
            
            // 更新缓存
            if (audioData) {
                state.cache.text = params.text;
                state.cache.voiceId = state.selectedVoiceId;
                state.cache.params = {...params};
                state.cache.audioData = audioData;
                
                // 显示成功消息，并引导用户去音频记录页面
                dubbingService.showNotification(
                    `音频生成成功！(音色: ${selectedVoice.name}) 已保存到音频记录，<a href="history.html">点击这里查看</a>`, 
                    'success', 
                    6000
                );
                
                // 自动播放生成的音频
                await dubbingService.playAudio(audioData);
                
                // 保存当前音频数据
                state.currentAudioData = audioData;
            }
        } catch (error) {
            console.error('音频生成失败:', error);
            dubbingService.showNotification('音频生成失败，请稍后重试', 'error');
        } finally {
            state.isGenerating = false;
        }
    }
    
    // 导出按钮事件处理
    function handleExportClick() {
        if (!state.currentAudioData) {
            dubbingService.showNotification('请先生成配音', 'error');
            return;
        }
        
        // 弹出导出对话框
        showExportDialog();
    }
    
    // 显示导出对话框
    function showExportDialog() {
        // 创建导出对话框
        let exportDialog = document.querySelector('.export-dialog');
        
        if (!exportDialog) {
            exportDialog = document.createElement('div');
            exportDialog.className = 'export-dialog';
            exportDialog.innerHTML = `
                <div class="dialog-header">
                    <h3>导出音频</h3>
                    <button class="close-btn">×</button>
                </div>
                <div class="dialog-content">
                    <div class="form-group">
                        <label for="export-format">格式选择：</label>
                        <select id="export-format">
                            <option value="mp3">MP3</option>
                            <option value="wav">WAV</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label for="export-filename">文件名：</label>
                        <input type="text" id="export-filename" value="PARROT配音_${new Date().toISOString().slice(0, 10)}">
                    </div>
                </div>
                <div class="dialog-footer">
                    <button class="btn-cancel">取消</button>
                    <button class="btn-export">导出</button>
                </div>
            `;
            
            document.body.appendChild(exportDialog);
            
            // 添加事件监听
            const closeBtn = exportDialog.querySelector('.close-btn');
            const cancelBtn = exportDialog.querySelector('.btn-cancel');
            const exportBtn = exportDialog.querySelector('.btn-export');
            
            closeBtn.addEventListener('click', hideExportDialog);
            cancelBtn.addEventListener('click', hideExportDialog);
            
            exportBtn.addEventListener('click', function() {
                const format = document.getElementById('export-format').value;
                const filename = document.getElementById('export-filename').value;
                
                // 导出音频
                dubbingService.downloadAudio(state.currentAudioData, `${filename}.${format}`);
                hideExportDialog();
            });
        }
        
        // 显示对话框
        exportDialog.classList.add('active');
    }
    
    // 隐藏导出对话框
    function hideExportDialog() {
        const exportDialog = document.querySelector('.export-dialog');
        if (exportDialog) {
            exportDialog.classList.remove('active');
        }
    }
    
    // 清空按钮事件处理
    function handleClearClick() {
        if (!elements.textarea || !elements.textarea.value.trim()) {
            return;
        }
        
        // 显示确认对话框
        if (elements.confirmDialog) {
            elements.confirmDialog.style.display = 'block';
        }
    }
    
    // 文件导入事件处理
    function handleFileImport(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = function(e) {
            if (elements.textarea) {
                elements.textarea.value = e.target.result;
                updateStats();
            }
        };
        reader.readAsText(file);
    }
    
    // 与AI脚本生成器交互
    function handleCreateScript() {
        if (!elements.scriptInput || !elements.scriptInput.value.trim()) {
            dubbingService.showNotification('请输入创作需求描述', 'error');
            return;
        }
        
        dubbingService.showLoadingState(true, '正在生成文案...');
        
        // 调用AI脚本生成器API
        setTimeout(() => {
            // 这里模拟API调用结果，实际项目中应该调用真实的API
            const demoScript = `尊敬的用户，欢迎体验PARROT智能配音平台。

这是一段由AI生成的示例文案，您可以根据自己的需求调整音量、音调和语速，选择不同的情感风格，打造专属于您的配音作品。

我们的平台提供多种优质音色，支持多场景应用，无论是影视配音、广告宣传还是教育课件，都能轻松应对。希望PARROT能成为您创作路上的得力助手！`;
            
            if (elements.textarea) {
                elements.textarea.value = demoScript;
                updateStats();
            }
            
            dubbingService.showLoadingState(false);
            dubbingService.showNotification('文案生成成功', 'success');
        }, 2000);
    }
    
    // 初始化事件监听
    function initEventListeners() {
        // 文本框事件
        if (elements.textarea) {
            elements.textarea.addEventListener('input', updateStats);
        }
        
        // 试听按钮
        if (elements.previewButton) {
            elements.previewButton.addEventListener('click', handlePreviewClick);
        }
        
        // 导出按钮
        if (elements.exportButton) {
            elements.exportButton.addEventListener('click', handleExportClick);
        }
        
        // 清空按钮
        if (elements.clearButton) {
            elements.clearButton.addEventListener('click', handleClearClick);
        }
        
        // 确认对话框按钮
        if (elements.confirmYesButton && elements.confirmNoButton) {
            elements.confirmYesButton.addEventListener('click', function() {
                if (elements.textarea) {
                    elements.textarea.value = '';
                    updateStats();
                }
                if (elements.confirmDialog) {
                    elements.confirmDialog.style.display = 'none';
                }
                state.currentAudioData = null;
            });
            
            elements.confirmNoButton.addEventListener('click', function() {
                if (elements.confirmDialog) {
                    elements.confirmDialog.style.display = 'none';
                }
            });
        }
        
        // 文件导入
        if (elements.fileInput) {
            elements.fileInput.addEventListener('change', handleFileImport);
        }
        
        // AI文案生成
        if (elements.createScriptBtn) {
            elements.createScriptBtn.addEventListener('click', handleCreateScript);
        }
    }

    // 初始化
    async function init() {
        try {
            console.log('初始化配音页面...');
            
            // 初始化元素引用
            elements.initialize();
            
            // 获取音色列表并渲染
            await renderVoiceList();
            
            // 直接绑定生成音频按钮事件，确保它能被正确绑定
            const previewButton = document.querySelector('.btn-preview');
            if (previewButton) {
                console.log('直接绑定生成音频按钮事件');
                previewButton.addEventListener('click', function() {
                    console.log('按钮被点击！');
                    handlePreviewClick();
                });
            } else {
                console.error('未找到生成音频按钮，无法绑定事件！');
            }
            
            // 初始化控制面板事件
            initControlPanelEvents();
            
            // 初始化各种事件监听器
            initEventListeners();
            
            // 更新文本统计
            updateStats();
            
            console.log('配音页面初始化完成');
        } catch (error) {
            console.error('配音页面初始化失败:', error);
            dubbingService.showNotification('系统初始化遇到问题，请刷新页面重试', 'error');
        }
    }
    
    // 启动应用
    init();
});
