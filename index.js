import express from 'express';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import rateLimit from 'express-rate-limit';
import helmet from "helmet"

import authRoute from './routes/auth.js';
import userRoute from './routes/user.js';
import plansRoute from './routes/plans.js';
import translateRoute from './routes/translate.js';
import redeemRoute from './routes/redeem.js';
import paymentRoute from './routes/payment.js';
import telegramWebhook from './routes/telegramWebhook.js';

dotenv.config();
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3000;
app.set('trust proxy', 1);

app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false
}));

app.use(cors({ origin: process.env.CLIENT_URL || '*', credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));




// ===== Rate Limiters =====
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200,                 // 1 IP = 200 requests / 15 min
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' }
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,                  // Login ကို ပိုတင်းကျပ်
  message: { error: 'Too many login attempts' }
});

const translateLimiter = rateLimit({
  windowMs: 60 * 1000,      // 1 minute
  max: 10,                  // Reserve/Release ကို တစ်မိနစ် ၁၀ ခါ
  message: { error: 'Too many translate requests' }
});

const redeemLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10,
  message: { error: 'Too many redeem attempts' }
});

const paymentLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 15,                  // 15 minutes ထဲ ၁၅ ခါ
  message: { error: 'Too many payment requests' }
});

// ===== Apply =====
app.use('/api/', generalLimiter);                    // အားလုံးကို အခြေခံ ကာကွယ်
app.use('/api/auth', authLimiter);
app.use('/api/translate', translateLimiter);
app.use('/api/redeem', redeemLimiter);
app.use('/api/payment', paymentLimiter);           // payment ကိုလည်း တင်းကျပ်


app.get('/api/health', (req,res)=>res.json({ ok: true, time: new Date() }));

app.use('/api/auth', authRoute);
app.use('/api/user', userRoute);
app.use('/api/plans', plansRoute);
app.use('/api/translate', translateRoute);
app.use('/api/redeem', redeemRoute);
app.use('/api/payment', paymentRoute);
app.use('/api/telegram', telegramWebhook);

// Serve client in production
const clientDist = path.join(__dirname, '../client/dist');
if(fs.existsSync(clientDist)){
  app.use(express.static(clientDist));
  app.get('*', (req,res)=> res.sendFile(path.join(clientDist,'index.html')));
}

mongoose.connect(process.env.MONGODB_URI).then(()=>{
  console.log('MongoDB connected');
  app.listen(PORT, '0.0.0.0', ()=>console.log(`Server running on http://0.0.0.0:${PORT}`));
}).catch(e=>{ console.error(e); process.exit(1); });
