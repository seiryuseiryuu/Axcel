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

// --- Clip candidate interface ---
interface ClipCandidate {
    startTime: string;
    endTime: string;
    startLine: string;
    endLine: string;
    theme: string;
    summary: string;
    durationSec?: number;
    keyPoints?: string[];
}

// --- STEP 4: Extract clip candidates (Two-Phase Approach) ---
export async function extractClipCandidates(
    correctedSubtitles: string,
    clipLengthSeconds: number
) {
    const minLength = clipLengthSeconds - 10;
    const maxLength = clipLengthSeconds + 10;

    // ══════════════════════════════════════════
    // PHASE 1: Topic Segmentation
    // Have AI identify ALL distinct topics first
    // ══════════════════════════════════════════
    const segmentPrompt = `あなたはYouTube動画のコンテンツ分析の専門家です。
以下のタイムコード付き字幕を最初から最後まで読み、動画内の「話題・トピック」を全て特定してください。

【タイムコード付き字幕】
${correctedSubtitles}

【作業手順】
1. 字幕を最初から最後まで通して読む
2. 話題が切り替わるポイントを見つける
3. 各話題の開始タイムコードと終了タイムコードを記録する
4. 各話題がどのような内容かを簡潔にまとめる

【話題の区切り方】
- 新しい疑問や問いかけが始まる箇所 = 新しい話題の開始
- 結論が述べられた直後 = その話題の終了
- 話者が「次に」「さて」「ここからは」等の接続表現を使う箇所 = 話題の切り替わり
- 具体例の説明が始まる/終わる箇所も切り替わりポイント

【重要: startLineとendLineについて】
- startLine: その話題の最初の完全な文。文の途中（「なっています」「ですよ」等）から始まらないこと。
- endLine: その話題の最後の完全な文。文が完結していること（「〜です」「〜ですね」「〜ました」「〜わけです」等で終わる）。
  文の途中（「〜が」「〜で」「〜SNSで」等）で切れていたら、その次の文末まで含めること。

【出力形式】
JSON配列のみを出力してください。
\`\`\`json
[
  {
    "topicNumber": 1,
    "startTime": "00:00:11",
    "endTime": "00:01:45",
    "startLine": "この話題の最初の完全なセリフ",
    "endLine": "この話題の最後の完全なセリフ（文末で終わる）",
    "topicTitle": "話題のタイトル",
    "topicSummary": "話の要点を2-3文で"
  }
]
\`\`\``;

    try {
        const segmentResult = await generateText(segmentPrompt, 0.2);

        // Parse topic segments
        let topics: {
            topicNumber: number;
            startTime: string;
            endTime: string;
            startLine: string;
            endLine: string;
            topicTitle: string;
            topicSummary: string;
        }[] = [];

        try {
            const jsonMatch = segmentResult.match(/\[[\s\S]*\]/);
            if (jsonMatch) {
                topics = JSON.parse(jsonMatch[0]);
            }
        } catch (parseErr) {
            console.error("Failed to parse topic segments:", parseErr);
            return { success: true, data: segmentResult };
        }

        if (!topics || topics.length === 0) {
            return { success: true, data: "動画内のトピックを特定できませんでした。字幕データを確認してください。" };
        }

        // ══════════════════════════════════════════
        // PHASE 2: Select & Adjust Best Clips
        // From topics, pick the best ones for target duration
        // ══════════════════════════════════════════
        const topicsSummary = topics.map(t => {
            const startSec = timecodeToSeconds(t.startTime) || 0;
            const endSec = timecodeToSeconds(t.endTime) || 0;
            const dur = endSec - startSec;
            return `トピック${t.topicNumber}: ${t.startTime}〜${t.endTime}（${dur}秒）
  タイトル: ${t.topicTitle}
  開始セリフ: 「${t.startLine}」
  終了セリフ: 「${t.endLine}」
  概要: ${t.topicSummary}`;
        }).join('\n\n');

        const selectPrompt = `以下は動画の全トピック一覧です。この中から「バズる可能性が高い」切り抜きを5〜8件作成してください。

【トピック一覧】
${topicsSummary}

【タイムコード付き字幕（参照用）】
${correctedSubtitles}

━━━━━━━━━━━━━━━━━━━━━━━━━━
★★★ 尺のルール ★★★
━━━━━━━━━━━━━━━━━━━━━━━━━━
各クリップは **${clipLengthSeconds}秒前後** にすること（${minLength}秒〜${maxLength}秒）。

- トピックが短すぎる場合 → 隣接するトピックと結合して1つのクリップにする
- トピックが長すぎる場合 → そのトピック内の最も面白い部分を${clipLengthSeconds}秒分だけ切り出す
- 必ず endTimeの秒数 − startTimeの秒数 を計算し、${minLength}〜${maxLength}秒であること

━━━━━━━━━━━━━━━━━━━━━━━━━━
★★★ 開始・終了セリフのルール ★★★
━━━━━━━━━━━━━━━━━━━━━━━━━━

■ startLine（開始セリフ）:
- 完全な文であること
- 前の話の続きではないこと
- ✗ 悪い例：「なっています　なんと社会保障の」← 前文の続き
- ✗ 悪い例：「色々と言ってなんと通りました」← 何が通ったか分からない
- ✓ 良い例：「消費税は何に使われてるのか気になりますよね」← 独立した問いかけ
- ✓ 良い例：「実は消費税を上げると内閣が潰れるというジンクスがあるんです」← 独立した主張

■ endLine（終了セリフ）:
- 文が完結していること
- 話の結論・オチが含まれていること
- ✗ 悪い例：「何に使われているのかというのが最近SNSで」← 文が途中で切れている
- ✗ 悪い例：「確認が取れないようになってる　これが正解なのです　なので高市さんは嘘をついて」← 「嘘をついて」の後が続く
- ✓ 良い例：「本当に社会保障に使われているのかは確認できないのです」← 文が完結
- ✓ 良い例：「だから消費税は鬼門中の鬼門なんですね」← 結論で終わっている

【出力形式】
JSON配列のみ。
\`\`\`json
[
  {
    "startTime": "00:02:00",
    "endTime": "00:03:30",
    "durationSec": 90,
    "startLine": "クリップ開始の完全な文（字幕からそのままコピー）",
    "endLine": "クリップ終了の完全な文（字幕からそのままコピー・結論で終わる）",
    "theme": "バズりやすいタイトル",
    "summary": "この切り抜きの内容要約",
    "keyPoints": ["クリップ内の重要セリフ1", "重要セリフ2", "結論のセリフ（=endLine）"]
  }
]
\`\`\`

★ keyPointsの最後の要素は必ずendLineと一致すること（結論が含まれている確認のため）
★ durationSec = endTimeの総秒数 − startTimeの総秒数`;

        const selectResult = await generateText(selectPrompt, 0.3);

        // Parse selected clips
        let candidates: ClipCandidate[] = [];
        try {
            const jsonMatch = selectResult.match(/\[[\s\S]*\]/);
            if (jsonMatch) {
                candidates = JSON.parse(jsonMatch[0]);
            }
        } catch (parseErr) {
            console.error("Failed to parse clip candidates:", parseErr);
            return { success: true, data: selectResult };
        }

        if (!candidates || candidates.length === 0) {
            return { success: true, data: "条件に合致する切り抜き箇所は見つかりませんでした。" };
        }

        // Compute actual durations and build output
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

            processedCandidates.push({ ...c, durationSec: actualDuration, durationWarning });
        }

        if (processedCandidates.length === 0) {
            return { success: true, data: "タイムコードが正しい切り抜き候補が見つかりませんでした。" };
        }

        // Sort by startTime
        processedCandidates.sort((a, b) => {
            const aStart = timecodeToSeconds(a.startTime) || 0;
            const bStart = timecodeToSeconds(b.startTime) || 0;
            return aStart - bStart;
        });

        // Build Markdown
        let markdown = `**${processedCandidates.length} 件の切り抜き候補** が見つかりました（指定尺: ${clipLengthSeconds}秒前後）\n\n`;
        markdown += `> ※開始タイムコード、終了タイムコードにはズレが生じる場合があります。必ず自身で確認してください。\n\n`;
        markdown += `---\n\n`;

        processedCandidates.forEach((c, i) => {
            markdown += `## 切り抜き候補 ${i + 1}\n`;
            markdown += `- **開始タイムコード**: ${c.startTime}\n`;
            markdown += `- **終了タイムコード**: ${c.endTime}\n`;
            markdown += `- **推定尺**: ${c.durationSec}秒${c.durationWarning ? ` ${c.durationWarning}` : ''}\n`;
            markdown += `- **開始セリフ**: 「${c.startLine}」\n`;
            markdown += `- **終了セリフ**: 「${c.endLine}」\n`;
            markdown += `- **テーマ**: ${c.theme}\n`;
            markdown += `- **内容要約**: ${c.summary}\n`;
            if (c.keyPoints && c.keyPoints.length > 0) {
                markdown += `- **主要ポイント**:\n`;
                c.keyPoints.forEach(kp => {
                    markdown += `  - 「${kp}」\n`;
                });
            }
            markdown += `\n`;
        });

        return { success: true, data: markdown };
    } catch (e: any) {
        return { success: false, error: e.message || "切り抜き抽出エラー" };
    }
}
