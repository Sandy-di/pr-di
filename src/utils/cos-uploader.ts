import { hmacSha1, sha1 } from './sha1'

/**
 * 腾讯云 COS 上传工具 (强制刷新版)
 * 纯原生实现，不依赖 SDK
 */

const COS_CONFIG = {
  Bucket: 'homework-sheets-1251985400',
  Region: 'ap-guangzhou',
  SecretId: 'AKID9B1jGahcLq7A',
  SecretKey: '3wsdATbWIrEPODqHUWN2d1MXXJxQgldJ'
}

// 获取主机名
const getHost = () => `${COS_CONFIG.Bucket}.cos.${COS_CONFIG.Region}.myqcloud.com`

// 获取公开访问 URL
export const getCosPublicUrl = (key: string): string => {
  return `https://${getHost()}/${key}`
}

// 生成唯一文件名
const generateFileName = (originalName: string, prefix: string): string => {
  const ext = originalName.split('.').pop() || 'jpg'
  const timestamp = Date.now()
  const random = Math.random().toString(36).substring(2, 8)
  return `${prefix}/${timestamp}_${random}.${ext}`
}

// 简易 Base64
function btoa(str: string) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/='
  let output = ''
  for (let i = 0; i < str.length; i += 3) {
    const val = (str.charCodeAt(i) << 16) | (i + 1 < str.length ? str.charCodeAt(i + 1) << 8 : 0) | (i + 2 < str.length ? str.charCodeAt(i + 2) : 0)
    for (let j = 0; j < 4; j++) {
      if (i * 8 + j * 6 > str.length * 8) output += '='
      else output += chars.charAt((val >>> (6 * (3 - j))) & 0x3f)
    }
  }
  return output
}

// POST Object 上传
export const uploadToCOS = (
  filePath: string,
  prefix: string,
  originalName: string = 'file'
): Promise<string> => {
  return new Promise((resolve, reject) => {
    const key = generateFileName(originalName, prefix)
    const host = getHost()
    const url = `https://${host}` 
    
    const now = Math.floor(Date.now() / 1000)
    const end = now + 900
    const qKeyTime = `${now};${end}`
    const qSignTime = qKeyTime
    
    // 构造 Policy
    const policyObj = {
      "expiration": new Date(end * 1000).toISOString(),
      "conditions": [
        {"bucket": COS_CONFIG.Bucket},
        {"key": key},
        {"q-sign-algorithm": "sha1"},
        {"q-ak": COS_CONFIG.SecretId},
        {"q-sign-time": qSignTime}
      ]
    }
    const policyString = JSON.stringify(policyObj)
    
    // 计算 Signature
    const signKey = hmacSha1(COS_CONFIG.SecretKey, qKeyTime)
    const stringToSign = sha1(policyString)
    const qSignature = hmacSha1(signKey, stringToSign)
    
    console.log('[COS] Starting upload:', key)
    
    uni.uploadFile({
      url: url,
      filePath: filePath,
      name: 'file',
      formData: {
        'key': key,
        'policy': btoa(policyString),
        'q-sign-algorithm': 'sha1',
        'q-ak': COS_CONFIG.SecretId,
        'q-key-time': qKeyTime,
        'q-sign-time': qSignTime,
        'q-signature': qSignature
      },
      success: (res) => {
        if (res.statusCode === 200 || res.statusCode === 204) {
          const publicUrl = getCosPublicUrl(key)
          console.log('[COS] Upload success:', publicUrl)
          resolve(publicUrl)
        } else {
          console.error('[COS] Error:', res)
          reject(new Error(`上传失败 ${res.statusCode}`))
        }
      },
      fail: (err) => {
        console.error('[COS] Fail:', err)
        reject(err)
      }
    })
  })
}

export const uploadImagesToCOS = async (filePaths: string[]): Promise<string[]> => {
  const results: string[] = []
  for (const filePath of filePaths) {
    try {
      const url = await uploadToCOS(filePath, 'sheets', 'image.jpg')
      results.push(url)
    } catch (e) {
      console.error('图片上传失败:', e)
    }
  }
  return results
}

export const uploadAudioToCOS = async (filePath: string): Promise<string> => {
  return uploadToCOS(filePath, 'demos', 'audio.mp3')
}

export default {
  uploadToCOS,
  uploadImagesToCOS,
  uploadAudioToCOS,
  getCosPublicUrl,
  COS_CONFIG
}
