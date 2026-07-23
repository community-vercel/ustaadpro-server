import pool from '../config/db.js';
import { uploadComplaintImages } from '../middleware/complaintUpload.js';
import { sendComplaintEmail } from '../utils/mailer.js';

export const submitComplaint = [
  // Multer middleware
  (req, res, next) => {
    uploadComplaintImages(req, res, (err) => {
      if (err) {
        return res.status(400).json({ message: err.message });
      }
      next();
    });
  },

  // Handler
  async (req, res) => {
    try {
      const { name, email, phone, service, subService, description } = req.body;

      if (!name || !name.trim()) {
        return res.status(400).json({ message: 'Full name is required.' });
      }
      if (!phone || !phone.trim()) {
        return res.status(400).json({ message: 'Phone number is required.' });
      }
      if (!service || !service.trim()) {
        return res.status(400).json({ message: 'Service is required.' });
      }

      // Build image URL list from uploaded files
      const imageUrls = (req.files || []).map(
        (f) => `/uploads/complaints/${f.filename}`
      );

      const [[row]] = await pool.query(
        `INSERT INTO complaints (name, email, phone, service, sub_service, description, images)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING id, created_at`,
        [
          name.trim(),
          email?.trim() || null,
          phone.trim(),
          service.trim(),
          subService?.trim() || null,
          description?.trim() || null,
          JSON.stringify(imageUrls),
        ]
      );

      // Send email notification (non-blocking)
      try {
        await sendComplaintEmail({ name, email, phone, service, subService, description, imageUrls, complaintId: row.id });
      } catch (mailErr) {
        console.warn('⚠️ Complaint email failed:', mailErr.message);
      }

      res.status(201).json({
        message: 'Your complaint has been submitted successfully.',
        complaintId: row.id,
        submittedAt: row.created_at,
      });
    } catch (error) {
      console.error('Error submitting complaint:', error);
      res.status(500).json({ message: 'Internal server error.' });
    }
  },
];

// Admin: list all complaints
export const getComplaints = async (req, res) => {
  try {
    const limit = Math.min(50, Math.max(1, Number(req.query.limit || 20)));
    const offset = Math.max(0, Number(req.query.offset || 0));
    const status = req.query.status || null;

    const whereClause = status ? `WHERE status = $3` : '';
    const params = status ? [limit, offset, status] : [limit, offset];

    const [countResult, dataResult] = await Promise.all([
      pool.query(
        `SELECT COUNT(*) as total FROM complaints ${status ? 'WHERE status = $1' : ''}`,
        status ? [status] : []
      ),
      pool.query(
        `SELECT * FROM complaints ${whereClause} ORDER BY created_at DESC LIMIT $1 OFFSET $2`,
        params
      ),
    ]);

    const rows = countResult[0];       // countRows = [{ total: '5' }]
    const total = rows[0]?.total ?? 0; // the COUNT value
    const complaints = dataResult[0];  // dataRows = [{id, name, ...}, ...]

    res.json({
      complaints,
      total: Number(total),
      limit,
      offset,
      hasMore: offset + complaints.length < Number(total),
    });
  } catch (error) {
    console.error('Error fetching complaints:', error);
    res.status(500).json({ message: 'Internal server error.' });
  }
};

// Admin: update complaint status
export const updateComplaintStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const allowed = ['pending', 'in-review', 'resolved', 'rejected'];
    if (!allowed.includes(status)) {
      return res.status(400).json({ message: `Status must be one of: ${allowed.join(', ')}` });
    }

    const [[updated]] = await pool.query(
      `UPDATE complaints SET status = $1 WHERE id = $2 RETURNING id, status`,
      [status, id]
    );

    if (!updated) {
      return res.status(404).json({ message: 'Complaint not found.' });
    }

    res.json({ message: 'Status updated.', complaint: updated });
  } catch (error) {
    console.error('Error updating complaint:', error);
    res.status(500).json({ message: 'Internal server error.' });
  }
};

// User: get previously booked services for dropdown
export const getMyBookedServices = async (req, res) => {
  try {
    const userId = req.user.id;
    const [rows] = await pool.query(
      `SELECT DISTINCT 
         s.title as service, 
         oi.service_work_title as sub_service 
       FROM orders o 
       JOIN order_items oi ON o.id = oi.order_id 
       JOIN services s ON s.id = oi.service_id 
       WHERE o.user_id = $1 
       ORDER BY service ASC`,
      [userId]
    );

    res.json({ services: rows });
  } catch (error) {
    console.error('Error fetching booked services:', error);
    res.status(500).json({ message: 'Internal server error.' });
  }
};
