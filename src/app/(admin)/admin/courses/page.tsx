import { createClient } from "@/lib/supabase/server";
import { CreateCourseSheet } from "@/components/features/admin/CreateCourseSheet";
import { requirePermission, requireAuth } from "@/lib/rbac";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { BookOpen, Users, Clock } from "lucide-react";

export default async function CoursesPage() {
    const user = await requirePermission("canManageCourses");
    const supabase = await createClient();

    // If Admin -> all courses? Or just create own? 
    // Requirements: "admin: ... audit ... uploaded content".
    // "instructor: own course management".
    // Admin can manage everything. 

    let query = supabase.from("courses").select("*, profiles!instructor_id(display_name)").order("created_at", { ascending: false });

    if (user.role === 'instructor') {
        query = query.eq("instructor_id", user.id);
    }

    const { data: courses } = await query;

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Courses</h1>
                    <p className="text-muted-foreground">
                        Manage your curriculum and content.
                    </p>
                </div>
                <CreateCourseSheet userId={user.id} />
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {courses?.length === 0 && (
                    <p className="text-muted-foreground col-span-3">No courses found. Create one to get started.</p>
                )}
                {courses?.map((course: any) => (
                    <Link href={`/admin/courses/${course.id}`} key={course.id}>
                        <Card className="hover:shadow-md transition-shadow cursor-pointer border-l-4 border-l-primary h-full">
                            <CardHeader className="pb-2">
                                <div className="flex justify-between items-start">
                                    <CardTitle className="text-xl line-clamp-1" title={course.title}>{course.title}</CardTitle>
                                    <Badge variant={course.status === 'published' ? 'default' : 'secondary'}>
                                        {course.status}
                                    </Badge>
                                </div>
                                <p className="text-sm text-muted-foreground">
                                    by {course.profiles?.display_name || 'Unknown'}
                                </p>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-gray-500 line-clamp-2 h-10 mb-4">
                                    {course.description || "No description provided."}
                                </p>
                                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                    <div className="flex items-center gap-1">
                                        <Users className="w-3 h-3" />
                                        <span>0 Students</span>
                                    </div>
                                    {/* Add more metrics later */}
                                </div>
                            </CardContent>
                        </Card>
                    </Link>
                ))}
            </div>
        </div>
    );
}
