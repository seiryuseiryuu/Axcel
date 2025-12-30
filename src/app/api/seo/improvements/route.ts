import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { ImprovementsRequest, ImprovementSuggestions } from "@/types/seo-types";

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY || "");

export async function POST(req: NextRequest) {
  try {
    const body: ImprovementsRequest = await req.json();
    const { readerAnalysis, structureAnalyses } = body;

    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    // Create detailed structure summary with H2 content for each article
    const structureSummary = structureAnalyses.map((s, i) =>
      `【競合記事${i + 1}（SEO順位${i + 1}位）】\n${s.h2Analyses.map(h =>
        `- ${h.h2Text}: ${h.providedValue || '(内容なし)'}`
      ).join("\n")}`
    ).join("\n\n");

    const prompt = `あなたはSEOコンテンツ戦略の専門家です。
競合記事から「内容軸」を抽象化し、各軸ごとに改善提案を行ってください。

【想定読者】
- レベル感: ${readerAnalysis.level}
- 悩み・ニーズ: ${readerAnalysis.painPoints.join(", ")}
- 求めている情報: ${readerAnalysis.informationLiteracy.seekingNew.join(", ")}

【競合記事の構成（SEO上位順）】
${structureSummary}

【タスク】
1. 競合記事から共通する「内容軸」を5〜7個抽出してください（例：導入解説、メリット紹介、具体例、注意点など）
   - ※全ての記事で「該当なし」になるような軸は抽出しないでください。
2. 各軸について、競合記事がどのような内容を提供しているか**極めて端的に（30文字以内）**要約してください（SEO順位順）。
   - 長い説明は不要です。「〇〇について解説」「具体例を3つ提示」など体言止めで短く。
3. 想定読者のニーズに基づき、追加すべき内容・削除すべき内容を提案してください。
   - **削除すべき内容（重要）**: 読者にとって不要な情報、冗長な表現、SEOで評価されない内容は、明確に「削除」として提案してください。「特になし」は極力避け、何か削れる部分を見つけてください。

【出力形式】以下のJSON形式で出力（コードブロックなしで純粋なJSONのみ）:
{
  "axes": [
    {
      "axis": "内容軸の名前（具体的かつ短く）",
      "competitorContent": [
        "A記事: 〇〇を解説（30文字以内）",
        "B記事: ××を紹介（30文字以内）",
        "C記事: (該当なし)"
      ],
      "suggestedAddition": "この軸で追加すべき独自性のある内容",
      "suggestedRemoval": "この軸に関連する、冗長または不要な削除すべき内容（必ず提案する）"
    }
  ]
}

※competitorContentは必ずMAX30文字で「体言止め」で要約すること。
※「削除すべき内容」は、たとえ競合が書いていても読者ニーズに合わないものは削除提案すること。
※5〜7個の内容軸を出力すること`;

    const result = await model.generateContent(prompt);
    const text = result.response.text();

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("Failed to parse AI response");
    }

    const improvements: ImprovementSuggestions = JSON.parse(jsonMatch[0]);

    // Ensure axes array exists
    if (!improvements.axes || !Array.isArray(improvements.axes)) {
      throw new Error("Invalid response format: axes array missing");
    }

    return NextResponse.json({ success: true, data: improvements });
  } catch (error: unknown) {
    console.error("SEO Improvements Error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
