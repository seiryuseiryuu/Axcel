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
    const maxLength = clipLengthSeconds + 20; // Slightly more generous upper bound

    // PHASE 1: Ask AI to extract candidates as JSON with strong guidance on natural breakpoints
    const prompt = `あなたはYouTube動画の切り抜き編集のプロフェッショナルです。
以下のタイムコード付き字幕から、ショート動画として「バズる可能性が高い」切り抜き箇所を抽出してください。

【タイムコード付き字幕】
${correctedSubtitles}

【希望尺】
**${clipLengthSeconds}秒前後** （許容範囲: ${minLength}秒 〜 ${maxLength}秒）

【★最重要: 切り抜きポイントの選定基準★】
以下の基準で「伸びる切り抜き」を作ること：

■ 開始ポイントの選び方：
- 視聴者の興味を引くフック（衝撃的な発言、問いかけ、意外な事実）から始める
- 話の途中からではなく、新しいトピックや話題の切り替わりから始める
- 「実は〜」「ここが重要なんですけど」「よくある間違いは〜」のようなフレーズの直前から

■ 終了ポイントの選び方：
- 話のオチ・結論・まとめが完結している箇所で終わる
- 「〜ということです」「〜なんですよね」「〜してください」のような締めの言葉で終わる
- 話が中途半端に途切れる箇所で終わらせない（次の話題に入る直前で切る）
- 感情的なピーク（笑い、驚き、共感ポイント）の直後で終わる

■ 全体の構成：
- 1つの切り抜きで1つの完結した話題・主張が含まれること
- 前後の文脈を知らない初見の視聴者でも100%理解できること
- 「起承転結」または「問題提起→解決」の構造があると理想的

【候補数】
**必ず5〜8件の候補を抽出してください。** 動画全体をカバーするように、前半・中盤・後半からバランスよく選んでください。
候補が少なすぎる場合は、尺の許容範囲を少し広げてでも候補を増やしてください。

【選定ルール】
1. 1つのセリフだけでは短すぎる場合、前後の複数のセリフを結合して1つのクリップにする。
2. 必ず開始〜終了の間に十分なセリフ量が含まれるよう、広い範囲を取ること。
3. 字幕冒頭のタイトルや説明文はセリフではないので無視すること。
4. **短いクリップ（${minLength}秒未満）は出力しないでください。** 必ず複数のセリフを結合して ${minLength}秒以上にすること。
5. 各候補は重複しないこと（同じ時間帯を含まない）。

【出力形式】
必ず以下のJSON配列のみを出力してください。説明文やMarkdownは不要です。
\`\`\`json
[
  {
    "startTime": "00:02:15",
    "endTime": "00:03:10",
    "startLine": "切り抜き開始位置のセリフ",
    "endLine": "切り抜き終了位置のセリフ",
    "theme": "テーマ見出し（バズりやすいタイトル風に）",
    "summary": "内容の要約（なぜこの切り抜きが伸びるかの理由も一言）"
  }
]
\`\`\`

候補がない場合は空配列 [] を返してください。`;

    try {
        const result = await generateText(prompt, 0.3);

        // PHASE 2: Parse JSON from AI response
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

        // PHASE 3: Programmatic duration validation — try to extend short clips rather than simply rejecting
        const validCandidates: (ClipCandidate & { durationSec: number })[] = [];
        const rejectedCount = { short: 0, invalid: 0 };

        for (const c of candidates) {
            const startSec = timecodeToSeconds(c.startTime);
            const endSec = timecodeToSeconds(c.endTime);

            if (startSec === null || endSec === null) {
                rejectedCount.invalid++;
                continue;
            }

            let durationSec = endSec - startSec;

            if (durationSec < minLength) {
                // Try to extend clip: add time to the end to reach minimum length
                const extendedEndSec = startSec + minLength + 5; // Extend to minLength + 5s buffer
                const extendedEndTime = secondsToTimecode(extendedEndSec);
                durationSec = extendedEndSec - startSec;
                validCandidates.push({
                    ...c,
                    endTime: extendedEndTime,
                    endLine: c.endLine + "（自動延長）",
                    durationSec
                });
                continue;
            }

            // Accept
            validCandidates.push({ ...c, durationSec });
        }

        // PHASE 3.5: If too few valid candidates, do a retry with relaxed constraints
        if (validCandidates.length < 3 && candidates.length > 0) {
            console.log(`[VideoClip] Only ${validCandidates.length} valid candidates. Retrying with relaxed constraints...`);
            const relaxedMinLength = Math.max(20, minLength - 15);
            const retryPrompt = `前回の分析で切り抜き候補が少なすぎました。追加の候補を見つけてください。

【タイムコード付き字幕】
${correctedSubtitles}

【緩和された条件】
- 最低尺: ${relaxedMinLength}秒以上
- 最大尺: ${maxLength + 15}秒まで許容
- 少し短めでも、インパクトのある内容ならOK
- 前回見つけた時間帯以外から探す: ${validCandidates.map(c => `${c.startTime}〜${c.endTime}`).join(', ')}

【重要】
- 話の区切りの良い所で切ること（途中で切れない）
- 視聴者が文脈なしで理解できること
- **必ず3〜5件の追加候補を出すこと**

【出力形式】
JSON配列のみ。前回と同じフォーマット。
\`\`\`json
[
  {
    "startTime": "MM:SS",
    "endTime": "MM:SS",
    "startLine": "開始セリフ",
    "endLine": "終了セリフ",
    "theme": "テーマ",
    "summary": "要約"
  }
]
\`\`\``;

            try {
                const retryResult = await generateText(retryPrompt, 0.4);
                const retryJsonMatch = retryResult.match(/\[[\s\S]*\]/);
                if (retryJsonMatch) {
                    const retryCandidates: ClipCandidate[] = JSON.parse(retryJsonMatch[0]);
                    for (const c of retryCandidates) {
                        const startSec = timecodeToSeconds(c.startTime);
                        const endSec = timecodeToSeconds(c.endTime);
                        if (startSec === null || endSec === null) continue;
                        const durationSec = endSec - startSec;
                        if (durationSec >= relaxedMinLength) {
                            validCandidates.push({ ...c, durationSec });
                        }
                    }
                }
            } catch (retryErr) {
                console.warn("[VideoClip] Retry failed:", retryErr);
            }
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

        // Sort by startTime for readability
        validCandidates.sort((a, b) => {
            const aStart = timecodeToSeconds(a.startTime) || 0;
            const bStart = timecodeToSeconds(b.startTime) || 0;
            return aStart - bStart;
        });

        // Build Markdown output
        let markdown = `**${validCandidates.length} 件の切り抜き候補** が見つかりました（指定尺: ${clipLengthSeconds}秒 ± 10秒）\n\n`;
        if (rejectedCount.short > 0) {
            markdown += `> ℹ️ ${rejectedCount.short} 件の短い候補は自動延長されました。\n\n`;
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

