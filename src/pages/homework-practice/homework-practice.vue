<template>
  <view class="practice-page">
    <!-- 顶部控制栏 -->
    <view class="top-bar">
      <!-- 左侧内容区：返回 + 标题 + 录音 + 示范 + 速度 -->
      <view class="top-bar-left">
        <!-- 返回按钮 -->
        <view class="control-btn back-btn" @click="goBack">
          <text>←</text>
        </view>
        <!-- 作业标题 -->
        <text class="homework-title">{{ homework?.title || '' }}</text>
        <!-- 录音按钮 -->
        <view 
          class="control-btn record-btn" 
          :class="{ recording: isRecording }"
          @click="toggleRecording"
        >
          <view class="record-dot" :class="{ pulse: isRecording }"></view>
          <text>{{ isRecording ? formatTime(recordingDuration) : '录音' }}</text>
        </view>
        <!-- 示范音频播放按钮 -->
        <view 
          v-if="demoAudioUrl"
          class="control-btn demo-btn" 
          :class="{ playing: isDemoPlaying }"
          @click="toggleDemo"
        >
          <text>{{ isDemoPlaying ? '⏸' : '▶' }}</text>
          <text>示范</text>
        </view>
        <!-- 播放进度条 -->
        <view v-if="demoAudioUrl && isDemoPlaying" class="demo-progress">
          <view 
            class="progress-bar" 
            @touchstart="onProgressTouchStart"
            @touchmove="onProgressTouchMove"
            @touchend="onProgressTouchEnd"
          >
            <view class="progress-fill" :style="{ width: demoProgress + '%' }"></view>
            <view class="progress-thumb" :style="{ left: demoProgress + '%' }"></view>
          </view>
          <text class="progress-time">{{ formatDemoTime(demoCurrentTime) }}</text>
        </view>
        <!-- 速度选择按钮 -->
        <view 
          v-if="demoAudioUrl"
          class="control-btn speed-btn"
          @click="cycleSpeed"
        >
          <text>{{ currentSpeed }}x</text>
        </view>
      </view>
      
      <!-- 右侧留空给微信胶囊 -->
      <view class="top-bar-right"></view>
    </view>

    <!-- 看谱区 -->
    <view class="sheet-area">
      <swiper 
        class="sheet-swiper" 
        :current="currentSheetPage"
        @change="onSheetChange"
        :indicator-dots="sheetImages.length > 1"
        indicator-color="rgba(0,0,0,0.2)"
        indicator-active-color="#d4af37"
        :circular="true"
      >
        <swiper-item v-for="(img, index) in sheetImages" :key="index">
          <image 
            class="sheet-image"
            :src="img"
            mode="aspectFit"
            @click="previewSheet(index)"
            @error="onImageError"
          />
        </swiper-item>
      </swiper>

      <!-- 空状态 -->
      <view v-if="!isLoading && sheetImages.length === 0" class="empty-state">
        <text class="placeholder-icon">🎼</text>
        <text class="placeholder-text">暂无乐谱</text>
      </view>

      <!-- 页码指示 (浮动在右下角) -->
      <view class="page-indicator" v-if="sheetImages.length > 1">
        <text>{{ currentSheetPage + 1 }} / {{ sheetImages.length }}</text>
      </view>
    </view>



    <!-- 钢琴区 (占据剩余空间) -->
    <view class="piano-area">
      <scroll-view class="keyboard-scroll" scroll-x :scroll-left="scrollLeft" @scroll="onScroll">
        <view class="keyboard" :style="{ width: totalWidth + 'px' }">
          <view class="keyboard-shadow"></view>
          
          <!-- 白键 -->
          <view 
            v-for="key in whiteKeys" 
            :key="key.midi"
            class="white-key"
            :class="{ pressed: pressedKeys.has(key.midi), 'middle-c': key.midi === 60 }"
            :style="{ left: key.x + 'px', width: WHITE_KEY_WIDTH + 'px' }"
            @touchstart="onKeyPress(key)"
            @touchend="onKeyRelease(key)"
          >
            <view class="key-label">
              <!-- 只显示中央C C4 的文本 -->
              <text class="notation" v-if="key.midi === 60">C4</text>
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
          </view>
        </view>
      </scroll-view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, onUnmounted } from 'vue'
import { onLoad, onShareAppMessage } from '@dcloudio/uni-app'
import AudioManager from '@/utils/audio-manager'
import RecorderService from '@/utils/recorder-manager'
import { fetchHomeworkByIdAsync, getSheetImagesAsync, getDemoAudioUrlAsync, incrementPracticeCount, getHomeworkProgress, saveHomeworkProgress, type Homework } from '@/utils/homework-data'

onShareAppMessage(() => ({
  title: `📚 ${homework.value?.title || '作业练习'} - 视唱练耳助手`,
  path: `/pages/homework-practice/homework-practice?id=${homeworkId.value}`
}))

const statusBarHeight = ref(20)
const homeworkId = ref('')
const homework = ref<Homework | null>(null)
const isLoading = ref(false)
const loadError = ref('')

// 通过 onLoad 获取参数
onLoad((options: any) => {
  console.log('onLoad options:', options)
  if (options && options.id) {
    homeworkId.value = options.id
    loadHomework()
  }
})

onMounted(() => {
  // 顶栏高度
  const menuBtn = uni.getMenuButtonBoundingClientRect()
  statusBarHeight.value = menuBtn.top

  // 保险措施：如果 onLoad 没取到（例如组件刷新），尝试从页面栈获取
  if (!homeworkId.value) {
    const pages = getCurrentPages()
    if (pages.length > 0) {
      const page = pages[pages.length - 1] as any
      if (page.options && page.options.id) {
        console.log('Force load from page options:', page.options.id)
        homeworkId.value = page.options.id
        loadHomework()
      }
    }
  }

  // 初始化音频管理器
  AudioManager.init()

  // 初始化录音
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

// 乐谱翻页
const currentSheetPage = ref(0)
const sheetImages = ref<string[]>([])

// 录音相关
const isRecording = ref(false)
const recordingDuration = ref(0)
let recordingTimer: any = null

// 示范音播放相关
const isDemoPlaying = ref(false)
const demoAudioUrl = ref<string | null>(null) // 示范音频 URL
const currentSpeed = ref(1)
const playbackSpeeds = [0.5, 0.75, 1, 1.25, 1.5]
const demoProgress = ref(0)       // 播放进度百分比
const demoCurrentTime = ref(0)    // 当前播放时间（秒）
const demoDuration = ref(0)       // 总时长（秒）
let demoAudio: UniApp.InnerAudioContext | null = null

// 钢琴键盘
const pressedKeys = reactive(new Set<number>())

// 钢琴配置
const currentOctave = ref(2)  // 从C2开始
const numOctaves = ref(5)     // 显示5个八度 (C2-B6)
const WHITE_KEY_WIDTH = 50
const BLACK_KEY_WIDTH = 32
const scrollLeft = ref(0)
const totalWidth = computed(() => numOctaves.value * 7 * WHITE_KEY_WIDTH)

interface KeyData {
  midi: number
  baseNote: string
  dotCount: number
  x: number
}

// 生成白键数据
const whiteKeys = computed<KeyData[]>(() => {
  const keys: KeyData[] = []
  const whiteNotes = [0, 2, 4, 5, 7, 9, 11]
  // 改为英文字母音名
  const baseNotes = ['C', 'D', 'E', 'F', 'G', 'A', 'B']
  
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

// 生成黑键数据
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

const onScroll = (e: any) => {
  scrollLeft.value = e.detail.scrollLeft
}

// 钢琴按键处理
const onKeyPress = (key: KeyData) => {
  pressedKeys.add(key.midi)
  AudioManager.playNote(key.midi, 0.8)
  uni.vibrateShort({})
}

const onKeyRelease = (key: KeyData) => {
  pressedKeys.delete(key.midi)
}

// 原有的 onLoad 和 onMounted 删除，保留顶部的实现
// loadHomework 替换为带错误处理的版本
const loadHomework = async () => {
  if (!homeworkId.value) return
  
  try {
    isLoading.value = true
    loadError.value = ''
    
    homework.value = await fetchHomeworkByIdAsync(homeworkId.value)
    
    if (homework.value) {
      // 获取乐谱图片
      if (homework.value.sheetImages && homework.value.sheetImages.length > 0) {
        try {
          sheetImages.value = await getSheetImagesAsync(homework.value)
        } catch (e) {
          console.error('转换失败:', e)
          loadError.value = '图片链接转换失败'
        }
      } else {
        loadError.value = '该作业没有乐谱图片'
      }
      
      // 获取示范音频 URL
      if (homework.value.demoAudioUrl) {
        try {
          demoAudioUrl.value = await getDemoAudioUrlAsync(homework.value)
        } catch (e) {
          console.error('获取示范音频失败:', e)
        }
      }
    } else {
      loadError.value = '未找到作业数据'
    }
  } catch (err: any) {
    console.error('加载异常:', err)
    loadError.value = err.message || '加载异常'
  } finally {
    isLoading.value = false
  }
}

const goBack = () => {
  uni.navigateBack()
}

// 示范音频播放
const toggleDemo = () => {
  if (!demoAudioUrl.value) return
  
  if (isDemoPlaying.value) {
    // 暂停
    demoAudio?.pause()
    isDemoPlaying.value = false
  } else {
    // 播放
    if (!demoAudio) {
      demoAudio = uni.createInnerAudioContext()
      demoAudio.src = demoAudioUrl.value
      demoAudio.playbackRate = currentSpeed.value
      
      // 监听进度更新
      demoAudio.onTimeUpdate(() => {
        if (demoAudio) {
          demoCurrentTime.value = demoAudio.currentTime || 0
          demoDuration.value = demoAudio.duration || 0
          if (demoDuration.value > 0) {
            demoProgress.value = (demoCurrentTime.value / demoDuration.value) * 100
          }
        }
      })
      
      demoAudio.onEnded(() => {
        isDemoPlaying.value = false
        demoProgress.value = 0
        demoCurrentTime.value = 0
      })
      
      demoAudio.onError((err) => {
        console.error('示范音频播放错误:', err)
        isDemoPlaying.value = false
        uni.showToast({ title: '播放失败', icon: 'none' })
      })
    }
    
    demoAudio.play()
    isDemoPlaying.value = true
  }
}

// 格式化示范音频时间
const formatDemoTime = (seconds: number) => {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

// 进度条拖动控制
let isDragging = false
let progressBarWidth = 60 // 进度条宽度 px

const onProgressTouchStart = (e: any) => {
  isDragging = true
  updateProgressFromTouch(e)
}

const onProgressTouchMove = (e: any) => {
  if (isDragging) {
    updateProgressFromTouch(e)
  }
}

const onProgressTouchEnd = () => {
  isDragging = false
}

const updateProgressFromTouch = (e: any) => {
  if (!demoAudio || demoDuration.value <= 0) return
  
  const touch = e.touches[0]
  const rect = e.currentTarget.getBoundingClientRect?.() || { left: 0, width: progressBarWidth }
  const barLeft = rect.left || 0
  const barWidth = rect.width || progressBarWidth
  
  let x = touch.clientX - barLeft
  x = Math.max(0, Math.min(x, barWidth))
  
  const percent = x / barWidth
  const newTime = percent * demoDuration.value
  
  demoAudio.seek(newTime)
  demoCurrentTime.value = newTime
  demoProgress.value = percent * 100
}

// 切换播放速度
const speeds = [0.75, 1, 1.25]
const cycleSpeed = () => {
  const currentIndex = speeds.indexOf(currentSpeed.value)
  const nextIndex = (currentIndex + 1) % speeds.length
  currentSpeed.value = speeds[nextIndex]
  
  // 如果正在播放，立即应用新速度
  if (demoAudio) {
    demoAudio.playbackRate = currentSpeed.value
  }
  
  uni.showToast({ 
    title: `速度: ${currentSpeed.value}x`, 
    icon: 'none',
    duration: 1000
  })
}

// 录音功能
const isUploading = ref(false)

const toggleRecording = async () => {
  if (isRecording.value) {
    // 停止录音并上传
    isRecording.value = false
    clearInterval(recordingTimer)
    
    if (homeworkId.value) {
      // 有作业ID时，停止并上传到云存储
      isUploading.value = true
      uni.showLoading({ title: '正在上传...' })
      
      try {
        const recording = await RecorderService.stopAndUpload(homeworkId.value)
        uni.hideLoading()
        isUploading.value = false
        uni.showToast({ title: '录音已保存到云端', icon: 'success' })
        
        // 更新作业进度
        updateHomeworkRecording(homeworkId.value, recording.cloudFileId || recording.voicePath)
      } catch (error) {
        uni.hideLoading()
        isUploading.value = false
        console.error('上传失败:', error)
        uni.showToast({ title: '上传失败，已保存本地', icon: 'none' })
      }
    } else {
      // 无作业ID时，仅保存本地
      RecorderService.stop()
      uni.showToast({ title: '录音已保存', icon: 'success' })
    }
  } else {
    startRecording()
  }
}

// 更新作业进度中的录音记录
const updateHomeworkRecording = (hwId: string, recordingPath: string) => {
  const progress = getHomeworkProgress(hwId) || {
    homeworkId: hwId,
    completed: false,
    practiceCount: 0,
    recordings: []
  }
  progress.recordings.push(recordingPath)
  progress.lastPracticeAt = new Date().toISOString()
  saveHomeworkProgress(progress)
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


const setSpeed = (speed: number) => {
  currentSpeed.value = speed
  if (demoAudio) {
    demoAudio.playbackRate = speed
  }
}

// 乐谱翻页
const onSheetChange = (e: any) => {
  currentSheetPage.value = e.detail.current
}

const prevPage = () => {
  if (currentSheetPage.value > 0) {
    currentSheetPage.value--
  }
}

const nextPage = () => {
  if (currentSheetPage.value < sheetImages.value.length - 1) {
    currentSheetPage.value++
  }
}

// 乐谱预览
const previewSheet = (index: number = 0) => {
  if (sheetImages.value.length > 0) {
    uni.previewImage({
      urls: sheetImages.value,
      current: sheetImages.value[index]
    })
  }
}

// 图片加载失败
const onImageError = (e: any) => {
  console.error('乐谱加载失败:', e)
}

// 图片加载成功
const onImageLoad = (e: any) => {
  console.log('乐谱加载成功:', e.detail)
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

/* 顶部控制栏 (15%) */
.top-bar {
  height: 15vh;
  flex-shrink: 0;
  display: flex;
  align-items: center; /* 垂直居中，上下都有留空 */
  justify-content: space-between;
  padding: 0 24rpx;
  background: var(--bg-dark);
  border-bottom: 1px solid rgba(255,255,255,0.1);
  z-index: 100;
  box-sizing: border-box;
}

/* 左侧内容区 */
.top-bar-left {
  display: flex;
  align-items: center;
  gap: 12rpx;
}

/* 右侧留空给微信胶囊 */
.top-bar-right {
  width: 180rpx;
}

/* 顶部控制按钮通用样式 - 与微信胶囊一致 */
.control-btn {
  height: 32px;
  padding: 0 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0,0,0,0.15);
  border: 0.5px solid rgba(255,255,255,0.25);
  border-radius: 16px;
  color: #fff;
  font-size: 13px;
  gap: 3px;
}

/* 返回按钮 */
.control-btn.back-btn {
  width: 32px;
  padding: 0;
  font-size: 16px;
}

/* 录音按钮 */
.control-btn.record-btn {
  min-width: 50px;
}

.control-btn.record-btn.recording {
  background: rgba(239, 68, 68, 0.3);
  border-color: rgba(239, 68, 68, 0.5);
}

/* 录音红点 */
.record-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #ef4444;
}

.record-dot.pulse { animation: pulse 1s infinite; }

/* 播放进度条 */
.demo-progress {
  display: flex;
  align-items: center;
  gap: 6px;
  height: 32px;
  padding: 0 8px;
  background: rgba(0,0,0,0.15);
  border: 0.5px solid rgba(255,255,255,0.25);
  border-radius: 16px;
}

.progress-bar {
  position: relative;
  width: 60px;
  height: 16px;
  display: flex;
  align-items: center;
  background: transparent;
}

.progress-bar::before {
  content: '';
  position: absolute;
  left: 0;
  top: 50%;
  transform: translateY(-50%);
  width: 100%;
  height: 4px;
  background: rgba(255,255,255,0.3);
  border-radius: 2px;
}

.progress-fill {
  position: absolute;
  left: 0;
  top: 50%;
  transform: translateY(-50%);
  height: 4px;
  background: #22c55e;
  border-radius: 2px;
  pointer-events: none;
}

.progress-thumb {
  position: absolute;
  top: 50%;
  transform: translate(-50%, -50%);
  width: 10px;
  height: 10px;
  background: #fff;
  border-radius: 50%;
  box-shadow: 0 1px 3px rgba(0,0,0,0.3);
}

.progress-time {
  color: #fff;
  font-size: 11px;
  min-width: 28px;
}

/* 示范按钮 */
.control-btn.demo-btn {
  min-width: 50px;
}

.control-btn.demo-btn.playing {
  background: rgba(34, 197, 94, 0.3);
  border-color: rgba(34, 197, 94, 0.5);
}

/* 速度按钮 */
.control-btn.speed-btn {
  min-width: 36px;
}

/* 作业标题 */
.homework-title {
  font-size: 24rpx;
  font-weight: 600;
  color: #fff;
  max-width: 180rpx;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* 控制栏按钮样式 */
.capsule-btn {
  height: 60rpx;
  border-radius: 30rpx;
  background: rgba(255,255,255,0.1);
  border-radius: 16rpx;
  font-size: 16rpx;
  color: #fff;
  border: 1px solid rgba(255,255,255,0.15);
  flex-shrink: 0;
}

.back-btn {
  width: 32rpx;
  padding: 0;
  font-size: 18rpx;
}

.homework-title {
  font-size: 18rpx;
  font-weight: 600;
  color: #fff;
  white-space: nowrap;
}

.record-btn {
  min-width: 70rpx;
}

.record-btn.recording {
  background: rgba(239, 68, 68, 0.3);
  border-color: #ef4444;
}

.record-dot {
  width: 10rpx;
  height: 10rpx;
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
  gap: 6rpx;
}

.play-btn {
  width: 32rpx;
  padding: 0;
  font-size: 16rpx;
}

.speed-selector {
  display: flex;
  background: rgba(255,255,255,0.05);
  border-radius: 10rpx;
  overflow: hidden;
}

.speed-btn {
  padding: 4rpx 8rpx;
  font-size: 14rpx;
  color: var(--text-muted);
}

.speed-btn.active {
  background: var(--divine-gold);
  color: var(--divine-blue);
  font-weight: 600;
}

/* 看谱区 (40%) */
.sheet-area {
  height: 40vh;
  background: #fff;
  position: relative;
  overflow: hidden;
  flex-shrink: 0;
  min-height: 0;
}

/* ... sheet 相关的样式保持不变 ... */

.sheet-swiper {
  width: 100%;
  height: 100%;
}

.sheet-swiper swiper-item {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.sheet-image {
  width: 100%;
  height: 100%;
  display: block;
}

.page-indicator {
  position: absolute;
  top: 8rpx;
  right: 12rpx;
  background: rgba(0,0,0,0.4);
  color: #fff;
  padding: 2rpx 8rpx;
  border-radius: 6rpx;
  font-size: 16rpx;
}

.sheet-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: rgba(0,0,0,0.03);
}

.placeholder-icon {
  font-size: 80rpx;
  margin-bottom: 16rpx;
}

.placeholder-text {
  font-size: 28rpx;
  color: var(--text-muted);
}

/* 钢琴区 (45%) */
.piano-area {
  height: 45vh;
  flex-shrink: 0;
  width: 100%;
  background: #000;
  position: relative;
  border-top: 1px solid rgba(255,255,255,0.1);
  z-index: 10;
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
  padding-top: 24rpx;
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
  background: var(--key-white, #ffffff);
  border-radius: 0 0 12rpx 12rpx;
  box-shadow: inset 0 0 0 1px rgba(0,0,0,0.1), 0 4rpx 0 #bbb, inset 0 -8rpx 12rpx rgba(0,0,0,0.1);
  box-sizing: border-box;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  z-index: 1;
  transform-origin: top center;
  transition: background 0.1s, transform 0.05s;
}

.white-key.pressed {
  background: var(--key-white-pressed, #e8e8e8);
  box-shadow: inset 0 0 0 1px rgba(0,0,0,0.1), 0 1rpx 0 #bbb, inset 0 -4rpx 20rpx rgba(0,0,0,0.2);
  transform: translateY(2rpx);
}

/* 钢琴琴键标签位置修正 */
.white-key .key-label {
  position: absolute;
  bottom: 36rpx;
  left: 0;
  right: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-end;
  pointer-events: none;
  z-index: 5;
}

.white-key .notation {
  font-size: 18rpx;
  font-weight: 500;
  color: #999;
}

/* 黑键 */
.black-key {
  position: absolute;
  top: 0;
  height: 60%;
  background: var(--key-black, #2a2a2a);
  border-radius: 0 0 8rpx 8rpx;
  box-shadow: 0 4rpx 8rpx rgba(0,0,0,0.5), 0 6rpx 0 #000, inset 2rpx -2rpx 4rpx rgba(255,255,255,0.1);
  display: flex;
  justify-content: center;
  z-index: 10;
  transform-origin: top center;
}

.black-key.pressed {
  box-shadow: 0 2rpx 4rpx rgba(0,0,0,0.5), 0 2rpx 0 #000, inset 1rpx -1rpx 2rpx rgba(255,255,255,0.1);
  transform: translateY(2rpx);
}

.key-highlight {
  position: absolute;
  top: 8rpx;
  left: 8rpx;
  right: 8rpx;
  height: 30rpx;
  background: linear-gradient(180deg, rgba(255,255,255,0.15) 0%, transparent 100%);
  border-radius: 4rpx;
}
</style>
