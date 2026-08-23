import mongoose from 'mongoose';

const SettingsSchema = new mongoose.Schema({
  paymentMethod: { type: String, default: 'KPay' },
  kpayNumber: { type: String, default: '09123456789' },
  kpayName: { type: String, default: 'Myanmar Subtitle' },
  initialCharacters: { type: Number, default: 40000 },
  geminiModel: { type: String, default: 'gemini-3.1-flash-lite' },
  reviewModel: { type: String, default: 'gemini-3.1-flash-lite' },
  groqModel: { type: String, default: 'whisper-large-v3-turbo' },
  tiktokUrl: { type: String, default: '' },
  announcement: {
    active: { type: Boolean, default: false },
    text: { type: String, default: '' },
    type: { type: String, default: 'info' }
  },
  event: {
    active: { type: Boolean, default: false },
    discountPercent: { type: Number, default: 0 },
    bannerText: { type: String, default: '' }
  }
}, { timestamps: true });

export default mongoose.model('Settings', SettingsSchema);
