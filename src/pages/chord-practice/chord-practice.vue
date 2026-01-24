<template>
  <view class="practice-page">
    <!-- 导航栏 -->
    <view class="navbar" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="nav-back" @click="goBack"><text>←</text></view>
      <text class="nav-title">🎶 和弦听辨</text>
      <text class="nav-progress">{{ currentQuestion }}/{{ totalQuestions }}</text>
    </view>

    <!-- 主内容 -->
    <view class="content" v-if="!showResult">
      <!-- 播放区域 -->
      <view class="play-area">
        <view class="play-btn" :class="{ playing: isPlaying }" @click="playChord">
          <text class="play-icon">{{ isPlaying ? '🔊' : '▶️' }}</text>
          <text class="play-text">{{ isPlaying ? '播放中...' : '点击听和弦' }}</text>
        </view>
        <view class="play-modes">
          <view 
            class="mode-btn" 
            :class="{ active: playMode === 'together' }"
            @click="setPlayMode('together')"
          >
            <text>同时</text>
          </view>
          <view 
            class="mode-btn" 
            :class="{ active: playMode === 'arpeggio' }"
            @click="setPlayMode('arpeggio')"
          >
            <text>分解</text>
          </view>
        </view>
        <text class="hint" v-if="hasPlayed && !answered">请选择你听到的和弦类型</text>
      </view>

      <!-- 选项区域 -->
      <view class="options-grid">
        <view 
          v-for="chord in chords" 
          :key="chord.id"
          class="option-btn"
          :class="{
            selected: selectedAnswer === chord.id,
            correct: answered && chord.id === correctAnswer,
            wrong: answered && selectedAnswer === chord.id && chord.id !== correctAnswer,
            disabled: !hasPlayed
          }"
          @click="selectAnswer(chord.id)"
        >
          <text class="option-name">{{ chord.name }}</text>
          <text class="option-desc">{{ chord.desc }}</text>
        </view>
      </view>

      <!-- 反馈区域 -->
      <view class="feedback" v-if="answered">
        <view class="feedback-icon">{{ isCorrect ? '✅' : '❌' }}</view>
        <text class="feedback-text">
          {{ isCorrect ? '回答正确！' : `正确答案: ${getChordName(correctAnswer)}` }}
        </text>
        <view class="chord-notes" v-if="!isCorrect">
          <text>和弦构成: {{ getChordNotes(correctAnswer) }}</text>
        </view>
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
import { onShareAppMessage } from '@dcloudio/uni-app'
import AudioManager from '@/utils/audio-manager'

// 分享
onShareAppMessage(() => ({
  title: '🎶 和弦听辨练习 - 训练你的和声听力',
  path: '/pages/chord-practice/chord-practice'
}))

const statusBarHeight = ref(20)

// 和弦数据
const chords = [
  { id: 'major', name: '大三和弦', desc: '明亮', intervals: [0, 4, 7] },
  { id: 'minor', name: '小三和弦', desc: '柔和', intervals: [0, 3, 7] },
  { id: 'dim', name: '减三和弦', desc: '紧张', intervals: [0, 3, 6] },
  { id: 'aug', name: '增三和弦', desc: '扩张', intervals: [0, 4, 8] },
  { id: 'sus4', name: '挂四和弦', desc: '悬浮', intervals: [0, 5, 7] },
  { id: 'sus2', name: '挂二和弦', desc: '空灵', intervals: [0, 2, 7] },
]

// 练习状态
const totalQuestions = ref(10)
const currentQuestion = ref(1)
const correctCount = ref(0)
const showResult = ref(false)

// 当前题目状态
const correctAnswer = ref('')
const baseNote = ref(60)
const selectedAnswer = ref('')
const answered = ref(false)
const hasPlayed = ref(false)
const isPlaying = ref(false)
const isCorrect = ref(false)
const playMode = ref<'together' | 'arpeggio'>('together')

onMounted(async () => {
  const windowInfo = uni.getWindowInfo()
  statusBarHeight.value = windowInfo.statusBarHeight || 20
  await AudioManager.init()
  generateQuestion()
})

// 生成新题目
const generateQuestion = () => {
  const randomIndex = Math.floor(Math.random() * chords.length)
  correctAnswer.value = chords[randomIndex].id
  baseNote.value = 48 + Math.floor(Math.random() * 12) // C3-B3 范围
  
  selectedAnswer.value = ''
  answered.value = false
  hasPlayed.value = false
  isCorrect.value = false
}

// 播放和弦
const playChord = async () => {
  if (isPlaying.value) return
  
  isPlaying.value = true
  hasPlayed.value = true
  
  const chord = chords.find(c => c.id === correctAnswer.value)
  if (!chord) return
  
  const notes = chord.intervals.map(interval => baseNote.value + interval)
  
  if (playMode.value === 'together') {
    // 同时播放 - 设置固定时长
    notes.forEach(note => {
      AudioManager.playNote(note, 0.7, 0.8)
    })
    setTimeout(() => {
      isPlaying.value = false
    }, 800)
  } else {
    // 分解播放
    for (let i = 0; i < notes.length; i++) {
      AudioManager.playNote(notes[i], 0.7, 0.5)
      await new Promise(resolve => setTimeout(resolve, 300))
    }
    // 最后同时播放一次
    await new Promise(resolve => setTimeout(resolve, 200))
    notes.forEach(note => {
      AudioManager.playNote(note, 0.7, 0.8)
    })
    setTimeout(() => {
      isPlaying.value = false
    }, 600)
  }
}

// 设置播放模式
const setPlayMode = (mode: 'together' | 'arpeggio') => {
  playMode.value = mode
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
  try {
    const stats = uni.getStorageSync('statistics') || { totalPractices: 0, correctCount: 0 }
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

// 获取和弦名称
const getChordName = (id: string) => {
  return chords.find(c => c.id === id)?.name || ''
}

// 获取和弦音符
const getChordNotes = (id: string) => {
  const chord = chords.find(c => c.id === id)
  if (!chord) return ''
  const noteNames = ['1', '#1', '2', '#2', '3', '4', '#4', '5', '#5', '6', '#6', '7']
  return chord.intervals.map(i => noteNames[i % 12]).join(' - ')
}

// 重新开始
const restartPractice = () => {
  currentQuestion.value = 1
  correctCount.value = 0
  showResult.value = false
  generateQuestion()
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

.nav-progress {
  font-size: 28rpx;
  color: var(--neu-gold);
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
  margin-bottom: 48rpx;
}

.play-btn {
  width: 220rpx;
  height: 220rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, var(--divine-gold) 0%, var(--divine-gold-light) 100%);
  border-radius: 50%;
  box-shadow: 0 8rpx 30rpx rgba(212, 175, 55, 0.4);
  margin-bottom: 24rpx;
}

.play-btn.playing {
  animation: pulse 1s infinite;
}

@keyframes pulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.05); }
}

.play-icon {
  font-size: 64rpx;
}

.play-text {
  font-size: 22rpx;
  color: #fff;
  margin-top: 8rpx;
}

.play-modes {
  display: flex;
  gap: 16rpx;
  margin-bottom: 24rpx;
}

.mode-btn {
  padding: 12rpx 32rpx;
  background: var(--bg-main);
  border-radius: 20rpx;
  box-shadow: var(--neu-shadow-light), var(--neu-shadow-dark);
}

.mode-btn.active {
  background: rgba(184, 134, 11, 0.3);
  box-shadow: var(--neu-shadow-inset-light), var(--neu-shadow-inset-dark);
}

.mode-btn text {
  font-size: 24rpx;
  color: var(--text-primary);
}

.hint {
  font-size: 28rpx;
  color: var(--text-muted);
}

/* 选项区域 */
.options-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 20rpx;
  margin-bottom: 40rpx;
}

.option-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 28rpx 16rpx;
  background: var(--bg-main);
  border-radius: 16rpx;
  transition: all 0.2s;
  box-shadow: var(--neu-shadow-light), var(--neu-shadow-dark);
}

.option-btn.disabled {
  opacity: 0.5;
}

.option-btn.selected {
  background: rgba(184, 134, 11, 0.2);
  box-shadow: var(--neu-shadow-inset-light), var(--neu-shadow-inset-dark);
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
  color: var(--text-primary);
  font-weight: 600;
  margin-bottom: 4rpx;
}

.option-desc {
  font-size: 22rpx;
  color: var(--text-muted);
}

/* 反馈区域 */
.feedback {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin: 32rpx 0;
}

.feedback-icon {
  font-size: 72rpx;
  margin-bottom: 12rpx;
}

.feedback-text {
  font-size: 30rpx;
  color: var(--text-primary);
  margin-bottom: 12rpx;
}

.chord-notes {
  font-size: 24rpx;
  color: var(--text-muted);
}

/* 下一题按钮 */
.next-btn-wrapper {
  padding: 32rpx 0;
}

.next-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 32rpx;
  background: linear-gradient(135deg, var(--divine-gold) 0%, var(--divine-gold-light) 100%);
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
  background: var(--bg-main);
  border-radius: 32rpx;
  padding: 60rpx 40rpx;
  text-align: center;
  box-shadow: var(--neu-shadow-light), var(--neu-shadow-dark);
}

.result-title {
  font-size: 48rpx;
  font-weight: 700;
  color: var(--text-primary);
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
  color: var(--neu-gold);
}

.stat-label {
  font-size: 26rpx;
  color: var(--text-muted);
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
  background: var(--bg-main);
  border-radius: 16rpx;
  font-size: 32rpx;
  color: var(--text-primary);
  box-shadow: var(--neu-shadow-light), var(--neu-shadow-dark);
}

.action-btn.primary {
  background: linear-gradient(135deg, var(--divine-gold) 0%, var(--divine-gold-light) 100%);
}
</style>
