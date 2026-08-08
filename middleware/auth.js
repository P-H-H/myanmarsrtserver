import jwt from 'jsonwebtoken';
import User from '../models/User.js';

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

export function adminOnly(req,res,next){
  if(req.user.role!=='admin') return res.status(403).json({ error: 'Admin only' });
  next();
}
