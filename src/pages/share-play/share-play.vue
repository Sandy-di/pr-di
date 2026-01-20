<template>
  <view class="share-page">
    <!-- 加载中 -->
    <view v-if="loading" class="loading-state">
      <view class="loading-spinner"></view>
      <text class="loading-text">加载中...</text>
    </view>
    
    <!-- 错误状态 -->
    <view v-else-if="error" class="error-state">
      <text class="error-icon">😔</text>
      <text class="error-text">{{ error }}</text>
      <view class="error-btn" @click="goHome">返回首页</view>
    </view>
    
    <!-- 播放界面 -->
    <view v-else class="player-container">
      <view class="player-card glass">
        <!-- 音频可视化 -->
        <view class="audio-visual" :class="{ playing: isPlaying }">
          <view class="visual-ring ring-1"></view>
          <view class="visual-ring ring-2"></view>
          <view class="visual-ring ring-3"></view>
          <view class="play-btn" @click="togglePlay">
            <text class="play-icon">{{ isPlaying ? '⏸' : '▶' }}</text>
          </view>
        </view>
        
        <!-- 录音信息 -->
        <text class="recording-name">{{ shareData?.name }}</text>
        <text class="recording-info">
          时长 {{ formatDuration(shareData?.duration) }}
          <text v-if="shareData?.homeworkTitle"> · {{ shareData.homeworkTitle }}</text>
        </text>
        
        <!-- 进度条 -->
        <view class="progress-container">
          <slider 
            :value="progress"
            @change="seekTo"
            activeColor="var(--accent-cyan)"
            backgroundColor="rgba(255,255,255,0.1)"
            block-size="12"
            block-color="var(--accent-cyan)"
          />
          <view class="time-info">
            <text>{{ formatDuration(currentTime) }}</text>
            <text>{{ formatDuration(shareData?.duration) }}</text>
          </view>
        </view>
        
        <!-- 播放次数 -->
        <text class="view-count">已播放 {{ shareData?.viewCount || 1 }} 次</text>
      </view>
      
      <!-- 底部按钮 -->
      <view class="bottom-actions">
        <view class="action-btn" @click="goHome">
          <text>打开小程序</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { request } from '@/utils/api-client'

interface SharedRecording {
  shareId: string
  name: string
  audioUrl: string
  duration: number
  homeworkTitle?: string
  viewCount: number
}

const loading = ref(true)
const error = ref('')
const shareData = ref<SharedRecording | null>(null)
const isPlaying = ref(false)
const currentTime = ref(0)
const progress = ref(0)

let audioContext: UniApp.InnerAudioContext | null = null
let progressTimer: any = null

onLoad((options: any) => {
  if (options?.id) {
    loadShareData(options.id)
  } else {
    error.value = '分享链接无效'
    loading.value = false
  }
})

onUnmounted(() => {
  stopAudio()
})

const loadShareData = async (shareId: string) => {
  try {
    const data = await request<SharedRecording>(`/share/${shareId}`)
    shareData.value = data
    loading.value = false
  } catch (e) {
    error.value = '该分享不存在或已过期'
    loading.value = false
  }
}

const togglePlay = () => {
  if (isPlaying.value) {
    pauseAudio()
  } else {
    playAudio()
  }
}

const playAudio = () => {
  if (!shareData.value) return
  
  if (!audioContext) {
    audioContext = uni.createInnerAudioContext()
    audioContext.src = shareData.value.audioUrl
    
    audioContext.onPlay(() => {
      isPlaying.value = true
      startProgressTimer()
    })
    
    audioContext.onPause(() => {
      isPlaying.value = false
      stopProgressTimer()
    })
    
    audioContext.onEnded(() => {
      isPlaying.value = false
      currentTime.value = 0
      progress.value = 0
      stopProgressTimer()
    })
    
    audioContext.onError((err) => {
      console.error('播放错误:', err)
      isPlaying.value = false
      uni.showToast({ title: '播放失败', icon: 'error' })
    })
  }
  
  audioContext.play()
}

const pauseAudio = () => {
  audioContext?.pause()
}

const stopAudio = () => {
  if (audioContext) {
    audioContext.stop()
    audioContext.destroy()
    audioContext = null
  }
  stopProgressTimer()
}

const startProgressTimer = () => {
  progressTimer = setInterval(() => {
    if (audioContext && shareData.value) {
      currentTime.value = audioContext.currentTime * 1000
      progress.value = (currentTime.value / shareData.value.duration) * 100
    }
  }, 100)
}

const stopProgressTimer = () => {
  if (progressTimer) {
    clearInterval(progressTimer)
    progressTimer = null
  }
}

const seekTo = (e: any) => {
  if (!audioContext || !shareData.value) return
  const percent = e.detail.value / 100
  audioContext.seek(percent * shareData.value.duration / 1000)
}

const formatDuration = (ms: number | undefined): string => {
  if (!ms || isNaN(ms)) return '0:00'
  const seconds = Math.floor(ms / 1000)
  const minutes = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${minutes}:${secs.toString().padStart(2, '0')}`
}

const goHome = () => {
  uni.switchTab({ url: '/pages/index/index' })
}
</script>

<style scoped>
.share-page {
  min-height: 100vh;
  background: var(--bg-dark);
  background-image: 
    radial-gradient(circle at 30% 20%, rgba(6, 182, 212, 0.15) 0%, transparent 50%),
    radial-gradient(circle at 70% 80%, rgba(59, 130, 246, 0.1) 0%, transparent 50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40rpx;
}

.loading-state, .error-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 24rpx;
}

.loading-spinner {
  width: 60rpx;
  height: 60rpx;
  border: 4rpx solid rgba(255,255,255,0.1);
  border-top-color: var(--accent-cyan);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.loading-text, .error-text {
  color: var(--text-muted);
  font-size: 28rpx;
}

.error-icon {
  font-size: 80rpx;
}

.error-btn {
  margin-top: 32rpx;
  padding: 20rpx 48rpx;
  background: var(--primary-gradient);
  border-radius: 100rpx;
  color: #fff;
  font-weight: 600;
}

.player-container {
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.player-card {
  width: 100%;
  padding: 60rpx 40rpx;
  border-radius: var(--radius-xl);
  background: rgba(26, 26, 46, 0.6);
  border: 1px solid rgba(255,255,255,0.1);
  display: flex;
  flex-direction: column;
  align-items: center;
}

.audio-visual {
  position: relative;
  width: 200rpx;
  height: 200rpx;
  margin-bottom: 48rpx;
}

.visual-ring {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  border-radius: 50%;
  border: 2rpx solid rgba(6, 182, 212, 0.2);
}

.ring-1 { width: 100%; height: 100%; }
.ring-2 { width: 140%; height: 140%; opacity: 0.6; }
.ring-3 { width: 180%; height: 180%; opacity: 0.3; }

.audio-visual.playing .visual-ring {
  animation: pulse 2s ease-in-out infinite;
}

.ring-2 { animation-delay: 0.3s; }
.ring-3 { animation-delay: 0.6s; }

@keyframes pulse {
  0%, 100% { transform: translate(-50%, -50%) scale(1); opacity: 0.3; }
  50% { transform: translate(-50%, -50%) scale(1.1); opacity: 0.6; }
}

.play-btn {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 120rpx;
  height: 120rpx;
  background: var(--primary-gradient);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 8rpx 32rpx rgba(212, 175, 55, 0.4);
}

.play-icon {
  font-size: 48rpx;
  color: #fff;
  margin-left: 6rpx;
}

.recording-name {
  font-size: 40rpx;
  font-weight: 700;
  color: var(--text-primary);
  margin-bottom: 12rpx;
  text-align: center;
}

.recording-info {
  font-size: 26rpx;
  color: var(--text-muted);
  margin-bottom: 48rpx;
}

.progress-container {
  width: 100%;
}

.time-info {
  display: flex;
  justify-content: space-between;
  font-size: 24rpx;
  color: var(--text-muted);
  margin-top: 8rpx;
}

.view-count {
  margin-top: 32rpx;
  font-size: 24rpx;
  color: var(--text-muted);
}

.bottom-actions {
  margin-top: 48rpx;
}

.action-btn {
  padding: 24rpx 64rpx;
  background: rgba(255,255,255,0.1);
  border-radius: 100rpx;
  color: var(--text-primary);
  font-weight: 600;
  border: 1px solid rgba(255,255,255,0.2);
}
</style>
