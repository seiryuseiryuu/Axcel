import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/rbac";
import { z } from "zod";

const createInstructorSchema = z.object({
    email: z.string().email(),
    password: z.string().min(8),
    displayName: z.string().min(2),
});

export async function POST(request: NextRequest) {
    try {
        // Only Admin can create instructors
        const user = await requireRole("admin");

        const body = await request.json();
        const result = createInstructorSchema.safeParse(body);

        if (!result.success) {
            return NextResponse.json(
                { success: false, error: result.error.flatten() },
                { status: 400 }
            );
        }

        const { email, password, displayName } = result.data;
        const supabaseAdmin = createAdminClient();

        // Create auth user
        const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
            email,
            password,
            email_confirm: true,
            user_metadata: { display_name: displayName, role: 'instructor' }
        });

        if (authError) {
            return NextResponse.json({ success: false, error: authError.message }, { status: 400 });
        }

        const userId = authData.user.id;

        // Create profile
        const { error: profileError } = await supabaseAdmin
            .from('profiles')
            .upsert({
                id: userId,
                role: 'instructor',
                display_name: displayName,
            });

        if (profileError) {
            await supabaseAdmin.auth.admin.deleteUser(userId);
            return NextResponse.json({ success: false, error: "Failed to create profile" }, { status: 500 });
        }

        // Audit Log
        await supabaseAdmin.from('audit_logs').insert({
            actor_id: user.id,
            action: 'create_instructor',
            target_type: 'user',
            target_id: userId,
            details: { email, displayName },
        });

        return NextResponse.json({ success: true, data: { userId } });

    } catch (error) {
        return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
}
