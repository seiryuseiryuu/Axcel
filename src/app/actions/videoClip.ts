"use server";

import { generateText } from "@/lib/gemini";
import { fetchVideoData } from "@/lib/youtube";

// --- VIDEO CLIP ACTIONS ---

export async function analyzeVideoTranscript(url: string) {
    const videoData = await fetchVideoData(url);
    if (!videoData.success) {
        return { success: false, error: videoData.error || "動画データの取得に失敗しました" };
    }

    const { title, description, transcript, hasTranscript } = videoData.data;

    if (!hasTranscript) {
        return { success: false, error: "動画の字幕（トランスクリプト）が取得できませんでした。字幕のある動画URLを指定してください。" };
    }

    return {
        success: true,
        data: {
            title,
            description,
            transcript: transcript.slice(0, 80000),
        }
    };
}

export async function extractHighlights(
    transcript: string,
    videoTitle: string,
    purpose: string,
    targetAudience: string,
    maxLength: number,
    clipCount: number
) {
    const prompt = `あなたはバイラルコンテンツの専門家です。
以下の長尺動画のトランスクリプトを分析し、ショート動画として切り抜いた場合にバズる可能性が高いポイントを特定してください。

【動画タイトル】
${videoTitle}

【トランスクリプト全文】
${transcript}

【切り抜きの目的】
${purpose}

【ターゲット層】
${targetAudience || "幅広い層"}

【最大長さ】
${maxLength}秒以内

## 分析指示
以下の4つの観点でハイライトを自動抽出してください：
1. **感情のピーク**（驚き/笑い/感動）- 視聴者の感情が大きく動く瞬間
2. **価値提供**（学び/気づき）- 「これは知らなかった！」と思わせる瞬間
3. **議論喚起**（コメントが集まりそう）- 意見が分かれるような発言
4. **シェア衝動**（誰かに伝えたくなる）- 思わず共有したくなる内容

## 出力フォーマット（Markdown）

# ハイライト分析結果

## 動画全体の傾向
- **テーマ**: (動画の主なテーマ)
- **トーン**: (真面目/エンタメ/教育的 等)
- **盛り上がりのパターン**: (どこで感情が動いているか)

## 検出されたハイライトポイント
各ハイライトについて以下を記載：

| # | タイムスタンプ(推定) | カテゴリ | バイラル度 | 内容要約 |
|---|---|---|---|---|
| 1 | XX:XX - XX:XX | 感情のピーク | ★★★★★ | ... |
| 2 | ... | ... | ... | ... |

※トランスクリプトの位置から時間を推定してください。
`;

    try {
        const result = await generateText(prompt, 0.4);
        return { success: true, data: result };
    } catch (e: any) {
        return { success: false, error: e.message || "ハイライト抽出エラー" };
    }
}

export async function proposeClips(
    highlights: string,
    videoTitle: string,
    platform: string,
    purpose: string,
    targetAudience: string,
    maxLength: number,
    clipCount: number
) {
    const platformSpecs: Record<string, string> = {
        tiktok: "TikTok（15〜60秒、縦型9:16）",
        shorts: "YouTube Shorts（60秒以内、縦型9:16）",
        reels: "Instagram Reels（15〜90秒、縦型9:16）"
    };

    const prompt = `あなたはショート動画のプロデューサーです。
ハイライト分析結果を元に、最もバズる可能性が高い切り抜きクリップを${clipCount}本提案してください。

【動画タイトル】
${videoTitle}

【ハイライト分析】
${highlights}

【投稿先プラットフォーム】
${platformSpecs[platform] || platform}

【切り抜きの目的】
${purpose}

【ターゲット層】
${targetAudience || "幅広い層"}

【最大長さ】
${maxLength}秒以内

## 提案指示
各クリップについて、以下の情報を含めてください：

## 出力フォーマット（Markdown）

# 切り抜きクリップ提案（${clipCount}本）

${Array.from({ length: clipCount }, (_, i) => `
## クリップ ${i + 1}

### 基本情報
- **バイラル度**: ★★★★★（5段階評価）
- **推定再生数**: XX万回
- **タイムスタンプ**: XX:XX - XX:XX
- **長さ**: XX秒

### コンテンツ
- **タイトル案**: (${platformSpecs[platform] || platform}に最適化)
- **キャプション案**: (ハッシュタグ付き)
- **選定理由**: (なぜこのクリップがバズるのか)

### 編集指示
- **フック（冒頭3秒）**: (視聴者を引き留める最初の一言/シーン)
- **テロップ案**: (入れるべき字幕テキスト)
- **BGM提案**: (雰囲気に合うBGMジャンル)
- **エフェクト**: (推奨する視覚効果)
`).join("\n")}
`;

    try {
        const result = await generateText(prompt, 0.5);
        return { success: true, data: result };
    } catch (e: any) {
        return { success: false, error: e.message || "クリップ提案エラー" };
    }
}

export async function generateEditInstructions(
    selectedClips: string,
    videoTitle: string,
    platform: string
) {
    const prompt = `あなたは動画編集ディレクターです。
選択されたクリップの詳細な編集指示書を作成してください。

【動画タイトル】
${videoTitle}

【選択されたクリップ】
${selectedClips}

【プラットフォーム】
${platform}

## 指示
各クリップについて、実際に編集作業を行うための詳細なタイムライン指示書を作成してください。

## 出力フォーマット（Markdown）

# 編集指示書

## 共通設定
- **アスペクト比**: 9:16（縦型）
- **解像度**: 1080 x 1920
- **フレームレート**: 30fps

## クリップ別編集タイムライン

### クリップ 1
| 秒数 | 映像 | テロップ | 音声/BGM | エフェクト |
|---:|:---|:---|:---|:---|
| 0-3 | フック映像 | 「衝撃の一言」 | ドラマチックBGM Start | ズームイン |
| 3-10 | ... | ... | ... | ... |
| ... | ... | ... | ... | ... |

### 字幕スタイル指定
- フォント: (推奨フォント)
- サイズ: (推奨サイズ)
- 色: (推奨色)
- 位置: (画面のどこに配置)

### サムネイル案
- メインビジュアル案
- テキスト案
`;

    try {
        const result = await generateText(prompt, 0.5);
        return { success: true, data: result };
    } catch (e: any) {
        return { success: false, error: e.message || "編集指示書エラー" };
    }
}
