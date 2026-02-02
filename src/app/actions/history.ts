"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

/**
 * Save a new creation to history.
 * Creates a project and an artifact.
 */
export async function saveCreation(
    title: string,
    type: 'video_script' | 'seo_article' | 'image' | 'thumbnail' | 'mixed' | 'eyecatch_prompt',
    content: any,
    path: string = "/admin/history"
) {
    console.log("[saveCreation] Called with:", { title, type, contentType: typeof content });

    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    console.log("[saveCreation] User check:", { userId: user?.id, authError: authError?.message });

    if (!user) {
        console.error("[saveCreation] No user - returning Unauthorized");
        return { success: false, error: "Unauthorized - ログインが必要です" };
    }

    // Map type for student_projects table
    // student_projects allows: 'seo_article', 'video_script', 'thumbnail', 'mixed'
    // generated_artifacts allows: 'seo_article', 'video_script', 'image', 'thumbnail'
    let projectType: 'seo_article' | 'video_script' | 'thumbnail' | 'mixed';
    if (type === 'image' || type === 'eyecatch_prompt') {
        projectType = 'thumbnail';
    } else if (type === 'mixed') {
        projectType = 'mixed';
    } else {
        projectType = type;
    }

    // 1. Create Project
    const { data: project, error: projError } = await supabase
        .from('student_projects')
        .insert({
            student_id: user.id,
            title: title || 'Untitled Creation',
            type: projectType,
            status: 'completed'
        })
        .select()
        .single();

    if (projError) {
        console.error("Project creation error:", projError);
        return { success: false, error: `Failed to create project record: ${projError.message}` };
    }

    // 2. Create Artifact
    // Map 'mixed' or specific types to artifact types allowed in DB ('seo_article', 'video_script', 'image', 'thumbnail')
    // If user passes a type not in constraint, we might default to 'mixed' or need to check constraint.
    // Schema constraint: type IN ('seo_article', 'video_script', 'image', 'thumbnail')
    // NOTE: If 'mixed' is passed for project, artifact might need to be specific.
    // For now, let's allow 'video_script' etc directly.
    // If type is 'mixed' (e.g. Line banner?), we might map it to 'image'.

    let artifactType = type;
    if (type === 'mixed' || type === 'eyecatch_prompt') artifactType = 'image'; // Map to image for DB constraint
    // Let's rely on DB constraint. If DB accepts 'mixed' for project but not artifact, we adjust.
    // Project types: 'seo_article', 'video_script', 'thumbnail', 'mixed'
    // Artifact types: 'seo_article', 'video_script', 'image', 'thumbnail'

    const { error: artError } = await supabase
        .from('generated_artifacts')
        .insert({
            project_id: project.id,
            title: title || 'Artifact',
            type: artifactType,
            content: content, // JSONB
            status: 'final',
            version: 1
        });

    if (artError) {
        console.error("Artifact creation error:", artError);
        return { success: false, error: "Failed to save artifact content" };
    }

    // Revalidate BOTH admin and student history paths
    revalidatePath("/admin/history");
    revalidatePath("/student/history");

    return { success: true, projectId: project.id };
}

/**
 * Fetch creation history for the current user.
 */
export async function fetchHistory() {
    const supabase = await createClient();

    // Join projects with artifacts
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Unauthorized" };

    // Join projects with artifacts, filtering by student_id
    const { data, error } = await supabase
        .from('student_projects')
        .select(`
            *,
            generated_artifacts (
                id,
                title,
                type,
                content,
                created_at
            )
        `)
        .eq('student_id', user.id) // Strict filter
        .order('created_at', { ascending: false });

    if (error) {
        return { success: false, error: error.message };
    }

    return { success: true, data };
}
