import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { DraftRequest, GeneratedArticle } from "@/types/seo-types";

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY || "");

export async function POST(req: NextRequest) {
    try {
        const body: DraftRequest = await req.json();
        const {
            primaryKeyword,
            secondaryKeywords,
            outline,
            readerAnalysis,
            tone,
            wordCountMin,
            wordCountMax,
            authorName,
            authorTitle,
            authorProfile,
            ctaLink,
            ctaText,
            referenceArticles,  // 参考記事を受け取る
            structureAnalyses,  // 構造分析結果を受け取る
            internalLinks,      // 内部リンクを受け取る
        } = body;

        // Construct authorExpertise string
        const authorExpertise = [
            authorName ? `名前: ${authorName}` : "",
            authorTitle ? `肩書き: ${authorTitle}` : "",
            authorProfile ? `プロフィール: ${authorProfile}` : ""
        ].filter(Boolean).join("\n");

        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

        const toneGuide = {
            polite: "です・ます調で丁寧に",
            casual: "だ・である調でカジュアルに、読者に語りかけるように",
            professional: "専門的で信頼感のある表現で"
        };

        const readerLevelGuide = {
            absolute_beginner: "超初心者向け：専門用語を避け、具体例を多用し、基礎から丁寧に解説",
            beginner: "初心者向け：基本から丁寧に説明、つまずきやすいポイントを解説",
            intermediate: "中級者向け：効率化・最適化にフォーカス、より専門的な内容",
            advanced: "上級者向け：データ・事例を豊富に、最新情報・応用テクニック"
        };

        const selectedTitle = outline.titleCandidates[outline.selectedTitleIndex]?.title || outline.h1;

        const outlineText = outline.sections.map(s => {
            let text = `## ${s.h2}\n（目安文字数: ${s.estimatedWordCount}文字）\n概要: ${s.sectionSummary}`;
            if (s.h3List && s.h3List.length > 0) {
                text += `\n${s.h3List.map(h3 => `### ${h3}`).join("\n")}`;
            }
            return text;
        }).join("\n\n");

        // 参考記事のコンテンツを整形
        let referenceArticlesText = "";
        if (referenceArticles && referenceArticles.length > 0) {
            referenceArticlesText = referenceArticles.map((article: { url: string; title: string; content: string }, index: number) => {
                // 各記事のコンテンツを最大3000文字に制限
                const truncatedContent = article.content?.substring(0, 3000) || "";
                return `【参考記事${index + 1}】
タイトル: ${article.title || "不明"}
URL: ${article.url || "不明"}
本文:
${truncatedContent}${article.content && article.content.length > 3000 ? "..." : ""}`;
            }).join("\n\n---\n\n");
        }

        // 構造分析結果を整形
        let structureAnalysisText = "";
        if (structureAnalyses && structureAnalyses.length > 0) {
            structureAnalysisText = structureAnalyses.map((analysis: {
                titleAnalysis: { segments: string[]; attractiveElements: string };
                h2Analyses: { h2Text: string; providedValue: string }[];
            }, index: number) => {
                const h2Summary = analysis.h2Analyses?.map((h2: { h2Text: string; providedValue: string }) =>
                    `  - ${h2.h2Text}: ${h2.providedValue}`
                ).join("\n") || "";
                return `【参考記事${index + 1}の構成】
タイトル要素: ${analysis.titleAnalysis?.segments?.join(" / ") || ""}
惹きつける要素: ${analysis.titleAnalysis?.attractiveElements || ""}
H2構成:
${h2Summary}`;
            }).join("\n\n");
        }

        // 内部リンク情報の整形
        let internalLinksText = "";
        if (internalLinks && internalLinks.length > 0) {
            internalLinksText = internalLinks.map(link =>
                `- URL: ${link.url}\n  テキスト: ${link.title}`
            ).join("\n");
        }

        const prompt = `あなたは${primaryKeyword}分野の専門家であり、SEOライティングのプロフェッショナルです。

【最重要指示】
以下の参考記事を徹底的に参考にし、その構成・内容・表現スタイルに忠実な記事を作成してください。
参考記事で使われている：
- 見出しの付け方・表現
- 説明の順序・流れ
- 具体例の出し方
- 読者への語りかけ方
これらを十分に踏襲しながら、オリジナルの価値を加えてください。

**【禁止事項】**
- **Markdownのアスタリスク（* または **）による強調は絶対に使用しないでください。**
- 強調表現が必要な場合は、HTMLタグ（<b>または<strong>）を使用するか、単なるテキストのままにしてください。

${referenceArticlesText ? `\n==========================================\n【参考記事（これを徹底的に参考にすること）】\n==========================================\n\n${referenceArticlesText}` : ""}

${structureAnalysisText ? `\n==========================================\n【参考記事の構造分析（この構成を踏襲すること）】\n==========================================\n\n${structureAnalysisText}` : ""}

==========================================
【記事作成の詳細】
==========================================

【メインキーワード】
${primaryKeyword}

【サブキーワード】
${secondaryKeywords.join(", ") || "なし"}

【想定読者】
- レベル感: ${readerAnalysis.level}
- 悩み: ${readerAnalysis.painPoints.join(", ")}
- 導入で興味を持つポイント: ${readerAnalysis.introductionInterest.interestPoints.join(", ")}

${authorExpertise ? `【著者の専門性（E-E-A-T）】\n${authorExpertise}` : ""}

【承認された構成（参考記事の構成をベースに作成済み）】
# ${selectedTitle}

${outlineText}

【目標文字数】
${wordCountMin}〜${wordCountMax}文字

【ライティング規則】

1. マーケットイン・アプローチ（最重要）
   - 参考記事で書かれている内容を網羅する
   - 参考記事の見出しの順序・構成を踏襲する
   - 参考記事で使われている表現・言い回しを参考にする
   - 参考記事に無い独自の価値を1〜2つ追加する

2. SEO最適化
   - タイトルにメインキーワードを前方配置（15文字以内）
   - 各H2見出しにキーワードを自然に含める
   - 導入部の最初の100文字以内にメインキーワードを含める
   - キーワード密度は1〜3%

3. 読みやすさ
   - 一文は60文字以内
   - 段落は3〜4文で区切る
   - 箇条書きを適切に使用
   - 難しい概念は具体例で説明
   - **アスタリスク（*）による強調は禁止**

4. 読者レベル: ${readerLevelGuide[readerAnalysis.level]}

5. E-E-A-T
   - 実体験を1〜2箇所含める
   - 統計データを2〜3箇所引用
   - 信頼できる情報源へのリンクを含める

6. 文体: ${toneGuide[tone]}

${ctaLink ? `7. CTA\n   - リンク: ${ctaLink}\n   - テキスト: ${ctaText || "詳しくはこちら"}` : ""}

${internalLinksText ? `8. 内部リンク（自社メディア記事の活用）【重要】
   - 以下のリストにある内部リンクを、文章の流れの中で自然に挿入してください。
   - ❌ 「こちらの記事では〜解説しています。ぜひ参考にしてみてください。」のように、文末に取って付けたような誘導文は避けてください。
   - ✅ 文中の単語やフレーズをアンカーテキストにして、シームレスにリンクさせてください。
     - 例1: 「...については、<a href="URL">〇〇の解説記事</a>でも詳しく触れていますが...」
     - 例2: 「...といった<a href="URL">対策方法</a>も有効です。」
   - 形式: <a href="URL">適切なアンカーテキスト</a>
   - 少なくとも2〜3箇所は挿入することを推奨しますが、文脈に合わない場合は無理に入れないでください。
   
【挿入候補リンク】
${internalLinksText}` : ""}

【出力形式】
HTML形式で以下を含めること：
- 目次（アンカーリンク付き）
- 導入文（読者の悩みに共感、記事を読むメリット提示）
- 本文（H2×4〜6、各H2にH3×2〜3）
- FAQ（よくある質問3つ、構造化データ対応）
- まとめ＋CTA

以下のJSON形式で出力してください（コードブロックなしで純粋なJSONのみ）:
{
  "content": "完全なHTML記事（目次、本文、FAQ、まとめ含む）",
  "wordCount": 3500,
  "metaTitle": "SEO用タイトル（32文字以内、メインKW前方配置）",
  "metaDescription": "メタディスクリプション（120〜160文字）",
  "faqs": [
    {"question": "質問1", "answer": "回答1"},
    {"question": "質問2", "answer": "回答2"},
    {"question": "質問3", "answer": "回答3"}
  ]
}`;

        const result = await model.generateContent(prompt);
        const text = result.response.text();

        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            throw new Error("Failed to parse AI response");
        }

        const article: GeneratedArticle = JSON.parse(jsonMatch[0]);

        return NextResponse.json({ success: true, data: article });
    } catch (error: unknown) {
        console.error("SEO Draft Error:", error);
        const message = error instanceof Error ? error.message : "Unknown error";
        return NextResponse.json({ success: false, error: message }, { status: 500 });
    }
}

