-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- users table
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email       TEXT NOT NULL UNIQUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- recordings table
-- ============================================================
CREATE TYPE recording_status AS ENUM ('pending', 'processing', 'done');

CREATE TABLE IF NOT EXISTS recordings (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  audio_url   TEXT NOT NULL,
  transcript  TEXT,
  status      recording_status NOT NULL DEFAULT 'pending',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_recordings_user_id ON recordings(user_id);
CREATE INDEX idx_recordings_status  ON recordings(status);

-- ============================================================
-- analysis table
-- ============================================================
CREATE TABLE IF NOT EXISTS analysis (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  recording_id    UUID NOT NULL REFERENCES recordings(id) ON DELETE CASCADE,
  tags            TEXT[] NOT NULL DEFAULT '{}',
  motivation      TEXT NOT NULL DEFAULT '',
  personality     TEXT NOT NULL DEFAULT '',
  opening_script  TEXT NOT NULL DEFAULT '',
  selling_points  JSONB NOT NULL DEFAULT '[]',
  objections      JSONB NOT NULL DEFAULT '[]',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_analysis_recording_id ON analysis(recording_id);

-- ============================================================
-- Row Level Security (RLS)
-- ============================================================
ALTER TABLE users      ENABLE ROW LEVEL SECURITY;
ALTER TABLE recordings ENABLE ROW LEVEL SECURITY;
ALTER TABLE analysis   ENABLE ROW LEVEL SECURITY;

-- Users can only read/update their own user record
CREATE POLICY "users: self only" ON users
  FOR ALL USING (auth.uid() = id);

-- Users can only access their own recordings
CREATE POLICY "recordings: owner only" ON recordings
  FOR ALL USING (auth.uid() = user_id);

-- Users can access analysis of their own recordings
CREATE POLICY "analysis: owner only" ON analysis
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM recordings r
      WHERE r.id = analysis.recording_id
        AND r.user_id = auth.uid()
    )
  );

-- ============================================================
-- Storage bucket for audio files
-- ============================================================
-- Run this in Supabase Dashboard > Storage, or via API:
-- INSERT INTO storage.buckets (id, name, public) VALUES ('recordings', 'recordings', false);
