<template>
  <view class="container safe-area-top">
    <!-- 自定义导航栏 -->
    <view class="custom-navbar" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="navbar-content">
        <text class="navbar-title">设置</text>
        <view class="navbar-badge">选项</view>
      </view>
    </view>
    
    <!-- 设置内容 -->
    <scroll-view class="content" scroll-y>
      <!-- 音频设置 -->
      <view class="setting-group glass animate-fade-in">
        <view class="group-header">
          <svg-icon name="piano" size="32rpx" color="var(--divine-gold)" />
          <text class="group-title">声音设置</text>
        </view>
        
        <view class="setting-item">
          <view class="setting-label-box">
            <text class="setting-label">钢琴音量</text>
            <text class="setting-value">{{ settings.pianoVolume }}%</text>
          </view>
          <slider 
            :value="settings.pianoVolume" 
            @change="updateVolume" 
            activeColor="#d4af37" 
            backgroundColor="rgba(255,255,255,0.1)"
            block-size="20"
            block-color="#ffffff"
            class="custom-slider"
          />
        </view>
        
        <view class="setting-item no-border">
          <view class="setting-label-box">
            <text class="setting-label">按键震动</text>
          </view>
          <switch 
            :checked="settings.enableVibration" 
            @change="toggleVibration" 
            color="#d4af37" 
            style="transform: scale(0.8)" 
          />
        </view>
      </view>
      
      <!-- 练耳设置 -->
      <view class="setting-group glass animate-fade-in" style="animation-delay: 0.1s">
        <view class="group-header">
          <svg-icon name="ear" size="32rpx" color="var(--divine-gold)" />
          <text class="group-title">练耳偏好</text>
        </view>
        
        <view class="setting-item">
          <view class="setting-label-box">
            <text class="setting-label">自动播放下一题</text>
          </view>
          <switch 
            :checked="settings.autoNext" 
            @change="toggleAutoNext" 
            color="#d4af37" 
            style="transform: scale(0.8)" 
          />
        </view>
        
        <view class="setting-item no-border">
          <view class="setting-label-box">
            <text class="setting-label">显示答案提示</text>
          </view>
          <switch 
            :checked="settings.showHint" 
            @change="toggleShowHint" 
            color="#d4af37" 
            style="transform: scale(0.8)" 
          />
        </view>
      </view>
      
      <!-- 数据管理 -->
      <view class="setting-group glass animate-fade-in" style="animation-delay: 0.2s">
        <view class="group-header">
          <svg-icon name="chart" size="32rpx" color="var(--divine-gold)" />
          <text class="group-title">数据管理</text>
        </view>
        
        <view class="setting-item" @click="clearStatistics">
          <text class="setting-label">重置统计数据</text>
          <svg-icon name="arrow-right" size="28rpx" color="var(--text-muted)" />
        </view>
        
        <view class="setting-item no-border" @click="clearRecordings">
          <text class="setting-label">清空所有录音</text>
          <svg-icon name="arrow-right" size="28rpx" color="var(--text-muted)" />
        </view>
      </view>
      
      <!-- 危险区域 -->
      <view class="setting-group glass danger-zone animate-fade-in" style="animation-delay: 0.3s">
        <view class="group-header">
          <svg-icon name="settings" size="32rpx" color="var(--error-color)" />
          <text class="group-title" style="color: var(--error-color)">危险区域</text>
        </view>
        
        <view class="setting-item no-border" @click="resetAll">
          <text class="setting-label" style="color: var(--error-color)">恢复出厂设置</text>
          <svg-icon name="lightning" size="28rpx" color="var(--error-color)" />
        </view>
      </view>
      
      <!-- 关于 -->
      <view class="about-section animate-fade-in" style="animation-delay: 0.4s">
        <view class="app-logo-box">
          <svg-icon name="piano" size="64rpx" color="var(--text-muted)" />
        </view>
        <text class="app-name">视唱练耳助手</text>
        <text class="app-version">Version 1.2.0</text>
        <text class="app-slogan">让音乐练习更简单</text>
      </view>
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { onShareAppMessage } from '@dcloudio/uni-app'
import SvgIcon from '@/components/SvgIcon.vue'

// 分享
onShareAppMessage(() => ({
  title: '🎵 视唱练耳助手 - 提升你的音乐听力',
  path: '/pages/index/index'
}))

const statusBarHeight = ref(20)

const settings = reactive({
  pianoVolume: 80,
  enableVibration: true,
  autoNext: true,
  showHint: false
})

onMounted(() => {
  const windowInfo = uni.getWindowInfo()
  statusBarHeight.value = windowInfo.statusBarHeight || 20
  loadSettings()
})

const loadSettings = () => {
  const saved = uni.getStorageSync('appSettings')
  if (saved) {
    Object.assign(settings, saved)
  }
}

const saveSettings = () => {
  uni.setStorageSync('appSettings', settings)
}

const updateVolume = (e: any) => {
  settings.pianoVolume = e.detail.value
  saveSettings()
}

const toggleVibration = (e: any) => {
  settings.enableVibration = e.detail.value
  saveSettings()
}

const toggleAutoNext = (e: any) => {
  settings.autoNext = e.detail.value
  saveSettings()
}

const toggleShowHint = (e: any) => {
  settings.showHint = e.detail.value
  saveSettings()
}

const clearStatistics = () => {
  uni.showModal({
    title: '重置统计',
    content: '确定要清空所有练习统计数据吗？此操作无法撤销。',
    confirmColor: '#EF4444',
    success: (res) => {
      if (res.confirm) {
        uni.removeStorageSync('statistics')
        uni.showToast({ title: '已重置', icon: 'success' })
      }
    }
  })
}

const clearRecordings = () => {
  uni.showModal({
    title: '清空录音',
    content: '确定要删除所有本地录音文件吗？此操作无法撤销。',
    confirmColor: '#EF4444',
    success: (res) => {
      if (res.confirm) {
        // 清除录音数据逻辑 (需调用 RecorderService)
        uni.removeStorageSync('recordings')
        uni.showToast({ title: '已清空', icon: 'success' })
      }
    }
  })
}

const resetAll = () => {
  uni.showModal({
    title: '恢复出厂',
    content: '确定要将所有设置恢复默认并清空数据吗？',
    confirmColor: '#EF4444',
    success: (res) => {
      if (res.confirm) {
        uni.clearStorageSync()
        // 恢复默认设置
        Object.assign(settings, {
          pianoVolume: 80,
          enableVibration: true,
          autoNext: true,
          showHint: false
        })
        saveSettings()
        uni.showToast({ title: '已恢复', icon: 'success' })
        
        // 重启应用
        setTimeout(() => {
          uni.reLaunch({ url: '/pages/index/index' })
        }, 1500)
      }
    }
  })
}
</script>

<style scoped>
.container {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  width: 100%;
  max-width: 100vw;
  background: var(--bg-dark);
  overflow-x: hidden;
  box-sizing: border-box;
  background-image: 
    radial-gradient(circle at 80% 20%, rgba(139, 92, 246, 0.1) 0%, transparent 40%),
    radial-gradient(circle at 20% 80%, rgba(59, 130, 246, 0.1) 0%, transparent 40%);
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
  justify-content: center;
  gap: 16rpx;
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
  color: var(--divine-blue);
  background: var(--divine-gold);
  padding: 2rpx 12rpx;
  border-radius: 8rpx;
}

.content {
  flex: 1;
  padding: 32rpx;
  width: 100%;
  max-width: 100%;
  box-sizing: border-box;
  overflow-x: hidden;
}

.setting-group {
  padding: 0 32rpx;
  border-radius: var(--radius-lg);
  margin-bottom: 32rpx;
  overflow: hidden;
}

.group-header {
  display: flex;
  align-items: center;
  gap: 16rpx;
  padding: 24rpx 0;
  border-bottom: 1px solid var(--glass-border);
  margin-bottom: 16rpx;
}

.group-title {
  font-size: 28rpx;
  font-weight: 600;
  color: var(--text-primary);
}

.setting-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24rpx 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
}

.setting-item.no-border {
  border-bottom: none;
}

.setting-label-box {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding-right: 20rpx;
}

.setting-label {
  font-size: 30rpx;
  color: var(--text-primary);
}

.setting-value {
  font-size: 24rpx;
  color: var(--text-muted);
  margin-top: 4rpx;
}

.custom-slider {
  width: 300rpx; /* 稍微加宽 */
  margin: 0;
  flex-shrink: 0;
}

/* 危险区域 */
.danger-zone {
  border: 1px solid rgba(239, 68, 68, 0.3);
  background: rgba(239, 68, 68, 0.05);
}

/* 关于 */
.about-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 64rpx 0 120rpx;
}

.app-logo-box {
  width: 120rpx;
  height: 120rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 32rpx;
  margin-bottom: 24rpx;
  border: 1px solid var(--glass-border);
}

.app-name {
  font-size: 32rpx;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 8rpx;
}

.app-version {
  font-size: 24rpx;
  color: var(--text-muted);
  margin-bottom: 16rpx;
}

.app-slogan {
  font-size: 24rpx;
  color: var(--text-secondary);
  letter-spacing: 4rpx;
}
</style>
