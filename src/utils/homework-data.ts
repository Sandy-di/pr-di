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

// 【异步】获取乐谱图片（自动转换 cloud:// 为临时 URL）
export const getSheetImagesAsync = async (homework: Homework): Promise<string[]> => {
  const images = getSheetImages(homework)
  if (images.length === 0) return []

  // 检查是否有 cloud:// 开头的 fileID
  // 注意：需要 trim() 去除可能的空白字符
  const cleanedImages = images.map(img => img.trim())
  const cloudImages = cleanedImages.filter(img => img.startsWith('cloud://'))
  
  if (cloudImages.length === 0) return cleanedImages

  // 转换云存储 fileID 为临时 URL
  try {
    // @ts-ignore
    const res = await wx.cloud.getTempFileURL({ fileList: cloudImages })
    const urlMap: Record<string, string> = {}
    res.fileList.forEach((item: any) => {
      if (item.tempFileURL) {
        urlMap[item.fileID] = item.tempFileURL
      }
    })

    // 替换原数组中的 cloud:// 为临时 URL
    return cleanedImages.map(img => urlMap[img] || img)
  } catch (e) {
    console.error('转换云存储 URL 失败:', e)
    return cleanedImages
  }
}

// 【异步】获取示范音频 URL（自动转换 cloud:// 为临时 URL）
export const getDemoAudioUrlAsync = async (homework: Homework): Promise<string | null> => {
  if (!homework.demoAudioUrl) return null

  const url = homework.demoAudioUrl.trim()
  
  // 如果不是云存储 URL，直接返回
  if (!url.startsWith('cloud://')) return url

  // 转换云存储 fileID 为临时 URL
  try {
    // @ts-ignore
    const res = await wx.cloud.getTempFileURL({ fileList: [url] })
    if (res.fileList[0]?.tempFileURL) {
      return res.fileList[0].tempFileURL
    }
    return url
  } catch (e) {
    console.error('获取示范音频 URL 失败:', e)
    return url
  }
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

// 获取作业进度
export const getHomeworkProgress = (homeworkId: string): HomeworkProgress | null => {
  try {
    const allProgress = uni.getStorageSync('homeworkProgress') || {}
    return allProgress[homeworkId] || null
  } catch {
    return null
  }
}

// 保存作业进度
export const saveHomeworkProgress = (progress: HomeworkProgress): void => {
  try {
    const allProgress = uni.getStorageSync('homeworkProgress') || {}
    allProgress[progress.homeworkId] = progress
    uni.setStorageSync('homeworkProgress', allProgress)
  } catch (e) {
    console.error('保存作业进度失败:', e)
  }
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
