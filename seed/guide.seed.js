import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Guide from '../models/Guide.js';

dotenv.config();

const guides = [
  {
    slug: 'youtube-srt',
    title: 'YouTube Video က SRT ယူနည်း (downsub)',
    order: 1,
    content: `YouTube video မှာ စာတန်းထိုး (SRT) ရယူရန်:

1. https://downsub.com ကို ဖွင့်ပါ
2. YouTube video link ကို paste လုပ်ပါ
3. Download နှိပ်ပြီး .srt ဖိုင် ရယူပါ
4. ရလာတဲ့ .srt ကို ဒီ app မှာ တင်ပြီး မြန်မာလို ဘာသာပြန်ပါ

မှတ်ချက်: Video မှာ caption မရှိရင် downsub က SRT မပေးနိုင်ပါ။`,
  },
  {
    slug: 'no-srt-turboscribe',
    title: 'SRT မရှိရင် TurboScribe သုံးနည်း',
    order: 2,
    content: `Video မှာ စာတန်းထိုး လုံးဝ မရှိရင်

1. https://turboscribe.ai (သို့မဟုတ် အလားတူ speech-to-text tool) ကို သုံးပါ
2. Video / Audio ဖိုင် တင်ပြီး transcript ထုတ်ပါ
3. .srt အဖြစ် သိမ်းပြီး ဒီ app မှာ ဘာသာပြန်ပါ`,
  },
  {
    slug: 'gemini-key',
    title: 'Gemini API Key ရယူနည်း',
    order: 3,
    content: `1. https://aistudio.google.com/app/apikey ကို ဖွင့်ပါ
2. Google account နဲ့ ဝင်ပါ
3. Key ကို copy လုပ်ပါ
4. ဒီ app ရဲ့ Settings မှာ paste လုပ်ပြီး သိမ်းပါ

Key ကို အခြားသူ မပေးပါနှင့်။`,
  },
  {
    slug: 'how-to-translate',
    title: 'ဘာသာပြန်နည်း (အဆင့်ဆင့်)',
    order: 4,
    content: `1. Google နဲ့ Login ဝင်ပါ
2. Settings မှာ Gemini API Key ထည့်ပါ
3. Dashboard မှာ .srt ဖိုင် တင်ပါ
4. Character လုံလောက်မှု စစ်ဆေးပါ
5. Translate နှိပ်ပါ
6. ပြီးရင် Download သို့မဟုတ် Video နှင့် တိုက်စစ် / ပြင်ဆင်နိုင်သည်`,
  },
];

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  for (const g of guides) {
    await Guide.findOneAndUpdate({ slug: g.slug }, g, { upsert: true, new: true });
    console.log('Upserted guide:', g.slug);
  }
  console.log('Guide seed done');
  process.exit(0);
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
