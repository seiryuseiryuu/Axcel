"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export interface PlanTask {
    id: string;
    title: string;
    completed: boolean;
    estimatedMinutes: number;
}

export interface DayPlan {
    date: string;
    tasks: PlanTask[];
    status: 'pending' | 'completed';
}

import { generateText } from "@/lib/gemini";

// Real AI Planner using Gemini
async function generateCurriculumFromGoal(goal: string): Promise<PlanTask[]> {
    const prompt = `
    あなたはプロの学習コーチです。以下の目標を達成するための、今日やるべき具体的なタスクを3〜5個、JSON形式でリストアップしてください。
    各タスクには、完了までの推定時間(分)を含めてください。
    
    目標: "${goal}"

    【出力形式】
    [
      { "title": "タスク名", "min": 30 }
    ]
    
    余計な説明は不要です。JSONのみを出力してください。
    `;

    try {
        const jsonStr = await generateText(prompt);
        // Clean markdown code blocks if present
        const cleanJson = jsonStr.replace(/```json/g, "").replace(/```/g, "").trim();
        const data = JSON.parse(cleanJson);

        return data.map((t: any) => ({
            id: crypto.randomUUID(),
            title: t.title,
            completed: false,
            estimatedMinutes: t.min || 30
        }));
    } catch (error) {
        console.error("AI Generation failed:", error);
        // Fallback if AI fails
        return [
            { id: crypto.randomUUID(), title: "目標に向けた現状分析", completed: false, estimatedMinutes: 30 },
            { id: crypto.randomUUID(), title: "具体的な学習計画の策定", completed: false, estimatedMinutes: 45 },
            { id: crypto.randomUUID(), title: "基礎情報の収集", completed: false, estimatedMinutes: 60 },
        ];
    }
}

export async function createStudyPlan(goal: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) throw new Error("Unauthorized");

    // 1. Get or Create Profile (Ensure profile exists)
    // (Assuming profile exists from previous fixes)

    // 2. Create Course (Self-Learning Course)
    const { data: course, error: courseError } = await supabase
        .from('courses')
        .insert({
            instructor_id: user.id, // User is their own instructor for self-learning
            title: `${goal} マスターコース`,
            description: "AIが生成したパーソナライズ学習プラン",
            status: 'published'
        })
        .select()
        .single();

    if (courseError) throw new Error(`Course creation failed: ${courseError.message}`);

    // 3. Enroll in the course
    const { data: enrollment, error: enrollError } = await supabase
        .from('course_enrollments')
        .insert({
            course_id: course.id,
            student_id: user.id,
            status: 'active'
        })
        .select()
        .single();

    if (enrollError) throw new Error(`Enrollment failed: ${enrollError.message}`);

    // 4. Generate Tasks for Today (Mock AI)
    const tasks = await generateCurriculumFromGoal(goal);

    // 5. Save Today's Plan
    const today = new Date().toISOString().split('T')[0];
    const { error: planError } = await supabase
        .from('daily_plans')
        .insert({
            enrollment_id: enrollment.id,
            date: today,
            tasks: tasks,
            status: 'pending'
        });

    if (planError) throw new Error(`Plan creation failed: ${planError.message}`);

    revalidatePath('/student/dashboard');
    return { success: true };
}

export async function toggleTaskCompletion(planId: string, tasks: PlanTask[]) {
    const supabase = await createClient();

    // Calculate if all completed
    const allCompleted = tasks.every(t => t.completed);
    const status = allCompleted ? 'completed' : 'pending';

    const { error } = await supabase
        .from('daily_plans')
        .update({
            tasks: tasks,
            status: status,
            updated_at: new Date().toISOString()
        })
        .eq('id', planId);

    if (error) throw new Error(error.message);
    revalidatePath('/student/dashboard');
}
