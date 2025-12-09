import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
    try {
        const { courseId } = await request.json();
        const supabase = await createClient();

        // 1. Get Course Price
        const { data: course } = await supabase
            .from("courses")
            .select("price, currency, title")
            .eq("id", courseId)
            .single();

        if (!course) return NextResponse.json({ error: "Course not found" }, { status: 404 });

        if (course.price === 0) {
            // Free course -> Enroll immediately
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

            const { error } = await supabase
                .from("course_enrollments")
                .insert({
                    course_id: courseId,
                    student_id: user.id,
                    status: "active"
                });

            if (error) throw error;

            return NextResponse.json({ success: true, url: `/courses/${courseId}` });
        }

        // 2. Stripe Mock
        // In real app: stripe.checkout.sessions.create(...)
        // Here we just return a success URL directly for demo, or a mock checkout page

        const mockCheckoutUrl = `/api/checkout/mock-success?courseId=${courseId}`;

        return NextResponse.json({ success: true, url: mockCheckoutUrl });

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
