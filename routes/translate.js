import express from 'express';
import jwt from 'jsonwebtoken';
import { auth } from '../middleware/auth.js';
import User from '../models/User.js';

const router = express.Router();

// 1. Prepare – Backend counts + signs
router.post('/prepare', auth, async (req, res) => {
  try {
    const { text } = req.body;
    if (!text || typeof text !== 'string') {
      return res.status(400).json({ error: 'Text required' });
    }

    const multiplier = Math.max(1, Math.min(50, Number(req.body.multiplier) || 1));
    const characters = text.length * multiplier;
    if (characters < 1) {
      return res.status(400).json({ error: 'Empty text' });
    }

    const user = await User.findById(req.user._id);
    if (!user || user.charactersBalance < characters) {
      return res.status(400).json({ error: 'Not enough characters' });
    }

    // Signed token – client cannot modify
    const prepareToken = jwt.sign(
      {
        uid: user._id.toString(),
        characters,
      },
      process.env.JWT_SECRET,
      { expiresIn: '20m' }
    );

    res.json({
      success: true,
      prepareToken,
      characters,
      balance: user.charactersBalance,
    });
  } catch (e) {
    console.error('Prepare error:', e);
    res.status(500).json({ error: 'Server error' });
  }
});

// 2. Deduct – only after successful translation
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