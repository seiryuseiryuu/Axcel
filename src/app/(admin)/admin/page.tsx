import { createClient } from "@/lib/supabase/server";
import { requirePermission } from "@/lib/rbac";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { Users, BookOpen, GraduationCap, Palette, FileText, Activity } from "lucide-react";

export default async function AdminDashboard() {
    const user = await requirePermission("canAccessAdminPanel");
    const supabase = await createClient();

    // Fetch stats
    const [studentsResult, coursesResult, instructorsResult, enrollmentsResult] = await Promise.all([
        supabase.from("profiles").select("*", { count: "exact", head: true }).eq("role", "student"),
        supabase.from("courses").select("*", { count: "exact", head: true }),
        supabase.from("profiles").select("*", { count: "exact", head: true }).eq("role", "instructor"),
        supabase.from("course_enrollments").select("*", { count: "exact", head: true }).eq("status", "active"),
    ]);

    const stats = {
        students: studentsResult.count || 0,
        courses: coursesResult.count || 0,
        instructors: instructorsResult.count || 0,
        enrollments: enrollmentsResult.count || 0,
    };

    const menuItems = [
        {
            title: "受講生管理",
            description: "受講生の追加・編集・コース割り当て",
            href: "/admin/students",
            icon: Users,
            color: "text-blue-500",
            stat: `${stats.students}名`,
        },
        {
            title: "コース管理",
            description: "コースの作成・編集・公開設定",
            href: "/admin/courses",
            icon: BookOpen,
            color: "text-green-500",
            stat: `${stats.courses}件`,
        },
        {
            title: "講師管理",
            description: "講師アカウントの作成・権限設定",
            href: "/admin/instructors",
            icon: GraduationCap,
            color: "text-purple-500",
            stat: `${stats.instructors}名`,
        },
        {
            title: "AI Creation Studio",
            description: "18種類のAIツールでコンテンツ制作",
            href: "/admin/studio",
            icon: Palette,
            color: "text-orange-500",
            stat: "18ツール",
        },
        {
            title: "Transcripts",
            description: "文字起こし・講義ノート管理",
            href: "/admin/transcripts",
            icon: FileText,
            color: "text-teal-500",
            stat: "",
        },
        {
            title: "監査ログ",
            description: "システムアクティビティの確認",
            href: "/admin/audit",
            icon: Activity,
            color: "text-red-500",
            stat: "",
        },
    ];

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">管理者ダッシュボード</h1>
                <p className="text-muted-foreground">
                    ようこそ、{user.displayName || "管理者"}さん
                </p>
            </div>

            {/* Stats Overview */}
            <div className="grid gap-4 md:grid-cols-4">
                <Card>
                    <CardHeader className="pb-2">
                        <CardDescription>アクティブ受講生</CardDescription>
                        <CardTitle className="text-3xl">{stats.students}</CardTitle>
                    </CardHeader>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardDescription>コース数</CardDescription>
                        <CardTitle className="text-3xl">{stats.courses}</CardTitle>
                    </CardHeader>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardDescription>講師数</CardDescription>
                        <CardTitle className="text-3xl">{stats.instructors}</CardTitle>
                    </CardHeader>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardDescription>アクティブ受講</CardDescription>
                        <CardTitle className="text-3xl">{stats.enrollments}</CardTitle>
                    </CardHeader>
                </Card>
            </div>

            {/* Menu Grid */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {menuItems.map((item) => (
                    <Link href={item.href} key={item.href}>
                        <Card className="hover:shadow-lg transition-all cursor-pointer h-full border-2 hover:border-primary/20">
                            <CardHeader className="pb-2">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className={`p-2 rounded-lg bg-muted ${item.color}`}>
                                            <item.icon className="w-5 h-5" />
                                        </div>
                                        <CardTitle className="text-lg">{item.title}</CardTitle>
                                    </div>
                                    {item.stat && (
                                        <span className="text-sm font-medium text-muted-foreground">
                                            {item.stat}
                                        </span>
                                    )}
                                </div>
                            </CardHeader>
                            <CardContent>
                                <CardDescription>{item.description}</CardDescription>
                            </CardContent>
                        </Card>
                    </Link>
                ))}
            </div>
        </div>
    );
}
