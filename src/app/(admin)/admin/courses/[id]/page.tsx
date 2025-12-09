import { createClient } from "@/lib/supabase/server";
import { requirePermission } from "@/lib/rbac";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Save } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

// We'll create a client component for the form logic to avoid "use client" on the whole page
// But for simplicity/speed, let's make this page "server" fetching and passing data to "client" form.

export default async function CourseDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    await requirePermission("canManageCourses");
    const supabase = await createClient();

    const { data: course, error } = await supabase
        .from("courses")
        .select("*")
        .eq("id", id)
        .single();

    if (error || !course) {
        redirect("/admin/courses");
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <Link href="/admin/courses">
                    <Button variant="ghost" size="icon">
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                </Link>
                <div className="flex-1">
                    <h1 className="text-2xl font-bold tracking-tight">{course.title}</h1>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Badge variant="outline">{course.status}</Badge>
                        <span>ID: {course.id}</span>
                    </div>
                </div>
                <Button>
                    <Save className="mr-2 h-4 w-4" />
                    Save Changes
                </Button>
            </div>

            <Tabs defaultValue="overview" className="w-full">
                <TabsList>
                    <TabsTrigger value="overview">Overview</TabsTrigger>
                    <TabsTrigger value="curriculum">Curriculum</TabsTrigger>
                    <TabsTrigger value="content">Content</TabsTrigger>
                    <TabsTrigger value="students">Enrolled Students</TabsTrigger>
                    <TabsTrigger value="settings">Settings</TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Course Concept</CardTitle>
                            <CardDescription>Basic information about the course.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid gap-2">
                                <Label>Title</Label>
                                <Input defaultValue={course.title} />
                            </div>
                            <div className="grid gap-2">
                                <Label>Description</Label>
                                <Textarea defaultValue={course.description || ""} rows={5} />
                            </div>
                            <div className="grid gap-2">
                                <Label>Thumbnail URL</Label>
                                <Input defaultValue={course.thumbnail_url || ""} />
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="curriculum">
                    <Card>
                        <CardHeader>
                            <CardTitle>Curriculum Structure</CardTitle>
                            <CardDescription>Define weeks, goals, and milestones.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <p className="text-muted-foreground">Curriculum builder coming in Phase 7 (AI Studio Integration).</p>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="content">
                    <Card>
                        <CardHeader>
                            <CardTitle>Course Content</CardTitle>
                            <CardDescription>Manage lessons, videos, and quizzes.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Button variant="outline" className="mb-4">
                                <PlusIcon className="mr-2 h-4 w-4" />
                                Add Content
                            </Button>
                            <div className="text-sm text-muted-foreground border rounded-md p-8 text-center">
                                No content uploaded yet.
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="students">
                    <div className="text-sm text-muted-foreground">
                        Use the Students management page to enroll students.
                    </div>
                </TabsContent>

                <TabsContent value="settings">
                    <Card>
                        <CardHeader>
                            <CardTitle>Danger Zone</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Button variant="destructive">Archive Course</Button>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}

function PlusIcon(props: any) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <path d="M5 12h14" />
            <path d="M12 5v14" />
        </svg>
    )
}
