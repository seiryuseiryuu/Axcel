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
        // Text / Script Tools
        {
            title: "YouTube台本制作",
            description: "動画の台本・構成作成",
            href: "/admin/studio/script",
            icon: FileText,
            color: "text-red-500",
            stat: "Script",
        },
        {
            title: "ショート動画台本",
            description: "TikTok/Reels用台本",
            href: "/admin/studio/short-script",
            icon: FileText,
            color: "text-pink-500",
            stat: "Shorts",
        },
        {
            title: "SEO記事作成",
            description: "SEO最適化された記事作成",
            href: "/admin/studio/seo",
            icon: FileText,
            color: "text-blue-500",
            stat: "SEO",
        },
        {
            title: "note記事作成",
            description: "有料note/Tips記事執筆",
            href: "/admin/studio/note-writing",
            icon: FileText,
            color: "text-green-600",
            stat: "Article",
        },
        {
            title: "X・Threads投稿",
            description: "バズり投稿の作成",
            href: "/admin/studio/social-post",
            icon: FileText,
            color: "text-slate-900 dark:text-slate-100",
            stat: "Social",
        },
        {
            title: "LPライティング",
            description: "成約率の高いLP文章",
            href: "/admin/studio/lp-writing",
            icon: FileText,
            color: "text-indigo-500",
            stat: "LP",
        },
        {
            title: "セールスレター",
            description: "商品販売用レター",
            href: "/admin/studio/sales-letter",
            icon: FileText,
            color: "text-amber-600",
            stat: "Sales",
        },
        {
            title: "VSLライティング",
            description: "セールス動画シナリオ",
            href: "/admin/studio/vsl-writing",
            icon: FileText,
            color: "text-orange-600",
            stat: "VSL",
        },

        // Image / Design Tools
        {
            title: "YouTubeサムネイル",
            description: "クリックされるサムネ画像",
            href: "/admin/studio/thumbnail",
            icon: Palette,
            color: "text-red-600",
            stat: "Thumb",
        },
        {
            title: "LINEバナー作成",
            description: "反応率の高いバナー",
            href: "/admin/studio/line-banner",
            icon: Palette,
            color: "text-green-500",
            stat: "LINE",
        },
        {
            title: "note・Tipsサムネ",
            description: "記事販売用サムネイル",
            href: "/admin/studio/note-thumbnail",
            icon: Palette,
            color: "text-emerald-500",
            stat: "Cover",
        },
        {
            title: "ブログアイキャッチ",
            description: "記事用アイキャッチ画像",
            href: "/admin/studio/eyecatch",
            icon: Palette,
            color: "text-cyan-500",
            stat: "Blog",
        },
        {
            title: "インスタストーリー",
            description: "ストーリーズ用画像",
            href: "/admin/studio/insta-story",
            icon: Palette,
            color: "text-fuchsia-500",
            stat: "Insta",
        },
        {
            title: "商品・サービス設計",
            description: "コンセプト・商品設計",
            href: "/admin/studio/product-design",
            icon: Activity,
            color: "text-violet-500",
            stat: "Product",
        },
        {
            title: "ファネル設計",
            description: "マーケティング導線設計",
            href: "/admin/studio/funnel-design",
            icon: Activity,
            color: "text-blue-600",
            stat: "Funnel",
        },
        {
            title: "プレゼン資料構成",
            description: "スライド構成案作成",
            href: "/admin/studio/presentation",
            icon: FileText,
            color: "text-sky-500",
            stat: "Slide",
        },
        {
            title: "動画切り抜き分析",
            description: "切り抜きポイント抽出",
            href: "/admin/studio/video-clip",
            icon: Activity,
            color: "text-rose-500",
            stat: "Clip",
        },
        {
            title: "カリキュラム作成",
            description: "講座カリキュラム設計",
            href: "/admin/courses", // Using standard course admin for now or new tool? Let's point to course admin which has this function usually, or create placeholder.
            icon: BookOpen,
            color: "text-yellow-500",
            stat: "Course",
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
