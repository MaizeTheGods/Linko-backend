import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  username: { 
    type: String, 
    required: true, 
    unique: true,
    minlength: 3,
    maxlength: 30
  },
  email: { 
    type: String, 
    required: true, 
    unique: true,
    match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  },
  password: { 
    type: String, 
    required: true 
  },
  avatar: { 
    type: String, 
    default: 'default-avatar.png' 
  },
  banner: { 
    type: String, 
    default: 'default-banner.png' 
  },
  bio: { 
    type: String, 
    maxlength: 160 
  },
  location: String,
  website: String,
  birthdate: Date,
  createdAt: { 
    type: Date, 
    default: Date.now 
  }
});

export default mongoose.model('User', userSchema);
