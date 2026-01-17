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
          <view class="card-glow" style="background: var(--divine-gold);"></view>
          <view class="feature-icon-box" style="background: rgba(212, 175, 55, 0.15); color: var(--divine-gold);">
            <svg-icon name="piano" size="48rpx" />
          </view>
          <text class="feature-title">自由弹奏</text>
          <text class="feature-desc">真实钢琴音色</text>
        </view>
        
        <view class="feature-card glass glass-hover" @click="navigateTo('/pages/homework-list/homework-list')">
          <view class="card-glow" style="background: var(--divine-gold);"></view>
          <view class="feature-icon-box" style="background: rgba(212, 175, 55, 0.15); color: var(--divine-gold);">
            <svg-icon name="music-note" size="48rpx" />
          </view>
          <text class="feature-title">作业练习</text>
          <text class="feature-desc">看谱弹奏录音</text>
        </view>
        
        <view class="feature-card glass glass-hover" @click="navigateTo('/pages/metronome/metronome')">
          <view class="card-glow" style="background: var(--divine-gold);"></view>
          <view class="feature-icon-box" style="background: rgba(212, 175, 55, 0.15); color: var(--divine-gold);">
            <svg-icon name="metronome" size="48rpx" />
          </view>
          <text class="feature-title">节拍器</text>
          <text class="feature-desc">跟拍练习录音</text>
        </view>
        
        <view class="feature-card glass glass-hover" @click="navigateTo('/pages/ear-training/ear-training')">
          <view class="card-glow" style="background: var(--divine-gold);"></view>
          <view class="feature-icon-box" style="background: rgba(212, 175, 55, 0.15); color: var(--divine-gold);">
            <svg-icon name="ear" size="48rpx" />
          </view>
          <text class="feature-title">视唱练耳</text>
          <text class="feature-desc">音程与音阶训练</text>
        </view>
        
        <view class="feature-card glass glass-hover" @click="navigateTo('/pages/recordings/recordings')">
          <view class="card-glow" style="background: var(--divine-gold);"></view>
          <view class="feature-icon-box" style="background: rgba(212, 175, 55, 0.15); color: var(--divine-gold);">
            <svg-icon name="mic" size="48rpx" />
          </view>
          <text class="feature-title">录音管理</text>
          <text class="feature-desc">查看练习记录</text>
        </view>
        
        <view class="feature-card glass glass-hover" @click="navigateTo('/pages/settings/settings')">
          <view class="card-glow" style="background: var(--divine-gold);"></view>
          <view class="feature-icon-box" style="background: rgba(212, 175, 55, 0.15); color: var(--divine-gold);">
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
            <text class="stat-label">练习量</text>
          </view>
          <view class="stat-divider"></view>
          <view class="stat-item">
            <text class="stat-value" style="color: var(--accent-purple);">{{ stats.recordCount }}</text>
            <text class="stat-label">录音数</text>
          </view>
          <view class="stat-divider"></view>
          <view class="stat-item">
            <text class="stat-value" style="color: var(--accent-orange);">{{ stats.streak }}%</text>
            <text class="stat-label">正确率</text>
          </view>
        </view>
      </view>
      <!-- 登录弹窗 -->
      <view v-if="showLoginModal" class="login-modal-overlay animate-fade-in">
        <view class="login-modal glass animate-slide-up">
          <view class="login-icon-large">
             <svg-icon name="user" size="80rpx" color="var(--divine-gold)" />
          </view>
          <text class="login-title">欢迎回来</text>
          <text class="login-desc">登录以同步您的练习记录和数据</text>
          
          <button class="login-btn-wechat" @click="handleLogin">
            <svg-icon name="wechat" size="40rpx" color="#fff" />
            <text>微信一键登录</text>
          </button>
          
          <text class="login-skip" @click="closeLoginModal">暂不登录</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { onShareAppMessage, onShow } from '@dcloudio/uni-app'
import SvgIcon from '@/components/SvgIcon.vue'
import UserService from '@/utils/user-service'

// 分享给好友
onShareAppMessage(() => ({
  title: '🎵 视唱练耳助手 - 提升你的音乐听力',
  path: '/pages/index/index',
  imageUrl: '/static/share-cover.jpg'
}))

// 状态栏高度
const statusBarHeight = ref(20)
const showLoginModal = ref(false)

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
})

onShow(() => {
  // 加载统计数据
  loadStats()
  
  // 检查登录状态
  checkLoginStatus()
})

const checkLoginStatus = () => {
  UserService.init()
  if (!UserService.isLoggedIn()) {
    // 稍微延迟显示，让页面先渲染
    setTimeout(() => {
      showLoginModal.value = true
    }, 500)
  }
}

const handleLogin = async () => {
  try {
    await UserService.login()
    uni.showToast({ title: '登录成功', icon: 'success' })
    showLoginModal.value = false
  } catch (err) {
    console.error('登录失败', err)
    uni.showToast({ title: '登录失败', icon: 'none' })
  }
}

const closeLoginModal = () => {
  showLoginModal.value = false
}

// 加载统计数据
const loadStats = () => {
  try {
    const savedStats = uni.getStorageSync('statistics')
    const recordings = uni.getStorageSync('recordings') || []
    
    if (savedStats) {
      // 显示练习总数
      const total = savedStats.totalPractices || 0
      stats.practiceTime = `${total}题`
      
      // 显示正确率
      const correct = savedStats.correctCount || 0
      if (total > 0) {
        stats.streak = Math.round((correct / total) * 100)
      }
    }
    
    // 录音数量
    stats.recordCount = recordings.length
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
  background: var(--divine-gradient);
}

.custom-navbar {
  height: 88rpx;
  background: rgba(26, 38, 52, 0.9);
  backdrop-filter: blur(20px);
  position: sticky;
  top: 0;
  z-index: 100;
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
  padding: 32rpx;
  padding-bottom: 180rpx;
}

/* 英雄横幅 */
.hero-banner {
  position: relative;
  height: 300rpx;
  background: linear-gradient(135deg, #2c3e50 0%, #3d566e 100%);
  border-radius: var(--radius-xl);
  margin-bottom: 48rpx;
  overflow: hidden;
  box-shadow: var(--shadow-gold);
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
}/* 登录弹窗样式 */
.login-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  z-index: 999;
  display: flex;
  align-items: flex-end; /* 底部弹出 */
  padding-bottom: 80rpx; /* 距离底部一点距离 */
  justify-content: center;
  backdrop-filter: blur(4px);
}

.login-modal {
  width: 680rpx;
  background: var(--bg-main);
  border-radius: 40rpx;
  padding: 60rpx 40rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  position: relative;
  box-shadow: 0 20rpx 50rpx rgba(0,0,0,0.5);
  border: 1px solid var(--divine-gold-alpha);
}

.login-icon-large {
  width: 160rpx;
  height: 160rpx;
  border-radius: 50%;
  background: rgba(212, 175, 55, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 40rpx;
  border: 2rpx solid var(--divine-gold);
  box-shadow: 0 0 30rpx rgba(212, 175, 55, 0.2);
}

.login-title {
  font-size: 40rpx;
  font-weight: 700;
  color: #fff;
  margin-bottom: 16rpx;
}

.login-desc {
  font-size: 28rpx;
  color: var(--text-muted);
  text-align: center;
  margin-bottom: 60rpx;
  max-width: 80%;
}

.login-btn-wechat {
  width: 100%;
  height: 96rpx;
  background: #07c160;
  border-radius: 48rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16rpx;
  color: #fff;
  font-size: 32rpx;
  font-weight: 600;
  margin-bottom: 32rpx;
  box-shadow: 0 8rpx 20rpx rgba(7, 193, 96, 0.3);
}

.login-btn-wechat:active {
  transform: scale(0.98);
}

.login-skip {
  font-size: 28rpx;
  color: var(--text-muted);
  padding: 20rpx;
}

/* 动画 */
.animate-slide-up {
  animation: slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(100rpx);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
