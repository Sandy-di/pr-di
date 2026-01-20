import express from 'express';
import cors from 'cors';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// 静态资源：允许访问 uploads 目录下的文件
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// 文件上传配置
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // 生成唯一文件名: timestamp-random.ext
    const ext = path.extname(file.originalname);
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + ext);
  }
});

const upload = multer({ storage });

import mongoose from 'mongoose';
import { User, Homework, UserProgress, SharedRecording } from './models';

// 连接 MongoDB 数据库
mongoose.connect('mongodb://127.0.0.1:27017/xiaochengxu')
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

// 简单的用户中间件 (模拟登录)
app.use((req, res, next) => {
  // 暂时 hardcode，实际应从 Token 解析
  // @ts-ignore
  req.user = { openid: req.headers['x-user-id'] || 'test-dev-user' };
  next();
});

// ... (other APIs)

// API: 获取作业进度
app.get('/api/progress/:homeworkId', async (req, res) => {
  try {
    // @ts-ignore
    const openid = req.user.openid;
    const progress = await UserProgress.findOne({ openid, homeworkId: req.params.homeworkId });
    res.json(progress || {}); // 如果没有记录返回空对象
  } catch (e) {
    res.status(500).json({ error: '获取进度失败' });
  }
});

// API: 更新/保存作业进度
app.post('/api/progress', async (req, res) => {
  try {
    // @ts-ignore
    const openid = req.user.openid;
    const { homeworkId, ...data } = req.body;
    
    // updateOne with upsert
    await UserProgress.updateOne(
      { openid, homeworkId },
      { $set: data, $setOnInsert: { createdAt: new Date() } },
      { upsert: true }
    );
    res.json({ success: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: '保存进度失败' });
  }
});

// API: 获取作业列表 (Modify existing to support filter by query if needed, but simple is fine)
app.get('/api/homeworks', async (req, res) => {
  try {
    const homeworks = await Homework.find().sort({ createdAt: -1 });
    res.json(homeworks);
  } catch (e) {
    res.status(500).json({ error: '获取作业失败' });
  }
});

// API: 获取单个作业
app.get('/api/homeworks/:id', async (req, res) => {
  try {
    const homework = await Homework.findById(req.params.id);
    if (!homework) return res.status(404).json({ error: '未找到作业' });
    res.json(homework);
  } catch (e) {
    res.status(500).json({ error: '获取详情失败' });
  }
});

// API: 创建作业
app.post('/api/homeworks', async (req, res) => {
  try {
    const homework = new Homework(req.body);
    await homework.save();
    res.json(homework);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: '创建作业失败' });
  }
});

// API: 更新作业
app.put('/api/homeworks/:id', async (req, res) => {
  try {
    const homework = await Homework.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(homework);
  } catch (e) {
    res.status(500).json({ error: '更新失败' });
  }
});

// API: 删除作业
app.delete('/api/homeworks/:id', async (req, res) => {
  try {
    await Homework.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: '删除失败' });
  }
});

// API: 文件上传 (图片 & 音频)
// ... (保留现有上传代码)
app.post('/api/upload', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: '没有文件上传' });
  }
  
  // 返回完整的访问 URL
  // 使用固定域名确保 HTTPS
  const baseUrl = 'https://xinximassage.site';
  const fileUrl = `${baseUrl}/uploads/${req.file.filename}`;
  
  res.json({
    url: fileUrl,
    filename: req.file.filename,
    mimetype: req.file.mimetype,
    size: req.file.size
  });
});

// API: 创建分享录音
app.post('/api/share', async (req, res) => {
  try {
    // @ts-ignore
    const openid = req.user.openid;
    const { name, audioUrl, duration, homeworkId, homeworkTitle } = req.body;
    
    // 生成唯一分享ID
    const shareId = Date.now().toString(36) + Math.random().toString(36).substring(2, 8);
    
    const sharedRecording = new SharedRecording({
      shareId,
      openid,
      name,
      audioUrl,
      duration,
      homeworkId,
      homeworkTitle
    });
    
    await sharedRecording.save();
    res.json({ shareId, success: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: '创建分享失败' });
  }
});

// API: 获取分享录音详情 (无需登录)
app.get('/api/share/:shareId', async (req, res) => {
  try {
    const shared = await SharedRecording.findOne({ shareId: req.params.shareId });
    if (!shared) {
      return res.status(404).json({ error: '分享不存在或已过期' });
    }
    
    // 增加播放次数
    shared.viewCount = (shared.viewCount || 0) + 1;
    await shared.save();
    
    res.json(shared);
  } catch (e) {
    res.status(500).json({ error: '获取分享失败' });
  }
});

// 启动服务器
app.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT}`);
  console.log(`Uploads directory: ${path.join(__dirname, '../uploads')}`);
});
