import mongoose from 'mongoose';

const PlanSchema = new mongoose.Schema({
  name: { type: String, required: true },
  slug: { type: String, required: true, unique: true },
  characters: { type: Number, required: true },
  hoursEstimate: { type: Number, required: true },
  price: { type: Number, required: true },
  originalPrice: { type: Number },
  isPopular: { type: Boolean, default: false },
  isBestValue: { type: Boolean, default: false },
  active: { type: Boolean, default: true },
  order: { type: Number, default: 0 }
}, { timestamps: true });

export default mongoose.model('Plan', PlanSchema);
