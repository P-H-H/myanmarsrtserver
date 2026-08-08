import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { auth, adminOnly } from '../middleware/auth.js';
import Payment from '../models/Payment.js';
import Plan from '../models/Plan.js';
import { notifyPayment } from '../services/telegram.js';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

router.post('/kpay', auth, upload.single('screenshot'), async (req,res)=>{
  const { planId } = req.body;
  if(!planId || !req.file) return res.status(400).json({ error: 'Plan and screenshot required' });
  const plan = await Plan.findById(planId);
  if(!plan) return res.status(404).json({ error: 'Plan not found' });

  if (!req.file?.buffer) return res.status(400).json({ error: 'Screenshot လိုအပ်ပါတယ်' });

  const payment = await Payment.create({
    user: req.user._id,
    plan: plan._id,
    screenshotUrl:'',
    amount: plan.price,
    status: 'pending'
  });

  // telegram notify async
  try{
    const msgId = await notifyPayment(payment, req.user, plan, req.file);
    if(msgId) {
      payment.telegramMessageId = msgId;
      await payment.save();
    }
  }catch{}

  res.json({ success: true, payment, message: 'Payment submitted. Waiting for admin approval.' });
});

router.get('/my', auth, async (req,res)=>{
  const list = await Payment.find({ user: req.user._id }).populate('plan').sort({ createdAt: -1 });
  res.json(list);
});

// Admin manual approve/reject (if not using telegram)
router.get('/admin/pending', auth, adminOnly, async (req,res)=>{
  const list = await Payment.find({ status: 'pending' }).populate('user plan').sort({ createdAt: -1 });
  res.json(list);
});

router.post('/admin/:id/approve', auth, adminOnly, async (req,res)=>{
  const payment = await Payment.findById(req.params.id).populate('plan user');
  if(!payment) return res.status(404).json({ error: 'Not found' });
  if(payment.status!=='pending') return res.status(400).json({ error: 'Already processed' });

  payment.status='approved';
  await payment.save();

  const user = payment.user;
  user.charactersBalance += payment.plan.characters;
  user.totalPurchased += payment.plan.characters;
  await user.save();

  res.json({ success: true });
});

router.post('/admin/:id/reject', auth, adminOnly, async (req,res)=>{
  const { reason } = req.body;
  const payment = await Payment.findById(req.params.id);
  if(!payment) return res.status(404).json({ error: 'Not found' });
  payment.status='rejected';
  payment.adminReason = reason || 'Invalid screenshot';
  await payment.save();
  res.json({ success: true });
});

export default router;
