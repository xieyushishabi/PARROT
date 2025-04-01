document.addEventListener('DOMContentLoaded', function() {
    // 状态数据
    let state = {
        selectedVoiceId: null,
        volume: 1,
        pitch: 0,
        speed: 1,
        emotion: 'default',
        currentAudioData: null,
        isGenerating: false
    };

    // 初始化元素引用
    const elements = {
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

    // 音色数据
    const voices = [
        {
            id: 1,
            name: "谈小语",
            avatar: "assets/images/avatar-xiaoyu.png",
            description: "阳光开朗，富有激情",
            tags: ["标准", "活力", "多情感"],
            popular: 5621,
            type: "female"
        },
        {
            id: 2,
            name: "刘德华",
            avatar: "assets/images/avatar-1.png",
            description: "华仔经典音色，温柔磁性",
            tags: ["磁性", "温柔", "经典"],
            popular: 3421,
            type: "male"
        },
        {
            id: 3,
            name: "张学友",
            avatar: "assets/images/avatar-2.png",
            description: "学友天王的标志性声线",
            tags: ["高音", "情感", "细腻"],
            popular: 3156,
            type: "male"
        },
        {
            id: 4,
            name: "周杰伦",
            avatar: "assets/images/avatar-3.png",
            description: "周董独特的音色，慵懒感强",
            tags: ["特色", "慵懒", "韵律"],
            popular: 3789,
            type: "male"
        },
        {
            id: 5,
            name: "奶瓶",
            avatar: "assets/images/avatar-4.png",
            description: "清新脱俗，婉转动听",
            tags: ["甜美", "治愈", "少女"],
            popular: 2845,
            type: "female"
        },
        {
            id: 6,
            name: "小颜",
            avatar: "assets/images/avatar-5.png",
            description: "活泼可爱，青春洋溢",
            tags: ["可爱", "青春", "俏皮"],
            popular: 2156,
            type: "female"
        },
        {
            id: 7,
            name: "老杨",
            avatar: "assets/images/avatar-6.png",
            description: "沉稳大气，富有磁性",
            tags: ["沉稳", "专业", "权威"],
            popular: 1985,
            type: "male"
        }
    ];

    // 创建音色卡片
    function createVoiceCard(voice) {
        return `
            <div class="voice-card" data-voice-id="${voice.id}">
                <img src="${voice.avatar}" alt="${voice.name}">
                <div class="voice-info">
                    <h3>${voice.name}</h3>
                    <div class="tag-wrapper">
                        ${voice.tags.map(tag => `<span class="tag">${tag}</span>`).join('')}
                    </div>
                    <p>${voice.description.split(',').join('<br>')}</p>
                </div>
            </div>
        `;
    }

    // 渲染音色列表
    function renderVoiceList() {
        if (elements.voiceList) {
            elements.voiceList.innerHTML = voices.map(voice => createVoiceCard(voice)).join('');
            
            // 添加点击事件
            document.querySelectorAll('.voice-card').forEach(card => {
                card.addEventListener('click', function() {
                    const voiceId = parseInt(this.dataset.voiceId);
                    const selectedVoice = voices.find(v => v.id === voiceId);
                    if (selectedVoice) {
                        // 更新状态
                        state.selectedVoiceId = voiceId;
                        
                        // 更新UI
                        document.querySelectorAll('.voice-card').forEach(c => {
                            c.classList.remove('selected');
                        });
                        this.classList.add('selected');
                        
                        // 更新右侧小头像
                        const voiceBtn = document.querySelector('.voice-btn');
                        if (voiceBtn) {
                            const img = voiceBtn.querySelector('img');
                            if (img) {
                                img.src = selectedVoice.avatar;
                                img.alt = selectedVoice.name;
                            }
                            // 更新名称
                            voiceBtn.innerHTML = `
                                <img src="${selectedVoice.avatar}" alt="${selectedVoice.name}">
                                ${selectedVoice.name}
                            `;
                        }
                        
                        // 通知用户已选择新音色，但不自动生成配音
                        dubbingService.showNotification(`已选择音色: ${selectedVoice.name}`, 'info');
                    }
                });
            });
            
            // 默认选中第一个音色
            const firstVoiceCard = document.querySelector('.voice-card');
            if (firstVoiceCard) {
                firstVoiceCard.click();
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
    
    // 试听按钮事件处理
    async function handlePreviewClick() {
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
            state.isGenerating = true;
            
            // 准备配音参数
            const params = {
                text: elements.textarea.value,
                voiceId: state.selectedVoiceId,
                volume: state.volume,
                pitch: state.pitch,
                speed: state.speed,
                emotion: state.emotion
            };
            
            // 生成配音
            const audioData = await dubbingService.generateDubbing(params);
            state.currentAudioData = audioData;
            
            // 播放音频
            await dubbingService.playAudio(audioData);
        } catch (error) {
            console.error('试听失败:', error);
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
    function init() {
        renderVoiceList();
        initControlPanelEvents();
        initEventListeners();
        updateStats();
    }
    
    // 启动应用
    init();
});
