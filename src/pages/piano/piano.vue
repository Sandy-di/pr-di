<template>
  <view class="piano-page">
    <!-- 顶部控制栏 -->
    <view class="top-bar">
      <!-- 左侧：返回 + 录音 -->
      <view class="left-controls">
        <view class="capsule-btn back-btn" @click="goBack">
          <svg-icon name="back" size="24rpx" color="#fff" />
        </view>
        
        <view class="capsule-btn record-btn" :class="{ 'recording': isRecording }" @click="handleRecordClick">
          <svg-icon :name="isRecording ? 'stop' : 'record'" size="22rpx" :color="isRecording ? '#fff' : '#fff'" />
          <text class="btn-text">{{ isRecording ? formatTime(recordingDuration) : '录' }}</text>
        </view>
        
        <!-- 分享按钮 - 只在录音结束后显示 -->
        <view class="capsule-btn share-btn" v-if="showShareBtn && !isRecording" @click="shareRecording">
          <svg-icon name="share" size="22rpx" color="#fff" />
        </view>
      </view>
      
      <!-- 中间：节拍器 -->
      <view class="center-controls">
        <view class="capsule-btn metronome-btn" :class="{ 'active': metronomeOn }" @click="toggleMetronome">
          <svg-icon name="metronome" size="24rpx" :color="metronomeOn ? '#fff' : 'rgba(255,255,255,0.6)'" />
        </view>
        <text class="tempo-text" @click="setTempo">{{ metronomeTempo }}</text>
      </view>
      
      <!-- 右侧留空给微信胶囊 -->
      <view class="right-spacer"></view>
    </view>
    
    <!-- 钢琴键盘区域 -->
    <view class="keyboard-area">
      <scroll-view class="keyboard-scroll" scroll-x :scroll-left="scrollLeft" @scroll="onScroll">
        <view class="keyboard" :style="{ width: totalWidth + 'px' }">
          <!-- 滑动控制条 - 在键盘顶部，方便滑动 -->
          <view class="scroll-handle"></view>
          
          <view class="keyboard-shadow"></view>
          
          <!-- 白键 -->
          <view 
            v-for="key in whiteKeys" 
            :key="key.midi"
            class="white-key"
            :class="{ pressed: pressedKeys.has(key.midi) }"
            :style="{ left: key.x + 'px', width: WHITE_KEY_WIDTH + 'px' }"
            @touchstart="onKeyPress(key)"
            @touchend="onKeyRelease(key)"
          >
            <view class="key-label">
              <view class="dots-above">
                <text v-for="n in (key.dotCount > 0 ? key.dotCount : 0)" :key="n" class="dot">•</text>
              </view>
              <text class="notation">{{ key.baseNote }}</text>
              <view class="dots-below">
                <text v-for="n in (key.dotCount < 0 ? Math.abs(key.dotCount) : 0)" :key="n" class="dot">•</text>
              </view>
            </view>
          </view>
          
          <!-- 黑键 -->
          <view 
            v-for="key in blackKeys" 
            :key="key.midi"
            class="black-key"
            :class="{ pressed: pressedKeys.has(key.midi) }"
            :style="{ left: key.x + 'px', width: BLACK_KEY_WIDTH + 'px' }"
            @touchstart.stop="onKeyPress(key)"
            @touchend.stop="onKeyRelease(key)"
          >
            <view class="key-highlight"></view>
            <view class="key-label">
              <!-- 黑键标记暂时隐藏，保持简洁 -->
            </view>
          </view>
        </view>
      </scroll-view>
      
      <!-- 滑动提示 -->
      <view class="scroll-hint" v-if="showScrollHint">
        <text>← 滑动上方区域查看更多键 →</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, onUnmounted } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import AudioManager from '@/utils/audio-manager'
import RecorderService from '@/utils/recorder-manager'
import SvgIcon from '@/components/SvgIcon.vue'
import { onShareAppMessage } from '@dcloudio/uni-app'

// 分享配置
onShareAppMessage(() => ({
  title: '🎹 来和我一起弹钢琴吧！ - 视唱练耳助手',
  path: '/pages/piano/piano',
  imageUrl: '/static/share-cover.jpg'
}))

const currentOctave = ref(2)  // 从C2开始
const numOctaves = ref(5)     // 显示5个八度 (C2-B6)

const WHITE_KEY_WIDTH = 50
const BLACK_KEY_WIDTH = 32

const pressedKeys = reactive<Set<number>>(new Set())
const activeNoteHandles = reactive<Map<number, any>>(new Map())
const isRecording = ref(false)
const isPaused = ref(false)
const recordingDuration = ref(0)
const metronomeOn = ref(false)
const metronomeTempo = ref(120) // BPM
const scrollLeft = ref(0)
const showShareBtn = ref(false)
let lastRecordingPath = ''
const showScrollHint = ref(true)
let recordingTimer: any = null
let metronomeTimer: any = null
let metronomeAudioContext: any = null

const onScroll = (e: any) => {
  scrollLeft.value = e.detail.scrollLeft
  // 滑动后隐藏提示
  if (showScrollHint.value) {
    showScrollHint.value = false
  }
}

interface KeyData {
  midi: number
  baseNote: string
  dotCount: number  // 正数=高音点(上方)，负数=低音点(下方)，0=中央C八度
  x: number
}

const totalWidth = computed(() => numOctaves.value * 7 * WHITE_KEY_WIDTH)

const whiteKeys = computed<KeyData[]>(() => {
  const keys: KeyData[] = []
  const whiteNotes = [0, 2, 4, 5, 7, 9, 11]
  const baseNotes = ['1', '2', '3', '4', '5', '6', '7']
  
  let x = 0
  for (let oct = 0; oct < numOctaves.value; oct++) {
    const octave = currentOctave.value + oct
    for (let i = 0; i < 7; i++) {
      const midi = (octave + 1) * 12 + whiteNotes[i]
      const baseNote = baseNotes[i]
      const dotCount = octave - 4  // 中央C八度=0
      
      keys.push({ midi, baseNote, dotCount, x })
      x += WHITE_KEY_WIDTH
    }
  }
  return keys
})

const blackKeys = computed<KeyData[]>(() => {
  const keys: KeyData[] = []
  const blackNotes = [1, 3, 6, 8, 10]
  const baseNotes = ['1', '2', '4', '5', '6']
  const blackPositions = [0.65, 1.65, 3.65, 4.65, 5.65]
  
  for (let oct = 0; oct < numOctaves.value; oct++) {
    const octave = currentOctave.value + oct
    for (let i = 0; i < 5; i++) {
      const midi = (octave + 1) * 12 + blackNotes[i]
      const baseNote = baseNotes[i]
      const dotCount = octave - 4
      
      const x = (oct * 7 + blackPositions[i]) * WHITE_KEY_WIDTH - BLACK_KEY_WIDTH / 2
      keys.push({ midi, baseNote, dotCount, x })
    }
  }
  return keys
})

onMounted(async () => {
  await AudioManager.init()
  RecorderService.init()
  RecorderService.setCallbacks({
    onStart: () => { isRecording.value = true; showShareBtn.value = false; startRecordingTimer() },
    onStop: (recording) => { 
      isRecording.value = false
      stopRecordingTimer()
      showShareBtn.value = true
      if (recording?.voicePath) lastRecordingPath = recording.voicePath
      uni.showToast({ title: '已保存', icon: 'success' }) 
    },
    onError: () => { isRecording.value = false }
  })
})

onShow(() => {
  const autoStart = uni.getStorageSync('autoStartRecording')
  if (autoStart) { uni.removeStorageSync('autoStartRecording'); setTimeout(() => handleRecordClick(), 500) }
})

onUnmounted(() => {
  stopRecordingTimer()
  stopMetronome()
  // 退出页面时自动停止录音
  if (isRecording.value) {
    RecorderService.stop()
  }
})

const onKeyPress = (key: KeyData) => {
  if (pressedKeys.has(key.midi)) return
  pressedKeys.add(key.midi)
  const handle = AudioManager.playNote(key.midi, 0.8, 0)
  if (handle) activeNoteHandles.set(key.midi, handle)
  // 移除震动反馈，避免开发工具问题
}

const onKeyRelease = (key: KeyData) => {
  if (!pressedKeys.has(key.midi)) return
  pressedKeys.delete(key.midi)
  const handle = activeNoteHandles.get(key.midi)
  if (handle) { AudioManager.releaseNote(handle); activeNoteHandles.delete(key.midi) }
}

const goBack = () => uni.switchTab({ url: '/pages/index/index' })

const toggleMetronome = () => {
  metronomeOn.value = !metronomeOn.value
  if (metronomeOn.value) {
    startMetronome()
  } else {
    stopMetronome()
  }
}

const setTempo = () => {
  uni.showModal({
    title: '设置节拍器速度',
    editable: true,
    placeholderText: '输入 BPM (40-240)',
    success: (res) => {
      if (res.confirm && res.content) {
        const tempo = parseInt(res.content)
        if (tempo >= 40 && tempo <= 240) {
          metronomeTempo.value = tempo
          if (metronomeOn.value) {
            stopMetronome()
            startMetronome()
          }
        } else {
          uni.showToast({ title: '请输入40-240之间的数字', icon: 'none' })
        }
      }
    }
  })
}

const startMetronome = () => {
  playMetronomeClick()
  const interval = 60000 / metronomeTempo.value
  metronomeTimer = setInterval(() => {
    playMetronomeClick()
  }, interval)
  uni.showToast({ title: `节拍器 ${metronomeTempo.value} BPM`, icon: 'none' })
}

const stopMetronome = () => {
  if (metronomeTimer) {
    clearInterval(metronomeTimer)
    metronomeTimer = null
  }
}

const playMetronomeClick = () => {
  // 使用木鱼声音作为节拍器
  AudioManager.playWoodblock(false, 0.5)
}

const shareRecording = () => {
  // 直接跳转到录音管理页面
  uni.navigateTo({ url: '/pages/recordings/recordings' })
}


const handleRecordClick = () => {
  if (isRecording.value) {
    RecorderService.stop()
  } else {
    uni.showActionSheet({
      itemList: ['只录人声', '录钢琴+人声'],
      success: (res) => {
        const mode = res.tapIndex === 0 ? 'voice-only' : 'mixed'
        uni.authorize({
          scope: 'scope.record',
          success: () => RecorderService.start({ mode, pageName: '钢琴' }),
          fail: () => uni.showModal({
            title: '需要录音权限',
            confirmText: '去设置',
            success: (r) => { if (r.confirm) uni.openSetting({}) }
          })
        })
      }
    })
  }
}

const startRecordingTimer = () => { recordingDuration.value = 0; recordingTimer = setInterval(() => { if (!isPaused.value) recordingDuration.value += 1000 }, 1000) }
const stopRecordingTimer = () => { if (recordingTimer) { clearInterval(recordingTimer); recordingTimer = null }; recordingDuration.value = 0 }
const formatTime = (ms: number) => { const s = Math.floor(ms / 1000); return `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}` }
</script>

<style scoped>
.piano-page {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: #111;
  overflow: hidden;
}

.top-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6rpx 16rpx;
  padding-top: calc(6rpx + env(safe-area-inset-top));
  background: #7D6B4F;
  flex-shrink: 0;
  z-index: 100;
}

/* 左侧控制区 */
.left-controls {
  display: flex;
  align-items: center;
  gap: 12rpx;
}

/* 统一胶囊按钮样式 - 扁平风格 */
.capsule-btn {
  width: 36rpx;
  height: 36rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border-radius: 8rpx;
}

/* 返回按钮 */
.back-btn {
  /* 继承基础样式 */
}

/* 录音按钮 - 稍宽一点显示文字 */
.record-btn {
  width: auto;
  height: 36rpx;
  min-width: 36rpx;
  padding: 0 12rpx;
  gap: 4rpx;
}

.record-btn.recording {
  background: rgba(255,255,255,0.15);
}

/* 分享按钮 */
.share-btn {
  background: transparent;
}

/* 节拍器按钮 */
.metronome-btn {
  /* 继承基础样式 */
}

.metronome-btn.active {
  background: rgba(255,255,255,0.15);
}

.btn-text {
  font-size: 18rpx;
  font-weight: 500;
  color: #fff;
  font-variant-numeric: tabular-nums;
}

/* 中间控制区 */
.center-controls {
  display: flex;
  align-items: center;
  gap: 12rpx;
}

.tempo-text {
  font-size: 18rpx;
  color: rgba(255,255,255,0.9);
  min-width: 40rpx;
  text-align: center;
  font-weight: 500;
}

/* 右侧留空给微信胶囊按钮 */
.right-spacer {
  width: 180rpx;
}

/* 键盘区域 */
.keyboard-area {
  flex: 1;
  display: flex;
  align-items: stretch;
  overflow: hidden;
  position: relative;
  background: #000;
}

.keyboard-scroll {
  flex: 1;
  height: 100%;
}

.keyboard {
  position: relative;
  height: 100%;
  padding-top: 24rpx; /* 顶部留白增加立体感 */
}

.keyboard-shadow {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 24rpx;
  background: #000;
  z-index: 0;
}

/* 白键 */
.white-key {
  position: absolute;
  top: 0;
  height: 100%;
  background: #ffffff; /* Fallback */
  background: var(--key-white, #ffffff);
  border-radius: 0 0 12rpx 12rpx;
  box-shadow: 
    inset 0 0 0 1px rgba(0,0,0,0.1),
    0 4rpx 0 #bbb,
    inset 0 -8rpx 12rpx rgba(0,0,0,0.1);
  box-sizing: border-box;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  z-index: 1;
  transform-origin: top center;
  transition: background 0.1s, transform 0.05s;
}

.white-key.pressed {
  background: #e8e8e8; /* Fallback */
  background: var(--key-white-pressed, #e8e8e8);
  box-shadow: 
    inset 0 0 0 1px rgba(0,0,0,0.1),
    0 1rpx 0 #bbb,
    inset 0 -4rpx 20rpx rgba(0,0,0,0.2);
  transform: translateY(2rpx);
}

.white-key::after {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  border-radius: 0 0 12rpx 12rpx;
  box-shadow: 0 0 30rpx var(--primary-color, var(--divine-gold));
  opacity: 0;
  transition: opacity 0.1s;
  pointer-events: none;
}

.white-key.pressed::after {
  opacity: 0.4;
}

.white-key .key-label {
  position: absolute;
  bottom: 2rpx; /* 最小底部边距 */
  left: 0;
  right: 0;
  top: 62%; /* 进一步下移，确保低音点有空间 */
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center; /* 在剩余空间中居中 */
  padding: 0;
  opacity: 0.7;
  overflow: visible; /* 允许内容溢出 */
}

.white-key.pressed .key-label {
  opacity: 1;
}

.white-key .dot {
  font-size: 12rpx; /* 进一步缩小点的尺寸 */
  color: #333;
  line-height: 6rpx;
  height: 6rpx;
  margin: 0;
  display: block;
}

.dots-above {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-end;
  min-height: 12rpx; /* 紧凑的高度 */
}

.dots-below {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  min-height: 12rpx; /* 紧凑的高度 */
}

.white-key .notation {
  font-size: 18rpx; /* 稍微减小字号 */
  font-weight: 700;
  color: #333;
  line-height: 1;
  margin: 1rpx 0; /* 极小的上下间距 */
}

/* 黑键 */
.black-key {
  position: absolute;
  top: 0;
  height: 60%;
  background: #2a2a2a; /* Fallback */
  background: var(--key-black, #2a2a2a);
  border-radius: 0 0 8rpx 8rpx;
  box-shadow: 
    0 4rpx 8rpx rgba(0,0,0,0.5),
    0 6rpx 0 #000,
    inset 2rpx -2rpx 4rpx rgba(255,255,255,0.1);
  display: flex;
  align-items: flex-end;
  justify-content: center;
  z-index: 10;
  transform-origin: top center;
}

.black-key.pressed {
  background: var(--key-black-pressed);
  box-shadow: 
    0 2rpx 4rpx rgba(0,0,0,0.5),
    0 2rpx 0 #000,
    inset 1rpx -1rpx 2rpx rgba(255,255,255,0.1);
  transform: translateY(2rpx);
}

.key-highlight {
  position: absolute;
  top: 10rpx;
  left: 10rpx;
  right: 10rpx;
  height: 40rpx;
  background: linear-gradient(180deg, rgba(255,255,255,0.15) 0%, transparent 100%);
  border-radius: 4rpx;
}

/* 滑动控制条 */
.scroll-handle {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 40rpx;
  background: linear-gradient(180deg, rgba(212, 175, 55, 0.3) 0%, transparent 100%);
  z-index: 100;
}

/* 滑动提示 */
.scroll-hint {
  position: absolute;
  bottom: 20rpx;
  left: 50%;
  transform: translateX(-50%);
  padding: 12rpx 24rpx;
  background: rgba(0,0,0,0.7);
  border-radius: 24rpx;
  z-index: 50;
}

.scroll-hint text {
  font-size: 22rpx;
  color: rgba(255,255,255,0.8);
}
</style>
