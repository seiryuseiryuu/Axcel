import { createClient } from "@/lib/supabase/server";
import { CourseSidebar } from "@/components/features/student/CourseSidebar";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/rbac";
import { ChatWidget } from "@/components/features/student/ChatWidget";

export default async function CourseLayout({
    children,
    params,
}: {
    children: React.ReactNode;
    params: Promise<{ id: string }>;
}) {
    const { id } = await params;
    await requireRole("student");
    const supabase = await createClient();

    const { data: course } = await supabase
        .from("courses")
        .select("title")
        .eq("id", id)
        .single();

    if (!course) redirect("/dashboard");

    const { data: contents } = await supabase
        .from("contents")
        .select("*")
        .eq("course_id", id)
        .eq("is_published", true)
        .order("order_index", { ascending: true });

    const chapters = [
        {
            title: "Course Content",
            contents: contents?.map(c => ({
                id: c.id,
                title: c.title,
                type: c.type as any,
                isCompleted: false,
                isLocked: false
            })) || []
        }
    ];

    return (
        <div className="h-full">
            <div className="hidden h-full md:flex md:w-80 md:flex-col md:fixed md:inset-y-0 z-50">
                <CourseSidebar
                    courseId={id}
                    courseTitle={course.title}
                    chapters={chapters}
                />
            </div>
            <main className="md:pl-80 h-full pt-[80px] md:pt-0">
                {children}
            </main>
            <ChatWidget courseId={id} />
        </div>
    );
}
