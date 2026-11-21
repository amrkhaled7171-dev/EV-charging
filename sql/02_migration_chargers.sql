-- Run ONCE, after 01_ev_charging_db.sql.
-- Adds the columns that section 7.2 of the design document requires in `chargers`
-- but that are missing from the original dump.
USE ev_charging_db;

ALTER TABLE chargers
  ADD COLUMN max_power_kw     DECIMAL(6,2) NULL,
  ADD COLUMN status           ENUM('AVAILABLE','IN_USE','MAINTENANCE','OFFLINE') NOT NULL DEFAULT 'OFFLINE',
  ADD COLUMN maintenance_flag TINYINT(1)   NOT NULL DEFAULT 0,
  ADD COLUMN last_seen        DATETIME     NULL,
  ADD COLUMN source           ENUM('SIMULATOR','ESP32') NOT NULL DEFAULT 'SIMULATOR';

-- ASSUMED rated power values: confirm with the database owner (Person 3).
UPDATE chargers SET max_power_kw = 11.00 WHERE charger_id = 'CH-001';
UPDATE chargers SET max_power_kw = 18.40 WHERE charger_id = 'CH-002';
UPDATE chargers SET max_power_kw =  7.40 WHERE charger_id = 'CH-003';
