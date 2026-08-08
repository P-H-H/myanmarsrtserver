import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Plan from '../models/Plan.js';
import Settings from '../models/Settings.js';
import RedeemCode from '../models/RedeemCode.js';

dotenv.config();

const plans = [
  {
    name: 'STARTER',
    slug: 'starter',
    characters: 400000,
    hoursEstimate: 10,
    price: 10000,
    originalPrice: 10000,
    order: 1
  },
  {
    name: 'PRO',
    slug: 'pro',
    characters: 1600000,
    hoursEstimate: 40,
    price: 36000,
    originalPrice: 36000,
    isPopular: true,
    order: 2
  },
  {
    name: 'STUDIO',
    slug: 'studio',
    characters: 4000000,
    hoursEstimate: 100,
    price: 80000,
    originalPrice: 80000,
    isBestValue: true,
    order: 3
  }
];

const redeemCodes = [
  { code: 'TIKTOK50K', characters: 50000, maxUses: 100, expiresAt: new Date(Date.now()+30*24*3600*1000) },
  { code: 'WELCOME10K', characters: 10000, maxUses: 500, expiresAt: new Date(Date.now()+60*24*3600*1000) },
  { code: 'SANKRAN25', characters: 100000, maxUses: 50, expiresAt: new Date(Date.now()+7*24*3600*1000) }
];

async function seed(){
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected');

  await Plan.deleteMany({});
  await Plan.insertMany(plans);
  console.log('Plans seeded');

  let settings = await Settings.findOne();
  if(!settings){
    settings = await Settings.create({
      paymentMethod: 'KPay',
      kpayNumber: '09912345678',
      kpayName: 'Myanmar Subtitle Admin',
      geminiModel: 'gemini-3.1-flash-lite',
      tiktokUrl: 'https://www.tiktok.com/@your_admin_tiktok',
      announcement: { active: false, text: '', type: 'info' },
      event: { active: false, discountPercent: 0, bannerText: '' }
    });
  }
  console.log('Settings ready:', settings.kpayNumber);

  // Example: enable Thingyan 25% discount
  // settings.event = { active: true, discountPercent: 25, bannerText: '🎉 သင်္ကြန် 25% Discount - ဧပြီ 20 အထိသာ!' };
  // settings.announcement = { active: true, text: '🎉 သင်္ကြန် 25% Discount - ဧပြီ 20 အထိသာ!', type: 'event' };
  // await settings.save();

  for(const rc of redeemCodes){
    const exists = await RedeemCode.findOne({ code: rc.code });
    if(!exists) await RedeemCode.create(rc);
  }
  console.log('Redeem codes seeded');

  console.log('All done. Edit this file to add more codes or change KPay number, then npm run seed again.');
  process.exit(0);
}

seed();
