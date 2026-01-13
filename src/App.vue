<script setup lang="ts">
import { onLaunch, onShow, onHide, onShareAppMessage, onShareTimeline } from '@dcloudio/uni-app'

onLaunch(() => {
  console.log('视唱练耳助手启动')
})

onShow(() => {
  console.log('App Show')
})

onHide(() => {
  console.log('App Hide')
})
</script>

<style>
/* 全局样式变量 */
page {
  color: #ffffff;
  
  --primary-color: #667eea;
  --primary-gradient: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  --secondary-color: #f093fb;
  
  /* Glassmorphism System */
  --bg-dark: #0f0f1a;
  --bg-card: rgba(26, 26, 46, 0.6);
  --bg-card-hover: rgba(37, 37, 64, 0.8);
  --glass-border: rgba(255, 255, 255, 0.1);
  --glass-blur: 16px;
  --glass-shadow: 0 8rpx 32rpx rgba(0, 0, 0, 0.3);
  
  /* Text System */
  --text-primary: #ffffff;
  --text-secondary: rgba(255, 255, 255, 0.7);
  --text-muted: rgba(255, 255, 255, 0.4);
  
  /* Accent Colors */
  --accent-blue: #3B82F6;
  --accent-cyan: #06B6D4;
  --accent-pink: #EC4899;
  --accent-purple: #8B5CF6;
  --accent-orange: #F97316;
  
  --success-color: #10b981;
  --warning-color: #f59e0b;
  --error-color: #ef4444;
  
  /* Piano Keys */
  --key-white: linear-gradient(180deg, #ffffff 0%, #e8e8e8 100%);
  --key-white-pressed: linear-gradient(180deg, #d0d0d0 0%, #b8b8b8 100%);
  --key-black: linear-gradient(180deg, #2a2a2a 0%, #0a0a0a 100%);
  --key-black-pressed: linear-gradient(180deg, #1a1a1a 0%, #000000 100%);
  
  /* Spacing */
  --radius-sm: 8rpx;
  --radius-md: 16rpx;
  --radius-lg: 24rpx;
  --radius-xl: 32rpx;
  
  /* Shadows */
  --shadow-sm: 0 2rpx 8rpx rgba(0, 0, 0, 0.3);
  --shadow-md: 0 4rpx 16rpx rgba(0, 0, 0, 0.4);
  --shadow-lg: 0 8rpx 32rpx rgba(0, 0, 0, 0.5);
  --shadow-glow: 0 0 20rpx rgba(102, 126, 234, 0.4);
  
  background-color: #0f0f1a; /* 确保背景色生效 */
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', sans-serif;
  font-size: 28rpx;
  line-height: 1.5;
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
  background: #0f0f1a;
}

.custom-navbar {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 88rpx;
  padding: 0 32rpx;
  background: #1a1a2e;
  position: relative;
}

.navbar-title {
  font-size: 36rpx;
  font-weight: 600;
  color: #ffffff;
}

.card {
  background: #1a1a2e;
  border-radius: 24rpx;
  padding: 32rpx;
  margin: 24rpx;
  box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.4);
}

.btn {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 88rpx;
  border-radius: 16rpx;
  font-size: 32rpx;
  font-weight: 500;
  transition: all 0.2s ease;
}

.btn-primary {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  box-shadow: 0 0 20rpx rgba(102, 126, 234, 0.4);
}

.btn-secondary {
  background: #252540;
  color: #ffffff;
  border: 2rpx solid rgba(255, 255, 255, 0.1);
}

@keyframes pulse {
  0%, 100% { transform: scale(1); opacity: 1; }
  50% { transform: scale(1.05); opacity: 0.8; }
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(20rpx); }
  to { opacity: 1; transform: translateY(0); }
}

@keyframes float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-10rpx); }
}

@keyframes shine {
  0% { left: -100%; opacity: 0; }
  50% { opacity: 0.5; }
  100% { left: 100%; opacity: 0; }
}

.animate-pulse {
  animation: pulse 2s ease-in-out infinite;
}

.animate-fade-in {
  animation: fadeIn 0.4s cubic-bezier(0.2, 0.8, 0.2, 1);
}

.animate-float {
  animation: float 3s ease-in-out infinite;
}

/* Glassmorphism Utilities */
.glass {
  background: var(--bg-card);
  backdrop-filter: blur(var(--glass-blur));
  -webkit-backdrop-filter: blur(var(--glass-blur));
  border: 1px solid var(--glass-border);
  box-shadow: var(--glass-shadow);
}

.glass-hover {
  transition: all 0.3s ease;
}

.glass-hover:active {
  background: var(--bg-card-hover);
  transform: scale(0.98);
}
</style>
