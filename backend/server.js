const express = require('express');
const cors    = require('cors');
const http    = require('http');
require('dotenv').config();

const { initWebSocket } = require('./websocket/notifier');

const authRoutes         = require('./routes/auth.routes');
const donorRoutes        = require('./routes/donor.routes');
const recipientRoutes    = require('./routes/recipient.routes');
const matchRoutes        = require('./routes/match.routes');
const offerRoutes        = require('./routes/offer.routes');
const hospitalRoutes     = require('./routes/hospital.routes');
const transplantRoutes   = require('./routes/transplant.routes');
const notificationRoutes = require('./routes/notification.routes');
const analyticsRoutes    = require('./routes/analytics.routes');

const { verifyJWT }  = require('./middleware/auth.middleware');

const app    = express();
const server = http.createServer(app);

// Allow requests from the Vite dev server
app.use(cors({
  origin: ['http://localhost:5173', 'http://127.0.0.1:5173'],
  credentials: true,
}));
app.use(express.json());

// ── PUBLIC (no auth needed) ───────────────────────────────────────────────────
app.use('/api/auth', authRoutes);

// ── PROTECTED (all routes require valid JWT) ──────────────────────────────────
app.use('/api/donors',        verifyJWT, donorRoutes);
app.use('/api/recipients',    verifyJWT, recipientRoutes);
app.use('/api/matches',       verifyJWT, matchRoutes);
app.use('/api/offers',        verifyJWT, offerRoutes);
app.use('/api/transplants',   verifyJWT, transplantRoutes);
app.use('/api/hospitals',     verifyJWT, hospitalRoutes);
app.use('/api/notifications', verifyJWT, notificationRoutes);
app.use('/api/analytics',     verifyJWT, analyticsRoutes);

// ── Health check ──────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => res.json({ status: 'ok', time: new Date() }));

initWebSocket(server);

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`✅ OrganMatch backend running on http://localhost:${PORT}`);
  console.log(`   DB: ${process.env.DB_USER}@${process.env.DB_HOST}/${process.env.DB_NAME}`);
});
