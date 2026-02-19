"use server";

import { generateText } from "@/lib/gemini";
import { fetchWebContent } from "@/lib/webScraper";

// --- STEP 2: LP Structure Analysis ---
export async function analyzeLpStructure(url: string, productInfo: string) {
    // 1. Fetch content
    const webData = await fetchWebContent(url);
    if (!webData.success || !webData.content) {
        return { success: false, error: webData.error || "URLからの情報取得に失敗しました" };
    }

    const context = `
【参考LP情報】
URL: ${url}
タイトル: ${webData.title || '（なし）'}
本文: ${webData.content.slice(0, 30000)}

【作成する商品情報】
${productInfo}
`;

    const prompt = `あなたは世界最高峰のLP構成作家です。
以下の「参考LP」を詳細に分析し、その「売れている構造」を完全に分解してください。
そして、その構造を「作成する商品」にどう応用できるか思考してください。

${context}

## 分析指示
参考LPのセクション構成を以下のマークダウン形式で分解してください。

# 構成分析レポート

## 1. ファーストビュー(FV)分析
- **キャッチコピー**: (実際のコピー)
- **訴求要素**: (実績、権威性、ベネフィットなど何を強調しているか)
- **メインビジュアル要素**: (何を見せているか)

## 2. 全体構成フロー
| セクション | 役割 | 実際の内容・訴求 |
|:---|:---|:---|
| 導入 | 共感・問題提起 | ... |
| 本論 | 解決策提示 | ... |
| ... | ... | ... |

## 3. このLPが売れている理由（仮説）
- ターゲットのどの心理を突いているか？
- 競合と何が違うか？
`;

    try {
        const result = await generateText(prompt, 0.4);
        return { success: true, data: result };
    } catch (e: any) {
        return { success: false, error: e.message || "構成分析エラー" };
    }
}

// --- STEP 3: Target & Emotional Analysis ---
export async function analyzeLpCustomer(structureAnalysis: string) {
    const prompt = `あなたは天才的なマーケターです。
以下のLP構成分析を見て、このLPがターゲットにしている「顧客」の心理変化を分析してください。

【LP構成分析】
${structureAnalysis}

## 分析指示
このLPを読んでいるターゲットの「感情の動き（感情曲線）」を詳細に分析してください。
各セクションで読者がどのような感情になり、次のセクションへ読み進めているのかを言語化してください。

## 出力フォーマット（Markdown）

# 想定顧客・感情分析

## 1. ターゲット属性
- **レベル感**: (超初心者 / 初心者 / 中級者 / 上級者)
- **デモグラフィック**: (年代、性別、職業など推定)

## 2. 感情曲線（Emotional Curve）
| セクション | 参考LPの内容概要 | 読者の感情変化（心の声） |
|:---|:---|:---|
| FV | ... | 「おっ、これは自分のことだ」「本当かな？」 |
| ... | ... | ... |
| クロージング | ... | 「今すぐやらないと損だ」「これなら信じられる」 |

## 3. 抱えている「痛み」と「悩み」
- **表面的な悩み**: 
- **真の悩み（インサイト）**: 

## 4. 購入のハードル（心理的障壁）
- 
`;

    try {
        const result = await generateText(prompt, 0.5);
        return { success: true, data: result };
    } catch (e: any) {
        return { success: false, error: e.message || "顧客分析エラー" };
    }
}

// --- STEP 4: Product Hearing (Chat) ---
export async function generateHearingQuestion(
    currentInfo: string,
    history: { role: 'user' | 'model', text: string }[]
) {
    const historyText = history.map(h => `${h.role === 'user' ? 'ユーザー' : 'AI'}: ${h.text}`).join('\n');

    const prompt = `あなたはプロのセールスライターです。
ユーザーから「新しく作成する商品・サービス」の情報を引き出すために、ヒアリングを行っています。
最終的に「誰に」「何を」「どのように」売るかを明確にし、売れるLPを作るための材料を集めるのが目的です。

【現在の既知情報】
${currentInfo}

【会話履歴】
${historyText}

## 指示
ユーザーに対して、**1つだけ**質問をしてください。
商品の特徴、ターゲットの悩み、既存客の声、価格設定、競合との違いなど、LP作成に不可欠だがまだ足りない情報を聞いてください。
もし十分な情報が集まったと判断したら、「[完了]」と文頭につけて、最後にまとめの言葉を述べてください。

質問は簡潔に、答えやすくしてください。
`;

    try {
        const result = await generateText(prompt, 0.7);
        return { success: true, data: result };
    } catch (e: any) {
        return { success: false, error: e.message || "ヒアリング生成エラー" };
    }
}

// --- STEP 4: Deep Analysis ---
export async function analyzeLpDeep(structureAnalysis: string, customerAnalysis: string) {
    const prompt = `あなたはDRM（ダイレクト・レスポンス・マーケティング）の専門家です。
「構成」と「顧客」の心理から、さらに踏み込んで「売れる仕掛け」を分析してください。

【構成分析】
${structureAnalysis}

【顧客分析】
${customerAnalysis}

## 分析指示
以下の4つの観点で「売れる理由」を言語化してください。

## 出力フォーマット（Markdown）

# 詳細戦略レポート

## 1. オファーの強さ（The Offer）
- 価格以外の特典、保証、限定性はどうなっているか？
- 顧客にとって「断れないオファー」になっているか？

## 2. 証拠と信頼（Proof & Trust）
- どのような証拠（権威、実績、データ、お客様の声）を使っているか？
- それはターゲットにとって信憑性があるか？

## 3. CTAの誘導設計
- どのタイミングでオファーを提示しているか？
- マイクロコピー（ボタン周りの文言）の工夫は？

## 4. 改善の余地（Opportunity）
- このLPに足りない要素、もっと良くできるポイントはどこか？
`;

    try {
        const result = await generateText(prompt, 0.5);
        return { success: true, data: result };
    } catch (e: any) {
        return { success: false, error: e.message || "詳細分析エラー" };
    }
}

// --- STEP 5: Improvement Proposals ---
export async function analyzeLpImprovement(
    structureAnalysis: string,
    deepAnalysis: string,
    productInfo: string
) {
    const prompt = `あなたは世界最高峰のLP構成作家です。
参考LPの良さを取り入れつつ、今回の商品に合わせてLPを最適化するための改善案を提案してください。

【参考LPの構造】
${structureAnalysis}

【詳細分析】
${deepAnalysis}

【今回の商品情報】
${productInfo}

## 提案指示
想定顧客のレベル感・悩み・購入障壁に対して、参考LPで網羅されていない部分を提案してください。

## 出力フォーマット（Markdown）

# LP構成改善・アレンジ案

## 1. 付け加える内容（10個）
1. ...
2. ...
（以下10個）

## 2. 削除/改善する内容（10個）
1. ...
2. ...
（以下10個）

## 3. ファーストビュー改善案
- 3秒以内に離脱を防ぐための改善ポイント

## 4. CTA配置戦略
- 複数箇所に設置すべきCTAの配置案

## 5. FAQ設計
- 購入障壁を全て除去するためのFAQ案

## 6. 推奨する最終LP構成案（目次イメージ）
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

// --- STEP 6: Write LP Copy ---
export async function writeLpCopy(
    structure: string,
    customer: string,
    deepAnalysis: string,
    improvement: string,
    productInfo: string
) {
    const prompt = `あなたは伝説のセールスライターです。
分析した「売れる構造」と「ターゲット心理」を元に、新しい商品のLP原稿を執筆してください。

【商品情報】
${productInfo}

【参考にする構造】
${structure}

【ターゲット心理】
${customer}

【戦略指針】
${deepAnalysis}

【改善・構成案（これを最優先）】
${improvement}

## 執筆指示
- **【重要】「改善・構成案」で提案された最終構成に従って執筆してください。**
- LPの全セクションの原稿を書いてください。
- PASONAの法則（問題→親近感→解決策→提案→絞り込み→行動）を意識しつつ、参考LPの良い構造を取り入れてください。
- ファーストビューで3秒以内に離脱を防ぐ設計にしてください。
- CTAは複数箇所に設置してください。
- FAQで購入障壁を全て除去してください。
**注意：商品情報は「${productInfo}」の内容を厳守してください。架空の実績など嘘は書かないでください。**

## 出力フォーマット（Markdown）

# LP構成案：(商品名)

## 【セクション1: ファーストビュー】
- **キャッチコピー**: (ターゲットの目を引く強力な一言)
- **サブコピー**: (ベネフィットの補足)
- **メインビジュアル案**: (何を見せるか)
- **CTAボタン文言**:

## 【セクション2: 問題提起】
- **見出し**:
- **本文**: (ターゲットの悩みに寄り添うコピー)

## 【セクション3: 解決策】
- **見出し**:
- **商品紹介**: (商品がなぜ解決できるのか)

## 【セクション4: ベネフィット】
- ベネフィット1:
- ベネフィット2:
- ベネフィット3:

## 【セクション5: 実績/証明】
(※プレースホルダーとして記載、または商品情報にあれば記載)

## 【セクション6: お客様の声】3件

## 【セクション7: 料金プラン】
- **商品名**:
- **価格表示**:
- **特典**:

## 【セクション8: FAQ】3問

## 【セクション9: 最終CTA】
- **不安払拭**: (保証)
- **追伸**: (最後のひと押し)
- **最終CTA文言**:

## CTAバリエーション5案
1. ...
2. ...
3. ...
4. ...
5. ...
`;

    try {
        const result = await generateText(prompt, 0.7);
        return { success: true, data: result };
    } catch (e: any) {
        return { success: false, error: e.message || "ライティングエラー" };
    }
}
