-- Add block skill average column (true averages are recomputed from video_analyses).
ALTER TABLE user_stats
  ADD COLUMN IF NOT EXISTS block_score double precision;
