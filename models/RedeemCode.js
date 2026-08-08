import mongoose from 'mongoose';

const RedeemCodeSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true, uppercase: true },
  characters: { type: Number, required: true },
  maxUses: { type: Number, default: 1 },
  usedCount: { type: Number, default: 0 },
  expiresAt: { type: Date },
  isActive: { type: Boolean, default: true },
  usedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }]
}, { timestamps: true });

export default mongoose.model('RedeemCode', RedeemCodeSchema);
