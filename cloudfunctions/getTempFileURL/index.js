// 云函数：获取临时文件URL
// 用于绕过"仅创建者可读写"的存储权限限制

const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

exports.main = async (event, context) => {
  const { fileList } = event
  
  if (!fileList || !Array.isArray(fileList) || fileList.length === 0) {
    return {
      success: false,
      error: 'fileList is required'
    }
  }
  
  try {
    const result = await cloud.getTempFileURL({
      fileList: fileList
    })
    
    return {
      success: true,
      fileList: result.fileList
    }
  } catch (error) {
    console.error('获取临时URL失败:', error)
    return {
      success: false,
      error: error.message || '获取失败'
    }
  }
}
