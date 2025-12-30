import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { OutlineRequest, ArticleOutline } from "@/types/seo-types";

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY || "");

export async function POST(req: NextRequest) {
  try {
    const body: OutlineRequest = await req.json();
    const {
      primaryKeyword,
      secondaryKeywords,
      readerAnalysis,
      titleAnalysis,
      h2Structure,
      selectedImprovements,
      improvements,
      wordCountMin,
      wordCountMax
    } = body;

    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    // Get selected improvements
    let selectedAdditions: string[] = [];
    let selectedRemovals: string[] = [];

    if (selectedImprovements.selectedAxes && improvements.axes) {
      // New axis-based logic
      selectedAdditions = selectedImprovements.selectedAxes
        .filter(sel => sel.additionSelected)
        .map(sel => improvements.axes[sel.axisIndex]?.suggestedAddition)
        .filter(Boolean);

      selectedRemovals = selectedImprovements.selectedAxes
        .filter(sel => sel.removalSelected)
        .map(sel => improvements.axes[sel.axisIndex]?.suggestedRemoval)
        .filter(Boolean);
    } else {
      // Backward compatibility logic
      if (selectedImprovements.selectedAdditions && improvements.additions) {
        selectedAdditions = selectedImprovements.selectedAdditions
          .map(i => improvements.additions![i])
          .filter(Boolean);
      }
      if (selectedImprovements.selectedRemovals && improvements.removals) {
        selectedRemovals = selectedImprovements.selectedRemovals
          .map(i => improvements.removals![i])
          .filter(Boolean);
      }
    }

    const h2Summary = h2Structure.map(h => `- ${h.h2Text}: ${h.providedValue}`).join("\n");

    const prompt = `あなたはSEO記事構成のプロフェッショナルです。
以下の情報をもとに、検索1位を狙える記事構成を作成してください。

※重要：マーケットインの視点で、参考記事の構成・語順に沿って作成すること

【メインキーワード】
${primaryKeyword}

【サブキーワード】
${secondaryKeywords.join(", ") || "なし"}

【想定読者】
- レベル: ${readerAnalysis.level}
- ペルソナ: ${readerAnalysis.persona.occupation}, ${readerAnalysis.persona.ageGroup}
- 悩み: ${readerAnalysis.painPoints.join(", ")}

【参考記事のタイトル構成分析】
- 文節: ${titleAnalysis.segments.join(" / ")}
- 語順の意図: ${titleAnalysis.wordOrderIntent}
- 惹きつける要素: ${titleAnalysis.attractiveElements}

【参考記事のH2構成】
${h2Summary}

【採用する改善点】
追加: ${selectedAdditions.join(", ") || "なし"}
削除/改善: ${selectedRemovals.join(", ") || "なし"}

【目標文字数】
${wordCountMin}〜${wordCountMax}文字

以下のJSON形式で出力してください（コードブロックなしで純粋なJSONのみ）:
{
  "h1": "記事タイトル（選択されたもの）",
  "titleCandidates": [
    {
      "title": "タイトル案1",
      "referenceElement": "参考にした構成要素",
      "wordOrderIntent": "語順の意図"
    },
    {
      "title": "タイトル案2",
      "referenceElement": "参考にした構成要素",
      "wordOrderIntent": "語順の意図"
    },
    {
      "title": "タイトル案3",
      "referenceElement": "参考にした構成要素",
      "wordOrderIntent": "語順の意図"
    }
  ],
  "selectedTitleIndex": 0,
  "sections": [
    {
      "h2": "見出し2",
      "estimatedWordCount": 800,
      "h3List": ["H3-1", "H3-2"],
      "sectionSummary": "このセクションの概要",
      "referenceH2Source": "参考記事のどのH2を参考にしたか"
    }
  ],
  "metaDescription": "メタディスクリプション（120〜160文字）"
}

※H2は4〜6個、各H2にH3を2〜3個含めること
※参考記事の構成・語順に沿って作成すること`;

    const result = await model.generateContent(prompt);
    const text = result.response.text();

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("Failed to parse AI response");
    }

    const outline: ArticleOutline = JSON.parse(jsonMatch[0]);

    return NextResponse.json({ success: true, data: outline });
  } catch (error: unknown) {
    console.error("SEO Outline Error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
