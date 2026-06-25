-- 009_archive_tables.sql
-- Create archive tables for events, bookings, and event_reports

CREATE TABLE IF NOT EXISTS archived_events (
  id UUID PRIMARY KEY,
  club_id UUID NOT NULL,
  name VARCHAR(255) NOT NULL,
  date TIMESTAMPTZ NOT NULL,
  end_date TIMESTAMPTZ,
  venue VARCHAR(255),
  event_type VARCHAR(50),
  status VARCHAR(50),
  report_exempt BOOLEAN,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  archived_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS archived_bookings (
  id UUID PRIMARY KEY,
  club_id UUID NOT NULL,
  venue_id UUID NOT NULL,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  status VARCHAR(50) NOT NULL,
  user_id UUID,
  event_name VARCHAR(255) NOT NULL,
  event_type VARCHAR(50) NOT NULL,
  expected_attendees INTEGER,
  batch_id UUID,
  event_id UUID,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  archived_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS archived_event_reports (
  id UUID PRIMARY KEY,
  club_id UUID NOT NULL,
  event_id UUID NOT NULL,
  level VARCHAR(50) NOT NULL,
  level_description TEXT,
  report_doc_link VARCHAR(1000) NOT NULL,
  participants_sheet_link VARCHAR(1000),
  photos_drive_link VARCHAR(1000) NOT NULL,
  awards_doc_link VARCHAR(1000),
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  archived_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Note: We do NOT create foreign keys referencing `events` or `bookings` 
-- since those active rows will be deleted.
