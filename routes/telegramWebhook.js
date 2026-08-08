import express from 'express';
import Payment from '../models/Payment.js';
import User from '../models/User.js';
import { getBot } from '../services/telegram.js';

const router = express.Router();

// Admin က reason စောင့်နေတဲ့ state (lean — memory)
// key = telegram chat id (string), value = paymentId
const pendingReject = new Map();

router.post('/webhook', async (req, res) => {
  const secret = req.headers['x-telegram-bot-api-secret-token'];
  if (secret !== process.env.TELEGRAM_WEBHOOK_SECRET) {
    return res.sendStatus(403);
  }

  res.sendStatus(200);

  const body = req.body;
  const bot = getBot();

  // ---------- 1) Callback buttons (Approve / Reject) ----------
  if (body.callback_query) {
    const { id: callbackId, data, message, from } = body.callback_query;
    const chatId = message?.chat?.id;

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
          if (chatId && message?.message_id) {
            try {
              await bot.editMessageCaption(
                `✅ APPROVED\n\nUser: ${payment.user?.email || ''}\nPlan: ${payment.plan?.name || ''}\nID: ${payment._id}`,
                { chat_id: chatId, message_id: message.message_id }
              );
            } catch (_) {}
          }
        }
        return;
      }

      if (action === 'reject') {
        if (payment.status !== 'pending') {
          if (bot) await bot.answerCallbackQuery(callbackId, { text: 'Already processed' });
          return;
        }

        // Reason စောင့် — ချက်ချင်း reject မလုပ်
        if (chatId) {
          pendingReject.set(String(chatId), paymentId);
        }

        if (bot) {
          await bot.answerCallbackQuery(callbackId, { text: 'Type reject reason…' });
          await bot.sendMessage(
            chatId,
            `❌ Reject reason ရိုက်ပေးပါ\nPayment: ${paymentId}\n\n(စာရိုက်ပြီး Send နှိပ်ပါ)`,
            { reply_to_message_id: message?.message_id }
          );
        }
        return;
      }
    } catch (e) {
      console.error('Telegram callback error:', e.message);
      if (bot) {
        try {
          await bot.answerCallbackQuery(callbackId, { text: 'Error' });
        } catch (_) {}
      }
    }
    return;
  }

  // ---------- 2) Text message = reject reason ----------
  if (body.message?.text && body.message?.chat?.id) {
    const chatId = String(body.message.chat.id);
    const paymentId = pendingReject.get(chatId);

    if (!paymentId) return; // reason စောင့်နေတာ မဟုတ်

    const reason = body.message.text.trim();
    if (!reason) {
      if (bot) await bot.sendMessage(chatId, 'Reason အလွတ် မရပါ။ ထပ်ရိုက်ပါ။');
      return;
    }

    try {
      const payment = await Payment.findById(paymentId).populate('user plan');
      if (!payment) {
        pendingReject.delete(chatId);
        if (bot) await bot.sendMessage(chatId, 'Payment not found');
        return;
      }

      if (payment.status !== 'pending') {
        pendingReject.delete(chatId);
        if (bot) await bot.sendMessage(chatId, 'Already processed');
        return;
      }

      payment.status = 'rejected';
      payment.adminReason = reason;
      await payment.save();
      pendingReject.delete(chatId);

      if (bot) {
        await bot.sendMessage(chatId, `❌ Rejected\nReason: ${reason}\nID: ${paymentId}`);

        // မူရင်း payment message caption ပြင် (message_id သိရင်)
        if (payment.telegramMessageId) {
          try {
            await bot.editMessageCaption(
              `❌ REJECTED\n\nUser: ${payment.user?.email || ''}\nReason: ${reason}\nID: ${payment._id}`,
              {
                chat_id: chatId,
                message_id: payment.telegramMessageId,
              }
            );
          } catch (_) {}
        }
      }
    } catch (e) {
      console.error('Telegram reject reason error:', e.message);
      if (bot) await bot.sendMessage(chatId, 'Error while rejecting');
    }
  }
});

export default router;