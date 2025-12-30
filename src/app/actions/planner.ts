"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { generateText } from "@/lib/gemini";

export interface PlanTask {
    id: string;
    title: string;
    completed: boolean;
    estimatedMinutes: number;
}

export interface DayPlan {
    id: string;
    date: string;
    tasks: PlanTask[];
    status: 'pending' | 'completed';
}

// 1. Onboarding Action: Create "Meta Curriculum"
export async function createMetaCurriculum(goal: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) throw new Error("Unauthorized");

    // Generate High-Level Roadmap using Gemini
    const roadmapPrompt = `
    あなたはプロの学習コーチです。
    ユーザーの目標: "${goal}"
    
    この目標を達成するための「大まかな学習ロードマップ（カリキュラム）」を300文字以内で作成してください。
    具体的なステップ（フェーズ1, フェーズ2...）を含めてください。
    出力はテキストのみで、マークダウン形式で見やすくしてください。
    `;

    let description = "AI Curriculum";
    try {
        description = await generateText(roadmapPrompt, 0.7);
    } catch (e) {
        console.error("Roadmap generation failed", e);
        description = `目標: ${goal} を達成するためのAI生成カリキュラム`;
    }

    // Create Metadata Course
    const { data: course, error: courseError } = await supabase
        .from('courses')
        .insert({
            instructor_id: user.id,
            title: goal, // Title is the goal itself
            description: description,
            status: 'published' // Private to user logically, but schema uses published
        })
        .select()
        .single();

    if (courseError) throw new Error(`Course creation failed: ${courseError.message}`);

    // Enroll
    const { error: enrollError } = await supabase
        .from('course_enrollments')
        .insert({
            course_id: course.id,
            student_id: user.id,
            status: 'active'
        });

    if (enrollError) throw new Error(`Enrollment failed: ${enrollError.message}`);

    return { success: true };
}

// 2. Just-in-Time Action: Generate Today's Tasks
export async function generateDailyTasks(enrollmentId: string, goalTitle: string, userIntent?: string) {
    const supabase = await createClient();
    const today = new Date().toISOString().split('T')[0];

    // Check if plan already exists (Double check server-side)
    const { data: existing } = await supabase
        .from('daily_plans')
        .select('*')
        .eq('enrollment_id', enrollmentId)
        .eq('date', today)
        .maybeSingle();

    if (existing) return existing;

    // Fetch previous day's plan for context (Adaptive)
    const { data: history } = await supabase
        .from('daily_plans')
        .select('tasks, status')
        .eq('enrollment_id', enrollmentId)
        .order('date', { ascending: false })
        .limit(1)
        .maybeSingle();

    let contextPrompt = "";
    if (history) {
        const prevTasks = history.tasks as PlanTask[];
        const done = prevTasks.filter(t => t.completed).map(t => t.title).join(", ");
        const pending = prevTasks.filter(t => !t.completed).map(t => t.title).join(", ");
        contextPrompt = `
        前回完了したタスク: ${done || "なし"}
        前回未完了のタスク: ${pending || "なし"}
        `;
    } else {
        contextPrompt = "これが学習初日です。基礎から始めてください。";
    }

    // Generate Tasks
    const prompt = `
    目標: "${goalTitle}"
    
    今日の学習タスクをJSON配列で3〜5個生成してください。
    過去の進捗状況:
    ${contextPrompt}
    
    【出力形式】
    [
      { "title": "具体的なタスク内容", "min": 30 }
    ]
    JSONのみ出力。
    `;

    let tasks: PlanTask[] = [];
    try {
        const jsonStr = await generateText(prompt);
        const cleanJson = jsonStr.replace(/```json/g, "").replace(/```/g, "").trim();
        const data = JSON.parse(cleanJson);
        tasks = data.map((t: any) => ({
            id: crypto.randomUUID(),
            title: t.title,
            completed: false,
            estimatedMinutes: t.min || 30
        }));
    } catch (e) {
        // Fallback
        tasks = [
            { id: crypto.randomUUID(), title: "目標の確認と計画", completed: false, estimatedMinutes: 15 },
            { id: crypto.randomUUID(), title: "基礎知識のインプット", completed: false, estimatedMinutes: 45 },
        ];
    }

    // Save
    const { data: newPlan, error } = await supabase
        .from('daily_plans')
        .insert({
            enrollment_id: enrollmentId,
            date: today,
            tasks: tasks,
            status: 'pending'
        })
        .select()
        .single();

    if (error) throw new Error(error.message);
    revalidatePath('/dashboard');
    return newPlan;
}

export async function toggleTaskCompletion(planId: string, tasks: PlanTask[]) {
    const supabase = await createClient();

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
    revalidatePath('/dashboard');
}
