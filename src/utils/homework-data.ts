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

// 获取作业列表
export const getHomeworkList = (): Homework[] => {
  return homeworkList
}

// 根据 ID 获取作业
export const getHomeworkById = (id: string): Homework | undefined => {
  return homeworkList.find(hw => hw.id === id)
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
