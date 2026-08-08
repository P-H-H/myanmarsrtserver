import express from 'express';
import Payment from '../models/Payment.js';
import User from '../models/User.js';
import { getBot } from '../services/telegram.js';

const router = express.Router();

router.post('/webhook', async (req, res) => {
  const secret = req.headers['x-telegram-bot-api-secret-token'];
  if (secret !== process.env.TELEGRAM_WEBHOOK_SECRET) {
    return res.sendStatus(403);
  }

  // Telegram timeout မဖြစ်အောင် အမြန် 200 ပြန်
  res.sendStatus(200);

  const body = req.body;
  if (!body.callback_query) return;

  const { id: callbackId, data, message } = body.callback_query;
  const bot = getBot();

  try {
    const [action, paymentId] = (data || '').split('_');
    const payment = await Payment.findById(paymentId).populate('plan user');

    if (!payment) {
      if (bot) await bot.answerCallbackQuery(callbackId, { text: 'Payment not found' });
      return;
    }

    if (action === 'approve') {
      if (payment.status !== 'pending') {
        if (bot) await bot.answerCallbackQuery(callbackId, { text: 'Already processed' });
        return;
      }

      payment.status = 'approved';
      await payment.save();

      const user = await User.findById(payment.user._id || payment.user);
      if (user && payment.plan) {
        user.charactersBalance += payment.plan.characters;
        user.totalPurchased += payment.plan.characters;
        await user.save();
      }

      if (bot) {
        await bot.answerCallbackQuery(callbackId, { text: '✅ Approved' });
        if (message?.chat?.id && message?.message_id) {
          try {
            await bot.editMessageCaption(
              `✅ APPROVED\n\nUser: ${payment.user?.email || ''}\nPlan: ${payment.plan?.name || ''}\nID: ${payment._id}`,
              { chat_id: message.chat.id, message_id: message.message_id }
            );
          } catch (_) {}
        }
      }
    } else if (action === 'reject') {
      payment.status = 'rejected';
      payment.adminReason = 'Rejected via Telegram';
      await payment.save();

      if (bot) {
        await bot.answerCallbackQuery(callbackId, { text: '❌ Rejected' });
        if (message?.chat?.id && message?.message_id) {
          try {
            await bot.editMessageCaption(
              `❌ REJECTED\n\nUser: ${payment.user?.email || ''}\nID: ${payment._id}`,
              { chat_id: message.chat.id, message_id: message.message_id }
            );
          } catch (_) {}
        }
      }
    }
  } catch (e) {
    console.error('Telegram webhook error:', e.message);
    if (bot) {
      try {
        await bot.answerCallbackQuery(callbackId, { text: 'Error occurred' });
      } catch (_) {}
    }
  }
});

export default router;