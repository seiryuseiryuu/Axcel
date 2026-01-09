"use server";

import { createAdminClient, createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export interface CreateUserResult {
    success: boolean;
    error?: string;
    userId?: string;
}

/**
 * Update a user's AI Studio access expiration (Admin only)
 */
export async function updateUserAccess(userId: string, months: number | null): Promise<{ success: boolean; error?: string }> {
    const supabase = await createClient();

    // Verify current user is admin
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "認証が必要です" };

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

    // Update target user's profile
    // Note: studio_enabled should be true if setting a date, or if months is null (unlimited)
    // If months is 0, we might want to disable it, but for now let's assume this action is for enabling/updating.
    // To disable, we'd probably use a different logic or pass -1.
    // Let's assume > 0 or null means ENABLE.

    // Use Admin Client to bypass RLS when updating other user's profile
    const adminClient = createAdminClient();
    const { error } = await adminClient
        .from("profiles")
        .update({
            studio_enabled: true,
            studio_expires_at: expiresAt,
        })
        .eq("id", userId);

    if (error) return { success: false, error: error.message };

    revalidatePath("/admin/users");
    revalidatePath("/admin/students");
    return { success: true };
}

/**
 * Update a user's AI Studio access with a specific date (Admin only)
 * @param userId - Target user ID
 * @param expirationDate - ISO date string or null for unlimited
 */
export async function updateUserAccessByDate(userId: string, expirationDate: string | null): Promise<{ success: boolean; error?: string }> {
    const supabase = await createClient();

    // Verify current user is admin
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "認証が必要です" };

    const { data: adminProfile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

    if (!adminProfile || adminProfile.role !== "admin") {
        return { success: false, error: "管理者権限が必要です" };
    }

    // Use Admin Client to bypass RLS when updating other user's profile
    const adminClient = createAdminClient();
    const { error } = await adminClient
        .from("profiles")
        .update({
            studio_enabled: true,
            studio_expires_at: expirationDate,
        })
        .eq("id", userId);

    if (error) return { success: false, error: error.message };

    revalidatePath("/admin/users");
    revalidatePath("/admin/students");
    return { success: true };
}

/**
 * Create a new user (student) with specified studio access duration (Admin only)
 */
export async function createUser(formData: FormData): Promise<CreateUserResult> {
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;
    const displayName = formData.get("displayName") as string || email.split("@")[0];

    // Duration handling - supports preset, custom days, and specific date
    const durationType = formData.get("durationType") as string || "preset";
    const durationStr = formData.get("duration") as string; // "1", "3", "6", "unlimited"
    const customDaysStr = formData.get("customDaysValue") as string;
    const customDateStr = formData.get("customDateValue") as string;

    if (!email || !password) {
        return { success: false, error: "メールアドレスとパスワードは必須です" };
    }

    const supabase = await createClient();

    // Verify current user is admin
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    if (!currentUser) return { success: false, error: "認証が必要です" };

    const { data: adminProfile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", currentUser.id)
        .single();

    if (!adminProfile || adminProfile.role !== "admin") {
        return { success: false, error: "管理者権限が必要です" };
    }

    // Use Admin Client to create user (bypasses email confirmation if configured)
    const adminClient = createAdminClient();

    // 1. Create User in Auth
    const { data: { user: newUser }, error: createError } = await adminClient.auth.admin.createUser({
        email,
        password,
        email_confirm: true, // Auto confirm
        user_metadata: {
            display_name: displayName,
        }
    });

    if (createError || !newUser) {
        console.error("User creation error:", createError);
        let errorMessage = createError?.message || "Unknown error";
        if (errorMessage.toLowerCase().includes("invalid api key")) {
            errorMessage += " (Hint: Please check if SUPABASE_SERVICE_ROLE_KEY is correctly set in Vercel environment variables. It might be invalid or contain spaces.)";
        }
        return { success: false, error: `ユーザー作成エラー: ${errorMessage}` };
    }

    // 2. Calculate expiration based on duration type
    let expiresAt: string | null = null;

    if (durationType === "preset") {
        if (durationStr !== "unlimited") {
            const months = parseInt(durationStr) || 3;
            const expDate = new Date();
            expDate.setMonth(expDate.getMonth() + months);
            expiresAt = expDate.toISOString();
        }
    } else if (durationType === "custom") {
        const days = parseInt(customDaysStr) || 30;
        const expDate = new Date();
        expDate.setDate(expDate.getDate() + days);
        expiresAt = expDate.toISOString();
    } else if (durationType === "date" && customDateStr) {
        expiresAt = new Date(customDateStr).toISOString();
    }

    // We need to wait for trigger-created profile OR create it if it doesn't exist.
    // Ideally we just upsert.
    const { error: profileError } = await adminClient
        .from("profiles")
        .upsert({
            id: newUser.id,
            // email: email, // REMOVED: profiles table does not have email column
            role: "student",
            display_name: displayName,
            studio_enabled: true,
            studio_expires_at: expiresAt,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
        });

    if (profileError) {
        // If profile creation fails, we might want to delete the auth user to keep state clean?
        // But for now return error.
        return { success: false, error: `プロファイル設定エラー: ${profileError.message}` };
    }

    revalidatePath("/admin/students");
    return { success: true, userId: newUser.id };
}

/**
 * Fetch all users for management UI (Admin only)
 */
export async function getUsers() {
    const supabase = await createClient();

    // Verify current user is admin
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Unauthorized");

    const { data: adminProfile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

    if (!adminProfile || adminProfile.role !== "admin") {
        throw new Error("Forbidden");
    }

    // Fetch profiles
    const { data: profiles, error } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });

    if (error) throw new Error(error.message);

    return profiles;
}

/**
 * Disable/Revoke a user's AI Studio access (Admin only)
 */
export async function disableUserAccess(userId: string): Promise<{ success: boolean; error?: string }> {
    const supabase = await createClient();

    // Verify current user is admin
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "認証が必要です" };

    const { data: adminProfile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

    if (!adminProfile || adminProfile.role !== "admin") {
        return { success: false, error: "管理者権限が必要です" };
    }

    // Use Admin Client to bypass RLS when updating other user's profile
    const adminClient = createAdminClient();
    const { error } = await adminClient
        .from("profiles")
        .update({
            studio_enabled: false,
            studio_expires_at: null,
        })
        .eq("id", userId);

    if (error) return { success: false, error: error.message };

    revalidatePath("/admin/users");
    revalidatePath("/admin/students");
    return { success: true };
}

/**
 * Delete a user account (Admin only)
 */
export async function deleteUser(userId: string): Promise<{ success: boolean; error?: string }> {
    const supabase = await createClient();

    // Verify current user is admin
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "認証が必要です" };

    const { data: adminProfile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

    if (!adminProfile || adminProfile.role !== "admin") {
        return { success: false, error: "管理者権限が必要です" };
    }

    // Use Admin Client to delete user from Auth (cascades to profiles)
    const adminClient = createAdminClient();
    const { error } = await adminClient.auth.admin.deleteUser(userId);

    if (error) return { success: false, error: error.message };

    revalidatePath("/admin/users");
    revalidatePath("/admin/students");
    return { success: true };
}
