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
    // FIX: was returning { data: rows } — frontend reads d?.data||d?.hospitals — both work,
    // but icu data was nested under h.capacity.* which doesn't exist.
    // We now also embed capacity as a sub-object so both flat AND nested access work.
    const enriched = rows.map(r => ({
      ...r,
      capacity: r.icu_beds_total != null
        ? { icu_beds_total: r.icu_beds_total, icu_beds_available: r.icu_beds_available }
        : null,
    }));
    return res.status(200).json({ data: enriched, hospitals: enriched });
  } catch (err) {
    console.error('getHospitals error:', err);
    return res.status(500).json({ error: 'Failed to fetch hospitals.: ' + err.message });
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
      `SELECT organ_type, can_harvest, can_transplant
       FROM hospital_capabilities
       WHERE hospital_id = ?`,
      [id]
    );
    // FIX: was returning { data: { hospital, capabilities } } but frontend reads capData?.capabilities
    // Now returning capabilities at top level so both old and new frontend code works
    return res.status(200).json({
      capabilities: capRows,
      hospital: hospRows[0],
      data: { hospital: hospRows[0], capabilities: capRows },
    });
  } catch (err) {
    console.error('getCapabilities error:', err);
    return res.status(500).json({ error: 'Failed to fetch capabilities.: ' + err.message });
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

    // FIX: frontend reads bbData?.blood_bank then does Object.entries() expecting
    // { A_units: 5, B_units: 3 } flat object format.
    // We build both formats: flat blood_bank object AND array inventory.
    const blood_bank = {};
    bloodRows.forEach(r => {
      const key = r.blood_group.replace('+', '_pos').replace('-', '_neg') + '_units';
      blood_bank[key] = r.units_available;
    });

    return res.status(200).json({
      blood_bank,
      inventory: bloodRows,
      hospital: hospRows[0],
      data: { hospital: hospRows[0], inventory: bloodRows },
    });
  } catch (err) {
    console.error('getBloodBank error:', err);
    return res.status(500).json({ error: 'Failed to fetch blood bank inventory.: ' + err.message });
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
    return res.status(500).json({ error: 'Failed to fetch network.: ' + err.message });
  }
};


// POST /api/hospitals
const createHospital = async (req, res) => {
  const {
    name, code, address, city, state, pincode,
    latitude, longitude, phone, email, level, is_active,
  } = req.body;

  if (!name || !code || !address || !city || !state || !pincode || !phone || !email || !latitude || !longitude) {
    return res.status(400).json({ error: 'All required fields must be provided.' });
  }

  try {
    const [result] = await pool.query(
      `INSERT INTO hospitals (name, code, address, city, state, pincode, latitude, longitude, phone, email, level, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        name.trim(), code.trim().toUpperCase(), address.trim(),
        city.trim(), state.trim(), pincode.trim(),
        parseFloat(latitude), parseFloat(longitude),
        phone.trim(), email.trim(),
        level || 'level2',
        is_active !== undefined ? is_active : 1,
      ]
    );
    const [[newHosp]] = await pool.query(
      'SELECT * FROM hospitals WHERE hospital_id = ?', [result.insertId]
    );
    return res.status(201).json({ message: 'Hospital created.', hospital: newHosp, data: newHosp });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'Hospital code already exists.' });
    }
    console.error('createHospital error:', err);
    return res.status(500).json({ error: 'Failed to create hospital: ' + err.message });
  }
};



// POST /api/hospitals/:id/capabilities
const createCapability = async (req, res) => {
  const { id } = req.params;
  const { organ_type, can_harvest, can_transplant } = req.body;
  if (!organ_type) return res.status(400).json({ error: 'organ_type is required.' });
  try {
    await pool.query(
      `INSERT INTO hospital_capabilities (hospital_id, organ_type, can_harvest, can_transplant)
       VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE can_harvest = VALUES(can_harvest), can_transplant = VALUES(can_transplant)`,
      [id, organ_type, can_harvest ? 1 : 0, can_transplant ? 1 : 0]
    );
    return res.status(201).json({ message: 'Capability saved.' });
  } catch (err) {
    console.error('createCapability error:', err);
    return res.status(500).json({ error: 'Failed to save capability: ' + err.message });
  }
};

// POST /api/hospitals/:id/blood-bank
const createBloodBankEntry = async (req, res) => {
  const { id } = req.params;
  const { blood_group, units_available } = req.body;
  if (!blood_group) return res.status(400).json({ error: 'blood_group is required.' });
  try {
    await pool.query(
      `INSERT INTO blood_bank_inventory (hospital_id, blood_group, units_available)
       VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE units_available = VALUES(units_available), last_updated = NOW()`,
      [id, blood_group, parseInt(units_available) || 0]
    );
    return res.status(201).json({ message: 'Blood bank entry saved.' });
  } catch (err) {
    console.error('createBloodBankEntry error:', err);
    return res.status(500).json({ error: 'Failed to save blood bank entry: ' + err.message });
  }
};
module.exports = { getHospitals, getCapabilities, getBloodBank, getNetwork, createHospital, createCapability, createBloodBankEntry };