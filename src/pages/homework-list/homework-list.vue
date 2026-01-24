<template>
  <view class="homework-page">
    <!-- 导航栏 -->
    <view class="navbar" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="navbar-content">
        <text class="navbar-title">📚 作业练习</text>
        <view class="navbar-badge">{{ completedCount }}/{{ homeworkList.length }}</view>
      </view>
    </view>

    <!-- 作业列表 -->
    <scroll-view class="content" scroll-y>
      <view class="homework-list">
        <view 
          v-for="homework in homeworkList" 
          :key="homework.id"
          class="homework-card glass glass-hover"
          @click="goToPractice(homework.id)"
        >
          <!-- 难度标签 -->
          <view class="difficulty-tag" :class="homework.difficulty">
            {{ difficultyLabel[homework.difficulty] }}
          </view>
          
          <!-- 作业信息 -->
          <view class="homework-info">
            <text class="homework-title">{{ homework.title }}</text>
            <text class="homework-desc" v-if="homework.description">{{ homework.description }}</text>
            
            <!-- 进度信息 -->
            <view class="homework-progress" v-if="getProgress(homework.id)">
              <text class="progress-text">
                练习 {{ getProgress(homework.id)?.practiceCount || 0 }} 次
              </text>
              <view v-if="getProgress(homework.id)?.completed" class="completed-badge">
                ✓ 已完成
              </view>
            </view>
          </view>
          
          <!-- 箭头 -->
          <view class="arrow-icon">→</view>
        </view>
      </view>
      
      <!-- 空状态 -->
      <view v-if="homeworkList.length === 0" class="empty-state">
        <text class="empty-icon">📭</text>
        <text class="empty-text">暂无作业</text>
      </view>
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { onShow, onShareAppMessage } from '@dcloudio/uni-app'
import { fetchHomeworkListAsync, getHomeworkProgress, type Homework, type HomeworkProgress } from '@/utils/homework-data'

onShareAppMessage(() => ({
  title: '📚 作业练习 - 视唱练耳助手',
  path: '/pages/homework-list/homework-list'
}))

const statusBarHeight = ref(20)
const homeworkList = ref<Homework[]>([])
const progressMap = ref<Record<string, HomeworkProgress | null>>({})
const isLoading = ref(false)

const difficultyLabel: Record<string, string> = {
  easy: '入门',
  medium: '进阶',
  hard: '挑战'
}

// 返回上一页或首页
const goBack = () => {
  const pages = getCurrentPages()
  if (pages.length > 1) {
    uni.navigateBack()
  } else {
    uni.switchTab({ url: '/pages/index/index' })
  }
}

const completedCount = computed(() => {
  return Object.values(progressMap.value).filter(p => p?.completed).length
})

onMounted(() => {
  const windowInfo = uni.getWindowInfo()
  statusBarHeight.value = windowInfo.statusBarHeight || 20
})

onShow(() => {
  loadHomework()
})

const loadHomework = async () => {
  isLoading.value = true
  try {
    // 优先从云端获取，失败则使用本地数据
    homeworkList.value = await fetchHomeworkListAsync()
    
    // 加载所有进度
    homeworkList.value.forEach(hw => {
      progressMap.value[hw.id] = getHomeworkProgress(hw.id)
    })
  } finally {
    isLoading.value = false
  }
}

const getProgress = (id: string): HomeworkProgress | null => {
  return progressMap.value[id] || null
}

const goToPractice = (id: string) => {
  uni.navigateTo({
    url: `/pages/homework-practice/homework-practice?id=${id}`
  })
}
</script>

<style scoped>
.homework-page {
  min-height: 100vh;
  background: var(--bg-main);
  display: flex;
  flex-direction: column;
}

.navbar {
  background: var(--bg-main);
  padding-bottom: 16rpx;
}

.navbar-content {
  display: flex;
  align-items: center;
  gap: 16rpx;
  height: 88rpx;
  padding: 0 24rpx;
}

.back-btn {
  width: 60rpx;
  height: 60rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-main);
  border-radius: 50%;
  color: var(--text-primary);
  font-size: 32rpx;
  box-shadow: var(--neu-shadow-light), var(--neu-shadow-dark);
}

.navbar-title {
  font-size: 36rpx;
  font-weight: 600;
  color: var(--text-primary);
  flex: 1;
}

.navbar-badge {
  font-size: 24rpx;
  background: var(--neu-gold);
  color: #FFFFFF;
  padding: 4rpx 16rpx;
  border-radius: 20rpx;
  font-weight: 600;
}

.content {
  flex: 1;
  padding: 32rpx;
}

.homework-list {
  display: flex;
  flex-direction: column;
  gap: 24rpx;
}

.homework-card {
  display: flex;
  align-items: center;
  padding: 32rpx;
  border-radius: 24rpx;
  position: relative;
  gap: 24rpx;
  background: var(--bg-main);
  box-shadow: var(--neu-shadow-light), var(--neu-shadow-dark);
}

.difficulty-tag {
  position: absolute;
  top: 0;
  left: 32rpx;
  padding: 8rpx 20rpx;
  border-radius: 0 0 12rpx 12rpx;
  font-size: 22rpx;
  font-weight: 600;
}

.difficulty-tag.easy {
  background: rgba(34, 197, 94, 0.8);
  color: #fff;
}

.difficulty-tag.medium {
  background: rgba(234, 179, 8, 0.8);
  color: #000;
}

.difficulty-tag.hard {
  background: rgba(239, 68, 68, 0.8);
  color: #fff;
}

.homework-info {
  flex: 1;
  padding-top: 24rpx;
}

.homework-title {
  font-size: 34rpx;
  font-weight: 700;
  color: var(--text-primary);
  display: block;
  margin-bottom: 8rpx;
}

.homework-desc {
  font-size: 26rpx;
  color: var(--text-muted);
  display: block;
  margin-bottom: 16rpx;
}

.homework-progress {
  display: flex;
  align-items: center;
  gap: 16rpx;
}

.progress-text {
  font-size: 24rpx;
  color: var(--text-secondary);
}

.completed-badge {
  font-size: 22rpx;
  color: #22c55e;
  background: rgba(34, 197, 94, 0.15);
  padding: 4rpx 12rpx;
  border-radius: 8rpx;
}

.arrow-icon {
  font-size: 32rpx;
  color: var(--neu-gold);
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 120rpx 0;
}

.empty-icon {
  font-size: 100rpx;
  margin-bottom: 24rpx;
}

.empty-text {
  font-size: 32rpx;
  color: var(--text-muted);
}
</style>
