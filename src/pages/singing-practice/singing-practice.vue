<template>
  <view class="practice-page">
    <!-- 导航栏 -->
    <view class="navbar" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="nav-back" @click="goBack"><text>←</text></view>
      <text class="nav-title">🎤 跟唱模式</text>
      <text class="nav-score" v-if="currentScore > 0">{{ currentScore }}分</text>
    </view>

    <!-- 主内容 -->
    <view class="content">
      <!-- 当前题目 -->
      <view class="question-card">
        <text class="question-label">请听并跟唱以下音符</text>
        <view class="notes-display">
          <view 
            v-for="(note, index) in currentNotes" 
            :key="index"
            class="note-item"
            :class="{ 
              'played': index < playProgress,
              'current': index === playProgress && isPlaying
            }"
          >
            <view class="note-content">
              <view class="dots-above">
                 <text v-for="n in (getNoteDisplay(note).dotCount > 0 ? getNoteDisplay(note).dotCount : 0)" :key="n" class="dot">•</text>
              </view>
              <text class="note-text">{{ getNoteDisplay(note).base }}</text>
              <view class="dots-below">
                 <text v-for="n in (getNoteDisplay(note).dotCount < 0 ? Math.abs(getNoteDisplay(note).dotCount) : 0)" :key="n" class="dot">•</text>
              </view>
            </view>
          </view>
        </view>
      </view>

      <!-- 播放控制 -->
      <view class="play-section">
        <view class="play-btn" :class="{ playing: isPlaying }" @click="playNotes">
          <text class="play-icon">{{ isPlaying ? '🔊' : '▶️' }}</text>
          <text class="play-text">{{ isPlaying ? '播放中...' : '听范唱' }}</text>
        </view>
      </view>

      <!-- 录音区域 -->
      <view class="record-section">
        <view 
          class="record-btn" 
          :class="{ recording: isRecording }"
          @touchstart="startRecording"
          @touchend="stopRecording"
        >
          <text class="record-icon">🎤</text>
          <text class="record-text">{{ isRecording ? '松开结束' : '按住跟唱' }}</text>
        </view>
        <text class="record-hint" v-if="!hasRecorded">听完后按住按钮跟唱</text>
        <text class="record-hint success" v-else-if="currentScore >= 80">太棒了！继续加油！</text>
        <text class="record-hint" v-else>再试一次，你可以的！</text>
      </view>

      <!-- 进度和统计 -->
      <view class="progress-section">
        <view class="progress-bar">
          <view class="progress-fill" :style="{ width: `${(currentRound / totalRounds) * 100}%` }"></view>
        </view>
        <text class="progress-text">{{ currentRound }}/{{ totalRounds }}</text>
      </view>

      <!-- 难度选择 -->
      <view class="difficulty-section">
        <text class="section-label">难度</text>
        <view class="difficulty-btns">
          <view 
            v-for="d in difficulties" 
            :key="d.id"
            class="difficulty-btn"
            :class="{ active: difficulty === d.id }"
            @click="setDifficulty(d.id)"
          >
            <text>{{ d.name }}</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 结果弹窗 -->
    <view class="result-modal" v-if="showResult">
      <view class="result-content">
        <text class="result-title">🎉 练习完成</text>
        <view class="result-score">
          <text class="score-value">{{ averageScore }}</text>
          <text class="score-label">平均分</text>
        </view>
        <view class="result-stats">
          <view class="stat-item">
            <text class="stat-value">{{ totalRounds }}</text>
            <text class="stat-label">练习曲数</text>
          </view>
          <view class="stat-item">
            <text class="stat-value">{{ excellentCount }}</text>
            <text class="stat-label">优秀次数</text>
          </view>
        </view>
        <view class="result-actions">
          <view class="action-btn primary" @click="restartPractice">再来一轮</view>
          <view class="action-btn" @click="goBack">返回</view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { onShareAppMessage } from '@dcloudio/uni-app'
import AudioManager from '@/utils/audio-manager'

// 分享
onShareAppMessage(() => ({
  title: '🎤 跟唱练习 - 训练你的音准',
  path: '/pages/singing-practice/singing-practice'
}))

const statusBarHeight = ref(20)

// 难度配置
const difficulties = [
  { id: 'easy', name: '简单', noteCount: 3 },
  { id: 'medium', name: '中等', noteCount: 5 },
  { id: 'hard', name: '困难', noteCount: 7 }
]

const difficulty = ref('easy')
const totalRounds = ref(5)
const currentRound = ref(1)
const showResult = ref(false)

// 当前练习状态
const currentNotes = ref<number[]>([])
const isPlaying = ref(false)
const playProgress = ref(-1)
const isRecording = ref(false)
const hasRecorded = ref(false)
const currentScore = ref(0)
const scores = ref<number[]>([])

// 录音管理
let recorderManager: UniApp.RecorderManager | null = null

const averageScore = computed(() => {
  if (scores.value.length === 0) return 0
  return Math.round(scores.value.reduce((a, b) => a + b, 0) / scores.value.length)
})

const excellentCount = computed(() => {
  return scores.value.filter(s => s >= 80).length
})

onMounted(async () => {
  const windowInfo = uni.getWindowInfo()
  statusBarHeight.value = windowInfo.statusBarHeight || 20
  await AudioManager.init()
  
  // 初始化录音管理器
  recorderManager = uni.getRecorderManager()
  recorderManager.onStop((res) => {
    // 录音结束，模拟评分
    simulateScore()
  })
  
  generateNotes()
})

onUnmounted(() => {
  if (isRecording.value && recorderManager) {
    recorderManager.stop()
  }
})

// 生成随机音符序列
const generateNotes = () => {
  const diffConfig = difficulties.find(d => d.id === difficulty.value)
  const noteCount = diffConfig?.noteCount || 3
  
  const notes: number[] = []
  // C大调自然音阶 (C4-C5)
  // C4(60), D(62), E(64), F(65), G(67), A(69), B(71), C5(72)
  const scale = [0, 2, 4, 5, 7, 9, 11, 12] 
  const baseNote = 60 // C4
  
  for (let i = 0; i < noteCount; i++) {
    const scaleIndex = Math.floor(Math.random() * scale.length)
    notes.push(baseNote + scale[scaleIndex])
  }
  
  currentNotes.value = notes
  hasRecorded.value = false
  currentScore.value = 0
  playProgress.value = -1
}

// 播放音符序列
const playNotes = async () => {
  if (isPlaying.value) return
  
  isPlaying.value = true
  const interval = 600 // 每个音符间隔
  
  for (let i = 0; i < currentNotes.value.length; i++) {
    if (!isPlaying.value) break
    
    playProgress.value = i
    AudioManager.playNote(currentNotes.value[i], 0.8, 0.5)
    
    await new Promise(resolve => setTimeout(resolve, interval))
  }
  
  playProgress.value = -1
  isPlaying.value = false
}

// 开始录音
const startRecording = () => {
  if (isPlaying.value || !recorderManager) return
  
  uni.authorize({
    scope: 'scope.record',
    success: () => {
      isRecording.value = true
      recorderManager!.start({
        duration: 30000,
        sampleRate: 16000,
        numberOfChannels: 1,
        encodeBitRate: 128000,
        format: 'mp3'
      })
      uni.vibrateShort({})
    },
    fail: () => {
      uni.showModal({
        title: '需要录音权限',
        content: '请允许录音权限以使用跟唱功能',
        confirmText: '去设置',
        success: (res) => {
          if (res.confirm) uni.openSetting({})
        }
      })
    }
  })
}

// 停止录音
const stopRecording = () => {
  if (!isRecording.value || !recorderManager) return
  
  isRecording.value = false
  recorderManager.stop()
  uni.vibrateShort({})
}

// 模拟评分（实际应用中需要音频分析）
const simulateScore = () => {
  hasRecorded.value = true
  // 模拟一个随机分数（60-100之间）
  currentScore.value = Math.floor(Math.random() * 40) + 60
  scores.value.push(currentScore.value)
  
  // 保存统计
  try {
    const stats = uni.getStorageSync('statistics') || { totalPractices: 0, correctCount: 0 }
    stats.totalPractices++
    if (currentScore.value >= 80) stats.correctCount++
    uni.setStorageSync('statistics', stats)
  } catch (e) {
    console.error('保存统计失败', e)
  }
  
  // 检查是否完成所有轮次
  if (currentRound.value >= totalRounds.value) {
    setTimeout(() => {
      showResult.value = true
    }, 1000)
  }
}

// 下一题
const nextRound = () => {
  if (currentRound.value < totalRounds.value) {
    currentRound.value++
    generateNotes()
  }
}

// 获取音符显示
const getNoteDisplay = (midi: number) => {
  // 映射关系：相对于C的半音差 -> 简谱数字
  // 0->1, 2->2, 4->3, 5->4, 7->5, 9->6, 11->7
  const map: Record<number, string> = {
      0: '1', 1: '#1', 2: '2', 3: '#3', 4: '3', 5: '4', 6: '#4', 7: '5', 8: '#5', 9: '6', 10: '#6', 11: '7'
  }
  
  const relative = midi % 12
  const base = map[relative] || '?'
  
  // 计算八度 (相对于 C4=60)
  // 60-71: 0 (无点)
  // 72-83: 1 (上点)
  // 48-59: -1 (下点)
  const octave = Math.floor(midi / 12) - 5
  
  return { base, dotCount: octave }
}

// 设置难度
const setDifficulty = (d: string) => {
  difficulty.value = d
  generateNotes()
}

// 重新开始
const restartPractice = () => {
  currentRound.value = 1
  scores.value = []
  showResult.value = false
  generateNotes()
}

const goBack = () => uni.navigateBack()
</script>

<style scoped>
.practice-page {
  min-height: 100vh;
  background: var(--bg-main);
}

.navbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16rpx 32rpx;
  background: var(--bg-main);
}

.nav-back {
  width: 64rpx;
  height: 64rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-main);
  border-radius: 50%;
  color: var(--text-primary);
  font-size: 32rpx;
  box-shadow: var(--neu-shadow-light), var(--neu-shadow-dark);
}

.nav-title {
  font-size: 36rpx;
  font-weight: 600;
  color: var(--text-primary);
}

.nav-score {
  font-size: 28rpx;
  color: #22c55e;
  font-weight: 600;
}

.content {
  padding: 32rpx;
}

/* 题目卡片 */
.question-card {
  background: var(--bg-main);
  border-radius: 24rpx;
  padding: 40rpx;
  margin-bottom: 32rpx;
  text-align: center;
  box-shadow: var(--neu-shadow-light), var(--neu-shadow-dark);
}

.question-label {
  font-size: 28rpx;
  color: var(--text-muted);
  margin-bottom: 24rpx;
}

.notes-display {
  display: flex;
  justify-content: center;
  gap: 16rpx;
  flex-wrap: wrap;
}

.note-item {
  width: 80rpx;
  height: 100rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-main);
  border-radius: 16rpx;
  transition: all 0.3s;
  box-shadow: var(--neu-shadow-light), var(--neu-shadow-dark);
}

.note-item.played {
  background: rgba(34, 197, 94, 0.3);
  border: 2rpx solid #22c55e;
}

.note-item.current {
  background: linear-gradient(135deg, var(--divine-gold) 0%, var(--divine-gold-light) 100%);
  transform: scale(1.1);
}

.note-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.note-text {
  font-size: 36rpx;
  font-weight: 700;
  color: var(--text-primary);
  line-height: 1;
  margin: 4rpx 0;
}

.dots-above, .dots-below {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2rpx;
  height: 20rpx;
  justify-content: flex-end;
}

.dots-below {
  justify-content: flex-start;
}

.dot {
  font-size: 20rpx;
  color: var(--text-primary);
  line-height: 0.5;
}

/* 播放区域 */
.play-section {
  display: flex;
  justify-content: center;
  margin-bottom: 40rpx;
}

.play-btn {
  width: 200rpx;
  height: 200rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, var(--divine-gold) 0%, var(--divine-gold-light) 100%);
  border-radius: 50%;
  box-shadow: 0 8rpx 30rpx rgba(212, 175, 55, 0.4);
}

.play-btn.playing {
  animation: pulse 1s infinite;
}

@keyframes pulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.05); }
}

.play-icon {
  font-size: 56rpx;
}

.play-text {
  font-size: 22rpx;
  color: #fff;
  margin-top: 8rpx;
}

/* 录音区域 */
.record-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 40rpx;
}

.record-btn {
  width: 240rpx;
  height: 240rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: rgba(239, 68, 68, 0.2);
  border: 4rpx solid #ef4444;
  border-radius: 50%;
  transition: all 0.3s;
}

.record-btn.recording {
  background: #ef4444;
  transform: scale(1.1);
  box-shadow: 0 0 40rpx rgba(239, 68, 68, 0.6);
}

.record-icon {
  font-size: 64rpx;
}

.record-text {
  font-size: 24rpx;
  color: var(--text-primary);
  margin-top: 12rpx;
}

.record-hint {
  font-size: 26rpx;
  color: var(--text-muted);
  margin-top: 24rpx;
}

.record-hint.success {
  color: #22c55e;
}

/* 进度区域 */
.progress-section {
  display: flex;
  align-items: center;
  gap: 16rpx;
  margin-bottom: 32rpx;
}

.progress-bar {
  flex: 1;
  height: 8rpx;
  background: var(--bg-card-pressed);
  border-radius: 4rpx;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--divine-gold) 0%, var(--divine-gold-light) 100%);
  transition: width 0.3s;
}

.progress-text {
  font-size: 24rpx;
  color: var(--text-muted);
}

/* 难度选择 */
.difficulty-section {
  background: var(--bg-main);
  border-radius: 24rpx;
  padding: 24rpx;
  box-shadow: var(--neu-shadow-light), var(--neu-shadow-dark);
}

.section-label {
  font-size: 26rpx;
  color: var(--text-muted);
  margin-bottom: 16rpx;
}

.difficulty-btns {
  display: flex;
  gap: 16rpx;
}

.difficulty-btn {
  flex: 1;
  padding: 16rpx;
  background: var(--bg-main);
  border-radius: 12rpx;
  text-align: center;
  box-shadow: var(--neu-shadow-light), var(--neu-shadow-dark);
}

.difficulty-btn.active {
  background: rgba(184, 134, 11, 0.2);
  box-shadow: var(--neu-shadow-inset-light), var(--neu-shadow-inset-dark);
}

.difficulty-btn text {
  font-size: 26rpx;
  color: var(--text-primary);
}

/* 结果弹窗 */
.result-modal {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0,0,0,0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
}

.result-content {
  width: 600rpx;
  background: var(--bg-main);
  border-radius: 32rpx;
  padding: 48rpx;
  text-align: center;
  box-shadow: var(--neu-shadow-light), var(--neu-shadow-dark);
}

.result-title {
  font-size: 48rpx;
  font-weight: 700;
  color: var(--text-primary);
  margin-bottom: 32rpx;
}

.result-score {
  margin-bottom: 32rpx;
}

.score-value {
  font-size: 80rpx;
  font-weight: 700;
  color: var(--neu-gold);
}

.score-label {
  font-size: 26rpx;
  color: var(--text-muted);
  display: block;
}

.result-stats {
  display: flex;
  justify-content: center;
  gap: 60rpx;
  margin-bottom: 40rpx;
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.stat-value {
  font-size: 40rpx;
  font-weight: 700;
  color: var(--text-primary);
}

.stat-label {
  font-size: 24rpx;
  color: var(--text-muted);
}

.result-actions {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

.action-btn {
  padding: 28rpx;
  background: var(--bg-main);
  border-radius: 16rpx;
  font-size: 30rpx;
  color: var(--text-primary);
  box-shadow: var(--neu-shadow-light), var(--neu-shadow-dark);
}

.action-btn.primary {
  background: linear-gradient(135deg, var(--divine-gold) 0%, var(--divine-gold-light) 100%);
}
</style>
