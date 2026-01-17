/**
 * 自建后端 API 客户端
 * 负责与 Node.js 后端服务通信
 */

// 本地开发地址 (真机调试需要换成局域网 IP，如 http://192.168.1.x:3000)
// 模拟器使用 http://localhost:3000
const API_BASE_URL = 'http://localhost:3000/api'

// 通用请求封装
export const request = <T = any>(
  path: string, 
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
  data?: any
): Promise<T> => {
  return new Promise((resolve, reject) => {
    uni.request({
      url: `${API_BASE_URL}${path}`,
      method: method,
      data: data,
      header: {
        'Content-Type': 'application/json',
        // 模拟用户 ID，实际应从登录状态获取
        'x-user-id': uni.getStorageSync('userInfo')?.openid || 'anonymous-user'
      },
      success: (res) => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(res.data as T)
        } else {
          reject(new Error(`API Error: ${res.statusCode}`))
        }
      },
      fail: (err) => {
        reject(err)
      }
    })
  })
}

export const uploadFile = (filePath: string): Promise<string> => {
// ...
  return new Promise((resolve, reject) => {
    uni.uploadFile({
      url: `${API_BASE_URL}/upload`,
      filePath: filePath,
      name: 'file',
      success: (res) => {
        if (res.statusCode === 200) {
          try {
            const data = JSON.parse(res.data)
            // 返回完整的 URL
            resolve(data.url)
          } catch (e) {
            console.error('解析响应失败:', e)
            reject(new Error('上传响应解析失败'))
          }
        } else {
          console.error('上传失败:', res)
          reject(new Error(`上传失败 status:${res.statusCode}`))
        }
      },
      fail: (err) => {
        console.error('网络请求失败:', err)
        reject(err)
      }
    })
  })
}

export default {
  uploadFile
}
