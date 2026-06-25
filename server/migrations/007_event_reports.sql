-- 1. Modify the existing `events` table
ALTER TABLE events
ADD COLUMN IF NOT EXISTS end_date DATE,
ADD COLUMN IF NOT EXISTS event_type VARCHAR(50) DEFAULT 'open_all',
ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'active',
ADD COLUMN IF NOT EXISTS report_exempt BOOLEAN DEFAULT false;

-- Backfill data: If end_date is null, use the date column
UPDATE events SET end_date = date WHERE end_date IS NULL;

-- 2. Create the `event_reports` table
CREATE TABLE IF NOT EXISTS event_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  event_id UUID UNIQUE NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  level VARCHAR(50) NOT NULL,
  level_description TEXT,
  report_doc_link VARCHAR(1000) NOT NULL,
  participants_sheet_link VARCHAR(1000),
  photos_drive_link VARCHAR(1000) NOT NULL,
  awards_doc_link VARCHAR(1000),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for fast lookup by club
CREATE INDEX IF NOT EXISTS idx_event_reports_club_id ON event_reports(club_id);
