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
4. **各クリップは必ず${clipLengthSeconds}秒前後にすること（最低${minLength}秒）。** 短すぎるクリップは絶対に出さないこと。
5. 各候補は重複しないこと（同じ時間帯を含まない）。
6. **endLine（終了セリフ）は必ず文が完結しているセリフにすること。** 文の途中で切れているセリフを endLine にしてはいけない。

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

        // PHASE 3: Programmatic duration validation
        const validCandidates: (ClipCandidate & { durationSec: number })[] = [];
        const shortCandidates: ClipCandidate[] = [];
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
                // Don't blindly extend — collect for AI re-extension
                shortCandidates.push(c);
                rejectedCount.short++;
                continue;
            }

            validCandidates.push({ ...c, durationSec });
        }

        // PHASE 3.5: AI-driven re-extension for short clips
        // Instead of mechanically adding seconds, ask the AI to find proper ending points
        if (shortCandidates.length > 0) {
            console.log(`[VideoClip] ${shortCandidates.length} short clips found. Asking AI to find proper endpoints...`);

            const shortClipsList = shortCandidates.map((c, i) =>
                `${i + 1}. 開始: ${c.startTime}「${c.startLine}」→ 終了: ${c.endTime}「${c.endLine}」テーマ: ${c.theme}`
            ).join('\n');

            const reExtendPrompt = `以下の切り抜き候補は尺が短すぎます（${minLength}秒未満）。
各候補の開始タイムコードはそのまま維持し、**終了タイムコードを延長**して${minLength}〜${maxLength}秒になるようにしてください。

【重要ルール】
- 終了ポイントは必ず「話の区切りが良い所」で設定する
- 文の途中で切らない。必ず文末（「〜です」「〜ですね」「〜ですよ」「〜ました」等）で終わる
- 話題が完結する箇所、または次の話題に移る直前で終わる
- 字幕データを参照して、実際にそのタイムコードにあるセリフを endLine に記載する

【尺の短い候補一覧】
${shortClipsList}

【タイムコード付き字幕（参照用）】
${correctedSubtitles}

【出力形式】
JSON配列のみ。startTimeは変更しないこと。endTimeとendLineを適切に更新すること。
\`\`\`json
[
  {
    "startTime": "元のstartTime",
    "endTime": "延長後のendTime",
    "startLine": "元のstartLine",
    "endLine": "延長後の終了セリフ（実際の字幕テキスト）",
    "theme": "元のtheme",
    "summary": "元のsummary"
  }
]
\`\`\``;

            try {
                const reExtendResult = await generateText(reExtendPrompt, 0.2);
                const reExtendMatch = reExtendResult.match(/\[[\s\S]*\]/);
                if (reExtendMatch) {
                    const reExtended: ClipCandidate[] = JSON.parse(reExtendMatch[0]);
                    for (const c of reExtended) {
                        const startSec = timecodeToSeconds(c.startTime);
                        const endSec = timecodeToSeconds(c.endTime);
                        if (startSec === null || endSec === null) continue;
                        const durationSec = endSec - startSec;
                        if (durationSec >= minLength - 5) { // Slightly relaxed to accept AI's judgement
                            validCandidates.push({ ...c, durationSec });
                        }
                    }
                }
            } catch (reExtendErr) {
                console.warn("[VideoClip] AI re-extension failed:", reExtendErr);
            }
        }

        // PHASE 3.75: If still too few valid candidates, retry from scratch with relaxed constraints
        if (validCandidates.length < 3) {
            console.log(`[VideoClip] Only ${validCandidates.length} valid candidates after re-extension. Retrying...`);
            const relaxedMinLength = Math.max(20, minLength - 15);
            const retryPrompt = `切り抜き候補が不足しています。追加の候補を見つけてください。

【タイムコード付き字幕】
${correctedSubtitles}

【条件】
- 最低尺: ${relaxedMinLength}秒以上、最大尺: ${maxLength + 15}秒まで許容
- **話が完結している区切りの良い箇所で開始・終了すること**
- 文の途中で切らない。終了セリフは必ず文末で終わること。
- 前後の文脈なしで視聴者が理解できること
- 既存候補の時間帯を避ける: ${validCandidates.map(c => `${c.startTime}〜${c.endTime}`).join(', ') || 'なし'}
- **必ず3〜5件の候補を出すこと**

【出力形式】
JSON配列のみ（前回と同じフォーマット）。`;

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
            markdown += `> ℹ️ ${rejectedCount.short} 件の短い候補はAIが適切な終了ポイントを再検索しました。\n\n`;
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

