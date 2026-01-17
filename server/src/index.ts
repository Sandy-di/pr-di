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
import { User, Homework } from './models';

// ... (现有代码)

// 连接数据库
mongoose.connect('mongodb://127.0.0.1:27017/xiaochengxu')
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

// API: 获取作业列表
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
  // 在本地测试时是 http://localhost:3000/uploads/filename
  // 部署后是 http://your-domain.com/uploads/filename
  const baseUrl = `${req.protocol}://${req.get('host')}`;
  const fileUrl = `${baseUrl}/uploads/${req.file.filename}`;
  
  res.json({
    url: fileUrl,
    filename: req.file.filename,
    mimetype: req.file.mimetype,
    size: req.file.size
  });
});

// 启动服务器
app.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT}`);
  console.log(`Uploads directory: ${path.join(__dirname, '../uploads')}`);
});
