import { NextRequest, NextResponse } from "next/server";
import { gemini as genAI } from "@/lib/gemini";
import { StructureAnalysisRequest, ArticleStructureAnalysis } from "@/types/seo-types";


// Removed local instantiation to use centralized config
// const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY || "");

export async function POST(req: NextRequest) {
  try {
    const body: StructureAnalysisRequest = await req.json();
    const { articleTitle, articleContent, modificationInstructions } = body;

    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    // Safe truncation
    const safeContent = (articleContent || "").substring(0, 15000);

    const prompt = `あなたはSEO記事の構成分析の専門家です。
以下の記事を詳細に分析してください。

【記事タイトル】
${articleTitle}

【記事本文】
${safeContent}

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

${modificationInstructions ? `
【修正指示（ユーザーからの追加要望）】
ユーザーから以下の修正指示がありました。これを最優先して分析を調整してください：
"${modificationInstructions}"
` : ""}

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

    console.log("[Structure API] Raw response:", text.substring(0, 200) + "...");

    // Robust JSON parsing
    let cleanedText = text.trim();
    // Remove markdown code blocks
    cleanedText = cleanedText.replace(/```json\s*/g, "").replace(/```\s*/g, "");

    // Find the first '{' and last '}'
    const firstBrace = cleanedText.indexOf('{');
    const lastBrace = cleanedText.lastIndexOf('}');

    if (firstBrace !== -1 && lastBrace !== -1) {
      cleanedText = cleanedText.substring(firstBrace, lastBrace + 1);
    }

    let analysis: ArticleStructureAnalysis;
    try {
      analysis = JSON.parse(cleanedText);
    } catch (e) {
      console.error("[Structure API] JSON Parse Error:", e);
      console.error("[Structure API] Cleaned Text:", cleanedText);
      throw new Error("AIからの応答を解析できませんでした。もう一度お試しください。");
    }

    return NextResponse.json({ success: true, data: analysis });
  } catch (error: any) {
    console.error("SEO Structure Analysis Error:", error);
    const message = error.message || "Unknown error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
