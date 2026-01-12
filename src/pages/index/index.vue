<template>
  <view class="container safe-area-top">
    <!-- 自定义导航栏 -->
    <view class="custom-navbar" :style="{ paddingTop: statusBarHeight + 'px' }">
      <text class="navbar-title">🎵 视唱练耳助手</text>
    </view>
    
    <!-- 主内容区 -->
    <view class="content">
      <!-- 欢迎横幅 -->
      <view class="hero-banner animate-fade-in">
        <view class="hero-icon">🎹</view>
        <view class="hero-text">
          <text class="hero-title">开始今日练习</text>
          <text class="hero-subtitle">每天坚持，音乐之路更进一步</text>
        </view>
      </view>
      
      <!-- 功能入口 -->
      <view class="feature-grid">
        <view class="feature-card" @click="navigateTo('/pages/piano/piano')">
          <view class="feature-icon">🎹</view>
          <text class="feature-title">自由弹奏</text>
          <text class="feature-desc">真实钢琴音色</text>
        </view>
        
        <view class="feature-card" @click="navigateTo('/pages/ear-training/ear-training')">
          <view class="feature-icon">👂</view>
          <text class="feature-title">视唱练耳</text>
          <text class="feature-desc">音程与音阶训练</text>
        </view>
        
        <view class="feature-card" @click="navigateTo('/pages/recordings/recordings')">
          <view class="feature-icon">🎤</view>
          <text class="feature-title">录音管理</text>
          <text class="feature-desc">查看练习记录</text>
        </view>
        
        <view class="feature-card" @click="navigateTo('/pages/settings/settings')">
          <view class="feature-icon">⚙️</view>
          <text class="feature-title">设置</text>
          <text class="feature-desc">个性化配置</text>
        </view>
      </view>
      
      <!-- 快速开始 -->
      <view class="quick-start card">
        <text class="card-title">⚡ 快速开始</text>
        <view class="quick-actions">
          <view class="quick-btn" @click="navigateTo('/pages/piano/piano')">
            <text class="quick-btn-icon">🎹</text>
            <text class="quick-btn-text">弹奏练习</text>
          </view>
          <view class="quick-btn" @click="startRecording">
            <text class="quick-btn-icon">🎤</text>
            <text class="quick-btn-text">开始录音</text>
          </view>
        </view>
      </view>
      
      <!-- 今日统计 -->
      <view class="stats-card card">
        <text class="card-title">📊 今日统计</text>
        <view class="stats-row">
          <view class="stat-item">
            <text class="stat-value">{{ stats.practiceTime }}</text>
            <text class="stat-label">练习时长</text>
          </view>
          <view class="stat-divider"></view>
          <view class="stat-item">
            <text class="stat-value">{{ stats.recordCount }}</text>
            <text class="stat-label">录音数</text>
          </view>
          <view class="stat-divider"></view>
          <view class="stat-item">
            <text class="stat-value">{{ stats.streak }}</text>
            <text class="stat-label">连续天数</text>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'

// 状态栏高度
const statusBarHeight = ref(0)

// 统计数据
const stats = reactive({
  practiceTime: '0分钟',
  recordCount: 0,
  streak: 0
})

onMounted(() => {
  // 获取状态栏高度
  const systemInfo = uni.getSystemInfoSync()
  statusBarHeight.value = systemInfo.statusBarHeight || 20
  
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
  const tabBarPages = ['/pages/index/index', '/pages/piano/piano', '/pages/recordings/recordings', '/pages/settings/settings']
  
  // 检查是否是 tabBar 页面（不带参数时）
  const basePath = url.split('?')[0]
  if (tabBarPages.includes(basePath) && !url.includes('?')) {
    uni.switchTab({ url: basePath })
  } else {
    uni.navigateTo({ url })
  }
}

// 开始录音（跳转到钢琴页并自动开始录音）
// 注意：带参数时需要使用 reLaunch 或其他方式
const startRecording = () => {
  // 由于 switchTab 不支持参数，先跳转再通过事件触发
  uni.switchTab({ 
    url: '/pages/piano/piano',
    success: () => {
      // 使用全局事件或存储传递参数
      uni.setStorageSync('autoStartRecording', true)
    }
  })
}
</script>

<style scoped>
.container {
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

.content {
  padding: 24rpx;
  padding-bottom: 180rpx;
}

/* 英雄横幅 */
.hero-banner {
  display: flex;
  align-items: center;
  padding: 40rpx;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 32rpx;
  margin-bottom: 32rpx;
  box-shadow: 0 8rpx 32rpx rgba(102, 126, 234, 0.4);
}

.hero-icon {
  font-size: 80rpx;
  margin-right: 32rpx;
}

.hero-text {
  display: flex;
  flex-direction: column;
}

.hero-title {
  font-size: 40rpx;
  font-weight: 700;
  color: #ffffff;
  margin-bottom: 8rpx;
}

.hero-subtitle {
  font-size: 26rpx;
  color: rgba(255, 255, 255, 0.8);
}

/* 功能网格 */
.feature-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 24rpx;
  margin-bottom: 32rpx;
}

.feature-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 40rpx 24rpx;
  background: #1a1a2e;
  border-radius: 24rpx;
  box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.3);
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.feature-card:active {
  transform: scale(0.98);
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.2);
}

.feature-icon {
  font-size: 64rpx;
  margin-bottom: 16rpx;
}

.feature-title {
  font-size: 32rpx;
  font-weight: 600;
  color: #ffffff;
  margin-bottom: 8rpx;
}

.feature-desc {
  font-size: 24rpx;
  color: #b0b0c0;
}

/* 卡片通用样式 */
.card {
  background: #1a1a2e;
  border-radius: 24rpx;
  padding: 32rpx;
  margin-bottom: 24rpx;
  box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.3);
}

.card-title {
  font-size: 32rpx;
  font-weight: 600;
  color: #ffffff;
  margin-bottom: 24rpx;
}

/* 快速开始 */
.quick-actions {
  display: flex;
  gap: 24rpx;
}

.quick-btn {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 32rpx;
  background: linear-gradient(135deg, rgba(102, 126, 234, 0.2) 0%, rgba(118, 75, 162, 0.2) 100%);
  border: 2rpx solid rgba(102, 126, 234, 0.3);
  border-radius: 20rpx;
  transition: all 0.2s ease;
}

.quick-btn:active {
  background: linear-gradient(135deg, rgba(102, 126, 234, 0.4) 0%, rgba(118, 75, 162, 0.4) 100%);
  transform: scale(0.98);
}

.quick-btn-icon {
  font-size: 48rpx;
  margin-bottom: 12rpx;
}

.quick-btn-text {
  font-size: 28rpx;
  color: #ffffff;
}

/* 统计卡片 */
.stats-row {
  display: flex;
  align-items: center;
  justify-content: space-around;
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  flex: 1;
}

.stat-value {
  font-size: 44rpx;
  font-weight: 700;
  color: #667eea;
  margin-bottom: 8rpx;
}

.stat-label {
  font-size: 24rpx;
  color: #b0b0c0;
}

.stat-divider {
  width: 2rpx;
  height: 60rpx;
  background: rgba(255, 255, 255, 0.1);
}
</style>
