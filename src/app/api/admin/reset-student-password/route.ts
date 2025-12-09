import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { requirePermission } from "@/lib/rbac";
import { z } from "zod";

const resetPasswordSchema = z.object({
    studentId: z.string().uuid(),
    newPassword: z.string().min(8),
});

export async function POST(request: NextRequest) {
    try {
        // Instructor can reset password for their students?
        // Spec says "instructor: password reset". 
        // Yes, for their own students.
        // We need to verify if the student belongs to the instructor's course if the user is instructor.
        // If Admin, allowed.
        const user = await requirePermission("canAccessAdminPanel"); // Base check

        // Detailed check
        if (user.role === 'student') return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

        const body = await request.json();
        const result = resetPasswordSchema.safeParse(body);

        if (!result.success) {
            return NextResponse.json({ success: false, error: result.error.flatten() }, { status: 400 });
        }

        const { studentId, newPassword } = result.data;
        const supabaseAdmin = createAdminClient();

        if (user.role === 'instructor') {
            // Check if studentId is enrolled in any of instructor's courses
            // This logic is complex efficiently.
            // 1. Get courses owned by instructor
            const { data: courses } = await supabaseAdmin
                .from('courses')
                .select('id')
                .eq('instructor_id', user.id);

            const courseIds = courses?.map(c => c.id) || [];

            if (courseIds.length === 0) {
                return NextResponse.json({ error: "No courses found for instructor" }, { status: 403 });
            }

            // 2. Check enrollment
            const { data: enrollment } = await supabaseAdmin
                .from('course_enrollments')
                .select('id')
                .eq('student_id', studentId)
                .in('course_id', courseIds)
                .single();

            if (!enrollment) {
                return NextResponse.json({ error: "Student not enrolled in your courses" }, { status: 403 });
            }
        }

        // Reset password
        const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
            studentId,
            { password: newPassword }
        );

        if (updateError) {
            return NextResponse.json({ success: false, error: updateError.message }, { status: 500 });
        }

        // Audit Log
        await supabaseAdmin.from('audit_logs').insert({
            actor_id: user.id,
            action: 'reset_password',
            target_type: 'user',
            target_id: studentId,
            details: { triggered_by_role: user.role },
        });

        return NextResponse.json({ success: true });

    } catch (error) {
        return NextResponse.json({ success: false, error: "Internal Error" }, { status: 500 });
    }
}
