"use server";

import { generateText } from "@/lib/gemini";
import { fetchWebContent } from "@/lib/webScraper";

// Common logic reuse is possible, but for distinct prompt tuning, I keep separate files.

// --- STEP 2: Sales Letter Structure Analysis ---
export async function analyzeSalesStructure(url: string, productInfo: string) {
    let content = "";
    if (url.startsWith("http")) {
        const webData = await fetchWebContent(url);
        if (!webData.success) return { success: false, error: webData.error };
        content = webData.content || "";
    } else {
        content = url; // Treat as raw text if not URL
    }

    const context = `
【参考レター（またはテキスト）】
${content.slice(0, 30000)}

【商品情報】
${productInfo}
`;

    const prompt = `あなたは「セールスレター」の分析プロフェッショナルです。
以下の参考レターを分析し、どのような「説得の構成（ストーリー）」で書かれているか分解してください。

${context}

## 分析指示
このレターの「感情の動き」と「論理の展開」を追ってください。
以下のマークダウン形式で出力してください。

# セールスレター構成分析

## 1. ヘッドライン分析
- **強烈なフック**: 読者を一瞬で掴んだ言葉は？
- **オープニング**: どのような物語や悩みから入っているか？

## 2. ストーリーボード（展開）
| フェーズ | 役割 | 実際の内容 |
|:---|:---|:---|
| 問題提起 | 痛みの共有 | ... |
| 原因解明 | なぜ今までダメだったか | ... |
| 解決策 | 新しい発見/メソッド | ... |
| オファー | 商品提示 | ... |
| クロージング | 行動喚起 | ... |

## 3. 使用されているフレームワーク推定
(PASONA, QUEST, PASなど、どの型に近いか)
`;

    try {
        const result = await generateText(prompt, 0.4);
        return { success: true, data: result };
    } catch (e: any) {
        return { success: false, error: e.message || "分析エラー" };
    }
}

// --- STEP 3: Customer Analysis ---
export async function analyzeSalesCustomer(structureAnalysis: string) {
    const prompt = `あなたは心理カウンセラー兼コピーライターです。
このセールスレターを読む人が抱えている「誰にも言えない悩み」や「深い絶望」、そして「希望」を読み解いてください。

【レター構成分析】
${structureAnalysis}

## 分析指示
ターゲットの感情曲線を分析してください。

# 読者プロファイリング

## 1. 読む前の心理状態
- 絶望度: (どのくらい追い詰められているか)
- 疑い: (「また騙されるのでは？」という警戒心)

## 2. 刺さる感情トリガー
- 恐怖 (Fear):
- 欲求 (Greed):
- 自尊心 (Vanity):
- 好奇心 (Curiosity):

## 3. このレターが解決すると約束している「未来」
- 機能的な解決だけでなく、感情的な救済（例：自信を取り戻す）は何か？
`;

    try {
        const result = await generateText(prompt, 0.5);
        return { success: true, data: result };
    } catch (e: any) {
        return { success: false, error: e.message || "顧客分析エラー" };
    }
}

// --- STEP 4: Deep Analysis ---
export async function analyzeSalesDeep(structureAnalysis: string, customerAnalysis: string) {
    const prompt = `売れるセールスレターの「メカニズム」を解明してください。
文章だけで人を動かすための「レトリック」や「心理技術」を特定します。

${structureAnalysis}
${customerAnalysis}

## 分析指示

# レトリック詳細分析

## 1. 信頼構築のメカニズム
- なぜ書き手を信用してしまうのか？（自己開示、失敗談、共通の敵の設定など）

## 2. 反論処理（Objection Handling）
- 「高い」「時間がない」「自分には無理」という反論をどう封じ込めているか？

## 3. オファーの魅力付け
- 商品を単なるモノではなく「人生を変える機会」としてどう演出しているか？

## 4. 緊急性・限定性
- 「今すぐ」行動しなければならない理由付けは？
`;

    try {
        const result = await generateText(prompt, 0.5);
        return { success: true, data: result };
    } catch (e: any) {
        return { success: false, error: e.message || "詳細分析エラー" };
    }
}

// --- STEP 6: Write Sales Letter ---
export async function writeSalesLetter(
    structure: string,
    customer: string,
    deepAnalysis: string,
    productInfo: string
) {
    const prompt = `あなたは1本で1億円を売り上げる伝説のセールスコピーライターです。
分析結果を元に、読む人の心を鷲掴みにし、行動させずにはいられない「情熱的なセールスレター」を書いてください。

【商品情報】
${productInfo}

【構成ベース】
${structure}

【ターゲット心理】
${customer}

## 執筆マインドセット
- **One to One**: 大衆に向けてではなく、「たった一人の悩み苦しむ友人」に手紙を書くように。
- **感情7割・論理3割**: 人は感情で買い、理屈で正当化する。感情を揺さぶれ。
- **リズム**: 読みやすい改行、リズム感のある文体を意識して。

## 出力フォーマット（Markdown）

# セールスレター原稿

## 【ヘッドライン部分】
- **プリヘッド**:
- **メインヘッド**: (衝撃的かつベネフィットのある言葉)
- **サブヘッド**:

## 【オープニング：共感と問題提起】
(ここから本文...「親愛なるあなたへ」など)

## 【ストーリー：発見と解決】
(私がこの方法を見つけるまでの物語、または顧客の実例)

## 【メカニズム：なぜ効くのか】
(独自メソッドの秘密、証拠)

## 【オファー：提案】
(商品の全貌、特典、価格の提示)
「今日、あなたに提案したいのは...」

## 【リスクリバーサル：保証】
(返金保証など)

## 【クロージング：決断の時】
(2つの道がある... 元の生活に戻るか、新しい人生を手に入れるか)

## 【P.S.：追伸】
(最後のまとめと緊急性)
`;

    try {
        const result = await generateText(prompt, 0.7);
        return { success: true, data: result };
    } catch (e: any) {
        return { success: false, error: e.message || "ライティングエラー" };
    }
}
