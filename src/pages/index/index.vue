<template>
  <view class="container safe-area-top">
    <!-- 自定义导航栏 -->
    <view class="custom-navbar" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="navbar-content">
        <text class="navbar-title">视唱练耳助手</text>
        <view class="navbar-badge">BETA</view>
      </view>
    </view>
    
    <!-- 主内容区 -->
    <view class="content">
      <!-- 欢迎横幅 (Glassmorphism + Gradient) -->
      <view class="hero-banner animate-fade-in">
        <view class="hero-bg-glow"></view>
        <view class="hero-content">
          <view class="hero-text">
            <text class="hero-title">开始今日练习</text>
            <text class="hero-subtitle">每天坚持，音乐之路更进一步</text>
          </view>
          <view class="hero-icon-wrapper animate-float">
            <svg-icon name="piano" size="120rpx" color="rgba(255,255,255,0.9)" />
          </view>
        </view>
      </view>
      
      <!-- 功能入口 -->
      <view class="feature-grid">
        <view class="feature-card glass glass-hover" @click="navigateTo('/pages/piano/piano')">
          <view class="card-glow" style="background: var(--accent-blue);"></view>
          <view class="feature-icon-box" style="background: rgba(59, 130, 246, 0.2); color: var(--accent-blue);">
            <svg-icon name="piano" size="48rpx" />
          </view>
          <text class="feature-title">自由弹奏</text>
          <text class="feature-desc">真实钢琴音色</text>
        </view>
        
        <view class="feature-card glass glass-hover" @click="navigateTo('/pages/ear-training/ear-training')">
          <view class="card-glow" style="background: var(--accent-purple);"></view>
          <view class="feature-icon-box" style="background: rgba(139, 92, 246, 0.2); color: var(--accent-purple);">
            <svg-icon name="ear" size="48rpx" />
          </view>
          <text class="feature-title">视唱练耳</text>
          <text class="feature-desc">音程与音阶训练</text>
        </view>
        
        <view class="feature-card glass glass-hover" @click="navigateTo('/pages/recordings/recordings')">
          <view class="card-glow" style="background: var(--accent-cyan);"></view>
          <view class="feature-icon-box" style="background: rgba(6, 182, 212, 0.2); color: var(--accent-cyan);">
            <svg-icon name="mic" size="48rpx" />
          </view>
          <text class="feature-title">录音管理</text>
          <text class="feature-desc">查看练习记录</text>
        </view>
        
        <view class="feature-card glass glass-hover" @click="navigateTo('/pages/settings/settings')">
          <view class="card-glow" style="background: var(--accent-orange);"></view>
          <view class="feature-icon-box" style="background: rgba(249, 115, 22, 0.2); color: var(--accent-orange);">
            <svg-icon name="settings" size="48rpx" />
          </view>
          <text class="feature-title">设置</text>
          <text class="feature-desc">个性化配置</text>
        </view>
      </view>
      
      <!-- 快速开始 -->
      <view class="section-header">
        <text class="section-title">快捷操作</text>
      </view>
      
      <view class="quick-actions">
        <view class="quick-btn glass glass-hover" @click="navigateTo('/pages/piano/piano')">
          <view class="quick-btn-content">
            <svg-icon name="lightning" size="40rpx" color="var(--accent-blue)" />
            <text class="quick-btn-text">弹奏练习</text>
          </view>
          <svg-icon name="arrow-right" size="32rpx" color="var(--text-muted)" />
        </view>
        <view class="quick-btn glass glass-hover" @click="startRecording">
          <view class="quick-btn-content">
            <svg-icon name="mic" size="40rpx" color="var(--accent-pink)" />
            <text class="quick-btn-text">开始录音</text>
          </view>
          <div class="recording-dot animate-pulse"></div>
        </view>
      </view>
      
      <!-- 今日统计 -->
      <view class="stats-card glass">
        <view class="stats-header">
          <view class="stats-title-box">
            <svg-icon name="chart" size="36rpx" color="var(--accent-cyan)" />
            <text class="card-title">今日统计</text>
          </view>
          <text class="stats-date">{{ currentDate }}</text>
        </view>
        
        <view class="stats-row">
          <view class="stat-item">
            <text class="stat-value" style="color: var(--accent-blue);">{{ stats.practiceTime }}</text>
            <text class="stat-label">练习时长</text>
          </view>
          <view class="stat-divider"></view>
          <view class="stat-item">
            <text class="stat-value" style="color: var(--accent-purple);">{{ stats.recordCount }}</text>
            <text class="stat-label">录音数</text>
          </view>
          <view class="stat-divider"></view>
          <view class="stat-item">
            <text class="stat-value" style="color: var(--accent-orange);">{{ stats.streak }}</text>
            <text class="stat-label">连续天数</text>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, computed } from 'vue'
import { onShareAppMessage, onShareTimeline } from '@dcloudio/uni-app'
import SvgIcon from '@/components/SvgIcon.vue'

// 分享给好友
onShareAppMessage(() => ({
  title: '🎵 视唱练耳助手 - 提升你的音乐听力',
  path: '/pages/index/index',
  imageUrl: '/static/share-cover.png'
}))

// 分享到朋友圈
onShareTimeline(() => ({
  title: '🎵 视唱练耳助手 - 提升你的音乐听力',
  query: '',
  imageUrl: '/static/share-cover.png'
}))

// 状态栏高度
const statusBarHeight = ref(0)
const currentDate = computed(() => {
  const date = new Date()
  return `${date.getMonth() + 1}月${date.getDate()}日`
})

// 统计数据
const stats = reactive({
  practiceTime: '0分钟',
  recordCount: 0,
  streak: 0
})

onMounted(() => {
  // 获取状态栏高度
  const windowInfo = uni.getWindowInfo()
  statusBarHeight.value = windowInfo.statusBarHeight || 20
  
  // 加载统计数据
  loadStats()
})

// 加载统计数据
const loadStats = () => {
  try {
    const savedStats = uni.getStorageSync('statistics')
    if (savedStats) {
      stats.recordCount = savedStats.totalRecordings || 0
      stats.streak = savedStats.streakDays || 0
      const minutes = Math.floor((savedStats.totalPracticeTime || 0) / 60000)
      stats.practiceTime = `${minutes}分钟`
    }
  } catch (e) {
    console.error('加载统计数据失败:', e)
  }
}

// 页面跳转
const navigateTo = (url: string) => {
  // tabBar 页面列表
  const tabBarPages = ['/pages/index/index', '/pages/piano/piano', '/pages/ear-training/ear-training', '/pages/settings/settings']
  
  // 检查是否是 tabBar 页面（不带参数时）
  const basePath = url.split('?')[0]
  if (tabBarPages.includes(basePath) && !url.includes('?')) {
    uni.switchTab({ url: basePath })
  } else {
    uni.navigateTo({ url })
  }
}

// 开始录音（跳转到钢琴页并自动开始录音）
const startRecording = () => {
  uni.switchTab({ 
    url: '/pages/piano/piano',
    success: () => {
      uni.setStorageSync('autoStartRecording', true)
    }
  })
}
</script>

<style scoped>
.container {
  min-height: 100vh;
  background: var(--bg-dark);
  background-image: 
    radial-gradient(circle at 10% 20%, rgba(59, 130, 246, 0.15) 0%, transparent 40%),
    radial-gradient(circle at 90% 80%, rgba(236, 72, 153, 0.15) 0%, transparent 40%);
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
  color: var(--bg-dark);
  background: var(--accent-cyan);
  padding: 2rpx 8rpx;
  border-radius: 8rpx;
}

.content {
  padding: 32rpx;
  padding-bottom: 180rpx;
}

/* 英雄横幅 */
.hero-banner {
  position: relative;
  height: 300rpx;
  background: linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%);
  border-radius: var(--radius-xl);
  margin-bottom: 48rpx;
  overflow: hidden;
  box-shadow: 0 12rpx 40rpx rgba(79, 70, 229, 0.3);
  display: flex;
  align-items: center;
  padding: 0 48rpx;
}

.hero-bg-glow {
  position: absolute;
  top: -50%;
  left: -50%;
  width: 200%;
  height: 200%;
  background: radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 60%);
  animation: shine 8s linear infinite;
}

.hero-content {
  position: relative;
  z-index: 1;
  width: 100%;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.hero-text {
  flex: 1;
}

.hero-title {
  font-size: 44rpx;
  font-weight: 800;
  color: #ffffff;
  display: block;
  margin-bottom: 12rpx;
  text-shadow: 0 4rpx 12rpx rgba(0,0,0,0.2);
}

.hero-subtitle {
  font-size: 26rpx;
  color: rgba(255, 255, 255, 0.9);
  display: block;
}

/* 功能网格 */
.feature-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 24rpx;
  margin-bottom: 48rpx;
}

.feature-card {
  position: relative;
  padding: 32rpx;
  border-radius: var(--radius-lg);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.card-glow {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 6rpx;
  opacity: 0.8;
}

.feature-icon-box {
  width: 88rpx;
  height: 88rpx;
  border-radius: 24rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 24rpx;
}

.feature-title {
  font-size: 30rpx;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 8rpx;
}

.feature-desc {
  font-size: 22rpx;
  color: var(--text-muted);
  line-height: 1.4;
}

/* 分区标题 */
.section-header {
  margin-bottom: 24rpx;
  padding-left: 8rpx;
  border-left: 6rpx solid var(--accent-blue);
}

.section-title {
  font-size: 32rpx;
  font-weight: 700;
  color: var(--text-primary);
  margin-left: 16rpx;
}

/* 快速操作 */
.quick-actions {
  display: grid;
  grid-template-columns: 1fr;
  gap: 20rpx;
  margin-bottom: 48rpx;
}

.quick-btn {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24rpx 32rpx;
  border-radius: var(--radius-lg);
}

.quick-btn-content {
  display: flex;
  align-items: center;
  gap: 24rpx;
}

.quick-btn-text {
  font-size: 28rpx;
  font-weight: 600;
  color: var(--text-primary);
}

.recording-dot {
  width: 16rpx;
  height: 16rpx;
  border-radius: 50%;
  background: var(--error-color);
  box-shadow: 0 0 10rpx var(--error-color);
}

/* 统计卡片 */
.stats-card {
  padding: 32rpx;
  border-radius: var(--radius-lg);
}

.stats-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 32rpx;
  padding-bottom: 20rpx;
  border-bottom: 1px solid var(--glass-border);
}

.stats-title-box {
  display: flex;
  align-items: center;
  gap: 16rpx;
}

.card-title {
  font-size: 30rpx;
  font-weight: 600;
  color: var(--text-primary);
}

.stats-date {
  font-size: 24rpx;
  color: var(--text-muted);
  background: rgba(255,255,255,0.05);
  padding: 4rpx 12rpx;
  border-radius: 100rpx;
}

.stats-row {
  display: flex;
  align-items: center;
  justify-content: space-around;
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.stat-value {
  font-size: 40rpx;
  font-weight: 800;
  margin-bottom: 8rpx;
  font-family: 'SF Pro Display', sans-serif;
}

.stat-label {
  font-size: 22rpx;
  color: var(--text-muted);
}

.stat-divider {
  width: 2rpx;
  height: 50rpx;
  background: var(--glass-border);
}
</style>
