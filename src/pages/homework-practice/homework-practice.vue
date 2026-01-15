<template>
  <view class="practice-page">
    <!-- 顶部控制栏 15% -->
    <view class="top-bar" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="top-controls">
        <!-- 返回按钮 -->
        <view class="control-btn back-btn" @click="goBack">
          <text>←</text>
        </view>
        
        <!-- 作业标题 -->
        <text class="homework-title">{{ homework?.title || '加载中...' }}</text>
        
        <!-- 录音按钮 -->
        <view 
          class="control-btn record-btn" 
          :class="{ recording: isRecording }"
          @click="toggleRecording"
        >
          <view class="record-dot" :class="{ pulse: isRecording }"></view>
          <text>{{ isRecording ? formatTime(recordingDuration) : '录音' }}</text>
        </view>
        
        <!-- 示范音播放 -->
        <view class="demo-player" v-if="homework?.demoAudioUrl">
          <view class="control-btn play-btn" @click="toggleDemo">
            <text>{{ isDemoPlaying ? '⏸' : '▶' }}</text>
          </view>
          <view class="speed-selector">
            <view 
              v-for="speed in playbackSpeeds" 
              :key="speed"
              class="speed-btn"
              :class="{ active: currentSpeed === speed }"
              @click="setSpeed(speed)"
            >
              <text>{{ speed }}x</text>
            </view>
          </view>
        </view>
      </view>
    </view>

    <!-- 看谱区 40% -->
    <view class="sheet-area">
      <scroll-view 
        class="sheet-scroll" 
        scroll-x 
        scroll-y
        :enable-flex="true"
      >
        <image 
          v-if="homework?.sheetImageUrl"
          class="sheet-image"
          :src="homework.sheetImageUrl"
          mode="widthFix"
          @click="previewSheet"
        />
        <view v-else class="sheet-placeholder">
          <text class="placeholder-icon">🎼</text>
          <text class="placeholder-text">乐谱加载中...</text>
        </view>
      </scroll-view>
    </view>

    <!-- 钢琴区 45% -->
    <view class="piano-area">
      <view class="piano-keyboard">
        <!-- 白键 -->
        <view 
          v-for="key in whiteKeys" 
          :key="key.note"
          class="white-key"
          :class="{ pressed: pressedKeys.has(key.midi) }"
          @touchstart.prevent="onKeyPress(key.midi)"
          @touchend.prevent="onKeyRelease(key.midi)"
        >
          <text class="key-label">{{ key.label }}</text>
        </view>
        
        <!-- 黑键 -->
        <view 
          v-for="key in blackKeys" 
          :key="key.note"
          class="black-key"
          :style="{ left: key.position + '%' }"
          :class="{ pressed: pressedKeys.has(key.midi) }"
          @touchstart.prevent="onKeyPress(key.midi)"
          @touchend.prevent="onKeyRelease(key.midi)"
        ></view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, onUnmounted } from 'vue'
import { onLoad, onShareAppMessage } from '@dcloudio/uni-app'
import AudioManager from '@/utils/audio-manager'
import RecorderService from '@/utils/recorder-manager'
import { getHomeworkById, incrementPracticeCount, type Homework } from '@/utils/homework-data'

onShareAppMessage(() => ({
  title: `📚 ${homework.value?.title || '作业练习'} - 视唱练耳助手`,
  path: `/pages/homework-practice/homework-practice?id=${homeworkId.value}`
}))

const statusBarHeight = ref(20)
const homeworkId = ref('')
const homework = ref<Homework | null>(null)

// 录音相关
const isRecording = ref(false)
const recordingDuration = ref(0)
let recordingTimer: any = null

// 示范音播放相关
const isDemoPlaying = ref(false)
const currentSpeed = ref(1)
const playbackSpeeds = [0.5, 0.75, 1, 1.25, 1.5]
let demoAudio: UniApp.InnerAudioContext | null = null

// 钢琴键盘
const pressedKeys = reactive(new Set<number>())

// 白键和黑键数据 (两个八度 C4-B5)
const whiteKeys = [
  { note: 'C4', midi: 60, label: '1' },
  { note: 'D4', midi: 62, label: '2' },
  { note: 'E4', midi: 64, label: '3' },
  { note: 'F4', midi: 65, label: '4' },
  { note: 'G4', midi: 67, label: '5' },
  { note: 'A4', midi: 69, label: '6' },
  { note: 'B4', midi: 71, label: '7' },
  { note: 'C5', midi: 72, label: '1·' },
  { note: 'D5', midi: 74, label: '2·' },
  { note: 'E5', midi: 76, label: '3·' },
  { note: 'F5', midi: 77, label: '4·' },
  { note: 'G5', midi: 79, label: '5·' },
  { note: 'A5', midi: 81, label: '6·' },
  { note: 'B5', midi: 83, label: '7·' }
]

const blackKeys = [
  { note: 'C#4', midi: 61, position: 6 },
  { note: 'D#4', midi: 63, position: 13 },
  { note: 'F#4', midi: 66, position: 27 },
  { note: 'G#4', midi: 68, position: 34 },
  { note: 'A#4', midi: 70, position: 41 },
  { note: 'C#5', midi: 73, position: 56 },
  { note: 'D#5', midi: 75, position: 63 },
  { note: 'F#5', midi: 78, position: 77 },
  { note: 'G#5', midi: 80, position: 84 },
  { note: 'A#5', midi: 82, position: 91 }
]

onLoad((options) => {
  if (options?.id) {
    homeworkId.value = options.id
    loadHomework()
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
  
  // 增加练习次数
  if (homeworkId.value) {
    incrementPracticeCount(homeworkId.value)
  }
})

onUnmounted(() => {
  if (isRecording.value) {
    RecorderService.stop()
  }
  if (demoAudio) {
    demoAudio.destroy()
  }
})

const loadHomework = () => {
  homework.value = getHomeworkById(homeworkId.value) || null
}

const goBack = () => {
  uni.navigateBack()
}

// 录音功能
const toggleRecording = () => {
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
      RecorderService.start({ mode: 'mixed' })
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

// 示范音播放
const toggleDemo = () => {
  if (!homework.value?.demoAudioUrl) return
  
  if (isDemoPlaying.value) {
    demoAudio?.pause()
    isDemoPlaying.value = false
  } else {
    if (!demoAudio) {
      demoAudio = uni.createInnerAudioContext()
      demoAudio.src = homework.value.demoAudioUrl
      demoAudio.playbackRate = currentSpeed.value
      
      demoAudio.onEnded(() => {
        isDemoPlaying.value = false
      })
    }
    demoAudio.play()
    isDemoPlaying.value = true
  }
}

const setSpeed = (speed: number) => {
  currentSpeed.value = speed
  if (demoAudio) {
    demoAudio.playbackRate = speed
  }
}

// 乐谱预览
const previewSheet = () => {
  if (homework.value?.sheetImageUrl) {
    uni.previewImage({
      urls: [homework.value.sheetImageUrl],
      current: homework.value.sheetImageUrl
    })
  }
}

// 钢琴按键
const onKeyPress = (midi: number) => {
  pressedKeys.add(midi)
  AudioManager.playNote(midi, 0.8)
  
  // 震动反馈
  uni.vibrateShort({})
}

const onKeyRelease = (midi: number) => {
  pressedKeys.delete(midi)
  AudioManager.releaseNote(midi)
}
</script>

<style scoped>
.practice-page {
  width: 100vw;
  height: 100vh;
  background: var(--bg-dark);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* 顶部控制栏 15% */
.top-bar {
  height: 15%;
  min-height: 80rpx;
  background: linear-gradient(180deg, var(--divine-blue) 0%, var(--bg-dark) 100%);
  display: flex;
  align-items: flex-end;
  padding-bottom: 16rpx;
}

.top-controls {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24rpx;
  gap: 16rpx;
}

.control-btn {
  height: 64rpx;
  padding: 0 24rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8rpx;
  background: rgba(255,255,255,0.1);
  border-radius: 32rpx;
  font-size: 26rpx;
  color: #fff;
  border: 1px solid rgba(255,255,255,0.15);
}

.back-btn {
  width: 64rpx;
  padding: 0;
  font-size: 32rpx;
}

.homework-title {
  flex: 1;
  font-size: 32rpx;
  font-weight: 600;
  color: #fff;
  text-align: center;
}

.record-btn {
  min-width: 120rpx;
}

.record-btn.recording {
  background: rgba(239, 68, 68, 0.3);
  border-color: #ef4444;
}

.record-dot {
  width: 16rpx;
  height: 16rpx;
  border-radius: 50%;
  background: #ef4444;
}

.record-dot.pulse {
  animation: pulse 1s infinite;
}

@keyframes pulse {
  0%, 100% { transform: scale(1); opacity: 1; }
  50% { transform: scale(1.3); opacity: 0.7; }
}

.demo-player {
  display: flex;
  align-items: center;
  gap: 12rpx;
}

.play-btn {
  width: 64rpx;
  padding: 0;
  font-size: 28rpx;
}

.speed-selector {
  display: flex;
  background: rgba(255,255,255,0.05);
  border-radius: 16rpx;
  overflow: hidden;
}

.speed-btn {
  padding: 8rpx 16rpx;
  font-size: 22rpx;
  color: var(--text-muted);
}

.speed-btn.active {
  background: var(--divine-gold);
  color: var(--divine-blue);
  font-weight: 600;
}

/* 看谱区 40% */
.sheet-area {
  height: 40%;
  background: rgba(255,255,255,0.03);
  border-top: 1px solid rgba(255,255,255,0.1);
  border-bottom: 1px solid rgba(255,255,255,0.1);
}

.sheet-scroll {
  width: 100%;
  height: 100%;
}

.sheet-image {
  width: 100%;
  min-height: 100%;
}

.sheet-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.placeholder-icon {
  font-size: 80rpx;
  margin-bottom: 16rpx;
}

.placeholder-text {
  font-size: 28rpx;
  color: var(--text-muted);
}

/* 钢琴区 45% */
.piano-area {
  height: 45%;
  background: linear-gradient(180deg, #1a1a2e 0%, #0f0f1a 100%);
  display: flex;
  align-items: flex-end;
  padding: 16rpx;
}

.piano-keyboard {
  width: 100%;
  height: 90%;
  display: flex;
  position: relative;
}

.white-key {
  flex: 1;
  height: 100%;
  background: linear-gradient(180deg, #f8f8f8 0%, #e8e8e8 100%);
  border: 1px solid #ccc;
  border-radius: 0 0 8rpx 8rpx;
  margin: 0 2rpx;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  padding-bottom: 16rpx;
  transition: background 0.05s;
}

.white-key.pressed {
  background: linear-gradient(180deg, #d4af37 0%, #b8962d 100%);
}

.key-label {
  font-size: 24rpx;
  color: #666;
  font-weight: 600;
}

.white-key.pressed .key-label {
  color: #fff;
}

.black-key {
  position: absolute;
  width: 5%;
  height: 55%;
  background: linear-gradient(180deg, #333 0%, #111 100%);
  border-radius: 0 0 6rpx 6rpx;
  transform: translateX(-50%);
  z-index: 1;
  box-shadow: 0 4rpx 8rpx rgba(0,0,0,0.5);
  transition: background 0.05s;
}

.black-key.pressed {
  background: linear-gradient(180deg, #d4af37 0%, #8b6914 100%);
}
</style>
