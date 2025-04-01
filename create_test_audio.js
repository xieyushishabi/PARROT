console.log("Creating test audio file...");
const fs = require("fs");
const path = require("path");

// 创建一个简单的WAV文件头
function createWavHeader(sampleRate, bitsPerSample, channels, dataLength) {
  const buffer = Buffer.alloc(44);
  
  // RIFF chunk descriptor
  buffer.write("RIFF", 0);
  buffer.writeUInt32LE(36 + dataLength, 4);
  buffer.write("WAVE", 8);
  
  // "fmt " sub-chunk
  buffer.write("fmt ", 12);
  buffer.writeUInt32LE(16, 16); // Length of format data
  buffer.writeUInt16LE(1, 20); // PCM format
  buffer.writeUInt16LE(channels, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * channels * bitsPerSample / 8, 28); // Byte rate
  buffer.writeUInt16LE(channels * bitsPerSample / 8, 32); // Block align
  buffer.writeUInt16LE(bitsPerSample, 34);
  
  // "data" sub-chunk
  buffer.write("data", 36);
  buffer.writeUInt32LE(dataLength, 40);
  
  return buffer;
}

// 创建一秒钟的440Hz音频信号
function createTestTone(sampleRate, duration) {
  const numSamples = sampleRate * duration;
  const buffer = Buffer.alloc(numSamples * 2); // 16-bit = 2 bytes per sample
  const frequency = 440; // 440 Hz = A4 note
  
  for (let i = 0; i < numSamples; i++) {
    // 生成正弦波
    const sample = Math.sin(2 * Math.PI * frequency * i / sampleRate);
    // 转换为16位整数并写入缓冲区
    const value = Math.floor(sample * 32767);
    buffer.writeInt16LE(value, i * 2);
  }
  
  return buffer;
}

// 设置参数
const sampleRate = 44100;
const bitsPerSample = 16;
const channels = 1;
const duration = 3; // 秒

// 生成音频数据
const audioData = createTestTone(sampleRate, duration);
const header = createWavHeader(sampleRate, bitsPerSample, channels, audioData.length);

// 合并头部和数据
const wavFile = Buffer.concat([header, audioData]);

// 写入文件
const audioDir = path.join(__dirname, "web", "assets", "audio");
if (!fs.existsSync(audioDir)) {
    fs.mkdirSync(audioDir, { recursive: true });
}

const filePath = path.join(audioDir, "example.wav");
fs.writeFileSync(filePath, wavFile);

console.log(`Created test audio file at: ${filePath}`);
