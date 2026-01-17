import { hmacSha1, hmacSha1FromHexKey, sha1 } from './sha1'

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
    // 算法: Signature = HMAC-SHA1(SignKey, StringToSign)
    // SignKey = HMAC-SHA1(SecretKey, KeyTime)
    // StringToSign = sha1(PolicyString)
    
    // 1. 生成 SignKey (返回 hex string)
    // 注意：qKeyTime 是 "start;end"
    const signKeyHex = hmacSha1(COS_CONFIG.SecretKey, qKeyTime)
    
    // 2. 生成 StringToSign (对 Policy String 进行 SHA1)
    const stringToSign = sha1(policyString)
    
    // 3. 计算最终 Signature (使用 Hex Key 进行 HMAC)
    // 注意：这里必须使用 hmacSha1FromHexKey，因为 signKeyHex 是 hex 字符串，需要还原为 bytes 作为 key
    // @ts-ignore
    const qSignature = hmacSha1FromHexKey ? hmacSha1FromHexKey(signKeyHex, stringToSign) : hmacSha1(signKeyHex, stringToSign) // 兼容性回退
    
    console.log('[COS] Starting upload:', key)
    console.log('[COS] Policy:', policyString)
    console.log('[COS] StringToSign:', stringToSign)
    console.log('[COS] Signature:', qSignature)
    
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
        'q-sign-time': qSignTime, // POST Policy 签名不需要这个？加上也没事
        'q-signature': qSignature,
        // 'signature': qSignature // 有些文档说用这个？POST V4 应该是 q-signature
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
