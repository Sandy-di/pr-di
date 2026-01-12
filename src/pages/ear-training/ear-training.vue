<template>
  <view class="container safe-area-top">
    <!-- 自定义导航栏 -->
    <view class="custom-navbar" :style="{ paddingTop: statusBarHeight + 'px' }">
      <text class="navbar-title">👂 视唱练耳</text>
    </view>
    
    <!-- 主内容 -->
    <scroll-view class="content" scroll-y>
      <!-- 今日进度 -->
      <view class="progress-card card">
        <view class="progress-header">
          <text class="progress-title">🎯 今日练习进度</text>
          <text class="progress-count">{{ progress.completed }}/{{ progress.total }}</text>
        </view>
        <view class="progress-bar">
          <view class="progress-fill" :style="{ width: progressPercent + '%' }"></view>
        </view>
      </view>
      
      <!-- 练习模块 -->
      <view class="section-title">选择练习模式</view>
      
      <view class="module-grid">
        <view class="module-card" @click="startPractice('interval')">
          <view class="module-icon">🎵</view>
          <text class="module-title">音程听辨</text>
          <text class="module-desc">识别两个音之间的音程关系</text>
          <view class="module-badge">推荐</view>
        </view>
        
        <view class="module-card" @click="startPractice('scale')">
          <view class="module-icon">🎼</view>
          <text class="module-title">音阶练习</text>
          <text class="module-desc">练习大小调音阶上下行</text>
        </view>
        
        <view class="module-card" @click="startPractice('singing')">
          <view class="module-icon">🎤</view>
          <text class="module-title">跟唱模式</text>
          <text class="module-desc">听音后跟唱，训练音准</text>
        </view>
        
        <view class="module-card" @click="startPractice('chord')">
          <view class="module-icon">🎸</view>
          <text class="module-title">和弦听辨</text>
          <text class="module-desc">识别常见和弦类型</text>
          <view class="module-badge coming-soon">即将上线</view>
        </view>
      </view>
      
      <!-- 节拍器 -->
      <view class="metronome-card card">
        <view class="metronome-header">
          <text class="metronome-title">🥁 节拍器</text>
          <switch :checked="metronomeOn" @change="toggleMetronome" color="#667eea" />
        </view>
        <view class="metronome-controls">
          <view class="bpm-control">
            <view class="bpm-btn" @click="decreaseBpm">-</view>
            <view class="bpm-display">
              <text class="bpm-value">{{ bpm }}</text>
              <text class="bpm-label">BPM</text>
            </view>
            <view class="bpm-btn" @click="increaseBpm">+</view>
          </view>
          <view class="beats-control">
            <text class="beats-label">拍号</text>
            <picker :value="beatsIndex" :range="beatsOptions" @change="changeBeats">
              <view class="beats-picker">{{ beatsOptions[beatsIndex] }}</view>
            </picker>
          </view>
        </view>
        <view v-if="metronomeOn" class="beat-indicator">
          <view 
            v-for="i in currentBeats" 
            :key="i"
            class="beat-dot"
            :class="{ active: currentBeat === i }"
          ></view>
        </view>
      </view>
      
      <!-- 统计卡片 -->
      <view class="stats-card card">
        <text class="card-title">📊 本周统计</text>
        <view class="stats-grid">
          <view class="stat-item">
            <text class="stat-value">{{ weekStats.total }}</text>
            <text class="stat-label">练习题数</text>
          </view>
          <view class="stat-item">
            <text class="stat-value">{{ weekStats.accuracy }}%</text>
            <text class="stat-label">正确率</text>
          </view>
          <view class="stat-item">
            <text class="stat-value">{{ weekStats.streak }}</text>
            <text class="stat-label">连续天数</text>
          </view>
        </view>
      </view>
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, onUnmounted } from 'vue'

const statusBarHeight = ref(20)

// 进度
const progress = reactive({
  completed: 3,
  total: 10
})

const progressPercent = computed(() => {
  return (progress.completed / progress.total) * 100
})

// 节拍器
const metronomeOn = ref(false)
const bpm = ref(120)
const beatsIndex = ref(0)
const beatsOptions = ['4/4', '3/4', '2/4', '6/8']
const currentBeat = ref(0)
const currentBeats = ref(4)
let metronomeTimer: any = null
let audioContext: any = null

// 统计
const weekStats = reactive({
  total: 45,
  accuracy: 78,
  streak: 5
})

onMounted(() => {
  const systemInfo = uni.getSystemInfoSync()
  statusBarHeight.value = systemInfo.statusBarHeight || 20
  loadStats()
})

onUnmounted(() => {
  stopMetronome()
})

const loadStats = () => {
  try {
    const stats = uni.getStorageSync('statistics')
    if (stats) {
      weekStats.total = stats.totalPractices || 0
      weekStats.accuracy = stats.correctCount && stats.totalPractices 
        ? Math.round((stats.correctCount / stats.totalPractices) * 100)
        : 0
      weekStats.streak = stats.streakDays || 0
    }
  } catch (e) {
    console.error('加载统计失败:', e)
  }
}

const startPractice = (type: string) => {
  if (type === 'chord') {
    uni.showToast({ title: '功能开发中', icon: 'none' })
    return
  }
  uni.navigateTo({ url: `/pages/interval-practice/interval-practice?type=${type}` })
}

const toggleMetronome = (e: any) => {
  metronomeOn.value = e.detail.value
  if (metronomeOn.value) {
    startMetronome()
  } else {
    stopMetronome()
  }
}

const startMetronome = () => {
  currentBeat.value = 0
  const interval = 60000 / bpm.value
  
  // 初始化音频
  audioContext = uni.createWebAudioContext()
  
  metronomeTimer = setInterval(() => {
    currentBeat.value = (currentBeat.value % currentBeats.value) + 1
    playClick(currentBeat.value === 1)
  }, interval)
  
  // 立即播放第一拍
  currentBeat.value = 1
  playClick(true)
}

const stopMetronome = () => {
  if (metronomeTimer) {
    clearInterval(metronomeTimer)
    metronomeTimer = null
  }
  currentBeat.value = 0
}

const playClick = (isStrong: boolean) => {
  if (!audioContext) return
  
  const oscillator = audioContext.createOscillator()
  const gainNode = audioContext.createGain()
  
  oscillator.type = 'sine'
  oscillator.frequency.value = isStrong ? 1000 : 800
  
  gainNode.gain.value = 0.5
  
  oscillator.connect(gainNode)
  gainNode.connect(audioContext.destination)
  
  oscillator.start()
  
  // 短促的点击声
  gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.05)
  oscillator.stop(audioContext.currentTime + 0.05)
}

const increaseBpm = () => {
  if (bpm.value < 240) {
    bpm.value += 5
    if (metronomeOn.value) {
      stopMetronome()
      startMetronome()
    }
  }
}

const decreaseBpm = () => {
  if (bpm.value > 40) {
    bpm.value -= 5
    if (metronomeOn.value) {
      stopMetronome()
      startMetronome()
    }
  }
}

const changeBeats = (e: any) => {
  beatsIndex.value = e.detail.value
  const beats = beatsOptions[beatsIndex.value]
  currentBeats.value = parseInt(beats.split('/')[0])
  if (metronomeOn.value) {
    stopMetronome()
    startMetronome()
  }
}
</script>

<style scoped>
.container {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  background: linear-gradient(180deg, #0f0f1a 0%, #1a1a2e 100%);
}

.custom-navbar {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 88rpx;
  background: rgba(26, 26, 46, 0.95);
  backdrop-filter: blur(10px);
}

.navbar-title {
  font-size: 36rpx;
  font-weight: 600;
  color: #ffffff;
}

.content {
  flex: 1;
  padding: 24rpx;
  padding-bottom: 180rpx;
}

.card {
  background: #1a1a2e;
  border-radius: 24rpx;
  padding: 32rpx;
  margin-bottom: 24rpx;
}

.card-title {
  font-size: 32rpx;
  font-weight: 600;
  color: #ffffff;
  margin-bottom: 24rpx;
}

/* 进度卡片 */
.progress-card {
  background: linear-gradient(135deg, rgba(102, 126, 234, 0.2) 0%, rgba(118, 75, 162, 0.2) 100%);
  border: 2rpx solid rgba(102, 126, 234, 0.3);
}

.progress-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20rpx;
}

.progress-title {
  font-size: 30rpx;
  font-weight: 600;
  color: #ffffff;
}

.progress-count {
  font-size: 28rpx;
  color: #667eea;
  font-weight: 600;
}

.progress-bar {
  height: 12rpx;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 6rpx;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #667eea 0%, #764ba2 100%);
  border-radius: 6rpx;
  transition: width 0.3s ease;
}

/* 分区标题 */
.section-title {
  font-size: 32rpx;
  font-weight: 600;
  color: #ffffff;
  margin: 32rpx 0 24rpx 8rpx;
}

/* 模块网格 */
.module-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 20rpx;
  margin-bottom: 24rpx;
}

.module-card {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 32rpx 20rpx;
  background: #1a1a2e;
  border-radius: 24rpx;
  transition: transform 0.2s ease;
}

.module-card:active {
  transform: scale(0.98);
}

.module-icon {
  font-size: 56rpx;
  margin-bottom: 16rpx;
}

.module-title {
  font-size: 30rpx;
  font-weight: 600;
  color: #ffffff;
  margin-bottom: 8rpx;
}

.module-desc {
  font-size: 22rpx;
  color: #b0b0c0;
  text-align: center;
}

.module-badge {
  position: absolute;
  top: 16rpx;
  right: 16rpx;
  padding: 6rpx 16rpx;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 20rpx;
  font-size: 20rpx;
  color: #ffffff;
}

.module-badge.coming-soon {
  background: rgba(255, 255, 255, 0.2);
}

/* 节拍器 */
.metronome-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24rpx;
}

.metronome-title {
  font-size: 32rpx;
  font-weight: 600;
  color: #ffffff;
}

.metronome-controls {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.bpm-control {
  display: flex;
  align-items: center;
  gap: 24rpx;
}

.bpm-btn {
  width: 64rpx;
  height: 64rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 50%;
  font-size: 36rpx;
  color: #ffffff;
}

.bpm-display {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.bpm-value {
  font-size: 48rpx;
  font-weight: 700;
  color: #667eea;
}

.bpm-label {
  font-size: 22rpx;
  color: #b0b0c0;
}

.beats-control {
  display: flex;
  align-items: center;
  gap: 16rpx;
}

.beats-label {
  font-size: 26rpx;
  color: #b0b0c0;
}

.beats-picker {
  padding: 12rpx 24rpx;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 12rpx;
  font-size: 28rpx;
  color: #ffffff;
}

.beat-indicator {
  display: flex;
  justify-content: center;
  gap: 24rpx;
  margin-top: 24rpx;
}

.beat-dot {
  width: 24rpx;
  height: 24rpx;
  background: rgba(255, 255, 255, 0.3);
  border-radius: 50%;
  transition: all 0.1s ease;
}

.beat-dot.active {
  background: #667eea;
  transform: scale(1.3);
  box-shadow: 0 0 20rpx rgba(102, 126, 234, 0.6);
}

/* 统计 */
.stats-grid {
  display: flex;
  justify-content: space-around;
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.stat-value {
  font-size: 44rpx;
  font-weight: 700;
  color: #667eea;
  margin-bottom: 8rpx;
}

.stat-label {
  font-size: 24rpx;
  color: #b0b0c0;
}
</style>
