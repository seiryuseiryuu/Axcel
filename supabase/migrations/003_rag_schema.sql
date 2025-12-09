-- Enable pgvector if available
CREATE EXTENSION IF NOT EXISTS vector;

-- =============================================================================
-- 8. RAG & Knowledge Base
-- =============================================================================

CREATE TABLE public.transcripts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    content_id UUID REFERENCES public.contents(id) ON DELETE CASCADE,
    source VARCHAR(20) CHECK (source IN ('upload', 'external')),
    language VARCHAR(10) DEFAULT 'ja',
    raw_text TEXT NOT NULL,
    processed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.transcripts ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.transcript_chunks (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    transcript_id UUID REFERENCES public.transcripts(id) ON DELETE CASCADE,
    chunk_index INTEGER NOT NULL,
    text TEXT NOT NULL,
    embedding VECTOR(1536), -- Standard OpenAI embedding size
    metadata JSONB DEFAULT '{}', -- { start_time, end_time, speaker }
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for vector search
CREATE INDEX ON public.transcript_chunks USING ivfflat (embedding vector_cosine_ops)
    WITH (lists = 100);

ALTER TABLE public.transcript_chunks ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.knowledge_sources (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE,
    type VARCHAR(20) CHECK (type IN ('transcript', 'text_content', 'task_doc', 'instructor_note')),
    ref_id UUID NOT NULL,
    title TEXT,
    is_indexed BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.knowledge_sources ENABLE ROW LEVEL SECURITY;
