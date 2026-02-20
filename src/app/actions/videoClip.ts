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

// --- Helper: Convert timecode string to total seconds ---
function timecodeToSeconds(tc: string): number | null {
    if (!tc) return null;
    const cleaned = tc.replace(/[^\d:]/g, '').trim();
    const parts = cleaned.split(':').map(Number);
    if (parts.some(isNaN)) return null;

    if (parts.length === 3) {
        return parts[0] * 3600 + parts[1] * 60 + parts[2];
    } else if (parts.length === 2) {
        return parts[0] * 60 + parts[1];
    }
    return null;
}

// --- Helper: Format seconds back to timecode ---
function secondsToTimecode(totalSec: number): string {
    const h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const s = totalSec % 60;
    if (h > 0) {
        return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    }
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

// --- Clip candidate interface ---
interface ClipCandidate {
    startTime: string;
    endTime: string;
    startLine: string;
    endLine: string;
    theme: string;
    summary: string;
    durationSec?: number;
}

// --- STEP 4: Extract clip candidates ---
export async function extractClipCandidates(
    correctedSubtitles: string,
    clipLengthSeconds: number
) {
    const minLength = clipLengthSeconds - 15;
    const maxLength = clipLengthSeconds + 30;

    const prompt = `あなたはYouTube動画の切り抜き編集のプロフェッショナルです。
以下のタイムコード付き字幕から、ショート動画として「バズる可能性が高い」切り抜き箇所を抽出してください。

【タイムコード付き字幕】
${correctedSubtitles}

━━━━━━━━━━━━━━━━━━━━━━━━━━
★★★ 最重要ルール: 尺（クリップの長さ）★★★
━━━━━━━━━━━━━━━━━━━━━━━━━━

各クリップは **必ず${clipLengthSeconds}秒前後** にすること。

- 最低: ${minLength}秒
- 最大: ${maxLength}秒
- 目標: ${clipLengthSeconds}秒

【尺の計算方法】
endTimeの秒数 − startTimeの秒数 = クリップの尺
例: startTime "00:02:00"(120秒) → endTime "00:03:30"(210秒) → 尺 = 90秒 ✓
例: startTime "00:05:00"(300秒) → endTime "00:05:45"(345秒) → 尺 = 45秒 ✗ ← 短すぎ！

★ 出力前に必ず各クリップの尺を自分で計算し、${minLength}秒〜${maxLength}秒の範囲内であることを確認してから出力すること。
★ 範囲外のクリップは出力しないこと。尺が短い場合はendTimeを後ろにずらして調整すること。
━━━━━━━━━━━━━━━━━━━━━━━━━━

【切り抜きポイントの選定基準】

■ 開始ポイントの選び方：
- 視聴者の興味を引くフック（衝撃的な発言、問いかけ、意外な事実）から始める
- 話の途中からではなく、新しいトピックや話題の切り替わりから始める

■ 終了ポイントの選び方（★超重要★）：
- 話のオチ・結論・まとめが完結している箇所で終わる
- 「〜ということです」「〜なんですよね」「〜してください」「〜ですね」「〜わけです」のような締めの言葉で終わる
- ★★ 話が中途半端に途切れる箇所で終わらせるのは絶対禁止 ★★
- 次の話題に入る直前で切る

■ 全体の構成：
- 1つの切り抜きで1つの完結した話題・主張が含まれること
- 前後の文脈を知らない初見の視聴者でも100%理解できること

【候補数】
**必ず5〜8件の候補を抽出してください。** 動画全体からバランスよく選んでください。

【出力形式】
必ず以下のJSON配列のみを出力してください（説明文やMarkdownは不要）。
\`\`\`json
[
  {
    "startTime": "00:02:00",
    "endTime": "00:03:30",
    "durationSec": 90,
    "startLine": "切り抜き開始位置の実際の字幕セリフ",
    "endLine": "切り抜き終了位置の実際の字幕セリフ（必ず文末で完結）",
    "theme": "テーマ見出し（バズりやすいタイトル風に）",
    "summary": "内容の要約"
  }
]
\`\`\`

★ durationSecフィールドは自分で計算した値を入れること（endTimeの総秒数 − startTimeの総秒数）
★ ${minLength}秒未満のクリップは絶対に出力禁止。不足なら endTime を後ろにずらして調整すること。
候補がない場合は空配列 [] を返してください。`;

    try {
        const result = await generateText(prompt, 0.3);

        // Parse JSON from AI response
        let candidates: ClipCandidate[] = [];
        try {
            const jsonMatch = result.match(/\[[\s\S]*\]/);
            if (jsonMatch) {
                candidates = JSON.parse(jsonMatch[0]);
            }
        } catch (parseErr) {
            console.error("Failed to parse clip candidates JSON:", parseErr);
            return { success: true, data: result };
        }

        if (!candidates || candidates.length === 0) {
            return { success: true, data: "条件に合致する切り抜き箇所は見つかりませんでした。" };
        }

        // Compute actual duration from timecodes and accept all valid clips
        const processedCandidates: (ClipCandidate & { durationSec: number; durationWarning?: string })[] = [];

        for (const c of candidates) {
            const startSec = timecodeToSeconds(c.startTime);
            const endSec = timecodeToSeconds(c.endTime);

            if (startSec === null || endSec === null) continue;

            const actualDuration = endSec - startSec;
            if (actualDuration <= 0) continue;

            let durationWarning: string | undefined;
            if (actualDuration < minLength) {
                durationWarning = `⚠️ 指定尺より短め`;
            } else if (actualDuration > maxLength) {
                durationWarning = `ℹ️ 指定尺より長め`;
            }

            processedCandidates.push({
                ...c,
                durationSec: actualDuration,
                durationWarning,
            });
        }

        if (processedCandidates.length === 0) {
            return { success: true, data: "タイムコードが正しい切り抜き候補が見つかりませんでした。字幕データを確認してください。" };
        }

        // Sort by startTime
        processedCandidates.sort((a, b) => {
            const aStart = timecodeToSeconds(a.startTime) || 0;
            const bStart = timecodeToSeconds(b.startTime) || 0;
            return aStart - bStart;
        });

        // Build Markdown output
        let markdown = `**${processedCandidates.length} 件の切り抜き候補** が見つかりました（指定尺: ${clipLengthSeconds}秒前後）\n\n`;
        markdown += `---\n\n`;

        processedCandidates.forEach((c, i) => {
            markdown += `## 切り抜き候補 ${i + 1}\n`;
            markdown += `- **開始タイムコード**: ${c.startTime}\n`;
            markdown += `- **終了タイムコード**: ${c.endTime}\n`;
            markdown += `- **推定尺**: ${c.durationSec}秒${c.durationWarning ? ` ${c.durationWarning}` : ''}\n`;
            markdown += `- **開始セリフ**: 「${c.startLine}」\n`;
            markdown += `- **終了セリフ**: 「${c.endLine}」\n`;
            markdown += `- **テーマ**: ${c.theme}\n`;
            markdown += `- **内容要約**: ${c.summary}\n\n`;
        });

        return { success: true, data: markdown };
    } catch (e: any) {
        return { success: false, error: e.message || "切り抜き抽出エラー" };
    }
}
