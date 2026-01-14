/**
 * 钢琴采样管理器
 * 使用在线CDN加载真实钢琴采样
 */

// 使用 Salamander Grand Piano 采样（开源免费）
// 采样来源: https://freepats.zenvoid.org/Piano/acoustic-grand-piano.html
// 或使用其他开源钢琴采样

// 采样CDN配置 - 使用免费的钢琴采样CDN
// 备选方案1: 使用 unpkg 上的 piano-samples 包
// 备选方案2: 使用自托管的采样文件

export interface SampleConfig {
  midi: number
  noteName: string
  url: string
}

// 关键采样点 - 每隔一个八度采样
// 这样可以减少文件数量，同时保证音质
export const PIANO_SAMPLES: SampleConfig[] = [
  // C2 - MIDI 36
  { midi: 36, noteName: 'C2', url: '' },
  // C3 - MIDI 48
  { midi: 48, noteName: 'C3', url: '' },
  // C4 - MIDI 60 (中央C)
  { midi: 60, noteName: 'C4', url: '' },
  // C5 - MIDI 72
  { midi: 72, noteName: 'C5', url: '' },
  // C6 - MIDI 84
  { midi: 84, noteName: 'C6', url: '' },
]

// 用于生成简单钢琴音色的 base64 编码音频数据
// 这是一个备用方案，当无法加载外部采样时使用
export const FALLBACK_SAMPLE_DATA = {
  // 这里可以放置 base64 编码的短音频片段
  // 或者使用合成音色
}

/**
 * 从 URL 加载音频采样
 */
export async function loadSampleFromUrl(url: string): Promise<ArrayBuffer | null> {
  try {
    return new Promise((resolve, reject) => {
      uni.request({
        url,
        responseType: 'arraybuffer',
        success: (res) => {
          if (res.statusCode === 200 && res.data) {
            resolve(res.data as ArrayBuffer)
          } else {
            reject(new Error(`HTTP ${res.statusCode}`))
          }
        },
        fail: (err) => reject(err)
      })
    })
  } catch (error) {
    console.error('加载采样失败:', url, error)
    return null
  }
}

/**
 * 从本地文件加载音频采样
 */
export function loadSampleFromFile(filePath: string): ArrayBuffer | null {
  try {
    const fs = uni.getFileSystemManager()
    return fs.readFileSync(filePath) as ArrayBuffer
  } catch (error) {
    console.error('读取本地采样失败:', filePath, error)
    return null
  }
}

/**
 * 获取本地采样文件路径
 */
export function getLocalSamplePath(noteName: string): string {
  return `/static/audio/piano/${noteName}.mp3`
}

/**
 * 检查本地采样文件是否存在
 */
export function checkLocalSampleExists(noteName: string): boolean {
  try {
    const fs = uni.getFileSystemManager()
    const path = getLocalSamplePath(noteName)
    fs.accessSync(path)
    return true
  } catch {
    return false
  }
}
