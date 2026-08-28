import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import Settings from '../models/Settings.js';

export async function auth(req,res,next){
  const header = req.headers.authorization;
  if(!header) return res.status(401).json({ error: 'No token' });
  const token = header.split(' ')[1];
  try{
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);
    if(!user) return res.status(401).json({ error: 'User not found' });
    req.user = user;
    next();
  }catch{
    return res.status(401).json({ error: 'Invalid token' });
  }
}

export async function adminOnly(req,res,next){
  if(!req.user) return res.status(401).json({ error: 'No token' });
  if(req.user.role === 'admin') return next();
  try {
    const settings = await Settings.findOne().select('adminEmail').lean();
    const adminEmail = (settings?.adminEmail || '').trim().toLowerCase();
    if(adminEmail && req.user.email && req.user.email.toLowerCase() === adminEmail) {
      return next();
    }
  } catch {}
  return res.status(403).json({ error: 'Admin only' });
}
