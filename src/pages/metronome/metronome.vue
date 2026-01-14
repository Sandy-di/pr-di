<template>
  <view class="metronome-page">
    <!-- 导航栏 -->
    <view class="navbar" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="nav-back" @click="goBack"><text>←</text></view>
      <text class="nav-title">🎵 节拍器</text>
      <view class="nav-placeholder"></view>
    </view>

    <!-- 摆锤区域 -->
    <view class="pendulum-area">
      <view class="pendulum-container">
        <view class="pendulum-arm" :style="pendulumStyle">
          <view class="pendulum-weight"></view>
        </view>
        <view class="pendulum-base"></view>
      </view>
    </view>

    <!-- 节拍指示灯 -->
    <view class="beat-indicators">
      <view 
        v-for="i in beatsPerMeasure" 
        :key="i"
        class="beat-dot"
        :class="{ 
          active: currentBeat === i,
          strong: i === 1 && currentBeat === 1
        }"
      ></view>
      <text class="time-signature">{{ beatsPerMeasure }}/4</text>
    </view>

    <!-- BPM 控制 -->
    <view class="bpm-control glass">
      <view class="bpm-header">
        <text class="bpm-label">速度 (BPM)</text>
        <text class="bpm-value">{{ bpm }}</text>
      </view>
      <view class="bpm-buttons">
        <view class="bpm-btn" @click="adjustBpm(-10)">-10</view>
        <view class="bpm-btn" @click="adjustBpm(-1)">-1</view>
        <view class="bpm-btn" @click="adjustBpm(1)">+1</view>
        <view class="bpm-btn" @click="adjustBpm(10)">+10</view>
      </view>
      <slider 
        :value="bpm" 
        :min="10" 
        :max="300" 
        @change="onBpmChange"
        activeColor="#d4af37"
        backgroundColor="rgba(255,255,255,0.1)"
        block-size="24"
        class="bpm-slider"
      />
    </view>

    <!-- 节拍选择 -->
    <view class="beat-selector">
      <view 
        v-for="beat in beatOptions" 
        :key="beat"
        class="beat-option"
        :class="{ active: beatsPerMeasure === beat }"
        @click="setBeats(beat)"
      >
        <text>{{ beat }}/4</text>
      </view>
    </view>

    <!-- 控制按钮 -->
    <view class="control-area">
      <view class="main-btn" :class="{ playing: isPlaying }" @click="togglePlay">
        <text class="btn-icon">{{ isPlaying ? '⏸' : '▶' }}</text>
        <text class="btn-text">{{ isPlaying ? '暂停' : '开始' }}</text>
      </view>
    </view>

    <!-- 录音区域 -->
    <view class="record-section glass">
      <view class="record-header">
        <text class="record-title">🎤 录音</text>
        <text class="record-hint" v-if="!isRecording">{{ isPlaying ? '可边打拍边录音' : '开始节拍后录音' }}</text>
        <text class="record-time" v-else>{{ formatTime(recordingDuration) }}</text>
      </view>
      <view class="record-buttons">
        <view 
          class="record-btn" 
          :class="{ recording: isRecording, disabled: !isPlaying }"
          @click="toggleRecording"
        >
          <view class="record-icon" :class="{ pulse: isRecording }"></view>
          <text>{{ isRecording ? '停止录音' : '开始录音' }}</text>
        </view>
        <view class="record-mode" v-if="!isRecording">
          <view 
            class="mode-option" 
            :class="{ active: recordMode === 'voice' }"
            @click="recordMode = 'voice'"
          >
            <text>仅人声</text>
          </view>
          <view 
            class="mode-option" 
            :class="{ active: recordMode === 'mixed' }"
            @click="recordMode = 'mixed'"
          >
            <text>节拍+人声</text>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { onShareAppMessage } from '@dcloudio/uni-app'
import AudioManager from '@/utils/audio-manager'
import RecorderService from '@/utils/recorder-manager'

onShareAppMessage(() => ({
  title: '🎵 节拍器 - 视唱练耳助手',
  path: '/pages/metronome/metronome'
}))

const statusBarHeight = ref(20)
const bpm = ref(120)
const beatsPerMeasure = ref(4)
const beatOptions = [2, 3, 4, 6]
const isPlaying = ref(false)
const currentBeat = ref(0)
const pendulumDirection = ref(1) // 1: 右, -1: 左

// 录音相关
const isRecording = ref(false)
const recordMode = ref<'voice' | 'mixed'>('mixed')
const recordingDuration = ref(0)
let recordingTimer: any = null

let metronomeTimer: any = null

const pendulumStyle = computed(() => {
  if (!isPlaying.value) {
    return { transform: 'rotate(0deg)', transition: 'transform 0.3s ease' }
  }
  const angle = pendulumDirection.value * 30
  const duration = 60 / bpm.value / 2
  return {
    transform: `rotate(${angle}deg)`,
    transition: `transform ${duration}s ease-in-out`
  }
})

onMounted(() => {
  const windowInfo = uni.getWindowInfo()
  statusBarHeight.value = windowInfo.statusBarHeight || 20
  
  AudioManager.init()
  RecorderService.init()
  
  RecorderService.setCallbacks({
    onStop: () => {
      isRecording.value = false
      clearInterval(recordingTimer)
      uni.showToast({ title: '录音已保存', icon: 'success' })
    }
  })
})

onUnmounted(() => {
  stopMetronome()
  if (isRecording.value) {
    RecorderService.stop()
  }
})

const goBack = () => {
  uni.navigateBack({ fail: () => uni.switchTab({ url: '/pages/index/index' }) })
}

const adjustBpm = (delta: number) => {
  const newBpm = bpm.value + delta
  if (newBpm >= 10 && newBpm <= 300) {
    bpm.value = newBpm
    if (isPlaying.value) {
      restartMetronome()
    }
  }
}

const onBpmChange = (e: any) => {
  bpm.value = e.detail.value
  if (isPlaying.value) {
    restartMetronome()
  }
}

const setBeats = (beats: number) => {
  beatsPerMeasure.value = beats
  currentBeat.value = 0
}

const togglePlay = () => {
  if (isPlaying.value) {
    stopMetronome()
  } else {
    startMetronome()
  }
}

const startMetronome = () => {
  isPlaying.value = true
  currentBeat.value = 0
  tick()
  
  const interval = 60000 / bpm.value
  metronomeTimer = setInterval(tick, interval)
}

const stopMetronome = () => {
  isPlaying.value = false
  currentBeat.value = 0
  pendulumDirection.value = 1
  if (metronomeTimer) {
    clearInterval(metronomeTimer)
    metronomeTimer = null
  }
  
  // 停止录音
  if (isRecording.value) {
    RecorderService.stop()
  }
}

const restartMetronome = () => {
  if (metronomeTimer) {
    clearInterval(metronomeTimer)
  }
  const interval = 60000 / bpm.value
  metronomeTimer = setInterval(tick, interval)
}

const tick = () => {
  currentBeat.value = (currentBeat.value % beatsPerMeasure.value) + 1
  pendulumDirection.value *= -1
  
  // 播放声音
  const isStrong = currentBeat.value === 1
  playTickSound(isStrong)
  
  // 震动反馈
  uni.vibrateShort({})
}

const playTickSound = (isStrong: boolean) => {
  // 使用不同音高区分强弱拍
  const pitch = isStrong ? 80 : 72  // C6 vs C5
  AudioManager.playNote(pitch, 0.8)
}

// 录音功能
const toggleRecording = () => {
  if (!isPlaying.value) {
    uni.showToast({ title: '请先开始节拍', icon: 'none' })
    return
  }
  
  if (isRecording.value) {
    RecorderService.stop()
    isRecording.value = false
    clearInterval(recordingTimer)
  } else {
    startRecording()
  }
}

const startRecording = () => {
  uni.authorize({
    scope: 'scope.record',
    success: () => {
      RecorderService.start({ mode: recordMode.value === 'mixed' ? 'mixed' : 'voice-only' })
      isRecording.value = true
      recordingDuration.value = 0
      recordingTimer = setInterval(() => {
        recordingDuration.value += 1000
      }, 1000)
    },
    fail: () => {
      uni.showModal({
        title: '需要录音权限',
        content: '请允许录音权限',
        confirmText: '去设置',
        success: (res) => {
          if (res.confirm) uni.openSetting({})
        }
      })
    }
  })
}

const formatTime = (ms: number): string => {
  const seconds = Math.floor(ms / 1000)
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}:${secs.toString().padStart(2, '0')}`
}
</script>

<style scoped>
.metronome-page {
  min-height: 100vh;
  background: var(--divine-gradient);
  display: flex;
  flex-direction: column;
  padding-bottom: env(safe-area-inset-bottom);
}

.navbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16rpx 32rpx;
  background: var(--bg-dark);
}

.nav-back, .nav-placeholder {
  width: 64rpx;
  height: 64rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.nav-back {
  background: rgba(255,255,255,0.1);
  border-radius: 50%;
  color: #fff;
  font-size: 32rpx;
}

.nav-title {
  font-size: 36rpx;
  font-weight: 600;
  color: #fff;
}

/* 摆锤区域 */
.pendulum-area {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 400rpx;
}

.pendulum-container {
  position: relative;
  width: 300rpx;
  height: 350rpx;
}

.pendulum-arm {
  position: absolute;
  top: 0;
  left: 50%;
  width: 8rpx;
  height: 280rpx;
  background: linear-gradient(180deg, var(--divine-gold) 0%, #8B6914 100%);
  transform-origin: top center;
  margin-left: -4rpx;
  border-radius: 4rpx;
}

.pendulum-weight {
  position: absolute;
  bottom: -30rpx;
  left: 50%;
  width: 60rpx;
  height: 60rpx;
  background: var(--gold-gradient);
  border-radius: 50%;
  transform: translateX(-50%);
  box-shadow: 0 8rpx 20rpx rgba(212, 175, 55, 0.5);
}

.pendulum-base {
  position: absolute;
  bottom: 0;
  left: 50%;
  width: 120rpx;
  height: 24rpx;
  background: var(--bg-card);
  border-radius: 12rpx;
  transform: translateX(-50%);
  border: 2rpx solid var(--divine-gold);
}

/* 节拍指示灯 */
.beat-indicators {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 24rpx;
  padding: 32rpx;
}

.beat-dot {
  width: 32rpx;
  height: 32rpx;
  border-radius: 50%;
  background: rgba(255,255,255,0.2);
  border: 2rpx solid rgba(255,255,255,0.3);
  transition: all 0.1s;
}

.beat-dot.active {
  background: var(--divine-gold);
  box-shadow: 0 0 20rpx var(--divine-gold);
  transform: scale(1.2);
}

.beat-dot.strong {
  background: #ff6b6b;
  box-shadow: 0 0 20rpx #ff6b6b;
}

.time-signature {
  font-size: 32rpx;
  color: var(--text-secondary);
  margin-left: 16rpx;
}

/* BPM 控制 */
.bpm-control {
  margin: 0 32rpx 24rpx;
  padding: 32rpx;
  border-radius: 24rpx;
}

.bpm-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24rpx;
}

.bpm-label {
  font-size: 28rpx;
  color: var(--text-secondary);
}

.bpm-value {
  font-size: 56rpx;
  font-weight: 700;
  color: var(--divine-gold);
}

.bpm-buttons {
  display: flex;
  gap: 16rpx;
  margin-bottom: 24rpx;
}

.bpm-btn {
  flex: 1;
  height: 64rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255,255,255,0.1);
  border-radius: 12rpx;
  font-size: 28rpx;
  color: #fff;
  border: 1px solid rgba(255,255,255,0.1);
}

.bpm-btn:active {
  background: rgba(212, 175, 55, 0.2);
}

.bpm-slider {
  width: 100%;
}

/* 节拍选择 */
.beat-selector {
  display: flex;
  justify-content: center;
  gap: 20rpx;
  padding: 0 32rpx 32rpx;
}

.beat-option {
  padding: 16rpx 32rpx;
  background: rgba(255,255,255,0.1);
  border-radius: 32rpx;
  font-size: 28rpx;
  color: var(--text-secondary);
  border: 1px solid rgba(255,255,255,0.1);
}

.beat-option.active {
  background: var(--gold-gradient);
  color: var(--divine-blue);
  font-weight: 600;
  border-color: var(--divine-gold);
}

/* 控制按钮 */
.control-area {
  display: flex;
  justify-content: center;
  padding: 0 32rpx 32rpx;
}

.main-btn {
  width: 280rpx;
  height: 100rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16rpx;
  background: var(--gold-gradient);
  border-radius: 50rpx;
  box-shadow: var(--shadow-gold);
}

.main-btn.playing {
  background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
  box-shadow: 0 8rpx 24rpx rgba(239, 68, 68, 0.4);
}

.btn-icon {
  font-size: 40rpx;
}

.btn-text {
  font-size: 32rpx;
  font-weight: 600;
  color: var(--divine-blue);
}

.main-btn.playing .btn-text {
  color: #fff;
}

/* 录音区域 */
.record-section {
  margin: 0 32rpx 32rpx;
  padding: 32rpx;
  border-radius: 24rpx;
}

.record-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24rpx;
}

.record-title {
  font-size: 32rpx;
  font-weight: 600;
  color: #fff;
}

.record-hint {
  font-size: 24rpx;
  color: var(--text-muted);
}

.record-time {
  font-size: 32rpx;
  color: #ef4444;
  font-weight: 600;
}

.record-buttons {
  display: flex;
  align-items: center;
  gap: 24rpx;
}

.record-btn {
  display: flex;
  align-items: center;
  gap: 12rpx;
  padding: 16rpx 32rpx;
  background: rgba(255,255,255,0.1);
  border-radius: 32rpx;
  font-size: 28rpx;
  color: #fff;
  border: 1px solid rgba(255,255,255,0.1);
}

.record-btn.disabled {
  opacity: 0.5;
}

.record-btn.recording {
  background: rgba(239, 68, 68, 0.2);
  border-color: #ef4444;
  color: #ef4444;
}

.record-icon {
  width: 24rpx;
  height: 24rpx;
  border-radius: 50%;
  background: #ef4444;
}

.record-icon.pulse {
  animation: pulse 1s infinite;
}

@keyframes pulse {
  0%, 100% { transform: scale(1); opacity: 1; }
  50% { transform: scale(1.2); opacity: 0.7; }
}

.record-mode {
  display: flex;
  gap: 12rpx;
}

.mode-option {
  padding: 12rpx 24rpx;
  background: rgba(255,255,255,0.05);
  border-radius: 20rpx;
  font-size: 24rpx;
  color: var(--text-muted);
  border: 1px solid rgba(255,255,255,0.1);
}

.mode-option.active {
  background: rgba(212, 175, 55, 0.15);
  color: var(--divine-gold);
  border-color: rgba(212, 175, 55, 0.3);
}
</style>
