/**
 * 文本区域显示修复脚本
 * 
 * 这个脚本用于修复文本编辑区域的显示问题，确保整个文本框都能正常显示文字
 */

document.addEventListener('DOMContentLoaded', function() {
    console.log('正在应用文本区域显示修复...');
    fixTextAreaDisplay();
    
    // 在窗口大小改变时重新调整
    window.addEventListener('resize', fixTextAreaDisplay);
});

/**
 * 修复文本区域显示问题
 */
function fixTextAreaDisplay() {
    const textAreaContainer = document.querySelector('.text-area');
    const textEditor = document.querySelector('.text-editor-container');
    const textarea = document.querySelector('.text-editor-container textarea');
    
    if (textAreaContainer) {
        textAreaContainer.style.minHeight = '400px';
        textAreaContainer.style.height = 'calc(100vh - 280px)';
        textAreaContainer.style.overflow = 'visible';
        console.log('调整文本区域容器高度');
    }
    
    if (textEditor) {
        textEditor.style.height = 'calc(100% - 40px)';
        textEditor.style.minHeight = '350px';
        console.log('调整文本编辑器容器高度');
    }
    
    if (textarea) {
        textarea.style.minHeight = '350px';
        textarea.style.height = '100%';
        textarea.style.display = 'block';
        textarea.style.overflow = 'auto';
        console.log('调整文本框高度');
    }
}
