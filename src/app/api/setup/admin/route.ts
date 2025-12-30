import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

/**
 * 開発用: 最初の管理者アカウントを作成
 * 本番環境では削除またはセキュリティで保護すること
 */
export async function POST(request: NextRequest) {
    // Only allow in development
    if (process.env.NODE_ENV === "production") {
        return NextResponse.json(
            { success: false, error: "Not available in production" },
            { status: 403 }
        );
    }

    try {
        const body = await request.json();
        const { email, password, displayName } = body;

        if (!email || !password) {
            return NextResponse.json(
                { success: false, error: "Email and password are required" },
                { status: 400 }
            );
        }

        const supabaseAdmin = createAdminClient();

        // Check if any admin exists
        const { count } = await supabaseAdmin
            .from("profiles")
            .select("*", { count: "exact", head: true })
            .eq("role", "admin");

        // Create auth user
        const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
            email,
            password,
            email_confirm: true,
            user_metadata: { display_name: displayName || "Admin", role: "admin" }
        });

        if (authError) {
            return NextResponse.json(
                { success: false, error: authError.message },
                { status: 400 }
            );
        }

        const userId = authData.user.id;

        // Create profile as admin
        const { error: profileError } = await supabaseAdmin
            .from("profiles")
            .upsert({
                id: userId,
                role: "admin",
                display_name: displayName || "Admin",
            });

        if (profileError) {
            await supabaseAdmin.auth.admin.deleteUser(userId);
            return NextResponse.json(
                { success: false, error: "Failed to create profile: " + profileError.message },
                { status: 500 }
            );
        }

        return NextResponse.json({
            success: true,
            message: "Admin account created successfully",
            data: {
                userId,
                email,
                role: "admin"
            }
        });

    } catch (error: any) {
        return NextResponse.json(
            { success: false, error: error.message || "Unknown error" },
            { status: 500 }
        );
    }
}

// GET method to check status
export async function GET() {
    if (process.env.NODE_ENV === "production") {
        return NextResponse.json({ success: false, error: "Not available" }, { status: 403 });
    }

    try {
        const supabaseAdmin = createAdminClient();

        const { count } = await supabaseAdmin
            .from("profiles")
            .select("*", { count: "exact", head: true })
            .eq("role", "admin");

        return NextResponse.json({
            success: true,
            hasAdmin: (count || 0) > 0,
            adminCount: count || 0
        });
    } catch (error: any) {
        return NextResponse.json(
            { success: false, error: error.message },
            { status: 500 }
        );
    }
}
