import mongoose from 'mongoose';
import dotenv from 'dotenv';
import RedeemCode from '../models/RedeemCode.js';
dotenv.config();

// edit → run: npm run seed:redeem
const codes = [
  // { code: 'REDEEM100K', characters: 100000, maxUses: 100, days: 30 },
  // { code: 'WELCOME10K', characters: 10000, maxUses: 500, days: 60 },
];

await mongoose.connect(process.env.MONGODB_URI);
for (const c of codes) {
  const code = c.code.toUpperCase();
  if (await RedeemCode.findOne({ code })) {
    console.log('skip', code);
    continue;
  }
  await RedeemCode.create({
    code,
    characters: c.characters,
    maxUses: c.maxUses || 1,
    expiresAt: c.days ? new Date(Date.now() + c.days * 864e5) : undefined,
  });
  console.log('ok', code, '+'+c.characters);
}
process.exit(0);