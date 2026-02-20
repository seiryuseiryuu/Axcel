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
    // Clean up the timecode string
    const cleaned = tc.replace(/[^\d:]/g, '').trim();
    const parts = cleaned.split(':').map(Number);
    if (parts.some(isNaN)) return null;

    if (parts.length === 3) {
        // HH:MM:SS
        return parts[0] * 3600 + parts[1] * 60 + parts[2];
    } else if (parts.length === 2) {
        // MM:SS
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
}

// --- STEP 4: Extract clip candidates ---
export async function extractClipCandidates(
    correctedSubtitles: string,
    clipLengthSeconds: number
) {
    const minLength = clipLengthSeconds - 10;
    const maxLength = clipLengthSeconds + 10;

    // PHASE 1: Ask AI to extract candidates as JSON (no duration constraint in prompt — we enforce it ourselves)
    const prompt = `あなたはYouTube動画の切り抜き編集のプロフェッショナルです。
以下のタイムコード付き字幕から、ショート動画として切り抜ける箇所を抽出してください。

【タイムコード付き字幕】
${correctedSubtitles}

【希望尺】
**${clipLengthSeconds}秒前後** （目安: ${minLength}秒 〜 ${maxLength}秒）

【選定ルール】
1. 話のテーマが完結している箇所を選ぶ。
2. 1つのセリフだけでは短すぎる場合、前後の複数のセリフを結合して1つのクリップにする。
3. 必ず開始〜終了の間に十分なセリフ量が含まれるよう、広い範囲を取ること。
4. 字幕冒頭のタイトルや説明文はセリフではないので無視すること。
5. 前後の文脈を知らない視聴者でも理解できる内容であること。
6. **短いクリップ（30秒未満）は絶対に出力しないでください。** 必ず複数のセリフを結合して ${minLength}秒以上にすること。

【出力形式】
必ず以下のJSON配列のみを出力してください。説明文やMarkdownは不要です。
\`\`\`json
[
  {
    "startTime": "00:02:15",
    "endTime": "00:03:10",
    "startLine": "切り抜き開始位置のセリフ",
    "endLine": "切り抜き終了位置のセリフ",
    "theme": "テーマ見出し",
    "summary": "内容の要約"
  }
]
\`\`\`

候補がない場合は空配列 [] を返してください。`;

    try {
        const result = await generateText(prompt, 0.2);

        // PHASE 2: Parse JSON from AI response
        let candidates: ClipCandidate[] = [];
        try {
            const jsonMatch = result.match(/\[[\s\S]*\]/);
            if (jsonMatch) {
                candidates = JSON.parse(jsonMatch[0]);
            }
        } catch (parseErr) {
            console.error("Failed to parse clip candidates JSON:", parseErr);
            // Fallback: return raw AI output if JSON parsing fails
            return { success: true, data: result };
        }

        if (!candidates || candidates.length === 0) {
            return { success: true, data: "条件に合致する切り抜き箇所は見つかりませんでした。" };
        }

        // PHASE 3: Programmatic duration validation — filter by actual timecode math
        const validCandidates: (ClipCandidate & { durationSec: number })[] = [];
        const rejectedCount = { short: 0, invalid: 0 };

        for (const c of candidates) {
            const startSec = timecodeToSeconds(c.startTime);
            const endSec = timecodeToSeconds(c.endTime);

            if (startSec === null || endSec === null) {
                rejectedCount.invalid++;
                continue;
            }

            const durationSec = endSec - startSec;

            if (durationSec < minLength) {
                rejectedCount.short++;
                continue; // REJECT: too short
            }

            // Accept (also accept slightly over maxLength — it's less harmful)
            validCandidates.push({ ...c, durationSec });
        }

        // PHASE 4: Render valid candidates as Markdown for UI
        if (validCandidates.length === 0) {
            let msg = `条件に合致する切り抜き箇所は見つかりませんでした。\n\n`;
            msg += `> AI が ${candidates.length} 件の候補を提案しましたが、`;
            if (rejectedCount.short > 0) msg += `${rejectedCount.short} 件が尺不足（${minLength}秒未満）、`;
            if (rejectedCount.invalid > 0) msg += `${rejectedCount.invalid} 件がタイムコード不正、`;
            msg += `全て除外されました。\n`;
            msg += `> 字幕データの範囲が短い可能性があります。より短い希望尺で再度お試しください。`;
            return { success: true, data: msg };
        }

        // Build Markdown output
        let markdown = `**${validCandidates.length} 件の切り抜き候補** が見つかりました（指定尺: ${clipLengthSeconds}秒 ± 10秒）\n\n`;
        if (rejectedCount.short > 0) {
            markdown += `> ⚠️ ${rejectedCount.short} 件の候補が尺不足（${minLength}秒未満）のため自動除外されました。\n\n`;
        }
        markdown += `---\n\n`;

        validCandidates.forEach((c, i) => {
            markdown += `## 切り抜き候補 ${i + 1}\n`;
            markdown += `- **開始タイムコード**: ${c.startTime}\n`;
            markdown += `- **終了タイムコード**: ${c.endTime}\n`;
            markdown += `- **推定尺**: ${c.durationSec}秒\n`;
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

