"use server";

import { generateText } from "@/lib/gemini";
import { fetchWebContent } from "@/lib/webScraper";

// --- NOTE ACTIONS ---

// Note Types mapping for context
const NOTE_TYPES = {
    free: "無料記事（フォロワー獲得・信頼構築）",
    paid: "有料記事（収益化・価値提供）"
};

const NOTE_CATEGORIES = {
    experience: "体験談・エッセイ（共感・ストーリー）",
    howto: "ノウハウ・ハウツー（再現性・手順）",
    lecture: "講座・教育（体系的学習）",
    summary: "情報共有・まとめ（利便性）",
    review: "レビュー・分析（評価・根拠）"
};

export async function analyzeNoteStructure(url: string, type: string, category: string, theme: string) {
    // Fetch content
    const webData = await fetchWebContent(url);
    if (!webData.success) {
        return { success: false, error: webData.error || "記事の取得に失敗しました" };
    }

    const context = `
【参考note記事】
URL: ${url}
タイトル: ${webData.title}
本文: ${webData.content?.slice(0, 30000)}

【作成したい記事の方向性】
タイプ: ${NOTE_TYPES[type as keyof typeof NOTE_TYPES] || type}
カテゴリ: ${NOTE_CATEGORIES[category as keyof typeof NOTE_CATEGORIES] || category}
テーマ: ${theme}
`;

    const prompt = `あなたはnoteの編集長であり、バズライターです。
以下の参考記事を分析し、その「読まれる構造」を分解してください。

${context}

## 分析指示
note独自の文化（スキ誘導、マガジン、ハッシュタグなど）も考慮して分析してください。

# note記事構成分析

## 1. タイトル＆導入分析
- **タイトル**: どんな要素（数字、意外性、ベネフィット）が入っているか
- **アイキャッチ**: （推測で可）どんな画像を想定しているか
- **導入文（リード）**: 最初の3行でどう読者を惹きつけているか？

## 2. 本文構成フロー（目次）
| セクション | 役割 | 内容要約 |
|:---|:---|:---|
| 導入 | フック | ... |
| 本論1 | ... | ... |
| 本論2 | ... | ... |
| 結論 | まとめ | ... |

## 3. note独自の仕掛け
- **スキ誘導**: どのタイミングで、どのように「スキ」を求めているか
- **有料エリア（ある場合）**: どこから有料にしているか、その引きは？
`;

    try {
        const result = await generateText(prompt, 0.4);
        return { success: true, data: result };
    } catch (e: any) {
        return { success: false, error: e.message || "分析エラー" };
    }
}

export async function analyzeNoteReader(structureAnalysis: string) {
    const prompt = `あなたはnoteの読者心理分析官です。
この構成の記事を読む読者のペルソナとインサイトを分析してください。

【構成分析】
${structureAnalysis}

## 分析指示

# note読者プロファイリング

## 1. 読者のレベル感
(超初心者〜上級者)

## 2. 検索意図とインサイト
- なぜGoogle検索やSNS経由でこの記事にたどり着いたのか？
- 「知りたい」の奥にある「なりたい」姿は？

## 3. noteならではの空気感への期待
- 商業的な文章より「個人の想い」を求めているのか、純粋な「情報」を求めているのか？
`;

    try {
        const result = await generateText(prompt, 0.5);
        return { success: true, data: result };
    } catch (e: any) {
        return { success: false, error: e.message || "読者分析エラー" };
    }
}

export async function analyzeNoteDeep(structureAnalysis: string, readerAnalysis: string, category: string) {
    const categoryName = NOTE_CATEGORIES[category as keyof typeof NOTE_CATEGORIES] || category;

    const prompt = `このnote記事の価値の源泉を深掘り分析してください。
カテゴリは「${categoryName}」です。

${structureAnalysis}
${readerAnalysis}

## 分析指示
カテゴリ「${categoryName}」において、この記事が評価される理由を特定してください。
（例：体験談なら「失敗の赤裸々さ」、ノウハウなら「画像による分かりやすさ」など）

# 詳細分析レポート

## 1. コンテンツの核（Core Value）
- この記事が提供する最大の価値は何か？

## 2. 信頼性・説得力の担保
- どうやって「本当のことだ」と信じさせているか？

## 3. エンゲージメントの仕掛け
- 読者がコメントやシェアをしたくなるポイントは？
`;

    try {
        const result = await generateText(prompt, 0.5);
        return { success: true, data: result };
    } catch (e: any) {
        return { success: false, error: e.message || "詳細分析エラー" };
    }
}

// --- STEP 5: Improvement Proposals ---
export async function analyzeNoteImprovement(
    structureAnalysis: string,
    deepAnalysis: string,
    theme: string,
    category: string
) {
    const categoryName = NOTE_CATEGORIES[category as keyof typeof NOTE_CATEGORIES] || category;

    const prompt = `あなたは敏腕編集者です。
分析した「参考記事の構造」と「売れる要素」を元に、今回作成する記事（テーマ：${theme}）をさらに良くするための改善案を提案してください。

【参考記事の構造】
${structureAnalysis}

【詳細分析】
${deepAnalysis}

## 提案指示
参考記事の良さを取り入れつつ、今回のテーマ「${theme}」に合わせて、
「追加すべき要素」と「削除・変更すべき要素」を具体的に提案してください。
カテゴリ「${categoryName}」に適した構成にブラッシュアップすることが目的です。

## 出力フォーマット（Markdown）

# 構成改善・ブラッシュアップ案

## 1. 構成の調整（Add/Delete）
- **[追加]**: (例：初心者向けの用語解説セクションを追加すべき)
- **[削除]**: (例：個人的な長すぎるエピソードは短縮・カット)

## 2. オリジナリティの付加
- 競合と差別化するために、どのような「独自の視点」や「体験」を入れるべきか？

## 3. 推奨する最終記事構成案（目次イメージ）
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

export async function writeNoteArticle(
    structure: string,
    reader: string,
    deepAnalysis: string,
    improvement: string, // Added argument
    inputData: { type: string; category: string; theme: string; target?: string }
) {
    const categoryName = NOTE_CATEGORIES[inputData.category as keyof typeof NOTE_CATEGORIES] || inputData.category;
    const typeName = NOTE_TYPES[inputData.type as keyof typeof NOTE_TYPES] || inputData.type;

    const prompt = `あなたは「スキ」が止まらない人気noterです。
以下の情報を元に、新しいnote記事を執筆してください。

【作成条件】
- テーマ: ${inputData.theme}
- タイプ: ${typeName}
- カテゴリ: ${categoryName}
- ターゲット: ${inputData.target || '分析結果に基づく'}

【構成ベース】
${structure}

【読者心理】
${reader}

【改善・構成案（これを最優先）】
${improvement}

## 執筆指示
- **【重要】「改善・構成案」で提案された最終構成に従って執筆してください。**
- noteらしい「親しみやすさ」「体温のある文章」で書いてください。
- Markdown形式で見出し、太字、リストを活用してください。
- 記事の最後には「スキ」や「フォロー」を促す文言を入れてください。
- 有料記事の場合は、どこからを有料にするか（ライン）を明示してください。

## 出力フォーマット（Markdown）

# タイトル案
1. ...
2. ...
3. ...

# 本文
（以下記事の本文）
`;
    try {
        const result = await generateText(prompt, 0.7);
        return { success: true, data: result };
    } catch (e: any) {
        return { success: false, error: e.message || "執筆エラー" };
    }
}
