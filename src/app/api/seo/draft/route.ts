import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { DraftRequest, GeneratedArticle } from "@/types/seo-types";

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY || "");

// Web search for latest information and official links
async function searchLatestInfo(keyword: string, topics: string[]): Promise<string> {
    const tavilyApiKey = process.env.TAVILY_API_KEY;
    if (!tavilyApiKey) {
        console.log("Tavily API key not configured, skipping web search");
        return "";
    }

    try {
        console.log(`Starting web search for: ${keyword}`);
        // Search queries for latest info and official/actionable pages
        const searchQueries = [
            `${keyword} 最新ニュース 2025`,
            `${keyword} 最新モデル バージョン 変更点`,
            `${keyword} 公式サイト 申し込み 手続き`,
        ];

        const results: string[] = [];
        const actionLinks: string[] = [];

        // Execute searches
        for (const query of searchQueries) {
            const response = await fetch("https://api.tavily.com/search", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    api_key: tavilyApiKey,
                    query: query,
                    search_depth: "advanced", // Changed to advanced for better results
                    include_answer: true,
                    max_results: 5, // Increased from 3
                }),
            });

            if (response.ok) {
                const data = await response.json();

                // Collect official/actionable links
                if (data.results) {
                    data.results.forEach((r: { title: string; url: string; content: string }) => {
                        // Check if it looks like an official or actionable link
                        if (
                            r.title.includes("公式") ||
                            r.title.includes("申し込み") ||
                            r.title.includes("申請") ||
                            r.title.includes("ガイドライン") ||
                            r.title.includes("料金") ||
                            r.title.includes("プラン")
                        ) {
                            actionLinks.push(`- [公式・アクション] ${r.title}: ${r.url}`);
                        }
                    });

                    // Add snippets for context
                    const snippets = data.results
                        .slice(0, 3) // Increased from 2
                        .map((r: { title?: string; content?: string; url?: string }) =>
                            `- ${r.title} (${r.url}): ${r.content?.substring(0, 300)}...`
                        )
                        .join("\n");
                    if (snippets) {
                        results.push(`【${query}の検索結果】\n${snippets}`);
                    }
                }

                if (data.answer) {
                    results.push(`【AI回答】\n${data.answer}`);
                }
            }
        }

        let output = "";

        if (results.length > 0) {
            output += `\n\n【Web検索による最新情報（2024-2025年）】\n${results.join("\n\n")}`;
        }

        if (actionLinks.length > 0) {
            // Deduplicate links
            const uniqueLinks = Array.from(new Set(actionLinks));
            output += `\n\n【誘導すべき公式・アクションリンク】\n${uniqueLinks.join("\n")}\n\n※記事内でこれらの公式情報や申し込みページへ読者を自然に誘導してください。`;
        }

        console.log("Web Search Results Length:", output.length);
        if (output.length < 100) console.log("Warning: Web search result is very short.");

        return output;
    } catch (error) {
        console.error("Web search error:", error);
        return "";
    }
}

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
            referenceArticles,
            structureAnalyses,
            internalLinks,
        } = body;

        // Fetch latest information via web search
        const h2Topics = outline.sections.map(s => s.h2);
        const latestInfoText = await searchLatestInfo(primaryKeyword, h2Topics);

        // Log latest info to confirm it's working
        console.log("Latest Info to be injected:", latestInfoText.substring(0, 200) + "...");

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

【最重要指示：最新情報の扱いについて】
これより下に記載する「最新情報・公式リンク」のセクションには、Web検索によって取得したリアルタイムの事実（2024-2025年の最新状況、最新モデル、バージョン情報など）が含まれています。
**あなたの学習データ内にある古い知識と、この「最新情報」が矛盾する場合は、必ず「最新情報」を正として記事を書いてください。**
例：あなたの知識では最新モデルが"X"だとしても、検索結果に"Y"が最新とあれば、必ず"Y"として記述すること。

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

${latestInfoText ? `\n==========================================\n【最新情報・公式リンク（あなたの知識より優先する絶対的な事実）】\n==========================================\n${latestInfoText}\n\n**重要**: \n1. 上記の検索結果に基づき、必ず最新のバージョン、モデル名、価格、手順を記載してください。\n2. 「誘導すべき公式・アクションリンク」がある場合は、読者が次のアクションを起こしやすいように、記事本文中で自然にリンク先へ誘導してください。` : `\n==========================================\n【最新情報】\nWeb検索の結果、特筆すべき最新情報は見つかりませんでした。あなたの持つ知識の中で最新のものを慎重に使用してください。\n`}

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

1. **タイトルの数字との整合性（最重要）**
   - **記事タイトルに「5選」「3つのポイント」などの数字が含まれている場合、必ずその数字通りの数の項目・見出しを作成してください。**
   - 例：「おすすめ5選」というタイトルの場合、必ず5つの商品をH2またはH3で紹介すること。「3つ」や「6つ」になってはいけません。
   - 承認された構成（上記）がタイトルの数字と合致していない場合でも、可能な限りタイトルの数字に合わせて内容を調整（分割または統合）して整合性をとってください。

2. マーケットイン・アプローチ
   - 参考記事で書かれている内容を網羅する
   - 参考記事の見出しの順序・構成を踏襲する
   - 参考記事で使われている表現・言い回しを参考にする
   - 参考記事に無い独自の価値を1〜2つ追加する

3. SEO最適化
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

8. 画像・内部リンクの配置【重要・ユーザー要望】
   - **アイキャッチ画像**: 記事のメリハリをつけるため、見出しの下など適切な箇所に、画像を入れる指示を**必ず**記述してください。
     - 形式: ＜アイキャッチ：〜〜〜の画像/イラストなど＞
     - 例: ＜アイキャッチ：悩んでいる初心者のイラスト＞
     - 各H2セクションに最低1つのアイキャッチ指示を含めてください
   
   - **内部リンク【重要：自然な誘導文で挿入】**: 
     - ❌ NG例: ＜内部リンク候補：困り眉の整え方とは？（URL：https://...）＞
     - ✅ OK例（自然な誘導）: 
       - 「眉の形を整える際のポイントについては、<a href="https://example.com/article">こちらの記事</a>で詳しく解説しています。」
       - 「より詳しい〇〇については、<a href="https://example.com">関連記事</a>も合わせてご覧ください。」
       - 「〇〇で悩んでいる方は、<a href="https://example.com">△△の完全ガイド</a>も参考になります。」
     - 本文の流れに沿って、読者が「もっと知りたい」と思うタイミングで自然にリンクを挿入すること
     - プレースホルダー形式ではなく、実際のHTMLリンクとして出力すること
   
   【まとめセクションでの活用・重要】
    - まとめ部分では、記事の内容を振り返りつつ、関連記事へのリンクを「合わせて読みたい記事」として自然に紹介してください。
    - **まとめの書き方は、同じメディアの他の記事（参考記事）の「まとめ」セクションを参考にしてください。**
    - 参考記事でどのようにまとめを書いているか（文体、構成、CTA配置など）を踏襲すること。
    - CTA（Call To Action）も、これらの内部リンク先へ自然に繋がるように設計してください。

${internalLinksText ? `   【挿入候補リンク（これらを本文中で自然に紹介してください）】\n${internalLinksText}` : ""}

【出力形式】
HTML形式で以下を含めること：
- 目次（アンカーリンク付き）
- 導入文（読者の悩みに共感、記事を読むメリット提示）
- 本文（H2×4〜6、各H2にH3×2〜3、各H2に ＜アイキャッチ：...＞ を含める）
- FAQ（よくある質問3つ、構造化データ対応）
- まとめ＋CTA（参考記事のスタイルを踏襲）

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

        // Try to find JSON object
        const jsonMatch = cleanedText.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            console.error("Failed to parse AI response. Raw text:", text.substring(0, 500));
            throw new Error("AIレスポンスの解析に失敗しました。もう一度お試しください。");
        }

        const article: GeneratedArticle = JSON.parse(jsonMatch[0]);

        return NextResponse.json({ success: true, data: article });
    } catch (error: unknown) {
        console.error("SEO Draft Error:", error);
        const message = error instanceof Error ? error.message : "Unknown error";
        return NextResponse.json({ success: false, error: message }, { status: 500 });
    }
}
