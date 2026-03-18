-- =============================================================================
-- OrganMatch DB Fix Script
-- Run this ONCE if you see 500 errors after setup:
--   mysql -u root -p organmatch < organmatch_db_fix.sql
-- =============================================================================
USE organmatch;

-- 1. Make sure recipient_urgency_cache has all recipients (needed by waiting list)
INSERT INTO recipient_urgency_cache (recipient_id, urgency_score)
SELECT r.recipient_id,
  CASE r.medical_urgency
    WHEN 'status_1a' THEN 90 + FLOOR(RAND()*10)
    WHEN 'status_1b' THEN 70 + FLOOR(RAND()*15)
    WHEN 'status_2'  THEN 45 + FLOOR(RAND()*20)
    ELSE              15 + FLOOR(RAND()*25)
  END
FROM recipients r
WHERE r.recipient_id NOT IN (SELECT recipient_id FROM recipient_urgency_cache)
ON DUPLICATE KEY UPDATE
  urgency_score = VALUES(urgency_score),
  computed_at   = NOW();

-- 2. Make sure recipient_clinical_scores has entries for liver/lung/heart/kidney
INSERT IGNORE INTO recipient_clinical_scores (recipient_id, meld_score, las_score, lvad_dependent, dialysis_start_date)
SELECT r.recipient_id,
  CASE WHEN r.organ_needed='liver'
    THEN CASE r.medical_urgency WHEN 'status_1a' THEN 35 WHEN 'status_1b' THEN 28 WHEN 'status_2' THEN 18 ELSE 12 END
    ELSE NULL END,
  CASE WHEN r.organ_needed='lung'
    THEN CASE r.medical_urgency WHEN 'status_1a' THEN 85.0 WHEN 'status_1b' THEN 65.0 WHEN 'status_2' THEN 45.0 ELSE 28.0 END
    ELSE NULL END,
  CASE WHEN r.organ_needed='heart' AND r.medical_urgency='status_1a' THEN 1 ELSE 0 END,
  CASE WHEN r.organ_needed='kidney' THEN DATE_SUB(r.registration_date, INTERVAL 3 MONTH) ELSE NULL END
FROM recipients r;

-- 3. Make sure hospital_capacity rows exist for all hospitals
INSERT IGNORE INTO hospital_capacity (hospital_id, icu_beds_total, icu_beds_available)
SELECT hospital_id, 30, 8 FROM hospitals
WHERE hospital_id NOT IN (SELECT hospital_id FROM hospital_capacity);

-- 4. Ensure blood_bank_inventory has rows for all hospitals
INSERT IGNORE INTO blood_bank_inventory (hospital_id, blood_group, units_available)
SELECT h.hospital_id, bg.blood_group, FLOOR(RAND()*20)+5
FROM hospitals h
CROSS JOIN (
  SELECT 'A+' AS blood_group UNION SELECT 'A-' UNION SELECT 'B+' UNION SELECT 'B-'
  UNION SELECT 'AB+' UNION SELECT 'AB-' UNION SELECT 'O+' UNION SELECT 'O-'
) bg
WHERE h.is_active = 1;

-- 5. Run match_organ for all available organs so match_results gets populated
DELIMITER $$
BEGIN
  DECLARE v_organ_id INT;
  DECLARE done INT DEFAULT 0;
  DECLARE organ_cursor CURSOR FOR
    SELECT organ_id FROM organs WHERE status = 'available';
  DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = 1;

  OPEN organ_cursor;
  match_loop: LOOP
    FETCH organ_cursor INTO v_organ_id;
    IF done THEN LEAVE match_loop; END IF;
    CALL match_organ(v_organ_id);
  END LOOP;
  CLOSE organ_cursor;
END$$
DELIMITER ;

-- 6. Show counts so you can verify everything worked
SELECT 'recipient_urgency_cache' AS tbl, COUNT(*) AS rows FROM recipient_urgency_cache
UNION ALL SELECT 'recipient_clinical_scores', COUNT(*) FROM recipient_clinical_scores
UNION ALL SELECT 'hospital_capacity',          COUNT(*) FROM hospital_capacity
UNION ALL SELECT 'blood_bank_inventory',       COUNT(*) FROM blood_bank_inventory
UNION ALL SELECT 'match_results',              COUNT(*) FROM match_results
UNION ALL SELECT 'organs_available',           COUNT(*) FROM organs WHERE status='available'
UNION ALL SELECT 'recipients_waiting',         COUNT(*) FROM recipients WHERE status='waiting';
