"use server";

import { generateText } from "@/lib/gemini";
import { requireRole } from "@/lib/rbac";

export interface StudioState {
    result?: string;
    error?: string;
}

export async function generateContentAction(prevState: StudioState, formData: FormData): Promise<StudioState> {
    await requireRole("student"); // Ensure only students/admins can use

    const type = formData.get("type") as string; // 'article' | 'script' | 'image'
    const topic = formData.get("topic") as string;
    const target = formData.get("target") as string;
    const tone = formData.get("tone") as string;

    if (!topic) return { error: "トピックを入力してください。" };

    let prompt = "";

    if (type === "article") {
        prompt = `
        以下の条件でSEOに強いブログ記事の構成と本文を作成してください。
        マークダウン形式で出力してください。

        ・トピック: ${topic}
        ・ターゲット読者: ${target || "初心者"}
        ・口調: ${tone || "親しみやすい"}
        ・構成: 
          1. 魅力的なタイトル
          2. 導入（読者の共感を得る）
          3. 見出しごとの本文（具体例を入れる）
          4. まとめ
        `;
    } else if (type === "script") {
        prompt = `
        以下の条件でYouTube動画の台本（スクリプト）を作成してください。
        視聴維持率を高めるためのフックを意識してください。
        マークダウン形式で出力してください。

        ・動画テーマ: ${topic}
        ・ターゲット視聴者: ${target || "一般層"}
        ・雰囲気: ${tone || "エネルギッシュ"}
        ・構成:
          1. オープニング（フック：最初の5秒で惹きつける）
          2. 本題（3つのポイント）
          3. エンディング（チャンネル登録への誘導）
        `;
    } else {
        return { error: "無効なコンテンツタイプです。" };
    }

    try {
        const text = await generateText(prompt);
        return { result: text };
    } catch (e) {
        console.error(e);
        return { error: "生成に失敗しました。時間をおいて再度お試しください。" };
    }
}
