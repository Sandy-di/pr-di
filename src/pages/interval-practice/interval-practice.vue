<template>
  <view class="practice-page">
    <!-- 导航栏 -->
    <view class="navbar" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="nav-back" @click="goBack"><text>←</text></view>
      <text class="nav-title">🎵 音程听辨</text>
      <text class="nav-progress">{{ currentQuestion }}/{{ totalQuestions }}</text>
    </view>

    <!-- 主内容 -->
    <view class="content" v-if="!showResult">
      <!-- 播放区域 -->
      <view class="play-area">
        <view class="play-btn" :class="{ playing: isPlaying }" @click="playInterval">
          <text class="play-icon">{{ isPlaying ? '🔊' : '▶️' }}</text>
          <text class="play-text">{{ isPlaying ? '播放中...' : '点击听音程' }}</text>
        </view>
        <text class="hint" v-if="hasPlayed && !answered">请选择你听到的音程</text>
      </view>

      <!-- 选项区域 -->
      <view class="options-grid">
        <view 
          v-for="interval in intervals" 
          :key="interval.id"
          class="option-btn"
          :class="{
            selected: selectedAnswer === interval.id,
            correct: answered && interval.id === correctAnswer,
            wrong: answered && selectedAnswer === interval.id && interval.id !== correctAnswer,
            disabled: !hasPlayed
          }"
          @click="selectAnswer(interval.id)"
        >
          <text class="option-name">{{ interval.name }}</text>
        </view>
      </view>

      <!-- 反馈区域 -->
      <view class="feedback" v-if="answered">
        <view class="feedback-icon">{{ isCorrect ? '✅' : '❌' }}</view>
        <text class="feedback-text">
          {{ isCorrect ? '回答正确！' : `正确答案: ${getIntervalName(correctAnswer)}` }}
        </text>
      </view>

      <!-- 下一题按钮 -->
      <view class="next-btn-wrapper" v-if="answered">
        <view class="next-btn" @click="nextQuestion">
          <text>{{ currentQuestion < totalQuestions ? '下一题 →' : '查看结果' }}</text>
        </view>
      </view>
    </view>

    <!-- 结果页面 -->
    <view class="result-page" v-else>
      <view class="result-card">
        <text class="result-title">🎉 练习完成</text>
        <view class="result-stats">
          <view class="stat">
            <text class="stat-value">{{ correctCount }}/{{ totalQuestions }}</text>
            <text class="stat-label">正确题数</text>
          </view>
          <view class="stat">
            <text class="stat-value">{{ Math.round(correctCount / totalQuestions * 100) }}%</text>
            <text class="stat-label">正确率</text>
          </view>
        </view>
        <view class="result-actions">
          <view class="action-btn primary" @click="restartPractice">再练一次</view>
          <view class="action-btn" @click="goBack">返回</view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import AudioManager from '@/utils/audio-manager'

const statusBarHeight = ref(20)

// 音程数据
const intervals = [
  { id: 'm2', name: '小二度', semitones: 1 },
  { id: 'M2', name: '大二度', semitones: 2 },
  { id: 'm3', name: '小三度', semitones: 3 },
  { id: 'M3', name: '大三度', semitones: 4 },
  { id: 'P4', name: '纯四度', semitones: 5 },
  { id: 'P5', name: '纯五度', semitones: 7 },
]

// 练习状态
const totalQuestions = ref(10)
const currentQuestion = ref(1)
const correctCount = ref(0)
const showResult = ref(false)

// 当前题目状态
const correctAnswer = ref('')
const baseMidi = ref(60)
const selectedAnswer = ref('')
const answered = ref(false)
const hasPlayed = ref(false)
const isPlaying = ref(false)
const isCorrect = ref(false)

onMounted(async () => {
  const systemInfo = uni.getSystemInfoSync()
  statusBarHeight.value = systemInfo.statusBarHeight || 20
  await AudioManager.init()
  generateQuestion()
})

// 生成新题目
const generateQuestion = () => {
  const randomIndex = Math.floor(Math.random() * intervals.length)
  correctAnswer.value = intervals[randomIndex].id
  baseMidi.value = 48 + Math.floor(Math.random() * 24) // C3-B4 范围
  
  selectedAnswer.value = ''
  answered.value = false
  hasPlayed.value = false
  isCorrect.value = false
}

// 播放音程
const playInterval = async () => {
  if (isPlaying.value) return
  
  isPlaying.value = true
  hasPlayed.value = true
  
  const interval = intervals.find(i => i.id === correctAnswer.value)
  if (!interval) return
  
  // 播放第一个音
  AudioManager.playNote(baseMidi.value, 0.8, 0)
  
  // 延迟后播放第二个音
  setTimeout(() => {
    AudioManager.playNote(baseMidi.value + interval.semitones, 0.8, 0)
    setTimeout(() => {
      isPlaying.value = false
    }, 500)
  }, 600)
}

// 选择答案
const selectAnswer = (id: string) => {
  if (!hasPlayed.value || answered.value) return
  
  selectedAnswer.value = id
  answered.value = true
  isCorrect.value = id === correctAnswer.value
  
  if (isCorrect.value) {
    correctCount.value++
  }
  
  // 保存练习记录
  savePracticeRecord()
}

// 保存练习记录
const savePracticeRecord = () => {
  try {
    const stats = uni.getStorageSync('statistics') || {
      totalPractices: 0,
      correctCount: 0,
      streakDays: 0
    }
    stats.totalPractices++
    if (isCorrect.value) stats.correctCount++
    uni.setStorageSync('statistics', stats)
  } catch (e) {
    console.error('保存记录失败', e)
  }
}

// 下一题
const nextQuestion = () => {
  if (currentQuestion.value >= totalQuestions.value) {
    showResult.value = true
  } else {
    currentQuestion.value++
    generateQuestion()
  }
}

// 获取音程名称
const getIntervalName = (id: string) => {
  return intervals.find(i => i.id === id)?.name || ''
}

// 重新开始
const restartPractice = () => {
  currentQuestion.value = 1
  correctCount.value = 0
  showResult.value = false
  generateQuestion()
}

// 返回
const goBack = () => {
  uni.navigateBack()
}
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

.nav-progress {
  font-size: 28rpx;
  color: #667eea;
  font-weight: 600;
}

.content {
  padding: 40rpx 32rpx;
}

/* 播放区域 */
.play-area {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 60rpx;
}

.play-btn {
  width: 240rpx;
  height: 240rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 50%;
  box-shadow: 0 8rpx 30rpx rgba(102, 126, 234, 0.4);
}

.play-btn.playing {
  animation: pulse 1s infinite;
}

@keyframes pulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.05); }
}

.play-icon {
  font-size: 72rpx;
}

.play-text {
  font-size: 24rpx;
  color: #fff;
  margin-top: 12rpx;
}

.hint {
  font-size: 28rpx;
  color: #b0b0c0;
  margin-top: 40rpx;
}

/* 选项区域 */
.options-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 24rpx;
  margin-bottom: 40rpx;
}

.option-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 32rpx 16rpx;
  background: #1a1a2e;
  border: 2rpx solid rgba(255,255,255,0.1);
  border-radius: 16rpx;
  transition: all 0.2s;
}

.option-btn.disabled {
  opacity: 0.5;
}

.option-btn.selected {
  border-color: #667eea;
  background: rgba(102, 126, 234, 0.2);
}

.option-btn.correct {
  border-color: #22c55e;
  background: rgba(34, 197, 94, 0.2);
}

.option-btn.wrong {
  border-color: #ef4444;
  background: rgba(239, 68, 68, 0.2);
}

.option-name {
  font-size: 28rpx;
  color: #fff;
  font-weight: 500;
}

/* 反馈区域 */
.feedback {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin: 40rpx 0;
}

.feedback-icon {
  font-size: 80rpx;
  margin-bottom: 16rpx;
}

.feedback-text {
  font-size: 32rpx;
  color: #fff;
}

/* 下一题按钮 */
.next-btn-wrapper {
  padding: 40rpx 0;
}

.next-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 32rpx;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 16rpx;
}

.next-btn text {
  font-size: 32rpx;
  color: #fff;
  font-weight: 600;
}

/* 结果页面 */
.result-page {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: calc(100vh - 200rpx);
  padding: 40rpx;
}

.result-card {
  width: 100%;
  background: #1a1a2e;
  border-radius: 32rpx;
  padding: 60rpx 40rpx;
  text-align: center;
}

.result-title {
  font-size: 48rpx;
  font-weight: 700;
  color: #fff;
  margin-bottom: 40rpx;
}

.result-stats {
  display: flex;
  justify-content: center;
  gap: 80rpx;
  margin-bottom: 60rpx;
}

.stat {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.stat-value {
  font-size: 56rpx;
  font-weight: 700;
  color: #667eea;
}

.stat-label {
  font-size: 26rpx;
  color: #b0b0c0;
  margin-top: 8rpx;
}

.result-actions {
  display: flex;
  flex-direction: column;
  gap: 24rpx;
}

.action-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 32rpx;
  background: rgba(255,255,255,0.1);
  border-radius: 16rpx;
  font-size: 32rpx;
  color: #fff;
}

.action-btn.primary {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}
</style>
