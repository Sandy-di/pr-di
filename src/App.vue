<script setup lang="ts">
import { onLaunch, onShow, onHide, onShareAppMessage, onShareTimeline } from '@dcloudio/uni-app'

onLaunch(() => {
  console.log('视唱练耳助手启动')
  
  // 云开发已弃用，改用自建后端
  // 如需恢复云开发，取消以下注释
  /*
  if (wx.cloud) {
    wx.cloud.init({
      env: 'cloudbase-6g27fpr3ae127639',
      traceUser: true
    })
    console.log('云开发初始化成功')
  }
  */
})

onShow(() => {
  console.log('App Show')
})

onHide(() => {
  console.log('App Hide')
})
</script>

<style>
/* ========================================
   新拟物主题 - Neumorphism Theme
   配色: 柔和灰白 #F0F0F3 | 暗金 #B8860B | 深灰文字 #2D2D2D
   ======================================== */

page {
  color: #2D2D2D;
  
  /* 新拟物配色 */
  --neu-bg: #F0F0F3;
  --neu-bg-dark: #E4E4E7;
  --neu-white: #FFFFFF;
  --neu-gold: #B8860B;
  --neu-gold-light: #D4AF37;
  --neu-gold-dark: #8B6914;
  
  /* 向后兼容 - 深色主题变量（保留给特殊页面如钢琴/节拍器） */
  --bg-dark: #0A0A0F;
  --divine-gold: #B8860B;
  --divine-gold-light: #D4AF37;
  --divine-blue: #1E3A5F;
  
  /* 渐变 */
  --gold-gradient: linear-gradient(145deg, #D4AF37, #B8860B);
  --neu-gradient: linear-gradient(145deg, #FAFAFA, #E8E8E8);
  
  /* 背景 */
  --bg-main: #F0F0F3;
  --bg-card: #F0F0F3;
  --bg-card-pressed: #E8E8EB;
  
  /* 新拟物阴影 - 核心效果 */
  --neu-shadow-light: -8rpx -8rpx 20rpx #FFFFFF;
  --neu-shadow-dark: 8rpx 8rpx 20rpx rgba(174, 174, 192, 0.4);
  --neu-shadow-inset-light: inset -4rpx -4rpx 10rpx #FFFFFF;
  --neu-shadow-inset-dark: inset 4rpx 4rpx 10rpx rgba(174, 174, 192, 0.3);
  
  /* 金色阴影 */
  --shadow-gold: 0 4rpx 16rpx rgba(184, 134, 11, 0.25);
  --shadow-gold-glow: 0 0 20rpx rgba(184, 134, 11, 0.3);
  
  /* 文字 - 深色系 */
  --text-primary: #2D2D2D;
  --text-secondary: #5A5A5A;
  --text-muted: #8A8A8A;
  --text-gold: #B8860B;
  
  /* 强调色 */
  --accent-gold: #B8860B;
  --accent-blue: #4A90D9;
  --accent-purple: #8B5CF6;
  --accent-pink: #EC4899;
  --accent-cyan: #06B6D4;
  --accent-orange: #F59E0B;
  
  /* 状态色 */
  --success-color: #22C55E;
  --warning-color: #F59E0B;
  --error-color: #EF4444;
  
  /* 钢琴键 - 保持原样 */
  --key-white: linear-gradient(180deg, #FFFFFF 0%, #F0F0F0 90%, #E0E0E0 100%);
  --key-white-pressed: linear-gradient(180deg, #E0E0E0 0%, #D0D0D0 100%);
  --key-black: linear-gradient(180deg, #3D3D3D 0%, #1A1A1A 100%);
  --key-black-pressed: linear-gradient(180deg, #1A1A1A 0%, #0D0D0D 100%);
  
  /* 圆角 - 更大更柔和 */
  --radius-sm: 12rpx;
  --radius-md: 20rpx;
  --radius-lg: 28rpx;
  --radius-xl: 36rpx;
  
  background: var(--bg-main);
  font-family: 'PingFang SC', 'Noto Sans SC', -apple-system, BlinkMacSystemFont, sans-serif;
  font-size: 28rpx;
  line-height: 1.6;
}

.safe-area-top {
  padding-top: constant(safe-area-inset-top);
  padding-top: env(safe-area-inset-top);
}

.safe-area-bottom {
  padding-bottom: constant(safe-area-inset-bottom);
  padding-bottom: env(safe-area-inset-bottom);
}

.container {
  min-height: 100vh;
  background: var(--bg-main);
}

/* 新拟物导航栏 */
.custom-navbar {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 88rpx;
  padding: 0 32rpx;
  background: var(--bg-main);
  position: relative;
}

.navbar-title {
  font-size: 36rpx;
  font-weight: 600;
  color: var(--text-primary);
  letter-spacing: 2rpx;
}

/* ===== 新拟物卡片 - 凸起效果 ===== */
.card, .neu-card {
  background: var(--bg-card);
  border-radius: var(--radius-xl);
  padding: 32rpx;
  margin: 24rpx;
  box-shadow: var(--neu-shadow-light), var(--neu-shadow-dark);
  border: none;
}

/* ===== 新拟物凹陷卡片 ===== */
.neu-card-inset {
  background: var(--bg-card);
  border-radius: var(--radius-lg);
  padding: 24rpx;
  box-shadow: var(--neu-shadow-inset-light), var(--neu-shadow-inset-dark);
}

/* ===== 新拟物按钮 - 凸起 ===== */
.btn, .neu-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 88rpx;
  border-radius: var(--radius-lg);
  font-size: 32rpx;
  font-weight: 500;
  transition: all 0.15s ease;
  border: none;
  background: var(--bg-card);
  color: var(--text-primary);
  box-shadow: var(--neu-shadow-light), var(--neu-shadow-dark);
}

.btn:active, .neu-btn:active {
  box-shadow: var(--neu-shadow-inset-light), var(--neu-shadow-inset-dark);
}

/* ===== 金色主按钮 ===== */
.btn-primary, .neu-btn-gold {
  background: var(--gold-gradient);
  color: #FFFFFF;
  box-shadow: 
    -4rpx -4rpx 12rpx rgba(255, 255, 255, 0.6),
    4rpx 4rpx 12rpx rgba(184, 134, 11, 0.3);
}

.btn-primary:active, .neu-btn-gold:active {
  box-shadow: 
    inset 2rpx 2rpx 6rpx rgba(139, 105, 20, 0.4),
    inset -2rpx -2rpx 6rpx rgba(255, 255, 255, 0.3);
}

.btn-secondary {
  background: var(--bg-card);
  color: var(--text-primary);
}

/* ===== 动画 ===== */
@keyframes neuPulse {
  0%, 100% { 
    box-shadow: var(--neu-shadow-light), var(--neu-shadow-dark);
  }
  50% { 
    box-shadow: 
      -6rpx -6rpx 16rpx #FFFFFF,
      6rpx 6rpx 16rpx rgba(174, 174, 192, 0.5);
  }
}

@keyframes goldGlow {
  0%, 100% { box-shadow: var(--shadow-gold); }
  50% { box-shadow: var(--shadow-gold-glow); }
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(16rpx); }
  to { opacity: 1; transform: translateY(0); }
}

@keyframes pulse {
  0%, 100% { transform: scale(1); opacity: 1; }
  50% { transform: scale(1.03); opacity: 0.9; }
}

.animate-neu-pulse {
  animation: neuPulse 2s ease-in-out infinite;
}

.animate-gold-glow {
  animation: goldGlow 2s ease-in-out infinite;
}

.animate-fade-in {
  animation: fadeIn 0.4s cubic-bezier(0.2, 0.8, 0.2, 1);
}

.animate-pulse {
  animation: pulse 2s ease-in-out infinite;
}

/* 减少动画偏好 */
@media (prefers-reduced-motion: reduce) {
  .animate-neu-pulse,
  .animate-gold-glow,
  .animate-fade-in,
  .animate-pulse {
    animation: none;
  }
}

/* ===== 新拟物玻璃效果（兼容旧代码） ===== */
.glass {
  background: var(--bg-card);
  box-shadow: var(--neu-shadow-light), var(--neu-shadow-dark);
  border: none;
  border-radius: var(--radius-lg);
}

.glass-hover {
  transition: all 0.15s ease;
}

.glass-hover:active {
  box-shadow: var(--neu-shadow-inset-light), var(--neu-shadow-inset-dark);
}

/* ===== 金色强调 ===== */
.gold-accent {
  border-left: 4rpx solid var(--neu-gold);
}

.text-gold {
  color: var(--neu-gold);
}

/* ===== 图标容器 - 新拟物风格 ===== */
.neu-icon-box {
  width: 80rpx;
  height: 80rpx;
  border-radius: var(--radius-md);
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-card);
  box-shadow: var(--neu-shadow-light), var(--neu-shadow-dark);
  color: var(--neu-gold);
}

/* ===== 分隔线 ===== */
.neu-divider {
  height: 2rpx;
  background: linear-gradient(90deg, transparent, rgba(174, 174, 192, 0.3), transparent);
  margin: 24rpx 0;
}
</style>
