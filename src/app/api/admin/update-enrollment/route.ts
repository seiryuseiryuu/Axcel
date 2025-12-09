import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { requirePermission } from "@/lib/rbac";
import { z } from "zod";

const updateEnrollmentSchema = z.object({
    enrollmentId: z.string().uuid(),
    status: z.enum(['active', 'paused', 'completed', 'expired']),
    expiresAt: z.string().optional().nullable(),
});

export async function PATCH(request: NextRequest) {
    try {
        const user = await requirePermission("canManageCourses");

        // Instructor can manage enrollment for their own courses.
        const body = await request.json();
        const result = updateEnrollmentSchema.safeParse(body);

        if (!result.success) {
            return NextResponse.json({ success: false, error: result.error.flatten() }, { status: 400 });
        }

        const { enrollmentId, status, expiresAt } = result.data;
        const supabaseAdmin = createAdminClient();

        if (user.role === 'instructor') {
            // Verify enrollment belongs to instructor's course
            const { data: enrollment } = await supabaseAdmin
                .from('course_enrollments')
                .select('course_id, courses(instructor_id)')
                .eq('id', enrollmentId)
                .single();

            // @ts-ignore
            const instructorId = enrollment?.courses?.instructor_id;

            if (instructorId !== user.id) {
                return NextResponse.json({ error: "Unauthorized for this enrollment" }, { status: 403 });
            }
        }

        // Update
        const { error: updateError } = await supabaseAdmin
            .from('course_enrollments')
            .update({
                status,
                expires_at: expiresAt,
                updated_at: new Date().toISOString()
            })
            .eq('id', enrollmentId);

        if (updateError) {
            return NextResponse.json({ success: false, error: updateError.message }, { status: 500 });
        }

        // Audit Log
        await supabaseAdmin.from('audit_logs').insert({
            actor_id: user.id,
            action: 'update_enrollment',
            target_type: 'enrollment',
            target_id: enrollmentId,
            details: { status, expiresAt },
        });

        return NextResponse.json({ success: true });

    } catch (error) {
        return NextResponse.json({ success: false, error: "Internal Error" }, { status: 500 });
    }
}
