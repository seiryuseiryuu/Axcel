import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/rbac";
import { DailyChecklist } from "@/components/features/student/DailyChecklist";
import { PlanTask, generateDailyTasks } from "@/app/actions/planner";
import { redirect } from "next/navigation";
import { Bot, History } from "lucide-react";
import { Button } from "@/components/ui/button";

export default async function StudentDashboard() {
    await requireRole("student");
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return null;

    // 1. Check if user has ANY active goal (Enrollment)
    const { data: enrollments } = await supabase
        .from('course_enrollments')
        .select('id, courses(title, description)')
        .eq('student_id', user.id)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(1);

    const hasActiveGoal = enrollments && enrollments.length > 0;

    // Redirect to Onboarding if no goal
    if (!hasActiveGoal) {
        redirect("/onboarding");
    }

    const enrollment = enrollments[0];
    const course = enrollment.courses as any; // Type assertion for joined data
    const today = new Date().toISOString().split('T')[0];

    // 2. Check for today's plan
    let { data: dailyPlan } = await supabase
        .from('daily_plans')
        .select('*')
        .eq('date', today)
        .eq('enrollment_id', enrollment.id)
        .maybeSingle();

    // 3. Auto-Generate if missing (Just-in-Time)
    if (!dailyPlan) {
        // We do this SERVER SIDE so the user sees it immediately
        // Note: This might delay the page load by 1-2s, but provides a better experience than a loading spinner.
        // We pass the Goal Title to the generator
        try {
            dailyPlan = await generateDailyTasks(enrollment.id, course.title);
        } catch (e) {
            console.error("Auto-generation failed", e);
            // Show fallback UI or specific error?
            // For now, we allow dailyPlan to be null and show localized error below
        }
    }

    return (
        <div className="container mx-auto p-6 space-y-8">
            <div className="flex flex-col gap-2">
                <h1 className="text-3xl font-bold tracking-tight text-foreground">学習ダッシュボード</h1>
                <p className="text-muted-foreground">
                    目標: <span className="font-semibold text-primary">{course.title}</span> に向けた今日のプランです。
                </p>
                {course.description && (
                    <div className="bg-secondary/20 p-4 rounded-lg text-sm text-muted-foreground mt-2 border border-border/50">
                        <div className="flex items-center gap-2 mb-2 font-semibold">
                            <Bot className="w-4 h-4" /> AI学習コーチからのメッセージ
                        </div>
                        <div className="whitespace-pre-wrap">{course.description}</div>
                    </div>
                )}
            </div>
            <Link href="/student/history">
                <Button variant="outline" className="gap-2">
                    <History className="w-4 h-4" />
                    生成履歴
                </Button>
            </Link>

            {dailyPlan ? (
                <DailyChecklist
                    planId={dailyPlan.id}
                    tasks={dailyPlan.tasks as unknown as PlanTask[]}
                    date={today}
                />
            ) : (
                <div className="text-center py-12 text-muted-foreground">
                    <p>本日のプラン生成に失敗しました。少し時間をおいてリロードしてください。</p>
                </div>
            )}
        </div>
    );
}
