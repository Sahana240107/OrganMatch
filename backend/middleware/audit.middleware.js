const pool = require('../config/db');

const auditLog = (action) => {
  return async (req, res, next) => {
    const originalJson = res.json.bind(res);
    res.json = async (body) => {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        try {
          const record_id = body?.data?.id || null;
          await pool.query(
            `INSERT INTO audit_log (user_id, action, table_name, record_id, new_values, ip_address)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [req.user?.user_id || null, action, action.split('_')[0] + 's',
             record_id, JSON.stringify(req.body || {}), req.ip || null]
          );
        } catch (e) { console.error('Audit error:', e.message); }
      }
      return originalJson(body);
    };
    next();
  };
};

module.exports = { auditLog };