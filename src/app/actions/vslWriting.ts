"use server";

import { generateText } from "@/lib/gemini";

// --- Types ---
export type Hearing1Data = {
    worstScenario: string;
    failedMethods: string;
    desiredFuture: string;
    urgencyReason: string;
};

export type CampaignProposal = {
    id: number;
    title: string;
    concept: string;
    elements: string[];
    reasoning: string;
};

// --- STEP 2: Generate 3 Campaign Proposals ---
export async function generateVslCampaigns(
    hearing1: Hearing1Data,
    referenceCopies: string
) {
    const prompt = `あなたは日本トップクラスのVSL（ビデオセールスレター）プロデューサーです。
以下のターゲット情報と参考コピーを分析し、ターゲットが思わず飛びつく企画案を3パターン作成してください。

【ターゲット情報（STEP1ヒアリング結果）】
■ 最悪の情景: ${hearing1.worstScenario}
■ 失敗した既存手法: ${hearing1.failedMethods}
■ 喉から手が出るほど欲しい未来: ${hearing1.desiredFuture}
■ 今見るべき理由: ${hearing1.urgencyReason}

【参考コピー（note/Brain/Web広告/競合等から収集）】
${referenceCopies || "（参考コピーなし — 独自に最適な企画を提案してください）"}

━━━━━━━━━━━━━━━━━━━━━━━━━━
★ 企画に必要な10の要素（全て満たす必要はない。ジャンルによって重要度は異なる）
━━━━━━━━━━━━━━━━━━━━━━━━━━
1. 簡易性 — 実行難易度が低く見える
2. ベネフィット — 一目で得られるメリットが分かる
3. 新概念の命名 — 唯一無二の名前・メソッド名
4. 特別感 — 秘密のノウハウ感
5. 再現性 — 誰でも同じ成果が得られる期待感
6. メカニズム — 科学的・論理的な納得感
7. 最新性 — 新しい方法だと思える
8. ターゲット指定 — 「自分のことだ」と思える表現
9. 即効性 — すぐに結果が出る感
10. リスクヘッジ — 失うものがない安心感

━━━━━━━━━━━━━━━━━━━━━━━━━━
★ 作業手順
━━━━━━━━━━━━━━━━━━━━━━━━━━
1. まず参考コピーがどのように上記10要素を満たしているか簡潔に分析する
2. その分析を踏まえ、ターゲット情報に最適化した企画案を3パターン作成する
3. 各企画案は「キャッチーな企画タイトル」「コンセプト説明」「満たしている要素」「なぜこの企画が刺さるか」を含む

【出力形式】JSON配列のみを出力してください。
\`\`\`json
[
  {
    "id": 1,
    "title": "企画タイトル（キャッチコピー）",
    "concept": "企画の概要説明（2-3文）",
    "elements": ["簡易性", "ベネフィット", "新概念の命名"],
    "reasoning": "なぜこの企画がターゲットに刺さるか"
  },
  {
    "id": 2,
    "title": "...",
    "concept": "...",
    "elements": ["..."],
    "reasoning": "..."
  },
  {
    "id": 3,
    "title": "...",
    "concept": "...",
    "elements": ["..."],
    "reasoning": "..."
  }
]
\`\`\``;

    try {
        const result = await generateText(prompt, 0.6);
        const jsonMatch = result.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
            const campaigns: CampaignProposal[] = JSON.parse(jsonMatch[0]);
            return { success: true, data: campaigns };
        }
        return { success: true, data: result };
    } catch (e: any) {
        return { success: false, error: e.message || "企画生成エラー" };
    }
}

// --- STEP 3: Dynamic AI Hearing (Chat) ---
export async function conductVslHearing(
    hearing1: Hearing1Data,
    selectedCampaign: CampaignProposal,
    chatHistory: { role: "user" | "ai"; text: string }[],
    userMessage: string
) {
    const historyText = chatHistory.map(m =>
        m.role === "user" ? `ユーザー: ${m.text}` : `AI: ${m.text}`
    ).join("\n");

    const prompt = `あなたはVSL制作のプロフェッショナルインタビュアーです。
台本の中身を作るために必要な情報をユーザーからヒアリングしています。

【STEP1のターゲット情報】
■ 最悪の情景: ${hearing1.worstScenario}
■ 失敗した既存手法: ${hearing1.failedMethods}
■ 欲しい未来: ${hearing1.desiredFuture}
■ 今見るべき理由: ${hearing1.urgencyReason}

【選ばれた企画】
タイトル: ${selectedCampaign.title}
コンセプト: ${selectedCampaign.concept}

【ヒアリングで取りたい情報リスト】
以下の項目のうち、まだ聞けていないものを優先して質問してください：
1. 動画は1話完結か？シリーズものか？
2. 視聴者に提供するノウハウ・手法の詳細
3. その手法でターゲットが成果を出せる根拠
4. その手法による自分（演者）自身の成果
5. その手法を取り入れる前の自分の状態
6. 実績者の詳細や口コミ（複数人あるとベスト）
7. 動画最後のCTA（コンセプト、何が手に入るか、料金、理念）
8. CTAの限定要素（先着○名、○日間限定など）
9. CTAの特典

【これまでの会話】
${historyText}

【ユーザーの最新メッセージ】
${userMessage}

━━━━━━━━━━━━━━━━━━━━━━━━━━
★ あなたの行動ルール
━━━━━━━━━━━━━━━━━━━━━━━━━━
- 1回の応答で質問は1〜2個に絞る（質問攻めにしない）
- ユーザーの回答を受け止めてから次の質問に移る
- 具体的なエピソードを引き出す質問をする
- すべての項目が埋まったら「ヒアリング完了です！次のステップ（構成作成）に進みましょう。」と伝える
- まだ聞くべき項目がある場合は、自然な流れで次の質問をする
- 応答はフレンドリーかつプロフェッショナルに

【出力形式】
JSON形式で出力してください。
\`\`\`json
{
  "message": "AIの応答メッセージ（質問や確認を含む）",
  "isComplete": false,
  "gatheredInfo": {
    "isSeriesOrStandalone": "1話完結 or シリーズ（分かっていれば）",
    "methodDetails": "ノウハウの詳細（分かっていれば）",
    "evidence": "成果の根拠（分かっていれば）",
    "ownResults": "自身の成果（分かっていれば）",
    "beforeState": "以前の状態（分かっていれば）",
    "testimonials": "実績者情報（分かっていれば）",
    "cta": "CTA情報（分かっていれば）",
    "scarcity": "限定要素（分かっていれば）",
    "bonuses": "特典情報（分かっていれば）"
  }
}
\`\`\``;

    try {
        const result = await generateText(prompt, 0.5);
        const jsonMatch = result.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            return { success: true, data: parsed };
        }
        return { success: true, data: { message: result, isComplete: false, gatheredInfo: {} } };
    } catch (e: any) {
        return { success: false, error: e.message || "ヒアリングエラー" };
    }
}

// --- STEP 4: Generate VSL Structure ---
export async function generateVslStructure(
    hearing1: Hearing1Data,
    selectedCampaign: CampaignProposal,
    hearingResult: Record<string, string>
) {
    const prompt = `あなたは1億円以上売り上げるVSL構成のプロです。
以下のヒアリング結果を元に、VSL構成テンプレートの各パートに具体的な内容を埋めた構成表を作成してください。

【ターゲット情報】
■ 最悪の情景: ${hearing1.worstScenario}
■ 失敗した既存手法: ${hearing1.failedMethods}
■ 欲しい未来: ${hearing1.desiredFuture}
■ 今見るべき理由: ${hearing1.urgencyReason}

【企画】
タイトル: ${selectedCampaign.title}
コンセプト: ${selectedCampaign.concept}

【詳細ヒアリング結果】
${Object.entries(hearingResult).map(([k, v]) => `■ ${k}: ${v}`).join("\n")}

━━━━━━━━━━━━━━━━━━━━━━━━━━
★ VSL構成テンプレート（58セクション）
━━━━━━━━━━━━━━━━━━━━━━━━━━
以下の各セクションについて、ヒアリング結果に基づいた具体的な内容の要約を書いてください。
該当しないセクション（例：シリーズでない場合の「次回予告」）はスキップしてください。

1. 冒頭興味づけ
2. 自己紹介
3. 特別感の演出、コスト提示
4. 実績
5. 魅力的な動画のコンセプト紹介
6. ターゲットの悩み
7. 常識の破壊
8. 現状の行動を続けた先の最悪の未来
9. エピソード
10. 視聴者の代弁
11. 失敗していた過去
12. 訪れた転機
13. 成功の連続
14. 第三者の実績
15. ベネフィット提示
16. 理想の未来
17. 視聴維持の文言
18. 前提の共有
19. 結論
20. 根拠
21. 具体例
22. 結論
23. 非推奨の手段
24. 視聴者の代弁
25. 常識の破壊
26. 非推奨の根拠
27. 具体例
28. 結論
29. 視聴者への呼びかけ
30. 解決策の提示
31. 視聴者の代弁
32. 問いかけ・自分事化させる質問
33. 独自のノウハウの解説（PREP法）
34. ベネフィット提示
35. 自身の体験談
36. 第三者の成果
37. 結論
38. 現実フュージョン
39. 問いかけ
40. 解決策
41. 理想の未来（手法を取り入れた先）
42. 最悪の未来（手法を取り入れなかった先）
43. 視聴者へのメッセージ
44. 動画を通した主張
45. 背中を押すメッセージ
46. 次回予告（シリーズの場合のみ）
47. 視聴者の悩み（シリーズの場合のみ）
48. 次回予告（シリーズの場合のみ）
49. CTA
50. 動画を視聴した上での悩みの共感
51. コンセプト紹介
52. 詳細の解説
53. 特典説明
54. 第三者の実績・口コミ
55. 限定性の訴求
56. 開催・販売した理念
57. アクション誘導
58. エンディング

【出力形式】Markdown の表形式で出力してください。
| # | セクション名 | 内容の要約 |
|:--|:-----------|:---------|
| 1 | 冒頭興味づけ | （具体的な内容要約） |
| 2 | 自己紹介 | （具体的な内容要約） |
| ... | ... | ... |

※該当しないセクションは行ごと省略してOKです。`;

    try {
        const result = await generateText(prompt, 0.4);
        return { success: true, data: result };
    } catch (e: any) {
        return { success: false, error: e.message || "構成作成エラー" };
    }
}

// --- STEP 5: Write Final VSL Script ---
export async function writeVslScript(
    hearing1: Hearing1Data,
    selectedCampaign: CampaignProposal,
    hearingResult: Record<string, string>,
    structure: string
) {
    const prompt = `あなたは1億円売るVSLライターです。
以下の構成表に基づいて、最強のVSL台本を執筆してください。

【企画タイトル】
${selectedCampaign.title}

【ターゲット情報】
■ 最悪の情景: ${hearing1.worstScenario}
■ 失敗した既存手法: ${hearing1.failedMethods}
■ 欲しい未来: ${hearing1.desiredFuture}
■ 今見るべき理由: ${hearing1.urgencyReason}

【詳細ヒアリング結果】
${Object.entries(hearingResult).map(([k, v]) => `■ ${k}: ${v}`).join("\n")}

【構成表（ユーザー確認済み）】
${structure}

━━━━━━━━━━━━━━━━━━━━━━━━━━
★ 執筆ルール
━━━━━━━━━━━━━━━━━━━━━━━━━━
1. 構成表の各セクションに沿って、セクションごとに実際の台本（ナレーション）を書く
2. 映像・テロップの指示も併記する
3. 視聴者が飽きないリズム感を重視する
4. 感情を揺さぶる言葉を選ぶ
5. 口語体で自然に読み上げられる文体にする
6. CTAまで一気に引き込む構成を意識する

【出力形式】Markdown で出力してください。

# VSL台本: ${selectedCampaign.title}

## セクション1: 冒頭興味づけ

**映像・テロップ**: （映像指示）
**ナレーション**:
「（実際の台本テキスト）」

---

## セクション2: 自己紹介

**映像・テロップ**: （映像指示）
**ナレーション**:
「（実際の台本テキスト）」

（以下、構成表の全セクションについて同様に）`;

    try {
        const result = await generateText(prompt, 0.7);
        return { success: true, data: result };
    } catch (e: any) {
        return { success: false, error: e.message || "執筆エラー" };
    }
}
