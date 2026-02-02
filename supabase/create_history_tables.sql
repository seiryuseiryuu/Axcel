-- Run this in Supabase SQL Editor to create the history tables
-- Go to: https://supabase.com/dashboard/project/nciodrexukbsoxgsqokb/sql/new

-- 1. Create student_projects table
CREATE TABLE IF NOT EXISTS public.student_projects (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    student_id UUID NOT NULL,
    course_id UUID,
    title TEXT NOT NULL,
    type VARCHAR(20) CHECK (type IN ('seo_article', 'video_script', 'thumbnail', 'mixed')),
    status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'in_progress', 'completed', 'archived')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create generated_artifacts table
CREATE TABLE IF NOT EXISTS public.generated_artifacts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    project_id UUID REFERENCES public.student_projects(id) ON DELETE CASCADE,
    type VARCHAR(20) CHECK (type IN ('seo_article', 'video_script', 'image', 'thumbnail')),
    title TEXT NOT NULL,
    content JSONB NOT NULL,
    status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'final', 'archived')),
    version INTEGER DEFAULT 1,
    parent_version_id UUID REFERENCES public.generated_artifacts(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Enable RLS
ALTER TABLE public.student_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.generated_artifacts ENABLE ROW LEVEL SECURITY;

-- 4. Create RLS policies for student_projects
DROP POLICY IF EXISTS "Users can view their own projects" ON public.student_projects;
CREATE POLICY "Users can view their own projects" ON public.student_projects
    FOR SELECT USING (auth.uid() = student_id);

DROP POLICY IF EXISTS "Users can insert their own projects" ON public.student_projects;
CREATE POLICY "Users can insert their own projects" ON public.student_projects
    FOR INSERT WITH CHECK (auth.uid() = student_id);

DROP POLICY IF EXISTS "Users can update their own projects" ON public.student_projects;
CREATE POLICY "Users can update their own projects" ON public.student_projects
    FOR UPDATE USING (auth.uid() = student_id) WITH CHECK (auth.uid() = student_id);

DROP POLICY IF EXISTS "Users can delete their own projects" ON public.student_projects;
CREATE POLICY "Users can delete their own projects" ON public.student_projects
    FOR DELETE USING (auth.uid() = student_id);

-- 5. Create RLS policies for generated_artifacts
DROP POLICY IF EXISTS "Users can view their own artifacts" ON public.generated_artifacts;
CREATE POLICY "Users can view their own artifacts" ON public.generated_artifacts
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.student_projects
            WHERE student_projects.id = generated_artifacts.project_id
            AND student_projects.student_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Users can insert artifacts to their projects" ON public.generated_artifacts;
CREATE POLICY "Users can insert artifacts to their projects" ON public.generated_artifacts
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.student_projects
            WHERE student_projects.id = generated_artifacts.project_id
            AND student_projects.student_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Users can update their own artifacts" ON public.generated_artifacts;
CREATE POLICY "Users can update their own artifacts" ON public.generated_artifacts
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.student_projects
            WHERE student_projects.id = generated_artifacts.project_id
            AND student_projects.student_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Users can delete their own artifacts" ON public.generated_artifacts;
CREATE POLICY "Users can delete their own artifacts" ON public.generated_artifacts
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.student_projects
            WHERE student_projects.id = generated_artifacts.project_id
            AND student_projects.student_id = auth.uid()
        )
    );

-- Done! Tables and policies created.
