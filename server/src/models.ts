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
