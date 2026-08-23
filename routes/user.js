import express from 'express';
import { auth } from '../middleware/auth.js';
import { encrypt, decrypt } from '../services/encryption.js';

const router = express.Router();

router.get('/me', auth, async (req, res) => {
  const user = req.user;
  res.json({
    id: user._id,
    email: user.email,
    name: user.name,
    picture: user.picture,
    charactersBalance: user.charactersBalance,
    charactersUsed: user.charactersUsed,
    totalPurchased: user.totalPurchased,
    hasGeminiKey: !!user.geminiApiKeyEncrypted,
    hasGroqKey: !!user.groqApiKeyEncrypted,
    role: user.role,
  });
});

router.post('/gemini-key', auth, async (req, res) => {
  const { apiKey } = req.body;
  if (!apiKey || apiKey.length < 10) return res.status(400).json({ error: 'Invalid key' });
  req.user.geminiApiKeyEncrypted = encrypt(apiKey.trim());
  await req.user.save();
  res.json({ success: true, hasGeminiKey: true });
});

router.delete('/gemini-key', auth, async (req, res) => {
  req.user.geminiApiKeyEncrypted = '';
  await req.user.save();
  res.json({ success: true });
});

router.get('/gemini-key', auth, async (req, res) => {
  const key = decrypt(req.user.geminiApiKeyEncrypted);
  if (!key) return res.status(404).json({ error: 'No key saved' });
  res.json({ apiKey: key });
});

router.post('/groq-key', auth, async (req, res) => {
  const { apiKey } = req.body;
  if (!apiKey || apiKey.length < 10) return res.status(400).json({ error: 'Invalid key' });
  req.user.groqApiKeyEncrypted = encrypt(apiKey.trim());
  await req.user.save();
  res.json({ success: true, hasGroqKey: true });
});

router.delete('/groq-key', auth, async (req, res) => {
  req.user.groqApiKeyEncrypted = '';
  await req.user.save();
  res.json({ success: true });
});

router.get('/groq-key', auth, async (req, res) => {
  const key = decrypt(req.user.groqApiKeyEncrypted);
  if (!key) return res.status(404).json({ error: 'No key saved' });
  res.json({ apiKey: key });
});

export default router;
