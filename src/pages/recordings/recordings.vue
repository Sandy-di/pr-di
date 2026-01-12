<template>
  <view class="container safe-area-top">
    <!-- 自定义导航栏 -->
    <view class="custom-navbar" :style="{ paddingTop: statusBarHeight + 'px' }">
      <text class="navbar-title">🎤 我的录音</text>
    </view>
    
    <!-- 录音列表 -->
    <scroll-view class="recording-list" scroll-y>
      <view v-if="recordings.length === 0" class="empty-state">
        <text class="empty-icon">🎵</text>
        <text class="empty-text">暂无录音</text>
        <text class="empty-hint">去钢琴页面录制你的第一段练习吧</text>
        <view class="empty-btn" @click="goToPiano">
          <text>开始录音</text>
        </view>
      </view>
      
      <view 
        v-for="recording in recordings" 
        :key="recording.id"
        class="recording-item"
      >
        <view class="recording-info" @click="playRecording(recording)">
          <view class="recording-icon">
            <text v-if="playingId === recording.id">⏸️</text>
            <text v-else>▶️</text>
          </view>
          <view class="recording-details">
            <text class="recording-name">{{ recording.name }}</text>
            <view class="recording-meta">
              <text class="meta-item">{{ formatDuration(recording.duration) }}</text>
              <text class="meta-divider">·</text>
              <text class="meta-item">{{ formatDate(recording.createdAt) }}</text>
              <text v-if="recording.mode === 'mixed'" class="meta-badge">🎹</text>
            </view>
          </view>
        </view>
        
        <view class="recording-actions">
          <view class="action-btn" @click="shareRecording(recording)">
            <text>📤</text>
          </view>
          <view class="action-btn" @click="showOptions(recording)">
            <text>⋯</text>
          </view>
        </view>
      </view>
    </scroll-view>
    
    <!-- 播放进度条 -->
    <view v-if="playingId" class="player-bar safe-area-bottom">
      <view class="player-info">
        <text class="player-name">{{ currentRecording?.name }}</text>
        <text class="player-time">{{ formatDuration(currentTime) }} / {{ formatDuration(currentRecording?.duration || 0) }}</text>
      </view>
      <slider 
        class="player-slider"
        :value="progressPercent"
        @change="seekTo"
        activeColor="#667eea"
        backgroundColor="rgba(255,255,255,0.2)"
        block-size="16"
      />
      <view class="player-controls">
        <view class="control-btn" @click="stopPlaying">
          <text>⏹️</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import RecorderService, { type Recording } from '@/utils/recorder-manager'

const statusBarHeight = ref(20)
const recordings = ref<Recording[]>([])
const playingId = ref<string | null>(null)
const currentTime = ref(0)
let audioContext: UniApp.InnerAudioContext | null = null
let progressTimer: any = null

const currentRecording = computed(() => {
  return recordings.value.find(r => r.id === playingId.value)
})

const progressPercent = computed(() => {
  if (!currentRecording.value) return 0
  return (currentTime.value / currentRecording.value.duration) * 100
})

onMounted(() => {
  const systemInfo = uni.getSystemInfoSync()
  statusBarHeight.value = systemInfo.statusBarHeight || 20
  loadRecordings()
})

onUnmounted(() => {
  stopPlaying()
})

const loadRecordings = () => {
  recordings.value = RecorderService.getRecordings()
}

const playRecording = (recording: Recording) => {
  if (playingId.value === recording.id) {
    // 暂停当前播放
    stopPlaying()
    return
  }
  
  // 停止之前的播放
  stopPlaying()
  
  // 开始新的播放
  audioContext = uni.createInnerAudioContext()
  audioContext.src = recording.voicePath
  
  audioContext.onPlay(() => {
    playingId.value = recording.id
    startProgressTimer()
  })
  
  audioContext.onEnded(() => {
    stopPlaying()
  })
  
  audioContext.onError((err) => {
    console.error('播放错误:', err)
    stopPlaying()
    uni.showToast({ title: '播放失败', icon: 'error' })
  })
  
  audioContext.play()
}

const stopPlaying = () => {
  if (audioContext) {
    audioContext.stop()
    audioContext.destroy()
    audioContext = null
  }
  playingId.value = null
  currentTime.value = 0
  stopProgressTimer()
}

const startProgressTimer = () => {
  progressTimer = setInterval(() => {
    if (audioContext) {
      currentTime.value = audioContext.currentTime * 1000
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
  if (!audioContext || !currentRecording.value) return
  const percent = e.detail.value / 100
  audioContext.seek(percent * currentRecording.value.duration / 1000)
}

const shareRecording = (recording: Recording) => {
  uni.shareAppMessage({
    title: `🎵 ${recording.name} | ${formatDuration(recording.duration)}`,
    path: `/pages/recordings/recordings?play=${recording.id}`
  })
}

const showOptions = (recording: Recording) => {
  uni.showActionSheet({
    itemList: ['重命名', '删除'],
    success: (res) => {
      if (res.tapIndex === 0) {
        renameRecording(recording)
      } else if (res.tapIndex === 1) {
        deleteRecording(recording)
      }
    }
  })
}

const renameRecording = (recording: Recording) => {
  // #ifdef MP-WEIXIN
  uni.showModal({
    title: '重命名',
    editable: true,
    placeholderText: '请输入新名称',
    success: (res) => {
      if (res.confirm && res.content) {
        RecorderService.renameRecording(recording.id, res.content)
        loadRecordings()
      }
    }
  })
  // #endif
  
  // #ifndef MP-WEIXIN
  uni.showToast({ title: '请长按录音进行重命名', icon: 'none' })
  // #endif
}

const deleteRecording = (recording: Recording) => {
  uni.showModal({
    title: '确认删除',
    content: `确定要删除"${recording.name}"吗？`,
    success: (res) => {
      if (res.confirm) {
        RecorderService.deleteRecording(recording.id)
        loadRecordings()
        uni.showToast({ title: '已删除', icon: 'success' })
      }
    }
  })
}

const goToPiano = () => {
  uni.switchTab({ url: '/pages/piano/piano' })
}

const formatDuration = (ms: number): string => {
  const seconds = Math.floor(ms / 1000)
  const minutes = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${minutes}:${secs.toString().padStart(2, '0')}`
}

const formatDate = (isoString: string): string => {
  const date = new Date(isoString)
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  
  if (diff < 60000) return '刚刚'
  if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}小时前`
  if (diff < 604800000) return `${Math.floor(diff / 86400000)}天前`
  
  return `${date.getMonth() + 1}月${date.getDate()}日`
}
</script>

<style scoped>
.container {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  background: linear-gradient(180deg, #0f0f1a 0%, #1a1a2e 100%);
}

.custom-navbar {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 88rpx;
  background: rgba(26, 26, 46, 0.95);
  backdrop-filter: blur(10px);
}

.navbar-title {
  font-size: 36rpx;
  font-weight: 600;
  color: #ffffff;
}

.recording-list {
  flex: 1;
  padding: 24rpx;
  padding-bottom: 200rpx;
}

/* 空状态 */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 120rpx 40rpx;
}

.empty-icon {
  font-size: 120rpx;
  margin-bottom: 32rpx;
}

.empty-text {
  font-size: 36rpx;
  font-weight: 600;
  color: #ffffff;
  margin-bottom: 16rpx;
}

.empty-hint {
  font-size: 28rpx;
  color: #b0b0c0;
  margin-bottom: 40rpx;
}

.empty-btn {
  padding: 24rpx 48rpx;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 24rpx;
  box-shadow: 0 0 20rpx rgba(102, 126, 234, 0.4);
}

.empty-btn text {
  font-size: 32rpx;
  font-weight: 500;
  color: #ffffff;
}

/* 录音项 */
.recording-item {
  display: flex;
  align-items: center;
  padding: 24rpx;
  background: #1a1a2e;
  border-radius: 20rpx;
  margin-bottom: 16rpx;
}

.recording-info {
  flex: 1;
  display: flex;
  align-items: center;
}

.recording-icon {
  width: 80rpx;
  height: 80rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, rgba(102, 126, 234, 0.2) 0%, rgba(118, 75, 162, 0.2) 100%);
  border-radius: 50%;
  margin-right: 20rpx;
  font-size: 32rpx;
}

.recording-details {
  flex: 1;
}

.recording-name {
  font-size: 30rpx;
  font-weight: 500;
  color: #ffffff;
  margin-bottom: 8rpx;
  display: block;
}

.recording-meta {
  display: flex;
  align-items: center;
}

.meta-item {
  font-size: 24rpx;
  color: #b0b0c0;
}

.meta-divider {
  margin: 0 12rpx;
  color: #6a6a7a;
}

.meta-badge {
  margin-left: 12rpx;
  font-size: 20rpx;
}

.recording-actions {
  display: flex;
  gap: 16rpx;
}

.action-btn {
  width: 64rpx;
  height: 64rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 50%;
  font-size: 28rpx;
}

/* 播放器栏 */
.player-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 20rpx 24rpx;
  background: rgba(26, 26, 46, 0.98);
  backdrop-filter: blur(10px);
  border-top: 2rpx solid rgba(255, 255, 255, 0.1);
}

.player-info {
  display: flex;
  justify-content: space-between;
  margin-bottom: 16rpx;
}

.player-name {
  font-size: 28rpx;
  color: #ffffff;
}

.player-time {
  font-size: 24rpx;
  color: #b0b0c0;
}

.player-slider {
  margin: 0 -8rpx;
}

.player-controls {
  display: flex;
  justify-content: center;
  margin-top: 16rpx;
}

.control-btn {
  width: 80rpx;
  height: 80rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 50%;
  font-size: 36rpx;
}
</style>
