"use server";

import { generateText } from "@/lib/gemini";
import { fetchVideoData } from "@/lib/youtube";

// --- VSL ACTIONS ---

export async function analyzeVslStructure(url: string, productInfo: string) {
    // 1. Fetch Transcript
    const videoData = await fetchVideoData(url);
    if (!videoData.success) {
        return { success: false, error: videoData.error || "動画データの取得に失敗しました" };
    }

    const { title, description, transcript, hasTranscript } = videoData.data;

    if (!hasTranscript) {
        return { success: false, error: "動画の字幕（トランスクリプト）が取得できませんでした。字幕のある動画URLを指定してください。" };
    }

    const context = `
【参考動画情報】
タイトル: ${title}
説明: ${description}
字幕全文: ${transcript.slice(0, 50000)}

【販売したい商品情報】
${productInfo}
`;

    const prompt = `あなたは動画マーケティングのプロフェッショナルです。
以下の参考動画（VSL: Video Sales Letter）の構造を分析し、なぜ売れるのかを解明してください。

${context}

## 分析指示
この動画の「脚本構造」を詳細に分解してください。
視聴者が離脱せず、最後に購入に至るロジックを明らかにしてください。

# VSL構造分析

## 1. 全体構成概要
- **動画の長さ**: (文字数から推測)
- **構成パターン**: (PASONA、QUEST、ストーリー型など)

## 2. シーン別構成詳細
| 時間(目安) | フェーズ | 内容要約・役割 | 視聴者の心理状態 |
|:---|:---|:---|:---|
| 冒頭 | フック | ... | 「おっ、気になる」「自分に関係ある」 |
| ... | 問題提起 | ... | 「まさにその通りだ」「辛い」 |
| ... | 解決策 | ... | 「これならいけるかも」 |
| ... | オファー | ... | 「欲しい！」「今買わなきゃ」 |

## 3. 視聴維持（リテンション）の仕掛け
- 冒頭5秒でどうやって惹きつけているか？
- 途中での離脱を防ぐための工夫は？
`;

    try {
        const result = await generateText(prompt, 0.4);
        return { success: true, data: result };
    } catch (e: any) {
        return { success: false, error: e.message || "分析エラー" };
    }
}

export async function analyzeVslAudience(structureAnalysis: string) {
    const prompt = `あなたは凄腕の心理分析官です。
このVSL動画がターゲットにしている視聴者の心理を深掘りしてください。

【VSL構造分析】
${structureAnalysis}

## 分析指示
以下のフォーマットに従って、視聴者プロファイリングを出力してください。
各セクションを必ず含め、具体的かつ簡潔に記述すること。

# VSL視聴者プロファイリング

## 1. ターゲット属性（デモグラフィック）
- **年代**: （具体的な年齢層）
- **性別**: （比率の推定）
- **職業**: （具体的な職種を列挙）
- **ライフスタイル**: （箇条書きで3〜4項目）

## 2. 悩みと痛み（サイコグラフィック）
- **顕在的な悩み**:（口に出して言う悩みを「」付きで3〜5個列挙）
- **潜在的な恐怖**:（誰にも言えない不安を「」付きで3〜5個列挙）

## 3. 欲求レベル（Awareness Level）
このVSL動画が最も効果を発揮するターゲット層を以下から特定してください：
- **O1 (Unaware)**: 悩みにも気づいていない
- **O2 (Problem Aware)**: 悩みはあるが解決策を知らない
- **O3 (Solution Aware)**: 解決策は知っているが具体的方法を探している
- **O4 (Product Aware)**: 具体的な商品・サービスを比較検討中
- **O5 (Most Aware)**: すでに購入を決めかけている

**最も効果的な層**: （O2やO3など特定し、理由を説明）

## 4. 反応する「トリガー」
- **言葉**: （動画内の具体的なフレーズと、なぜそれが刺さるかを3〜5個）
- **映像**: （効果的な映像要素を3〜4個）

## 5. 表の顔と裏の顔（インサイト）

| 項目 | 表の顔（周囲に見せる姿） | 裏の顔（本音・インサイト） |
|:---|:---|:---|
| 自己認識 | （例: 向上心がある自分） | （例: 本当は自信がない） |
| お金 | （表の態度） | （本音） |
| 将来 | （表の態度） | （本音） |
| 行動 | （表の態度） | （本音） |

以上のフォーマットで出力してください。テーブルは上記の4行のみで完結させてください。追加の行は不要です。
`;

    try {
        const result = await generateText(prompt, 0.5, "gemini-2.0-flash", 3000);
        // Clean up any potential runaway output
        let cleanResult = result;
        // Detect and truncate if a table row pattern repeats excessively
        const lines = cleanResult.split('\n');
        const truncatedLines: string[] = [];
        let consecutivePipeLines = 0;
        for (const line of lines) {
            if (line.trim().startsWith('|') && line.trim().endsWith('|')) {
                consecutivePipeLines++;
                if (consecutivePipeLines > 10) continue; // Skip excessive table rows
            } else {
                consecutivePipeLines = 0;
            }
            truncatedLines.push(line);
        }
        cleanResult = truncatedLines.join('\n');
        return { success: true, data: cleanResult };
    } catch (e: any) {
        return { success: false, error: e.message || "視聴者分析エラー" };
    }
}

export async function analyzeVslDeep(structureAnalysis: string, audienceAnalysis: string) {
    const prompt = `このVSLの「売れるメカニズム」をさらに深掘りしてください。

${structureAnalysis}
${audienceAnalysis}

## 分析指示
なぜこの動画はコンバージョンするのか？その「仕掛け」を言語化してください。

# VSL詳細分析レポート

## 1. フック（Hook）の強さ
- 冒頭で「続きを見たくなる」強力なフックは何か？（意外性、共感、恐怖など）

## 2. 信じる理由（Reason Why）
- なぜ視聴者はこの商品を信頼するのか？（証拠、権威性、デモ映像など）

## 3. オファー（Offer）の魅力
- 単なる商品販売ではなく、どのような「断れないオファー（価格、特典、保証）」を提示しているか？

## 4. 行動喚起（CTA）
- どのような言葉で、視聴者の背中を押しているか？
`;

    try {
        const result = await generateText(prompt, 0.5);
        return { success: true, data: result };
    } catch (e: any) {
        return { success: false, error: e.message || "詳細分析エラー" };
    }
}

// --- STEP 5: Improvement Proposals ---
export async function analyzeVslImprovement(
    structureAnalysis: string,
    deepAnalysis: string,
    productInfo: string
) {
    const prompt = `あなたは動画プロデューサーです。
参考動画の良さを取り入れつつ、今回販売する商品「${productInfo.slice(0, 100)}...」に合わせて、
VSLスクリプトを最適化するための改善案を提案してください。

【参考動画の構造】
${structureAnalysis}

【詳細分析】
${deepAnalysis}

【今回の商品情報】
${productInfo}

## 提案指示
参考動画の「枠組み」は活用しつつ、今回の商品に合わせて内容を書き換える必要があります。
よりこの商品の魅力が伝わるようにするための、構成上の改善点やアレンジ案を出してください。

## 出力フォーマット（Markdown）

# VSL構成改善・アレンジ案

## 1. 構成の調整（Add/Delete）
- **[追加]**: (例：この商品ならではの実演シーンを追加すべき)
- **[変更]**: (例：体験談の尺を短くして、オファー部分を厚くする)

## 2. 映像演出の提案
- スクリプトだけでなく、どのような映像（B-roll）を使うべきか？

## 3. 推奨する最終スクリプト構成案（目次イメージ）
1. ...
2. ...
3. ...
`;

    try {
        const result = await generateText(prompt, 0.6);
        return { success: true, data: result };
    } catch (e: any) {
        return { success: false, error: e.message || "改善提案エラー" };
    }
}

export async function writeVslScript(
    structure: string,
    audience: string,
    deepAnalysis: string,
    improvement: string,
    productInfo: string
) {
    const prompt = `あなたは1億円売るVSLライターです。
以下の情報を元に、商品が飛ぶように売れる「最強のVSLスクリプト」を執筆してください。

【商品情報】
${productInfo}

【構成ベース】
${structure}

【ターゲット心理】
${audience}

【改善・構成案（これを最優先）】
${improvement}

## 執筆指示
- **【重要】「改善・構成案」で提案された最終構成に従って執筆してください。**
- 「ナレーション（音声）」と「映像指示（テロップ・B-roll）」を明確に分けて書いてください。
- 視聴者が飽きないように、リズムよく、感情に訴えかける言葉を選んでください。
- セールスライティングの技術（PASONA、QUESTなど）を駆使してください。

## 出力フォーマット（Markdown）

# VSL台本

| シーン | 映像・テロップ指示 | ナレーション（音声） |
|:---|:---|:---|
| 01 | （黒背景に白文字で）「警告！」<br>（不穏なBGM） | 「もしあなたが〇〇で悩んでいるなら、この動画を最後までみてください...」 |
| ... | ... | ... |
`;
    try {
        const result = await generateText(prompt, 0.7);
        return { success: true, data: result };
    } catch (e: any) {
        return { success: false, error: e.message || "執筆エラー" };
    }
}
