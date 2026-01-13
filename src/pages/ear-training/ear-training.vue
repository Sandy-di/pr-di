<template>
  <view class="container safe-area-top">
    <!-- 自定义导航栏 -->
    <view class="custom-navbar" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="navbar-content">
        <text class="navbar-title">视唱练耳</text>
        <view class="navbar-badge">训练</view>
      </view>
    </view>
    
    <!-- 主内容 -->
    <scroll-view class="content" scroll-y>
      <!-- 今日进度 -->
      <view class="progress-card glass animate-fade-in">
        <view class="progress-glow"></view>
        <view class="progress-header">
          <view class="progress-info">
            <svg-icon name="chart" size="32rpx" color="var(--accent-blue)" />
            <text class="progress-title">今日目标</text>
          </view>
          <text class="progress-count">{{ progress.completed }}/{{ progress.total }}</text>
        </view>
        <view class="progress-bar-bg">
          <view class="progress-fill" :style="{ width: progressPercent + '%' }">
            <view class="progress-shine"></view>
          </view>
        </view>
      </view>
      
      <!-- 练习模块 -->
      <view class="section-header">
        <text class="section-title">选择模式</text>
      </view>
      
      <view class="module-grid">
        <view class="module-card glass glass-hover" @click="startPractice('interval')">
          <view class="card-glow" style="background: var(--accent-blue);"></view>
          <view class="module-icon-box" style="background: rgba(59, 130, 246, 0.2); color: var(--accent-blue);">
            <svg-icon name="music-note" size="48rpx" />
          </view>
          <text class="module-title">音程听辨</text>
          <text class="module-desc">识别两个音之间的音程关系</text>
          <view class="module-badge">推荐</view>
        </view>
        
        <view class="module-card glass glass-hover" @click="startPractice('scale')">
          <view class="card-glow" style="background: var(--accent-purple);"></view>
          <view class="module-icon-box" style="background: rgba(139, 92, 246, 0.2); color: var(--accent-purple);">
            <svg-icon name="piano" size="48rpx" />
          </view>
          <text class="module-title">音阶练习</text>
          <text class="module-desc">练习大小调音阶上下行</text>
        </view>
        
        <view class="module-card glass glass-hover" @click="startPractice('singing')">
          <view class="card-glow" style="background: var(--accent-pink);"></view>
          <view class="module-icon-box" style="background: rgba(236, 72, 153, 0.2); color: var(--accent-pink);">
            <svg-icon name="mic" size="48rpx" />
          </view>
          <text class="module-title">跟唱模式</text>
          <text class="module-desc">听音后跟唱，训练音准</text>
        </view>
        
        <view class="module-card glass glass-hover coming-soon" @click="startPractice('chord')">
          <view class="card-glow" style="background: var(--text-muted);"></view>
          <view class="module-icon-box" style="background: rgba(255, 255, 255, 0.1); color: var(--text-muted);">
            <svg-icon name="grid" size="48rpx" />
          </view>
          <text class="module-title">和弦听辨</text>
          <text class="module-desc">识别常见和弦类型</text>
          <view class="module-badge badge-gray">开发中</view>
        </view>
      </view>
      
      <!-- 节拍器 -->
      <view class="metronome-card glass">
        <view class="metronome-bg-glow" :class="{ 'active': metronomeOn }"></view>
        
        <view class="metronome-header">
          <view class="metronome-title-box">
            <svg-icon name="metronome" size="40rpx" color="var(--accent-orange)" />
            <text class="metronome-title">节拍器</text>
          </view>
          <switch :checked="metronomeOn" @change="toggleMetronome" color="#F97316" style="transform: scale(0.8)" />
        </view>
        
        <view class="metronome-controls">
          <view class="bpm-control">
            <view class="bpm-btn glass-hover" @click="decreaseBpm">
              <text>-</text>
            </view>
            <view class="bpm-display">
              <text class="bpm-value">{{ bpm }}</text>
              <text class="bpm-label">BPM</text>
            </view>
            <view class="bpm-btn glass-hover" @click="increaseBpm">
              <text>+</text>
            </view>
          </view>
          
          <view class="beats-control">
            <picker :value="beatsIndex" :range="beatsOptions" @change="changeBeats">
              <view class="beats-picker glass-hover">{{ beatsOptions[beatsIndex] }}</view>
            </picker>
          </view>
        </view>
        
        <view class="beat-indicator">
          <view 
            v-for="i in currentBeats" 
            :key="i"
            class="beat-dot"
            :class="{ active: metronomeOn && currentBeat === i }"
          ></view>
        </view>
      </view>
      
      <!-- 统计卡片 -->
      <view class="stats-card glass">
        <text class="card-title">本周统计</text>
        <view class="stats-grid">
          <view class="stat-item">
            <text class="stat-value" style="color: var(--accent-cyan);">{{ weekStats.total }}</text>
            <text class="stat-label">练习题数</text>
          </view>
          <view class="stat-item">
            <text class="stat-value" style="color: var(--accent-blue);">{{ weekStats.accuracy }}%</text>
            <text class="stat-label">正确率</text>
          </view>
          <view class="stat-item">
            <text class="stat-value" style="color: var(--accent-pink);">{{ weekStats.streak }}</text>
            <text class="stat-label">连续天数</text>
          </view>
        </view>
      </view>
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, onUnmounted } from 'vue'
import SvgIcon from '@/components/SvgIcon.vue'

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
  const windowInfo = uni.getWindowInfo()
  statusBarHeight.value = windowInfo.statusBarHeight || 20
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
  
  if (type === 'scale') {
    uni.navigateTo({ url: '/pages/scale-practice/scale-practice' })
  } else {
    uni.navigateTo({ url: `/pages/interval-practice/interval-practice?type=${type}` })
  }
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
  background: var(--bg-dark);
  background-image: 
    radial-gradient(circle at 100% 0%, rgba(139, 92, 246, 0.1) 0%, transparent 30%),
    radial-gradient(circle at 0% 100%, rgba(6, 182, 212, 0.1) 0%, transparent 30%);
}

.custom-navbar {
  height: 88rpx;
  background: rgba(15, 15, 26, 0.8);
  backdrop-filter: blur(20px);
  position: sticky;
  top: 0;
  z-index: 100;
  border-bottom: 1px solid var(--glass-border);
}

.navbar-content {
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16rpx;
}

.navbar-title {
  font-size: 34rpx;
  font-weight: 600;
  color: var(--text-primary);
  letter-spacing: 2rpx;
}

.navbar-badge {
  font-size: 18rpx;
  font-weight: 700;
  color: var(--bg-dark);
  background: var(--accent-purple);
  padding: 2rpx 8rpx;
  border-radius: 8rpx;
}

.content {
  flex: 1;
  padding: 32rpx;
  padding-bottom: 180rpx;
}

/* 进度卡片 */
.progress-card {
  position: relative;
  border-radius: var(--radius-lg);
  padding: 32rpx;
  margin-bottom: 48rpx;
  overflow: hidden;
}

.progress-glow {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, rgba(59, 130, 246, 0.1), rgba(139, 92, 246, 0.1));
  z-index: 0;
}

.progress-header {
  position: relative;
  z-index: 1;
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24rpx;
}

.progress-info {
  display: flex;
  align-items: center;
  gap: 16rpx;
}

.progress-title {
  font-size: 30rpx;
  font-weight: 600;
  color: var(--text-primary);
}

.progress-count {
  font-size: 32rpx;
  color: var(--accent-blue);
  font-weight: 700;
  font-family: 'SF Pro Display', sans-serif;
}

.progress-bar-bg {
  position: relative;
  z-index: 1;
  height: 16rpx;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 8rpx;
  overflow: hidden;
}

.progress-fill {
  position: relative;
  height: 100%;
  background: linear-gradient(90deg, var(--accent-blue) 0%, var(--accent-purple) 100%);
  border-radius: 8rpx;
  transition: width 0.5s cubic-bezier(0.4, 0, 0.2, 1);
}

.progress-shine {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent);
  animation: shine 2s infinite;
}

/* 分区标题 */
.section-header {
  margin-bottom: 24rpx;
  padding-left: 8rpx;
  border-left: 6rpx solid var(--accent-purple);
}

.section-title {
  font-size: 32rpx;
  font-weight: 700;
  color: var(--text-primary);
  margin-left: 16rpx;
}

/* 模块网格 */
.module-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 24rpx;
  margin-bottom: 48rpx;
}

.module-card {
  position: relative;
  display: flex;
  flex-direction: column;
  padding: 32rpx;
  border-radius: var(--radius-lg);
  overflow: hidden;
}

.card-glow {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 6rpx;
  opacity: 0.8;
}

.module-icon-box {
  width: 88rpx;
  height: 88rpx;
  border-radius: 24rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 24rpx;
}

.module-title {
  font-size: 30rpx;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 8rpx;
}

.module-desc {
  font-size: 22rpx;
  color: var(--text-muted);
  line-height: 1.4;
  margin-bottom: 16rpx;
}

.module-badge {
  align-self: flex-start;
  padding: 4rpx 12rpx;
  background: linear-gradient(135deg, var(--accent-blue) 0%, var(--accent-purple) 100%);
  border-radius: 8rpx;
  font-size: 20rpx;
  color: #ffffff;
  font-weight: 600;
}

.badge-gray {
  background: rgba(255,255,255,0.1);
  color: var(--text-muted);
}

.coming-soon {
  opacity: 0.7;
}

/* 节拍器 */
.metronome-card {
  position: relative;
  padding: 32rpx;
  border-radius: var(--radius-lg);
  margin-bottom: 48rpx;
  overflow: hidden;
}

.metronome-bg-glow {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 0;
  height: 0;
  background: radial-gradient(circle, rgba(249, 115, 22, 0.2) 0%, transparent 70%);
  transition: all 0.2s;
  pointer-events: none;
}

.metronome-bg-glow.active {
  width: 100%;
  height: 100%;
  opacity: 1;
  animation: pulse 1s infinite; /* 会被 bpm 覆盖 */
}

.metronome-header {
  position: relative;
  z-index: 1;
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 32rpx;
}

.metronome-title-box {
  display: flex;
  align-items: center;
  gap: 16rpx;
}

.metronome-title {
  font-size: 32rpx;
  font-weight: 600;
  color: var(--text-primary);
}

.metronome-controls {
  position: relative;
  z-index: 1;
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 32rpx;
}

.bpm-control {
  display: flex;
  align-items: center;
  gap: 32rpx;
}

.bpm-btn {
  width: 72rpx;
  height: 72rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 50%;
  font-size: 40rpx;
  color: var(--text-primary);
  border: 1px solid var(--glass-border);
}

.bpm-display {
  display: flex;
  flex-direction: column;
  align-items: center;
  min-width: 100rpx;
}

.bpm-value {
  font-size: 56rpx;
  font-weight: 700;
  color: var(--accent-orange);
  font-variant-numeric: tabular-nums;
  line-height: 1;
}

.bpm-label {
  font-size: 20rpx;
  color: var(--text-muted);
  letter-spacing: 2rpx;
}

.beats-picker {
  padding: 12rpx 32rpx;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 12rpx;
  font-size: 28rpx;
  color: var(--text-primary);
  border: 1px solid var(--glass-border);
}

.beat-indicator {
  position: relative;
  z-index: 1;
  display: flex;
  justify-content: center;
  gap: 32rpx;
  height: 32rpx;
  align-items: center;
}

.beat-dot {
  width: 16rpx;
  height: 16rpx;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 50%;
  transition: all 0.1s ease;
}

.beat-dot.active {
  background: var(--accent-orange);
  transform: scale(1.5);
  box-shadow: 0 0 20rpx var(--accent-orange);
}

/* 统计 */
.stats-card {
  padding: 32rpx;
  border-radius: var(--radius-lg);
}

.card-title {
  font-size: 32rpx;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 32rpx;
  display: block;
}

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
  margin-bottom: 8rpx;
  font-family: 'SF Pro Display', sans-serif;
}

.stat-label {
  font-size: 24rpx;
  color: var(--text-muted);
}
</style>
