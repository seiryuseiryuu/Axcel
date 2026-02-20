"use server";

import { generateText } from "@/lib/gemini";
import { fetchWebContent } from "@/lib/webScraper";

// --- STEP 2: LP Structure Analysis ---
// --- STEP 2: LP Structure Analysis ---
// Helper to take full page screenshot
async function takeLpScreenshot(url: string): Promise<{ buffer: Buffer; mimeType: string } | null> {
    // TEMPORARILY DISABLED due to build issues
    return null;
}

import { generateMultimodal } from "@/lib/gemini";

export async function analyzeLpStructure(url: string) {
    // 1. Attempt screenshot (currently disabled)
    let screenshotData = null;
    try {
        screenshotData = await takeLpScreenshot(url);
    } catch (e) {
        console.warn("Screenshot failed, falling back to text", e);
    }

    if (!screenshotData) {
        // Fallback: text-based analysis using fetchWebContent
        console.log("[LP] Screenshot unavailable, using text-based analysis for:", url);
        const webData = await fetchWebContent(url);
        console.log("[LP] fetchWebContent result:", { success: webData.success, contentLength: webData.content?.length, error: webData.error });
        if (!webData.success || !webData.content) {
            return { success: false, error: webData.error || "URLからの情報取得に失敗しました。URLが正しいか確認してください。" };
        }

        const textPrompt = `あなたは世界最高峰のLP構成作家です。
以下の「LPのテキストコンテンツ」を詳細に分析し、その「売れている構造」を完全に分解してください。

URL: ${url}

【LPのテキストコンテンツ】
${webData.content.substring(0, 15000)}

## 分析指示
参考LPのセクション構成を以下のマークダウン形式で分解してください。

# 構成分析レポート

## 1. ファーストビュー(FV)分析
- **キャッチコピー**: (テキストから推測されるメインキャッチコピー)
- **訴求要素**: (実績、権威性、ベネフィットなど何を強調しているか)
- **メインビジュアル**: (テキストから推測される視覚要素)

## 2. 全体構成フロー
FV以下の構成を「テキストの流れ」からセクションごとに分解してください。
「何が書かれているか」を具体的に抽出してください。テンプレへの当てはめは禁止です。

| セクション | 役割 | 実際の内容・訴求ポイント |
|:---|:---|:---|
| (例: 導入) | (例: 共感) | (例: 「〇〇で悩んでいませんか？」という問いかけ) |
| ... | ... | ... |

## 3. LPで一貫して訴求している要素（訴求軸）
このLPが「最も強く訴求している軸」を以下から1つ、または掛け合わせ（例: 新規性×再現性）で特定し、その理由を解説してください。
- **新規性**: 新しい商品・サービスであること
- **独自性**: 唯一無二であること（他にはない）
- **権威性**: 実績や開発者がすごいこと
- **簡易性**: 簡単に結果が出ること（楽、早い）
- **再現性**: 誰でも成果が出ること

**特定した訴求軸**: (ここに出力)
**理由**: (テキストのどの部分からそう判断したか)
`;

        try {
            const result = await generateText(textPrompt, 0.5);
            let cleanResult = result.replace(/^```markdown\n/, '').replace(/^```\n/, '').replace(/```$/, '');
            return { success: true, data: cleanResult };
        } catch (e: any) {
            return { success: false, error: e.message || "構成分析エラー" };
        }
    }

    const imageBase64 = screenshotData.buffer.toString('base64');

    const prompt = `あなたは世界最高峰のLP構成作家です。
以下の「LP全体のスクリーンショット」を詳細に分析し、その「売れている構造」を完全に分解してください。
画像化されている文字（ヘッダー画像内のキャッチコピーなど）も全て読み取り、分析対象としてください。

URL: ${url}

## 分析指示
参考LPのセクション構成を以下のマークダウン形式で分解してください。

# 構成分析レポート

## 1. ファーストビュー(FV)分析
**【重要】画像内の文字も含めて一言一句漏らさず読み取ってください。**
- **キャッチコピー**: (画像内の文字を正確に書き起こし)
- **訴求要素**: (実績、権威性、ベネフィットなど何を強調しているか)
- **メインビジュアル**: (人物、商品、グラフなど、何を見せているか)

## 2. 全体構成フロー
FV以下の構成を「見たまま」セクションごとに分解してください。
「何が書かれているか」を具体的に抽出してください。テンプレへの当てはめは禁止です。

| セクション | 役割 | 実際の内容・訴求ポイント（画像内文字含む） |
|:---|:---|:---|
| (例: 導入) | (例: 共感) | (例: 「〇〇で悩んでいませんか？」という問いかけと、悩んでいる人のイラスト) |
| ... | ... | ... |

## 3. LPで一貫して訴求している要素（訴求軸）
このLPが「最も強く訴求している軸」を以下から1つ、または掛け合わせ（例: 新規性×再現性）で特定し、その理由を解説してください。
- **新規性**: 新しい商品・サービスであること
- **独自性**: 唯一無二であること（他にはない）
- **権威性**: 実績や開発者がすごいこと
- **簡易性**: 簡単に結果が出ること（楽、早い）
- **再現性**: 誰でも成果が出ること

**特定した訴求軸**: (ここに出力)
**理由**: (画像やテキストのどの部分からそう判断したか)
`;

    try {
        const result = await generateMultimodal(prompt, [{ mimeType: 'image/jpeg', data: imageBase64 }]);
        let cleanResult = result.replace(/^```markdown\n/, '').replace(/^```\n/, '').replace(/```$/, '');
        return { success: true, data: cleanResult };
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
参考LPが100点満点である前提で、各セクションで読者がどんな感情になり、なぜ次のセクションへ読み進めようと思ったのかを言語化してください。

## 出力フォーマット（Markdown）

# 想定顧客・感情分析

## 1. ターゲット属性
- **レベル感**: (超初心者 / 初心者 / 中級者 / 上級者)
- **デモグラフィック**: (年代、性別、職業など推定)
- **抱えている悩み**: (表面的な悩みと真のインサイト)

## 2. 感情曲線（Emotional Curve）
**【重要】ターゲットがCVに至るまでの感情の動きを以下のテーブルで表現してください。**

| 構成 (セクション) | 参考LPの内容概要 | 読者の感情変化（心の声） |
|:---|:---|:---|
| FV | ... | 「おっ、これは自分のことだ」「本当かな？」 |
| ... | ... | ... |
| オファー/価格 | ... | 「この価格なら試してみようかな」 |
| クロージング | ... | 「今すぐやらないと損だ」「これなら信じられる」 |

## 3. 購入のハードル（心理的障壁）と突破ロジック
- **ハードル**: (例: 価格が高い) → **突破**: (例: 分割払い、返金保証)
`;

    try {
        const result = await generateText(prompt, 0.5);
        return { success: true, data: result };
    } catch (e: any) {
        return { success: false, error: e.message || "顧客分析エラー" };
    }
}

// --- STEP 4: Product Hearing (Chat) ---
// --- STEP 4: Product Hearing (Chat) ---
const MAX_HEARING_QUESTIONS = 5;

export async function generateHearingQuestion(
    currentInfo: string,
    history: { role: 'user' | 'model', text: string }[]
) {
    const historyText = history.map(h => `${h.role === 'user' ? 'ユーザー' : 'AI'}: ${h.text}`).join('\n');

    const userAnswerCount = history.filter(h => h.role === 'user').length;
    const remainingQuestions = MAX_HEARING_QUESTIONS - userAnswerCount;
    const isLastQuestion = remainingQuestions <= 1;

    if (remainingQuestions <= 0) {
        return {
            success: true,
            data: "[完了] ヒアリングが完了しました。「次へ」ボタンを押して、ターゲット定義を確認してください。"
        };
    }

    const prompt = `あなたはプロのセールスライターです。
ユーザーから「新しく作成する商品・サービス」の情報を引き出すために、ヒアリングを行っています。

**【重要】参考LPの情報は完全に無視してください。**
今から作るのは、参考LPとは全く別の新しい商品です。この「新しい商品」の事実だけを深掘りしてください。
最終的に「誰に」「何を」「どのように」売るかを明確にし、売れるLPを作るための材料を集めるのが目的です。

【現在の既知情報】
${currentInfo}

【会話履歴】
${historyText}

【残り質問回数】${remainingQuestions}回（最大${MAX_HEARING_QUESTIONS}回）

## 指示
ユーザーに対して、**1つだけ**質問をしてください。
残り${remainingQuestions}回しか質問できないので、LP作成に最も重要な情報を優先して聞いてください。
以下の優先順位で、まだ聞けていない項目を質問してください：
1. ターゲット層（ペルソナ詳細、悩み、緊急性）
2. 商品の最大の特徴・強み（USP）
3. 価格帯・オファー内容
4. 競合優位性
5. 実績・権威性

${isLastQuestion ? '【重要】これが最後の質問です。質問の後に必ず「[完了]」と付けてください。' : ''}
質問は簡潔に、答えやすくしてください。
`;

    try {
        const result = await generateText(prompt, 0.7);
        return { success: true, data: result };
    } catch (e: any) {
        return { success: false, error: e.message || "ヒアリング生成エラー" };
    }
}

// NEW: Step 4.5 Generate Consolidated Product Profile
export async function generateProductProfile(hearingHistoryText: string) {
    const prompt = `あなたは優秀なマーケティングストラテジストです。
以下のヒアリング履歴を元に、今回LPを作成する「商品・サービス」および「ターゲット」の定義書を作成してください。
ユーザーが手動で修正するため、編集しやすいマークダウン形式で出力してください。

【ヒアリング履歴】
${hearingHistoryText}

## 出力フォーマット
# 商品・ターゲット定義書

## 1. ターゲット詳細 (ペルソナ)
- **属性**: 
- **悩み(Before)**: 
- **理想の未来(After)**: 

## 2. 商品・サービス概要
- **商品名**: (未定の場合は仮)
- **特徴・強み(USP)**: 
- **価格・オファー**: 

## 3. 競合との違い・権威性
- 
- 
`;

    try {
        const result = await generateText(prompt, 0.5);
        return { success: true, data: result };
    } catch (e: any) {
        return { success: false, error: e.message || "プロファイル生成エラー" };
    }
}

// --- STEP 5: Propose LP Outline (JSON) ---
export async function proposeLpOutline(
    structureAnalysis: string,
    customerAnalysis: string,
    productInfo: string
) {
    const prompt = `あなたは世界最高峰のLP構成作家です。
「参考LPの売れる構造」と「顧客の感情曲線」を、今回の「新しい商品」に当てはめて、最強のLP構成案を作成してください。

【参考LPの構造】
${structureAnalysis}

【顧客の感情分析】
${customerAnalysis}

【今回の商品情報（ヒアリング結果）】
${productInfo}

## 指示
参考LPの構造（FV〜クロージング）をベースに、今回の商品の強みを活かした構成案を作成してください。
各セクションで「何を伝えるべきか」「どんな感情にさせるべきか」を明確にしてください。

## 出力フォーマット（JSON）
**必ず以下のJSON形式のみを出力してください。**
マークダウンのコードブロック（\`\`\`json ... \`\`\`）で囲んでください。
配列の順番がそのままLPの構成順になります。

\`\`\`json
[
{
"id": "1",
"section": "FV（ファーストビュー）",
"title": "（ここにキャッチコピー案）",
"content": "（ここに詳細な指示：画像で見せるもの、権威性、ターゲットへの呼びかけなど）",
"emotion": "（読者の感情：えっ、私のことだ！）"
},
{
"id": "2",
"section": "共感・問題提起",
"title": "（見出し案）",
"content": "（コンテンツ指示）",
"emotion": "（読者の感情）"
},
...
]
\`\`\`
`;

    try {
        const result = await generateText(prompt, 0.6);
        // Extract JSON from code block
        const jsonMatch = result.match(/```json([\s\S]*?)```/);
        const jsonString = jsonMatch ? jsonMatch[1] : result;
        return { success: true, data: jsonString.trim() }; // Return JSON string
    } catch (e: any) {
        return { success: false, error: e.message || "構成提案エラー" };
    }
}

// --- STEP 6: Write LP Copy ---
export async function writeLpCopy(
    finalizedOutline: string, // JSON or structured text
    productInfo: string
) {
    const prompt = `あなたは伝説のセールスライターです。
ユーザーが確定させた「最強のLP構成（アウトライン）」を元に、新しい商品のLP原稿を執筆してください。

【商品情報】
${productInfo}

【確定したLP構成（アウトライン）】
${finalizedOutline}

## 執筆指示
- **【最重要】提供された「LP構成」の順序と内容指示を厳守してください。**
- 各セクションの意図（タイトルや内容）を汲み取り、ターゲットの心を動かすコピーを書いてください。
- 文体はターゲットに合わせて調整してください（商品情報から推測）。
- 抽象的な表現ではなく、具体的なベネフィットや数字を用いてください。
- HTMLではなく、読みやすいMarkdown形式で執筆してください。

## 重要チェックリスト
1. FVは魅力的か？（3秒で惹きつける）
2. ターゲットの悩みに寄り添っているか？
3. 商品の強み（USP）が伝わるか？
4. オファーは明確か？
5. 今すぐ行動する理由が書かれているか？

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
