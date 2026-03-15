// server.js
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

const { verifyJWT }                                                   = require('./middleware/auth.middleware');
const { requireRole, isAdmin, isCoordinator, isStaff, isAuditor }    = require('./middleware/rbac.middleware');

const app    = express();
const server = http.createServer(app);

app.use(cors());
app.use(express.json());

// ── PUBLIC ────────────────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);

// ── PROTECTED ─────────────────────────────────────────────────────────────────
// hospital_staff, coordinator, national_admin
app.use('/api/donors',        verifyJWT, isStaff,       donorRoutes);
app.use('/api/recipients',    verifyJWT, isStaff,       recipientRoutes);

// coordinator + national_admin only
app.use('/api/offers',        verifyJWT, isCoordinator, offerRoutes);
app.use('/api/matches',       verifyJWT, isCoordinator, matchRoutes);

// coordinator + national_admin + auditor (read-only)
app.use('/api/transplants',   verifyJWT, requireRole('national_admin', 'transplant_coordinator', 'auditor'), transplantRoutes);

// all authenticated users
app.use('/api/hospitals',     verifyJWT, hospitalRoutes);
app.use('/api/notifications', verifyJWT, notificationRoutes);

// national_admin only
app.use('/api/analytics',     verifyJWT, isAdmin, analyticsRoutes);

initWebSocket(server);

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`OrganMatch backend running on port ${PORT}`);
});