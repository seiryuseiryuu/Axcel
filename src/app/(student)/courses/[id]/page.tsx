import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { BuyButton } from "@/components/features/student/BuyButton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function CourseOverviewPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    // Check enrollment
    let isEnrolled = false;
    if (user) {
        const { data: enrollment } = await supabase
            .from("course_enrollments")
            .select("id")
            .eq("course_id", id)
            .eq("student_id", user.id)
            .eq("status", "active")
            .single();
        if (enrollment) isEnrolled = true;
    }

    // Get Course Details
    const { data: course } = await supabase
        .from("courses")
        .select("*, profiles(display_name, avatar_url)")
        .eq("id", id)
        .single();

    if (!course) return <div>Course not found</div>;

    // If enrolled, redirect to first content
    if (isEnrolled) {
        const { data: firstContent } = await supabase
            .from("contents")
            .select("id")
            .eq("course_id", id)
            .eq("is_published", true)
            .order("order_index", { ascending: true })
            .limit(1)
            .single();

        if (firstContent) {
            redirect(`/courses/${id}/learn/${firstContent.id}`);
        }
    }

    // Sales Page
    return (
        <div className="max-w-4xl mx-auto p-8 space-y-8">
            <div className="text-center space-y-4">
                <h1 className="text-4xl font-bold">{course.title}</h1>
                <p className="text-xl text-muted-foreground">{course.description}</p>
                <div className="flex items-center justify-center gap-2 mt-4">
                    <span>Instructor: {course.profiles?.display_name}</span>
                </div>
            </div>

            <Card className="w-full md:w-[400px] mx-auto">
                <CardHeader>
                    <CardTitle className="text-center">Enroll Now</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex justify-center mb-6">
                        {course.thumbnail_url && (
                            <img src={course.thumbnail_url} alt="" className="rounded-md" />
                        )}
                    </div>
                    <BuyButton courseId={course.id} price={course.price || 0} currency={course.currency || 'USD'} />
                </CardContent>
            </Card>

            <div className="prose dark:prose-invert mx-auto">
                <h3>Curriculum</h3>
                <p>Login and enroll to view the full content...</p>
            </div>
        </div>
    )
}
