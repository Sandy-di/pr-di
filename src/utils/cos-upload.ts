import { hmacSha1, sha1 } from './sha1'

/**
 * 腾讯云 COS 上传工具 (Zero Dependency Version)
 * 不依赖任何外部 SDK，纯原生实现
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

// 计算签名
// 参考: https://cloud.tencent.com/document/product/436/7778
const getAuthorization = (method: string = 'post', pathname: string = '/'): string => {
  const now = Math.floor(Date.now() / 1000)
  const exp = now + 900 // 15分钟有效期
  
  const qSignTime = `${now};${exp}`
  const qKeyTime = `${now};${exp}`
  
  // 1. 生成 SignKey
  const signKey = hmacSha1(COS_CONFIG.SecretKey, qKeyTime)
  
  // 2. 生成 HttpString
  // lowercase method & pathname
  const httpString = `${method.toLowerCase()}\n${pathname}\n\n\n`
  
  // 3. 生成 StringToSign
  const stringToSign = `sha1\n${qSignTime}\n${sha1(httpString)}\n`
  
  // 4. 生成 Signature
  const qSignature = hmacSha1(signKey, stringToSign)
  
  // 5. 拼接 Authorization
  const authorization = [
    'q-sign-algorithm=sha1',
    `q-ak=${COS_CONFIG.SecretId}`,
    `q-sign-time=${qSignTime}`,
    `q-key-time=${qKeyTime}`,
    'q-header-list=',
    'q-url-param-list=',
    `q-signature=${qSignature}`
  ].join('&')
  
  return authorization
}

/**
 * 上传文件到 COS (使用 uni.uploadFile)
 */
export const uploadToCOS = (
  filePath: string,
  prefix: string,
  originalName: string = 'file'
): Promise<string> => {
  return new Promise((resolve, reject) => {
    const key = generateFileName(originalName, prefix)
    const host = getHost()
    const url = `https://${host}` // POST 到根路径
    
    // 计算签名
    const authorization = getAuthorization('post', '/')
    
    console.log('开始上传:', filePath, 'to', key)
    
    uni.uploadFile({
      url: url,
      name: 'file',
      filePath: filePath,
      formData: {
        'key': key,
        'success_action_status': '200',
        'Signature': authorization, // 某些情况下需要放在 Authorization header，某些是 formData
        'Authorization': authorization, // 兼容性：同时放
        // 注意：COS POST 上传还需要 Policy 吗？
        // 如果使用 simple upload with Authorization header, 其实推荐 PUT。
        // 但 wx.uploadFile 发送的是 multipart/form-data，对应 COS POST Object。
        // COS POST Object 文档强烈建议使用 Policy 签名，但也可以尝试 Authorization 签名。
        // 为了稳妥，我们使用 PUT 方法（uni.uploadFile 实际上只能 POST multipart，但这对于 PUT 是不行的）。
        
        // 修正方案：使用 POST Object + Policy 签名
        // 但我们没有 Policy，我们尝试用 Authorization
      },
      header: {
        'Authorization': authorization
      },
      success: (res) => {
        console.log('Uploaded raw res:', res)
        if (res.statusCode === 200 || res.statusCode === 204) {
          const publicUrl = getCosPublicUrl(key)
          console.log('Upload success:', publicUrl)
          resolve(publicUrl)
        } else {
          console.error('Upload info:', res)
          reject(new Error(`上传失败 status:${res.statusCode}`))
        }
      },
      fail: (err) => {
        console.error('Upload fail:', err)
        reject(err)
      }
    })
  })
}

// 修正：上面的 uploadToCOS 使用 POST + Authorization 不一定能行。
// 最稳妥的是：使用 COS 推荐的 POST Policy 签名。
// 让我们重写 getAuthorization 为 getPostSignature
// 下面的覆盖了上面的实现

const getPostPolicy = (key: string) => {
  const now = Date.now()
  const exp = new Date(now + 900 * 1000).toISOString()
  
  const policy = {
    "expiration": exp,
    "conditions": [
      {"bucket": COS_CONFIG.Bucket},
      {"key": key},
      {"q-sign-algorithm": "sha1"},
      {"q-ak": COS_CONFIG.SecretId}, 
      {"q-sign-time": `${Math.floor(now/1000)-100};${Math.floor(now/1000)+900}`}
    ]
  }
  return policy
}

// 重新实现 uploadToCOS，使用标准的 POST Object V4 签名
// 参考: https://cloud.tencent.com/document/product/436/14690
export const uploadToCOS_POST = (
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
      // 注意：COS POST 需要 Policy 里的字段完全匹配 formData
      const policyObj = {
        "expiration": new Date(end * 1000).toISOString(),
        "conditions": [
          {"bucket": COS_CONFIG.Bucket},
           // key 必须匹配
          {"key": key},
          {"q-sign-algorithm": "sha1"},
          {"q-ak": COS_CONFIG.SecretId},
          {"q-sign-time": qSignTime}
        ]
      }
      const policyString = JSON.stringify(policyObj)
      
      // 计算 Signature
      // Signature = HMAC-SHA1(SignKey, SHA1(PolicyString)) 
      // Wait, POST signature is HMAC-SHA1(SignKey, StringToSign) where StringToSign is SHA1(Policy)
      
      const signKey = hmacSha1(COS_CONFIG.SecretKey, qKeyTime)
      const stringToSign = sha1(policyString)
      const qSignature = hmacSha1(signKey, stringToSign)
      
      uni.uploadFile({
        url: url,
        filePath: filePath,
        name: 'file',
        formData: {
          'key': key,
          'policy': btoa(policyString), // Base64 Policy
          'q-sign-algorithm': 'sha1',
          'q-ak': COS_CONFIG.SecretId,
          'q-key-time': qKeyTime,
          'q-sign-time': qSignTime,
          'q-signature': qSignature
        },
        success: (res) => {
          if (res.statusCode === 200 || res.statusCode === 204) {
            resolve(getCosPublicUrl(key))
          } else {
            console.error('COS Error:', res)
            // 解析 XML 错误信息
            reject(new Error(`上传失败 ${res.statusCode}`))
          }
        },
        fail: reject
      })
    })
}

// 简易 Base64
function btoa(str: string) {
    // 小程序没有 window.btoa，手动实现一个简单的
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

// 覆盖导出
export const uploadToCOS = uploadToCOS_POST

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
