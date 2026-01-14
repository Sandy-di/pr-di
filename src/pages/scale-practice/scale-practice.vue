<template>
  <view class="practice-page">
    <!-- 顶部区域 - 单行布局 -->
    <view class="top-section">
      <!-- 左侧：返回 -->
      <view class="nav-back" @click="goBack"><text>←</text></view>
      
      <!-- 中间：音阶选择 -->
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
      
      <!-- 右侧：留空给微信胶囊 -->
      <view class="nav-spacer"></view>
    </view>

    <!-- 中间区域 (70%) - 钢琴键盘 -->
    <view class="keyboard-section">
      <scroll-view class="keyboard-scroll" scroll-x enable-flex>
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
            :class="{ 
              pressed: pressedKeys.has(key.midi),
              highlight: highlightKeys.includes(key.midi),
              current: currentNote === key.midi
            }"
            :style="{ left: key.x + 'px' }"
            @touchstart.stop="onKeyPress(key)"
            @touchend.stop="onKeyRelease(key)"
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
      
      <!-- 播放提示 -->
      <view class="hint-area" v-if="isPlaying">
        <text class="hint">{{ playingHint }}</text>
      </view>
    </view>

    <!-- 底部区域 (15%) - 控制按钮 -->
    <view class="bottom-section">
      <view class="control-btn" @click="playScale('up')">
        <text class="btn-text">上行</text>
      </view>
      <view class="control-btn" @click="playScale('down')">
        <text class="btn-text">下行</text>
      </view>
      <view class="control-btn" @click="playScale('both')">
        <text class="btn-text">上下行</text>
      </view>
      <view class="speed-box">
        <text class="speed-value">{{ speed }}</text>
        <slider 
          class="speed-slider"
          :value="speed" 
          :min="60" 
          :max="180" 
          :step="10"
          activeColor="#667eea"
          block-size="12"
          @change="onSpeedChange"
        />
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
const WHITE_KEY_WIDTH = 50
const BLACK_KEY_WIDTH = 30

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
  width: 100vw;
  height: 100vh;
  background: #0f0f1a;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

/* 顶部区域 - 单行布局 */
.top-section {
  height: 60rpx;
  flex-shrink: 0;
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  background: #1a1a2e;
  padding: 8rpx 16rpx;
  padding-top: calc(8rpx + env(safe-area-inset-top));
  gap: 16rpx;
}

.nav-back {
  width: 48rpx;
  height: 48rpx;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255,255,255,0.1);
  border-radius: 50%;
  color: #fff;
  font-size: 24rpx;
}

/* 右侧留空给微信胶囊 */
.nav-spacer {
  width: 180rpx;
  flex-shrink: 0;
}

.scale-selector {
  flex: 1;
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 16rpx;
}

.scale-btn {
  padding: 6rpx 20rpx;
  background: rgba(255,255,255,0.08);
  border-radius: 20rpx;
  border: 1px solid rgba(255,255,255,0.15);
}

.scale-btn.active {
  background: rgba(102, 126, 234, 0.25);
  border-color: #667eea;
}

.scale-btn text {
  font-size: 20rpx;
  color: #fff;
}

/* 中间区域 - 钢琴键盘（填满剩余空间） */
.keyboard-section {
  flex: 1;
  background: #000;
  position: relative;
  overflow: hidden;
}

.keyboard-scroll {
  width: 100%;
  height: 100%;
}

.keyboard {
  position: relative;
  height: 100%;
}

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
  border-radius: 0 0 8rpx 8rpx;
}

.white-key.pressed { background: linear-gradient(180deg, #ddd 0%, #ccc 100%); }
.white-key.highlight { background: linear-gradient(180deg, #e8f0ff 0%, #d0e0ff 100%); }
.white-key.current { background: linear-gradient(180deg, #667eea 0%, #764ba2 100%); }

.white-key .key-label {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding-bottom: 12rpx;
}

.white-key .dots-above, .white-key .dots-below {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rpx;
}

.white-key .dot { font-size: 16rpx; color: #667eea; line-height: 0.5; }
.white-key .notation { font-size: 28rpx; font-weight: 700; color: #667eea; margin: 2rpx 0; }
.white-key.current .notation { color: #fff; }

.black-key {
  position: absolute;
  top: 0;
  width: 30px;
  height: 60%;
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
  padding-bottom: 8rpx;
}

.black-key .dots-above, .black-key .dots-below {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rpx;
}

.black-key .dot { font-size: 10rpx; color: #fff; line-height: 0.5; }
.black-key .note-row { display: flex; align-items: flex-start; position: relative; height: 20rpx; }
.black-key .sharp { font-size: 10rpx; font-weight: 600; color: #fff; position: absolute; left: -10rpx; top: -2rpx; }
.black-key .notation { font-size: 20rpx; font-weight: 600; color: #fff; }

.hint-area {
  position: absolute;
  top: 16rpx;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(0,0,0,0.7);
  padding: 8rpx 24rpx;
  border-radius: 20rpx;
  pointer-events: none;
}

.hint {
  font-size: 24rpx;
  color: #fff;
}

/* 底部区域 - 控制按钮 */
.bottom-section {
  height: 80rpx;
  min-height: 80rpx;
  flex-shrink: 0;
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: center;
  gap: 16rpx;
  padding: 8rpx 24rpx;
  padding-bottom: calc(8rpx + env(safe-area-inset-bottom));
  background: #1a1a2e;
}

.control-btn {
  flex: 1;
  max-width: 140rpx;
  height: 56rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(102, 126, 234, 0.25);
  border-radius: 28rpx;
  border: 1px solid rgba(102, 126, 234, 0.4);
}

.btn-text { font-size: 24rpx; color: #fff; font-weight: 500; }

.speed-box {
  flex: 1.5;
  max-width: 200rpx;
  height: 56rpx;
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: center;
  gap: 8rpx;
  background: rgba(102, 126, 234, 0.15);
  border-radius: 28rpx;
  padding: 0 16rpx;
}

.speed-value { font-size: 22rpx; color: #667eea; font-weight: 600; }
.speed-slider { flex: 1; margin: 0; }
</style>
