import express from 'express';
import jwt from 'jsonwebtoken';
import Provider from '../models/Provider.js';
import {loginProvider,getDashboard,getEarnings,updateAvailability,saveLocation,updateProviderJobStatus} from '../controllers/providerController.js';

const router=express.Router();
const JWT_SECRET=process.env.JWT_SECRET || 'ustaadpro_super_secret_key_123!';
async function requireProvider(req,res,next){
  try { const token=req.headers.authorization?.replace(/^Bearer\s+/,''); const decoded=jwt.verify(token,JWT_SECRET); if(decoded.role!=='provider') throw new Error();
    const [providers]=await (await import('../config/db.js')).default.query('SELECT * FROM providers WHERE id=? AND is_active=TRUE',[decoded.id]);
    if(!providers[0]) throw new Error(); req.provider=Provider.format(providers[0]); next();
  } catch { res.status(401).json({message:'Invalid or expired provider session.'}); }
}
router.post('/auth/login',loginProvider);
router.use(requireProvider);
router.get('/dashboard',getDashboard);
router.get('/earnings',getEarnings);
router.patch('/me/availability',updateAvailability);
router.post('/location',saveLocation);
router.patch('/jobs/:id/status',updateProviderJobStatus);
export default router;
