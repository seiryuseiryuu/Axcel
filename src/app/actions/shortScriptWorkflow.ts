"use server";

import { generateText, generateWithYouTube } from "@/lib/gemini";
import { fetchVideoData } from "@/lib/youtube";

/**
 * STEP 2: Analyze Short Video Structure
 */
export async function analyzeShortStructure(referenceUrl: string, platform: string) {
    try {
        const videoData = await fetchVideoData(referenceUrl);
        let videoContext = `【参考動画URL】${referenceUrl}\nプラットフォーム: ${platform}`;
        let originalTranscript = "";

        if (videoData.success && videoData.data) {
            const { title, description, transcript, hasTranscript } = videoData.data;
            if (hasTranscript && transcript) {
                originalTranscript = transcript;
                videoContext += `\nタイトル: ${title}\n概要: ${description}\n\n【字幕データ】\n${transcript}`;
            } else {
                videoContext += `\nタイトル: ${title}\n概要: ${description}\n（字幕取得失敗）`;
            }
        }

        const prompt = `あなたはショート動画専門の構成作家です。以下の${platform}動画を分析し、構成を分解してください。
ショート動画は「冒頭1秒のフック」が全てです。その点に注目して分析してください。

${videoContext}

## 分析フォーマット（Markdown）

# ショート動画構成分析

## 1. 構成タイムライン（推定）
| 時間 | セクション | 内容・発言 | 視覚演出（推測） |
|:---|:---|:---|:---|
| 0:00-0:03 | **フック** | （視聴者の手を止めさせた一言） | （テロップ・動き） |
| 0:03-0:xx | **問題提起** | | |
| ... | **メイン/解決策** | | |
| ... | **CTA** | | |

## 2. 視聴維持の仕掛け
- **ビジュアルフック**: 冒頭で何を見せて目を引いたか
- **聴覚フック**: 最初の音声・BGM・SE
- **テンポ感**: カット割り頻度など

## 3. この動画の勝ちパターン要約
（例：あるある共感型で、冒頭に意外なオチを見せてから過程を見せる手法）`;

        const result = await generateWithYouTube(prompt, referenceUrl, 0.3);
        return { success: true, data: result, transcript: originalTranscript };
    } catch (e: any) {
        return { success: false, error: e.message || "構成分析エラー" };
    }
}

/**
 * STEP 3: Analyze Short Viewer (Scroll Stopping Psychology)
 */
export async function analyzeShortViewer(structureAnalysis: string, platform: string) {
    const prompt = `あなたはSNSマーケティングのプロです。${platform}の視聴者心理を分析します。
ショート動画は「スワイプされるか、見られるか」が0.5秒で決まります。

【分析対象の構成】
${structureAnalysis}

## 分析項目

1. **スクロールを止めた心理的トリガー**
   - なぜ視聴者はこの動画で指を止めたのか？（違和感？衝撃？共感？エロ？可愛さ？）

2. **視聴者の詳細属性**
   - 年代、性別、リテラシーレベル（超初心者〜上級者）
   - その人が抱えている「言語化できていない悩み」

3. **視聴維持の理由（Why Watched?）**
   - 途中で離脱しなかった理由（期待感の持続方法）

## 出力形式
Markdown形式で、具体的かつ辛口に分析してください。`;

    try {
        const result = await generateText(prompt, 0.4);
        return { success: true, data: result };
    } catch (e: any) {
        return { success: false, error: e.message || "視聴者分析エラー" };
    }
}

/**
 * STEP 5: Generate Improvement Suggestions for Shorts
 */
export async function generateShortImprovements(structureAnalysis: string, viewerNeeds: string, platform: string) {
    const prompt = `あなたはバズるショート動画のプロデューサーです。
分析した動画を元に、さらに反応率を高めるための「改善案」を提案してください。
プラットフォーム: ${platform}（縦型・短尺・倍速視聴文化）

【分析データ】
${structureAnalysis}
${viewerNeeds}

## 提案指令
視聴者の「手」を止め、最後まで見させ、アクション（いいね・保存）させるための改善案を5つ出してください。
「内容のこと」だけでなく「演出（カット、音、テロップ）」の改善案も含めてください。

## 出力形式（JSON）
\`\`\`json
{
  "improvements": [
    {
      "type": "add",
      "section": "冒頭フック",
      "content": "具体的な改善案・演出指示",
      "reason": "なぜこれで再生数が伸びるのか"
    },
    ...
  ]
}
\`\`\`
`;
    try {
        const result = await generateText(prompt, 0.7);
        const match = result.match(/\{[\s\S]*\}/);
        return { success: true, data: match ? match[0] : result };
    } catch (e: any) {
        return { success: false, error: e.message || "改善提案エラー" };
    }
}

/**
 * STEP 6: Write Short Script
 */
export async function writeShortScript(
    structure: string,
    improvements: any[],
    channelStyle: any,
    theme: string,
    platform: string
) {
    let styleContext = "";
    if (channelStyle && channelStyle.tone) {
        styleContext = `
【チャンネルのトーン（厳守）】
一人称: ${channelStyle.firstPerson}
語尾: ${channelStyle.endings?.join(", ")}
雰囲気: ${channelStyle.tone}
`;
    }

    const prompt = `あなたは${platform}の一流クリエイターです。
以下の情報を元に、バズるショート動画の完全台本を作成してください。
「視聴維持率」と「エンゲージメント（保存・コメント）」を最大化することが目的です。

【テーマ】${theme}

【構成ベース】
${structure}

【採用する改善案】
${JSON.stringify(improvements)}

${styleContext}

## 台本作成ルール
1. **尺**: 60秒以内に収めること（文字数目安：300文字前後）
2. **冒頭**: 最初の3秒で「結論」「衝撃」「共感」のいずれかを提示
3. **テンポ**: 無駄な繋ぎ言葉（えー、あー）は削除
4. **指示**: 撮影時のカメラワークやテロップ指示を入れる

## 出力形式（Markdown）

# ${theme}（ショート台本）

## 1. キャプション案
（ハッシュタグ5個以上含む）

## 2. 台本タイムライン
| 秒数 | シーン/視覚演出 | ナレーション・セリフ | テロップ・字幕文字 |
|:---|:---|:---|:---|
| 0:00-0:02 | （顔アップ etc） | 「〇〇って知ってますか？」 | 衝撃の事実！ |
| ... | ... | ... | ... |

## 3. 撮影・編集指示
- **BGM**: （曲の雰囲気やBPM）
- **カット割り**: （早め/ゆったり）
- **演出**: （具体的な指示）
`;

    try {
        const result = await generateText(prompt, 0.7);
        return { success: true, data: result };
    } catch (e: any) {
        return { success: false, error: e.message || "台本作成エラー" };
    }
}
