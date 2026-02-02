"use server";

import { generateText } from "@/lib/gemini";

/**
 * Refine content based on user instruction and context.
 * @param currentContent The text to be modified.
 * @param instruction User's natural language instruction (e.g. "Make it more exciting").
 * @param context Additional context (analysis results, target audience, etc.).
 * @param type Type of content (used to adjust system prompt).
 */
export async function refineContent(
    currentContent: string,
    instruction: string,
    context: any,
    type: 'text' | 'script' | 'structure' = 'text'
) {
    // Serialization for prompt
    const contextString = typeof context === 'string' ? context : JSON.stringify(context, null, 2);

    const prompt = `あなたはプロフェッショナルな編集者・ライターです。
以下の「現在のコンテンツ」を、ユーザーの「修正指示」に従ってリライトしてください。
その際、「背景情報（コンテキスト）」に記載されている前提条件（ターゲット、商品の強み、分析結果など）を必ず考慮してください。
文脈を無視した修正は避けてください。

【背景情報（コンテキスト）】
${contextString.slice(0, 3000)} （※重要などの情報は優先）

【現在のコンテンツ】
${currentContent}

【修正指示】
"${instruction}"

【制約・ガイドライン】
- 出力は修正後の「コンテンツ本文のみ」にしてください。
- 修正の解説や挨拶は不要です。
- マークダウン形式（見出し、箇条書き）は維持してください。
- 修正指示が部分的（例：「導入部分だけ直して」）であっても、全体としての整合性が取れるように出力してください（変更がない部分はそのまま出力、あるいは該当部分のみ出力しユーザーにマージさせる形式でも可だが、今回は**全体を出力**してください）。

[OUTPUT START]
`;

    try {
        const refinedText = await generateText(prompt, 0.7);
        return { success: true, data: refinedText.trim() };
    } catch (e: any) {
        console.error("Refinement error:", e);
        return { success: false, error: e.message || "修正に失敗しました" };
    }
}
