import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { SearchIntentRequest, SearchIntentAnalysis } from "@/types/seo-types";

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY || "");

export async function POST(req: NextRequest) {
    try {
        const body: SearchIntentRequest = await req.json();
        const { primaryKeyword, referenceArticles } = body;

        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

        const articlesInfo = referenceArticles.map((article, i) =>
            `記事${i + 1}: ${article.title}\n見出し: ${article.h2List.join(", ")}`
        ).join("\n\n");

        const prompt = `あなたはSEOの専門家です。以下の上位表示されている記事を分析し、
検索意図を特定してください。

【メインキーワード】
${primaryKeyword}

【上位記事のタイトルと見出し】
${articlesInfo}

【分析項目】
※キーワードではなく、上位記事の内容から検索意図を分析すること

1. 検索意図（informational / navigational / commercial / transactional）
   - 根拠：上位記事が提供している情報から判断
2. 想定される検索者の状況
   - 上位記事が想定している読者像
3. 検索者が求めている情報
   - 上位記事で共通して提供されている情報
4. 記事に含めるべき必須トピック
   - 上位記事すべてに共通するトピック

以下のJSON形式で出力してください（コードブロックなしで純粋なJSONのみ）:
{
  "searchIntent": "informational|navigational|commercial|transactional",
  "evidence": "上位記事から判断した根拠",
  "searcherSituation": "検索者の状況",
  "expectedInformation": ["情報1", "情報2", "情報3"],
  "requiredTopics": ["トピック1", "トピック2", "トピック3"]
}`;

        const result = await model.generateContent(prompt);
        const text = result.response.text();

        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            throw new Error("Failed to parse AI response");
        }

        const analysis: SearchIntentAnalysis = JSON.parse(jsonMatch[0]);

        return NextResponse.json({ success: true, data: analysis });
    } catch (error: unknown) {
        console.error("SEO Search Intent Analysis Error:", error);
        const message = error instanceof Error ? error.message : "Unknown error";
        return NextResponse.json({ success: false, error: message }, { status: 500 });
    }
}
