/**
 * 作业数据 - 静态版本（后续可改为云开发）
 * 
 * 乐谱图片建议尺寸：1200×400 或 1600×500（宽×高，约3:1比例）
 * 格式：PNG/JPEG，文件大小 < 200KB
 */

export interface Homework {
  id: string
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

// 【异步】获取乐谱图片（自动转换 cloud:// 为临时 URL）
export const getSheetImagesAsync = async (homework: Homework): Promise<string[]> => {
  const images = getSheetImages(homework)
  if (images.length === 0) return []

  // 检查是否有 cloud:// 开头的 fileID
  const cleanedImages = images.map(img => img.trim())
  const cloudImages = cleanedImages.filter(img => img.startsWith('cloud://'))
  
  if (cloudImages.length === 0) return cleanedImages

  // 通过云函数转换云存储 fileID 为临时 URL
  const urlMap = await getTempFileURLViaCloudFunction(cloudImages)

  // 替换原数组中的 cloud:// 为临时 URL
  return cleanedImages.map(img => urlMap[img] || img)
}

// 【异步】获取示范音频 URL（自动转换 cloud:// 为临时 URL）
export const getDemoAudioUrlAsync = async (homework: Homework): Promise<string | null> => {
  if (!homework.demoAudioUrl) return null

  const url = homework.demoAudioUrl.trim()
  
  // 如果不是云存储 URL，直接返回
  if (!url.startsWith('cloud://')) return url

  // 通过云函数转换云存储 fileID 为临时 URL
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

// 【云端】异步获取作业列表
export const fetchHomeworkListAsync = async (): Promise<Homework[]> => {
  // @ts-ignore
  if (!wx.cloud) {
    console.warn('云开发不可用，使用本地数据')
    return homeworkList
  }

  try {
    // @ts-ignore
    const db = wx.cloud.database()
    const res = await db.collection('homework')
      .where({ isPublished: true })
      .orderBy('createdAt', 'desc')
      .get()
    
    if (res.data && res.data.length > 0) {
      // 映射 _id 为 id
      return res.data.map((item: any) => ({
        ...item,
        id: item._id
      })) as Homework[]
    }
    console.warn('云端无数据，使用本地数据')
    return homeworkList
  } catch (e) {
    console.error('获取云端作业失败:', e)
    return homeworkList
  }
}

// 【云端】异步获取作业详情
export const fetchHomeworkByIdAsync = async (id: string): Promise<Homework | null> => {
  // @ts-ignore
  if (!wx.cloud) {
    return getHomeworkById(id) || null
  }

  try {
    // @ts-ignore
    const db = wx.cloud.database()
    // 云数据库的 _id 字段
    const res = await db.collection('homework').where({ _id: id }).get()
    
    if (res.data && res.data.length > 0) {
      const data = res.data[0]
      return {
        ...data,
        id: data._id
      } as Homework
    }
    // 尝试本地数据作为回退
    return getHomeworkById(id) || null
  } catch (e) {
    console.error('获取云端作业详情失败:', e)
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

// 【云端】同步进度到云数据库
export const syncProgressToCloud = async (progress: HomeworkProgress): Promise<void> => {
  // @ts-ignore
  if (!wx.cloud) return

  try {
    // @ts-ignore
    const db = wx.cloud.database()
    const collection = db.collection('user_progress')
    
    // 查找是否已有记录
    const existing = await collection.where({
      homeworkId: progress.homeworkId
    }).get()
    
    if (existing.data && existing.data.length > 0) {
      // 更新现有记录
      await collection.doc(existing.data[0]._id).update({
        data: {
          ...progress,
          updatedAt: db.serverDate()
        }
      })
    } else {
      // 创建新记录
      await collection.add({
        data: {
          ...progress,
          createdAt: db.serverDate(),
          updatedAt: db.serverDate()
        }
      })
    }
    console.log('进度已同步到云端')
  } catch (e) {
    console.error('同步进度到云端失败:', e)
    throw e
  }
}

// 【云端】从云数据库获取进度
export const fetchProgressFromCloud = async (homeworkId: string): Promise<HomeworkProgress | null> => {
  // @ts-ignore
  if (!wx.cloud) return null

  try {
    // @ts-ignore
    const db = wx.cloud.database()
    const res = await db.collection('user_progress').where({
      homeworkId
    }).get()
    
    if (res.data && res.data.length > 0) {
      const data = res.data[0]
      return {
        homeworkId: data.homeworkId,
        completed: data.completed || false,
        practiceCount: data.practiceCount || 0,
        lastPracticeAt: data.lastPracticeAt,
        recordings: data.recordings || []
      }
    }
    return null
  } catch (e) {
    console.error('从云端获取进度失败:', e)
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
