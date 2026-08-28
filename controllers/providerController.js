import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import pool from '../config/db.js';
import Provider from '../models/Provider.js';
import Order from '../models/Order.js';

const JWT_SECRET = process.env.JWT_SECRET || 'ustaadpro_super_secret_key_123!';
const allowedProviderStatuses = ['accepted', 'in_progress', 'completed', 'cancelled'];

function validateProvider(body, requirePassword = true) {
  const input = {
    name: String(body.name || '').trim(), email: String(body.email || '').trim().toLowerCase(),
    phone: String(body.phone || '').trim(), password: String(body.password || ''),
    trade: String(body.trade || '').trim(), commissionPercent: Number(body.commissionPercent ?? 80),
    isAvailable: body.isAvailable !== false, isActive: body.isActive !== false,
  };
  if (!input.name || !input.email || !input.phone || !input.trade || (requirePassword && !input.password)) {
    const error = new Error('Name, email, phone, trade and password are required.'); error.statusCode = 400; throw error;
  }
  if (!/^\S+@\S+\.\S+$/.test(input.email)) { const error = new Error('Enter a valid email address.'); error.statusCode = 400; throw error; }
  if (!Number.isFinite(input.commissionPercent) || input.commissionPercent < 0 || input.commissionPercent > 100) {
    const error = new Error('Commission must be between 0 and 100.'); error.statusCode = 400; throw error;
  }
  return input;
}

export const listProviders = async (_req, res) => { try { res.json(await Provider.list()); } catch (e) { res.status(500).json({message: e.message}); } };
export const createProvider = async (req, res) => { try { res.status(201).json(await Provider.create(validateProvider(req.body))); } catch (e) { res.status(e.statusCode || (e.code === '23505' ? 409 : 500)).json({message: e.code === '23505' ? 'Email or phone is already registered.' : e.message}); } };
export const updateProvider = async (req, res) => { try { const currentPasswordOptional = validateProvider(req.body, false); const provider = await Provider.update(req.params.id, currentPasswordOptional); if (!provider) return res.status(404).json({message: 'Provider not found.'}); res.json(provider); } catch (e) { res.status(e.statusCode || (e.code === '23505' ? 409 : 500)).json({message: e.code === '23505' ? 'Email or phone is already registered.' : e.message}); } };
export const deleteProvider = async (req, res) => { try { await Provider.ensureSchema(); const [result] = await pool.query('DELETE FROM providers WHERE id=?', [req.params.id]); if (!result.affectedRows) return res.status(404).json({message: 'Provider not found.'}); res.json({message: 'Provider deleted.'}); } catch (e) { res.status(500).json({message: e.message}); } };

export const assignProvider = async (req, res) => {
  try {
    await Provider.ensureSchema();
    const providerId = Number(req.body.providerId);
    const [providers] = await pool.query('SELECT id FROM providers WHERE id=? AND is_active=TRUE', [providerId]);
    if (!providers[0]) return res.status(404).json({message: 'Active provider not found.'});
    const [result] = await pool.query(
      "UPDATE orders SET provider_id=?, provider_job_status='assigned', assigned_at=CURRENT_TIMESTAMP, status='assigned' WHERE id=? RETURNING id",
      [providerId, req.params.id],
    );
    if (!result[0]) return res.status(404).json({message: 'Order not found.'});
    res.json({message: 'Provider assigned.', orderId: req.params.id, providerId, status: 'assigned'});
  } catch (e) { res.status(500).json({message: e.message}); }
};

export const loginProvider = async (req, res) => {
  try {
    const identifier = String(req.body.identifier || req.body.email || req.body.phone || '').trim();
    const password = String(req.body.password || '');
    if (!identifier || !password) return res.status(400).json({message: 'Email or phone and password are required.'});
    const row = await Provider.findForLogin(identifier);
    if (!row || !(await bcrypt.compare(password, row.passwordHash ?? row.password_hash))) return res.status(401).json({message: 'Invalid credentials.'});
    const token = jwt.sign({id: row.id, role: 'provider'}, JWT_SECRET, {expiresIn: '30d'});
    res.json({token, provider: Provider.format(row)});
  } catch (e) { res.status(500).json({message: e.message}); }
};

async function getProviderJobs(providerId) {
  const [rows] = await pool.query(
    `SELECT o.id, o.total as amount, o.address, o.booked_for as bookedFor, o.status,
            o.provider_job_status as providerJobStatus, o.special_instructions as notes,
            u.name as customerName, u.phone as customerPhone,
            p.commission_percent as commissionPercent,
            STRING_AGG(COALESCE(oi.service_work_title, s.title), ', ') as serviceTitle
     FROM orders o JOIN users u ON u.id=o.user_id JOIN providers p ON p.id=o.provider_id
     LEFT JOIN order_items oi ON oi.order_id=o.id LEFT JOIN services s ON s.id=oi.service_id
     WHERE o.provider_id=? GROUP BY o.id,u.name,u.phone,p.commission_percent ORDER BY o.created_at DESC`,
    [providerId],
  );
  return rows.map(row => ({...row, amount: Number(row.amount), status: row.status === 'assigned' ? (row.providerJobStatus || 'assigned') : row.status,
    providerEarning: Number(row.amount) * Number(row.commissionPercent) / 100,
    platformCommission: Number(row.amount) * (100 - Number(row.commissionPercent)) / 100,
    serviceItems: row.serviceTitle ? row.serviceTitle.split(', ').map(title => ({title, quantity: 1, price: 0})) : []}));
}

export const getDashboard = async (req, res) => {
  try {
    const jobs = await getProviderJobs(req.provider.id); const completed = jobs.filter(j => j.status === 'completed');
    const today = new Date().toISOString().slice(0, 10); const todayCompleted = completed.filter(j => String(j.bookedFor).includes(today));
    const totalEarnings = completed.reduce((sum, job) => sum + job.providerEarning, 0);
    res.json({balance: totalEarnings, todayEarnings: todayCompleted.reduce((s,j)=>s+j.providerEarning,0), monthEarnings: totalEarnings,
      todayJobs: jobs.filter(j => String(j.bookedFor).includes(today)).length, activeJobs: jobs.filter(j => ['assigned','accepted','in_progress'].includes(j.status)).length,
      completedJobs: completed.length, jobs});
  } catch (e) { res.status(500).json({message: e.message}); }
};

export const getEarnings = async (req, res) => { try { const jobs = (await getProviderJobs(req.provider.id)).filter(j=>j.status==='completed'); res.json(jobs.map(j=>({id:`earning-${j.id}`,orderId:j.id,serviceTitle:j.serviceTitle,amount:j.providerEarning,type:'earning',createdAt:j.bookedFor}))); } catch(e) { res.status(500).json({message:e.message}); } };
export const updateAvailability = async (req,res) => { try { const [rows]=await pool.query('UPDATE providers SET is_available=?,updated_at=CURRENT_TIMESTAMP WHERE id=? RETURNING *',[Boolean(req.body.isAvailable),req.provider.id]); res.json(Provider.format(rows[0])); } catch(e){res.status(500).json({message:e.message});} };
export const saveLocation = async (req,res) => { try { await pool.query('UPDATE providers SET latitude=?,longitude=?,location_recorded_at=? WHERE id=?',[Number(req.body.latitude),Number(req.body.longitude),req.body.recordedAt || new Date(),req.provider.id]); res.json({message:'Location updated.'}); } catch(e){res.status(500).json({message:e.message});} };
export const updateProviderJobStatus = async (req,res) => {
  try {
    const status=String(req.body.status||''); if(!allowedProviderStatuses.includes(status)) return res.status(400).json({message:'Invalid job status.'});
    const [rows]=await pool.query('SELECT status,provider_job_status as providerJobStatus FROM orders WHERE id=? AND provider_id=?',[req.params.id,req.provider.id]);
    if(!rows[0]) return res.status(404).json({message:'Assigned job not found.'});
    const current=rows[0].status==='assigned' ? rows[0].providerJobStatus : rows[0].status;
    const allowedNext={assigned:'accepted',accepted:'in_progress',in_progress:'completed'};
    if(status!=='cancelled' && allowedNext[current]!==status) return res.status(409).json({message:`Job cannot move from ${current} to ${status}.`});
    if(status==='accepted') await pool.query("UPDATE orders SET provider_job_status='accepted' WHERE id=?",[req.params.id]);
    else {
      await Order.updateStatus(req.params.id,status,status==='cancelled'?'Cancelled by provider':null);
      await pool.query('UPDATE orders SET provider_job_status=? WHERE id=?',[status,req.params.id]);
      if (status === 'completed') {
        await pool.query(`UPDATE providers SET completed_jobs=(SELECT COUNT(*) FROM orders WHERE provider_id=? AND status='completed'), updated_at=CURRENT_TIMESTAMP WHERE id=?`, [req.provider.id, req.provider.id]);
      }
    }
    res.json({id:req.params.id,status});
  } catch(e){res.status(500).json({message:e.message});}
};
