/**
 * 音频管理器 - 钢琴音频引擎
 * 使用 WebAudio API + 真实钢琴采样
 */

// 音符名称到 MIDI 编号的映射
const NOTE_TO_MIDI: Record<string, number> = {
  'C': 0, 'C#': 1, 'Db': 1, 'D': 2, 'D#': 3, 'Eb': 3,
  'E': 4, 'F': 5, 'F#': 6, 'Gb': 6, 'G': 7, 'G#': 8,
  'Ab': 8, 'A': 9, 'A#': 10, 'Bb': 10, 'B': 11
}

// MIDI 编号到简谱的映射（C大调）
export const MIDI_TO_NOTATION: Record<number, string> = {
  0: '1', 1: '#1', 2: '2', 3: '#2', 4: '3', 5: '4',
  6: '#4', 7: '5', 8: '#5', 9: '6', 10: '#6', 11: '7'
}

// 钢琴键配置
export interface PianoKey {
  midi: number
  note: string      // 如 'C4'
  notation: string  // 简谱 如 '1', '·1' (高音), '1·' (低音)
  isBlack: boolean
  x: number
  width: number
  height: number
}

class AudioManager {
  private audioContext: any = null
  private sampleBuffers: Map<number, AudioBuffer> = new Map()
  private gainNode: any = null
  private isInitialized = false
  private masterVolume = 0.8
  
  // 关键采样点（每隔12个半音采样一次，减少文件数量）
  private sampleMidiNotes = [36, 48, 60, 72, 84] // C2, C3, C4, C5, C6
  
  // 音频池，用于复用音频节点
  private audioPool: any[] = []
  private poolSize = 10
  
  /**
   * 初始化音频上下文
   */
  async init(): Promise<boolean> {
    if (this.isInitialized) return true
    
    try {
      // 创建 WebAudio 上下文
      // @ts-ignore
      this.audioContext = uni.createWebAudioContext()
      
      if (!this.audioContext) {
        console.error('WebAudio 不支持')
        return false
      }
      
      // 创建主音量节点
      this.gainNode = this.audioContext.createGain()
      this.gainNode.gain.value = this.masterVolume
      this.gainNode.connect(this.audioContext.destination)
      
      // 预加载采样（如果有真实采样文件）
      // await this.preloadSamples()
      
      // 如果没有采样文件，使用合成音色
      this.isInitialized = true
      console.log('音频引擎初始化成功')
      return true
    } catch (error) {
      console.error('音频引擎初始化失败:', error)
      return false
    }
  }
  
  /**
   * 预加载钢琴采样
   */
  async preloadSamples(): Promise<void> {
    const loadPromises = this.sampleMidiNotes.map(async (midi) => {
      const noteName = this.midiToNoteName(midi)
      const filePath = `/static/audio/piano/${noteName}.mp3`
      
      try {
        // 使用 uni.getFileSystemManager 读取文件
        const fs = uni.getFileSystemManager()
        const arrayBuffer = fs.readFileSync(filePath) as ArrayBuffer
        const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer)
        this.sampleBuffers.set(midi, audioBuffer)
        console.log(`加载采样成功: ${noteName}`)
      } catch (error) {
        console.warn(`加载采样失败: ${noteName}`, error)
      }
    })
    
    await Promise.all(loadPromises)
  }
  
  /**
   * 播放音符
   * @param midi MIDI 编号 (21-108 对应钢琴键)
   * @param velocity 力度 (0-1)
   * @param duration 持续时间（秒），0表示持续直到释放
   */
  playNote(midi: number, velocity = 0.8, duration = 0.5): any {
    if (!this.isInitialized || !this.audioContext) {
      console.warn('音频引擎未初始化')
      return null
    }
    
    try {
      // 优先使用采样，如果没有则使用合成
      if (this.sampleBuffers.size > 0) {
        return this.playSample(midi, velocity, duration)
      } else {
        return this.playSynthNote(midi, velocity, duration)
      }
    } catch (error) {
      console.error('播放音符失败:', error)
      return null
    }
  }
  
  /**
   * 使用采样播放（变调）
   */
  private playSample(midi: number, velocity: number, duration: number): any {
    // 找到最近的采样点
    let closestSample = this.sampleMidiNotes[0]
    let minDistance = Math.abs(midi - closestSample)
    
    for (const sampleMidi of this.sampleMidiNotes) {
      const distance = Math.abs(midi - sampleMidi)
      if (distance < minDistance) {
        minDistance = distance
        closestSample = sampleMidi
      }
    }
    
    const buffer = this.sampleBuffers.get(closestSample)
    if (!buffer) return null
    
    const source = this.audioContext.createBufferSource()
    const gainNode = this.audioContext.createGain()
    
    source.buffer = buffer
    
    // 计算变调率
    const semitones = midi - closestSample
    source.playbackRate.value = Math.pow(2, semitones / 12)
    
    // 力度控制
    gainNode.gain.value = velocity * this.masterVolume
    
    // 连接节点
    source.connect(gainNode)
    gainNode.connect(this.audioContext.destination)
    
    // 应用 ADSR 包络
    this.applyEnvelope(gainNode, velocity, duration)
    
    source.start()
    
    return { source, gainNode }
  }
  
  /**
   * 使用合成器播放
   */
  private playSynthNote(midi: number, velocity: number, duration: number): any {
    const frequency = this.midiToFrequency(midi)
    
    // 创建振荡器
    const oscillator = this.audioContext.createOscillator()
    const gainNode = this.audioContext.createGain()
    
    // 使用多个谐波模拟钢琴音色
    oscillator.type = 'triangle'
    oscillator.frequency.value = frequency
    
    // 力度控制
    gainNode.gain.value = 0
    
    // 连接节点
    oscillator.connect(gainNode)
    gainNode.connect(this.gainNode)
    
    // 应用 ADSR 包络
    this.applyEnvelope(gainNode, velocity, duration)
    
    oscillator.start()
    
    // 自动停止
    if (duration > 0) {
      setTimeout(() => {
        oscillator.stop()
      }, (duration + 0.5) * 1000)
    }
    
    return { oscillator, gainNode }
  }
  
  /**
   * 应用 ADSR 包络
   */
  private applyEnvelope(gainNode: any, velocity: number, duration: number): void {
    const now = this.audioContext.currentTime
    const attack = 0.01
    const decay = 0.1
    const sustain = 0.7
    const release = 0.3
    
    const maxGain = velocity * this.masterVolume
    
    // Attack
    gainNode.gain.setValueAtTime(0, now)
    gainNode.gain.linearRampToValueAtTime(maxGain, now + attack)
    
    // Decay to Sustain
    gainNode.gain.linearRampToValueAtTime(maxGain * sustain, now + attack + decay)
    
    // Release
    if (duration > 0) {
      gainNode.gain.linearRampToValueAtTime(0, now + duration + release)
    }
  }
  
  /**
   * 释放音符（用于按键抬起时）
   */
  releaseNote(noteHandle: any): void {
    if (!noteHandle) return
    
    const { gainNode, oscillator, source } = noteHandle
    const now = this.audioContext.currentTime
    
    // 快速淡出
    if (gainNode) {
      gainNode.gain.cancelScheduledValues(now)
      gainNode.gain.linearRampToValueAtTime(0, now + 0.1)
    }
    
    // 停止振荡器/源
    setTimeout(() => {
      if (oscillator) oscillator.stop()
      if (source) source.stop()
    }, 150)
  }
  
  /**
   * 设置主音量
   */
  setVolume(volume: number): void {
    this.masterVolume = Math.max(0, Math.min(1, volume))
    if (this.gainNode) {
      this.gainNode.gain.value = this.masterVolume
    }
  }
  
  /**
   * 获取当前音量
   */
  getVolume(): number {
    return this.masterVolume
  }
  
  /**
   * MIDI 编号转频率
   */
  midiToFrequency(midi: number): number {
    return 440 * Math.pow(2, (midi - 69) / 12)
  }
  
  /**
   * MIDI 编号转音符名称
   */
  midiToNoteName(midi: number): string {
    const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
    const octave = Math.floor(midi / 12) - 1
    const note = noteNames[midi % 12]
    return `${note}${octave}`
  }
  
  /**
   * 获取简谱记号
   */
  getNotation(midi: number): string {
    const noteInOctave = midi % 12
    const octave = Math.floor(midi / 12) - 1
    const baseNotation = MIDI_TO_NOTATION[noteInOctave] || ''
    
    // C4 (中央C) 是第4个八度，作为基准
    if (octave < 4) {
      // 低音，添加下点
      return baseNotation + '·'.repeat(4 - octave)
    } else if (octave > 4) {
      // 高音，添加上点
      return '·'.repeat(octave - 4) + baseNotation
    }
    return baseNotation
  }
  
  /**
   * 生成钢琴键配置
   * @param startOctave 起始八度
   * @param numOctaves 八度数量
   * @param keyboardWidth 键盘宽度
   * @param keyboardHeight 键盘高度
   */
  generatePianoKeys(
    startOctave: number,
    numOctaves: number,
    keyboardWidth: number,
    keyboardHeight: number
  ): PianoKey[] {
    const keys: PianoKey[] = []
    const whiteKeyWidth = keyboardWidth / (numOctaves * 7)
    const blackKeyWidth = whiteKeyWidth * 0.6
    const whiteKeyHeight = keyboardHeight
    const blackKeyHeight = keyboardHeight * 0.6
    
    // 黑键在白键中的位置偏移
    const blackKeyOffsets = [0.7, 1.7, 3.7, 4.7, 5.7] // 相对于C的白键位置
    const blackKeyNotes = [1, 3, 6, 8, 10] // C#, D#, F#, G#, A#
    const whiteKeyNotes = [0, 2, 4, 5, 7, 9, 11] // C, D, E, F, G, A, B
    
    let whiteKeyIndex = 0
    
    for (let octave = 0; octave < numOctaves; octave++) {
      const baseOctave = startOctave + octave
      
      // 添加白键
      for (let i = 0; i < 7; i++) {
        const noteInOctave = whiteKeyNotes[i]
        const midi = (baseOctave + 1) * 12 + noteInOctave
        const x = whiteKeyIndex * whiteKeyWidth
        
        keys.push({
          midi,
          note: this.midiToNoteName(midi),
          notation: this.getNotation(midi),
          isBlack: false,
          x,
          width: whiteKeyWidth,
          height: whiteKeyHeight
        })
        
        whiteKeyIndex++
      }
    }
    
    // 添加黑键（在白键之后添加，以便绘制时黑键在上层）
    whiteKeyIndex = 0
    for (let octave = 0; octave < numOctaves; octave++) {
      const baseOctave = startOctave + octave
      
      for (let i = 0; i < 5; i++) {
        const noteInOctave = blackKeyNotes[i]
        const midi = (baseOctave + 1) * 12 + noteInOctave
        const x = (whiteKeyIndex + blackKeyOffsets[i]) * whiteKeyWidth - blackKeyWidth / 2
        
        keys.push({
          midi,
          note: this.midiToNoteName(midi),
          notation: this.getNotation(midi),
          isBlack: true,
          x,
          width: blackKeyWidth,
          height: blackKeyHeight
        })
      }
      
      whiteKeyIndex += 7
    }
    
    return keys
  }
  
  /**
   * 销毁音频上下文
   */
  destroy(): void {
    if (this.audioContext) {
      this.audioContext.close()
      this.audioContext = null
    }
    this.sampleBuffers.clear()
    this.isInitialized = false
  }
}

// 导出单例
export default new AudioManager()
