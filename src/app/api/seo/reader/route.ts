import { NextRequest, NextResponse } from "next/server";
import { generateText } from "@/lib/gemini";
import { ReaderAnalysisRequest, ReaderAnalysis } from "@/types/seo-types";

export async function POST(req: NextRequest) {
   try {
      const body: ReaderAnalysisRequest = await req.json();
      const { primaryKeyword, articleSummary, searchIntentAnalysis, modificationInstructions } = body;

      const prompt = `あなたはマーケティングの専門家です。
以下のキーワードと参考記事から、想定読者を詳細に分析してください。

【メインキーワード】
${primaryKeyword}


【検索意図分析結果】
${searchIntentAnalysis ? `
- 検索意図: ${searchIntentAnalysis.searchIntent}
- 検索者の状況: ${searchIntentAnalysis.searcherSituation}
- 求められている情報: ${searchIntentAnalysis.expectedInformation.join(", ")}
` : `
※検索意図の分析データはありません。メインキーワードと参考記事の内容から、検索ユーザーの意図（顕在的・潜在的ニーズ）を深く推測して考慮してください。
`}

【参考記事の内容サマリー】
${articleSummary}

【分析項目】

1. レベル感
   - 該当レベル: (absolute_beginner/beginner/intermediate/advanced)
   - 根拠

2. 悩み・ニーズ
   - 検索時の心理状態
   - 解決したい具体的な悩み
   - 記事を読んだ後に期待する状態

3. 導入に対する興味分析（重視）
   - クリックした理由
   - 導入で興味を持つポイント
   - 読み続けるために必要な要素
   - 離脱リスクとその対策

4. 情報リテラシー
   - すでに知っていると思われる情報
   - 求めている新しい情報

5. ペルソナ像
   - 年齢層
   - 職業
   - 状況

${modificationInstructions ? `
【修正指示（ユーザーからの追加要望）】
ユーザーから以下の修正指示がありました。これを最優先して分析を調整してください：
"${modificationInstructions}"
` : ""}

以下のJSON形式で出力してください（コードブロックなしで純粋なJSONのみ）:
{
  "level": "absolute_beginner|beginner|intermediate|advanced",
  "levelEvidence": "レベル判定の根拠",
  "psychologyAtSearch": "検索時の心理状態",
  "painPoints": ["悩み1", "悩み2", "悩み3"],
  "expectedOutcome": "記事を読んだ後に期待する状態",
  "introductionInterest": {
    "clickReason": "クリックした理由",
    "interestPoints": ["興味ポイント1", "興味ポイント2"],
    "continueReadingElements": "読み続けるために必要な要素",
    "bounceRiskAndSolution": "離脱リスクとその対策"
  },
  "informationLiteracy": {
    "alreadyKnown": ["既知情報1", "既知情報2"],
    "seekingNew": ["求める情報1", "求める情報2"]
  },
  "persona": {
    "ageGroup": "XX代",
    "occupation": "職業",
    "situation": "状況"
  }
}`;

      // Use generateText with gemini-2.0-flash
      const text = await generateText(prompt, 0.7, "gemini-2.0-flash");

      // Remove markdown code blocks if present
      let cleanedText = text.trim();
      if (cleanedText.startsWith("```json")) {
         cleanedText = cleanedText.slice(7);
      } else if (cleanedText.startsWith("```")) {
         cleanedText = cleanedText.slice(3);
      }
      if (cleanedText.endsWith("```")) {
         cleanedText = cleanedText.slice(0, -3);
      }
      cleanedText = cleanedText.trim();

      const jsonMatch = cleanedText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
         console.error("Failed to parse reader AI response:", text.substring(0, 500));
         throw new Error("読者分析の解析に失敗しました。もう一度お試しください。");
      }

      const analysis: ReaderAnalysis = JSON.parse(jsonMatch[0]);

      return NextResponse.json({ success: true, data: analysis });
   } catch (error: unknown) {
      console.error("SEO Reader Analysis Error:", error);
      const message = error instanceof Error ? error.message : "Unknown error";
      return NextResponse.json({ success: false, error: message }, { status: 500 });
   }
}
