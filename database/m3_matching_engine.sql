-- =============================================================================
--  OrganMatch 2.0 — M3: Matching Engine, Scoring Logic & Location
--  Member 3 — Algorithm Specialist Deliverables
--
--  Deliverables:
--    1. fn_haversine_km()       — GPS distance using Haversine formula
--    2. fn_hla_matches()        — 6-loci HLA antigen matching (A, B, DR)
--    3. fn_abo_score()          — ABO blood group compatibility scoring
--    4. fn_meld_score()         — MELD score calculation for liver priority
--    5. fn_las_score()          — LAS score normalizer for lung priority
--    6. match_organ()           — 7-component weighted matching procedure
--    7. Organ-specific weights  — All 8 organ types with real medical rationale
--    8. ABO compatibility matrix — All 64 donor/recipient combinations
--    9. vw_match_results_detail — Enriched view with score breakdown
--   10. Demo script              — Live matching walkthrough
--
--  Medical basis for scoring weights documented inline.
-- =============================================================================

DELIMITER $$

-- =============================================================================
-- SECTION A: STORED FUNCTIONS
-- =============================================================================

-- DROP existing functions if re-running
DROP FUNCTION IF EXISTS fn_haversine_km$$
DROP FUNCTION IF EXISTS fn_hla_matches$$
DROP FUNCTION IF EXISTS fn_abo_score$$
DROP FUNCTION IF EXISTS fn_meld_score$$
DROP FUNCTION IF EXISTS fn_las_score$$
DROP FUNCTION IF EXISTS fn_age_gap_penalty$$

-- -----------------------------------------------------------------------------
-- fn_haversine_km(lat1, lon1, lat2, lon2)
-- Returns the great-circle distance in kilometres between two GPS coordinates.
-- Uses Haversine formula (accurate to ~0.5% for distances < 500 km).
-- Used by match_organ() to determine transport feasibility and distance score.
--
-- Formula: a = sin²(Δlat/2) + cos(lat1)·cos(lat2)·sin²(Δlon/2)
--          c = 2·atan2(√a, √(1−a))
--          d = R·c   where R = 6371 km (Earth radius)
-- -----------------------------------------------------------------------------
CREATE FUNCTION fn_haversine_km(
    lat1 DECIMAL(9,6),
    lon1 DECIMAL(9,6),
    lat2 DECIMAL(9,6),
    lon2 DECIMAL(9,6)
) RETURNS DECIMAL(10,2)
DETERMINISTIC
NO SQL
BEGIN
    DECLARE R      DECIMAL(10,4) DEFAULT 6371.0;
    DECLARE dlat   DECIMAL(12,8);
    DECLARE dlon   DECIMAL(12,8);
    DECLARE a      DECIMAL(18,15);
    DECLARE c      DECIMAL(18,15);

    SET dlat = RADIANS(lat2 - lat1);
    SET dlon = RADIANS(lon2 - lon1);
    SET a = SIN(dlat/2) * SIN(dlat/2)
          + COS(RADIANS(lat1)) * COS(RADIANS(lat2))
          * SIN(dlon/2) * SIN(dlon/2);
    SET c = 2 * ATAN2(SQRT(a), SQRT(1 - a));
    RETURN ROUND(R * c, 2);
END$$


-- -----------------------------------------------------------------------------
-- fn_hla_matches(donor HLA 6-antigen, recipient HLA 6-antigen)
-- Returns matching antigen count (0–6) across HLA-A(2), HLA-B(2), HLA-DR(2).
--
-- HLA matching is bidirectional: a donor allele matches a recipient allele
-- if they are equal (case-insensitive). Each locus contributes 0–2 matches.
-- Maximum = 6 (full house): dramatically improves 5-year graft survival.
--
-- Clinical basis: UNOS kidney allocation policy awards pts per HLA mismatch.
-- 0-mismatch kidneys have ~20% better 5-yr survival than 4+ mismatch.
-- For hearts/lungs, HLA matching is less decisive due to short ischemia window.
--
-- Returns TINYINT (0–6).
-- -----------------------------------------------------------------------------
CREATE FUNCTION fn_hla_matches(
    d_a1  VARCHAR(10), d_a2  VARCHAR(10),
    d_b1  VARCHAR(10), d_b2  VARCHAR(10),
    d_dr1 VARCHAR(10), d_dr2 VARCHAR(10),
    r_a1  VARCHAR(10), r_a2  VARCHAR(10),
    r_b1  VARCHAR(10), r_b2  VARCHAR(10),
    r_dr1 VARCHAR(10), r_dr2 VARCHAR(10)
) RETURNS TINYINT UNSIGNED
DETERMINISTIC
NO SQL
BEGIN
    DECLARE cnt TINYINT UNSIGNED DEFAULT 0;
    -- HLA-A locus (2 antigens each side)
    -- Each donor antigen is checked against each recipient antigen
    IF d_a1 IS NOT NULL AND r_a1 IS NOT NULL AND UPPER(d_a1) = UPPER(r_a1) THEN SET cnt = cnt + 1; END IF;
    IF d_a1 IS NOT NULL AND r_a2 IS NOT NULL AND UPPER(d_a1) = UPPER(r_a2) THEN SET cnt = cnt + 1; END IF;
    IF d_a2 IS NOT NULL AND r_a1 IS NOT NULL AND UPPER(d_a2) = UPPER(r_a1) THEN SET cnt = cnt + 1; END IF;
    IF d_a2 IS NOT NULL AND r_a2 IS NOT NULL AND UPPER(d_a2) = UPPER(r_a2) THEN SET cnt = cnt + 1; END IF;
    -- Cap A locus at 2 (bidirectional matching can yield >2 raw; cap per locus)
    IF cnt > 2 THEN SET cnt = 2; END IF;

    -- HLA-B locus
    BEGIN
        DECLARE b_cnt TINYINT UNSIGNED DEFAULT 0;
        IF d_b1 IS NOT NULL AND r_b1 IS NOT NULL AND UPPER(d_b1) = UPPER(r_b1) THEN SET b_cnt = b_cnt + 1; END IF;
        IF d_b1 IS NOT NULL AND r_b2 IS NOT NULL AND UPPER(d_b1) = UPPER(r_b2) THEN SET b_cnt = b_cnt + 1; END IF;
        IF d_b2 IS NOT NULL AND r_b1 IS NOT NULL AND UPPER(d_b2) = UPPER(r_b1) THEN SET b_cnt = b_cnt + 1; END IF;
        IF d_b2 IS NOT NULL AND r_b2 IS NOT NULL AND UPPER(d_b2) = UPPER(r_b2) THEN SET b_cnt = b_cnt + 1; END IF;
        IF b_cnt > 2 THEN SET b_cnt = 2; END IF;
        SET cnt = cnt + b_cnt;
    END;

    -- HLA-DR locus (most important for kidney graft survival)
    BEGIN
        DECLARE dr_cnt TINYINT UNSIGNED DEFAULT 0;
        IF d_dr1 IS NOT NULL AND r_dr1 IS NOT NULL AND UPPER(d_dr1) = UPPER(r_dr1) THEN SET dr_cnt = dr_cnt + 1; END IF;
        IF d_dr1 IS NOT NULL AND r_dr2 IS NOT NULL AND UPPER(d_dr1) = UPPER(r_dr2) THEN SET dr_cnt = dr_cnt + 1; END IF;
        IF d_dr2 IS NOT NULL AND r_dr1 IS NOT NULL AND UPPER(d_dr2) = UPPER(r_dr1) THEN SET dr_cnt = dr_cnt + 1; END IF;
        IF d_dr2 IS NOT NULL AND r_dr2 IS NOT NULL AND UPPER(d_dr2) = UPPER(r_dr2) THEN SET dr_cnt = dr_cnt + 1; END IF;
        IF dr_cnt > 2 THEN SET dr_cnt = 2; END IF;
        SET cnt = cnt + dr_cnt;
    END;

    RETURN cnt;
END$$


-- -----------------------------------------------------------------------------
-- fn_abo_score(donor_blood, recipient_blood, w_identical, w_compatible)
-- Returns ABO compatibility score.
--
-- Blood group rules (real transfusion medicine):
--   Identical   → best long-term outcomes, no antibody mismatch risk
--   Compatible  → acceptable (O→A, O→B, O→AB, A→AB, B→AB)
--   Incompatible → absolute contraindication (hyperacute rejection)
--
-- Weights pulled from organ_match_weights for organ-specific calibration.
-- Hearts have stricter ABO rules due to very short ischemia tolerance.
-- -----------------------------------------------------------------------------
CREATE FUNCTION fn_abo_score(
    donor_blood     VARCHAR(5),
    recipient_blood VARCHAR(5),
    w_identical     DECIMAL(5,2),
    w_compatible    DECIMAL(5,2)
) RETURNS DECIMAL(6,2)
DETERMINISTIC
NO SQL
BEGIN
    -- Strip Rh factor for ABO matching (+ or -)
    DECLARE d_abo CHAR(2);
    DECLARE r_abo CHAR(2);

    SET d_abo = REPLACE(REPLACE(donor_blood, '+', ''), '-', '');
    SET r_abo = REPLACE(REPLACE(recipient_blood, '+', ''), '-', '');

    -- Identical ABO type
    IF d_abo = r_abo THEN
        RETURN w_identical;
    END IF;

    -- Compatible (non-identical): O is universal donor; AB is universal recipient
    IF d_abo = 'O' THEN RETURN w_compatible; END IF;           -- O→A, O→B, O→AB
    IF d_abo = 'A' AND r_abo = 'AB' THEN RETURN w_compatible; END IF;
    IF d_abo = 'B' AND r_abo = 'AB' THEN RETURN w_compatible; END IF;

    -- Incompatible → absolute 0
    RETURN 0;
END$$


-- -----------------------------------------------------------------------------
-- fn_meld_score(creatinine, bilirubin, inr, sodium)
-- Returns MELD-Na score (0–40 scale, normalized).
-- Used for liver recipient prioritization (UNOS policy).
--
-- MELD-Na = MELD + 1.32*(137 - Na) - [0.033 * MELD * (137 - Na)]
-- MELD    = 3.78 * ln(bilirubin) + 11.2 * ln(INR) + 9.57 * ln(creatinine) + 6.43
--
-- Score > 25 → status_1a equivalence for liver
-- Score > 15 → listed for transplant
-- -----------------------------------------------------------------------------
CREATE FUNCTION fn_meld_score(
    creatinine DECIMAL(5,2),  -- mg/dL  (cap at 4.0)
    bilirubin  DECIMAL(5,2),  -- mg/dL  (min 1.0)
    inr        DECIMAL(4,2),  -- INR    (min 1.0)
    sodium     TINYINT UNSIGNED -- mEq/L (125–137 range)
) RETURNS DECIMAL(5,2)
DETERMINISTIC
NO SQL
BEGIN
    DECLARE v_cr   DECIMAL(5,2);
    DECLARE v_bili DECIMAL(5,2);
    DECLARE v_inr  DECIMAL(4,2);
    DECLARE v_na   TINYINT UNSIGNED;
    DECLARE meld   DECIMAL(6,2);
    DECLARE meld_na DECIMAL(6,2);

    -- Apply UNOS floor/ceiling rules
    SET v_cr   = LEAST(GREATEST(creatinine, 1.0), 4.0);
    SET v_bili = GREATEST(bilirubin, 1.0);
    SET v_inr  = GREATEST(inr, 1.0);
    SET v_na   = LEAST(GREATEST(sodium, 125), 137);

    SET meld = 3.78 * LOG(v_bili)
             + 11.2 * LOG(v_inr)
             + 9.57 * LOG(v_cr)
             + 6.43;

    SET meld_na = meld
                + 1.32 * (137 - v_na)
                - (0.033 * meld * (137 - v_na));

    RETURN ROUND(GREATEST(0, LEAST(meld_na, 40)), 2);
END$$


-- -----------------------------------------------------------------------------
-- fn_las_score(pao2_fio2, fvc_percent, systolic_pap, six_min_walk)
-- Returns normalized Lung Allocation Score (0–100).
-- Used for lung recipient prioritization (UNOS policy).
--
-- Simplified LAS proxy — real LAS requires 10+ variables, but this captures
-- the dominant predictors: oxygenation, lung function, PA pressure, exercise.
-- -----------------------------------------------------------------------------
CREATE FUNCTION fn_las_score(
    pao2_fio2    SMALLINT UNSIGNED,  -- PaO2/FiO2 ratio (normal ~400, ARDS <200)
    fvc_percent  TINYINT UNSIGNED,   -- Forced Vital Capacity % predicted
    systolic_pap TINYINT UNSIGNED,   -- Pulmonary artery pressure (mmHg)
    six_min_walk SMALLINT UNSIGNED   -- 6-minute walk distance (metres)
) RETURNS DECIMAL(5,2)
DETERMINISTIC
NO SQL
BEGIN
    DECLARE score DECIMAL(6,2) DEFAULT 0;

    -- Oxygenation penalty (lower PaO2/FiO2 = worse = higher urgency score)
    SET score = score + GREATEST(0, (400 - pao2_fio2) / 4.0);
    -- FVC penalty (lower % = worse)
    SET score = score + GREATEST(0, (100 - fvc_percent) * 0.3);
    -- PA pressure penalty (high pressure = worse)
    SET score = score + GREATEST(0, (systolic_pap - 25) * 0.5);
    -- Walk distance bonus (higher = better, less urgent)
    SET score = score - GREATEST(0, six_min_walk * 0.02);

    RETURN ROUND(LEAST(GREATEST(score, 0), 100), 2);
END$$


-- -----------------------------------------------------------------------------
-- fn_age_gap_penalty(donor_age, recipient_age, w_penalty_per_5yr)
-- Returns age-gap penalty score (negative value).
--
-- Medical basis: size/physiologic mismatch increases graft dysfunction risk.
-- Penalty is per 5-year increment to reduce granularity noise.
-- Organ-specific weight from organ_match_weights table.
-- -----------------------------------------------------------------------------
CREATE FUNCTION fn_age_gap_penalty(
    donor_age    TINYINT UNSIGNED,
    recipient_age TINYINT UNSIGNED,
    w_penalty    DECIMAL(5,2)
) RETURNS DECIMAL(6,2)
DETERMINISTIC
NO SQL
BEGIN
    DECLARE gap INT;
    SET gap = ABS(CAST(donor_age AS SIGNED) - CAST(recipient_age AS SIGNED));
    RETURN -(FLOOR(gap / 5) * w_penalty);
END$$


-- =============================================================================
-- SECTION B: ORGAN-SPECIFIC WEIGHT CONFIGURATION
-- Real medical rationale documented for each organ type.
-- =============================================================================

-- Clear and repopulate organ_match_weights with evidence-based values
DELETE FROM organ_match_weights WHERE 1=1;

INSERT INTO organ_match_weights (
    organ_type,
    w_hla_match, w_abo_identical, w_abo_compatible,
    w_urgency_1a, w_urgency_1b, w_urgency_2, w_urgency_3,
    w_wait_time_per_month, w_wait_time_max,
    w_distance_max_km, w_distance_pts,
    w_age_gap_penalty, w_pra_low_bonus, w_pra_high_penalty
) VALUES

-- KIDNEY: HLA matching most critical (long ischemia tolerance = 24-36 hrs)
-- HLA weight highest (30 pts) — each mismatch reduces 5-yr survival ~8%
-- Distance max 1500 km (air transport viable) — 10 pts for local allocation
-- Long wait time cap (15 pts) — chronic shortage means years on dialysis
('kidney',
 30.00,  -- w_hla_match (highest of all organs — long viability allows careful matching)
 20.00,  -- w_abo_identical
 10.00,  -- w_abo_compatible
 20.00,  -- w_urgency_1a (dialysis-dependent = urgent)
 14.00,  -- w_urgency_1b
  8.00,  -- w_urgency_2
  3.00,  -- w_urgency_3
  1.00,  -- w_wait_time_per_month (1 pt per month on list)
 15.00,  -- w_wait_time_max (capped at 15 months equivalent)
 1500,   -- w_distance_max_km (24-hr viability enables national sharing)
 10.00,  -- w_distance_pts
  2.00,  -- w_age_gap_penalty (per 5-yr gap)
  5.00,  -- w_pra_low_bonus
 10.00), -- w_pra_high_penalty (highly sensitized = harder crossmatch)

-- HEART: Ischemia 4-6 hrs → distance is CRITICAL, HLA less decisive
-- Distance max only 500 km (must fly within 4 hrs)
-- Urgency weights highest (Status 1A = cardiogenic shock/LVAD)
-- HLA weight 10 pts only — no time for careful matching
('heart',
 10.00,  -- w_hla_match (lowest — heart doesn't have same HLA sensitivity as kidney)
 20.00,  -- w_abo_identical
 10.00,  -- w_abo_compatible
 25.00,  -- w_urgency_1a (cardiogenic shock / IABP / ECMO = life-threatening hours)
 18.00,  -- w_urgency_1b (VAD-dependent)
  8.00,  -- w_urgency_2
  2.00,  -- w_urgency_3
  0.50,  -- w_wait_time_per_month (less weight — urgency dominates)
  8.00,  -- w_wait_time_max
  500,   -- w_distance_max_km (4-hr ischemia = ~500 km air radius)
 20.00,  -- w_distance_pts (highest distance weight — proximity is critical)
  3.00,  -- w_age_gap_penalty (weight/size match important for cardiac output)
  3.00,  -- w_pra_low_bonus
  8.00), -- w_pra_high_penalty

-- LIVER: MELD score dominates (sickest-first allocation)
-- Ischemia 12-24 hrs — moderate distance tolerance
-- HLA matching less critical for liver (immunoprivilege)
('liver',
 15.00,  -- w_hla_match (moderate — liver is immunoprivileged vs kidney)
 20.00,  -- w_abo_identical
 10.00,  -- w_abo_compatible
 22.00,  -- w_urgency_1a (acute liver failure = 7-day mortality without transplant)
 15.00,  -- w_urgency_1b (chronic end-stage, MELD > 25)
  8.00,  -- w_urgency_2
  3.00,  -- w_urgency_3
  0.80,  -- w_wait_time_per_month
 12.00,  -- w_wait_time_max
 1000,   -- w_distance_max_km (12-24 hr viability)
 15.00,  -- w_distance_pts
  2.00,  -- w_age_gap_penalty
  4.00,  -- w_pra_low_bonus
  8.00), -- w_pra_high_penalty

-- LUNG: Ischemia 6-8 hrs — LAS score critical (sickest-first)
-- IPF, COPD, PAH patients deteriorate fast without transplant
('lung',
 12.00,  -- w_hla_match (moderate — some HLA influence on chronic rejection)
 20.00,  -- w_abo_identical
 10.00,  -- w_abo_compatible
 23.00,  -- w_urgency_1a (mechanical ventilation / ECMO = imminent death)
 16.00,  -- w_urgency_1b
  7.00,  -- w_urgency_2
  2.00,  -- w_urgency_3
  0.60,  -- w_wait_time_per_month
  8.00,  -- w_wait_time_max
  700,   -- w_distance_max_km (6-8 hr window)
 18.00,  -- w_distance_pts
  2.50,  -- w_age_gap_penalty (TLC size match important)
  4.00,  -- w_pra_low_bonus
  8.00), -- w_pra_high_penalty

-- PANCREAS: Often co-transplanted with kidney (SPK)
-- HLA matching important, similar to kidney
-- Ischemia 12-24 hrs — moderate
('pancreas',
 22.00,  -- w_hla_match (high — Type 1 DM autoimmunity means HLA match helps)
 20.00,  -- w_abo_identical
 10.00,  -- w_abo_compatible
 20.00,  -- w_urgency_1a
 13.00,  -- w_urgency_1b
  7.00,  -- w_urgency_2
  3.00,  -- w_urgency_3
  0.90,  -- w_wait_time_per_month
 12.00,  -- w_wait_time_max
 1200,   -- w_distance_max_km
 12.00,  -- w_distance_pts
  2.00,  -- w_age_gap_penalty
  4.00,  -- w_pra_low_bonus
  9.00), -- w_pra_high_penalty

-- CORNEA: Longest viability (14 days) — distance not critical
-- HLA matching not required for cornea (avascular tissue, no rejection)
-- Priority by wait time (years-long queues in India)
('cornea',
  0.00,  -- w_hla_match (ZERO — cornea is immunoprivileged, avascular)
 10.00,  -- w_abo_identical (ABO minor role)
  8.00,  -- w_abo_compatible
  5.00,  -- w_urgency_1a
  4.00,  -- w_urgency_1b
  3.00,  -- w_urgency_2
  2.00,  -- w_urgency_3
  2.00,  -- w_wait_time_per_month (long wait times — highest weight)
 30.00,  -- w_wait_time_max (patients wait 5-10 years in India)
 5000,   -- w_distance_max_km (14-day viability — nationwide shipping viable)
  5.00,  -- w_distance_pts (lowest distance weight)
  0.50,  -- w_age_gap_penalty (minimal)
  2.00,  -- w_pra_low_bonus (sensitization less relevant)
  3.00), -- w_pra_high_penalty

-- BONE: Up to 5 years cryopreserved — matching by size/tissue type
-- Immunological matching less critical than size matching
('bone',
  5.00,  -- w_hla_match (low — bone is processed/decellularized)
 10.00,  -- w_abo_identical
  5.00,  -- w_abo_compatible
 10.00,  -- w_urgency_1a
  7.00,  -- w_urgency_1b
  4.00,  -- w_urgency_2
  2.00,  -- w_urgency_3
  1.50,  -- w_wait_time_per_month
 20.00,  -- w_wait_time_max
 5000,   -- w_distance_max_km (cryopreserved, long-distance viable)
  5.00,  -- w_distance_pts
  1.00,  -- w_age_gap_penalty
  2.00,  -- w_pra_low_bonus
  3.00), -- w_pra_high_penalty

-- SMALL INTESTINE: Most immunogenic solid organ (highest rejection risk)
-- Ischemia 6-12 hrs; HLA matching CRITICAL
-- Short ischemia + immunogenicity → proximity + HLA both matter
('small_intestine',
 25.00,  -- w_hla_match (very high — highest rejection risk of all organs)
 20.00,  -- w_abo_identical
 10.00,  -- w_abo_compatible
 22.00,  -- w_urgency_1a (TPN-dependent intestinal failure)
 15.00,  -- w_urgency_1b
  8.00,  -- w_urgency_2
  3.00,  -- w_urgency_3
  0.70,  -- w_wait_time_per_month
 10.00,  -- w_wait_time_max
  600,   -- w_distance_max_km (8-10 hr ischemia)
 16.00,  -- w_distance_pts
  3.00,  -- w_age_gap_penalty
  5.00,  -- w_pra_low_bonus
 12.00); -- w_pra_high_penalty (very sensitive to sensitization)


-- =============================================================================
-- SECTION C: ABO COMPATIBILITY MATRIX (64 rows — all combinations)
-- Based on transfusion medicine / UNOS compatibility tables
-- =============================================================================

-- Replace any existing compatibility data
DELETE FROM abo_compatibility WHERE 1=1;

INSERT INTO abo_compatibility (donor_blood, recipient_blood, is_compatible) VALUES
-- O+ donor
('O+','O+',1),('O+','O-',0),('O+','A+',1),('O+','A-',0),
('O+','B+',1),('O+','B-',0),('O+','AB+',1),('O+','AB-',0),
-- O- donor (universal donor)
('O-','O+',1),('O-','O-',1),('O-','A+',1),('O-','A-',1),
('O-','B+',1),('O-','B-',1),('O-','AB+',1),('O-','AB-',1),
-- A+ donor
('A+','O+',0),('A+','O-',0),('A+','A+',1),('A+','A-',0),
('A+','B+',0),('A+','B-',0),('A+','AB+',1),('A+','AB-',0),
-- A- donor
('A-','O+',0),('A-','O-',0),('A-','A+',1),('A-','A-',1),
('A-','B+',0),('A-','B-',0),('A-','AB+',1),('A-','AB-',1),
-- B+ donor
('B+','O+',0),('B+','O-',0),('B+','A+',0),('B+','A-',0),
('B+','B+',1),('B+','B-',0),('B+','AB+',1),('B+','AB-',0),
-- B- donor
('B-','O+',0),('B-','O-',0),('B-','A+',0),('B-','A-',0),
('B-','B+',1),('B-','B-',1),('B-','AB+',1),('B-','AB-',1),
-- AB+ donor (least compatible — only for AB recipients)
('AB+','O+',0),('AB+','O-',0),('AB+','A+',0),('AB+','A-',0),
('AB+','B+',0),('AB+','B-',0),('AB+','AB+',1),('AB+','AB-',0),
-- AB- donor
('AB-','O+',0),('AB-','O-',0),('AB-','A+',0),('AB-','A-',0),
('AB-','B+',0),('AB-','B-',0),('AB-','AB+',1),('AB-','AB-',1);


-- =============================================================================
-- SECTION D: ENHANCED match_organ() STORED PROCEDURE
-- 7-component weighted scoring running entirely in MySQL.
-- Cursor loop over all compatible waiting recipients.
-- Re-ranks after loop. Inserts notifications for top-5 feasible matches.
-- =============================================================================

DROP PROCEDURE IF EXISTS match_organ$$

CREATE PROCEDURE match_organ(IN p_organ_id INT UNSIGNED)
BEGIN
    -- ── Organ & donor variables ────────────────────────────────────────────
    DECLARE v_organ_type    VARCHAR(30);
    DECLARE v_donor_id      INT UNSIGNED;
    DECLARE v_donor_hosp_id INT UNSIGNED;
    DECLARE v_donor_lat     DECIMAL(9,6);
    DECLARE v_donor_lon     DECIMAL(9,6);
    DECLARE v_viability_hrs SMALLINT UNSIGNED;
    DECLARE v_donor_blood   VARCHAR(5);
    DECLARE v_donor_age     TINYINT UNSIGNED;
    DECLARE v_d_a1 VARCHAR(10); DECLARE v_d_a2  VARCHAR(10);
    DECLARE v_d_b1 VARCHAR(10); DECLARE v_d_b2  VARCHAR(10);
    DECLARE v_d_dr1 VARCHAR(10); DECLARE v_d_dr2 VARCHAR(10);

    -- ── Weight variables (from organ_match_weights) ───────────────────────
    DECLARE v_w_hla          DECIMAL(5,2);
    DECLARE v_w_abo_id       DECIMAL(5,2);
    DECLARE v_w_abo_compat   DECIMAL(5,2);
    DECLARE v_w_urg_1a       DECIMAL(5,2);
    DECLARE v_w_urg_1b       DECIMAL(5,2);
    DECLARE v_w_urg_2        DECIMAL(5,2);
    DECLARE v_w_urg_3        DECIMAL(5,2);
    DECLARE v_w_wait_per_m   DECIMAL(5,3);
    DECLARE v_w_wait_max     DECIMAL(5,2);
    DECLARE v_w_dist_km      INT UNSIGNED;
    DECLARE v_w_dist_pts     DECIMAL(5,2);
    DECLARE v_w_age_pen      DECIMAL(5,2);
    DECLARE v_w_pra_low      DECIMAL(5,2);
    DECLARE v_w_pra_high     DECIMAL(5,2);

    -- ── Score component variables ─────────────────────────────────────────
    DECLARE v_score_hla      DECIMAL(6,2);
    DECLARE v_score_abo      DECIMAL(6,2);
    DECLARE v_score_urg      DECIMAL(6,2);
    DECLARE v_score_wait     DECIMAL(6,2);
    DECLARE v_score_dist     DECIMAL(6,2);
    DECLARE v_score_pra      DECIMAL(6,2);
    DECLARE v_score_age      DECIMAL(6,2);
    DECLARE v_total          DECIMAL(7,2);

    -- ── Per-candidate working variables ──────────────────────────────────
    DECLARE v_hla_m          TINYINT UNSIGNED;
    DECLARE v_dist_km        DECIMAL(8,2);
    DECLARE v_trans_hrs      DECIMAL(5,2);
    DECLARE v_feasible       TINYINT DEFAULT 1;
    DECLARE v_rank           SMALLINT UNSIGNED DEFAULT 0;
    DECLARE v_wait_m         DECIMAL(8,2);
    DECLARE v_age_gap        INT;
    DECLARE v_last_id        INT UNSIGNED;

    -- ── Recipient cursor variables ────────────────────────────────────────
    DECLARE v_rec_id         INT UNSIGNED;
    DECLARE v_rec_hosp_id    INT UNSIGNED;
    DECLARE v_rec_hosp_lat   DECIMAL(9,6);
    DECLARE v_rec_hosp_lon   DECIMAL(9,6);
    DECLARE v_rec_blood      VARCHAR(5);
    DECLARE v_rec_urgency    VARCHAR(20);
    DECLARE v_rec_reg_date   DATE;
    DECLARE v_rec_age        TINYINT UNSIGNED;
    DECLARE v_rec_pra        TINYINT UNSIGNED;
    DECLARE v_r_a1 VARCHAR(10); DECLARE v_r_a2  VARCHAR(10);
    DECLARE v_r_b1 VARCHAR(10); DECLARE v_r_b2  VARCHAR(10);
    DECLARE v_r_dr1 VARCHAR(10); DECLARE v_r_dr2 VARCHAR(10);
    DECLARE done INT DEFAULT 0;

    -- ── STEP 1: Load organ / donor data ──────────────────────────────────
    SELECT
        o.organ_type, o.donor_id, o.viability_hours,
        d.hospital_id, d.blood_group, d.age,
        COALESCE(dh.hla_a1,''), COALESCE(dh.hla_a2,''),
        COALESCE(dh.hla_b1,''), COALESCE(dh.hla_b2,''),
        COALESCE(dh.hla_dr1,''), COALESCE(dh.hla_dr2,''),
        h.latitude, h.longitude
    INTO
        v_organ_type, v_donor_id, v_viability_hrs,
        v_donor_hosp_id, v_donor_blood, v_donor_age,
        v_d_a1, v_d_a2, v_d_b1, v_d_b2, v_d_dr1, v_d_dr2,
        v_donor_lat, v_donor_lon
    FROM organs o
    JOIN donors d ON o.donor_id = d.donor_id
    LEFT JOIN donor_hla_typing dh ON dh.donor_id = d.donor_id
    JOIN hospitals h ON d.hospital_id = h.hospital_id
    WHERE o.organ_id = p_organ_id
    LIMIT 1;

    -- Guard: organ not found
    IF v_organ_type IS NULL THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'match_organ: organ_id not found or donor data missing';
    END IF;

    -- ── STEP 2: Load organ-specific weights ──────────────────────────────
    SELECT
        w_hla_match, w_abo_identical, w_abo_compatible,
        w_urgency_1a, w_urgency_1b, w_urgency_2, w_urgency_3,
        w_wait_time_per_month, w_wait_time_max,
        w_distance_max_km, w_distance_pts,
        w_age_gap_penalty, w_pra_low_bonus, w_pra_high_penalty
    INTO
        v_w_hla, v_w_abo_id, v_w_abo_compat,
        v_w_urg_1a, v_w_urg_1b, v_w_urg_2, v_w_urg_3,
        v_w_wait_per_m, v_w_wait_max,
        v_w_dist_km, v_w_dist_pts,
        v_w_age_pen, v_w_pra_low, v_w_pra_high
    FROM organ_match_weights
    WHERE organ_type = v_organ_type
    LIMIT 1;

    -- Guard: no weights configured
    IF v_w_hla IS NULL THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'match_organ: no organ_match_weights found for this organ type';
    END IF;

    -- ── STEP 3: Clear stale pending matches for this organ ────────────────
    DELETE FROM match_results
    WHERE organ_id = p_organ_id AND status = 'pending';

    -- ── STEP 4: Cursor loop over ABO-compatible waiting recipients ────────
    BEGIN
        DECLARE candidate_cursor CURSOR FOR
            SELECT
                r.recipient_id,
                r.hospital_id,
                r.blood_group,
                r.medical_urgency,
                r.registration_date,
                r.age,
                r.pra_percent,
                COALESCE(rh.hla_a1,''),  COALESCE(rh.hla_a2,''),
                COALESCE(rh.hla_b1,''),  COALESCE(rh.hla_b2,''),
                COALESCE(rh.hla_dr1,''), COALESCE(rh.hla_dr2,''),
                h.latitude,
                h.longitude
            FROM recipients r
            JOIN hospitals h ON r.hospital_id = h.hospital_id
            LEFT JOIN recipient_hla_typing rh ON rh.recipient_id = r.recipient_id
            -- Enforce ABO compatibility via join (faster than WHERE)
            JOIN abo_compatibility ac
                ON  ac.donor_blood     = v_donor_blood
                AND ac.recipient_blood = r.blood_group
                AND ac.is_compatible   = 1
            -- Only waiting recipients needing this organ type
            WHERE r.organ_needed = v_organ_type
              AND r.status       = 'waiting'
              AND r.hiv_status   = 'negative'
            -- Pre-sort by urgency cache so cursor reads most-urgent first
            ORDER BY r.medical_urgency ASC;

        DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = 1;
        OPEN candidate_cursor;

        score_loop: LOOP
            FETCH candidate_cursor INTO
                v_rec_id, v_rec_hosp_id, v_rec_blood,
                v_rec_urgency, v_rec_reg_date, v_rec_age, v_rec_pra,
                v_r_a1, v_r_a2, v_r_b1, v_r_b2, v_r_dr1, v_r_dr2,
                v_rec_hosp_lat, v_rec_hosp_lon;

            IF done THEN LEAVE score_loop; END IF;

            -- ── Component 1: HLA match (0–6 antigens → 0–w_hla pts) ─────
            SET v_hla_m = fn_hla_matches(
                v_d_a1, v_d_a2, v_d_b1, v_d_b2, v_d_dr1, v_d_dr2,
                v_r_a1, v_r_a2, v_r_b1, v_r_b2, v_r_dr1, v_r_dr2
            );
            -- Exponential bonus for 5-6 matches (mirrors UNOS policy bonus)
            IF v_hla_m >= 6 THEN
                SET v_score_hla = v_w_hla;                           -- full score
            ELSEIF v_hla_m >= 5 THEN
                SET v_score_hla = ROUND(v_w_hla * 0.85, 2);
            ELSEIF v_hla_m >= 4 THEN
                SET v_score_hla = ROUND(v_w_hla * 0.65, 2);
            ELSE
                SET v_score_hla = ROUND((v_hla_m / 6.0) * v_w_hla, 2);
            END IF;

            -- ── Component 2: ABO compatibility (identical / compatible) ──
            SET v_score_abo = fn_abo_score(
                v_donor_blood, v_rec_blood, v_w_abo_id, v_w_abo_compat
            );

            -- ── Component 3: Urgency score ───────────────────────────────
            SET v_score_urg = CASE v_rec_urgency
                WHEN 'status_1a' THEN v_w_urg_1a
                WHEN 'status_1b' THEN v_w_urg_1b
                WHEN 'status_2'  THEN v_w_urg_2
                ELSE v_w_urg_3
            END;

            -- ── Component 4: Wait time (linear, capped) ──────────────────
            SET v_wait_m = TIMESTAMPDIFF(MONTH, v_rec_reg_date, NOW());
            SET v_score_wait = LEAST(v_wait_m * v_w_wait_per_m, v_w_wait_max);

            -- ── Component 5: Distance / feasibility ──────────────────────
            SET v_dist_km   = NULL;
            SET v_trans_hrs = NULL;
            SET v_feasible  = 1;

            -- Try real transport route table first
            SELECT distance_km, best_hours
            INTO v_dist_km, v_trans_hrs
            FROM transport_routes
            WHERE from_hospital_id = v_donor_hosp_id
              AND to_hospital_id   = v_rec_hosp_id
            LIMIT 1;

            -- Fall back to Haversine + realistic transport time model
            IF v_dist_km IS NULL THEN
                SET v_dist_km   = fn_haversine_km(
                    v_donor_lat, v_donor_lon, v_rec_hosp_lat, v_rec_hosp_lon
                );
                -- Model: air transport for >300 km, ground otherwise
                -- Air: 600 km/hr + 1.5 hr logistics overhead
                -- Ground: 80 km/hr + 0.5 hr overhead
                IF v_dist_km > 300 THEN
                    SET v_trans_hrs = ROUND(v_dist_km / 600 + 1.5, 2);
                ELSE
                    SET v_trans_hrs = ROUND(v_dist_km / 80 + 0.5, 2);
                END IF;
            END IF;

            -- Feasibility: transport must complete BEFORE viability window
            -- Add 10% safety buffer for surgical prep time
            SET v_feasible = IF(v_trans_hrs < (v_viability_hrs * 0.9), 1, 0);

            -- Distance score: linear decay from 0 km (max pts) to max_km (0 pts)
            IF v_dist_km <= v_w_dist_km THEN
                SET v_score_dist = ROUND(
                    v_w_dist_pts * (1 - v_dist_km / v_w_dist_km), 2
                );
            ELSE
                SET v_score_dist = 0;
                SET v_feasible   = 0;
            END IF;

            -- ── Component 6: PRA sensitization ───────────────────────────
            -- PRA (Panel Reactive Antibody) indicates antibody sensitization
            -- Low PRA (<20%) → easier crossmatch → bonus pts
            -- High PRA (>80%) → likely positive crossmatch → penalty
            SET v_score_pra = CASE
                WHEN v_rec_pra < 20 THEN  v_w_pra_low
                WHEN v_rec_pra > 80 THEN -v_w_pra_high
                ELSE 0
            END;

            -- ── Component 7: Age gap penalty ─────────────────────────────
            SET v_age_gap   = ABS(CAST(v_donor_age AS SIGNED) - CAST(v_rec_age AS SIGNED));
            SET v_score_age = -(FLOOR(v_age_gap / 5) * v_w_age_pen);

            -- ── Total score (floor at 0) ──────────────────────────────────
            SET v_total = GREATEST(0,
                v_score_hla + v_score_abo + v_score_urg
                + v_score_wait + v_score_dist + v_score_pra + v_score_age
            );
            SET v_rank = v_rank + 1;

            -- ── Insert / update match_results ────────────────────────────
            INSERT INTO match_results (
                organ_id, recipient_id,
                donor_hospital_id, recipient_hospital_id,
                total_score, distance_km, estimated_transport_hrs,
                ischemic_time_feasible, hla_antigen_matches,
                rank_position, status
            ) VALUES (
                p_organ_id, v_rec_id,
                v_donor_hosp_id, v_rec_hosp_id,
                v_total, v_dist_km, v_trans_hrs,
                v_feasible, v_hla_m,
                v_rank, 'pending'
            )
            ON DUPLICATE KEY UPDATE
                total_score              = VALUES(total_score),
                distance_km              = VALUES(distance_km),
                estimated_transport_hrs  = VALUES(estimated_transport_hrs),
                ischemic_time_feasible   = VALUES(ischemic_time_feasible),
                hla_antigen_matches      = VALUES(hla_antigen_matches),
                rank_position            = VALUES(rank_position),
                status                   = 'pending',
                computed_at              = NOW();

            SET v_last_id = LAST_INSERT_ID();

            -- ── Insert score breakdown ────────────────────────────────────
            INSERT INTO match_score_breakdown (
                match_id,
                score_hla, score_abo, score_urgency,
                score_wait_time, score_distance, score_pra, score_age
            ) VALUES (
                v_last_id,
                v_score_hla, v_score_abo, v_score_urg,
                v_score_wait, v_score_dist, v_score_pra, v_score_age
            )
            ON DUPLICATE KEY UPDATE
                score_hla       = VALUES(score_hla),
                score_abo       = VALUES(score_abo),
                score_urgency   = VALUES(score_urgency),
                score_wait_time = VALUES(score_wait_time),
                score_distance  = VALUES(score_distance),
                score_pra       = VALUES(score_pra),
                score_age       = VALUES(score_age);

        END LOOP;
        CLOSE candidate_cursor;
    END;

    -- ── STEP 5: Re-rank by total_score DESC (feasible first) ─────────────
    SET @rn = 0;
    UPDATE match_results
    SET rank_position = (@rn := @rn + 1)
    WHERE organ_id = p_organ_id
    ORDER BY
        ischemic_time_feasible DESC,  -- feasible candidates always rank first
        total_score            DESC,
        hla_antigen_matches    DESC;

    -- ── STEP 6: Notify top-5 feasible recipient hospitals ────────────────
    INSERT INTO notifications (
        recipient_user_id, type, title, body,
        related_organ_id
    )
    SELECT
        u.user_id,
        'new_match',
        CONCAT('New Match — ', UPPER(v_organ_type), ' Available'),
        CONCAT(
            'Organ #', p_organ_id, ' has ', v_viability_hrs,
            ' hrs viability. Your patient ranked #', mr.rank_position,
            '. Score: ', mr.total_score, '/100.'
        ),
        p_organ_id
    FROM match_results mr
    JOIN users u
        ON  u.hospital_id = mr.recipient_hospital_id
        AND u.role IN ('transplant_coordinator', 'regional_admin')
    WHERE mr.organ_id              = p_organ_id
      AND mr.ischemic_time_feasible = 1
      AND mr.rank_position         <= 5
    ORDER BY mr.rank_position;

END$$


-- =============================================================================
-- SECTION E: ENHANCED VIEWS
-- =============================================================================

DROP VIEW IF EXISTS vw_match_results_detail$$

CREATE VIEW vw_match_results_detail AS
SELECT
    mr.match_id,
    mr.organ_id,
    o.organ_type,
    o.viability_hours,
    o.expires_at,
    -- Donor side
    d.donor_id,
    d.full_name        AS donor_name,
    d.blood_group      AS donor_blood,
    d.age              AS donor_age,
    dh_hosp.name       AS donor_hospital,
    dh_hosp.city       AS donor_city,
    -- Recipient side
    r.recipient_id,
    r.full_name        AS recipient_name,
    r.blood_group      AS recipient_blood,
    r.age              AS recipient_age,
    r.medical_urgency,
    r.pra_percent,
    r.registration_date,
    rh_hosp.name       AS recipient_hospital,
    rh_hosp.city       AS recipient_city,
    -- Score components
    COALESCE(msb.score_hla,      0) AS score_hla,
    COALESCE(msb.score_abo,      0) AS score_abo,
    COALESCE(msb.score_urgency,  0) AS score_urgency,
    COALESCE(msb.score_wait_time,0) AS score_wait_time,
    COALESCE(msb.score_distance, 0) AS score_distance,
    COALESCE(msb.score_pra,      0) AS score_pra,
    COALESCE(msb.score_age,      0) AS score_age,
    -- HLA typing details
    mr.hla_antigen_matches,
    dht.hla_a1 AS donor_hla_a1,  dht.hla_a2 AS donor_hla_a2,
    dht.hla_b1 AS donor_hla_b1,  dht.hla_b2 AS donor_hla_b2,
    dht.hla_dr1 AS donor_hla_dr1, dht.hla_dr2 AS donor_hla_dr2,
    rht.hla_a1 AS recip_hla_a1,  rht.hla_a2 AS recip_hla_a2,
    rht.hla_b1 AS recip_hla_b1,  rht.hla_b2 AS recip_hla_b2,
    rht.hla_dr1 AS recip_hla_dr1, rht.hla_dr2 AS recip_hla_dr2,
    -- Result metadata
    mr.total_score,
    mr.distance_km,
    mr.estimated_transport_hrs,
    mr.ischemic_time_feasible,
    mr.rank_position,
    mr.status,
    mr.computed_at
FROM match_results mr
JOIN organs      o       ON mr.organ_id            = o.organ_id
JOIN donors      d       ON o.donor_id             = d.donor_id
JOIN recipients  r       ON mr.recipient_id        = r.recipient_id
JOIN hospitals   dh_hosp ON mr.donor_hospital_id   = dh_hosp.hospital_id
JOIN hospitals   rh_hosp ON mr.recipient_hospital_id = rh_hosp.hospital_id
LEFT JOIN match_score_breakdown msb ON msb.match_id = mr.match_id
LEFT JOIN donor_hla_typing      dht ON dht.donor_id     = d.donor_id
LEFT JOIN recipient_hla_typing  rht ON rht.recipient_id = r.recipient_id$$


-- =============================================================================
-- SECTION F: DEMO SCRIPT
-- Live matching walkthrough — insert kidney donor → watch trigger → results
-- =============================================================================

-- ── DEMO: How to run ──────────────────────────────────────────────────────
-- 1. Run this block manually in MySQL Workbench to see matching in action
-- 2. The trigger trg_organ_after_insert fires match_organ() automatically
-- 3. Query vw_match_results_detail to see ranked results with breakdowns

-- Step 1: Create a demo deceased donor at hospital_id = 1
/*
INSERT INTO donors (hospital_id, registered_by, donor_type, full_name, age, sex,
                    blood_group, cause_of_death, brain_death_time, status)
VALUES (1, 1, 'deceased', 'DEMO Donor', 34, 'M',
        'O+', 'traumatic_brain_injury', NOW(), 'active');

SET @demo_donor = LAST_INSERT_ID();

-- Step 2: Add HLA typing for the donor
INSERT INTO donor_hla_typing (donor_id, hla_a1, hla_a2, hla_b1, hla_b2, hla_dr1, hla_dr2)
VALUES (@demo_donor, 'A2', 'A3', 'B7', 'B8', 'DR1', 'DR3');

-- Step 3: Register a kidney organ (TRIGGER FIRES match_organ() HERE)
INSERT INTO organs (donor_id, organ_type, laterality, harvest_time, viability_hours, expires_at, status)
VALUES (@demo_donor, 'kidney', 'left', NOW(), 24,
        DATE_ADD(NOW(), INTERVAL 24 HOUR), 'available');

SET @demo_organ = LAST_INSERT_ID();

-- Step 4: View the ranked match results
SELECT
    rank_position,
    recipient_name,
    recipient_blood,
    medical_urgency,
    hla_antigen_matches,
    score_hla, score_abo, score_urgency, score_wait_time,
    score_distance, score_pra, score_age,
    total_score,
    ROUND(distance_km, 0) AS distance_km,
    ROUND(estimated_transport_hrs, 1) AS transport_hrs,
    ischemic_time_feasible,
    recipient_hospital, recipient_city
FROM vw_match_results_detail
WHERE organ_id = @demo_organ
ORDER BY rank_position ASC
LIMIT 10;
*/

-- =============================================================================
-- END OF M3 MATCHING ENGINE
-- =============================================================================

DELIMITER ;
