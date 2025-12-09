import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const courseId = searchParams.get("courseId");

    if (!courseId) return NextResponse.json({ error: "Missing courseId" }, { status: 400 });

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (user) {
        // Enroll user
        await supabase
            .from("course_enrollments")
            .insert({
                course_id: courseId,
                student_id: user.id,
                status: "active",
                amount_paid: 9900, // Mock amount
                currency_paid: "USD",
                payment_intent_id: "mock_pi_12345"
            });
    }

    redirect(`/courses/${courseId}`);
}
