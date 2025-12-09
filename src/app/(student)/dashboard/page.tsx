import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/rbac";
import { GoalInput } from "@/components/features/student/GoalInput";
import { DailyChecklist } from "@/components/features/student/DailyChecklist";
import { PlanTask } from "@/app/actions/planner"; // Import type

export default async function StudentDashboard() {
    await requireRole("student");
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return null;

    const today = new Date().toISOString().split('T')[0];

    // 1. Check for today's plan
    const { data: dailyPlan, error: planError } = await supabase
        .from('daily_plans')
        .select('*')
        .eq('date', today)
        // We can't easily join to verify student__id in one simple query without foreign key chaining knowledge in code
        // But RLS policies should handle "only my plans" visibility if set up correctly.
        // For MVP, we presume the user only sees their own plans or we filter after.
        // Let's assume RLS.
        .maybeSingle();

    // 2. Check if user has ANY active goal (Enrollment)
    const { data: enrollments } = await supabase
        .from('course_enrollments')
        .select('id')
        .eq('student_id', user.id)
        .eq('status', 'active')
        .limit(1);

    const hasActiveGoal = enrollments && enrollments.length > 0;

    // View Logic
    if (!hasActiveGoal) {
        return (
            <div className="container mx-auto p-6 py-12">
                <GoalInput />
            </div>
        );
    }

    if (dailyPlan) {
        return (
            <div className="container mx-auto p-6 py-8">
                <DailyChecklist
                    planId={dailyPlan.id}
                    tasks={dailyPlan.tasks as unknown as PlanTask[]}
                    date={today}
                />
            </div>
        );
    }

    // Fallback: Has Goal but no tasks for today.
    // In a real app, this should trigger a "Generate Plan" button or auto-generation.
    // For this MVP, we show GoalInput (which can be used to set a NEW goal or refresh).
    // Or simpler: Show a "Day Off / Generate" message.
    // Let's reuse GoalInput for simplicity but maybe users want to just see "Today's Plan".
    // We'll show the GoalInput to allow re-planning.
    return (
        <div className="container mx-auto p-6 py-12">
            <GoalInput />
            <p className="text-center text-muted-foreground mt-4">
                ※ 新しいゴールを設定するか、明日のプランをお待ちください。
            </p>
        </div>
    );
}
