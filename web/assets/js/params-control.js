document.addEventListener('DOMContentLoaded', function() {
    // 获取所有滑动条和显示值的元素
    const speedSlider = document.getElementById('speedSlider');
    const pitchSlider = document.getElementById('pitchSlider');
    const volumeSlider = document.getElementById('volumeSlider');
    
    const speedValue = document.getElementById('speedValue');
    const pitchValue = document.getElementById('pitchValue');
    const volumeValue = document.getElementById('volumeValue');

    // 更新显示值的函数
    function updateValue(slider, valueElement) {
        valueElement.textContent = slider.value;
    }

    // 为每个滑动条添加事件监听
    speedSlider.addEventListener('input', () => updateValue(speedSlider, speedValue));
    pitchSlider.addEventListener('input', () => updateValue(pitchSlider, pitchValue));
    volumeSlider.addEventListener('input', () => updateValue(volumeSlider, volumeValue));

    // 初始化显示值
    updateValue(speedSlider, speedValue);
    updateValue(pitchSlider, pitchValue);
    updateValue(volumeSlider, volumeValue);
});
