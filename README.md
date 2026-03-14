# OrganMatch 2.0 — National Organ Transplant Matching System

## Tech Stack
- Frontend : React 18 (JSX) + Vite + Tailwind + React-Leaflet
- Backend  : Node.js + Express + WebSocket (ws)
- Database : MySQL 8.0 (InnoDB, Stored Procedures, Triggers, Events)

## Setup

### 1. Database
```
mysql -u root -p < database/schema.sql
mysql -u root -p organmatch < database/procedures.sql
mysql -u root -p organmatch < database/triggers.sql
mysql -u root -p organmatch < database/events.sql
mysql -u root -p organmatch < database/views.sql
mysql -u root -p organmatch < database/seed.sql
```

### 2. Backend
```
cd backend
npm install
# edit .env with your MySQL password
npm run dev
```
Backend runs on http://localhost:5000

### 3. Frontend
```
cd frontend
npm install
npm run dev
```
Frontend runs on http://localhost:3000
