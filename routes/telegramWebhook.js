import express from 'express';
import Payment from '../models/Payment.js';
import User from '../models/User.js';

const router = express.Router();

router.post('/webhook', async (req,res)=>{

  const secret = req.headers['x-telegram-bot-api-secret-token'];
  if (secret !== process.env.TELEGRAM_WEBHOOK_SECRET) {
    return res.sendStatus(403);
  }
  
  const body = req.body;
  if(body.callback_query){
    const data = body.callback_query.data;
    const [action, paymentId] = data.split('_');
    const payment = await Payment.findById(paymentId).populate('plan user');
    if(!payment) return res.sendStatus(200);

    if(action==='approve' && payment.status==='pending'){
      payment.status='approved';
      await payment.save();
      const user = await User.findById(payment.user._id);
      user.charactersBalance += payment.plan.characters;
      user.totalPurchased += payment.plan.characters;
      await user.save();
    } else if(action==='reject'){
      payment.status='rejected';
      payment.adminReason='Rejected via Telegram';
      await payment.save();
    }
  }
  res.sendStatus(200);
});

export default router;
