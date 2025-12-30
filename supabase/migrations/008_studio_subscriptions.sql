-- =============================================================================
-- AI Studio Subscription Management
-- =============================================================================
-- Add studio subscription columns to profiles table

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS studio_expires_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS studio_enabled BOOLEAN DEFAULT false;

-- Add comments for documentation
COMMENT ON COLUMN public.profiles.studio_expires_at IS 'AI Studio利用期限（NULLの場合は無期限）';
COMMENT ON COLUMN public.profiles.studio_enabled IS 'AI Studioが有効かどうか';

-- Create index for faster expiration checks
CREATE INDEX IF NOT EXISTS idx_profiles_studio_expires_at 
ON public.profiles(studio_expires_at) 
WHERE studio_enabled = true;

-- Function to check if user has active studio access
CREATE OR REPLACE FUNCTION public.has_studio_access(user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    profile_record RECORD;
BEGIN
    SELECT studio_enabled, studio_expires_at INTO profile_record
    FROM public.profiles
    WHERE id = user_id;
    
    -- Check if studio is enabled
    IF NOT profile_record.studio_enabled THEN
        RETURN FALSE;
    END IF;
    
    -- Check if expired (NULL means no expiration)
    IF profile_record.studio_expires_at IS NOT NULL 
       AND profile_record.studio_expires_at < NOW() THEN
        RETURN FALSE;
    END IF;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.has_studio_access(UUID) TO authenticated;
