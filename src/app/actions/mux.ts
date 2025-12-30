"use server";

import { mux } from "@/lib/mux";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { generateText } from "@/lib/gemini";

// 1. Get Direct Upload URL
export async function getMuxUploadUrl() {
    try {
        const upload = await mux.video.uploads.create({
            new_asset_settings: {
                playback_policy: ['public'],
                encoding_tier: 'smart',
            },
            cors_origin: '*', // Allow upload from anywhere (client-side)
        });
        return { url: upload.url, id: upload.id };
    } catch (e: any) {
        console.error("Mux Upload URL Error:", e);
        return { error: e.message };
    }
}

// 2. Get Asset details (polling or after upload)
export async function getMuxAsset(uploadId: string) {
    try {
        const upload = await mux.video.uploads.retrieve(uploadId);
        if (upload.asset_id) {
            const asset = await mux.video.assets.retrieve(upload.asset_id);
            return {
                assetId: asset.id,
                playbackId: asset.playback_ids?.[0]?.id
            };
        }
        return { status: upload.status };
    } catch (e: any) {
        return { error: e.message };
    }
}

// 3. Save Content to DB
export async function saveVideoContent(
    courseId: string,
    title: string,
    description: string,
    muxAssetId: string,
    muxPlaybackId: string
) {
    const supabase = await createClient();

    // Check auth
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Unauthorized");

    // Insert
    const { error } = await supabase
        .from('contents')
        .insert({
            course_id: courseId,
            title: title,
            description: description,
            type: 'video',
            mux_asset_id: muxAssetId,
            mux_playback_id: muxPlaybackId,
            is_published: true // Publish immediately for MVP
        });

    if (error) throw new Error(error.message);

    revalidatePath(`/admin/courses/${courseId}`);
    return { success: true };
}

// 4. AI Tone Refiner for Description
export async function refineDescription(text: string, tone: string) {
    const prompt = `
    あなたはプロのカリキュラム作成者です。
    以下の「動画講義の説明文」を、指定されたトーンでリライトしてください。
    
    元の文章:
    "${text}"
    
    指定トーン: ${tone} (例: "優しく丁寧に", "厳しくプロフェッショナルに", "簡潔に")
    
    要件:
    - 生徒が動画を見るモチベーションが上がるように工夫すること。
    - 重要なポイントが伝わりやすくすること。
    - 出力はリライト後のテキストのみ。
    `;

    try {
        return await generateText(prompt, 0.7);
    } catch (e) {
        return text; // Fallback to original
    }
}
