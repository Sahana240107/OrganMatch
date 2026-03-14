// server.js
// OrganMatch backend — Express + JWT + RBAC
//
// Role permissions:
//   hospital_staff        → donors, recipients (INSERT/GET)
//   transplant_coordinator → offers, matches, transplants (GET/PATCH)
//   national_admin        → everything including analytics
//   auditor               → transplant history read-only (via transplant routes)

const express = require('express');
const cors    = require('cors');
const http    = require('http');
require('dotenv').config();

const { initWebSocket } = require('./websocket/notifier');

// Routes
const authRoutes         = require('./routes/auth.routes');
const donorRoutes        = require('./routes/donor.routes');
const recipientRoutes    = require('./routes/recipient.routes');
const matchRoutes        = require('./routes/match.routes');
const offerRoutes        = require('./routes/offer.routes');
const hospitalRoutes     = require('./routes/hospital.routes');
const transplantRoutes   = require('./routes/transplant.routes');
const notificationRoutes = require('./routes/notification.routes');
const analyticsRoutes    = require('./routes/analytics.routes');

// Middleware
const { verifyJWT }                              = require('./middleware/auth.middleware');
const { requireRole, isAdmin, isCoordinator, isStaff, isAuditor } = require('./middleware/rbac.middleware');

const app    = express();
const server = http.createServer(app);

app.use(cors());
app.use(express.json());

// ── PUBLIC ────────────────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);

// ── PROTECTED — verifyJWT runs first on all routes below ─────────────────────

// hospital_staff, coordinator, national_admin can register donors & recipients
app.use('/api/donors',     verifyJWT, isStaff,       donorRoutes);
app.use('/api/recipients', verifyJWT, isStaff,       recipientRoutes);

// coordinator and national_admin manage offers and matches
app.use('/api/offers',     verifyJWT, isCoordinator, offerRoutes);
app.use('/api/matches',    verifyJWT, isCoordinator, matchRoutes);

// transplant history — coordinator, national_admin, auditor can view
app.use('/api/transplants',   verifyJWT, requireRole('national_admin', 'transplant_coordinator', 'auditor'), transplantRoutes);

// hospitals — all authenticated users can view (for dropdowns etc.)
app.use('/api/hospitals',     verifyJWT, notificationRoutes);

// notifications — all authenticated users see their own
app.use('/api/notifications', verifyJWT, notificationRoutes);

// analytics — national_admin only
app.use('/api/analytics',     verifyJWT, isAdmin, analyticsRoutes);

initWebSocket(server);

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`OrganMatch backend running on port ${PORT}`);
});