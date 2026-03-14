const express    = require('express');
const cors       = require('cors');
const http       = require('http');
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

const { verifyJWT }   = require('./middleware/auth.middleware');
const { requireRole } = require('./middleware/rbac.middleware');

const app    = express();
const server = http.createServer(app);

app.use(cors());
app.use(express.json());

// Public
app.use('/api/auth', authRoutes);

// Protected
app.use('/api/donors',        verifyJWT, donorRoutes);
app.use('/api/recipients',    verifyJWT, recipientRoutes);
app.use('/api/matches',       verifyJWT, matchRoutes);
app.use('/api/offers',        verifyJWT, offerRoutes);
app.use('/api/hospitals',     verifyJWT, hospitalRoutes);
app.use('/api/transplants',   verifyJWT, transplantRoutes);
app.use('/api/notifications', verifyJWT, notificationRoutes);
app.use('/api/analytics',     verifyJWT, requireRole('national_admin','regional_admin'), analyticsRoutes);

initWebSocket(server);

server.listen(process.env.PORT || 5000, () => {
  console.log('OrganMatch backend running on port', process.env.PORT || 5000);
});
