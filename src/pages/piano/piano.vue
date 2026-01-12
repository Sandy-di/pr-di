<template>
  <view class="piano-page">
    <!-- 顶部控制栏 -->
    <view class="top-bar">
      <view class="back-btn" @click="goBack"><text>←</text></view>
      
      <view class="record-btn" :class="{ 'recording': isRecording }" @click="toggleRecording">
        <text class="record-icon">{{ isRecording ? '⏹' : '🎤' }}</text>
        <text class="record-text">{{ isRecording ? formatTime(recordingDuration) : '录音' }}</text>
      </view>
      
      <view class="spacer"></view>
    </view>
    
    <!-- 钢琴键盘区域 -->
    <view class="keyboard-area">
      <scroll-view class="keyboard-scroll" scroll-x>
        <view class="keyboard" :style="{ width: totalWidth + 'px' }">
          <!-- 白键 -->
          <view 
            v-for="key in whiteKeys" 
            :key="key.midi"
            class="white-key"
            :class="{ pressed: pressedKeys.has(key.midi) }"
            :style="{ left: key.x + 'px' }"
            @touchstart.prevent="onKeyPress(key)"
            @touchend.prevent="onKeyRelease(key)"
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
            :style="{ left: key.x + 'px' }"
            @touchstart.prevent.stop="onKeyPress(key)"
            @touchend.prevent.stop="onKeyRelease(key)"
          >
            <view class="key-label">
              <view class="dots-above">
                <text v-for="n in (key.dotCount > 0 ? key.dotCount : 0)" :key="n" class="dot">•</text>
              </view>
              <view class="note-row">
                <text class="sharp">#</text>
                <text class="notation">{{ key.baseNote }}</text>
              </view>
              <view class="dots-below">
                <text v-for="n in (key.dotCount < 0 ? Math.abs(key.dotCount) : 0)" :key="n" class="dot">•</text>
              </view>
            </view>
          </view>
        </view>
      </scroll-view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, onUnmounted } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import AudioManager from '@/utils/audio-manager'
import RecorderService from '@/utils/recorder-manager'

const currentOctave = ref(2)  // 从C2开始
const numOctaves = ref(5)     // 显示5个八度 (C2-B6)

const WHITE_KEY_WIDTH = 50
const BLACK_KEY_WIDTH = 32

const pressedKeys = reactive<Set<number>>(new Set())
const activeNoteHandles = reactive<Map<number, any>>(new Map())
const isRecording = ref(false)
const isPaused = ref(false)
const recordingDuration = ref(0)
let recordingTimer: any = null

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
    onStart: () => { isRecording.value = true; startRecordingTimer() },
    onStop: () => { isRecording.value = false; stopRecordingTimer(); uni.showToast({ title: '已保存', icon: 'success' }) },
    onError: () => { isRecording.value = false }
  })
})

onShow(() => {
  const autoStart = uni.getStorageSync('autoStartRecording')
  if (autoStart) { uni.removeStorageSync('autoStartRecording'); setTimeout(() => toggleRecording(), 500) }
})

onUnmounted(() => stopRecordingTimer())

const onKeyPress = (key: KeyData) => {
  if (pressedKeys.has(key.midi)) return
  pressedKeys.add(key.midi)
  const handle = AudioManager.playNote(key.midi, 0.8, 0)
  if (handle) activeNoteHandles.set(key.midi, handle)
  uni.vibrateShort({ type: 'light' })
}

const onKeyRelease = (key: KeyData) => {
  if (!pressedKeys.has(key.midi)) return
  pressedKeys.delete(key.midi)
  const handle = activeNoteHandles.get(key.midi)
  if (handle) { AudioManager.releaseNote(handle); activeNoteHandles.delete(key.midi) }
}

const goBack = () => uni.switchTab({ url: '/pages/index/index' })

const toggleRecording = () => {
  if (isRecording.value) { RecorderService.stop() }
  else { uni.authorize({ scope: 'scope.record', success: () => RecorderService.start({ mode: 'voice-only' }), fail: () => uni.showModal({ title: '需要录音权限', confirmText: '去设置', success: (r) => { if (r.confirm) uni.openSetting({}) } }) }) }
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
  background: #0f0f1a;
  overflow: hidden;
}

.top-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16rpx 24rpx;
  padding-top: calc(16rpx + env(safe-area-inset-top));
  background: #1a1a2e;
  flex-shrink: 0;
}

.back-btn {
  width: 64rpx;
  height: 64rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255,255,255,0.1);
  border-radius: 50%;
  color: #fff;
  font-size: 32rpx;
}

.record-btn {
  display: flex;
  align-items: center;
  gap: 10rpx;
  padding: 14rpx 28rpx;
  background: rgba(255,255,255,0.1);
  border-radius: 36rpx;
}
.record-btn.recording { background: #ef4444; }
.record-icon { font-size: 32rpx; }
.record-text { font-size: 26rpx; color: #fff; }

.spacer { width: 64rpx; }

/* 键盘区域 */
.keyboard-area {
  flex: 1;
  display: flex;
  align-items: stretch;
  overflow: hidden;
}

.keyboard-scroll {
  flex: 1;
  height: 100%;
}

.keyboard {
  position: relative;
  height: 100%;
}

/* 白键 */
.white-key {
  position: absolute;
  top: 0;
  width: 50px;
  height: 100%;
  background: linear-gradient(180deg, #fff 0%, #f0f0f0 90%, #ddd 100%);
  border-left: 1px solid #aaa;
  border-right: 1px solid #aaa;
  border-bottom: 3px solid #999;
  box-sizing: border-box;
  display: flex;
  align-items: flex-end;
  justify-content: center;
}

.white-key.pressed {
  background: linear-gradient(180deg, #ddd 0%, #ccc 100%);
  border-bottom: 1px solid #999;
}

.white-key .key-label {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-end;
  padding-bottom: 6rpx;
}

.white-key .dots-above,
.white-key .dots-below {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rpx;
}

.white-key .dot {
  font-size: 16rpx;
  color: #667eea;
  line-height: 0.5;
}

.white-key .notation {
  font-size: 28rpx;
  font-weight: 700;
  color: #667eea;
  line-height: 1;
  height: 28rpx;
}

/* 黑键 */
.black-key {
  position: absolute;
  top: 0;
  width: 32px;
  height: 58%;
  background: linear-gradient(180deg, #444 0%, #222 60%, #111 90%, #333 100%);
  border-radius: 0 0 6rpx 6rpx;
  box-shadow: 0 6rpx 10rpx rgba(0,0,0,0.6);
  display: flex;
  align-items: flex-end;
  justify-content: center;
  z-index: 10;
}

.black-key.pressed {
  height: 56%;
  background: linear-gradient(180deg, #333 0%, #111 100%);
  box-shadow: 0 2rpx 4rpx rgba(0,0,0,0.4);
}

.black-key .key-label {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-end;
  padding-bottom: 4rpx;
}

.black-key .dots-above,
.black-key .dots-below {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rpx;
}

.black-key .dot {
  font-size: 10rpx;
  color: #fff;
  line-height: 0.5;
}

.black-key .note-row {
  display: flex;
  align-items: flex-start;
  position: relative;
  height: 18rpx;
}

.black-key .sharp {
  font-size: 9rpx;
  font-weight: 600;
  color: #fff;
  position: absolute;
  left: -8rpx;
  top: -2rpx;
}

.black-key .notation {
  font-size: 18rpx;
  font-weight: 600;
  color: #fff;
  line-height: 1;
}
</style>
