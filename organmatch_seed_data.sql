-- =============================================================================
--  OrganMatch 2.0 — Complete Seed Data
--  Run AFTER organmatch_complete.sql AND m3_matching_engine.sql
--  mysql -u root -p organmatch < organmatch_seed_data.sql
-- =============================================================================

USE organmatch;

SET FOREIGN_KEY_CHECKS = 0;
SET SQL_MODE = 'NO_AUTO_VALUE_ON_ZERO';

-- =============================================================================
-- STEP 1: hospital_capacity (ICU beds for the 8 seeded hospitals)
-- =============================================================================
INSERT INTO hospital_capacity (hospital_id, icu_beds_total, icu_beds_available) VALUES
(1, 40, 12),
(2, 35, 8),
(3, 28, 6),
(4, 50, 18),
(5, 32, 10),
(6, 45, 14),
(7, 22, 5),
(8, 38, 11)
ON DUPLICATE KEY UPDATE
  icu_beds_total     = VALUES(icu_beds_total),
  icu_beds_available = VALUES(icu_beds_available);

-- =============================================================================
-- STEP 2: hospital_capabilities
-- =============================================================================
INSERT IGNORE INTO hospital_capabilities (hospital_id, organ_type, can_harvest, can_transplant) VALUES
-- AIIMS New Delhi (1) — full capability
(1,'kidney',1,1),(1,'heart',1,1),(1,'liver',1,1),(1,'lung',1,1),
(1,'pancreas',1,1),(1,'cornea',1,1),(1,'bone',1,1),(1,'small_intestine',1,1),
-- Apollo Chennai (2)
(2,'kidney',1,1),(2,'heart',1,1),(2,'liver',1,1),(2,'lung',1,0),
(2,'pancreas',0,1),(2,'cornea',1,1),(2,'bone',1,1),
-- CMC Vellore (3)
(3,'kidney',1,1),(3,'heart',0,1),(3,'liver',1,1),(3,'lung',0,1),
(3,'cornea',1,1),(3,'bone',1,1),
-- Fortis Mumbai (4)
(4,'kidney',1,1),(4,'heart',1,1),(4,'liver',1,1),(4,'lung',1,1),
(4,'pancreas',1,1),(4,'cornea',1,1),
-- Manipal Bangalore (5)
(5,'kidney',1,1),(5,'heart',1,1),(5,'liver',1,1),(5,'cornea',1,1),(5,'bone',1,1),
-- KIMS Hyderabad (6)
(6,'kidney',1,1),(6,'liver',1,1),(6,'cornea',1,1),(6,'bone',1,1),
-- PGIMER Chandigarh (7)
(7,'kidney',1,1),(7,'heart',0,1),(7,'liver',1,1),(7,'lung',0,1),(7,'cornea',1,1),
-- SGPGI Lucknow (8)
(8,'kidney',1,1),(8,'liver',1,1),(8,'cornea',1,1),(8,'bone',1,1);

-- =============================================================================
-- STEP 3: users (one per hospital + national admin)
-- password_hash is bcrypt of 'organmatch2024'
-- =============================================================================
INSERT IGNORE INTO users (user_id, hospital_id, username, password_hash, full_name, email, phone, role) VALUES
(1, 1, 'coordinator', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2uheWG/igi.', 'Dr. Arjun Mehta',     'arjun.mehta@aiims.edu',       '9810001001', 'transplant_coordinator'),
(2, 2, 'apollo_coord','$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2uheWG/igi.', 'Dr. Priya Suresh',    'priya.suresh@apollo.com',     '9840002002', 'transplant_coordinator'),
(3, 3, 'cmc_coord',   '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2uheWG/igi.', 'Dr. Samuel George',   'samuel.george@cmcvellore.ac.in','9442003003','transplant_coordinator'),
(4, 4, 'fortis_coord','$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2uheWG/igi.', 'Dr. Riya Desai',      'riya.desai@fortishealthcare.com','9820004004','transplant_coordinator'),
(5, 5, 'manipal_coord','$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2uheWG/igi.','Dr. Kiran Shetty',   'kiran.shetty@manipal.edu',    '9900005005', 'transplant_coordinator'),
(6, 1, 'national_admin','$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2uheWG/igi.','Dr. Rajiv Sharma',  'rajiv.sharma@notto.gov.in',   '9811006006', 'national_admin'),
(7, 2, 'apollo_staff', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2uheWG/igi.', 'Nurse Lakshmi',      'lakshmi@apollo.com',          '9840007007', 'hospital_staff'),
(8, 3, 'cmc_staff',   '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2uheWG/igi.', 'Nurse Mary Ponnuraj','mary.p@cmcvellore.ac.in',     '9442008008', 'hospital_staff');

-- =============================================================================
-- STEP 4: donors (20 donors — mix of deceased and living)
-- =============================================================================
INSERT INTO donors
(hospital_id, registered_by, donor_type, full_name, age, sex, blood_group,
 weight_kg, height_cm, cause_of_death, brain_death_time, status)
VALUES
(1, 1, 'deceased', 'Ramesh Kumar',       34, 'M', 'O+', 72.0, 170.0, 'traumatic_brain_injury', DATE_SUB(NOW(), INTERVAL 6  HOUR), 'active'),
(2, 2, 'deceased', 'Kavitha Nair',        28, 'F', 'A+', 58.0, 162.0, 'stroke',                 DATE_SUB(NOW(), INTERVAL 10 HOUR), 'active'),
(4, 4, 'deceased', 'Suresh Patil',        45, 'M', 'B+', 80.0, 175.0, 'traumatic_brain_injury', DATE_SUB(NOW(), INTERVAL 8  HOUR), 'active'),
(1, 1, 'deceased', 'Anita Sharma',        52, 'F', 'AB+',65.0, 158.0, 'anoxia',                 DATE_SUB(NOW(), INTERVAL 12 HOUR), 'active'),
(3, 3, 'living',   'Pradeep Selvam',      38, 'M', 'O-', 75.0, 172.0, 'living_donor',           NULL,                             'active'),
(5, 5, 'deceased', 'Meena Bhat',          41, 'F', 'A-', 55.0, 155.0, 'stroke',                 DATE_SUB(NOW(), INTERVAL 14 HOUR), 'active'),
(2, 7, 'deceased', 'Vikram Singh',        29, 'M', 'B-', 82.0, 180.0, 'traumatic_brain_injury', DATE_SUB(NOW(), INTERVAL 5  HOUR), 'active'),
(1, 1, 'deceased', 'Sundari Krishnan',    60, 'F', 'O+', 62.0, 160.0, 'other_cns',              DATE_SUB(NOW(), INTERVAL 20 HOUR), 'organs_allocated'),
(4, 4, 'living',   'Rajesh Mehta',        35, 'M', 'A+', 70.0, 168.0, 'living_donor',           NULL,                             'active'),
(3, 3, 'deceased', 'Fatima Begum',        48, 'F', 'AB-',60.0, 156.0, 'stroke',                 DATE_SUB(NOW(), INTERVAL 18 HOUR), 'active'),
(6, 5, 'deceased', 'Karthik Reddy',       33, 'M', 'O+', 78.0, 174.0, 'traumatic_brain_injury', DATE_SUB(NOW(), INTERVAL 7  HOUR), 'active'),
(2, 2, 'deceased', 'Deepika Pillai',      55, 'F', 'B+', 63.0, 159.0, 'anoxia',                 DATE_SUB(NOW(), INTERVAL 22 HOUR), 'organs_allocated'),
(5, 5, 'living',   'Mohan Gowda',         42, 'M', 'A+', 74.0, 169.0, 'living_donor',           NULL,                             'active'),
(1, 6, 'deceased', 'Pooja Iyer',          26, 'F', 'O-', 54.0, 157.0, 'traumatic_brain_injury', DATE_SUB(NOW(), INTERVAL 9  HOUR), 'active'),
(4, 4, 'deceased', 'Arun Patel',          50, 'M', 'A-', 85.0, 178.0, 'stroke',                 DATE_SUB(NOW(), INTERVAL 30 HOUR), 'expired'),
(3, 3, 'deceased', 'Leela Nambiar',       44, 'F', 'B+', 59.0, 161.0, 'other_cns',              DATE_SUB(NOW(), INTERVAL 36 HOUR), 'expired'),
(2, 7, 'deceased', 'Sanjay Dubey',        37, 'M', 'AB+',77.0, 173.0, 'traumatic_brain_injury', DATE_SUB(NOW(), INTERVAL 15 HOUR), 'active'),
(1, 1, 'living',   'Nalini Rajan',        30, 'F', 'O+', 57.0, 163.0, 'living_donor',           NULL,                             'active'),
(5, 5, 'deceased', 'Prasad Venkat',       63, 'M', 'B-', 79.0, 171.0, 'stroke',                 DATE_SUB(NOW(), INTERVAL 25 HOUR), 'active'),
(6, 5, 'deceased', 'Geetha Subramaniam',  47, 'F', 'A+', 61.0, 158.0, 'anoxia',                 DATE_SUB(NOW(), INTERVAL 11 HOUR), 'active');

-- =============================================================================
-- STEP 5: donor_hla_typing
-- =============================================================================
INSERT IGNORE INTO donor_hla_typing (donor_id, hla_a1, hla_a2, hla_b1, hla_b2, hla_dr1, hla_dr2) VALUES
(1,  'A2',  'A3',  'B7',  'B8',  'DR1', 'DR3'),
(2,  'A1',  'A2',  'B44', 'B57', 'DR4', 'DR7'),
(3,  'A3',  'A24', 'B35', 'B51', 'DR11','DR13'),
(4,  'A2',  'A11', 'B8',  'B15', 'DR3', 'DR15'),
(5,  'A1',  'A3',  'B7',  'B27', 'DR2', 'DR6'),
(6,  'A2',  'A29', 'B44', 'B45', 'DR7', 'DR9'),
(7,  'A3',  'A30', 'B13', 'B35', 'DR4', 'DR11'),
(8,  'A1',  'A2',  'B8',  'B35', 'DR3', 'DR4'),
(9,  'A24', 'A26', 'B38', 'B51', 'DR8', 'DR11'),
(10, 'A2',  'A68', 'B15', 'B18', 'DR3', 'DR13'),
(11, 'A1',  'A3',  'B7',  'B8',  'DR1', 'DR3'),
(12, 'A2',  'A11', 'B35', 'B44', 'DR4', 'DR7'),
(13, 'A3',  'A24', 'B8',  'B27', 'DR2', 'DR11'),
(14, 'A1',  'A2',  'B7',  'B13', 'DR3', 'DR6'),
(17, 'A2',  'A3',  'B44', 'B51', 'DR7', 'DR11'),
(18, 'A1',  'A24', 'B8',  'B35', 'DR4', 'DR15'),
(19, 'A2',  'A11', 'B7',  'B15', 'DR1', 'DR3'),
(20, 'A3',  'A29', 'B35', 'B44', 'DR7', 'DR13');

-- =============================================================================
-- STEP 6: donor_serology
-- =============================================================================
INSERT IGNORE INTO donor_serology
(donor_id, hiv_status, hepatitis_b, hepatitis_c, syphilis, cmv_status, ebv_status)
SELECT d.donor_id, 'negative','negative','negative','negative',
  CASE WHEN d.donor_id % 3 = 0 THEN 'positive' ELSE 'negative' END,
  CASE WHEN d.donor_id % 4 = 0 THEN 'positive' ELSE 'negative' END
FROM donors d
WHERE d.donor_id BETWEEN 1 AND 20;

-- =============================================================================
-- STEP 7: recipients (MUST come before organs so trigger finds candidates) (80 recipients — various urgency/blood/HLA types)
-- =============================================================================
INSERT INTO recipients
(hospital_id, registered_by, full_name, age, sex, blood_group, weight_kg, height_cm,
 organ_needed, primary_diagnosis, registration_date, medical_urgency, pra_percent,
 crossmatch_required, hiv_status, hepatitis_b, hepatitis_c, status)
VALUES
-- STATUS 1A — critical (2)
(2, 2, 'Priya Venkataraman',    45, 'F', 'O+', 55.0, 158.0, 'kidney',  'End-Stage Renal Disease',        DATE_SUB(CURDATE(), INTERVAL 18 MONTH), 'status_1a', 5,  0, 'negative','negative','negative', 'waiting'),
(3, 3, 'Mohammed Ismail',       52, 'M', 'B+', 68.0, 168.0, 'heart',   'Dilated Cardiomyopathy',          DATE_SUB(CURDATE(), INTERVAL 6  MONTH), 'status_1a', 12, 0, 'negative','negative','negative', 'waiting'),
-- STATUS 1B — serious (4)
(1, 1, 'Ananya Krishnaswamy',   38, 'F', 'A+', 52.0, 155.0, 'liver',   'Acute Liver Failure',             DATE_SUB(CURDATE(), INTERVAL 3  MONTH), 'status_1b', 8,  0, 'negative','negative','negative', 'waiting'),
(4, 4, 'Ganesh Narayanan',      61, 'M', 'O+', 76.0, 170.0, 'kidney',  'Diabetic Nephropathy',            DATE_SUB(CURDATE(), INTERVAL 24 MONTH), 'status_1b', 45, 1, 'negative','negative','negative', 'waiting'),
(5, 5, 'Saranya Murugan',       35, 'F', 'AB+',58.0, 160.0, 'lung',    'Idiopathic Pulmonary Fibrosis',   DATE_SUB(CURDATE(), INTERVAL 8  MONTH), 'status_1b', 22, 0, 'negative','negative','negative', 'waiting'),
(2, 2, 'Harish Menon',          48, 'M', 'A-', 74.0, 172.0, 'kidney',  'Polycystic Kidney Disease',       DATE_SUB(CURDATE(), INTERVAL 30 MONTH), 'status_1b', 85, 1, 'negative','negative','negative', 'waiting'),
-- STATUS 2 — moderate (8)
(3, 3, 'Lalitha Subramaniam',   55, 'F', 'B+', 62.0, 157.0, 'kidney',  'Hypertensive Nephropathy',        DATE_SUB(CURDATE(), INTERVAL 36 MONTH), 'status_2',  15, 0, 'negative','negative','negative', 'waiting'),
(1, 1, 'Dinesh Agarwal',        43, 'M', 'O+', 80.0, 174.0, 'liver',   'Cirrhosis - Hepatitis B',         DATE_SUB(CURDATE(), INTERVAL 14 MONTH), 'status_2',  5,  0, 'negative','negative','negative', 'waiting'),
(4, 4, 'Radha Pillai',          39, 'F', 'A+', 54.0, 154.0, 'kidney',  'IgA Nephropathy',                 DATE_SUB(CURDATE(), INTERVAL 20 MONTH), 'status_2',  30, 1, 'negative','negative','negative', 'waiting'),
(5, 5, 'Sunil Mathew',          67, 'M', 'B-', 71.0, 167.0, 'cornea',  'Bullous Keratopathy',             DATE_SUB(CURDATE(), INTERVAL 48 MONTH), 'status_2',  0,  0, 'negative','negative','negative', 'waiting'),
(2, 7, 'Nithya Chandrasekhar',  29, 'F', 'O-', 49.0, 152.0, 'kidney',  'Lupus Nephritis',                 DATE_SUB(CURDATE(), INTERVAL 12 MONTH), 'status_2',  72, 1, 'negative','negative','negative', 'waiting'),
(6, 5, 'Ramakrishnan Iyer',     58, 'M', 'AB+',82.0, 176.0, 'liver',   'Non-alcoholic Steatohepatitis',   DATE_SUB(CURDATE(), INTERVAL 10 MONTH), 'status_2',  8,  0, 'negative','negative','negative', 'waiting'),
(3, 3, 'Meenakshi Rangan',      50, 'F', 'O+', 60.0, 159.0, 'pancreas','Type 1 Diabetes - Kidney Failure',DATE_SUB(CURDATE(), INTERVAL 16 MONTH), 'status_2',  18, 0, 'negative','negative','negative', 'waiting'),
(1, 6, 'Aravind Balakrishnan',  44, 'M', 'A+', 75.0, 171.0, 'kidney',  'Focal Segmental Glomerulosclerosis',DATE_SUB(CURDATE(),INTERVAL 22 MONTH),'status_2',  35, 1, 'negative','negative','negative', 'waiting'),
-- STATUS 3 — stable (many)
(2, 2, 'Kamala Devarajan',      62, 'F', 'B+', 58.0, 156.0, 'cornea',  'Keratoconus',                     DATE_SUB(CURDATE(), INTERVAL 60 MONTH), 'status_3',  0,  0, 'negative','negative','negative', 'waiting'),
(4, 4, 'Venkatesh Rao',         40, 'M', 'O+', 77.0, 173.0, 'kidney',  'Chronic Glomerulonephritis',      DATE_SUB(CURDATE(), INTERVAL 28 MONTH), 'status_3',  10, 0, 'negative','negative','negative', 'waiting'),
(5, 5, 'Indira Balaji',         53, 'F', 'A-', 56.0, 157.0, 'liver',   'Primary Biliary Cholangitis',      DATE_SUB(CURDATE(), INTERVAL 32 MONTH), 'status_3',  5,  0, 'negative','negative','negative', 'waiting'),
(3, 8, 'Krishnamurthy Swamy',   71, 'M', 'AB-',83.0, 169.0, 'kidney',  'Diabetic Nephropathy Stage 5',    DATE_SUB(CURDATE(), INTERVAL 40 MONTH), 'status_3',  20, 0, 'negative','negative','negative', 'waiting'),
(1, 1, 'Padmavathi Natarajan',  46, 'F', 'O+', 53.0, 153.0, 'lung',    'COPD Stage IV',                   DATE_SUB(CURDATE(), INTERVAL 15 MONTH), 'status_3',  8,  0, 'negative','negative','negative', 'waiting'),
(2, 2, 'Saravanan Murugesan',   34, 'M', 'B+', 70.0, 166.0, 'kidney',  'Alport Syndrome',                 DATE_SUB(CURDATE(), INTERVAL 18 MONTH), 'status_3',  14, 0, 'negative','negative','negative', 'waiting'),
(6, 5, 'Vimala Chandran',       49, 'F', 'A+', 61.0, 160.0, 'liver',   'Autoimmune Hepatitis',            DATE_SUB(CURDATE(), INTERVAL 20 MONTH), 'status_3',  6,  0, 'negative','negative','negative', 'waiting'),
(4, 4, 'Balaji Krishnan',       57, 'M', 'O-', 79.0, 175.0, 'kidney',  'Membranous Nephropathy',          DATE_SUB(CURDATE(), INTERVAL 44 MONTH), 'status_3',  25, 1, 'negative','negative','negative', 'waiting'),
(3, 3, 'Sumathi Arumugam',      36, 'F', 'AB+',55.0, 154.0, 'pancreas','Brittle Type 1 Diabetes',         DATE_SUB(CURDATE(), INTERVAL 26 MONTH), 'status_3',  12, 0, 'negative','negative','negative', 'waiting'),
(5, 5, 'Nagarajan Pillai',      64, 'M', 'B+', 74.0, 168.0, 'cornea',  'Corneal Dystrophy',               DATE_SUB(CURDATE(), INTERVAL 72 MONTH), 'status_3',  0,  0, 'negative','negative','negative', 'waiting'),
(1, 6, 'Revathi Sundaram',      41, 'F', 'O+', 57.0, 156.0, 'kidney',  'Rapidly Progressive GN',          DATE_SUB(CURDATE(), INTERVAL 8  MONTH), 'status_3',  55, 1, 'negative','negative','negative', 'waiting'),
(2, 2, 'Senthilkumar Raj',      47, 'M', 'A+', 81.0, 177.0, 'liver',   'Hepatocellular Carcinoma',        DATE_SUB(CURDATE(), INTERVAL 5  MONTH), 'status_3',  3,  0, 'negative','negative','negative', 'waiting'),
(4, 4, 'Gomathi Suresh',        33, 'F', 'B-', 50.0, 151.0, 'kidney',  'Systemic Lupus Erythematosus',    DATE_SUB(CURDATE(), INTERVAL 14 MONTH), 'status_3',  78, 1, 'negative','negative','negative', 'waiting'),
(3, 3, 'Parthasarathy Menon',   59, 'M', 'O+', 76.0, 170.0, 'kidney',  'ADPKD',                           DATE_SUB(CURDATE(), INTERVAL 50 MONTH), 'status_3',  8,  0, 'negative','negative','negative', 'waiting'),
(5, 5, 'Kavitha Balasubramanian',37,'F','A-', 54.0, 155.0, 'lung',    'Pulmonary Arterial Hypertension', DATE_SUB(CURDATE(), INTERVAL 22 MONTH), 'status_3',  16, 0, 'negative','negative','negative', 'waiting'),
(1, 1, 'Thiruvenkatam Rao',     70, 'M', 'AB+',84.0, 165.0, 'cornea',  'Fuchs Endothelial Dystrophy',     DATE_SUB(CURDATE(), INTERVAL 84 MONTH), 'status_3',  0,  0, 'negative','negative','negative', 'waiting');

-- =============================================================================
-- STEP 8: recipient_hla_typing (MUST come before organs) (for the first 20 recipients)
-- =============================================================================
INSERT IGNORE INTO recipient_hla_typing
(recipient_id, hla_a1, hla_a2, hla_b1, hla_b2, hla_dr1, hla_dr2) VALUES
(1,  'A2',  'A3',  'B7',  'B8',  'DR1', 'DR3'),   -- 6/6 match with donor 1!
(2,  'A1',  'A11', 'B44', 'B51', 'DR4', 'DR11'),
(3,  'A2',  'A3',  'B8',  'B35', 'DR3', 'DR15'),
(4,  'A3',  'A24', 'B35', 'B51', 'DR11','DR4'),    -- good match with donor 3
(5,  'A2',  'A11', 'B8',  'B15', 'DR3', 'DR15'),
(6,  'A1',  'A3',  'B7',  'B27', 'DR2', 'DR6'),    -- 6/6 match with donor 5!
(7,  'A2',  'A29', 'B44', 'B45', 'DR7', 'DR9'),
(8,  'A1',  'A2',  'B8',  'B35', 'DR3', 'DR4'),    -- 6/6 match with donor 8!
(9,  'A3',  'A30', 'B13', 'B35', 'DR4', 'DR11'),
(10, 'A24', 'A26', 'B38', 'B51', 'DR8', 'DR11'),
(11, 'A1',  'A3',  'B7',  'B8',  'DR1', 'DR3'),    -- 6/6 match with donor 11!
(12, 'A2',  'A11', 'B35', 'B44', 'DR4', 'DR7'),
(13, 'A3',  'A24', 'B8',  'B27', 'DR2', 'DR11'),
(14, 'A1',  'A2',  'B7',  'B13', 'DR3', 'DR6'),
(15, 'A2',  'A68', 'B15', 'B18', 'DR3', 'DR13'),
(16, 'A1',  'A3',  'B7',  'B8',  'DR1', 'DR4'),
(17, 'A2',  'A11', 'B44', 'B57', 'DR4', 'DR7'),
(18, 'A3',  'A24', 'B35', 'B51', 'DR11','DR13'),
(19, 'A2',  'A11', 'B8',  'B15', 'DR3', 'DR15'),
(20, 'A1',  'A3',  'B7',  'B27', 'DR2', 'DR6');

-- =============================================================================
-- STEP 10: recipient_clinical_scores (liver MELD, lung LAS)
-- =============================================================================
INSERT IGNORE INTO recipient_clinical_scores
(recipient_id, meld_score, las_score, lvad_dependent, dialysis_start_date)
SELECT r.recipient_id,
  CASE WHEN r.organ_needed = 'liver'
    THEN CASE r.medical_urgency
      WHEN 'status_1a' THEN 35
      WHEN 'status_1b' THEN 28
      WHEN 'status_2'  THEN 18
      ELSE 12
    END
    ELSE NULL
  END AS meld_score,
  CASE WHEN r.organ_needed = 'lung'
    THEN CASE r.medical_urgency
      WHEN 'status_1a' THEN 85.0
      WHEN 'status_1b' THEN 65.0
      WHEN 'status_2'  THEN 45.0
      ELSE 28.0
    END
    ELSE NULL
  END AS las_score,
  CASE WHEN r.organ_needed = 'heart' AND r.medical_urgency = 'status_1a' THEN 1 ELSE 0 END,
  CASE WHEN r.organ_needed = 'kidney'
    THEN DATE_SUB(r.registration_date, INTERVAL 3 MONTH)
    ELSE NULL
  END
FROM recipients r
WHERE r.organ_needed IN ('liver','lung','kidney','heart');

-- =============================================================================
-- STEP 11: recipient_urgency_cache (required for match_organ cursor)
-- =============================================================================
INSERT INTO recipient_urgency_cache (recipient_id, urgency_score, computed_at)
SELECT r.recipient_id,
  CASE r.medical_urgency
    WHEN 'status_1a' THEN 90 + (RAND() * 10)
    WHEN 'status_1b' THEN 70 + (RAND() * 15)
    WHEN 'status_2'  THEN 45 + (RAND() * 20)
    ELSE              15 + (RAND() * 25)
  END,
  NOW()
FROM recipients r
ON DUPLICATE KEY UPDATE
  urgency_score = VALUES(urgency_score),
  computed_at   = NOW();

-- STEP 9: organs (INSERT triggers match_organ() automatically) (10 active organs across different hospitals)
-- =============================================================================
INSERT INTO organs
(donor_id, organ_type, laterality, harvest_time, viability_hours, expires_at, status, clinical_data)
VALUES
(1,  'kidney',  'left',      NOW(), 24, DATE_ADD(NOW(), INTERVAL 24 HOUR), 'available',
     '{"egfr":82,"creatinine":1.1}'),
(1,  'kidney',  'right',     NOW(), 24, DATE_ADD(NOW(), INTERVAL 24 HOUR), 'available',
     '{"egfr":79,"creatinine":1.2}'),
(2,  'heart',   'na',        NOW(), 5,  DATE_ADD(NOW(), INTERVAL 5  HOUR), 'available',
     '{"ejection_fraction":65,"donor_weight_kg":58}'),
(3,  'liver',   'na',        NOW(), 12, DATE_ADD(NOW(), INTERVAL 12 HOUR), 'available',
     '{"alt":28,"ast":31,"bilirubin":0.9}'),
(5,  'kidney',  'left',      NOW(), 24, DATE_ADD(NOW(), INTERVAL 24 HOUR), 'available',
     '{"egfr":91,"creatinine":0.9}'),
(6,  'lung',    'bilateral', NOW(), 7,  DATE_ADD(NOW(), INTERVAL 7  HOUR), 'available',
     '{"pao2_fio2":380,"tlc_litres":5.8}'),
(7,  'kidney',  'left',      NOW(), 24, DATE_ADD(NOW(), INTERVAL 24 HOUR), 'available',
     '{"egfr":75,"creatinine":1.3}'),
(9,  'kidney',  'left',      NOW(), 24, DATE_ADD(NOW(), INTERVAL 24 HOUR), 'available',
     '{"egfr":88,"creatinine":1.0}'),
(11, 'pancreas','na',        NOW(), 12, DATE_ADD(NOW(), INTERVAL 12 HOUR), 'available',
     '{"amylase":95,"lipase":88}'),
(14, 'cornea',  'bilateral', NOW(), 336,DATE_ADD(NOW(), INTERVAL 336 HOUR),'available',
     '{"endothelial_count":2400}');

-- =============================================================================
-- =============================================================================
-- STEP 12: transport_routes (key hospital pairs for matching engine)
-- =============================================================================
-- from, to, distance_km, road_hours, air_hours, best_hours, notes
INSERT IGNORE INTO transport_routes
(from_hospital_id, to_hospital_id, distance_km, road_hours, air_hours, best_hours, route_notes) VALUES
(1,2, 2180, 32.0, 3.5, 3.5, 'DEL-MAA air'),  (2,1, 2180, 32.0, 3.5, 3.5, 'MAA-DEL air'),
(1,3, 2260, 34.0, 3.8, 3.8, 'DEL-VEL air'),  (3,1, 2260, 34.0, 3.8, 3.8, 'VEL-DEL air'),
(1,4, 1400, 20.0, 2.5, 2.5, 'DEL-BOM air'),  (4,1, 1400, 20.0, 2.5, 2.5, 'BOM-DEL air'),
(1,5, 2150, 32.0, 3.5, 3.5, 'DEL-BLR air'),  (5,1, 2150, 32.0, 3.5, 3.5, 'BLR-DEL air'),
(1,6, 1580, 22.0, 2.8, 2.8, 'DEL-HYD air'),  (6,1, 1580, 22.0, 2.8, 2.8, 'HYD-DEL air'),
(1,7,  250,  1.5, NULL, 1.5, 'DEL-CHD road'), (7,1,  250,  1.5, NULL, 1.5, 'CHD-DEL road'),
(1,8,  510,  3.0, NULL, 3.0, 'DEL-LKO road'), (8,1,  510,  3.0, NULL, 3.0, 'LKO-DEL road'),
(2,3,  200,  2.5, NULL, 2.5, 'MAA-VEL road'), (3,2,  200,  2.5, NULL, 2.5, 'VEL-MAA road'),
(2,4, 1330, 20.0, 2.5, 2.5, 'MAA-BOM air'),  (4,2, 1330, 20.0, 2.5, 2.5, 'BOM-MAA air'),
(2,5, 1680, 25.0, 3.0, 3.0, 'MAA-BLR air'),  (5,2, 1680, 25.0, 3.0, 3.0, 'BLR-MAA air'),
(2,6, 1760, 26.0, 3.2, 3.2, 'MAA-HYD air'),  (6,2, 1760, 26.0, 3.2, 3.2, 'HYD-MAA air'),
(3,4, 1480, 22.0, 2.8, 2.8, 'VEL-BOM air'),  (4,3, 1480, 22.0, 2.8, 2.8, 'BOM-VEL air'),
(3,5,  990, 14.0, 2.0, 2.0, 'VEL-BLR air'),  (5,3,  990, 14.0, 2.0, 2.0, 'BLR-VEL air'),
(4,5, 1000, 15.0, 2.0, 2.0, 'BOM-BLR air'),  (5,4, 1000, 15.0, 2.0, 2.0, 'BLR-BOM air'),
(4,6, 1500, 22.0, 2.8, 2.8, 'BOM-HYD air'),  (6,4, 1500, 22.0, 2.8, 2.8, 'HYD-BOM air'),
(5,6,  570,  3.2, NULL, 3.2, 'BLR-HYD road'),(6,5,  570,  3.2, NULL, 3.2, 'HYD-BLR road'),
(6,7, 2100, 30.0, 3.5, 3.5, 'HYD-CHD air'),  (7,6, 2100, 30.0, 3.5, 3.5, 'CHD-HYD air'),
(7,8,  300,  2.0, NULL, 2.0, 'CHD-LKO road'), (8,7,  300,  2.0, NULL, 2.0, 'LKO-CHD road');

-- =============================================================================
-- STEP 13: Historical transplant records (30 records for analytics charts)
-- =============================================================================
-- First create the historical donors, organs, offers needed for FK constraints
-- Then insert transplant records directly (bypassing triggers for seed data)

-- We seed directly using valid offer/organ/donor/recipient IDs that we just created.
-- Donor 8 (status=organs_allocated) and Donor 12 (organs_allocated) had historical txn.

-- Insert historical organs for the expired/allocated donors
INSERT INTO organs (donor_id, organ_type, laterality, harvest_time, viability_hours, expires_at, status)
VALUES
(8,  'kidney', 'left',  DATE_SUB(NOW(), INTERVAL 45 DAY), 24, DATE_SUB(NOW(), INTERVAL 44 DAY), 'transplanted'),
(8,  'liver',  'na',    DATE_SUB(NOW(), INTERVAL 45 DAY), 12, DATE_SUB(NOW(), INTERVAL 44 DAY), 'transplanted'),
(12, 'heart',  'na',    DATE_SUB(NOW(), INTERVAL 30 DAY), 5,  DATE_SUB(NOW(), INTERVAL 29 DAY), 'transplanted'),
(12, 'kidney', 'right', DATE_SUB(NOW(), INTERVAL 30 DAY), 24, DATE_SUB(NOW(), INTERVAL 29 DAY), 'transplanted'),
(15, 'kidney', 'left',  DATE_SUB(NOW(), INTERVAL 60 DAY), 24, DATE_SUB(NOW(), INTERVAL 59 DAY), 'transplanted'),
(16, 'cornea', 'bilateral',DATE_SUB(NOW(),INTERVAL 90 DAY),336,DATE_SUB(NOW(),INTERVAL 76 DAY),'transplanted');

-- Insert historical offers (simplified — just the IDs we need)
INSERT INTO offers
(organ_id, recipient_id, match_id, offering_hospital_id, receiving_hospital_id,
 offered_by, status, response_deadline, responded_at, responded_by)
VALUES
(11, 4,  NULL, 1, 4, 1, 'accepted', DATE_SUB(NOW(), INTERVAL 45 DAY), DATE_SUB(NOW(), INTERVAL 45 DAY), 4),
(12, 8,  NULL, 1, 1, 1, 'accepted', DATE_SUB(NOW(), INTERVAL 45 DAY), DATE_SUB(NOW(), INTERVAL 45 DAY), 1),
(13, 2,  NULL, 2, 3, 2, 'accepted', DATE_SUB(NOW(), INTERVAL 30 DAY), DATE_SUB(NOW(), INTERVAL 30 DAY), 3),
(14, 16, NULL, 2, 4, 2, 'accepted', DATE_SUB(NOW(), INTERVAL 30 DAY), DATE_SUB(NOW(), INTERVAL 30 DAY), 4),
(15, 22, NULL, 4, 5, 4, 'accepted', DATE_SUB(NOW(), INTERVAL 60 DAY), DATE_SUB(NOW(), INTERVAL 60 DAY), 5),
(16, 24, NULL, 3, 5, 3, 'accepted', DATE_SUB(NOW(), INTERVAL 90 DAY), DATE_SUB(NOW(), INTERVAL 90 DAY), 5);

-- Transplant records (uses organ IDs 11-16 just inserted above)
INSERT INTO transplant_records
(offer_id, organ_id, donor_id, recipient_id, donor_hospital_id, recipient_hospital_id,
 transplant_date, cold_ischemia_hrs, total_score_at_match, surgeon_name, graft_status)
VALUES
(1,  11, 8,  4,  1, 4, DATE_SUB(CURDATE(), INTERVAL 45  DAY), 8.2,  72.5, 'Dr. Riya Desai',       'functioning'),
(2,  12, 8,  8,  1, 1, DATE_SUB(CURDATE(), INTERVAL 44  DAY), 6.1,  68.3, 'Dr. Arjun Mehta',      'functioning'),
(3,  13, 12, 2,  2, 3, DATE_SUB(CURDATE(), INTERVAL 30  DAY), 4.5,  81.2, 'Dr. Samuel George',    'functioning'),
(4,  14, 12, 16, 2, 4, DATE_SUB(CURDATE(), INTERVAL 29  DAY), 9.8,  65.4, 'Dr. Riya Desai',       'functioning'),
(5,  15, 15, 22, 4, 5, DATE_SUB(CURDATE(), INTERVAL 60  DAY), 7.3,  58.9, 'Dr. Kiran Shetty',     'functioning'),
(6,  16, 16, 24, 3, 5, DATE_SUB(CURDATE(), INTERVAL 90  DAY), 2.1,  45.0, 'Dr. Kiran Shetty',     'functioning');

-- More historical records across different dates for trend charts
INSERT INTO transplant_records
(offer_id, organ_id, donor_id, recipient_id, donor_hospital_id, recipient_hospital_id,
 transplant_date, cold_ischemia_hrs, total_score_at_match, surgeon_name, graft_status)
SELECT
  (n % 6) + 1,
  11 + (n % 6),
  (n % 20) + 1,
  (n % 30) + 1,
  ((n % 8) + 1),
  ((n+3) % 8) + 1,
  DATE_SUB(CURDATE(), INTERVAL n DAY),
  3.0 + (n % 8),
  50.0 + (n % 35),
  ELT((n%5)+1,'Dr. Arjun Mehta','Dr. Priya Suresh','Dr. Samuel George','Dr. Riya Desai','Dr. Kiran Shetty'),
  IF(n % 7 = 0, 'failed', 'functioning')
FROM (
  SELECT a.N + b.N*10 + 7 AS n
  FROM
    (SELECT 0 AS N UNION SELECT 1 UNION SELECT 2 UNION SELECT 3 UNION SELECT 4
     UNION SELECT 5 UNION SELECT 6 UNION SELECT 7 UNION SELECT 8 UNION SELECT 9) a,
    (SELECT 0 AS N UNION SELECT 1 UNION SELECT 2) b
  WHERE a.N + b.N*10 + 7 BETWEEN 7 AND 180
    AND (a.N + b.N*10 + 7) % 5 = 0
) nums;

-- =============================================================================
-- STEP 14: Notifications for demo
-- =============================================================================
INSERT INTO notifications
(recipient_user_id, type, title, body, related_organ_id, is_read, created_at)
VALUES
(1, 'new_match',          'New Match — KIDNEY Available',   'Organ #1 matched. Viability: 24 hrs. Your patient ranked #1. Score: 85.5/100.', 1, 0, DATE_SUB(NOW(), INTERVAL 30 MINUTE)),
(1, 'new_match',          'New Match — HEART Available',    'Organ #3 matched. Viability: 5 hrs. Your patient ranked #1. Score: 76.2/100.',  3, 0, DATE_SUB(NOW(), INTERVAL 1 HOUR)),
(2, 'offer_received',     'Offer Received — Kidney ORG-1',  'An offer has been sent to Apollo Hospital for organ #1. Respond within 4 hours.', 1, 1, DATE_SUB(NOW(), INTERVAL 2 HOUR)),
(1, 'new_match',          'New Match — LIVER Available',    'Organ #4 matched. Viability: 12 hrs. Your patient ranked #2. Score: 71.8/100.', 4, 1, DATE_SUB(NOW(), INTERVAL 3 HOUR)),
(3, 'new_match',          'New Match — KIDNEY Available',   'Organ #5 matched. Viability: 24 hrs. Your patient ranked #1. Score: 88.1/100.', 5, 0, DATE_SUB(NOW(), INTERVAL 45 MINUTE)),
(1, 'system_alert',       'Donor Registered — D-17',        'New deceased donor registered at Apollo Hospital Chennai. Organs: kidney, liver.', NULL, 1, DATE_SUB(NOW(), INTERVAL 5 HOUR)),
(2, 'system_alert',       'Urgency Updated — R-2',          'Mohammed Ismail urgency escalated to Status 1A. Immediate matching required.',    NULL, 0, DATE_SUB(NOW(), INTERVAL 20 MINUTE)),
(1, 'transplant_confirmed','Transplant Confirmed — TX-1',   'Kidney transplant for recipient R-4 completed successfully. Graft functioning.', NULL, 1, DATE_SUB(NOW(), INTERVAL 2 DAY));

SET FOREIGN_KEY_CHECKS = 1;

-- =============================================================================
-- VERIFICATION QUERIES (check these return data)
-- =============================================================================
SELECT 'hospitals'   AS tbl, COUNT(*) AS cnt FROM hospitals
UNION ALL SELECT 'donors',     COUNT(*) FROM donors
UNION ALL SELECT 'organs',     COUNT(*) FROM organs
UNION ALL SELECT 'recipients', COUNT(*) FROM recipients
UNION ALL SELECT 'notifications',COUNT(*) FROM notifications
UNION ALL SELECT 'transplant_records',COUNT(*) FROM transplant_records
UNION ALL SELECT 'transport_routes',COUNT(*) FROM transport_routes;

-- =============================================================================
-- STEP 15: Run matching engine on all active organs
-- This populates match_results so the Matching Engine page shows ranked candidates
-- =============================================================================

-- Run matching for each available organ (triggers the 7-component algorithm)
CALL match_organ(1);   -- kidney left from donor 1
CALL match_organ(2);   -- kidney right from donor 1  
CALL match_organ(3);   -- heart from donor 2
CALL match_organ(4);   -- liver from donor 3
CALL match_organ(5);   -- kidney from donor 5
CALL match_organ(6);   -- lung from donor 6
CALL match_organ(7);   -- kidney from donor 7
CALL match_organ(8);   -- kidney from donor 9
CALL match_organ(9);   -- pancreas from donor 11
CALL match_organ(10);  -- cornea from donor 14

-- =============================================================================
-- STEP 16: Create PENDING offers from top match results
-- This makes the Offer Workflow page show active offers
-- =============================================================================

-- Insert pending offers for the top-ranked match from organ 1 (kidney) and organ 3 (heart)
INSERT INTO offers (
  match_id, organ_id, recipient_id,
  offering_hospital_id, receiving_hospital_id,
  offered_by, status, response_deadline
)
SELECT
  mr.match_id, mr.organ_id, mr.recipient_id,
  mr.donor_hospital_id, mr.recipient_hospital_id,
  1, 'pending',
  DATE_ADD(NOW(), INTERVAL 4 HOUR)
FROM match_results mr
WHERE mr.organ_id = 1
  AND mr.rank_position = 1
  AND mr.ischemic_time_feasible = 1
LIMIT 1;

INSERT INTO offers (
  match_id, organ_id, recipient_id,
  offering_hospital_id, receiving_hospital_id,
  offered_by, status, response_deadline
)
SELECT
  mr.match_id, mr.organ_id, mr.recipient_id,
  mr.donor_hospital_id, mr.recipient_hospital_id,
  1, 'pending',
  DATE_ADD(NOW(), INTERVAL 3 HOUR)
FROM match_results mr
WHERE mr.organ_id = 3
  AND mr.rank_position = 1
  AND mr.ischemic_time_feasible = 1
LIMIT 1;

-- Update organ status to offer_pending
UPDATE organs SET status = 'offer_pending'
WHERE organ_id IN (1, 3);

-- =============================================================================
-- FINAL: Verification
-- =============================================================================
SELECT 'match_results' AS tbl, COUNT(*) AS cnt FROM match_results
UNION ALL SELECT 'offers', COUNT(*) FROM offers
UNION ALL SELECT 'pending_offers', COUNT(*) FROM offers WHERE status='pending'
UNION ALL SELECT 'transplant_records', COUNT(*) FROM transplant_records;
