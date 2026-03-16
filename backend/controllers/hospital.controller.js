const pool = require('../config/db');

// GET /api/hospitals
const getHospitals = async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT h.hospital_id, h.name, h.code, h.city, h.state, h.pincode,
             h.latitude, h.longitude, h.phone, h.email, h.level, h.is_active,
             hc.icu_beds_total, hc.icu_beds_available
      FROM hospitals h
      LEFT JOIN hospital_capacity hc ON hc.hospital_id = h.hospital_id
      WHERE h.is_active = 1
      ORDER BY h.name ASC
    `);
    return res.status(200).json({ data: rows });
  } catch (err) {
    console.error('getHospitals error:', err);
    return res.status(500).json({ error: 'Failed to fetch hospitals.' });
  }
};

// GET /api/hospitals/:id/capabilities
const getCapabilities = async (req, res) => {
  const { id } = req.params;
  try {
    const [hospRows] = await pool.query(
      'SELECT hospital_id, name, city, state FROM hospitals WHERE hospital_id = ?', [id]
    );
    if (hospRows.length === 0) return res.status(404).json({ error: 'Hospital not found.' });

    const [capRows] = await pool.query(
      // NOTE: column is can_harvest (not can_retrieve)
      `SELECT organ_type, can_harvest, can_transplant
       FROM hospital_capabilities
       WHERE hospital_id = ?`,
      [id]
    );
    return res.status(200).json({ data: { hospital: hospRows[0], capabilities: capRows } });
  } catch (err) {
    console.error('getCapabilities error:', err);
    return res.status(500).json({ error: 'Failed to fetch capabilities.' });
  }
};

// GET /api/hospitals/:id/blood-bank
const getBloodBank = async (req, res) => {
  const { id } = req.params;
  try {
    const [hospRows] = await pool.query(
      'SELECT hospital_id, name FROM hospitals WHERE hospital_id = ?', [id]
    );
    if (hospRows.length === 0) return res.status(404).json({ error: 'Hospital not found.' });

    const [bloodRows] = await pool.query(
      `SELECT blood_group, units_available, last_updated
       FROM blood_bank_inventory
       WHERE hospital_id = ?
       ORDER BY blood_group`,
      [id]
    );
    return res.status(200).json({ data: { hospital: hospRows[0], inventory: bloodRows } });
  } catch (err) {
    console.error('getBloodBank error:', err);
    return res.status(500).json({ error: 'Failed to fetch blood bank inventory.' });
  }
};

const getNetwork = async (req, res) => {
  try {
    const [hospitals] = await pool.query(`
      SELECT h.hospital_id, h.name, h.city, h.state,
             h.latitude, h.longitude, h.level,
             hc.icu_beds_total, hc.icu_beds_available
      FROM hospitals h
      LEFT JOIN hospital_capacity hc ON hc.hospital_id = h.hospital_id
      WHERE h.is_active = 1
    `);
    const [routes] = await pool.query(`
      SELECT from_hospital_id, to_hospital_id, distance_km, best_hours
      FROM transport_routes
    `);
    return res.status(200).json({ hospitals, routes });
  } catch (err) {
    console.error('getNetwork error:', err);
    return res.status(500).json({ error: 'Failed to fetch network.' });
  }
};
module.exports = { getHospitals, getCapabilities, getBloodBank, getNetwork };