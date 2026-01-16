<script setup lang="ts">
import { onLaunch, onShow, onHide, onShareAppMessage, onShareTimeline } from '@dcloudio/uni-app'

onLaunch(() => {
  console.log('视唱练耳助手启动')
  
  // 初始化云开发环境
  // @ts-ignore
  if (wx.cloud) {
    // @ts-ignore
    wx.cloud.init({
      env: 'cloudbase-6g27fpr3ae127639',
      traceUser: true
    })
    console.log('云开发初始化成功')
  } else {
    console.error('云开发不可用')
  }
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
   神圣主题 - Divine Theme
   配色: 深邃蓝 #2c3e50 | 圣洁金 #d4af37 | 纯净白 #fcfcfc
   ======================================== */

page {
  color: #fcfcfc;
  
  /* 神圣配色 */
  --divine-blue: #2c3e50;
  --divine-gold: #d4af37;
  --divine-white: #fcfcfc;
  --divine-gold-light: #f4e4bc;
  
  /* 渐变 */
  --gold-gradient: linear-gradient(135deg, #d4af37 0%, #f4e4bc 100%);
  --blue-gradient: linear-gradient(135deg, #2c3e50 0%, #3d566e 100%);
  --divine-gradient: linear-gradient(180deg, #1a2634 0%, #2c3e50 100%);
  
  /* 背景 */
  --bg-dark: #1a2634;
  --bg-card: rgba(44, 62, 80, 0.6);
  --bg-card-hover: rgba(44, 62, 80, 0.85);
  
  /* 无边框设计 - 使用柔和阴影 */
  --glass-border: rgba(212, 175, 55, 0.15);
  --glass-blur: 20px;
  --glass-shadow: 0 8rpx 32rpx rgba(0, 0, 0, 0.25);
  
  /* 文字 */
  --text-primary: #fcfcfc;
  --text-secondary: rgba(252, 252, 252, 0.75);
  --text-muted: rgba(252, 252, 252, 0.45);
  --text-gold: #d4af37;
  
  /* 金色强调 */
  --accent-gold: #d4af37;
  --accent-gold-glow: rgba(212, 175, 55, 0.4);
  
  /* 状态色 */
  --success-color: #27ae60;
  --warning-color: #f39c12;
  --error-color: #e74c3c;
  
  /* 钢琴键 */
  --key-white: linear-gradient(180deg, #fcfcfc 0%, #e8e8e8 90%, #d0d0d0 100%);
  --key-white-pressed: linear-gradient(180deg, #d0d0d0 0%, #b8b8b8 100%);
  --key-black: linear-gradient(180deg, #2c3e50 0%, #1a2634 100%);
  --key-black-pressed: linear-gradient(180deg, #1a2634 0%, #0d1318 100%);
  
  /* 圆角 */
  --radius-sm: 8rpx;
  --radius-md: 16rpx;
  --radius-lg: 24rpx;
  --radius-xl: 32rpx;
  
  /* 阴影 - 柔和分层 */
  --shadow-sm: 0 2rpx 12rpx rgba(0, 0, 0, 0.15);
  --shadow-md: 0 6rpx 24rpx rgba(0, 0, 0, 0.2);
  --shadow-lg: 0 12rpx 40rpx rgba(0, 0, 0, 0.25);
  --shadow-gold: 0 0 24rpx rgba(212, 175, 55, 0.35);
  
  background: var(--divine-gradient);
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
  background: var(--divine-gradient);
}

.custom-navbar {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 88rpx;
  padding: 0 32rpx;
  background: var(--bg-dark);
  position: relative;
}

.navbar-title {
  font-size: 36rpx;
  font-weight: 600;
  color: var(--divine-white);
  letter-spacing: 2rpx;
}

/* 无边框卡片 - 柔和阴影分层 */
.card {
  background: var(--bg-card);
  backdrop-filter: blur(var(--glass-blur));
  -webkit-backdrop-filter: blur(var(--glass-blur));
  border-radius: var(--radius-xl);
  padding: 32rpx;
  margin: 24rpx;
  box-shadow: var(--shadow-md);
  border: none;
}

/* 按钮 */
.btn {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 88rpx;
  border-radius: var(--radius-lg);
  font-size: 32rpx;
  font-weight: 500;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  border: none;
}

.btn-primary {
  background: var(--gold-gradient);
  color: var(--divine-blue);
  box-shadow: var(--shadow-gold);
}

.btn-primary:active {
  transform: translateY(-4rpx);
  box-shadow: 0 8rpx 32rpx rgba(212, 175, 55, 0.5);
}

.btn-secondary {
  background: var(--bg-card);
  color: var(--divine-white);
  border: 1px solid var(--glass-border);
}

/* 动画 */
@keyframes goldenGlow {
  0%, 100% { box-shadow: 0 0 16rpx rgba(212, 175, 55, 0.3); }
  50% { box-shadow: 0 0 32rpx rgba(212, 175, 55, 0.6); }
}

@keyframes graceFloat {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-8rpx); }
}

@keyframes pulse {
  0%, 100% { transform: scale(1); opacity: 1; }
  50% { transform: scale(1.03); opacity: 0.9; }
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(16rpx); }
  to { opacity: 1; transform: translateY(0); }
}

.animate-golden-glow {
  animation: goldenGlow 2s ease-in-out infinite;
}

.animate-grace-float {
  animation: graceFloat 3s ease-in-out infinite;
}

.animate-pulse {
  animation: pulse 2s ease-in-out infinite;
}

.animate-fade-in {
  animation: fadeIn 0.4s cubic-bezier(0.2, 0.8, 0.2, 1);
}

/* 玻璃拟态 - 无边框设计 */
.glass {
  background: var(--bg-card);
  backdrop-filter: blur(var(--glass-blur));
  -webkit-backdrop-filter: blur(var(--glass-blur));
  box-shadow: var(--shadow-md);
  border: none;
}

/* 恩典上浮效果 */
.glass-hover {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.glass-hover:active {
  transform: translateY(-4rpx);
  box-shadow: var(--shadow-gold);
  background: var(--bg-card-hover);
}

/* 金色强调边框 */
.gold-accent {
  border-left: 3rpx solid var(--divine-gold);
}

/* 金色文字 */
.text-gold {
  color: var(--divine-gold);
}
</style>
