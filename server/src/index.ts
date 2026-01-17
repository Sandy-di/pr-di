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

// API: 健康检查
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date() });
});

// API: 文件上传 (图片 & 音频)
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
