import mongoose from 'mongoose';

const GuideSchema = new mongoose.Schema(
  {
    slug: { type: String, required: true, unique: true, index: true },
    title: { type: String, required: true },
    content: { type: String, required: true }, // markdown or plain HTML-safe text
    order: { type: Number, default: 0 },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export default mongoose.model('Guide', GuideSchema);
