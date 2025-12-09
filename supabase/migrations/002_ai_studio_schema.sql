-- =============================================================================
-- 6. AI & Studio Framework
-- =============================================================================

CREATE TABLE public.ai_providers (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL,
    type VARCHAR(20) NOT NULL CHECK (type IN ('llm', 'image', 'embedding')),
    config JSONB DEFAULT '{}', -- Encrypted keys or references
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.ai_providers ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.ai_models (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    provider_id UUID REFERENCES public.ai_providers(id) ON DELETE CASCADE,
    model_key TEXT NOT NULL, -- e.g. "gpt-4", "gemini-pro"
    purpose VARCHAR(20) CHECK (purpose IN ('chat', 'completion', 'embedding', 'image')),
    config JSONB DEFAULT '{}',
    is_default BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.ai_models ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.prompt_templates (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    scope VARCHAR(20) CHECK (scope IN ('system', 'course', 'tool')),
    tool_type VARCHAR(20) CHECK (tool_type IN ('seo_article', 'video_script', 'article_image', 'thumbnail', 'chat')),
    course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE, -- Nullable if system scope
    version INTEGER DEFAULT 1,
    name TEXT NOT NULL,
    template TEXT NOT NULL,
    variables JSONB DEFAULT '[]', -- ["topic", "tone"]
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.prompt_templates ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- 7. Student Projects & Artifacts
-- =============================================================================

CREATE TABLE public.student_projects (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    student_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    type VARCHAR(20) CHECK (type IN ('seo_article', 'video_script', 'thumbnail', 'mixed')),
    status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'in_progress', 'completed', 'archived')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.student_projects ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.generated_artifacts (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    project_id UUID REFERENCES public.student_projects(id) ON DELETE CASCADE,
    type VARCHAR(20) CHECK (type IN ('seo_article', 'video_script', 'image', 'thumbnail')),
    title TEXT NOT NULL,
    content JSONB NOT NULL, -- Structure depends on type
    status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'final', 'archived')),
    version INTEGER DEFAULT 1,
    parent_version_id UUID REFERENCES public.generated_artifacts(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.generated_artifacts ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.asset_files (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    artifact_id UUID REFERENCES public.generated_artifacts(id) ON DELETE CASCADE,
    bucket TEXT NOT NULL,
    path TEXT NOT NULL,
    mime_type TEXT NOT NULL,
    size_bytes BIGINT,
    meta JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.asset_files ENABLE ROW LEVEL SECURITY;
