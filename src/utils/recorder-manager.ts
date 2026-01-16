/**
 * 录音管理器
 * 封装微信小程序录音 API + 云存储上传
 */

export interface Recording {
  id: string
  name: string
  voicePath: string       // 本地临时路径
  cloudUrl?: string       // 云存储 URL（上传后）
  cloudFileId?: string    // 云存储文件 ID
  duration: number
  mode: 'voice-only' | 'mixed'
  practiceType?: string
  homeworkId?: string     // 关联的作业 ID
  createdAt: string
  score?: number
}

class RecorderService {
  private recorderManager: UniApp.RecorderManager | null = null
  private isRecording = false
  private isPaused = false
  private recordingMode: 'voice-only' | 'mixed' = 'voice-only'
  private startTime = 0
  private pausedDuration = 0
  
  // 回调函数
  private onStartCallback: (() => void) | null = null
  private onStopCallback: ((recording: Recording) => void) | null = null
  private onErrorCallback: ((error: any) => void) | null = null
  private onFrameCallback: ((buffer: ArrayBuffer) => void) | null = null
  
  /**
   * 初始化录音管理器
   */
  init(): void {
    this.recorderManager = uni.getRecorderManager()
    this.setupEventListeners()
  }
  
  /**
   * 设置事件监听
   */
  private setupEventListeners(): void {
    if (!this.recorderManager) return
    
    this.recorderManager.onStart(() => {
      this.isRecording = true
      this.isPaused = false
      this.startTime = Date.now()
      console.log('录音开始')
      this.onStartCallback?.()
    })
    
    this.recorderManager.onStop((res) => {
      this.isRecording = false
      this.isPaused = false
      console.log('录音停止:', res)
      
      const recording: Recording = {
        id: Date.now().toString(),
        name: `录音_${new Date().toLocaleString('zh-CN')}`,
        voicePath: res.tempFilePath,
        duration: res.duration,
        mode: this.recordingMode,
        createdAt: new Date().toISOString()
      }
      
      // 保存到本地存储
      this.saveRecording(recording)
      
      this.onStopCallback?.(recording)
    })
    
    this.recorderManager.onPause(() => {
      this.isPaused = true
      this.pausedDuration += Date.now() - this.startTime
      console.log('录音暂停')
    })
    
    this.recorderManager.onResume(() => {
      this.isPaused = false
      this.startTime = Date.now()
      console.log('录音继续')
    })
    
    this.recorderManager.onError((err) => {
      console.error('录音错误:', err)
      this.isRecording = false
      this.isPaused = false
      this.onErrorCallback?.(err)
    })
    
    // 帧数据回调（用于波形显示）
    this.recorderManager.onFrameRecorded?.((res) => {
      if (res.frameBuffer) {
        this.onFrameCallback?.(res.frameBuffer)
      }
    })
  }
  
  /**
   * 开始录音
   */
  start(options?: {
    mode?: 'voice-only' | 'mixed'
    duration?: number
    sampleRate?: number
  }): void {
    if (!this.recorderManager) {
      console.error('录音管理器未初始化')
      return
    }
    
    if (this.isRecording) {
      console.warn('已在录音中')
      return
    }
    
    this.recordingMode = options?.mode || 'voice-only'
    this.pausedDuration = 0
    
    const recordOptions: UniApp.RecorderManagerStartOptions = {
      duration: options?.duration || 300000, // 默认最长5分钟
      sampleRate: options?.sampleRate || 44100,
      numberOfChannels: 1,
      encodeBitRate: 128000,
      format: 'mp3',
      frameSize: 50 // 用于实时波形
    }
    
    this.recorderManager.start(recordOptions)
  }
  
  /**
   * 暂停录音
   */
  pause(): void {
    if (!this.recorderManager || !this.isRecording || this.isPaused) return
    this.recorderManager.pause()
  }
  
  /**
   * 继续录音
   */
  resume(): void {
    if (!this.recorderManager || !this.isRecording || !this.isPaused) return
    this.recorderManager.resume()
  }
  
  /**
   * 停止录音
   */
  stop(): void {
    if (!this.recorderManager || !this.isRecording) return
    this.recorderManager.stop()
  }
  
  /**
   * 获取录音状态
   */
  getStatus(): { isRecording: boolean; isPaused: boolean; duration: number } {
    let duration = this.pausedDuration
    if (this.isRecording && !this.isPaused) {
      duration += Date.now() - this.startTime
    }
    
    return {
      isRecording: this.isRecording,
      isPaused: this.isPaused,
      duration
    }
  }
  
  /**
   * 设置回调函数
   */
  setCallbacks(callbacks: {
    onStart?: () => void
    onStop?: (recording: Recording) => void
    onError?: (error: any) => void
    onFrame?: (buffer: ArrayBuffer) => void
  }): void {
    if (callbacks.onStart) this.onStartCallback = callbacks.onStart
    if (callbacks.onStop) this.onStopCallback = callbacks.onStop
    if (callbacks.onError) this.onErrorCallback = callbacks.onError
    if (callbacks.onFrame) this.onFrameCallback = callbacks.onFrame
  }
  
  /**
   * 保存录音到本地存储
   */
  saveRecording(recording: Recording): void {
    try {
      const recordings = this.getRecordings()
      recordings.unshift(recording)
      uni.setStorageSync('recordings', recordings)
      
      // 更新统计
      this.updateStatistics(recording.duration)
    } catch (error) {
      console.error('保存录音失败:', error)
    }
  }
  
  /**
   * 获取所有录音
   */
  getRecordings(): Recording[] {
    try {
      return uni.getStorageSync('recordings') || []
    } catch (error) {
      console.error('获取录音列表失败:', error)
      return []
    }
  }
  
  /**
   * 删除录音
   */
  deleteRecording(id: string): boolean {
    try {
      const recordings = this.getRecordings()
      const filtered = recordings.filter(r => r.id !== id)
      uni.setStorageSync('recordings', filtered)
      return true
    } catch (error) {
      console.error('删除录音失败:', error)
      return false
    }
  }
  
  /**
   * 重命名录音
   */
  renameRecording(id: string, newName: string): boolean {
    try {
      const recordings = this.getRecordings()
      const recording = recordings.find(r => r.id === id)
      if (recording) {
        recording.name = newName
        uni.setStorageSync('recordings', recordings)
        return true
      }
      return false
    } catch (error) {
      console.error('重命名录音失败:', error)
      return false
    }
  }
  
  /**
   * 更新统计数据
   */
  private updateStatistics(recordingDuration: number): void {
    try {
      const stats = uni.getStorageSync('statistics') || {
        totalPracticeTime: 0,
        totalRecordings: 0,
        streakDays: 0,
        lastPracticeDate: null
      }
      
      stats.totalPracticeTime += recordingDuration
      stats.totalRecordings += 1
      
      const today = new Date().toISOString().split('T')[0]
      if (stats.lastPracticeDate !== today) {
        const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0]
        if (stats.lastPracticeDate === yesterday) {
          stats.streakDays += 1
        } else if (stats.lastPracticeDate !== today) {
          stats.streakDays = 1
        }
        stats.lastPracticeDate = today
      }
      
      uni.setStorageSync('statistics', stats)
    } catch (error) {
      console.error('更新统计失败:', error)
    }
  }
  
  /**
   * 播放录音
   */
  playRecording(filePath: string): UniApp.InnerAudioContext {
    const audioContext = uni.createInnerAudioContext()
    audioContext.src = filePath
    audioContext.play()
    return audioContext
  }

  /**
   * 上传录音到云存储
   * @param recording 录音对象
   * @param homeworkId 可选，关联的作业ID
   * @returns 更新后的录音对象（包含云端URL）
   */
  async uploadToCloud(recording: Recording, homeworkId?: string): Promise<Recording> {
    // @ts-ignore
    if (!wx.cloud) {
      throw new Error('云开发不可用')
    }

    try {
      const timestamp = Date.now()
      const cloudPath = `recordings/${homeworkId || 'free'}/${timestamp}_${recording.id}.mp3`

      // @ts-ignore
      const uploadResult = await wx.cloud.uploadFile({
        cloudPath,
        filePath: recording.voicePath
      })

      if (uploadResult.fileID) {
        // 获取临时访问 URL
        // @ts-ignore
        const urlResult = await wx.cloud.getTempFileURL({
          fileList: [uploadResult.fileID]
        })

        const cloudUrl = urlResult.fileList[0]?.tempFileURL || ''

        // 更新录音对象
        const updatedRecording: Recording = {
          ...recording,
          cloudFileId: uploadResult.fileID,
          cloudUrl,
          homeworkId
        }

        // 更新本地存储中的录音记录
        this.updateRecordingInStorage(updatedRecording)

        console.log('录音上传成功:', uploadResult.fileID)
        return updatedRecording
      }

      throw new Error('上传失败：未获取到 fileID')
    } catch (error) {
      console.error('上传录音到云存储失败:', error)
      throw error
    }
  }

  /**
   * 更新本地存储中的录音记录
   */
  private updateRecordingInStorage(recording: Recording): void {
    try {
      const recordings = this.getRecordings()
      const index = recordings.findIndex(r => r.id === recording.id)
      if (index !== -1) {
        recordings[index] = recording
        uni.setStorageSync('recordings', recordings)
      }
    } catch (error) {
      console.error('更新录音记录失败:', error)
    }
  }

  /**
   * 录音并自动上传到云存储
   * @param homeworkId 作业ID
   * @param onProgress 上传进度回调
   */
  async stopAndUpload(homeworkId: string): Promise<Recording> {
    return new Promise((resolve, reject) => {
      const originalCallback = this.onStopCallback

      this.onStopCallback = async (recording) => {
        // 恢复原回调
        this.onStopCallback = originalCallback

        try {
          // 关联作业ID
          recording.homeworkId = homeworkId
          
          // 上传到云存储
          const uploadedRecording = await this.uploadToCloud(recording, homeworkId)
          
          // 调用原回调
          originalCallback?.(uploadedRecording)
          
          resolve(uploadedRecording)
        } catch (error) {
          reject(error)
        }
      }

      this.stop()
    })
  }
}

// 导出单例
export default new RecorderService()
