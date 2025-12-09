// ===========================
// Database Types
// ===========================

import type { UserRole } from '@/lib/auth/roles';

// Core entities
export interface Profile {
    id: string;
    user_id: string;
    role: UserRole;
    display_name: string;
    avatar_url: string | null;
    bio: string | null;
    created_at: string;
    updated_at: string;
}

export interface Course {
    id: string;
    instructor_id: string;
    title: string;
    description: string | null;
    thumbnail_url: string | null;
    status: 'draft' | 'published' | 'archived';
    created_at: string;
    updated_at: string;
}

export interface CourseEnrollment {
    id: string;
    course_id: string;
    student_id: string;
    status: 'active' | 'paused' | 'completed' | 'expired';
    started_at: string;
    expires_at: string | null;
    created_at: string;
    updated_at: string;
}

export interface Theme {
    id: string;
    course_id: string;
    name: string;
    colors: {
        primary: string;
        secondary: string;
        accent: string;
        background: string;
        text: string;
    };
    is_active: boolean;
    created_at: string;
}

export interface CurriculumTemplate {
    id: string;
    course_id: string;
    title: string;
    description: string | null;
    goals: {
        title: string;
        target_value: number;
        unit: string;
    }[];
    structure: {
        week: number;
        tasks: string[];
    }[];
    estimated_days: number;
    created_at: string;
    updated_at: string;
}

export interface Content {
    id: string;
    course_id: string;
    type: 'video' | 'text' | 'quiz';
    title: string;
    description: string | null;
    video_url: string | null;
    text_content: string | null;
    duration_minutes: number | null;
    order_index: number;
    is_published: boolean;
    created_at: string;
    updated_at: string;
}

export interface Task {
    id: string;
    curriculum_id: string;
    title: string;
    description: string | null;
    type: 'video' | 'reading' | 'exercise' | 'project';
    content_id: string | null;
    estimated_minutes: number;
    order_index: number;
    created_at: string;
}

export interface DailyPlan {
    id: string;
    enrollment_id: string;
    date: string;
    tasks: {
        task_id: string;
        title: string;
        type: string;
        estimated_minutes: number;
        completed: boolean;
    }[];
    status: 'pending' | 'in_progress' | 'completed';
    notes: string | null;
    created_at: string;
    updated_at: string;
}

export interface ProgressLog {
    id: string;
    enrollment_id: string;
    content_id: string | null;
    task_id: string | null;
    progress_percent: number;
    time_spent_minutes: number;
    completed_at: string | null;
    created_at: string;
}

export interface Notification {
    id: string;
    user_id: string;
    type: 'info' | 'warning' | 'success' | 'error' | 'risk_alert';
    title: string;
    message: string;
    action_url: string | null;
    read_at: string | null;
    created_at: string;
}

export interface AuditLog {
    id: string;
    actor_id: string;
    action: string;
    target_type: string;
    target_id: string | null;
    details: Record<string, unknown>;
    ip_address: string | null;
    user_agent: string | null;
    created_at: string;
}

// AI/Studio entities
export interface AIProvider {
    id: string;
    name: string;
    type: 'llm' | 'image' | 'embedding';
    config: Record<string, unknown>;
    is_active: boolean;
    created_at: string;
}

export interface AIModel {
    id: string;
    provider_id: string;
    model_key: string;
    purpose: 'chat' | 'completion' | 'embedding' | 'image';
    config: Record<string, unknown>;
    is_default: boolean;
    created_at: string;
}

export interface PromptTemplate {
    id: string;
    scope: 'system' | 'course' | 'tool';
    tool_type: 'seo_article' | 'video_script' | 'article_image' | 'thumbnail' | 'chat';
    course_id: string | null;
    version: number;
    name: string;
    template: string;
    variables: string[];
    is_active: boolean;
    created_at: string;
    updated_at: string;
}

export interface StudentProject {
    id: string;
    student_id: string;
    course_id: string;
    title: string;
    type: 'seo_article' | 'video_script' | 'thumbnail' | 'mixed';
    status: 'draft' | 'in_progress' | 'completed' | 'archived';
    created_at: string;
    updated_at: string;
}

export interface GeneratedArtifact {
    id: string;
    project_id: string;
    type: 'seo_article' | 'video_script' | 'image' | 'thumbnail';
    title: string;
    content: Record<string, unknown>;
    status: 'draft' | 'final' | 'archived';
    version: number;
    parent_version_id: string | null;
    created_at: string;
    updated_at: string;
}

export interface AssetFile {
    id: string;
    artifact_id: string;
    bucket: string;
    path: string;
    mime_type: string;
    size_bytes: number;
    meta: Record<string, unknown>;
    created_at: string;
}

// RAG entities
export interface Transcript {
    id: string;
    content_id: string;
    source: 'upload' | 'external';
    language: string;
    raw_text: string;
    processed_at: string | null;
    created_at: string;
}

export interface TranscriptChunk {
    id: string;
    transcript_id: string;
    chunk_index: number;
    text: string;
    embedding: number[] | null;
    metadata: {
        start_time?: number;
        end_time?: number;
        chapter?: string;
        speaker?: string;
    };
    created_at: string;
}

export interface KnowledgeSource {
    id: string;
    course_id: string;
    type: 'transcript' | 'text_content' | 'task_doc' | 'instructor_note';
    ref_id: string;
    title: string;
    is_indexed: boolean;
    created_at: string;
}

// API types
export interface ApiResponse<T> {
    success: boolean;
    data?: T;
    error?: {
        code: string;
        message: string;
    };
}

export interface PaginatedResponse<T> {
    items: T[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
}
