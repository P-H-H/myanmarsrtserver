
import express from 'express';
import jwt from 'jsonwebtoken';
import { auth } from '../middleware/auth.js';
import User from '../models/User.js';
import Settings from '../models/Settings.js';

const router = express.Router();

// 1. Prepare – Backend counts + signs
// Client must NEVER control the multiplier for paid features.
// - feature: 'contentWriter' → always use Settings.contentWriterMultiplier from DB
// - otherwise (subtitle etc.) → multiplier defaults to 1 (client cannot raise/lower for fraud)
router.post('/prepare', auth, async (req, res) => {
  try {
    const { text, feature } = req.body;
    if (!text || typeof text !== 'string') {
      return res.status(400).json({ error: 'Text required' });
    }

    let multiplier = 1;

    if (feature === 'contentWriter') {
      // Server-side only — ignore any client-sent multiplier
      const settings = await Settings.findOne().select('contentWriterMultiplier').lean();
      const dbMul = Number(settings?.contentWriterMultiplier);
      multiplier = Math.max(1, Math.min(50, Number.isFinite(dbMul) && dbMul > 0 ? dbMul : 10));
    } else {
      // Subtitle / other: fixed 1x. Do not trust client multiplier.
      multiplier = 1;
    }

    const characters = text.length * multiplier;
    if (characters < 1) {
      return res.status(400).json({ error: 'Empty text' });
    }

    const user = await User.findById(req.user._id);
    if (!user || user.charactersBalance < characters) {
      return res.status(400).json({ error: 'Not enough characters' });
    }

    // Signed token – client cannot modify characters or feature
    const prepareToken = jwt.sign(
      {
        uid: user._id.toString(),
        characters,
        feature: feature === 'contentWriter' ? 'contentWriter' : 'default',
        multiplier,
      },
      process.env.JWT_SECRET,
      { expiresIn: '20m' }
    );

    res.json({
      success: true,
      prepareToken,
      characters,
      multiplier,
      balance: user.charactersBalance,
    });
  } catch (e) {
    console.error('Prepare error:', e);
    res.status(500).json({ error: 'Server error' });
  }
});

// 2. Deduct – only after successful translation / generation
router.post('/deduct', auth, async (req, res) => {
  try {
    const { prepareToken } = req.body;
    if (!prepareToken) {
      return res.status(400).json({ error: 'prepareToken required' });
    }

    let payload;
    try {
      payload = jwt.verify(prepareToken, process.env.JWT_SECRET);
    } catch {
      return res.status(400).json({ error: 'Invalid or expired token' });
    }

    // Must belong to the same user
    if (payload.uid !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Token mismatch' });
    }

    const characters = Number(payload.characters);
    if (!characters || characters < 1) {
      return res.status(400).json({ error: 'Invalid characters in token' });
    }

    // Atomic deduct
    const updated = await User.findOneAndUpdate(
      {
        _id: req.user._id,
        charactersBalance: { $gte: characters },
      },
      {
        $inc: {
          charactersBalance: -characters,
          charactersUsed: characters,
        },
      },
      { new: true }
    );

    if (!updated) {
      return res.status(400).json({ error: 'Not enough characters' });
    }

    res.json({
      success: true,
      charactersUsed: characters,
      remaining: updated.charactersBalance,
    });
  } catch (e) {
    console.error('Deduct error:', e);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;