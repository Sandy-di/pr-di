<template>
  <view class="practice-page">
    <!-- 导航栏 -->
    <view class="navbar" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="nav-back" @click="goBack"><text>←</text></view>
      <text class="nav-title">🎼 音阶练习</text>
      <text class="nav-mode">{{ currentScale.name }}</text>
    </view>

    <!-- 主内容 -->
    <view class="content">
      <!-- 音阶选择 -->
      <view class="scale-selector">
        <view 
          v-for="scale in scales" 
          :key="scale.id"
          class="scale-btn"
          :class="{ active: currentScale.id === scale.id }"
          @click="selectScale(scale)"
        >
          <text>{{ scale.name }}</text>
        </view>
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
              :class="{ 
                pressed: pressedKeys.has(key.midi),
                highlight: highlightKeys.includes(key.midi),
                current: currentNote === key.midi
              }"
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
              :class="{ 
                pressed: pressedKeys.has(key.midi),
                highlight: highlightKeys.includes(key.midi),
                current: currentNote === key.midi
              }"
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

      <!-- 控制面板 -->
      <view class="controls">
        <view class="control-row">
          <view class="control-btn" @click="playScale('up')">
            <text class="btn-icon">🎵</text>
            <text class="btn-text">上行</text>
          </view>
          <view class="control-btn" @click="playScale('down')">
            <text class="btn-icon">🎵</text>
            <text class="btn-text">下行</text>
          </view>
          <view class="control-btn" @click="playScale('both')">
            <text class="btn-icon">🎵</text>
            <text class="btn-text">上下行</text>
          </view>
        </view>
        
        <view class="speed-control">
          <text class="speed-label">速度</text>
          <slider 
            :value="speed" 
            :min="60" 
            :max="180" 
            :step="10"
            activeColor="#667eea"
            @change="onSpeedChange"
          />
          <text class="speed-value">{{ speed }} BPM</text>
        </view>
      </view>

      <!-- 提示区域 -->
      <view class="hint-area" v-if="isPlaying">
        <text class="hint">{{ playingHint }}</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, onUnmounted } from 'vue'
import { onShareAppMessage } from '@dcloudio/uni-app'
import AudioManager from '@/utils/audio-manager'

// 分享
onShareAppMessage(() => ({
  title: '🎼 音阶练习 - 练习大调、小调和五声音阶',
  path: '/pages/scale-practice/scale-practice'
}))

const statusBarHeight = ref(20)

// 音阶数据
const scales = [
  { id: 'major', name: 'C大调', root: 60, pattern: [0, 2, 4, 5, 7, 9, 11, 12] },
  { id: 'minor', name: 'A小调', root: 57, pattern: [0, 2, 3, 5, 7, 8, 10, 12] },
  { id: 'pentatonic', name: '五声音阶', root: 60, pattern: [0, 2, 4, 7, 9, 12] },
]

const currentScale = ref(scales[0])
const speed = ref(120)
const isPlaying = ref(false)
const playingHint = ref('')
const currentNote = ref(-1)

// 键盘参数
const currentOctave = ref(3)
const numOctaves = ref(3)
const WHITE_KEY_WIDTH = 45
const BLACK_KEY_WIDTH = 28

const pressedKeys = reactive<Set<number>>(new Set())
const activeNoteHandles = reactive<Map<number, any>>(new Map())

interface KeyData {
  midi: number
  baseNote: string
  dotCount: number
  x: number
}

const totalWidth = computed(() => numOctaves.value * 7 * WHITE_KEY_WIDTH)

// 当前音阶包含的音符
const highlightKeys = computed(() => {
  const scale = currentScale.value
  return scale.pattern.map(interval => scale.root + interval)
})

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
      const dotCount = octave - 4
      
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

let playTimer: any = null

onMounted(async () => {
  const windowInfo = uni.getWindowInfo()
  statusBarHeight.value = windowInfo.statusBarHeight || 20
  await AudioManager.init()
})

onUnmounted(() => {
  if (playTimer) clearTimeout(playTimer)
})

const selectScale = (scale: typeof scales[0]) => {
  currentScale.value = scale
}

const playScale = async (direction: 'up' | 'down' | 'both') => {
  if (isPlaying.value) return
  
  isPlaying.value = true
  const interval = 60000 / speed.value
  const scale = currentScale.value
  
  let notes: number[] = []
  const upNotes = scale.pattern.map(i => scale.root + i)
  const downNotes = [...upNotes].reverse().slice(1)
  
  if (direction === 'up') {
    notes = upNotes
    playingHint.value = '上行...'
  } else if (direction === 'down') {
    notes = downNotes
    playingHint.value = '下行...'
  } else {
    notes = [...upNotes, ...downNotes]
    playingHint.value = '上行...'
  }
  
  for (let i = 0; i < notes.length; i++) {
    if (!isPlaying.value) break
    
    if (direction === 'both' && i === upNotes.length) {
      playingHint.value = '下行...'
    }
    
    currentNote.value = notes[i]
    AudioManager.playNote(notes[i], 0.8, 0.3)
    
    await new Promise(resolve => {
      playTimer = setTimeout(resolve, interval)
    })
  }
  
  currentNote.value = -1
  isPlaying.value = false
  playingHint.value = ''
}

const onSpeedChange = (e: any) => {
  speed.value = e.detail.value
}

const onKeyPress = (key: KeyData) => {
  if (pressedKeys.has(key.midi)) return
  pressedKeys.add(key.midi)
  const handle = AudioManager.playNote(key.midi, 0.8, 0)
  if (handle) activeNoteHandles.set(key.midi, handle)
  uni.vibrateShort({})
}

const onKeyRelease = (key: KeyData) => {
  if (!pressedKeys.has(key.midi)) return
  pressedKeys.delete(key.midi)
  const handle = activeNoteHandles.get(key.midi)
  if (handle) { AudioManager.releaseNote(handle); activeNoteHandles.delete(key.midi) }
}

const goBack = () => uni.navigateBack()
</script>

<style scoped>
.practice-page {
  min-height: 100vh;
  background: linear-gradient(180deg, #0f0f1a 0%, #1a1a2e 100%);
}

.navbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16rpx 32rpx;
  background: #1a1a2e;
}

.nav-back {
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

.nav-title {
  font-size: 36rpx;
  font-weight: 600;
  color: #fff;
}

.nav-mode {
  font-size: 26rpx;
  color: #667eea;
  font-weight: 500;
}

.content {
  padding: 24rpx;
}

/* 音阶选择器 */
.scale-selector {
  display: flex;
  gap: 16rpx;
  margin-bottom: 32rpx;
}

.scale-btn {
  flex: 1;
  padding: 20rpx;
  background: rgba(255,255,255,0.1);
  border-radius: 16rpx;
  text-align: center;
  border: 2rpx solid transparent;
}

.scale-btn.active {
  background: rgba(102, 126, 234, 0.2);
  border-color: #667eea;
}

.scale-btn text {
  font-size: 26rpx;
  color: #fff;
}

/* 键盘区域 */
.keyboard-area {
  height: 300rpx;
  margin-bottom: 32rpx;
  border-radius: 16rpx;
  overflow: hidden;
}

.keyboard-scroll {
  height: 100%;
}

.keyboard {
  position: relative;
  height: 100%;
}

.white-key {
  position: absolute;
  top: 0;
  width: 45px;
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

.white-key.pressed { background: linear-gradient(180deg, #ddd 0%, #ccc 100%); }
.white-key.highlight { background: linear-gradient(180deg, #e8f0ff 0%, #d0e0ff 100%); }
.white-key.current { background: linear-gradient(180deg, #667eea 0%, #764ba2 100%); }

.white-key .key-label {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding-bottom: 6rpx;
}

.white-key .dots-above, .white-key .dots-below {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rpx;
}

.white-key .dot { font-size: 16rpx; color: #667eea; line-height: 0.5; }
.white-key .notation { font-size: 24rpx; font-weight: 700; color: #667eea; }
.white-key.current .notation { color: #fff; }

.black-key {
  position: absolute;
  top: 0;
  width: 28px;
  height: 58%;
  background: linear-gradient(180deg, #444 0%, #222 60%, #111 90%, #333 100%);
  border-radius: 0 0 6rpx 6rpx;
  box-shadow: 0 6rpx 10rpx rgba(0,0,0,0.6);
  display: flex;
  align-items: flex-end;
  justify-content: center;
  z-index: 10;
}

.black-key.pressed { background: linear-gradient(180deg, #333 0%, #111 100%); }
.black-key.highlight { background: linear-gradient(180deg, #5a6fd6 0%, #4a5bc6 100%); }
.black-key.current { background: linear-gradient(180deg, #667eea 0%, #764ba2 100%); }

.black-key .key-label {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding-bottom: 4rpx;
}

.black-key .dots-above, .black-key .dots-below {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rpx;
}

.black-key .dot { font-size: 10rpx; color: #fff; line-height: 0.5; }
.black-key .note-row { display: flex; align-items: flex-start; position: relative; height: 18rpx; }
.black-key .sharp { font-size: 9rpx; font-weight: 600; color: #fff; position: absolute; left: -8rpx; top: -2rpx; }
.black-key .notation { font-size: 18rpx; font-weight: 600; color: #fff; }

/* 控制面板 */
.controls {
  background: #1a1a2e;
  border-radius: 24rpx;
  padding: 32rpx;
  margin-bottom: 24rpx;
}

.control-row {
  display: flex;
  gap: 20rpx;
  margin-bottom: 32rpx;
}

.control-btn {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 24rpx;
  background: rgba(102, 126, 234, 0.2);
  border-radius: 16rpx;
}

.btn-icon { font-size: 40rpx; margin-bottom: 8rpx; }
.btn-text { font-size: 26rpx; color: #fff; }

.speed-control {
  display: flex;
  align-items: center;
  gap: 16rpx;
}

.speed-label { font-size: 26rpx; color: #b0b0c0; }
.speed-value { font-size: 26rpx; color: #667eea; min-width: 100rpx; }

/* 提示区域 */
.hint-area {
  text-align: center;
  padding: 24rpx;
}

.hint {
  font-size: 32rpx;
  color: #667eea;
  font-weight: 600;
}
</style>
