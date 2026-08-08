import mongoose from 'mongoose';

const PaymentSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  plan: { type: mongoose.Schema.Types.ObjectId, ref: 'Plan', required: true },
  screenshotUrl: { type: String, default:'' },
  amount: Number,
  status: { type: String, enum: ['pending','approved','rejected'], default: 'pending' },
  adminReason: String,
  telegramMessageId: Number
}, { timestamps: true });

export default mongoose.model('Payment', PaymentSchema);
