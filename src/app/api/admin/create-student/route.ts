import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { requirePermission } from "@/lib/rbac";
import { z } from "zod";

const createStudentSchema = z.object({
    email: z.string().email(),
    password: z.string().min(8),
    displayName: z.string().min(2),
    courseIds: z.array(z.string().uuid()).optional(),
    studioMonths: z.string().optional(),
});

export async function POST(request: NextRequest) {
    try {
        const user = await requirePermission("canManageAllStudents");

        const body = await request.json();
        const result = createStudentSchema.safeParse(body);

        if (!result.success) {
            return NextResponse.json(
                { success: false, error: result.error.flatten() },
                { status: 400 }
            );
        }

        const { email, password, displayName, courseIds, studioMonths } = result.data;

        const supabaseAdmin = createAdminClient();

        // 2. Create auth user
        const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
            email,
            password,
            email_confirm: true,
            user_metadata: { display_name: displayName, role: 'student' } // temporary metadata
        });

        if (authError) {
            console.error("Auth error details:", authError);
            let errorMessage = authError.message;
            if (errorMessage.toLowerCase().includes("invalid api key")) {
                errorMessage += " (Hint: Please check if SUPABASE_SERVICE_ROLE_KEY is correctly set in Vercel environment variables. It might be invalid or contain spaces.)";
            }
            return NextResponse.json({ success: false, error: errorMessage }, { status: 400 });
        }

        const userId = authData.user.id;

        // Calculate studio expiration date
        let studioEnabled = false;
        let studioExpiresAt: string | null = null;

        if (studioMonths && studioMonths !== "0") {
            studioEnabled = true;
            if (studioMonths !== "unlimited") {
                const months = parseInt(studioMonths, 10);
                const expDate = new Date();
                expDate.setMonth(expDate.getMonth() + months);
                studioExpiresAt = expDate.toISOString();
            }
        }

        // 3. Create profile
        const { error: profileError } = await supabaseAdmin
            .from('profiles')
            .upsert({
                id: userId,
                role: 'student',
                display_name: displayName,
                studio_enabled: studioEnabled,
                studio_expires_at: studioExpiresAt,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
            });

        if (profileError) {
            await supabaseAdmin.auth.admin.deleteUser(userId);
            return NextResponse.json({ success: false, error: "Failed to create profile: " + profileError.message }, { status: 500 });
        }

        // 4. Enroll in courses
        if (courseIds && courseIds.length > 0) {
            const enrollments = courseIds.map(courseId => ({
                course_id: courseId,
                student_id: userId,
                status: 'active',
            }));

            const { error: enrollError } = await supabaseAdmin
                .from('course_enrollments')
                .insert(enrollments);

            if (enrollError) {
                console.error("Enrollment error", enrollError);
            }
        }

        // 5. Audit Log
        try {
            await supabaseAdmin.from('audit_logs').insert({
                actor_id: user.id,
                action: 'create_student',
                target_type: 'user',
                target_id: userId,
                details: {
                    email,
                    displayName,
                    courseIds,
                    studioEnabled,
                    studioExpiresAt,
                },
                created_at: new Date().toISOString(),
            });
        } catch (auditError) {
            console.error("Audit log insert failed:", auditError);
        }

        return NextResponse.json({ success: true, data: { userId } });

    } catch (error: any) {
        console.error("Create user critical error:", error);
        if (error.message && error.message.includes('Unauthorized')) {
            return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
        }
        return NextResponse.json({ success: false, error: error.message || "Internal Server Error" }, { status: 500 });
    }
}
