import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { StructureAnalysisRequest, ArticleStructureAnalysis } from "@/types/seo-types";

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY || "");

export async function POST(req: NextRequest) {
    try {
        const body: StructureAnalysisRequest = await req.json();
        const { articleTitle, articleContent } = body;

        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

        const prompt = `あなたはSEO記事の構成分析の専門家です。
以下の記事を詳細に分析してください。

【記事タイトル】
${articleTitle}

【記事本文】
${articleContent.substring(0, 10000)}

【分析項目】

1. タイトル構成分析（本質的な分析）
   - 文節に分解
   - 語順の意図
   - 読者を惹きつける要素
   - クリックされる理由
   ※数字の有無だけでなく、構成の本質を分析すること

2. H2ごとの詳細分析
   各H2について以下を分析：
   - 見出しテキスト
   - 配下のH3
   - 提供している価値
   - 読者の疑問への回答
   - キーワード配置

3. 使用されているデータ・事例
   - 統計データ
   - 具体例

4. CTA分析
   - 配置場所
   - CTA内容

以下のJSON形式で出力してください（コードブロックなしで純粋なJSONのみ）:
{
  "titleAnalysis": {
    "segments": ["文節1", "文節2", "文節3"],
    "wordOrderIntent": "語順の意図",
    "attractiveElements": "読者を惹きつける要素",
    "clickReason": "クリックされる理由"
  },
  "h2Analyses": [
    {
      "h2Text": "見出し2のテキスト",
      "h3List": ["H3-1", "H3-2"],
      "providedValue": "提供している価値",
      "readerQuestionAnswered": "読者の疑問への回答",
      "keywordPlacement": "キーワード配置"
    }
  ],
  "usedData": {
    "statistics": ["統計1", "統計2"],
    "examples": ["具体例1", "具体例2"]
  },
  "ctaAnalysis": {
    "placements": ["導入後", "まとめ"],
    "content": "CTA内容"
  }
}`;

        const result = await model.generateContent(prompt);
        const text = result.response.text();

        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            throw new Error("Failed to parse AI response");
        }

        const analysis: ArticleStructureAnalysis = JSON.parse(jsonMatch[0]);

        return NextResponse.json({ success: true, data: analysis });
    } catch (error: unknown) {
        console.error("SEO Structure Analysis Error:", error);
        const message = error instanceof Error ? error.message : "Unknown error";
        return NextResponse.json({ success: false, error: message }, { status: 500 });
    }
}
