<template>
  <view class="container safe-area-top">
    <!-- 自定义导航栏 -->
    <view class="custom-navbar" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="navbar-content">
        <view class="nav-back" @click="goBack">
          <svg-icon name="back" size="24rpx" color="#fff" />
        </view>
        <text class="navbar-title">我的录音</text>
        <view class="navbar-badge">记录</view>
      </view>
    </view>
    
    <!-- 录音列表 -->
    <scroll-view class="recording-list" scroll-y>
      <view v-if="recordings.length === 0" class="empty-state animate-fade-in">
        <view class="empty-icon-wrapper animate-float">
          <svg-icon name="mic" size="120rpx" color="rgba(255,255,255,0.2)" />
        </view>
        <text class="empty-text">暂无录音</text>
        <text class="empty-hint">记录你的每一次进步</text>
        <view class="empty-btn" @click="goToPiano">
          <view class="empty-btn-content">
            <svg-icon name="piano" size="36rpx" color="#fff" />
            <text>去钢琴页录制</text>
          </view>
          <view class="btn-glow"></view>
        </view>
      </view>
      
      <view 
        v-for="recording in recordings" 
        :key="recording.id"
        class="recording-item glass glass-hover"
        :class="{ 'item-playing': playingId === recording.id }"
      >
        <view class="recording-info" @click="playRecording(recording)">
          <view class="recording-icon-box">
            <svg-icon :name="playingId === recording.id ? 'pause' : 'play'" size="32rpx" :color="playingId === recording.id ? '#fff' : 'var(--accent-cyan)'" />
            <view v-if="playingId === recording.id" class="playing-indicator">
              <view class="bar"></view>
              <view class="bar"></view>
              <view class="bar"></view>
            </view>
          </view>
          <view class="recording-details">
            <text class="recording-name" :class="{ 'text-active': playingId === recording.id }">{{ recording.name }}</text>
            <view class="recording-meta">
              <text class="meta-item">{{ formatDuration(recording.duration) }}</text>
              <text class="meta-divider">·</text>
              <text class="meta-item">{{ formatDate(recording.createdAt) }}</text>
              <view v-if="recording.mode === 'mixed'" class="meta-badge">
                <text class="badge-text">钢琴</text>
              </view>
            </view>
          </view>
        </view>
        
        <view class="recording-actions">
          <view class="action-btn" @click="shareRecording(recording)">
            <svg-icon name="arrow-right" size="28rpx" color="var(--text-muted)" style="transform: rotate(-45deg)" />
          </view>
          <view class="action-btn" @click="showOptions(recording)">
            <svg-icon name="more" size="28rpx" color="var(--text-muted)" />
          </view>
        </view>
      </view>
    </scroll-view>
    
    <!-- 播放进度条 -->
    <view v-if="playingId" class="player-bar glass safe-area-bottom animate-fade-in">
      <view class="player-info">
        <text class="player-name">{{ currentRecording?.name }}</text>
        <text class="player-time">{{ formatDuration(currentTime) }} / {{ formatDuration(currentRecording?.duration || 0) }}</text>
      </view>
      
      <view class="slider-container">
        <slider 
          class="player-slider"
          :value="progressPercent"
          @change="seekTo"
          activeColor="var(--accent-cyan)"
          backgroundColor="rgba(255,255,255,0.1)"
          block-size="12"
          block-color="var(--accent-cyan)"
        />
      </view>
      
      <view class="player-controls">
        <view class="control-btn glass-hover" @click="stopPlaying">
          <svg-icon name="stop" size="32rpx" color="#fff" />
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { onShareAppMessage } from '@dcloudio/uni-app'
import RecorderService, { type Recording } from '@/utils/recorder-manager'
import SvgIcon from '@/components/SvgIcon.vue'

// 分享
onShareAppMessage(() => ({
  title: '🎵 我的练习录音 - 视唱练耳助手',
  path: '/pages/recordings/recordings'
}))

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
  const windowInfo = uni.getWindowInfo()
  statusBarHeight.value = windowInfo.statusBarHeight || 20
  loadRecordings()
})

const goBack = () => {
  uni.navigateBack({ fail: () => uni.switchTab({ url: '/pages/index/index' }) })
}

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
  if (!recording.voicePath) {
    uni.showToast({ title: '录音文件不存在', icon: 'none' })
    return
  }
  
  uni.shareFileMessage({
    filePath: recording.voicePath,
    fileName: `${recording.name}.mp3`,
    success: () => uni.showToast({ title: '分享成功', icon: 'success' }),
    fail: (err) => {
      console.error('分享失败:', err)
      // 如果 shareFileMessage 失败，回退到传统方式
      uni.showShareMenu({
        withShareTicket: true,
        menus: ['shareAppMessage']
      })
      uni.showToast({ title: '点击右上角分享', icon: 'none' })
    }
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
  background: var(--bg-dark);
  background-image: 
    radial-gradient(circle at 10% 90%, rgba(6, 182, 212, 0.1) 0%, transparent 40%),
    radial-gradient(circle at 90% 10%, rgba(59, 130, 246, 0.1) 0%, transparent 40%);
}

.custom-navbar {
  height: 88rpx;
  background: rgba(15, 15, 26, 0.8);
  backdrop-filter: blur(20px);
  position: sticky;
  top: 0;
  z-index: 100;
  border-bottom: 1px solid var(--glass-border);
}

.navbar-content {
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 32rpx;
}

.nav-back {
  width: 56rpx;
  height: 56rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255,255,255,0.1);
  border-radius: 50%;
}

.navbar-title {
  font-size: 34rpx;
  font-weight: 600;
  color: var(--text-primary);
  letter-spacing: 2rpx;
}

.navbar-badge {
  font-size: 18rpx;
  font-weight: 700;
  color: var(--bg-dark);
  background: var(--accent-cyan);
  padding: 2rpx 8rpx;
  border-radius: 8rpx;
}

.recording-list {
  flex: 1;
  padding: 32rpx;
  padding-bottom: 220rpx;
}

/* 空状态 */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 120rpx 40rpx;
}

.empty-icon-wrapper {
  margin-bottom: 48rpx;
}

.empty-text {
  font-size: 36rpx;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 16rpx;
}

.empty-hint {
  font-size: 28rpx;
  color: var(--text-muted);
  margin-bottom: 64rpx;
}

.empty-btn {
  position: relative;
  padding: 28rpx 56rpx;
  background: var(--primary-gradient);
  border-radius: 100rpx;
  overflow: hidden;
  box-shadow: 0 8rpx 24rpx rgba(102, 126, 234, 0.3);
}

.empty-btn-content {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  gap: 16rpx;
  font-size: 32rpx;
  font-weight: 600;
  color: #ffffff;
}

.btn-glow {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent);
  animation: shine 3s infinite;
}

/* 录音项 */
.recording-item {
  display: flex;
  align-items: center;
  padding: 24rpx;
  border-radius: var(--radius-lg);
  margin-bottom: 20rpx;
  background: rgba(26, 26, 46, 0.4);
  transition: all 0.3s ease;
}

.recording-item.item-playing {
  background: rgba(6, 182, 212, 0.1);
  border-color: rgba(6, 182, 212, 0.3);
}

.recording-info {
  flex: 1;
  display: flex;
  align-items: center;
}

.recording-icon-box {
  position: relative;
  width: 88rpx;
  height: 88rpx;
  border-radius: 24rpx;
  background: rgba(255, 255, 255, 0.05);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 24rpx;
  transition: all 0.3s ease;
}

.item-playing .recording-icon-box {
  background: var(--accent-cyan);
  box-shadow: 0 0 20rpx rgba(6, 182, 212, 0.4);
}

.playing-indicator {
  position: absolute;
  bottom: 12rpx;
  left: 0;
  width: 100%;
  display: flex;
  justify-content: center;
  gap: 4rpx;
  opacity: 0.6;
}

.bar {
  width: 4rpx;
  height: 8rpx;
  background: #fff;
  border-radius: 2rpx;
  animation: barScale 0.8s ease-in-out infinite;
}

.bar:nth-child(2) { animation-delay: 0.2s; }
.bar:nth-child(3) { animation-delay: 0.4s; }

@keyframes barScale {
  0%, 100% { height: 8rpx; }
  50% { height: 16rpx; }
}

.recording-details {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.recording-name {
  font-size: 30rpx;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 8rpx;
  transition: color 0.3s;
}

.recording-name.text-active {
  color: var(--accent-cyan);
}

.recording-meta {
  display: flex;
  align-items: center;
}

.meta-item {
  font-size: 24rpx;
  color: var(--text-muted);
}

.meta-divider {
  margin: 0 12rpx;
  color: var(--glass-border);
}

.meta-badge {
  margin-left: 12rpx;
  padding: 2rpx 10rpx;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 8rpx;
}

.badge-text {
  font-size: 20rpx;
  color: var(--text-secondary);
}

.recording-actions {
  display: flex;
  gap: 16rpx;
  padding-left: 16rpx;
}

.action-btn {
  width: 72rpx;
  height: 72rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  transition: background 0.2s;
}

.action-btn:active {
  background: rgba(255, 255, 255, 0.1);
}

/* 播放器栏 */
.player-bar {
  position: fixed;
  bottom: 30rpx;
  left: 24rpx;
  right: 24rpx;
  padding: 24rpx;
  background: rgba(26, 26, 46, 0.95);
  border-radius: 32rpx;
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: 0 16rpx 48rpx rgba(0, 0, 0, 0.4);
  z-index: 100;
}

.player-info {
  display: flex;
  justify-content: space-between;
  margin-bottom: 0rpx;
  padding: 0 12rpx;
}

.player-name {
  font-size: 26rpx;
  font-weight: 600;
  color: var(--text-primary);
}

.player-time {
  font-size: 24rpx;
  color: var(--text-muted);
  font-variant-numeric: tabular-nums;
}

.slider-container {
  margin: 10rpx 0;
}

.player-slider {
  margin: 0;
}

.player-controls {
  display: flex;
  justify-content: center;
}

.control-btn {
  width: 80rpx;
  height: 80rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 50%;
  color: #fff;
}
</style>
