<template>
  <view class="container safe-area-top">
    <!-- 自定义导航栏 -->
    <view class="custom-navbar" :style="{ paddingTop: statusBarHeight + 'px' }">
      <text class="navbar-title">⚙️ 设置</text>
    </view>
    
    <!-- 设置列表 -->
    <scroll-view class="settings-list" scroll-y>
      <!-- 音频设置 -->
      <view class="settings-section">
        <text class="section-title">🔊 音频设置</text>
        
        <view class="setting-item">
          <text class="setting-label">主音量</text>
          <slider 
            :value="settings.volume * 100" 
            @change="changeVolume"
            activeColor="#667eea"
            backgroundColor="rgba(255,255,255,0.2)"
            block-size="20"
            class="volume-slider"
          />
          <text class="setting-value">{{ Math.round(settings.volume * 100) }}%</text>
        </view>
        
        <view class="setting-item">
          <text class="setting-label">节拍器音量</text>
          <slider 
            :value="settings.metronomeVolume * 100" 
            @change="changeMetronomeVolume"
            activeColor="#667eea"
            backgroundColor="rgba(255,255,255,0.2)"
            block-size="20"
            class="volume-slider"
          />
          <text class="setting-value">{{ Math.round(settings.metronomeVolume * 100) }}%</text>
        </view>
      </view>
      
      <!-- 钢琴设置 -->
      <view class="settings-section">
        <text class="section-title">🎹 钢琴设置</text>
        
        <view class="setting-item">
          <text class="setting-label">显示简谱</text>
          <switch :checked="settings.showNotation" @change="toggleNotation" color="#667eea" />
        </view>
        
        <view class="setting-item">
          <text class="setting-label">显示八度数</text>
          <picker :value="settings.octaveIndex" :range="octaveOptions" @change="changeOctaves">
            <view class="setting-picker">{{ octaveOptions[settings.octaveIndex] }} 组</view>
          </picker>
        </view>
      </view>
      
      <!-- 练耳设置 -->
      <view class="settings-section">
        <text class="section-title">👂 练耳设置</text>
        
        <view class="setting-item">
          <text class="setting-label">难度等级</text>
          <picker :value="settings.difficultyIndex" :range="difficultyOptions" @change="changeDifficulty">
            <view class="setting-picker">{{ difficultyOptions[settings.difficultyIndex] }}</view>
          </picker>
        </view>
        
        <view class="setting-item">
          <text class="setting-label">每日练习目标</text>
          <picker :value="settings.dailyGoalIndex" :range="dailyGoalOptions" @change="changeDailyGoal">
            <view class="setting-picker">{{ dailyGoalOptions[settings.dailyGoalIndex] }} 题</view>
          </picker>
        </view>
      </view>
      
      <!-- 数据管理 -->
      <view class="settings-section">
        <text class="section-title">📊 数据管理</text>
        
        <view class="setting-item clickable" @click="exportData">
          <text class="setting-label">导出练习数据</text>
          <text class="setting-arrow">›</text>
        </view>
        
        <view class="setting-item clickable danger" @click="clearData">
          <text class="setting-label">清除所有数据</text>
          <text class="setting-arrow">›</text>
        </view>
      </view>
      
      <!-- 关于 -->
      <view class="settings-section">
        <text class="section-title">ℹ️ 关于</text>
        
        <view class="setting-item clickable" @click="showHelp">
          <text class="setting-label">使用帮助</text>
          <text class="setting-arrow">›</text>
        </view>
        
        <view class="setting-item">
          <text class="setting-label">版本</text>
          <text class="setting-value">1.0.0</text>
        </view>
      </view>
      
      <!-- 底部说明 -->
      <view class="footer">
        <text class="footer-text">视唱练耳助手 🎵</text>
        <text class="footer-subtext">让音乐学习更简单</text>
      </view>
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import AudioManager from '@/utils/audio-manager'

const statusBarHeight = ref(20)

const settings = reactive({
  volume: 0.8,
  metronomeVolume: 0.5,
  showNotation: true,
  octaveIndex: 1,
  difficultyIndex: 1,
  dailyGoalIndex: 1
})

const octaveOptions = ['1', '2', '3']
const difficultyOptions = ['入门', '中级', '高级']
const dailyGoalOptions = ['5', '10', '20', '30']

onMounted(() => {
  const systemInfo = uni.getSystemInfoSync()
  statusBarHeight.value = systemInfo.statusBarHeight || 20
  loadSettings()
})

const loadSettings = () => {
  try {
    const saved = uni.getStorageSync('user_settings')
    if (saved) {
      Object.assign(settings, saved)
    }
  } catch (e) {
    console.error('加载设置失败:', e)
  }
}

const saveSettings = () => {
  try {
    uni.setStorageSync('user_settings', settings)
  } catch (e) {
    console.error('保存设置失败:', e)
  }
}

const changeVolume = (e: any) => {
  settings.volume = e.detail.value / 100
  AudioManager.setVolume(settings.volume)
  saveSettings()
}

const changeMetronomeVolume = (e: any) => {
  settings.metronomeVolume = e.detail.value / 100
  saveSettings()
}

const toggleNotation = (e: any) => {
  settings.showNotation = e.detail.value
  saveSettings()
}

const changeOctaves = (e: any) => {
  settings.octaveIndex = e.detail.value
  saveSettings()
}

const changeDifficulty = (e: any) => {
  settings.difficultyIndex = e.detail.value
  saveSettings()
}

const changeDailyGoal = (e: any) => {
  settings.dailyGoalIndex = e.detail.value
  saveSettings()
}

const exportData = () => {
  uni.showToast({ title: '功能开发中', icon: 'none' })
}

const clearData = () => {
  uni.showModal({
    title: '确认清除',
    content: '这将清除所有练习记录和录音，此操作不可恢复！',
    confirmText: '清除',
    confirmColor: '#ef4444',
    success: (res) => {
      if (res.confirm) {
        try {
          uni.clearStorageSync()
          uni.showToast({ title: '数据已清除', icon: 'success' })
        } catch (e) {
          uni.showToast({ title: '清除失败', icon: 'error' })
        }
      }
    }
  })
}

const showHelp = () => {
  uni.showModal({
    title: '使用帮助',
    content: '🎹 钢琴弹奏：点击或滑动琴键发声\n👂 视唱练耳：选择练习类型开始训练\n🎤 录音：在钢琴页面点击录音按钮\n📤 分享：录音列表中选择录音分享',
    showCancel: false,
    confirmText: '知道了'
  })
}
</script>

<style scoped>
.container {
  display: flex;
  flex-direction: column;
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

.settings-list {
  flex: 1;
  padding: 24rpx;
  padding-bottom: 180rpx;
}

.settings-section {
  background: #1a1a2e;
  border-radius: 24rpx;
  padding: 24rpx;
  margin-bottom: 24rpx;
}

.section-title {
  font-size: 30rpx;
  font-weight: 600;
  color: #ffffff;
  margin-bottom: 20rpx;
  display: block;
}

.setting-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20rpx 0;
  border-bottom: 2rpx solid rgba(255, 255, 255, 0.05);
}

.setting-item:last-child {
  border-bottom: none;
}

.setting-item.clickable {
  cursor: pointer;
}

.setting-item.clickable:active {
  opacity: 0.7;
}

.setting-item.danger .setting-label {
  color: #ef4444;
}

.setting-label {
  font-size: 28rpx;
  color: #ffffff;
  flex-shrink: 0;
}

.setting-value {
  font-size: 28rpx;
  color: #b0b0c0;
}

.setting-arrow {
  font-size: 36rpx;
  color: #6a6a7a;
}

.setting-picker {
  padding: 12rpx 24rpx;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 12rpx;
  font-size: 28rpx;
  color: #ffffff;
}

.volume-slider {
  flex: 1;
  margin: 0 24rpx;
}

.footer {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 60rpx 0;
}

.footer-text {
  font-size: 32rpx;
  font-weight: 600;
  color: #667eea;
  margin-bottom: 8rpx;
}

.footer-subtext {
  font-size: 24rpx;
  color: #6a6a7a;
}
</style>
