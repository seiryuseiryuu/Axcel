-- =============================================================================
-- AI Studio Complete Database Setup
-- Run this on a new Supabase project
-- =============================================================================

-- Enable pgcrypto for gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- =============================================================================
-- 1. Core User & Role Management
-- =============================================================================

-- Profiles table (extends auth.users)
CREATE TABLE public.profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    role VARCHAR(20) NOT NULL CHECK (role IN ('admin', 'instructor', 'student')),
    display_name TEXT,
    avatar_url TEXT,
    bio TEXT,
    -- AI Studio subscription fields
    studio_enabled BOOLEAN DEFAULT false,
    studio_expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
CREATE POLICY "Public profiles are viewable by everyone" 
    ON public.profiles FOR SELECT 
    USING (true);

CREATE POLICY "Users can update own profile" 
    ON public.profiles FOR UPDATE 
    USING (auth.uid() = id);

-- =============================================================================
-- 2. Audit Logs (for tracking admin actions)
-- =============================================================================

CREATE TABLE public.audit_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    actor_id UUID REFERENCES auth.users(id),
    action TEXT NOT NULL,
    target_type TEXT NOT NULL,
    target_id UUID,
    details JSONB,
    ip_address TEXT,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Only admins can view audit logs
CREATE POLICY "Admins can view audit logs" 
    ON public.audit_logs FOR SELECT 
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- =============================================================================
-- 3. Notifications
-- =============================================================================

CREATE TABLE public.notifications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    type VARCHAR(20) CHECK (type IN ('info', 'warning', 'success', 'error', 'risk_alert')),
    title TEXT NOT NULL,
    message TEXT,
    action_url TEXT,
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notifications" 
    ON public.notifications FOR SELECT 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications" 
    ON public.notifications FOR UPDATE 
    USING (auth.uid() = user_id);

-- =============================================================================
-- 4. Studio-specific indexes
-- =============================================================================

-- Index for faster studio expiration checks
CREATE INDEX IF NOT EXISTS idx_profiles_studio_expires_at 
ON public.profiles(studio_expires_at) 
WHERE studio_enabled = true;

-- Index for role-based queries
CREATE INDEX IF NOT EXISTS idx_profiles_role 
ON public.profiles(role);

-- =============================================================================
-- 5. Helper Functions
-- =============================================================================

-- Function to check if user has active studio access
CREATE OR REPLACE FUNCTION public.has_studio_access(user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    profile_record RECORD;
BEGIN
    SELECT role, studio_enabled, studio_expires_at INTO profile_record
    FROM public.profiles
    WHERE id = user_id;
    
    -- Admin and instructors always have access
    IF profile_record.role IN ('admin', 'instructor') THEN
        RETURN TRUE;
    END IF;
    
    -- Check if studio is enabled for students
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

-- =============================================================================
-- 6. Auto-create profile trigger
-- =============================================================================

-- Function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, role, display_name, created_at, updated_at)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'role', 'student'),
        COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.email),
        NOW(),
        NOW()
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to auto-create profile on signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =============================================================================
-- 7. Comments for documentation
-- =============================================================================

COMMENT ON COLUMN public.profiles.studio_expires_at IS 'AI Studio利用期限（NULLの場合は無期限）';
COMMENT ON COLUMN public.profiles.studio_enabled IS 'AI Studioが有効かどうか';
COMMENT ON TABLE public.profiles IS 'ユーザープロファイル情報（認証ユーザーの拡張）';
COMMENT ON TABLE public.audit_logs IS '管理者アクションの監査ログ';

-- =============================================================================
-- Setup Complete!
-- =============================================================================
