let COS: any;
try {
  // @ts-ignore
  // 使用相对路径引用：从 utils/ 跳出到根目录，再进 static/
  COS = require('../static/js/cos-wx-sdk-v5.js')
} catch (e) {
  console.error('Failed to require COS SDK:', e)
}

// 兼容性处理
if (COS && COS.default) {
  COS = COS.default
}

/**
 * 腾讯云 COS 配置和工具类
 * 用于上传乐谱图片和示范音频
 */

// COS 配置
const COS_CONFIG = {
  Bucket: 'homework-sheets-1251985400',
  Region: 'ap-guangzhou',
  SecretId: 'AKID9B1jGahcLq7A',
  SecretKey: '3wsdATbWIrEPODqHUWN2d1MXXJxQgldJ'
}

// 获取 COS 公开访问 URL
export const getCosPublicUrl = (key: string): string => {
  return `https://${COS_CONFIG.Bucket}.cos.${COS_CONFIG.Region}.myqcloud.com/${key}`
}

// 生成唯一文件名
const generateFileName = (originalName: string, prefix: string): string => {
  const ext = originalName.split('.').pop() || 'jpg'
  const timestamp = Date.now()
  const random = Math.random().toString(36).substring(2, 8)
  return `${prefix}/${timestamp}_${random}.${ext}`
}

/**
 * 上传文件到 COS
 * @param filePath 本地文件路径
 * @param prefix 文件夹前缀（如 'sheets' 或 'demos'）
 * @param originalName 原始文件名
 * @returns 公开访问 URL
 */
export const uploadToCOS = (
  filePath: string,
  prefix: string,
  originalName: string = 'file'
): Promise<string> => {
  return new Promise((resolve, reject) => {
    const key = generateFileName(originalName, prefix)
    
    // 简单方式：使用 SecretId/SecretKey 直接实例化
    const cos = new COS({
      SecretId: COS_CONFIG.SecretId,
      SecretKey: COS_CONFIG.SecretKey,
      SimpleUploadMethod: 'putObject'
    })
    
    cos.postObject({
      Bucket: COS_CONFIG.Bucket,
      Region: COS_CONFIG.Region,
      Key: key,
      FilePath: filePath,
      onProgress: (progressData: any) => {
        console.log('上传进度:', JSON.stringify(progressData))
      }
    }, (err: any, data: any) => {
      if (err) {
        console.error('COS 上传失败:', err)
        reject(err)
      } else {
        console.log('COS 上传成功:', data)
        // 返回公开访问 URL
        resolve(getCosPublicUrl(key))
      }
    })
  })
}

/**
 * 批量上传图片到 COS
 * @param filePaths 本地文件路径数组
 * @returns 公开访问 URL 数组
 */
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

/**
 * 上传音频到 COS
 * @param filePath 本地文件路径
 * @returns 公开访问 URL
 */
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
