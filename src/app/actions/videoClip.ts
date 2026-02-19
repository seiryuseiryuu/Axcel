"use server";

import { generateText } from "@/lib/gemini";

// --- STEP 2: Correct typos in timestamped subtitles ---
export async function correctSubtitles(rawSubtitles: string) {
    const prompt = `あなたはプロの文字起こし校正者です。
以下のタイムコード付き字幕の誤字脱字・変換ミスを修正してください。

【重要ルール】
1. **タイムコードは絶対に変更しないでください。** 元のタイムスタンプをそのまま維持してください。
2. 明らかな誤字・脱字・変換ミスのみを修正してください。
3. 発言の意味や内容は一切変えないでください。
4. 口語表現はそのまま残してください（話し言葉を書き言葉に直さない）。
5. 出力は入力と同じタイムコード付きフォーマットで返してください。

【入力字幕】
${rawSubtitles}

【出力】
修正後のタイムコード付き字幕をそのまま出力してください。フォーマットは入力と同じにしてください。
修正箇所がある場合は、最後に「---修正箇所---」として修正した箇所のリストを記載してください。
修正箇所がない場合は「修正箇所なし」と記載してください。`;

    try {
        const result = await generateText(prompt, 0.2);
        return { success: true, data: result };
    } catch (e: any) {
        return { success: false, error: e.message || "字幕校正エラー" };
    }
}

// --- STEP 4: Extract clip candidates ---
export async function extractClipCandidates(
    correctedSubtitles: string,
    clipLengthSeconds: number
) {
    const minLength = clipLengthSeconds - 10;
    const maxLength = clipLengthSeconds + 10;

    const prompt = `あなたはYouTube動画の切り抜き編集のプロフェッショナルです。
以下のタイムコード付き字幕から、ショート動画として切り抜ける箇所を **全て** 抽出してください。

【タイムコード付き字幕】
${correctedSubtitles}

【希望尺】
${clipLengthSeconds}秒（±10秒、つまり${minLength}秒〜${maxLength}秒の範囲）

【切り抜き条件（3つ全てを満たすこと）】
1. **テーマの完結性**: ある特定のテーマについて話していて、内容のまとまりとして完結していること。話の途中で切れたり、前後の文脈がないと意味が通じないものはNG。
2. **初見理解性**: 初見の視聴者にとっても内容が理解できること。前提知識や前の話題を知らないと意味が分からないものはNG。
3. **尺の適合性**: 切り抜き箇所の長さが${minLength}秒〜${maxLength}秒程度であること。

【出力フォーマット】
条件にマッチする該当箇所を **全て** 以下の形式で出力してください。
該当箇所がない場合は「条件に合致する切り抜き箇所は見つかりませんでした」と出力してください。

---

## 切り抜き候補 1
- **開始タイムコード**: (例: 00:02:15)
- **終了タイムコード**: (例: 00:03:10)
- **推定尺**: (例: 55秒)
- **開始セリフ**: 「(切り抜き開始位置のセリフをそのまま記載)」
- **終了セリフ**: 「(切り抜き終了位置のセリフをそのまま記載)」
- **テーマ**: (この切り抜きで話しているテーマを一言で)
- **内容要約**: (2〜3行で内容を要約)

## 切り抜き候補 2
...

---

【注意事項】
- タイムコードは字幕データから正確に引用してください。推測や丸めはしないでください。
- 開始セリフ・終了セリフは、ユーザーが切り抜き箇所を正確に把握できるよう、実際のセリフをそのまま記載してください。
- 条件を満たす箇所は漏れなく全て出力してください。`;

    try {
        const result = await generateText(prompt, 0.3);
        return { success: true, data: result };
    } catch (e: any) {
        return { success: false, error: e.message || "切り抜き抽出エラー" };
    }
}
