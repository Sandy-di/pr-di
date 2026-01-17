<template>
  <view class="admin-page">
    <!-- 密码验证弹窗 -->
    <view v-if="!isAuthenticated" class="auth-overlay">
      <view class="auth-modal">
        <text class="auth-title">🔐 管理员验证</text>
        <text class="auth-desc">请输入管理密码</text>
        <input 
          v-model="password" 
          type="password" 
          class="password-input" 
          placeholder="请输入密码"
          @confirm="verifyPassword"
        />
        <view class="auth-actions">
          <view class="auth-btn cancel" @click="goBack">返回</view>
          <view class="auth-btn confirm" @click="verifyPassword">确认</view>
        </view>
        <text v-if="authError" class="auth-error">{{ authError }}</text>
      </view>
    </view>

    <!-- 管理内容（验证通过后显示） -->
    <template v-else>
      <!-- 顶部标题栏 -->
      <view class="header">
        <view class="header-left">
          <view class="action-btn back-btn" @click="goBack">
            <text class="back-icon">←</text>
          </view>
          <view class="action-btn add-btn" @click="showAddModal = true">
            <text>+ 新建</text>
          </view>
        </view>
        <text class="title">作业管理</text>
        <view class="header-placeholder"></view> <!-- 占位符保证标题居中 -->
      </view>

    <!-- 作业列表 -->
    <scroll-view class="homework-list" scroll-y>
      <view v-if="isLoading" class="loading">
        <text>加载中...</text>
      </view>
      
      <view v-else-if="homeworkList.length === 0" class="empty">
        <text>暂无作业，点击右上角添加</text>
      </view>
      
      <view 
        v-else
        v-for="hw in homeworkList" 
        :key="hw.id" 
        class="homework-card"
      >
        <view class="card-header">
          <text class="hw-title">{{ hw.title }}</text>
          <view class="difficulty-badge" :class="hw.difficulty">
            {{ difficultyText(hw.difficulty) }}
          </view>
        </view>
        
        <text class="hw-desc">{{ hw.description || '暂无描述' }}</text>
        
        <view class="card-info">
          <text class="info-item">📄 {{ hw.sheetImages?.length || 0 }} 张乐谱</text>
          <text class="info-item">🎵 {{ hw.demoAudioUrl ? '有示范' : '无示范' }}</text>
          <text class="info-item">📅 {{ formatDate(hw.createdAt) }}</text>
        </view>
        
        <view class="card-actions">
          <view class="action-btn edit" @click="editHomework(hw)">
            <text>编辑</text>
          </view>
          <view class="action-btn delete" @click="deleteHomework(hw)">
            <text>删除</text>
          </view>
        </view>
      </view>
    </scroll-view>

    <!-- 添加/编辑作业弹窗 -->
    <view v-if="showAddModal" class="modal-overlay" @click="closeModal">
      <view class="modal-content" @click.stop>
        <view class="modal-header">
          <text class="modal-title">{{ isEditing ? '编辑作业' : '新建作业' }}</text>
          <text class="close-btn" @click="closeModal">×</text>
        </view>
        
        <scroll-view class="modal-body" scroll-y>
          <!-- 标题 -->
          <view class="form-group">
            <text class="label">作业标题 *</text>
            <input 
              v-model="formData.title" 
              class="input" 
              placeholder="请输入作业标题"
            />
          </view>
          
          <!-- 描述 -->
          <view class="form-group">
            <text class="label">作业描述</text>
            <textarea 
              v-model="formData.description" 
              class="textarea" 
              placeholder="请输入作业描述（可选）"
            />
          </view>
          
          <!-- 难度 -->
          <view class="form-group">
            <text class="label">难度等级</text>
            <view class="difficulty-selector">
              <view 
                v-for="d in difficulties" 
                :key="d.value"
                class="diff-option"
                :class="{ active: formData.difficulty === d.value }"
                @click="formData.difficulty = d.value"
              >
                <text>{{ d.label }}</text>
              </view>
            </view>
          </view>
          
          <!-- 乐谱图片 -->
          <view class="form-group">
            <text class="label">乐谱图片</text>
            <view class="image-uploader">
              <view 
                v-for="(img, index) in formData.sheetImages" 
                :key="index"
                class="image-item"
              >
                <image :src="img" mode="aspectFill" class="preview-img" />
                <view class="remove-btn" @click="removeImage(index)">×</view>
              </view>
              <view class="upload-btn" @click="uploadSheetImage">
                <text>+</text>
                <text class="upload-text">上传图片</text>
              </view>
            </view>
          </view>
          
          <!-- 示范音频 -->
          <view class="form-group">
            <text class="label">示范音频</text>
            <view class="audio-uploader">
              <view v-if="formData.demoAudioUrl" class="audio-item">
                <text class="audio-name">已上传音频</text>
                <view class="audio-actions">
                  <text class="play-btn" @click="playDemoAudio">▶</text>
                  <text class="remove-btn" @click="removeAudio">×</text>
                </view>
              </view>
              <view v-else class="upload-btn" @click="uploadDemoAudio">
                <text>🎵</text>
                <text class="upload-text">上传音频</text>
              </view>
            </view>
          </view>
        </scroll-view>
        
        <view class="modal-footer">
          <view class="btn cancel" @click="closeModal">取消</view>
          <view class="btn confirm" @click="saveHomework">
            {{ isSaving ? '保存中...' : '保存' }}
          </view>
        </view>
      </view>
    </view>
    </template>
  </view>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { uploadToCOS } from '@/utils/cos-uploader'

interface Homework {
  id: string
  _id?: string
  title: string
  description?: string
  sheetImages?: string[]
  demoAudioUrl?: string
  difficulty: 'easy' | 'medium' | 'hard'
  isPublished?: boolean
  createdAt: string
}

const homeworkList = ref<Homework[]>([])
const isLoading = ref(false)
const showAddModal = ref(false)
const isEditing = ref(false)
const isSaving = ref(false)
const editingId = ref<string | null>(null)

// 密码验证相关
const isAuthenticated = ref(false)
const password = ref('')
const authError = ref('')
const ADMIN_PASSWORD = '17122123'  // 管理密码

// 验证密码
const verifyPassword = () => {
  if (password.value === ADMIN_PASSWORD) {
    isAuthenticated.value = true
    authError.value = ''
    // 验证成功后加载数据
    loadHomeworkList()
  } else {
    authError.value = '密码错误，请重试'
    password.value = ''
  }
}

// 返回上一页
const goBack = () => {
  uni.navigateBack()
}

const difficulties: { value: 'easy' | 'medium' | 'hard', label: string }[] = [
  { value: 'easy', label: '简单' },
  { value: 'medium', label: '中等' },
  { value: 'hard', label: '困难' }
]

const formData = reactive({
  title: '',
  description: '',
  difficulty: 'easy' as 'easy' | 'medium' | 'hard',
  sheetImages: [] as string[],       // 用于显示的 URL（临时URL或普通URL）
  sheetImageIds: [] as string[],     // 云存储 fileID（用于保存到数据库）
  demoAudioUrl: '',
  demoAudioId: ''                    // 云存储 fileID
})

let demoAudioContext: UniApp.InnerAudioContext | null = null

// 不再自动加载，改为验证成功后加载

// 加载作业列表
const loadHomeworkList = async () => {
  isLoading.value = true
  try {
    // @ts-ignore
    const db = wx.cloud.database()
    const res = await db.collection('homework')
      .orderBy('createdAt', 'desc')
      .get()
    
    homeworkList.value = res.data.map((item: any) => ({
      ...item,
      id: item._id
    }))
  } catch (e) {
    console.error('加载作业列表失败:', e)
    uni.showToast({ title: '加载失败', icon: 'none' })
  } finally {
    isLoading.value = false
  }
}

// 难度文字
const difficultyText = (d: string) => {
  const map: Record<string, string> = { easy: '简单', medium: '中等', hard: '困难' }
  return map[d] || d
}

// 格式化日期
const formatDate = (dateStr: string) => {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  return `${date.getMonth() + 1}/${date.getDate()}`
}

// 编辑作业
const editHomework = async (hw: Homework) => {
  isEditing.value = true
  editingId.value = hw.id
  formData.title = hw.title
  formData.description = hw.description || ''
  formData.difficulty = hw.difficulty
  
  // 保存原始 fileIDs
  formData.sheetImageIds = [...(hw.sheetImages || [])]
  
  // 转换 cloud:// 为临时 URL 用于显示
  const allImages = hw.sheetImages || []
  const cloudImages = allImages.filter(img => img && img.startsWith('cloud://'))
  
  if (cloudImages.length > 0) {
    try {
      // @ts-ignore
      const res = await wx.cloud.getTempFileURL({ fileList: cloudImages })
      const urlMap: Record<string, string> = {}
      res.fileList.forEach((item: any) => {
        if (item.tempFileURL) {
          urlMap[item.fileID] = item.tempFileURL
        }
      })
      // 只保留成功转换的图片，过滤掉 cloud:// 开头的
      formData.sheetImages = allImages.map(img => {
        if (img && img.startsWith('cloud://')) {
          return urlMap[img] || ''  // 转换失败则置空
        }
        return img
      }).filter(img => img && !img.startsWith('cloud://'))  // 过滤失败的
    } catch (e) {
      console.error('转换图片 URL 失败:', e)
      formData.sheetImages = []  // 转换失败，清空图片列表
      uni.showToast({ title: '图片加载失败', icon: 'none' })
    }
  } else {
    // 过滤掉可能的 cloud:// URL
    formData.sheetImages = allImages.filter(img => img && !img.startsWith('cloud://'))
  }
  
  // 示范音频
  formData.demoAudioId = hw.demoAudioUrl || ''
  if (hw.demoAudioUrl && hw.demoAudioUrl.startsWith('cloud://')) {
    try {
      // @ts-ignore
      const res = await wx.cloud.getTempFileURL({ fileList: [hw.demoAudioUrl] })
      formData.demoAudioUrl = res.fileList[0]?.tempFileURL || hw.demoAudioUrl
    } catch (e) {
      formData.demoAudioUrl = hw.demoAudioUrl
    }
  } else {
    formData.demoAudioUrl = hw.demoAudioUrl || ''
  }
  
  showAddModal.value = true
}

// 删除作业
const deleteHomework = (hw: Homework) => {
  uni.showModal({
    title: '确认删除',
    content: `确定要删除作业「${hw.title}」吗？`,
    success: async (res) => {
      if (res.confirm) {
        try {
          // @ts-ignore
          const db = wx.cloud.database()
          await db.collection('homework').doc(hw.id).remove()
          uni.showToast({ title: '删除成功', icon: 'success' })
          loadHomeworkList()
        } catch (e) {
          console.error('删除失败:', e)
          uni.showToast({ title: '删除失败', icon: 'none' })
        }
      }
    }
  })
}

// 上传相关
// 上传乐谱图片 (使用腾讯云 COS)
const uploadSheetImage = () => {
  uni.chooseImage({
    count: 9 - formData.sheetImages.length,
    success: async (res) => {
      uni.showLoading({ title: '上传中...' })
      
      let successCount = 0
      for (const filePath of res.tempFilePaths) {
        try {
          // 使用 COS 上传，返回公开访问 URL
          const publicUrl = await uploadToCOS(filePath, 'sheets', 'image.jpg')
          
          // 直接保存公开 URL（不再需要 fileID）
          formData.sheetImageIds.push(publicUrl)
          formData.sheetImages.push(publicUrl)
          successCount++
        } catch (e: any) {
          console.error('上传图片失败:', e)
          uni.showToast({ 
            title: e.message || '上传失败', 
            icon: 'none',
            duration: 3000
          })
        }
      }
      
      uni.hideLoading()
      if (successCount > 0) {
        uni.showToast({ title: `已上传 ${successCount} 张`, icon: 'success' })
      }
    },
    fail: (err) => {
      console.error('选择图片失败:', err)
    }
  })
}

// 移除图片
const removeImage = (index: number) => {
  formData.sheetImages.splice(index, 1)
  formData.sheetImageIds.splice(index, 1)
}

// 上传示范音频 (使用腾讯云 COS)
const uploadDemoAudio = () => {
  uni.chooseMessageFile({
    count: 1,
    type: 'file',
    extension: ['mp3', 'wav', 'm4a'],
    success: async (res) => {
      uni.showLoading({ title: '上传中...' })
      
      try {
        const file = res.tempFiles[0]
        
        // 使用 COS 上传，返回公开访问 URL
        const publicUrl = await uploadToCOS(file.path, 'demos', file.name)
        
        // 直接保存公开 URL
        formData.demoAudioId = publicUrl
        formData.demoAudioUrl = publicUrl
        
        uni.hideLoading()
        uni.showToast({ title: '上传成功', icon: 'success' })
      } catch (e: any) {
        uni.hideLoading()
        console.error('上传音频失败:', e)
        uni.showToast({ title: e.message || '上传失败', icon: 'none' })
      }
    }
  })
}

// 播放示范音频
const playDemoAudio = async () => {
  if (!formData.demoAudioUrl) return
  
  if (!demoAudioContext) {
    demoAudioContext = uni.createInnerAudioContext()
  }
  
  // 获取临时 URL
  let url = formData.demoAudioUrl
  if (url.startsWith('cloud://')) {
    // @ts-ignore
    const res = await wx.cloud.getTempFileURL({ fileList: [url] })
    url = res.fileList[0]?.tempFileURL || url
  }
  
  demoAudioContext.src = url
  demoAudioContext.play()
}

// 移除音频
const removeAudio = () => {
  formData.demoAudioUrl = ''
}

// 关闭弹窗
const closeModal = () => {
  showAddModal.value = false
  isEditing.value = false
  editingId.value = null
  resetForm()
}

// 重置表单
const resetForm = () => {
  formData.title = ''
  formData.description = ''
  formData.difficulty = 'easy'
  formData.sheetImages = []
  formData.sheetImageIds = []
  formData.demoAudioUrl = ''
  formData.demoAudioId = ''
}

// 保存作业
const saveHomework = async () => {
  if (!formData.title.trim()) {
    uni.showToast({ title: '请输入作业标题', icon: 'none' })
    return
  }
  
  isSaving.value = true
  
  try {
    // @ts-ignore
    const db = wx.cloud.database()
    
    const data = {
      title: formData.title.trim(),
      description: formData.description.trim(),
      difficulty: formData.difficulty,
      sheetImages: formData.sheetImageIds,      // 保存 fileIDs
      demoAudioUrl: formData.demoAudioId || formData.demoAudioUrl,  // 保存 fileID
      isPublished: true,
      updatedAt: db.serverDate()
    }
    
    if (isEditing.value && editingId.value) {
      // 更新
      await db.collection('homework').doc(editingId.value).update({ data })
      uni.showToast({ title: '更新成功', icon: 'success' })
    } else {
      // 新增
      await db.collection('homework').add({
        data: {
          ...data,
          createdAt: db.serverDate()
        }
      })
      uni.showToast({ title: '添加成功', icon: 'success' })
    }
    
    closeModal()
    loadHomeworkList()
  } catch (e) {
    console.error('保存失败:', e)
    uni.showToast({ title: '保存失败', icon: 'none' })
  } finally {
    isSaving.value = false
  }
}
</script>

<style scoped>
.admin-page {
  min-height: 100vh;
  background: #f5f5f5;
  padding-bottom: env(safe-area-inset-bottom);
}

/* 密码验证弹窗 */
.auth-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
}

.auth-modal {
  width: 80%;
  max-width: 600rpx;
  background: #fff;
  border-radius: 24rpx;
  padding: 48rpx;
  text-align: center;
  box-shadow: 0 20rpx 60rpx rgba(0,0,0,0.3);
}

.auth-title {
  font-size: 36rpx;
  font-weight: 700;
  color: #333;
  display: block;
  margin-bottom: 16rpx;
}

.auth-desc {
  font-size: 26rpx;
  color: #666;
  display: block;
  margin-bottom: 32rpx;
}

.password-input {
  width: 100%;
  height: 88rpx;
  padding: 0 24rpx;
  border: 2rpx solid #ddd;
  border-radius: 12rpx;
  font-size: 32rpx;
  text-align: center;
  box-sizing: border-box;
  margin-bottom: 32rpx;
}

.auth-actions {
  display: flex;
  gap: 24rpx;
}

.auth-btn {
  flex: 1;
  padding: 24rpx;
  border-radius: 12rpx;
  font-size: 28rpx;
}

.auth-btn.cancel {
  background: #f0f0f0;
  color: #666;
}

.auth-btn.confirm {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: #fff;
}

.auth-error {
  display: block;
  margin-top: 24rpx;
  color: #f44336;
  font-size: 24rpx;
}

/* 顶部标题栏 */
.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 40rpx 32rpx 24rpx;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.header-left {
  display: flex;
  align-items: center;
  gap: 20rpx;
  flex: 1;
}

.header-placeholder {
  flex: 1;
}

.action-btn {
  display: flex;
  align-items: center;
  justify-content: center;
}

.back-btn {
  padding: 8rpx 16rpx;
}

.back-icon {
  font-size: 40rpx;
  color: #fff;
}

.title {
  font-size: 36rpx;
  font-weight: 700;
  color: #fff;
  text-align: center;
}

.add-btn {
  padding: 12rpx 24rpx;
  background: rgba(255,255,255,0.2);
  border-radius: 24rpx;
  color: #fff;
  font-size: 26rpx;
}

.homework-list {
  height: calc(100vh - 120rpx);
  padding: 24rpx;
}

.loading, .empty {
  text-align: center;
  padding: 100rpx 0;
  color: #999;
}

.homework-card {
  background: #fff;
  border-radius: 16rpx;
  padding: 24rpx;
  margin-bottom: 24rpx;
  box-shadow: 0 2rpx 12rpx rgba(0,0,0,0.05);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12rpx;
}

.hw-title {
  font-size: 32rpx;
  font-weight: 600;
  color: #333;
}

.difficulty-badge {
  padding: 4rpx 16rpx;
  border-radius: 12rpx;
  font-size: 22rpx;
}

.difficulty-badge.easy { background: #e8f5e9; color: #4caf50; }
.difficulty-badge.medium { background: #fff3e0; color: #ff9800; }
.difficulty-badge.hard { background: #ffebee; color: #f44336; }

.hw-desc {
  font-size: 26rpx;
  color: #666;
  margin-bottom: 16rpx;
  display: block;
}

.card-info {
  display: flex;
  gap: 24rpx;
  margin-bottom: 16rpx;
}

.info-item {
  font-size: 24rpx;
  color: #999;
}

.card-actions {
  display: flex;
  gap: 16rpx;
  justify-content: flex-end;
}

.action-btn {
  padding: 12rpx 32rpx;
  border-radius: 8rpx;
  font-size: 26rpx;
}

.action-btn.edit {
  background: #e3f2fd;
  color: #2196f3;
}

.action-btn.delete {
  background: #ffebee;
  color: #f44336;
}

/* 弹窗样式 */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0,0,0,0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  width: 90%;
  max-height: 80vh;
  background: #fff;
  border-radius: 16rpx;
  display: flex;
  flex-direction: column;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 32rpx;
  border-bottom: 1px solid #eee;
}

.modal-title {
  font-size: 32rpx;
  font-weight: 600;
}

.close-btn {
  font-size: 48rpx;
  color: #999;
  line-height: 1;
}

.modal-body {
  flex: 1;
  padding: 32rpx;
  max-height: 60vh;
}

.form-group {
  margin-bottom: 32rpx;
}

.label {
  display: block;
  font-size: 28rpx;
  color: #333;
  margin-bottom: 12rpx;
}

.input {
  width: 100%;
  height: 80rpx;
  padding: 0 24rpx;
  border: 1px solid #ddd;
  border-radius: 8rpx;
  font-size: 28rpx;
  box-sizing: border-box;
  background: #fff;
  color: #333;
}

.textarea {
  width: 100%;
  height: 160rpx;
  padding: 20rpx 24rpx;
  border: 1px solid #ddd;
  border-radius: 8rpx;
  font-size: 28rpx;
  box-sizing: border-box;
  background: #fff;
  color: #333;
}

.difficulty-selector {
  display: flex;
  gap: 16rpx;
}

.diff-option {
  flex: 1;
  text-align: center;
  padding: 20rpx;
  border: 1px solid #ddd;
  border-radius: 8rpx;
  font-size: 26rpx;
  color: #666;
}

.diff-option.active {
  border-color: #667eea;
  background: #f0f4ff;
  color: #667eea;
}

.image-uploader {
  display: flex;
  flex-wrap: wrap;
  gap: 16rpx;
}

.image-item {
  position: relative;
  width: 160rpx;
  height: 160rpx;
}

.preview-img {
  width: 100%;
  height: 100%;
  border-radius: 8rpx;
}

.image-item .remove-btn {
  position: absolute;
  top: -10rpx;
  right: -10rpx;
  width: 40rpx;
  height: 40rpx;
  background: #f44336;
  color: #fff;
  border-radius: 50%;
  text-align: center;
  line-height: 40rpx;
  font-size: 28rpx;
}

.upload-btn {
  width: 160rpx;
  height: 160rpx;
  border: 2rpx dashed #ddd;
  border-radius: 8rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #999;
  font-size: 48rpx;
}

.upload-text {
  font-size: 22rpx;
  margin-top: 8rpx;
}

.audio-uploader {
  display: flex;
  align-items: center;
}

.audio-item {
  flex: 1;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20rpx 24rpx;
  background: #f5f5f5;
  border-radius: 8rpx;
}

.audio-name {
  font-size: 26rpx;
  color: #333;
}

.audio-actions {
  display: flex;
  gap: 24rpx;
}

.play-btn {
  color: #4caf50;
  font-size: 32rpx;
}

.audio-item .remove-btn {
  color: #f44336;
  font-size: 36rpx;
}

.modal-footer {
  display: flex;
  gap: 24rpx;
  padding: 24rpx 32rpx;
  border-top: 1px solid #eee;
}

.btn {
  flex: 1;
  text-align: center;
  padding: 24rpx;
  border-radius: 8rpx;
  font-size: 28rpx;
}

.btn.cancel {
  background: #f5f5f5;
  color: #666;
}

.btn.confirm {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: #fff;
}
</style>
