import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

// This endpoint would be called by Vercel Cron or an external scheduler
// e.g. curl -X POST https://yourapp.com/api/cron/reminders?type=evening -H "Authorization: Bearer <CRON_SECRET>"

export async function POST(req: NextRequest) {
    // In production, add a secret key check header here for security

    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type') || 'evening'; // 'evening' (18:00) or 'night' (23:00)

    const supabase = createAdminClient();
    const today = new Date().toISOString().split('T')[0];

    // Find all incomplete plans for today
    const { data: pendingPlans, error } = await supabase
        .from('daily_plans')
        .select(`
            id,
            status,
            course_enrollments (
                student_id,
                auth_users (
                   email
                )
            )
        `)
        .eq('date', today)
        .eq('status', 'pending');

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!pendingPlans || pendingPlans.length === 0) {
        return NextResponse.json({ message: "No pending plans found." });
    }

    let sentCount = 0;

    // Send Emails (Mocking for now)
    for (const plan of pendingPlans) {
        // @ts-ignore
        const email = plan.course_enrollments?.auth_users?.email;
        if (!email) continue;

        if (type === 'evening') {
            console.log(`[MAIL MOCK] To: ${email} | Subject: 本日の学習目標は順調ですか？ (18:00 Reminder)`);
            console.log(`Body: こんばんは。18時になりました。本日のタスクの進捗はいかがでしょうか？少しずつでも進めていきましょう！`);
        } else if (type === 'night') {
            console.log(`[MAIL MOCK] To: ${email} | Subject: 【最終確認】本日のタスク完了報告 (23:00 Alert)`);
            console.log(`Body: こんばんは。23時です。本日のタスクがまだ完了になっていないようです。明日に持ち越さないよう、ラストスパートをかけましょう！`);
        }

        sentCount++;
    }

    return NextResponse.json({
        success: true,
        count: sentCount,
        type,
        message: `Sent ${sentCount} reminders.`
    });
}
