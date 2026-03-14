# ============================================================
#  OrganMatch 2.0 — Project Scaffold Script
#  Run this from D:\organmatch in PowerShell
#  Command: .\scaffold.ps1
# ============================================================

# ── Create all folders ──────────────────────────────────────
$folders = @(
    "backend\config",
    "backend\routes",
    "backend\controllers",
    "backend\middleware",
    "backend\websocket",
    "frontend\src\pages",
    "frontend\src\components\layout",
    "frontend\src\components\ui",
    "frontend\src\components\forms",
    "frontend\src\context",
    "frontend\src\hooks",
    "frontend\src\utils",
    "database"
)

foreach ($folder in $folders) {
    New-Item -ItemType Directory -Force -Path $folder | Out-Null
    Write-Host "  created  $folder" -ForegroundColor Green
}

# ── Create backend files ────────────────────────────────────
$backendFiles = @(
    "backend\server.js",
    "backend\.env",
    "backend\package.json",
    "backend\config\db.js",
    "backend\routes\auth.routes.js",
    "backend\routes\donor.routes.js",
    "backend\routes\recipient.routes.js",
    "backend\routes\match.routes.js",
    "backend\routes\offer.routes.js",
    "backend\routes\hospital.routes.js",
    "backend\routes\transplant.routes.js",
    "backend\routes\notification.routes.js",
    "backend\routes\analytics.routes.js",
    "backend\controllers\auth.controller.js",
    "backend\controllers\donor.controller.js",
    "backend\controllers\recipient.controller.js",
    "backend\controllers\match.controller.js",
    "backend\controllers\offer.controller.js",
    "backend\controllers\hospital.controller.js",
    "backend\controllers\transplant.controller.js",
    "backend\controllers\analytics.controller.js",
    "backend\middleware\auth.middleware.js",
    "backend\middleware\rbac.middleware.js",
    "backend\middleware\audit.middleware.js",
    "backend\middleware\validate.middleware.js",
    "backend\websocket\notifier.js"
)

foreach ($file in $backendFiles) {
    New-Item -ItemType File -Force -Path $file | Out-Null
    Write-Host "  created  $file" -ForegroundColor Cyan
}

# ── Create frontend files ───────────────────────────────────
$frontendFiles = @(
    "frontend\package.json",
    "frontend\vite.config.js",
    "frontend\.env",
    "frontend\index.html",
    "frontend\src\main.jsx",
    "frontend\src\App.jsx",
    "frontend\src\index.css",
    "frontend\src\pages\Login.jsx",
    "frontend\src\pages\Dashboard.jsx",
    "frontend\src\pages\MatchingEngine.jsx",
    "frontend\src\pages\LocationMap.jsx",
    "frontend\src\pages\RegisterDonor.jsx",
    "frontend\src\pages\RegisterRecipient.jsx",
    "frontend\src\pages\WaitingList.jsx",
    "frontend\src\pages\OfferWorkflow.jsx",
    "frontend\src\pages\TransplantHistory.jsx",
    "frontend\src\pages\Analytics.jsx",
    "frontend\src\components\layout\Sidebar.jsx",
    "frontend\src\components\layout\Topbar.jsx",
    "frontend\src\components\layout\ProtectedRoute.jsx",
    "frontend\src\components\ui\KPICard.jsx",
    "frontend\src\components\ui\ViabilityRing.jsx",
    "frontend\src\components\ui\ScoreBar.jsx",
    "frontend\src\components\ui\OrganPill.jsx",
    "frontend\src\components\ui\MatchCard.jsx",
    "frontend\src\components\ui\OfferTimer.jsx",
    "frontend\src\components\ui\NotificationToast.jsx",
    "frontend\src\components\forms\HLAInput.jsx",
    "frontend\src\components\forms\OrganSelector.jsx",
    "frontend\src\components\forms\UrgencyPicker.jsx",
    "frontend\src\context\AuthContext.jsx",
    "frontend\src\context\NotificationContext.jsx",
    "frontend\src\hooks\useApi.jsx",
    "frontend\src\hooks\useWebSocket.jsx",
    "frontend\src\utils\formatters.js",
    "frontend\src\utils\constants.js"
)

foreach ($file in $frontendFiles) {
    New-Item -ItemType File -Force -Path $file | Out-Null
    Write-Host "  created  $file" -ForegroundColor Cyan
}

# ── Create database files ───────────────────────────────────
$dbFiles = @(
    "database\schema.sql",
    "database\procedures.sql",
    "database\triggers.sql",
    "database\events.sql",
    "database\views.sql",
    "database\seed.sql"
)

foreach ($file in $dbFiles) {
    New-Item -ItemType File -Force -Path $file | Out-Null
    Write-Host "  created  $file" -ForegroundColor Magenta
}

# ── Root files ──────────────────────────────────────────────
New-Item -ItemType File -Force -Path "README.md"   | Out-Null
New-Item -ItemType File -Force -Path ".gitignore"  | Out-Null
Write-Host "  created  README.md" -ForegroundColor Yellow
Write-Host "  created  .gitignore" -ForegroundColor Yellow

# ── Write starter content into key files ───────────────────

# .gitignore
Set-Content ".gitignore" @"
node_modules/
.env
dist/
.DS_Store
*.log
"@

# backend/.env template
Set-Content "backend\.env" @"
DB_HOST=localhost
DB_USER=root
DB_PASS=yourpassword
DB_NAME=organmatch
JWT_SECRET=change_this_to_a_long_random_string
JWT_EXPIRES_IN=8h
PORT=5000
OFFER_TIMEOUT_HOURS=2
"@

# backend/package.json
Set-Content "backend\package.json" @"
{
  "name": "organmatch-backend",
  "version": "1.0.0",
  "main": "server.js",
  "scripts": {
    "start": "node server.js",
    "dev": "nodemon server.js"
  },
  "dependencies": {
    "bcrypt": "^5.1.1",
    "cors": "^2.8.5",
    "dotenv": "^16.3.1",
    "express": "^4.18.2",
    "joi": "^17.11.0",
    "jsonwebtoken": "^9.0.2",
    "mysql2": "^3.6.5",
    "ws": "^8.16.0"
  },
  "devDependencies": {
    "nodemon": "^3.0.2"
  }
}
"@

# backend/config/db.js
Set-Content "backend\config\db.js" @"
const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
  host:             process.env.DB_HOST,
  user:             process.env.DB_USER,
  password:         process.env.DB_PASS,
  database:         process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit:  10,
  queueLimit:       0
});

module.exports = pool;
"@

# backend/server.js
Set-Content "backend\server.js" @"
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
"@

# frontend/package.json
Set-Content "frontend\package.json" @"
{
  "name": "organmatch-frontend",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "axios": "^1.6.5",
    "leaflet": "^1.9.4",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-leaflet": "^4.2.1",
    "react-router-dom": "^6.21.3",
    "recharts": "^2.10.3"
  },
  "devDependencies": {
    "@vitejs/plugin-react": "^4.2.1",
    "autoprefixer": "^10.4.17",
    "postcss": "^8.4.33",
    "tailwindcss": "^3.4.1",
    "vite": "^5.0.11"
  }
}
"@

# frontend/vite.config.js
Set-Content "frontend\vite.config.js" @"
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      '/api': 'http://localhost:5000',
      '/ws':  { target: 'ws://localhost:5000', ws: true }
    }
  }
});
"@

# frontend/.env
Set-Content "frontend\.env" @"
VITE_API_URL=http://localhost:5000
"@

# frontend/index.html
Set-Content "frontend\index.html" @"
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>OrganMatch 2.0</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>
"@

# frontend/src/main.jsx
Set-Content "frontend\src\main.jsx" @"
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
"@

# frontend/src/App.jsx
Set-Content "frontend\src\App.jsx" @"
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider }         from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';
import ProtectedRoute from './components/layout/ProtectedRoute';

import Login             from './pages/Login';
import Dashboard         from './pages/Dashboard';
import MatchingEngine    from './pages/MatchingEngine';
import LocationMap       from './pages/LocationMap';
import RegisterDonor     from './pages/RegisterDonor';
import RegisterRecipient from './pages/RegisterRecipient';
import WaitingList       from './pages/WaitingList';
import OfferWorkflow     from './pages/OfferWorkflow';
import TransplantHistory from './pages/TransplantHistory';
import Analytics         from './pages/Analytics';

export default function App() {
  return (
    <AuthProvider>
      <NotificationProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route element={<ProtectedRoute />}>
              <Route path="/"                      element={<Navigate to="/dashboard" />} />
              <Route path="/dashboard"             element={<Dashboard />} />
              <Route path="/matching/:organId"     element={<MatchingEngine />} />
              <Route path="/map"                   element={<LocationMap />} />
              <Route path="/donors/register"       element={<RegisterDonor />} />
              <Route path="/recipients/register"   element={<RegisterRecipient />} />
              <Route path="/waiting-list"          element={<WaitingList />} />
              <Route path="/offers/:organId"       element={<OfferWorkflow />} />
              <Route path="/transplants"           element={<TransplantHistory />} />
              <Route path="/analytics"             element={<Analytics />} />
            </Route>
            <Route path="*" element={<Navigate to="/dashboard" />} />
          </Routes>
        </BrowserRouter>
      </NotificationProvider>
    </AuthProvider>
  );
}
"@

# frontend/src/utils/constants.js
Set-Content "frontend\src\utils\constants.js" @"
export const ORGAN_TYPES = ['kidney','heart','liver','lung','pancreas','cornea','bone','small_intestine'];

export const ORGAN_LABELS = {
  kidney: 'Kidney', heart: 'Heart', liver: 'Liver',
  lung: 'Lung', pancreas: 'Pancreas', cornea: 'Cornea',
  bone: 'Bone', small_intestine: 'Small Intestine'
};

export const BLOOD_GROUPS = ['A+','A-','B+','B-','AB+','AB-','O+','O-'];

export const URGENCY_LABELS = {
  status_1a: 'Status 1A — Critical',
  status_1b: 'Status 1B — Urgent',
  status_2:  'Status 2 — Stable',
  status_3:  'Status 3 — Outpatient'
};

export const ORGAN_VIABILITY = {
  heart: 4, lung: 8, liver: 24, pancreas: 12,
  kidney: 36, cornea: 168, bone: 720, small_intestine: 12
};
"@

# frontend/src/utils/formatters.js
Set-Content "frontend\src\utils\formatters.js" @"
export function formatViability(hoursLeft) {
  if (hoursLeft <= 0) return 'Expired';
  const h = Math.floor(hoursLeft);
  const m = Math.round((hoursLeft - h) * 60);
  return m > 0 ? `\${h}h \${m}m` : `\${h}h`;
}

export function formatScore(score) {
  return Number(score).toFixed(1);
}

export function formatDistance(km) {
  return km >= 1000 ? `\${(km / 1000).toFixed(1)} Mm` : `\${Math.round(km)} km`;
}

export function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric'
  });
}
"@

# README.md
Set-Content "README.md" @"
# OrganMatch 2.0 — National Organ Transplant Matching System

## Tech Stack
- Frontend : React 18 (JSX) + Vite + Tailwind + React-Leaflet
- Backend  : Node.js + Express + WebSocket (ws)
- Database : MySQL 8.0 (InnoDB, Stored Procedures, Triggers, Events)

## Setup

### 1. Database
``````
mysql -u root -p < database/schema.sql
mysql -u root -p organmatch < database/procedures.sql
mysql -u root -p organmatch < database/triggers.sql
mysql -u root -p organmatch < database/events.sql
mysql -u root -p organmatch < database/views.sql
mysql -u root -p organmatch < database/seed.sql
``````

### 2. Backend
``````
cd backend
npm install
# edit .env with your MySQL password
npm run dev
``````
Backend runs on http://localhost:5000

### 3. Frontend
``````
cd frontend
npm install
npm run dev
``````
Frontend runs on http://localhost:3000
"@

Write-Host ""
Write-Host "========================================" -ForegroundColor Yellow
Write-Host "  OrganMatch scaffold complete!" -ForegroundColor Yellow
Write-Host "  All folders and files created." -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Yellow
Write-Host ""
Write-Host "Next steps:" -ForegroundColor White
Write-Host "  1. cd backend  && npm install" -ForegroundColor Cyan
Write-Host "  2. cd frontend && npm install" -ForegroundColor Cyan
Write-Host "  3. Edit backend\.env with your MySQL password" -ForegroundColor Cyan
Write-Host "  4. Run the 6 database SQL files in order" -ForegroundColor Cyan