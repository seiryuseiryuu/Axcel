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

// --- STEP 3: Customer Analysis ---
export async function analyzeLpCustomer(structureAnalysis: string) {
    const prompt = `あなたは天才的なマーケターです。
以下のLP構成分析を見て、このLPがターゲットにしている「顧客」をプロファイリングしてください。

【LP構成分析】
${structureAnalysis}

## 分析指示
このLPに反応してしまう顧客の「深層心理」「痛み」「欲望」を言語化してください。

## 出力フォーマット（Markdown）

# 想定顧客プロファイリング

## 1. ターゲット属性
- **レベル感**: (超初心者 / 初心者 / 中級者 / 上級者)
- **デモグラフィック**: (年代、性別、職業など推定)

## 2. 抱えている「痛み」と「悩み」
- **表面的な悩み**: (例：痩せたい)
- **真の悩み（インサイト）**: (例：同窓会で馬鹿にされたくない、夫を見返したい)

## 3. 購入のハードル（心理的障壁）
- (例：過去に騙された経験、高額への不安、自分にできるかという疑い)

## 4. このLPが刺さる理由
- なぜこのターゲットはこの構成に反応するのか？
`;

    try {
        const result = await generateText(prompt, 0.5);
        return { success: true, data: result };
    } catch (e: any) {
        return { success: false, error: e.message || "顧客分析エラー" };
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

// --- STEP 6: Write LP Copy ---
export async function writeLpCopy(
    structure: string,
    customer: string,
    deepAnalysis: string,
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

## 執筆指示
LPの全セクションの原稿を書いてください。
PASONAの法則（問題→親近感→解決策→提案→絞り込み→行動）を意識しつつ、参考LPの良い構造を取り入れてください。
**注意：商品情報は「${productInfo}」の内容を厳守してください。架空の実績など嘘は書かないでください。**

## 出力フォーマット（Markdown）

# LP構成案：(商品名)

## 【FV】ファーストビュー
- **キャッチコピー**: (ターゲットの目を引く強力な一言)
- **サブコピー**: (ベネフィットの補足)
- **CTAボタン文言**:

## 【Body】本文セクション

### 1. 共感・問題提起
(ターゲットの悩みに寄り添うコピー)

### 2. 解決策の提示
(商品がなぜ解決できるのか、独自の強み)
- ベネフィット1:
- ベネフィット2:
- ベネフィット3:

### 3. 社会的証明（実績・お客様の声）
(※プレースホルダーとして記載、または商品情報にあれば記載)

### 4. オファー（商品内容・価格）
- **商品名**:
- **価格表示**:
- **特典**:

## 【Closing】クロージング
- **不安払拭**: (Q&Aや保証)
- **追伸**: (最後のひと押し)
- **最終CTA**:
`;

    try {
        const result = await generateText(prompt, 0.7);
        return { success: true, data: result };
    } catch (e: any) {
        return { success: false, error: e.message || "ライティングエラー" };
    }
}
