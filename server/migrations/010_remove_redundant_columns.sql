-- 010_remove_redundant_columns.sql
-- Remove redundant denormalized columns from bookings (now derived via event_id JOIN)
-- and clean up unused columns from events

-- Drop redundant columns from bookings
ALTER TABLE bookings
  DROP COLUMN IF EXISTS event_name,
  DROP COLUMN IF EXISTS event_type,
  DROP COLUMN IF EXISTS is_public;

-- report_exempt is intentionally kept on events (used to exempt clubs from report requirements)

-- Archive tables are point-in-time snapshots, keep as-is for historical integrity.
