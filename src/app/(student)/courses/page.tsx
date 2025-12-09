import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/rbac";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { BookOpen, Clock, Star } from "lucide-react";

export default async function CoursesPage() {
    await requireRole("student");
    const supabase = await createClient();

    // Fetch published courses (and student's enrollment status)
    const { data: courses } = await supabase
        .from("courses")
        .select(`
            *,
            profiles (display_name)
        `)
        .eq("status", "published")
        .order("created_at", { ascending: false });

    return (
        <div className="container mx-auto p-6 space-y-8">
            <div className="flex flex-col gap-2">
                <h1 className="text-3xl font-bold tracking-tight text-foreground">AI副業コース一覧</h1>
                <p className="text-muted-foreground">
                    稼げるスキルを最短で習得するためのカリキュラム。
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {courses?.map((course) => (
                    <Link href={`/courses/${course.id}`} key={course.id} className="group">
                        <Card className="h-full overflow-hidden transition-all duration-300 hover:shadow-lg hover:-translate-y-1 border-border/50 bg-card">
                            <div className="aspect-video bg-secondary relative overflow-hidden">
                                {course.thumbnail_url ? (
                                    <img
                                        src={course.thumbnail_url}
                                        alt={course.title}
                                        className="object-cover w-full h-full transition-transform duration-500 group-hover:scale-105"
                                    />
                                ) : (
                                    <div className="absolute inset-0 flex items-center justify-center bg-primary/5">
                                        <BookOpen className="w-12 h-12 text-primary/20" />
                                    </div>
                                )}
                                <div className="absolute top-2 right-2">
                                    <Badge variant="secondary" className="bg-background/80 backdrop-blur text-xs">
                                        {course.level || '初級'}
                                    </Badge>
                                </div>
                            </div>
                            <CardHeader className="p-5 pb-2">
                                <CardTitle className="line-clamp-2 text-lg group-hover:text-primary transition-colors">
                                    {course.title}
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-5 pt-2 space-y-4">
                                <p className="text-sm text-muted-foreground line-clamp-2">
                                    {course.description}
                                </p>
                                <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t border-border/50">
                                    <div className="flex items-center gap-1">
                                        <Clock className="w-3.5 h-3.5" />
                                        <span>3時間</span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <Star className="w-3.5 h-3.5 text-yellow-500 fill-yellow-500" />
                                        <span>4.8</span>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </Link>
                ))}

                {(!courses || courses.length === 0) && (
                    <div className="col-span-full py-12 text-center bg-secondary/30 rounded-xl border border-dashed">
                        <p className="text-muted-foreground">現在公開されているコースはありません。</p>
                    </div>
                )}
            </div>
        </div>
    );
}
