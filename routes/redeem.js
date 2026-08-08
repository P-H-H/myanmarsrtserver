import express from 'express';
import { auth } from '../middleware/auth.js';
import RedeemCode from '../models/RedeemCode.js';
import User from '../models/User.js';

const router = express.Router();

router.post('/', auth, async (req, res) => {
  const { code } = req.body;
  if (!code || typeof code !== 'string') {
    return res.status(400).json({ error: 'Code required' });
  }

  const cleanCode = code.trim().toUpperCase();

  try {
    // 1. Code ရှိ/မရှိ စစ်
    const existing = await RedeemCode.findOne({ code: cleanCode });

    if (!existing) {
      return res.status(400).json({ error: 'Invalid code' });
    }

    if (!existing.isActive) {
      return res.status(400).json({ error: 'Invalid code' });
    }

    // 2. Expired စစ်
    if (existing.expiresAt && existing.expiresAt <= new Date()) {
      return res.status(400).json({ error: 'Code has expired' });
    }

    // 3. Limit ပြည့် စစ်
    if (existing.usedCount >= existing.maxUses) {
      return res.status(400).json({ error: 'Code usage limit reached' });
    }

    // 4. ဒီ user က သုံးပြီးသားလား
    if (existing.usedBy.some(id => id.toString() === req.user._id.toString())) {
      return res.status(400).json({ error: 'You have already used this code' });
    }

    // 5. Atomic redeem (race condition ကာကွယ်)
    const rc = await RedeemCode.findOneAndUpdate(
      {
        code: cleanCode,
        isActive: true,
        $or: [{ expiresAt: null }, { expiresAt: { $gt: new Date() } }],
        $expr: { $lt: ['$usedCount', '$maxUses'] },
        usedBy: { $nin: [req.user._id] }
      },
      {
        $inc: { usedCount: 1 },
        $addToSet: { usedBy: req.user._id }
      },
      { new: true }
    );

    if (!rc) {
      // concurrent request ကြောင့် fail ဖြစ်ရင်
      return res.status(400).json({ error: 'Code usage limit reached' });
    }

    const updatedUser = await User.findByIdAndUpdate(
      req.user._id,
      { $inc: { charactersBalance: rc.characters, totalPurchased: rc.characters } },
      { new: true }
    );

    res.json({
      success: true,
      added: rc.characters,
      balance: updatedUser.charactersBalance
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;