-- Club roster: core committee members vs general members
CREATE TABLE IF NOT EXISTS club_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  full_name VARCHAR(255) NOT NULL,
  roll_number VARCHAR(50),
  email VARCHAR(255),
  designation VARCHAR(100),
  phone VARCHAR(20),
  is_core_member BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_club_members_club_id ON club_members(club_id);
CREATE INDEX IF NOT EXISTS idx_club_members_core ON club_members(club_id, is_core_member);
