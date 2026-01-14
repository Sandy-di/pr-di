/**
 * 用户管理服务
 * 微信小程序登录、用户信息管理
 */

export interface UserInfo {
  avatarUrl: string
  nickName: string
  customName?: string  // 用户自定义的名称
  isLoggedIn: boolean
  loginTime?: string
}

const STORAGE_KEY = 'userInfo'

class UserService {
  private userInfo: UserInfo | null = null

  /**
   * 初始化 - 从本地存储加载用户信息
   */
  init(): UserInfo | null {
    try {
      const stored = uni.getStorageSync(STORAGE_KEY)
      if (stored) {
        this.userInfo = stored
        return this.userInfo
      }
    } catch (e) {
      console.error('加载用户信息失败:', e)
    }
    return null
  }

  /**
   * 微信登录 - 获取用户头像和昵称
   */
  async login(): Promise<UserInfo> {
    return new Promise((resolve, reject) => {
      // @ts-ignore - wx.getUserProfile 在 uni-app 中
      wx.getUserProfile({
        desc: '用于完善用户资料',
        success: (res: any) => {
          const userInfo: UserInfo = {
            avatarUrl: res.userInfo.avatarUrl || '',
            nickName: res.userInfo.nickName || '微信用户',
            isLoggedIn: true,
            loginTime: new Date().toISOString()
          }
          
          this.userInfo = userInfo
          this.saveToStorage()
          resolve(userInfo)
        },
        fail: (err: any) => {
          console.error('登录失败:', err)
          reject(err)
        }
      })
    })
  }

  /**
   * 选择头像（微信头像组件方式）
   */
  async chooseAvatar(): Promise<string> {
    return new Promise((resolve, reject) => {
      uni.chooseMedia({
        count: 1,
        mediaType: ['image'],
        sourceType: ['album', 'camera'],
        success: (res) => {
          const tempFilePath = res.tempFiles[0].tempFilePath
          if (this.userInfo) {
            this.userInfo.avatarUrl = tempFilePath
            this.saveToStorage()
          }
          resolve(tempFilePath)
        },
        fail: reject
      })
    })
  }

  /**
   * 更新用户名
   */
  updateNickName(name: string): boolean {
    if (!this.userInfo) return false
    
    this.userInfo.customName = name.trim()
    this.saveToStorage()
    return true
  }

  /**
   * 获取显示名称（优先使用自定义名称）
   */
  getDisplayName(): string {
    if (!this.userInfo) return '未登录'
    return this.userInfo.customName || this.userInfo.nickName || '微信用户'
  }

  /**
   * 获取用户信息
   */
  getUserInfo(): UserInfo | null {
    return this.userInfo
  }

  /**
   * 是否已登录
   */
  isLoggedIn(): boolean {
    return this.userInfo?.isLoggedIn || false
  }

  /**
   * 登出
   */
  logout(): void {
    this.userInfo = null
    try {
      uni.removeStorageSync(STORAGE_KEY)
    } catch (e) {
      console.error('登出失败:', e)
    }
  }

  /**
   * 保存到本地存储
   */
  private saveToStorage(): void {
    try {
      uni.setStorageSync(STORAGE_KEY, this.userInfo)
    } catch (e) {
      console.error('保存用户信息失败:', e)
    }
  }
}

// 导出单例
export default new UserService()
