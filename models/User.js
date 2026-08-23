import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema({
  googleId: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  name: String,
  picture: String,
  role: { type: String, enum: ['user','admin'], default: 'user' },
  charactersBalance: { type: Number, default: 0 },
  charactersUsed: { type: Number, default: 0 },
  totalPurchased: { type: Number, default: 0 },
  geminiApiKeyEncrypted: { type: String, default: '' },
  groqApiKeyEncrypted: { type: String, default: '' },
  lastRedeemAt: Date
}, { timestamps: true });

export default mongoose.model('User', UserSchema);
