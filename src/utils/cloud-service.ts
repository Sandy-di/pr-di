/**
 * 云开发服务
 * 环境ID: cloudbase-6g27fpr3ae127639
 */

// 获取云数据库实例
// @ts-ignore
const db = wx.cloud?.database?.()

/**
 * 从云数据库获取作业列表
 */
export const fetchHomeworkList = async () => {
  if (!db) {
    console.error('云数据库不可用')
    return []
  }

  try {
    const res = await db.collection('homework')
      .where({ isPublished: true })
      .orderBy('createdAt', 'desc')
      .get()
    
    return res.data || []
  } catch (e) {
    console.error('获取作业列表失败:', e)
    return []
  }
}

/**
 * 根据ID获取作业详情
 */
export const fetchHomeworkById = async (id: string) => {
  if (!db) return null

  try {
    const res = await db.collection('homework').doc(id).get()
    return res.data || null
  } catch (e) {
    console.error('获取作业详情失败:', e)
    return null
  }
}

/**
 * 上传文件到云存储
 */
export const uploadFile = async (filePath: string, cloudPath: string) => {
  try {
    // @ts-ignore
    const res = await wx.cloud.uploadFile({
      cloudPath,
      filePath
    })
    return res.fileID
  } catch (e) {
    console.error('上传文件失败:', e)
    return null
  }
}

/**
 * 获取云存储文件临时链接
 */
export const getTempFileURL = async (fileID: string) => {
  try {
    // @ts-ignore
    const res = await wx.cloud.getTempFileURL({
      fileList: [fileID]
    })
    return res.fileList[0]?.tempFileURL || null
  } catch (e) {
    console.error('获取文件链接失败:', e)
    return null
  }
}
