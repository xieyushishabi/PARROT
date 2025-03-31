class TextAnnotation {
    constructor() {
        this.editor = document.getElementById('editor');
        this.highlightLayer = document.getElementById('highlight-layer');
        this.toolButtons = document.querySelectorAll('.tool-btn');
        this.clearButton = document.getElementById('clear-btn');
        this.importButton = document.getElementById('import-btn');
        this.annotations = [];
        
        this.initEvents();
        this.initDurationCalculation();
        this.initClearButton();
        this.initImportButton();
    }

    initEvents() {
        // 监听工具按钮点击
        this.toolButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                // 只有标注相关的按钮才需要检查文本选择
                if (this.isAnnotationButton(btn)) {
                    const selection = window.getSelection();
                    if (!selection.toString()) {
                        alert('请先选择要标注的文本');
                        return;
                    }
                    const toolType = btn.querySelector('span').textContent;
                    this.addAnnotation(toolType);
                }
            });
        });

        // 监听编辑器内容变化
        this.editor.addEventListener('input', () => {
            this.updateHighlightLayer();
            this.updateDuration();
        });

        // 监听滚动同步
        this.editor.addEventListener('scroll', () => {
            this.highlightLayer.scrollTop = this.editor.scrollTop;
        });
    }

    // 判断是否为标注按钮
    isAnnotationButton(btn) {
        const type = btn.querySelector('span').textContent;
        return this.getAnnotationType(type) !== type; // 如果能在typeMap中找到对应的类型，就是标注按钮
    }

    // 初始化清空按钮
    initClearButton() {
        if (this.clearButton) {
            this.clearButton.addEventListener('click', () => {
                if (confirm('确定要清空所有内容吗？此操作不可撤销。')) {
                    this.editor.textContent = '';
                    this.updateHighlightLayer();
                    this.updateDuration();
                }
            });
        }
    }

    // 初始化导入按钮
    initImportButton() {
        if (this.importButton) {
            // 创建隐藏的文件输入框
            const fileInput = document.createElement('input');
            fileInput.type = 'file';
            fileInput.accept = '.txt';
            fileInput.style.display = 'none';
            document.body.appendChild(fileInput);

            // 点击导入按钮时触发文件选择
            this.importButton.addEventListener('click', () => {
                fileInput.click();
            });

            // 处理文件选择
            fileInput.addEventListener('change', (e) => {
                const file = e.target.files[0];
                if (file) {
                    const reader = new FileReader();
                    reader.onload = (e) => {
                        this.editor.textContent = e.target.result;
                        this.updateHighlightLayer();
                        this.updateDuration();
                    };
                    reader.readAsText(file);
                }
                // 重置文件输入框，允许重复选择同一个文件
                fileInput.value = '';
            });
        }
    }

    initDurationCalculation() {
        this.updateDuration(); // 初始化时计算一次
    }

    updateDuration() {
        const text = this.editor.textContent;
        const totalSeconds = text.length * 2; // 每个字符固定2秒
        
        // 转换为时分秒格式
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;
        
        // 更新显示
        const durationSpan = document.querySelector('.duration span');
        if (durationSpan) {
            durationSpan.textContent = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
        }
    }

    addAnnotation(type) {
        const selection = window.getSelection();
        if (!selection.rangeCount) return;

        const range = selection.getRangeAt(0);
        if (!range.toString()) return;

        // 创建标注元素
        const annotationSpan = document.createElement('span');
        annotationSpan.className = 'annotation';
        annotationSpan.setAttribute('data-type', this.getAnnotationType(type));
        
        // 将选中的内容移动到标注元素中
        range.surroundContents(annotationSpan);
        
        // 清除选择
        selection.removeAllRanges();
    }

    getAnnotationType(type) {
        const typeMap = {
            '连读': '连',
            '设置停顿': '停',
            '多音字': '多',
            '数字': '数',
            '单词词组': '词',
            '局部音量': '音',
            '局部变调': '调',
            '局部变速': '速',
            '多人配音': '人',
            '插入音效': '效',
            '添加配乐': '乐'
        };
        return typeMap[type] || type;
    }

    updateHighlightLayer() {
        // 将编辑器的内容同步到高亮层
        this.highlightLayer.innerHTML = this.editor.innerHTML;
    }

    // 清除所有标注
    clearAnnotations() {
        const annotations = this.editor.querySelectorAll('.annotation');
        annotations.forEach(annotation => {
            const text = annotation.textContent;
            annotation.parentNode.replaceChild(document.createTextNode(text), annotation);
        });
        this.updateHighlightLayer();
    }
}

// 初始化
document.addEventListener('DOMContentLoaded', () => {
    window.textAnnotation = new TextAnnotation();
});
