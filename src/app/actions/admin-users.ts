"use server";

import { createClient } from "@supabase/supabase-js";
import { UserRole } from "@/lib/auth/roles";
import { revalidatePath } from "next/cache";

// Create a Supabase client with the SERVICE ROLE key
// This is strictly for server-side admin operations
const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
        auth: {
            autoRefreshToken: false,
            persistSession: false,
        },
    }
);

export async function createUser(data: {
    email: string;
    role: UserRole;
    displayName: string;
}) {
    // 1. Create the user in Supabase Auth
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email: data.email,
        email_confirm: true, // Confirm immediately so they can login? Or send invite? 
        // If we want to simple flow: 
        // Admin sets a temp password? Or Admin sends invite?
        // inviteUserByEmail is better for "Invite" flow.
    });

    if (authError) {
        // If "Invite", we use inviteUserByEmail
        const { data: inviteData, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(data.email);
        if (inviteError) {
            return { error: inviteError.message };
        }
        // User created (invited). But we need to set role.
        // Wait, if invited, user.id exists.
        const userId = inviteData.user.id;

        // 2. Set the role in public.profiles
        // Note: The trigger might have run if 'insert' happened on auth.users?
        // But inviteUserByEmail creates user in auth.users too.
        // We should UPSERT the profile to be sure we set the correct role.
        const { error: profileError } = await supabaseAdmin
            .from('profiles')
            .upsert({
                id: userId,
                role: data.role,
                display_name: data.displayName,
            });

        if (profileError) return { error: profileError.message };

        revalidatePath('/admin/students');
        revalidatePath('/admin/instructors');
        return { success: true };
    }

    // If createUser (not invite) succeeded:
    const userId = authData.user.id;

    // 2. Set Role
    const { error: profileError } = await supabaseAdmin
        .from('profiles')
        .upsert({
            id: userId,
            role: data.role,
            display_name: data.displayName,
        });

    if (profileError) return { error: profileError.message };

    revalidatePath('/admin/students');
    revalidatePath('/admin/instructors');
    return { success: true };
}
