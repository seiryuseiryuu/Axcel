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
    const minLength = clipLengthSeconds - 10;
    const maxLength = clipLengthSeconds + 10;

    const prompt = `あなたはYouTube動画の切り抜き編集のプロフェッショナルです。
以下のタイムコード付き字幕から、ショート動画として「バズる可能性が高い」切り抜き箇所を抽出してください。

【タイムコード付き字幕】
${correctedSubtitles}

━━━━━━━━━━━━━━━━━━━━━━━━━━
★★★ 最重要ルール1: 内容ベースで切り抜く ★★★
━━━━━━━━━━━━━━━━━━━━━━━━━━

字幕のタイムコードはあくまで「参考」です。タイムコードの区切りに合わせるのではなく、
**話の内容・意味の流れに合わせて** 開始・終了ポイントを決めてください。

【正しいやり方】
1. まず字幕の内容を通して読み、「ここからここまでが1つの完結した話題だ」という範囲を特定する
2. その話題が始まるセリフのタイムコードを startTime にする
3. その話題が完結するセリフのタイムコードを endTime にする
4. startLineには「その話題の最初のセリフ」、endLineには「その話題の最後のセリフ」を記載する

【間違ったやり方】
✗ 字幕の最初のタイムコードを機械的にstartTimeにする
✗ ちょうど良い秒数になるタイムコードを探してendTimeにする
✗ 話の途中で秒数が合うからといってそこで切る

━━━━━━━━━━━━━━━━━━━━━━━━━━
★★★ 最重要ルール2: 尺（クリップの長さ）★★★
━━━━━━━━━━━━━━━━━━━━━━━━━━

各クリップは **必ず${clipLengthSeconds}秒前後** にすること。

- 最低: ${minLength}秒
- 最大: ${maxLength}秒
- 目標: ${clipLengthSeconds}秒

【尺の計算方法】
endTimeの秒数 − startTimeの秒数 = クリップの尺
例: startTime "00:02:00"(120秒) → endTime "00:03:30"(210秒) → 尺 = 90秒 ✓
例: startTime "00:05:00"(300秒) → endTime "00:05:45"(345秒) → 尺 = 45秒 ✗ ← 短すぎ！

★ 出力前に必ず各クリップの尺を自分で計算し、${minLength}秒〜${maxLength}秒の範囲内であることを確認すること。
★ 尺が短い場合は、話題の範囲を広げて前後のセリフを含めること。
━━━━━━━━━━━━━━━━━━━━━━━━━━

【切り抜きポイントの選定基準】

■ 開始ポイント：
- その話題・主張が始まる最初のセリフから開始する
- 前の話題の最後のセリフは含めない
- 視聴者の興味を引くフック（問いかけ、意外な事実提示）があるとベスト

■ 終了ポイント：
- その話題の結論・まとめ・オチが言い終わったセリフで終了する
- 「〜ということです」「〜なんですよね」「〜わけです」のような結論の言葉の後で終わる
- ★★ 話題の結論が出る前に切るのは絶対禁止 ★★
- 次の話題の導入セリフは含めない

■ startLine / endLine の書き方：
- startLine: クリップの最初のセリフ（話題の導入部分）をそのまま記載
- endLine: クリップの最後のセリフ（話題の結論部分）をそのまま記載
- 字幕テキストをそのままコピーすること

■ 全体の構成：
- 1つの切り抜きで1つの完結した話題・主張が含まれること
- 前後の文脈なしで初見の視聴者が理解できること

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
    "startLine": "この話題の最初のセリフ",
    "endLine": "この話題の結論のセリフ",
    "theme": "テーマ見出し（バズりやすいタイトル風に）",
    "summary": "内容の要約"
  }
]
\`\`\`

★ durationSecは自分で計算した値を入れること（endTimeの総秒数 − startTimeの総秒数）
★ ${minLength}秒未満のクリップは出力禁止。話題の範囲を広げて調整すること。
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
