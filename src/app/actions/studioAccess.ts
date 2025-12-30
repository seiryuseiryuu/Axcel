"use server";

import { createClient } from "@/lib/supabase/server";

export interface StudioAccessResult {
    hasAccess: boolean;
    expiresAt: Date | null;
    daysRemaining: number | null;
    isExpired: boolean;
    message?: string;
    role?: string;
}

/**
 * Check if the current user has access to AI Studio
 */
export async function checkStudioAccess(): Promise<StudioAccessResult> {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return {
            hasAccess: false,
            expiresAt: null,
            daysRemaining: null,
            isExpired: false,
            message: "ログインが必要です",
            role: "guest",
        };
    }

    // Get profile with studio access info
    const { data: profile, error } = await supabase
        .from("profiles")
        .select("role, studio_enabled, studio_expires_at")
        .eq("id", user.id)
        .single();

    if (error || !profile) {
        return {
            hasAccess: false,
            expiresAt: null,
            daysRemaining: null,
            isExpired: false,
            message: "プロファイルが見つかりません",
            role: "unknown",
        };
    }

    // Admin always has access
    if (profile.role === "admin" || profile.role === "instructor") {
        return {
            hasAccess: true,
            expiresAt: null,
            daysRemaining: null,
            isExpired: false,
            role: profile.role,
        };
    }

    // Check if studio is enabled for this user
    if (!profile.studio_enabled) {
        return {
            hasAccess: false,
            expiresAt: null,
            daysRemaining: null,
            isExpired: false,
            message: "AI Studioへのアクセス権がありません",
            role: profile.role,
        };
    }

    // Check expiration
    const expiresAt = profile.studio_expires_at
        ? new Date(profile.studio_expires_at)
        : null;

    if (expiresAt) {
        const now = new Date();
        const isExpired = expiresAt < now;
        const daysRemaining = isExpired
            ? 0
            : Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

        if (isExpired) {
            return {
                hasAccess: false,
                expiresAt,
                daysRemaining: 0,
                isExpired: true,
                message: "AI Studioの利用期限が切れています",
                role: profile.role,
            };
        }

        return {
            hasAccess: true,
            expiresAt,
            daysRemaining,
            isExpired: false,
        };
    }

    // No expiration set = unlimited access
    return {
        hasAccess: true,
        expiresAt: null,
        daysRemaining: null,
        isExpired: false,
        role: profile.role,
    };
}

/**
 * Set studio access for a user (Admin function)
 */
export async function setStudioAccess(
    userId: string,
    months: number | null // null = unlimited
): Promise<{ success: boolean; error?: string }> {
    const supabase = await createClient();

    // Verify current user is admin
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        return { success: false, error: "認証が必要です" };
    }

    const { data: adminProfile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

    if (!adminProfile || adminProfile.role !== "admin") {
        return { success: false, error: "管理者権限が必要です" };
    }

    // Calculate expiration date
    let expiresAt: string | null = null;
    if (months !== null && months > 0) {
        const expDate = new Date();
        expDate.setMonth(expDate.getMonth() + months);
        expiresAt = expDate.toISOString();
    }

    // Update profile
    const { error } = await supabase
        .from("profiles")
        .update({
            studio_enabled: true,
            studio_expires_at: expiresAt,
        })
        .eq("id", userId);

    if (error) {
        return { success: false, error: error.message };
    }

    return { success: true };
}

/**
 * Disable studio access for a user (Admin function)
 */
export async function disableStudioAccess(userId: string): Promise<{ success: boolean; error?: string }> {
    const supabase = await createClient();

    const { error } = await supabase
        .from("profiles")
        .update({
            studio_enabled: false,
        })
        .eq("id", userId);

    if (error) {
        return { success: false, error: error.message };
    }

    return { success: true };
}
