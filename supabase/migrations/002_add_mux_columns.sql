-- Add Mux specific columns to contents table
ALTER TABLE public.contents 
ADD COLUMN IF NOT EXISTS mux_asset_id TEXT,
ADD COLUMN IF NOT EXISTS mux_playback_id TEXT;
