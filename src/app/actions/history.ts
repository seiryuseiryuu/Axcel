"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

/**
 * Save a new creation to history.
 * Creates a project and an artifact.
 */
export async function saveCreation(
    title: string,
    type: 'video_script' | 'seo_article' | 'image' | 'thumbnail' | 'mixed' | 'eyecatch_prompt' | 'lp_writing',
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
    } else if (type === 'lp_writing') {
        projectType = 'seo_article';
    } else if (type === 'mixed') {
        projectType = 'mixed';
    } else {
        // Safe cast as we've handled the non-matching types
        projectType = type as 'seo_article' | 'video_script' | 'thumbnail' | 'mixed';
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
    // If type is 'lp_writing', map to 'seo_article' (text content).

    let artifactType = type;
    if (type === 'mixed' || type === 'eyecatch_prompt') artifactType = 'image';
    if (type === 'lp_writing') artifactType = 'seo_article';
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

/**
 * Update an existing artifact's content.
 */
export async function updateArtifactContent(artifactId: string, newContent: any) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Unauthorized" };

    // Ownership check via project join
    const { data: artifact } = await supabase
        .from('generated_artifacts')
        .select('id, project_id, student_projects!inner(student_id)')
        .eq('id', artifactId)
        .single();

    if (!artifact || (artifact as any).student_projects?.student_id !== user.id) {
        return { success: false, error: "Not found or not authorized" };
    }

    const { error } = await supabase
        .from('generated_artifacts')
        .update({ content: newContent })
        .eq('id', artifactId);

    if (error) {
        console.error("[updateArtifactContent] Error:", error);
        return { success: false, error: error.message };
    }

    revalidatePath("/admin/history");
    revalidatePath("/student/history");
    return { success: true };
}

/**
 * Delete a project and its related artifacts (CASCADE).
 */
export async function deleteProject(projectId: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Unauthorized" };

    // Ownership check
    const { data: project } = await supabase
        .from('student_projects')
        .select('id, student_id')
        .eq('id', projectId)
        .single();

    if (!project || project.student_id !== user.id) {
        return { success: false, error: "Not found or not authorized" };
    }

    // Delete artifacts first, then project
    await supabase
        .from('generated_artifacts')
        .delete()
        .eq('project_id', projectId);

    const { error } = await supabase
        .from('student_projects')
        .delete()
        .eq('id', projectId);

    if (error) {
        console.error("[deleteProject] Error:", error);
        return { success: false, error: error.message };
    }

    revalidatePath("/admin/history");
    revalidatePath("/student/history");
    return { success: true };
}
