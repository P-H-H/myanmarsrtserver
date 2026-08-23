import express from "express";
import Plan from "../models/Plan.js";
import Settings from "../models/Settings.js";

const router = express.Router();

router.get("/", async (req, res) => {
  const plans = await Plan.find({ active: true }).sort({ order: 1 });
  const settings = await Settings.findOne();
  const discountActive =
    settings?.event?.active && settings?.event?.discountPercent > 0;
  const discount = settings?.event?.discountPercent || 0;

  const enriched = plans.map((p) => {
    const original = p.originalPrice || p.price;
    const finalPrice = discountActive
      ? Math.round(original * (1 - discount / 100))
      : p.price;
    const perHour = p.hoursEstimate
      ? Math.round(finalPrice / p.hoursEstimate)
      : 0;
    return {
      _id: p._id,
      name: p.name,
      slug: p.slug,
      characters: p.characters,
      hoursEstimate: p.hoursEstimate,
      price: finalPrice,
      originalPrice: discountActive ? original : null,
      perHour,
      isPopular: p.isPopular,
      isBestValue: p.isBestValue,
    };
  });

  res.json({
    plans: enriched,
    announcement: settings?.announcement,
    event: settings?.event,
    kpay: {
      method: settings?.paymentMethod || "KPay",
      number: settings?.kpayNumber,
      name: settings?.kpayName,
    },
    geminiModel: settings?.geminiModel || "gemini-3.1-flash-lite",
    reviewModel: settings?.reviewModel || "gemini-3.1-flash-lite",
    groqModel: settings?.groqModel || "whisper-large-v3-turbo",
    tiktokUrl: settings?.tiktokUrl || "",
  });
});

export default router;
