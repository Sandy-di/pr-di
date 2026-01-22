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
  private woodblockBuffers: { high: AudioBuffer | null, low: AudioBuffer | null } = { high: null, low: null }
  private gainNode: any = null
  private isInitialized = false
  private masterVolume = 1.0
  private samplesLoaded = false
  
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
      
      // 预加载真实采样文件
      await this.preloadSamples()
      await this.preloadWoodblockSamples()
      
      this.isInitialized = true
      console.log('音频引擎初始化成功，采样已加载')
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
    const noteNames = ['C2', 'C3', 'C4', 'C5', 'C6']
    const loadPromises = this.sampleMidiNotes.map(async (midi, index) => {
      const noteName = noteNames[index]
      const filePath = `/static/audio/piano/${noteName}.mp3`
      
      try {
        // 使用 uni.getFileSystemManager 读取文件
        const fs = uni.getFileSystemManager()
        const arrayBuffer = fs.readFileSync(filePath) as ArrayBuffer
        const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer.slice(0))
        this.sampleBuffers.set(midi, audioBuffer)
        console.log(`加载钢琴采样成功: ${noteName}`)
      } catch (error) {
        console.warn(`加载钢琴采样失败: ${noteName}`, error)
      }
    })
    
    await Promise.all(loadPromises)
    this.samplesLoaded = this.sampleBuffers.size > 0
    console.log(`钢琴采样加载完成，共 ${this.sampleBuffers.size} 个`)
  }
  
  /**
   * 预加载节拍器木鱼采样
   */
  async preloadWoodblockSamples(): Promise<void> {
    const files = [
      { key: 'high', path: '/static/audio/metronome/woodblock-high.mp3' },
      { key: 'low', path: '/static/audio/metronome/woodblock-low.mp3' }
    ]
    
    for (const file of files) {
      try {
        const fs = uni.getFileSystemManager()
        const arrayBuffer = fs.readFileSync(file.path) as ArrayBuffer
        const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer.slice(0))
        this.woodblockBuffers[file.key as 'high' | 'low'] = audioBuffer
        console.log(`加载节拍器采样成功: ${file.key}`)
      } catch (error) {
        console.warn(`加载节拍器采样失败: ${file.key}`, error)
      }
    }
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
   * 使用高级合成器播放 - 模拟真实钢琴音色
   * 使用多个谐波叠加 + 精细的 ADSR 包络
   */
  private playSynthNote(midi: number, velocity: number, duration: number): any {
    const frequency = this.midiToFrequency(midi)
    const now = this.audioContext.currentTime
    
    // 主输出增益节点
    const masterGain = this.audioContext.createGain()
    masterGain.connect(this.gainNode)
    
    // 谐波配置 - 模拟钢琴泛音
    const harmonics = [
      { ratio: 1, gain: 1.0 },      // 基频
      { ratio: 2, gain: 0.5 },      // 第2谐波
      { ratio: 3, gain: 0.25 },     // 第3谐波
      { ratio: 4, gain: 0.15 },     // 第4谐波
      { ratio: 5, gain: 0.08 },     // 第5谐波
      { ratio: 6, gain: 0.04 },     // 第6谐波
    ]
    
    const oscillators: any[] = []
    const gains: any[] = []
    
    // 为每个谐波创建振荡器
    for (const harmonic of harmonics) {
      const osc = this.audioContext.createOscillator()
      const gain = this.audioContext.createGain()
      
      // 使用正弦波叠加（比三角波更柔和）
      osc.type = 'sine'
      osc.frequency.value = frequency * harmonic.ratio
      
      // 高频谐波衰减更快（模拟钢琴特性）
      const harmonicDecay = 1 / (harmonic.ratio * 0.5)
      
      gain.gain.value = 0
      
      osc.connect(gain)
      gain.connect(masterGain)
      
      oscillators.push(osc)
      gains.push({ node: gain, baseGain: harmonic.gain, decay: harmonicDecay })
    }
    
    // 应用精细的 ADSR 包络到每个谐波
    const maxGain = velocity * this.masterVolume * 0.3 // 降低总音量避免失真
    const attack = 0.005  // 极短的起音（钢琴击弦特性）
    const decay = 0.15    // 快速衰减到持续音
    const sustain = 0.4   // 持续音量比例
    const release = 0.3   // 释放时间
    
    for (const g of gains) {
      const gainValue = maxGain * g.baseGain
      
      // Attack
      g.node.gain.setValueAtTime(0.001, now)
      g.node.gain.exponentialRampToValueAtTime(gainValue, now + attack)
      
      // Decay to Sustain
      g.node.gain.exponentialRampToValueAtTime(gainValue * sustain, now + attack + decay * g.decay)
      
      // Release
      if (duration > 0) {
        const releaseStart = now + duration
        g.node.gain.setValueAtTime(gainValue * sustain, releaseStart)
        g.node.gain.exponentialRampToValueAtTime(0.001, releaseStart + release)
      }
    }
    
    // 添加轻微的击弦噪音（模拟琴槌击弦）
    const noiseGain = this.audioContext.createGain()
    const noiseOsc = this.audioContext.createOscillator()
    noiseOsc.type = 'triangle'
    noiseOsc.frequency.value = frequency * 8 // 高频噪音
    noiseGain.gain.value = 0.001
    noiseGain.gain.setValueAtTime(maxGain * 0.1, now)
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.03) // 快速衰减
    noiseOsc.connect(noiseGain)
    noiseGain.connect(masterGain)
    
    // 启动所有振荡器
    for (const osc of oscillators) {
      osc.start(now)
    }
    noiseOsc.start(now)
    
    // 自动停止
    if (duration > 0) {
      const stopTime = (duration + release + 0.1) * 1000
      setTimeout(() => {
        try {
          for (const osc of oscillators) {
            osc.stop()
          }
          noiseOsc.stop()
        } catch (e) {
          // 忽略已停止的错误
        }
      }, stopTime)
    }
    
    return { 
      oscillators, 
      gains: gains.map(g => g.node), 
      masterGain,
      noiseOsc,
      noiseGain
    }
  }
  
  /**
   * 应用 ADSR 包络
   */
  private applyEnvelope(gainNode: any, velocity: number, duration: number): void {
    const now = this.audioContext.currentTime
    const attack = 0.01
    const decay = 0.1
    const sustain = 0.6
    const release = 0.2
    
    const maxGain = velocity * this.masterVolume
    
    // Attack - 从极小值开始（指数函数不能从0开始）
    gainNode.gain.setValueAtTime(0.001, now)
    gainNode.gain.exponentialRampToValueAtTime(maxGain, now + attack)
    
    // Decay to Sustain
    gainNode.gain.exponentialRampToValueAtTime(maxGain * sustain, now + attack + decay)
    
    // Release - 如果有时长限制，使用指数衰减到接近0
    if (duration > 0) {
      const releaseStart = now + duration
      gainNode.gain.setValueAtTime(maxGain * sustain, releaseStart)
      gainNode.gain.exponentialRampToValueAtTime(0.001, releaseStart + release)
      gainNode.gain.setValueAtTime(0, releaseStart + release + 0.01)
    }
  }
  
  /**
   * 释放音符（用于按键抬起时）
   */
  releaseNote(noteHandle: any): void {
    if (!noteHandle || !this.audioContext) return
    
    const now = this.audioContext.currentTime
    const releaseTime = 0.15 // 快速释放
    
    // 处理多振荡器结构（新合成器）
    if (noteHandle.gains && Array.isArray(noteHandle.gains)) {
      for (const gain of noteHandle.gains) {
        if (gain && gain.gain) {
          gain.gain.cancelScheduledValues(now)
          gain.gain.setValueAtTime(gain.gain.value || 0.001, now)
          gain.gain.exponentialRampToValueAtTime(0.001, now + releaseTime)
        }
      }
      
      // 也处理 masterGain
      if (noteHandle.masterGain && noteHandle.masterGain.gain) {
        noteHandle.masterGain.gain.cancelScheduledValues(now)
        noteHandle.masterGain.gain.setValueAtTime(noteHandle.masterGain.gain.value || 1, now)
        noteHandle.masterGain.gain.exponentialRampToValueAtTime(0.001, now + releaseTime)
      }
      
      // 延迟停止所有振荡器
      setTimeout(() => {
        try {
          if (noteHandle.oscillators) {
            for (const osc of noteHandle.oscillators) {
              osc.stop()
            }
          }
          if (noteHandle.noiseOsc) noteHandle.noiseOsc.stop()
        } catch (e) {
          // 忽略已停止的错误
        }
      }, (releaseTime + 0.05) * 1000)
      
      return
    }
    
    // 处理旧结构（单振荡器或采样）
    const { gainNode, oscillator, source } = noteHandle
    
    if (gainNode && gainNode.gain) {
      gainNode.gain.cancelScheduledValues(now)
      gainNode.gain.setValueAtTime(gainNode.gain.value || 0.001, now)
      gainNode.gain.exponentialRampToValueAtTime(0.001, now + releaseTime)
    }
    
    setTimeout(() => {
      try {
        if (oscillator) oscillator.stop()
        if (source) source.stop()
      } catch (e) {
        // 忽略已停止的错误
      }
    }, (releaseTime + 0.05) * 1000)
  }
  
  /**
   * 播放木鱼声音 - 用于节拍器
   * @param isStrong 是否为强拍（强拍音高更高）
   * @param velocity 力度 (0-1)
   */
  playWoodblock(isStrong = false, velocity = 0.8): void {
    if (!this.isInitialized || !this.audioContext) {
      console.warn('音频引擎未初始化')
      return
    }
    
    try {
      // 优先使用真实采样
      const buffer = isStrong ? this.woodblockBuffers.high : this.woodblockBuffers.low
      if (buffer) {
        this.playWoodblockSample(buffer, velocity)
        return
      }
      
      // 回退到合成音色
      this.playWoodblockSynth(isStrong, velocity)
    } catch (error) {
      console.error('播放木鱼声音失败:', error)
    }
  }
  
  /**
   * 使用采样播放木鱼声
   */
  private playWoodblockSample(buffer: AudioBuffer, velocity: number): void {
    const source = this.audioContext.createBufferSource()
    const gainNode = this.audioContext.createGain()
    
    source.buffer = buffer
    gainNode.gain.value = velocity * this.masterVolume
    
    source.connect(gainNode)
    gainNode.connect(this.audioContext.destination)
    
    source.start()
  }
  
  /**
   * 使用合成器播放木鱼声（备用方案）
   */
  private playWoodblockSynth(isStrong: boolean, velocity: number): void {
    const now = this.audioContext.currentTime
    
    // 木鱼的基频 - 强拍用更高的音
    const baseFrequency = isStrong ? 800 : 600
    
    // 创建主振荡器 - 使用三角波模拟木质音色
    const osc1 = this.audioContext.createOscillator()
    osc1.type = 'triangle'
    osc1.frequency.value = baseFrequency
    
    // 创建第二振荡器 - 添加谐波丰富音色
    const osc2 = this.audioContext.createOscillator()
    osc2.type = 'sine'
    osc2.frequency.value = baseFrequency * 2.5
    
    // 创建带通滤波器 - 模拟木质共鸣
    const filter = this.audioContext.createBiquadFilter()
    filter.type = 'bandpass'
    filter.frequency.value = baseFrequency * 1.5
    filter.Q.value = 8
    
    // 创建增益节点
    const gainNode1 = this.audioContext.createGain()
    const gainNode2 = this.audioContext.createGain()
    const masterGain = this.audioContext.createGain()
    
    // 连接节点
    osc1.connect(gainNode1)
    osc2.connect(gainNode2)
    gainNode1.connect(filter)
    gainNode2.connect(filter)
    filter.connect(masterGain)
    masterGain.connect(this.gainNode)
    
    // 木鱼的音色特点：极短的起音，快速衰减
    const peakGain = velocity * 0.6
    const attackTime = 0.003  // 3ms 极短起音
    const decayTime = 0.08   // 80ms 快速衰减
    
    // 主振荡器包络
    gainNode1.gain.setValueAtTime(0.001, now)
    gainNode1.gain.exponentialRampToValueAtTime(peakGain, now + attackTime)
    gainNode1.gain.exponentialRampToValueAtTime(0.001, now + decayTime)
    
    // 第二振荡器包络（更快衰减）
    gainNode2.gain.setValueAtTime(0.001, now)
    gainNode2.gain.exponentialRampToValueAtTime(peakGain * 0.3, now + attackTime)
    gainNode2.gain.exponentialRampToValueAtTime(0.001, now + decayTime * 0.5)
    
    // 主增益
    masterGain.gain.value = this.masterVolume
    
    // 频率滑动 - 模拟敲击后的音高下降
    osc1.frequency.setValueAtTime(baseFrequency * 1.2, now)
    osc1.frequency.exponentialRampToValueAtTime(baseFrequency, now + 0.02)
    
    // 启动振荡器
    osc1.start(now)
    osc2.start(now)
    
    // 停止振荡器
    const stopTime = now + 0.15
    osc1.stop(stopTime)
    osc2.stop(stopTime)
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
