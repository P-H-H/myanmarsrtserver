import express from 'express';
import { OAuth2Client } from 'google-auth-library';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';

const router = express.Router();
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

router.post('/google', async (req,res)=>{
  const { credential } = req.body;
  if(!credential) return res.status(400).json({ error: 'No credential' });
  try{
    const ticket = await client.verifyIdToken({ idToken: credential, audience: process.env.GOOGLE_CLIENT_ID });
    const payload = ticket.getPayload();
    const { sub, email, name, picture } = payload;

    let user = await User.findOne({ $or: [{ googleId: sub }, { email }] });
    if(!user){
      user = await User.create({ googleId: sub, email, name, picture, charactersBalance: 40000 });
    } else {
      user.googleId = sub;
      user.name = name;
      user.picture = picture;
      await user.save();
    }

    const token = jwt.sign({ id: user._id, email: user.email }, process.env.JWT_SECRET, { expiresIn: '30d' });
    res.json({ token, user: { id: user._id, email: user.email, name: user.name, picture: user.picture, charactersBalance: user.charactersBalance, charactersUsed: user.charactersUsed, role: user.role } });
  }catch(e){
    console.error(e);
    res.status(401).json({ error: 'Invalid Google token' });
  }
});

export default router;
