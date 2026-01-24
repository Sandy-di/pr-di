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
      <!-- 用户信息卡片 -->
      <view class="user-card glass animate-fade-in">
        <!-- 未登录状态 -->
        <view v-if="!userInfo" class="login-prompt">
          <view class="login-icon-box">
            <svg-icon name="user" size="64rpx" color="var(--neu-gold)" />
          </view>
          <text class="login-text">登录后可同步练习记录</text>
          <view class="login-btn" @click="handleLogin">
            <svg-icon name="wechat" size="32rpx" color="#fff" />
            <text>微信一键登录</text>
          </view>
        </view>
        
        <!-- 已登录状态 -->
        <view v-else class="user-info">
          <image class="user-avatar" :src="userInfo.avatarUrl" mode="aspectFill" />
          <view class="user-details" @click="showEditName" hover-class="opacity-hover">
            <view class="user-name-row">
              <text class="user-name">{{ displayName }}</text>
              <text class="edit-hint">✎</text>
            </view>
            <text class="user-status">已登录</text>
          </view>
          <view class="logout-btn" @click="handleLogout">
            <text>退出</text>
          </view>
        </view>
      </view>
      
      <!-- 编辑用户名弹窗 -->
      <view v-if="showNameModal" class="modal-overlay" @click="showNameModal = false">
        <view class="modal-content glass" @click.stop>
          <text class="modal-title">修改用户名</text>
          <input 
            class="name-input" 
            v-model="newName" 
            placeholder="请输入新用户名"
            maxlength="20"
          />
          <view class="modal-actions">
            <view class="modal-btn cancel" @click="showNameModal = false">取消</view>
            <view class="modal-btn confirm" @click="saveName">确定</view>
          </view>
        </view>
      </view>

      <!-- 音频设置 -->
      <view class="setting-group glass animate-fade-in">
        <view class="group-header">
          <svg-icon name="piano" size="32rpx" color="var(--neu-gold)" />
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
            activeColor="#B8860B" 
            backgroundColor="rgba(174, 174, 192, 0.2)"
            block-size="20"
            block-color="#B8860B"
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
            color="#B8860B" 
            style="transform: scale(0.8)" 
          />
        </view>
      </view>
      
      <!-- 练耳设置 -->
      <view class="setting-group glass animate-fade-in" style="animation-delay: 0.1s">
        <view class="group-header">
          <svg-icon name="ear" size="32rpx" color="var(--neu-gold)" />
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
          <svg-icon name="chart" size="32rpx" color="var(--neu-gold)" />
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
      
      <!-- 老师专区 -->
      <view class="setting-group glass animate-fade-in" style="animation-delay: 0.25s">
        <view class="group-header">
          <svg-icon name="star" size="32rpx" color="var(--neu-gold)" />
          <text class="group-title">老师专区</text>
        </view>
        
        <view class="setting-item no-border" @click="goToAdmin">
          <text class="setting-label">作业管理</text>
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
import { ref, reactive, computed, onMounted } from 'vue'
import { onShareAppMessage } from '@dcloudio/uni-app'
import SvgIcon from '@/components/SvgIcon.vue'
import UserService, { type UserInfo } from '@/utils/user-service'

// 分享
onShareAppMessage(() => ({
  title: '🎵 视唱练耳助手 - 提升你的音乐听力',
  path: '/pages/index/index'
}))

const statusBarHeight = ref(20)
const userInfo = ref<UserInfo | null>(null)
const showNameModal = ref(false)
const newName = ref('')

const displayName = computed(() => {
  if (!userInfo.value) return '未登录'
  return userInfo.value.customName || userInfo.value.nickName || '微信用户'
})

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
  
  // 初始化用户服务
  UserService.init()
  userInfo.value = UserService.getUserInfo()
})

// 微信登录
const handleLogin = async () => {
  try {
    const info = await UserService.login()
    userInfo.value = info
    uni.showToast({ title: '登录成功', icon: 'success' })
  } catch (err) {
    console.error('登录失败:', err)
    uni.showToast({ title: '登录失败', icon: 'none' })
  }
}

// 登出
const handleLogout = () => {
  uni.showModal({
    title: '确认退出',
    content: '退出登录后不会清除本地数据',
    success: (res) => {
      if (res.confirm) {
        UserService.logout()
        userInfo.value = null
        uni.showToast({ title: '已退出', icon: 'success' })
      }
    }
  })
}

// 显示编辑名称弹窗
const showEditName = () => {
  newName.value = UserService.getDisplayName()
  showNameModal.value = true
}

// 保存用户名
const saveName = () => {
  if (newName.value.trim()) {
    const success = UserService.updateNickName(newName.value)
    if (success) {
      // 强制刷新用户信息以触发界面更新
      userInfo.value = { ...UserService.getUserInfo()! }
      showNameModal.value = false
      uni.showToast({ title: '已保存', icon: 'success' })
    }
  }
}

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

// 跳转到管理页面
const goToAdmin = () => {
  uni.navigateTo({ url: '/pages/admin/admin' })
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
  background: var(--bg-main);
  overflow-x: hidden;
  box-sizing: border-box;
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
  color: #FFFFFF;
  background: var(--neu-gold);
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

/* 用户信息卡片 */
.user-card {
  padding: 40rpx;
  border-radius: var(--radius-lg);
  margin-bottom: 32rpx;
  min-height: 180rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.login-prompt {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
}

.login-icon-box {
  width: 120rpx;
  height: 120rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-main);
  border-radius: 50%;
  margin-bottom: 24rpx;
  box-shadow: var(--neu-shadow-light), var(--neu-shadow-dark);
}

.login-text {
  font-size: 28rpx;
  color: var(--text-secondary);
  margin-bottom: 32rpx;
}

.login-btn {
  display: flex;
  align-items: center;
  gap: 16rpx;
  background: #07c160;
  padding: 20rpx 48rpx;
  border-radius: 40rpx;
  font-size: 28rpx;
  color: #fff;
  font-weight: 600;
  box-shadow: 0 8rpx 20rpx rgba(7, 193, 96, 0.3);
  transition: transform 0.2s;
}

.login-btn:active {
  transform: scale(0.95);
}

.user-info {
  display: flex;
  align-items: center;
  width: 100%;
  gap: 32rpx;
}

.user-avatar {
  width: 120rpx;
  height: 120rpx;
  border-radius: 50%;
  border: 4rpx solid var(--neu-gold);
  background: var(--bg-main);
}

.user-details {
  flex: 1;
}

.user-name-row {
  display: flex;
  align-items: center;
  gap: 16rpx;
  margin-bottom: 8rpx;
}

.user-name {
  font-size: 36rpx;
  font-weight: 700;
  color: var(--text-primary);
}

.edit-hint {
  font-size: 32rpx;
  color: var(--neu-gold);
  opacity: 0.8;
}

.opacity-hover {
  opacity: 0.7;
}

.user-status {
  font-size: 24rpx;
  color: var(--neu-gold);
  background: rgba(184, 134, 11, 0.1);
  padding: 4rpx 12rpx;
  border-radius: 8rpx;
  display: inline-block;
}

.logout-btn {
  padding: 16rpx 32rpx;
  background: var(--bg-main);
  border-radius: 32rpx;
  font-size: 26rpx;
  color: var(--text-secondary);
  box-shadow: var(--neu-shadow-light), var(--neu-shadow-dark);
}

/* 弹窗样式 */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  z-index: 999;
  display: flex;
  align-items: center;
  justify-content: center;
  backdrop-filter: blur(4px);
}

.modal-content {
  width: 600rpx;
  background: var(--bg-main);
  border-radius: 32rpx;
  padding: 48rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  box-shadow: 
    -10rpx -10rpx 30rpx #FFFFFF,
    10rpx 10rpx 30rpx rgba(174, 174, 192, 0.5);
}

.modal-title {
  font-size: 36rpx;
  font-weight: 700;
  color: var(--text-primary);
  margin-bottom: 40rpx;
}

.name-input {
  width: 100%;
  height: 88rpx;
  background: var(--bg-main);
  border: none;
  border-radius: 16rpx;
  padding: 0 24rpx;
  color: var(--text-primary);
  font-size: 32rpx;
  margin-bottom: 48rpx;
  box-sizing: border-box;
  text-align: center;
  box-shadow: var(--neu-shadow-inset-light), var(--neu-shadow-inset-dark);
}

.modal-actions {
  display: flex;
  gap: 32rpx;
  width: 100%;
}

.modal-btn {
  flex: 1;
  height: 88rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 44rpx;
  font-size: 32rpx;
  font-weight: 600;
}

.modal-btn.cancel {
  background: var(--bg-main);
  color: var(--text-secondary);
  box-shadow: var(--neu-shadow-light), var(--neu-shadow-dark);
}

.modal-btn.confirm {
  background: var(--gold-gradient);
  color: #FFFFFF;
  box-shadow: var(--shadow-gold);
}

.group-header {
  display: flex;
  align-items: center;
  gap: 16rpx;
  padding: 24rpx 0;
  border-bottom: 2rpx solid rgba(174, 174, 192, 0.2);
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
  border-bottom: 2rpx solid rgba(174, 174, 192, 0.1);
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
  background: var(--bg-main);
  border-radius: 32rpx;
  margin-bottom: 24rpx;
  box-shadow: var(--neu-shadow-light), var(--neu-shadow-dark);
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
