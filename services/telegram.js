import TelegramBot from 'node-telegram-bot-api';

let bot = null;

/**
 * Function to get or initialize a Telegram bot instance
 * @returns {TelegramBot|null} Returns the bot instance if available and properly initialized, otherwise returns null
 */
export function getBot(){
  // If bot instance already exists, return it
  if(bot) return bot;
  // Retrieve bot token from environment variables
  const token = process.env.TELEGRAM_BOT_TOKEN;
  // If token is not available, return null
  if(!token) return null;
  bot = new TelegramBot(token, { polling: false });
  return bot;
}

export async function notifyPayment(payment, user, plan, file){
  const b = getBot();
  if(!b) return;
  const chatId = process.env.TELEGRAM_CHANNEL_ID;
  if(!chatId) return;

  const caption = `🧾 New Payment\n\nUser: ${user.email} (${user.name})\nPlan: ${plan.name} - ${plan.characters.toLocaleString()} chars\nAmount: ${plan.price} Ks\nPaymentID: ${payment._id}`;

  const opts = {
    caption,
    reply_markup: {
      inline_keyboard: [[
        { text: '✅ Approve', callback_data: `approve_${payment._id}` },
        { text: '❌ Reject', callback_data: `reject_${payment._id}` }
      ]]
    }
  };

  try{
    if (file?.buffer) {
      const msg = await b.sendPhoto(chatId, file.buffer, {
        ...opts,
        filename: file.originalname || 'screenshot.jpg'
      });
      return msg.message_id;
    }
    const msg = await b.sendMessage(chatId, caption, opts);
    return msg.message_id;
  }catch(e){
    console.error('Telegram notify error', e.message);
  }
}
