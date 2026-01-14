"use server";

import { generateText } from "@/lib/gemini";

/**
 * STEP 2: Analyze Reference Post Structure
 * Analyzes the reference post to extract its abstract structure.
 */
export async function analyzePostStructure(content: string, platform: 'x' | 'threads') {
    if (!content.trim()) {
        return { success: false, error: "参考投稿を入力してください" };
    }

    // User's Genius Prompt Logic for Analysis
    const prompt = `あなたはバズポストの構造を完全に分解して、再構築する天才です。
以下の参考投稿を分析し、構造化・シンプル化してください。

【参考投稿】
${content}

# 実行手順

STEP1:
ポストを分析して、
テンプレ【①過去→過ち→転機→...】のように（これは例ね）極限まで抽象化して構造化してください。
各要素には具体的な説明（例：「呼びかけ・前置き（読者の注意を引く）」）と、この投稿での具体例を記載してください。

STEP2:
構造化したあと極限までシンプル化してください。
要素だけのリストにしてください（例：1. 呼びかけ, 2. 日常の違和感...）。

STEP4:
このポストは"共感ポスト"とか"ストーリーポスト"とか、そういう分類で言うと何型ですか？

# 出力形式 (JSON)
\`\`\`json
{
  "structureDetail": [
    { "step": 1, "label": "要素名", "description": "説明", "example": "参考投稿での該当箇所" },
    ...
  ],
  "simplifiedStructure": ["要素1", "要素2", "要素3", ...],
  "postType": "〇〇型（例：ストーリー共感型）",
  "analysisSummary": "分析の総評（STEP1の出力に近い文章形式での解説）"
}
\`\`\`
`;

    try {
        const result = await generateText(prompt, 0.4);
        const match = result.match(/\{[\s\S]*\}/);
        if (match) {
            return { success: true, data: JSON.parse(match[0]) };
        }
        return { success: false, error: "構造解析に失敗しました（JSON形式ではありませんでした）" };
    } catch (e: any) {
        return { success: false, error: e.message || "構造解析エラー" };
    }
}

/**
 * STEP 3: Analyze Account Tone
 * Analyzes the user's past posts to determine the account tone.
 */
export async function analyzeAccountTone(samplePosts: string[]) {
    if (!samplePosts || samplePosts.length === 0) {
        return { success: false, error: "分析用の過去投稿がありません" };
    }

    const postsText = samplePosts.join("\n\n---\n\n");

    const prompt = `あなたはSNS運用・言語分析のプロフェッショナルです。
以下の過去の投稿テキストから、このアカウントの「トーン（口調・雰囲気）」を詳細に分析してください。

【過去の投稿サンプル】
${postsText}

# 分析項目
1. 口調（カジュアル/専門家/フランク/毒舌 等）
2. 語尾の特徴（～だよね、～です、～笑 等）
3. 絵文字の使用頻度と傾向
4. 一人称（私、僕、自分、ワイ 等）
5. 全体的な雰囲気・性格

# 出力形式 (JSON)
\`\`\`json
{
  "toneType": "（例：親しみやすい先輩風）",
  "endings": ["語尾1", "語尾2"],
  "emojiFrequency": "（例：多め、特定の黄色い顔のみ使用、全く使わない）",
  "firstPerson": "（一人称）",
  "description": "（トーンの詳細な説明文章。ユーザーへの確認用）"
}
\`\`\`
`;

    try {
        const result = await generateText(prompt, 0.3);
        const match = result.match(/\{[\s\S]*\}/);
        if (match) {
            return { success: true, data: JSON.parse(match[0]) };
        }
        return { success: false, error: "トーン分析に失敗しました" };
    } catch (e: any) {
        return { success: false, error: e.message || "トーン分析エラー" };
    }
}

/**
 * STEP 5: Generate Social Posts
 * Generates posts based on structure, tone, and theme.
 */
export async function generateSocialPosts(
    structureData: any,
    toneData: any,
    theme: string,
    platform: 'x' | 'threads'
) {
    const charLimit = platform === 'x' ? "文字数制限なし（長文可）" : "500文字以内";
    
    // Constructing the "Genius" Prompt for Generation
    const prompt = `あなたはバズポストの構造を完全に分解して、再構築する天才です。
以下の分析結果（構造・トーン）を用いて、指定されたテーマで新しいポストを作成してください。
しっかり構造を理解してテンプレ化し、文章の言い回しも似せてください。ユーモアを入れて。おかしな日本語は使わないでください。

【STEP 2: 構造テンプレート】
${JSON.stringify(structureData.simplifiedStructure, null, 2)}
(ポストの型: ${structureData.postType})

【STEP 3: アカウントトーン】
${JSON.stringify(toneData, null, 2)}

【STEP 4: 作成テーマ】
${theme}

# 実行手順

STEP 3 (再構築):
上記の構造テンプレートを用いて、汎用的なテンプレートを脳内で作成してください。

STEP 5 (生成):
分析した構造とトーンを用いて、テーマ「${theme}」でリライトしたサンプルポストを3案生成してください。
プラットフォームは ${platform === 'x' ? 'X (旧Twitter)' : 'Threads'} です。${charLimit}。

# 出力形式 (JSON)
\`\`\`json
[
  {
    "type": "パターン名（例：ストーリー重視案）",
    "content": "ポスト本文（改行コード含む）",
    "explanation": "この案のポイント解説"
  },
  {
    "type": "パターン名2",
    "content": "ポスト本文",
    "explanation": "解説"
  },
  {
    "type": "パターン名3",
    "content": "ポスト本文",
    "explanation": "解説"
  }
]
\`\`\`
`;

    try {
        const result = await generateText(prompt, 0.7); // Higher temperature for creativity
        const match = result.match(/\[[\s\S]*\]/);
        if (match) {
            return { success: true, data: JSON.parse(match[0]) };
        }
        // Fallback for single object or wrapped structure
        const objMatch = result.match(/\{[\s\S]*\}/);
        if (objMatch) {
             const obj = JSON.parse(objMatch[0]);
             if (obj.posts && Array.isArray(obj.posts)) return { success: true, data: obj.posts };
             if (obj.data && Array.isArray(obj.data)) return { success: true, data: obj.data };
        }
        
        return { success: false, error: "生成に失敗しました（フォーマットエラー）" };
    } catch (e: any) {
        return { success: false, error: e.message || "生成エラー" };
    }
}
