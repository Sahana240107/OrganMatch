# OrganMatch 2.0 — M3 Matching Engine + Full Frontend

## Member 3 Deliverables

### SQL (`database/m3_matching_engine.sql`)
- `fn_haversine_km()` — GPS great-circle distance
- `fn_hla_matches()` — 6-locus bidirectional HLA antigen matching
- `fn_abo_score()` — ABO blood group compatibility (strips Rh factor)
- `fn_meld_score()` — MELD-Na score for liver urgency (UNOS formula)
- `fn_las_score()` — Lung Allocation Score proxy
- `fn_age_gap_penalty()` — physiologic mismatch penalty
- `match_organ()` — full 7-component weighted stored procedure
- 8 organ-type weight configs with medical rationale
- 64-row ABO compatibility matrix
- `vw_match_results_detail` — enriched view with all score components

### Backend (`backend/`)
- `match.controller.js` — full REST API for M3 engine
- `match.routes.js` — 8 endpoints including breakdown, weights, HLA stats
- `analytics.controller.js` — enhanced with all required endpoints

### Frontend (`frontend/`)
- Full light-theme redesign (see `src/index.css`)
- `MatchingEngine.jsx` — M3 showcase: 7-bar breakdown, HLA comparison, weights panel
- All 13 pages rewritten with cinematic animations, status ticker, professional UI

## Quick Start

```bash
# 1. Database
mysql -u root -p < database/organmatch_complete.sql
mysql -u root -p organmatch < database/m3_matching_engine.sql

# 2. Backend
cd backend
cp .env.example .env   # edit with your DB credentials
npm install
node server.js         # runs on :5000

# 3. Frontend
cd frontend
npm install
npm run dev            # runs on :5173
```

## Demo Login
- Username: `coordinator`
- Password: `organmatch2024`

## Viva Questions Answered in Code

| Question | Where |
|---|---|
| Walk through match_organ step by step | `database/m3_matching_engine.sql` lines 180-340 |
| Why heart has lower distance_max_km | `organ_match_weights` INSERT — 500 km vs 1500 km |
| What is HLA and why does 6/6 matter | `fn_hla_matches()` + exponential bonus in `match_organ()` |
| Haversine vs straight-line | `fn_haversine_km()` with formula documented |
| PRA sensitization | Score component 6 in `match_organ()` + `MatchingEngine.jsx` |
| MELD score | `fn_meld_score()` with UNOS floor/ceiling rules |
