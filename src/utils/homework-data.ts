import { request } from './api-client'

/**
 * 作业数据 - 静态版本（后续可改为云开发）
 * 
 * 乐谱图片建议尺寸：1200×400 或 1600×500（宽×高，约3:1比例）
 * 格式：PNG/JPEG，文件大小 < 200KB
 */

export interface Homework {
  id: string
  _id?: string // MongoDB ID
  title: string
  description?: string
  sheetImageUrl?: string       // 单页乐谱图片（兼容旧数据）
  sheetImages?: string[]       // 多页乐谱图片数组（支持翻页）
  demoAudioUrl?: string        // 示范音频 URL
  difficulty: 'easy' | 'medium' | 'hard'
  createdAt: string
}

// 获取乐谱图片数组（兼容单页和多页）
export const getSheetImages = (homework: Homework): string[] => {
  if (homework.sheetImages && homework.sheetImages.length > 0) {
    return homework.sheetImages
  }
  if (homework.sheetImageUrl) {
    return [homework.sheetImageUrl]
  }
  return []
}

// 【通用】通过云函数获取临时文件 URL（绕过存储权限限制）
const getTempFileURLViaCloudFunction = async (fileList: string[]): Promise<Record<string, string>> => {
  const urlMap: Record<string, string> = {}
  
  if (fileList.length === 0) return urlMap
  
  try {
    // 优先使用云函数（可绕过存储权限）
    // @ts-ignore
    const res = await wx.cloud.callFunction({
      name: 'getTempFileURL',
      data: { fileList }
    })
    
    if (res.result?.success && res.result.fileList) {
      res.result.fileList.forEach((item: any) => {
        if (item.tempFileURL) {
          urlMap[item.fileID] = item.tempFileURL
        }
      })
    }
  } catch (e) {
    console.warn('云函数获取临时URL失败，尝试客户端API:', e)
    
    // 降级使用客户端 API（可能因权限问题失败）
    try {
      // @ts-ignore
      const res = await wx.cloud.getTempFileURL({ fileList })
      res.fileList.forEach((item: any) => {
        if (item.tempFileURL) {
          urlMap[item.fileID] = item.tempFileURL
        }
      })
    } catch (e2) {
      console.error('客户端获取临时URL也失败:', e2)
    }
  }
  
  return urlMap
}

// 【异步】获取乐谱图片
// 新上传的使用 COS 公开 URL，旧的使用 cloud:// 需要转换
export const getSheetImagesAsync = async (homework: Homework): Promise<string[]> => {
  const images = getSheetImages(homework)
  if (images.length === 0) return []

  const cleanedImages = images.map(img => img.trim())
  
  // COS URL 或 HTTPS URL 直接使用，只处理 cloud:// 开头的旧数据
  const cloudImages = cleanedImages.filter(img => img.startsWith('cloud://'))
  
  if (cloudImages.length === 0) return cleanedImages

  // 尝试转换旧的 cloud:// URL（可能会因权限问题失败）
  const urlMap = await getTempFileURLViaCloudFunction(cloudImages)
  return cleanedImages.map(img => urlMap[img] || img)
}

// 【异步】获取示范音频 URL
// 新上传的使用 COS 公开 URL，旧的使用 cloud:// 需要转换
export const getDemoAudioUrlAsync = async (homework: Homework): Promise<string | null> => {
  if (!homework.demoAudioUrl) return null

  const url = homework.demoAudioUrl.trim()
  
  // COS URL 或 HTTPS URL 直接返回
  if (!url.startsWith('cloud://')) return url

  // 尝试转换旧的 cloud:// URL（可能会因权限问题失败）
  const urlMap = await getTempFileURLViaCloudFunction([url])
  return urlMap[url] || url
}

export interface HomeworkProgress {
  homeworkId: string
  completed: boolean
  practiceCount: number
  lastPracticeAt?: string
  recordings: string[]       // 录音文件路径
}

// 静态作业数据（后续迁移到云开发）
export const homeworkList: Homework[] = [
  {
    id: 'hw001',
    title: '小星星',
    description: '入门练习曲，适合初学者',
    sheetImages: [],  // TODO: 配置云存储 URL
    difficulty: 'easy',
    createdAt: '2026-01-15'
  },
  {
    id: 'hw002',
    title: '欢乐颂',
    description: '贝多芬第九交响曲主题',
    sheetImages: [],  // TODO: 配置云存储 URL
    difficulty: 'easy',
    createdAt: '2026-01-15'
  },
  {
    id: 'hw003',
    title: '两只老虎',
    description: '经典儿歌，节奏明快',
    sheetImages: [],  // TODO: 配置云存储 URL
    difficulty: 'easy',
    createdAt: '2026-01-15'
  }
]

// 获取作业列表（本地静态数据，作为备用）
export const getHomeworkList = (): Homework[] => {
  return homeworkList
}

// 根据 ID 获取作业（本地静态数据）
export const getHomeworkById = (id: string): Homework | undefined => {
  return homeworkList.find(hw => hw.id === id)
}

// 【API】异步获取作业列表
export const fetchHomeworkListAsync = async (): Promise<Homework[]> => {
  try {
    const res = await request<Homework[]>('/homeworks')
    // 确保 id 字段存在
    return res.map((item: any) => ({
      ...item,
      id: item._id || item.id
    }))
  } catch (e) {
    console.error('获取作业失败:', e)
    return []
  }
}

// 【API】异步获取作业详情
export const fetchHomeworkByIdAsync = async (id: string): Promise<Homework | null> => {
  try {
    const res = await request<Homework>(`/homeworks/${id}`)
    return {
      ...res,
      id: res._id || res.id
    }
  } catch (e) {
    console.error('获取作业详情失败:', e)
    return getHomeworkById(id) || null
  }
}

// 获取作业进度（本地）
export const getHomeworkProgress = (homeworkId: string): HomeworkProgress | null => {
  try {
    const allProgress = uni.getStorageSync('homeworkProgress') || {}
    return allProgress[homeworkId] || null
  } catch {
    return null
  }
}

// 保存作业进度（本地 + 云端）
export const saveHomeworkProgress = (progress: HomeworkProgress): void => {
  try {
    // 保存到本地
    const allProgress = uni.getStorageSync('homeworkProgress') || {}
    allProgress[progress.homeworkId] = progress
    uni.setStorageSync('homeworkProgress', allProgress)
    
    // 异步同步到云端（不阻塞）
    syncProgressToCloud(progress).catch(e => {
      console.warn('云端同步失败（稍后重试）:', e)
    })
  } catch (e) {
    console.error('保存作业进度失败:', e)
  }
}

// 【API】同步进度到后端
export const syncProgressToCloud = async (progress: HomeworkProgress): Promise<void> => {
  try {
    await request('/progress', 'POST', progress)
    console.log('进度已同步到后端')
  } catch (e) {
    console.error('同步进度失败:', e)
    throw e
  }
}

// 【API】从后端获取进度
export const fetchProgressFromCloud = async (homeworkId: string): Promise<HomeworkProgress | null> => {
  try {
    const res = await request<any>(`/progress/${homeworkId}`)
    if (res && res.homeworkId) {
      return {
        homeworkId: res.homeworkId,
        completed: res.completed || false,
        practiceCount: res.practiceCount || 0,
        lastPracticeAt: res.lastPracticeAt,
        recordings: res.recordings || []
      }
    }
    return null
  } catch (e) {
    console.error('从后端获取进度失败:', e)
    return null
  }
}

// 【异步】获取作业进度（优先云端，回退本地）
export const getHomeworkProgressAsync = async (homeworkId: string): Promise<HomeworkProgress | null> => {
  // 先尝试从云端获取
  const cloudProgress = await fetchProgressFromCloud(homeworkId)
  if (cloudProgress) {
    // 更新本地缓存
    const allProgress = uni.getStorageSync('homeworkProgress') || {}
    allProgress[homeworkId] = cloudProgress
    uni.setStorageSync('homeworkProgress', allProgress)
    return cloudProgress
  }
  
  // 回退到本地
  return getHomeworkProgress(homeworkId)
}

// 标记作业完成
export const markHomeworkComplete = (homeworkId: string): void => {
  const progress = getHomeworkProgress(homeworkId) || {
    homeworkId,
    completed: false,
    practiceCount: 0,
    recordings: []
  }
  progress.completed = true
  progress.lastPracticeAt = new Date().toISOString()
  saveHomeworkProgress(progress)
}

// 增加练习次数
export const incrementPracticeCount = (homeworkId: string): void => {
  const progress = getHomeworkProgress(homeworkId) || {
    homeworkId,
    completed: false,
    practiceCount: 0,
    recordings: []
  }
  progress.practiceCount++
  progress.lastPracticeAt = new Date().toISOString()
  saveHomeworkProgress(progress)
}
