// controllers/auth.controller.js
// POST /api/auth/login  — validates credentials, returns signed JWT
// POST /api/auth/logout — client-side only (JWT is stateless), just confirms
// GET  /api/auth/me     — returns current user info from token

const bcrypt = require('bcrypt');
const jwt    = require('jsonwebtoken');
const pool   = require('../config/db');

// ── LOGIN ─────────────────────────────────────────────────────────────────────
const login = async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required.' });
  }

  try {
    // Fetch user — only active users can log in
    const [rows] = await pool.query(
      'SELECT user_id, username, password_hash, role, hospital_id, full_name, email FROM users WHERE username = ? AND is_active = 1',
      [username]
    );

    if (rows.length === 0) {
      // Generic message — do not reveal whether username exists
      return res.status(401).json({ error: 'Invalid username or password.' });
    }

    const user = rows[0];

    // Compare plaintext password with bcrypt hash
    const passwordMatch = await bcrypt.compare(password, user.password_hash);

    if (!passwordMatch) {
      return res.status(401).json({ error: 'Invalid username or password.' });
    }

    // Sign JWT — payload contains everything middleware needs
    const token = jwt.sign(
      {
        user_id:     user.user_id,
        username:    user.username,
        role:        user.role,
        hospital_id: user.hospital_id,   // NULL for national_admin / auditor
        full_name:   user.full_name,
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '8h' }
    );

    // Update last_login timestamp
    await pool.query(
      'UPDATE users SET last_login = NOW() WHERE user_id = ?',
      [user.user_id]
    );

    return res.status(200).json({
      message: 'Login successful.',
      token,
      user: {
        user_id:     user.user_id,
        username:    user.username,
        full_name:   user.full_name,
        role:        user.role,
        hospital_id: user.hospital_id,
        email:       user.email,
      }
    });

  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ error: 'Server error during login.' });
  }
};


// ── ME ────────────────────────────────────────────────────────────────────────
// Returns the decoded token payload — useful for frontend to restore session
const me = (req, res) => {
  // req.user is set by verifyJWT middleware
  return res.status(200).json({ user: req.user });
};


// ── LOGOUT ────────────────────────────────────────────────────────────────────
// JWT is stateless — real logout is done by deleting the token on the client.
// This endpoint exists so frontend can call it uniformly.
const logout = (_req, res) => {
  return res.status(200).json({ message: 'Logged out. Please delete your token on the client.' });
};

module.exports = { login, me, logout };