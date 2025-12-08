-- Create enum for asset types
CREATE TYPE public.asset_type AS ENUM ('self', 'member', 'character', 'channel_icon', 'other');

-- Create table for channel assets (uploaded images)
CREATE TABLE public.channel_assets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  asset_type asset_type NOT NULL DEFAULT 'other',
  image_url TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.channel_assets ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their own assets"
ON public.channel_assets
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own assets"
ON public.channel_assets
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own assets"
ON public.channel_assets
FOR DELETE
USING (auth.uid() = user_id);

-- Create storage bucket for channel assets
INSERT INTO storage.buckets (id, name, public) VALUES ('channel-assets', 'channel-assets', true);

-- Storage policies
CREATE POLICY "Users can upload their own assets"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'channel-assets' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view their own assets"
ON storage.objects
FOR SELECT
USING (bucket_id = 'channel-assets');

CREATE POLICY "Users can delete their own assets"
ON storage.objects
FOR DELETE
USING (bucket_id = 'channel-assets' AND auth.uid()::text = (storage.foldername(name))[1]);