"use server";

import { generateText } from "@/lib/gemini";

// --- STEP 2: Correct subtitles ---
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
    // Slightly lenient on the lower bound, but strict enough to avoid 20s clips.
    // If user asks 90s, acceptable range is 80-100s.
    const minLength = clipLengthSeconds - 10;
    const maxLength = clipLengthSeconds + 10;

    const prompt = `あなたはYouTube動画の切り抜き編集のプロフェッショナルです。
以下のタイムコード付き字幕から、ショート動画として切り抜ける箇所を **全て** 抽出してください。

【タイムコード付き字幕】
${correctedSubtitles}

【希望尺】
**${clipLengthSeconds}秒** （必須範囲: ${minLength}秒 〜 ${maxLength}秒）

【重要: 切り抜き箇所の選定プロセス】
各候補を選定する際、以下の手順「思考プロセス」を必ず実行してください。
1. **話題の特定**: 話題が完結しているブロックを見つける。
2. **時間の計算**: そのブロックの（終了時刻 - 開始時刻）を計算する。
3. **結合と調整**: 
   - 計算結果が ${minLength}秒未満の場合 → **前後の文脈をさらに結合して** 尺を伸ばす。
   - それでも足りない場合は、その候補は破棄する。
   - **15秒以下の短いクリップは絶対にNGです。**

【ルール】
1. **尺の厳守**: 推定尺が **${minLength}秒未満のものは絶対に出力しないでください**。
   - 例: "00:05"〜"00:18" (13秒) → **NG** (短すぎるため、前後のセリフを足して20秒以上にするか、除外する)
2. **文脈の結合**: 1つの文章だけでは尺が足りない場合、必ず複数の文章を結合すること。
3. **メタデータの無視**: 字幕データの冒頭にタイトルや説明文が含まれていても、それはセリフとして扱わず無視すること。
4. **初見理解性**: 前後の文脈を知らない視聴者でも理解できる内容であること。

【出力フォーマット】
条件（特に尺${minLength}秒以上）を満たす箇所を抽出し、以下の形式で出力してください。
**条件を満たす箇所がない場合は、無理に出力せず「条件に合致する長尺の切り抜き箇所は見つかりませんでした」と出力してください。**

---

## 切り抜き候補 1
- **開始タイムコード**: (例: 00:02:15)
- **終了タイムコード**: (例: 00:03:10)
- **推定尺**: (例: 55秒) ※必ず${minLength}秒以上であること
- **開始セリフ**: 「(切り抜き開始位置のセリフ)」
- **終了セリフ**: 「(切り抜き終了位置のセリフ)」
- **テーマ**: (この切り抜きの見出し)
- **内容要約**: (内容の要約)

## 切り抜き候補 2
...

---

【最終確認】
- **出力した全ての候補が、推定尺${minLength}秒以上になっていますか？**
- 13秒や15秒などの短いクリップが含まれていませんか？（含まれていたら削除してください）
`;

    try {
        const result = await generateText(prompt, 0.3);
        return { success: true, data: result };
    } catch (e: any) {
        return { success: false, error: e.message || "切り抜き抽出エラー" };
    }
}
