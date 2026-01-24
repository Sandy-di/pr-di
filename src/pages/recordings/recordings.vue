<template>
  <view class="container safe-area-top">
    <!-- 自定义导航栏 -->
    <view class="custom-navbar" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="navbar-content">
        <view class="nav-back" @click="goBack">
          <text>←</text>
        </view>
        <text class="navbar-title">我的录音</text>
        <view class="navbar-badge">记录</view>
      </view>
    </view>
    
    <!-- 录音列表 -->
    <scroll-view class="recording-list" scroll-y>
      <view v-if="recordings.length === 0" class="empty-state animate-fade-in">
        <view class="empty-icon-wrapper animate-float">
          <svg-icon name="mic" size="120rpx" color="var(--text-muted)" />
        </view>
        <text class="empty-text">暂无录音</text>
        <text class="empty-hint">记录你的每一次进步</text>
        <view class="empty-btn" @click="goToPiano">
          <view class="empty-btn-content">
            <svg-icon name="piano" size="36rpx" color="#FFFFFF" />
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
            <svg-icon :name="playingId === recording.id ? 'pause' : 'play'" size="32rpx" :color="playingId === recording.id ? '#fff' : 'var(--neu-gold)'" />
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
          <view class="action-btn share-btn" @click.stop="prepareShare(recording)">
            <text>分享</text>
          </view>
          <view class="action-btn delete-btn" @click.stop="deleteRecording(recording)">
            <text>删除</text>
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
          <svg-icon name="stop" size="32rpx" color="var(--text-primary)" />
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { onShareAppMessage } from '@dcloudio/uni-app'
import RecorderService, { type Recording } from '@/utils/recorder-manager'
import { request } from '@/utils/api-client'
import SvgIcon from '@/components/SvgIcon.vue'

// 当前要分享的录音
const pendingShareRecording = ref<Recording | null>(null)

// 分享
onShareAppMessage(() => {
  if (pendingShareRecording.value && pendingShareRecording.value.cloudUrl) {
    // 分享特定录音
    const shareData = {
      title: `🎵 ${pendingShareRecording.value.name}`,
      path: `/pages/share-play/share-play?id=${pendingShareRecording.value.id}`,
      imageUrl: ''
    }
    // 分享后清除待分享录音
    pendingShareRecording.value = null
    return shareData
  }
  // 默认分享到首页（不是录音管理页面）
  return {
    title: '🎵 视唱练耳助手 - 让练习更有效',
    path: '/pages/index/index'
  }
})

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
  const allRecordings = RecorderService.getRecordings()
  // 过滤掉无效的录音（duration 为 NaN 或 0）
  recordings.value = allRecordings.filter(r => r.duration && r.duration > 0 && !isNaN(r.duration))
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

// 分享录音文件到群
const prepareShare = (recording: Recording) => {
  if (!recording.voicePath) {
    uni.showToast({ title: '录音文件不存在', icon: 'none' })
    return
  }
  
  // 直接分享音频文件
  uni.shareFileMessage({
    filePath: recording.voicePath,
    fileName: `${recording.name}.mp3`,
    success: () => uni.showToast({ title: '分享成功', icon: 'success' }),
    fail: (err) => {
      console.error('分享失败:', err)
      uni.showToast({ title: '分享失败', icon: 'none' })
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

const formatDuration = (ms: number | undefined): string => {
  if (!ms || isNaN(ms)) return '0:00'
  const seconds = Math.floor(ms / 1000)
  const minutes = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${minutes}:${secs.toString().padStart(2, '0')}`
}

const formatDate = (isoString: string | undefined): string => {
  if (!isoString) return '未知日期'
  try {
    const date = new Date(isoString)
    if (isNaN(date.getTime())) return '未知日期'
    
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    
    if (diff < 60000) return '刚刚'
    if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}小时前`
    if (diff < 604800000) return `${Math.floor(diff / 86400000)}天前`
    
    return `${date.getMonth() + 1}月${date.getDate()}日`
  } catch {
    return '未知日期'
  }
}
</script>

<style scoped>
.container {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  background: var(--bg-main);
}

.custom-navbar {
  height: 88rpx;
  background: var(--bg-main);
  position: sticky;
  top: 0;
  z-index: 100;
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
  background: var(--bg-main);
  border-radius: 50%;
  box-shadow: var(--neu-shadow-light), var(--neu-shadow-dark);
  color: var(--text-primary);
  font-size: 32rpx;
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
  color: #FFFFFF;
  background: var(--neu-gold);
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
  background: var(--gold-gradient);
  border-radius: 100rpx;
  overflow: hidden;
  box-shadow: var(--shadow-gold);
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

/* 录音项 - 新拟物卡片 */
.recording-item {
  display: flex;
  align-items: center;
  padding: 24rpx;
  border-radius: var(--radius-lg);
  margin-bottom: 20rpx;
  background: var(--bg-main);
  box-shadow: var(--neu-shadow-light), var(--neu-shadow-dark);
  transition: all 0.15s ease;
}

.recording-item.item-playing {
  box-shadow: var(--neu-shadow-inset-light), var(--neu-shadow-inset-dark);
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
  background: var(--bg-main);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 24rpx;
  box-shadow: var(--neu-shadow-light), var(--neu-shadow-dark);
  transition: all 0.15s ease;
}

.item-playing .recording-icon-box {
  background: var(--neu-gold);
  box-shadow: var(--shadow-gold-glow);
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
  color: var(--neu-gold);
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
  color: rgba(174, 174, 192, 0.3);
}

.meta-badge {
  margin-left: 12rpx;
  padding: 2rpx 10rpx;
  background: rgba(184, 134, 11, 0.1);
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
  padding: 12rpx 24rpx;
  border-radius: 100rpx;
  font-size: 24rpx;
  font-weight: 500;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.share-btn {
  background: rgba(6, 182, 212, 0.2);
  color: #06b6d4;
  border: 1px solid rgba(6, 182, 212, 0.3);
}

.share-btn text {
  color: #06b6d4;
}

.delete-btn {
  background: rgba(239, 68, 68, 0.2);
  color: #ef4444;
  border: 1px solid rgba(239, 68, 68, 0.3);
}

.delete-btn text {
  color: #ef4444;
}

.action-btn:active {
  opacity: 0.8;
  transform: scale(0.95);
}

/* 播放器栏 - 新拟物 */
.player-bar {
  position: fixed;
  bottom: 30rpx;
  left: 24rpx;
  right: 24rpx;
  padding: 24rpx;
  background: var(--bg-main);
  border-radius: 32rpx;
  box-shadow: 
    -8rpx -8rpx 24rpx #FFFFFF,
    8rpx 8rpx 24rpx rgba(174, 174, 192, 0.4);
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
  background: var(--bg-main);
  border-radius: 50%;
  box-shadow: var(--neu-shadow-light), var(--neu-shadow-dark);
}
</style>
