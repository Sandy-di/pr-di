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
