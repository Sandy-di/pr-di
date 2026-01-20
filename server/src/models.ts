import mongoose from 'mongoose';

// User Schema (对应微信用户信息)
const userSchema = new mongoose.Schema({
  openid: { type: String, required: true, unique: true },
  nickname: String,
  role: { type: String, default: 'student' }, // 'admin' | 'student'
  createdAt: { type: Date, default: Date.now }
});

export const User = mongoose.model('User', userSchema);

// Homework Schema (对应作业)
const homeworkSchema = new mongoose.Schema({
  title: String,
  description: String,
  difficulty: String, // 'easy' | 'medium' | 'hard'
  scale: String,      // 调性
  tempo: Number,      // 速度
  timeSignature: {    // 拍号 4/4
    type: String, 
    default: '4/4' 
  },
  
  sheetImages: [String], // 图片 URL 列表
  imageWidth: Number,
  imageHeight: Number,
  
  demoAudioUrl: String,  // 示范音频 URL
  demoAudioName: String,
  
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

export const Homework = mongoose.model('Homework', homeworkSchema);

// UserProgress Schema (用户作业进度)
const userProgressSchema = new mongoose.Schema({
  openid: { type: String, required: true }, // 用户标识
  homeworkId: { type: String, required: true },
  completed: { type: Boolean, default: false },
  practiceCount: { type: Number, default: 0 },
  lastPracticeAt: Date,
  recordings: [String], // 录音 URL 列表
  
  updatedAt: { type: Date, default: Date.now }
});

// 复合索引：快速查找某用户的某作业进度
userProgressSchema.index({ openid: 1, homeworkId: 1 }, { unique: true });

export const UserProgress = mongoose.model('UserProgress', userProgressSchema);

// SharedRecording Schema (分享的录音)
const sharedRecordingSchema = new mongoose.Schema({
  shareId: { type: String, required: true, unique: true }, // 分享唯一标识
  openid: { type: String, required: true }, // 分享者
  name: { type: String, required: true },   // 录音名称
  audioUrl: { type: String, required: true }, // 音频文件 URL
  duration: { type: Number, required: true }, // 时长(ms)
  homeworkId: String,                        // 关联作业ID
  homeworkTitle: String,                     // 关联作业标题
  createdAt: { type: Date, default: Date.now },
  viewCount: { type: Number, default: 0 }    // 播放次数
});

export const SharedRecording = mongoose.model('SharedRecording', sharedRecordingSchema);
