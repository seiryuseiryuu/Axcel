"use server";

import { generateText } from "@/lib/gemini";
import { requireRole } from "@/lib/rbac";
import { tavily } from "@tavily/core";

export interface StudioState {
  result?: string;
  error?: string;
}

// Initialize Tavily Client
const tavilyClient = process.env.TAVILY_API_KEY ? tavily({ apiKey: process.env.TAVILY_API_KEY }) : null;

// Helper: Web Search
async function searchWeb(query: string): Promise<string> {
  if (!tavilyClient) return "（検索機能未設定）";
  try {
    const result = await tavilyClient.search(query, { searchDepth: "basic", maxResults: 3 });
    return result.results.map((r: any) => `- ${r.title}: ${r.content}`).join("\n");
  } catch (e) {
    return "（検索エラー）";
  }
}

// Helper: Intent Analysis
async function analyzeIntent(topic: string, target: string): Promise<{ userIntent: string; searchQueries: string[] }> {
  const prompt = `
    トピック「${topic}」に対して、ターゲット「${target || "一般層"}」が求めている情報を分析し、
    検索すべきクエリを3つ提案。JSON形式のみで回答:
    {"userIntent": "...", "searchQueries": ["...", "...", "..."]}
    `;
  try {
    const res = await generateText(prompt, 0.5);
    const clean = res.replace(/```json/g, "").replace(/```/g, "").trim();
    return JSON.parse(clean);
  } catch {
    return { userIntent: topic + "に関する詳細情報", searchQueries: [topic] };
  }
}

export async function generateContentAction(prevState: StudioState, formData: FormData): Promise<StudioState> {
  await requireRole("student");

  const type = formData.get("type") as string;
  const toolPath = formData.get("toolPath") as string;
  const topic = formData.get("topic") as string;
  const target = formData.get("target") as string;
  const tone = formData.get("tone") as string;

  if (!topic && !formData.get("title") && !formData.get("product") && !formData.get("niche") && !formData.get("transcript")) {
    return { error: "必須フィールドを入力してください。" };
  }

  try {
    // Determine tool type from toolPath or type
    const toolType = toolPath?.split("/").pop() || type;

    // Get search context for relevant tools
    let searchContext = "";
    if (["seo", "script", "note-writing", "sales-letter", "lp-writing"].includes(toolType)) {
      const intent = await analyzeIntent(topic || formData.get("product") as string, target);
      if (intent.searchQueries.length > 0) {
        searchContext = await searchWeb(intent.searchQueries[0]);
      }
    }

    let prompt = "";

    // ==========================================
    // CONTENT CREATION TOOLS (7)
    // ==========================================

    if (toolType === "seo") {
      const subKeywords = formData.get("subKeywords") as string;
      const wordCount = formData.get("wordCount") as string || "3000";
      const structure = formData.get("structure") as string;
      const persona = formData.get("persona") as string;
      const competitorUrl = formData.get("competitorUrl") as string;
      const ctaLink = formData.get("ctaLink") as string;
      const ctaText = formData.get("ctaText") as string;
      const internalLinks = formData.get("internalLinks") as string;
      const authorExpertise = formData.get("authorExpertise") as string;

      prompt = `あなたは日本トップクラスのSEOライターです。検索1位を獲得できる記事をHTML形式で作成してください。

================================================================================
【キーワード情報】
================================================================================
・メインKW: ${topic}
・サブKW: ${subKeywords || "なし"}
・競合参考: ${competitorUrl || "なし"}

【ターゲット詳細】
・ペルソナ: ${persona || target || "30代会社員、副業に興味あり"}
・抱える課題: ${topic}について具体的な解決策を探している
・検索意図: 「${topic}」で検索する人が本当に知りたいこと

【記事仕様】
・目標文字数: ${wordCount}文字
・文体: ${tone || "親しみやすく専門的"}
・希望構成: ${structure || "問題提起→解決策→具体例→まとめ"}

【誘導先（CTA）】
・リンク: ${ctaLink || "（記事内で自然に提案）"}
・ボタンテキスト: ${ctaText || "詳しくはこちら"}

【内部リンク候補】
${internalLinks || "（自動で関連トピックを提案）"}

【著者の専門性（E-E-A-T）】
${authorExpertise || "（適切な専門性を設定）"}

【最新情報】
${searchContext}

================================================================================
【SEO最適化ルール（検索1位を狙う）】
================================================================================

**タイトル最適化**
- メインKWを前方（最初の15文字以内）に配置
- 32文字以内で収める
- 数字を含める（例: 〇〇の方法7選、2024年最新版）
- ベネフィットを明示（例: 初心者でも〇〇できる）
- クリックしたくなる好奇心を刺激

**メタディスクリプション**
- 120〜160文字
- メインKWとサブKWを自然に含める
- 記事を読むメリットを明確に
- 行動喚起（「〜を解説します」「〜がわかります」）

**見出し構成（H2/H3）**
- H2にメインKWまたは関連KWを含める
- H3で具体的なトピックを展開
- ユーザーの疑問に直接答える形式
- 見出しだけで記事内容が把握できる

**本文SEO**
- 導入文の最初の100文字以内にメインKWを含める
- キーワード密度1〜3%を維持
- 共起語（関連ワード）を自然に盛り込む
- 一文は60文字以内、段落は3〜4文で区切る

**E-E-A-T強化（Googleが重視）**
- Experience（経験）: 実体験エピソードを1〜2箇所含める
- Expertise（専門性）: 専門知識に基づいた詳細な解説
- Authoritativeness（権威性）: 統計データ、公式情報の引用
- Trustworthiness（信頼性）: 正確な情報、更新日記載

**内部リンク戦略**
- 関連記事への自然なリンク3〜5箇所
- アンカーテキストにKWを含める
- ユーザーの回遊を促す配置

**外部リンク（権威性向上）**
- 公式サイト、政府機関、学術論文などへの引用リンク
- rel="noopener"を付与

**構造化データ（リッチスニペット対応）**
- FAQスキーマを含める
- Articleスキーマを含める

================================================================================
【HTML出力形式】
================================================================================

<article itemscope itemtype="https://schema.org/Article">
  <meta itemprop="datePublished" content="YYYY-MM-DD">
  <meta itemprop="dateModified" content="YYYY-MM-DD">
  
  <header>
    <h1 itemprop="headline">【タイトル：32文字以内、KW前方配置】</h1>
    <p class="lead">【リード文：100文字で悩みに共感＋この記事で得られること】</p>
  </header>
  
  <nav class="toc">
    <h2>目次</h2>
    <ol>
      <li><a href="#section1">見出し1</a></li>
      <li><a href="#section2">見出し2</a></li>
      ...
    </ol>
  </nav>
  
  <section id="section1">
    <h2>【H2見出し：KW含む】</h2>
    <p>【本文：具体例・データを含む】</p>
    <h3>【H3小見出し】</h3>
    <p>【詳細説明】</p>
    ${ctaLink ? `<div class="cta-box"><a href="${ctaLink}" class="cta-button">${ctaText || "詳しくはこちら"}</a></div>` : ""}
  </section>
  
  <!-- H2×4〜6セクション -->
  
  <section class="comparison-table">
    <h2>【比較表セクション】</h2>
    <table>
      <thead><tr><th>項目</th><th>A</th><th>B</th></tr></thead>
      <tbody>...</tbody>
    </table>
  </section>
  
  <section class="faq" itemscope itemtype="https://schema.org/FAQPage">
    <h2>よくある質問</h2>
    <div itemscope itemprop="mainEntity" itemtype="https://schema.org/Question">
      <h3 itemprop="name">Q1: 【質問】</h3>
      <div itemscope itemprop="acceptedAnswer" itemtype="https://schema.org/Answer">
        <p itemprop="text">【回答】</p>
      </div>
    </div>
    <!-- Q2, Q3 同様 -->
  </section>
  
  <section id="conclusion">
    <h2>まとめ</h2>
    <ul>
      <li>ポイント1</li>
      <li>ポイント2</li>
      <li>ポイント3</li>
    </ul>
    ${ctaLink ? `<div class="cta-final"><p>【行動喚起メッセージ】</p><a href="${ctaLink}" class="cta-button">${ctaText || "今すぐ始める"}</a></div>` : "<p>【次のアクション提案】</p>"}
  </section>
</article>

<!-- メタディスクリプション案 -->
<meta name="description" content="【120-160文字のメタディスクリプション】">

================================================================================
【品質チェック】
================================================================================
□ タイトルにメインKWが前方配置されている
□ 各H2にKWまたは関連KWが含まれている
□ 導入文100文字以内にメインKWがある
□ 目標文字数を達成している
□ 表が1つ以上含まれている
□ FAQが3つ含まれている（構造化データ付き）
□ CTAが複数箇所に配置されている
□ E-E-A-T要素が含まれている

HTML形式のみ出力。説明文不要。`;
    }

    else if (toolType === "script") {
      const duration = formData.get("duration") as string || "8";
      const hookStyle = formData.get("hookStyle") as string;
      const channelStyle = formData.get("channelStyle") as string;
      const referenceUrl = formData.get("referenceUrl") as string;
      const thumbnailText = formData.get("thumbnailText") as string;
      const videoTitle = formData.get("videoTitle") as string;
      const targetWordCount = formData.get("targetWordCount") as string || "8000";

      prompt = `あなたは超一流のYouTube台本制作者です。視聴維持率95%を達成する「離脱されない」プロ台本を作成してください。

【動画企画】
・タイトル: ${videoTitle || topic}
・サムネ文言: ${thumbnailText || "（自動提案）"}
・尺: ${duration}分
・ターゲット: ${target || "20-40代"}
・チャンネルスタイル: ${channelStyle || "教育系・解説系"}
・トーン: ${tone || "テンポよくエネルギッシュ"}
・参考動画: ${referenceUrl || "なし"}
・目標文字数: ${targetWordCount}文字

【冒頭フックのスタイル】
${hookStyle || "衝撃の事実→共感→解決の約束"}

【最新トレンド】
${searchContext}

================================================================================
【構成テンプレート - PASTOR形式】
================================================================================

以下の構成に沿って、表形式で出力してください：

|大見出し|中見出し|パラグラフ|
|---|---|---|
|OP|インパクトのある結果提示|本文...|
||簡単な挨拶（3秒以内）|本文...|
|PASTOR|視聴者の心境への共感|本文...|
||悩みの言語化（具体例）|本文...|
||問題の拡大（放置した結果）|本文...|
||動画視聴で得られる直接的利益|本文...|
||解決後の理想的な状態|本文...|
||変革と証明（実績をもとに信憑性を高める）|本文...|
||LINE誘導・チャンネル登録誘導|本文...|
|プレ本編|衝撃の結論（常識の破壊/新常識）|本文...|
||根拠がある理由|本文...|
||具体例（気づきを与える）|本文...|
||アクションプラン|本文...|
||メインテーマへの導入|本文...|
|本編1|ポイント①|本文...|
||問題の具体例|本文...|
||問題の原因|本文...|
||解決の原理・理論|本文...|
||実践手順（ステップバイステップ）|本文...|
||注意点・コツ|本文...|
|本編2〜N|（内容に応じて増減）|本文...|
|まとめ|視聴者の背中を押す|本文...|
|ED|エモいメッセージ（自分のストーリー・想い）|本文...|
||追加価値の提示|本文...|
||具体的な特典内容|本文...|
||限定性の演出|本文...|
||行動の簡単さアピール|本文...|
||復習（話を整理し満足度を上げる）|本文...|
||評価誘導・エンディング挨拶|本文...|

================================================================================
【制約条件】
================================================================================

**文体ルール**
- 親しみやすいカジュアルトーンを維持する
- 断定的で自信に満ちた語調で説得力を持たせる
- 「ですよね」「でしょ？」など共感を誘う語尾を適度に使用
- 「みなさん」「あなた」という呼びかけで視聴者との一体感を創出
- 専門用語は分かりやすく説明し、視聴者が理解しやすいレベルに調整
- 小学5年生でも伝わるようにできるだけわかりやすい表現にする

**AIっぽい表現の徹底排除**
- 「〜です」「〜ます」だけで終わる文を「〜んですよ」「〜なんです」「〜ですよね」に変更
- 論理的すぎる構成を、より自然な流れに調整
- 「なので〜」「で、〜」で文を始める表現：全体の10〜15%程度
- 唐突な脱線：全体で2〜3回程度

**語尾ルール**
- 「〜です。〜です。」や「〜でした。〜ました。」のように同じ語尾を2文以上連続で使用しないこと

**文字数制限**
- 挨拶・自己紹介まで：100文字以内
- LINE誘導・チャンネル登録誘導まで：最大800文字以内
- 中見出しごとに最低750文字以上の文章量を確保

**離脱防止テクニック（必須）**
1. 冒頭3秒: 視聴者の痛みを突く一言
2. 15秒以内: この動画を見るメリット明示
3. 本編中: 「ここからが本番」等の期待煽り
4. 情報区切り: 番号で構造化
5. 中盤にサプライズ要素
6. 伏線を張る：「〜については後ほど解説します」

**エンゲージメント**
- 自然にコメント誘導を入れる（1動画で3回まで）
- 視聴者に問いかけを入れる

**エンタメ性強化**
- 視聴者に共感する際は感情表現を極度に誇張し、リアクションを大げさに
- 比喩や例えにポップカルチャー（アニメ、ゲーム、映画）を積極活用
- 数字やデータを劇的に表現（「◯倍改善」「◯%向上」等）
- 「革命的」「禁断の」「秘密の」等の強烈な修飾語を使用

**エンタメ性を高める具体的テクニック**
1. 感情表現の極度な誇張：「参考書をビリビリに破り捨ててやりたい」等
2. わかりやすく面白い比喩：「これって例えば〜と同じなんですよね」
3. 数値の劇的表現：「勝率が52%から71%に激増」「10倍の効果」等
4. 恐怖と希望の対比：「地獄」vs「天国」、「負け組」vs「勝ち組」等

**科学的根拠活用ガイドライン**
- 実在する手法やテクニック、ノウハウのみ使用
- データや統計は正確に引用し、誇張や歪曲は一切行わない
- 「なるほど、そういうことだったのか！」という気づきにつなげる
- 専門的内容も必ず身近な例えや比喩で分かりやすく説明する
- 専門的説明の後は必ず親しみやすいエピソードや例えを入れる
- 「なぜそれをするべきなのか」「具体的にどうするのか」「まず何をすればいいのか」を必ず説明
- 動画を見ながら実践できるワークを各セクションに組み込む

**執筆規約**
- 必ず構成に沿って作成すること
- パラグラフ間で同一主語を何度も表示させない
- 数字、具体例を織り混ぜ文章に深みを持たせる
- 中見出し1つに対してパラグラフは最低5つ作成すること
- 各パラグラフは別々の行に記載すること
- 見出し間・パラグラフ間の文章の繋がりは自然な流れを意識
- パラグラフ間で同一主語・単語の繰り返しを避ける
- サボらず途中で「続く」などで文章の執筆をとめない
- 全体として、中見出しごとに最低750文字以上の文章量を確保
- 小学5年生でも伝わるようにできるだけわかりやすい表現にする
- 科学的内容の後は必ず親しみやすいエピソードや身近な例えで緩急をつける
- 視聴者の「なぜ？」「どうやって？」「何から？」の疑問を先回りして解消
- 実際に体験できるワークを各セクションに組み込む

================================================================================
【出力形式】
================================================================================

━━━━━━━━━━━━━━━━━━━━
【タイトル案】3パターン
【サムネイル文言】2-6文字×3パターン

【台本】（表形式）
|大見出し|中見出し|パラグラフ|
|---|---|---|
（上記構成に沿って全て出力）

【B-roll提案】
各セクションで使用する映像素材

【品質チェック】
□ 冒頭30秒でインパクトがあるか
□ 同じ語尾が連続していないか
□ 目標文字数に達しているか
□ コメント誘導が3回以内か
□ 中見出しごとに750文字以上あるか
□ 小学5年生でも理解できる表現か
□ エンタメ要素と教育要素のバランスが取れているか
━━━━━━━━━━━━━━━━━━━━

⚠️注意⚠️
本編はただ情報量を増やせば良いというわけではなく、視聴者が次にほしいと思う情報をピンポイントで解説し、サムネ・タイトルと内容に一貫性があるもののみを増やすこと。
もともとの本題と大きくズレたテーマを取り扱うと視聴者にとって情報過多になってしまうため、その場合は別の動画でそのテーマに特化して解説を行う。

サボらず途中で「続く」などで文章の執筆を止めず、全構成を完成させてください。`;
    }

    else if (toolType === "short-script") {
      const platform = formData.get("platform") as string || "tiktok";
      const hookType = formData.get("hookType") as string;
      const cta = formData.get("cta") as string;
      const referenceUrl = formData.get("referenceUrl") as string;

      const platformSpecs: Record<string, string> = {
        tiktok: "TikTok: 15-60秒、縦型9:16、キャッチーな音楽必須",
        shorts: "YouTube Shorts: 60秒以内、縦型、サムネ不要",
        reels: "Instagram Reels: 15-90秒、縦型、ハッシュタグ重要"
      };

      prompt = `あなたはショート動画のバイラルクリエイターです。100万再生を狙える台本を作成してください。

【プラットフォーム】
${platformSpecs[platform] || platformSpecs.tiktok}

【企画】
・テーマ: ${topic}
・フック種類: ${hookType || "数字インパクト"}
・トーン: ${tone || "カジュアル・共感"}
・CTA: ${cta || "フォロー誘導"}
・参考動画: ${referenceUrl || "なし"}

【バイラル必須要素】
1. 冒頭1秒: スクロール停止フック
2. 3秒以内: 「見る理由」提示
3. 中盤: 意外性/緊張感
4. ラスト: 行動喚起or余韻

【出力形式】

━━━━━━━━━━━━━━━━━━━━
【キャプション】絵文字+ハッシュタグ込み

【秒単位タイムライン】
0:00-0:01 [フック] 
0:01-0:03 [問題提起]
0:03-0:10 [解決策/メイン]
0:10-0:13 [サプライズ]
0:13-0:15 [CTA]

【ナレーション全文】
（読み上げテキスト）

【音楽提案】
・曲調: 
・BPM目安:
・おすすめ楽曲例:

【字幕テキスト】
（画面に表示するテキスト、改行含む）

【撮影指示】
・カメラワーク:
・照明:
・服装:
━━━━━━━━━━━━━━━━━━━━`;
    }

    else if (toolType === "video-clip") {
      const transcript = formData.get("transcript") as string;
      const clipCount = formData.get("clipCount") as string || "5";
      const clipPurpose = formData.get("clipPurpose") as string;
      const targetAudience = formData.get("targetAudience") as string;
      const maxLength = formData.get("maxLength") as string || "60";

      prompt = `あなたはショート動画のバイラル編集者です。長尺動画からバズる切り抜きポイントを分析してください。

【動画内容】
${transcript || topic}

【切り抜き仕様】
・提案数: ${clipCount}個
・目的: ${clipPurpose || "チャンネル認知拡大"}
・ターゲット: ${targetAudience || target || "新規視聴者"}
・最大長さ: ${maxLength}秒

【分析観点】
1. 感情のピーク（驚き/笑い/感動）
2. 価値提供（学び/気づき）
3. 議論喚起（コメントが集まりそう）
4. シェア衝動（誰かに伝えたくなる）

【出力形式】

━━━━━━━━━━━━━━━━━━━━
【切り抜き提案 #1】
▼バイラル度: ⭐⭐⭐⭐⭐ (5段階)
▼推定再生数: ○万回
▼タイムスタンプ: XX:XX - XX:XX
▼タイトル案: 
▼キャプション案:
▼選定理由:
▼編集ポイント:
  - カット指示
  - テロップ追加箇所
  - 音楽提案

【切り抜き提案 #2】
（以下同様）
━━━━━━━━━━━━━━━━━━━━

【総評】
・最もバズりそうな順位
・組み合わせ提案（シリーズ化）`;
    }

    else if (toolType === "social-post") {
      const platform = formData.get("platform") as string || "x";
      const accountTone = formData.get("accountTone") as string;
      const pastBuzz = formData.get("pastBuzz") as string;
      const postTime = formData.get("postTime") as string;
      const hashtags = formData.get("hashtags") as string;

      prompt = `あなたはSNSバズ投稿のプロです。エンゲージメント率10%以上を狙える投稿を作成してください。

【プラットフォーム】
${platform === "x" ? "X (Twitter): 280文字制限、画像4枚まで" : "Threads: 500文字、画像10枚まで"}

【投稿テーマ】
${topic}

【アカウント情報】
・トーン: ${accountTone || "カジュアルで親しみやすい"}
・過去のバズ投稿: ${pastBuzz || "なし"}
・投稿予定時間: ${postTime || "19:00-21:00"}
・希望ハッシュタグ: ${hashtags || "なし"}

【バズ要素分析】
1. 共感: 「わかる〜」と言いたくなる
2. 学び: RTして保存したくなる
3. 議論: コメントしたくなる
4. 笑い: 思わず吹き出す
5. 驚き: 「マジか」と思う

【出力形式】

━━━━━━━━━━━━━━━━━━━━
【パターン1: 共感型】
▼本文:
▼画像/動画案:
▼エンゲージメント予測: いいね○○、RT○○
▼推奨投稿時間:

【パターン2: 学び型】

【パターン3: 議論型】

【パターン4: ストーリー型】

【パターン5: ユーモア型】
━━━━━━━━━━━━━━━━━━━━

【ハッシュタグ提案】
メイン: #○○ #○○
サブ: #○○ #○○

【投稿スケジュール案】
1投稿目 → 2投稿目（リプ形式）→ 翌日フォロー投稿`;
    }

    else if (toolType === "note-writing") {
      const articleType = formData.get("articleType") as string || "free";
      const outline = formData.get("outline") as string;
      const quote = formData.get("quote") as string;
      const wordCount = formData.get("wordCount") as string || "2000";

      prompt = `あなたはnoteで月100万円稼ぐトップクリエイターです。読者の心を動かす記事を作成してください。

【記事タイプ】
${articleType === "paid" ? "有料記事（価格設定提案含む）" : "無料記事（フォロワー獲得目的）"}

【テーマ】
${topic}

【ターゲット読者】
${target || "20-40代、自己成長に興味あり"}

【希望構成】
${outline || "体験談→気づき→具体的方法→まとめ"}

【引用・参考】
${quote || "なし"}

【文字数目安】
${wordCount}文字

【最新トレンド】
${searchContext}

【noteの勝ちパターン】
1. タイトル: 数字+ベネフィット+意外性
2. 冒頭: 自己開示で信頼獲得
3. 本文: ストーリー→教訓→再現手順
4. 画像: 見出しごとに挿入
5. スキ誘導: 途中に「スキで応援」

【出力形式】

━━━━━━━━━━━━━━━━━━━━
【タイトル案】3パターン
【サブタイトル】
【アイキャッチ文言】（画像に載せる文字）

【本文】
（マークダウン形式で、見出しに ##を使用）

【価格設定提案】（有料の場合）
・推奨価格: ○○円
・理由:

【マガジン提案】

【ハッシュタグ】
━━━━━━━━━━━━━━━━━━━━`;
    }

    else if (toolType === "presentation") {
      const duration = formData.get("duration") as string || "15";
      const tool = formData.get("tool") as string || "powerpoint";
      const designStyle = formData.get("designStyle") as string;
      const slideCount = formData.get("slideCount") as string || "10";
      const audience = formData.get("audience") as string;

      prompt = `あなたは経営コンサルのプレゼン資料作成のプロです。聴衆を惹きつける資料を設計してください。

【プレゼン概要】
・テーマ: ${topic}
・発表時間: ${duration}分
・スライド枚数目安: ${slideCount}枚
・対象: ${audience || target || "経営陣"}
・使用ツール: ${tool}

【デザインスタイル】
${designStyle || "シンプル＆モダン、青系配色"}

【プレゼン勝利の法則】
1. 冒頭: 聴衆の課題を代弁
2. 中盤: データで納得、ストーリーで共感
3. 終盤: 明確なNext Action
4. 1スライド1メッセージ
5. 文字は最小限（読ませない、見せる）

【出力形式】

━━━━━━━━━━━━━━━━━━━━
【スライド1: タイトル】
▼タイトル:
▼サブタイトル:
▼視覚要素:
▼発表ノート（読み上げ原稿）:

【スライド2: 課題提起】
▼見出し:
▼キービジュアル案:
▼データ/グラフ提案:
▼発表ノート:

【スライド3-${slideCount}: 本編】
（各スライドごとに同様の形式で）

【スライドN: まとめ＆CTA】
▼Key Takeaway 3点:
▼Next Action:
━━━━━━━━━━━━━━━━━━━━

【デザインガイド】
・配色: メイン/アクセント/背景
・フォント: 見出し/本文
・アイコンスタイル:`;
    }

    // ==========================================
    // IMAGE CREATION TOOLS (4, excluding thumbnail)
    // ==========================================

    else if (toolType === "eyecatch") {
      const title = formData.get("title") as string || topic;
      const brandColor = formData.get("brandColor") as string;
      const style = formData.get("style") as string;
      const referenceImage = formData.get("referenceImage") as string;

      prompt = `あなたはWebデザイナーです。CTR（クリック率）を最大化するブログアイキャッチ画像の設計を行ってください。

【記事情報】
・タイトル: ${title}
・ターゲット: ${target || "20-40代"}

【ブランド情報】
・カラー: ${brandColor || "#3B82F6（青系）"}
・スタイル: ${style || "モダン・クリーン"}
・参考画像: ${referenceImage || "なし"}

【アイキャッチ設計ルール】
1. OGP最適化: 1200×630px
2. 視認性: スマホでも文字が読める
3. ブランド一貫性
4. 感情喚起: 好奇心/驚き/安心

【出力形式】

━━━━━━━━━━━━━━━━━━━━
【メイン案】
▼レイアウト:
  - 文字配置:
  - 画像/イラスト配置:
▼テキスト:
  - メイン（5-10文字）:
  - サブ（10-20文字）:
▼配色:
  - 背景:
  - 文字:
  - アクセント:
▼フォント提案:
▼使用素材提案:

【バリエーション1: ダーク版】
【バリエーション2: ミニマル版】
【バリエーション3: インパクト重視版】
━━━━━━━━━━━━━━━━━━━━

【Canva/Figma再現手順】
1. 背景設定
2. テキスト配置
3. 装飾追加

【画像生成プロンプト】
（AI画像生成ツール用の英語プロンプト）`;
    }

    else if (toolType === "insta-story") {
      const seriesCount = formData.get("seriesCount") as string || "5";
      const cta = formData.get("cta") as string;
      const followerType = formData.get("followerType") as string;
      const interactiveElements = formData.get("interactiveElements") as string;

      prompt = `あなたはInstagramマーケティングのプロです。エンゲージメント率を最大化するストーリーズシリーズを設計してください。

【シリーズ概要】
・テーマ: ${topic}
・枚数: ${seriesCount}枚
・ターゲット: ${followerType || target || "20-30代女性"}
・CTA: ${cta || "プロフィールリンクへ誘導"}

【インタラクティブ要素】
${interactiveElements || "投票、クイズ、質問ボックス"}

【ストーリーズ勝利の法則】
1. 1枚目: フック（スワイプ継続させる）
2. 中盤: 価値提供＋インタラクション
3. 最後: 明確なCTA
4. 各枚10秒で読める量
5. 毎枚に1つのインタラクティブ要素

【出力形式】

━━━━━━━━━━━━━━━━━━━━
【ストーリー1/1枚目: フック】
▼テキスト:
▼背景イメージ:
▼インタラクティブ要素:
▼配色:
▼フォント:

【ストーリー2/2枚目: 問題提起】
...

【ストーリー${seriesCount}/${seriesCount}枚目: CTA】
━━━━━━━━━━━━━━━━━━━━

【ハイライト保存用タイトル】

【投稿タイミング】
・曜日:
・時間帯:
・理由:`;
    }

    else if (toolType === "line-banner") {
      const title = formData.get("title") as string || topic;
      const campaignDetails = formData.get("campaignDetails") as string;
      const bannerSize = formData.get("bannerSize") as string || "richMenu";
      const buttonText = formData.get("buttonText") as string;

      const sizeSpecs: Record<string, string> = {
        richMenu: "リッチメニュー: 2500×1686px または 2500×843px",
        richMessage: "リッチメッセージ: 1040×1040px",
        card: "カードタイプ: 1024×520px"
      };

      prompt = `あなたはLINE公式アカウントのデザイナーです。タップ率を最大化するバナーを設計してください。

【バナー情報】
・メッセージ: ${title}
・サイズ: ${sizeSpecs[bannerSize] || sizeSpecs.richMenu}
・キャンペーン詳細: ${campaignDetails || "なし"}
・ボタンテキスト: ${buttonText || "詳しく見る"}

【LINEバナー勝利の法則】
1. 視認性: 文字は18pt以上
2. CTAボタン: 目立つ色で配置
3. 緊急性: 期間限定/数量限定
4. ベネフィット明確化

【出力形式】

━━━━━━━━━━━━━━━━━━━━
【メイン案】
▼レイアウト:
  - 左エリア:
  - 右エリア:
  - ボタン位置:
▼テキスト:
  - キャッチ:
  - サブ:
  - ボタン:
▼配色:
▼注意事項（期間/条件）:

【リッチメニュー版】
（6分割/3分割のアイコン＋テキスト案）

【リッチメッセージ版】
━━━━━━━━━━━━━━━━━━━━

【Canva再現手順】

【A/Bテスト提案】
・パターンA: ○○訴求
・パターンB: ○○訴求`;
    }

    else if (toolType === "note-thumbnail") {
      const title = formData.get("title") as string || topic;
      const platform = formData.get("platform") as string || "note";
      const priceRange = formData.get("priceRange") as string;
      const sellingPoint = formData.get("sellingPoint") as string;

      const platformSpecs: Record<string, string> = {
        note: "note: 1280×670px、シンプル＆信頼感",
        brain: "Brain: 1280×670px、稼げる感・緊急性",
        tips: "Tips: 1200×630px、専門性・権威性"
      };

      prompt = `あなたはコンテンツ販売のプロです。売れるサムネイルを設計してください。

【コンテンツ情報】
・タイトル: ${title}
・プラットフォーム: ${platformSpecs[platform] || platformSpecs.note}
・価格帯: ${priceRange || "未定"}
・ターゲット: ${target || "副業・スキルアップ志向"}
・売り文句: ${sellingPoint || "なし"}

【販売心理設計】
1. 権威性: 実績/数字を前面に
2. ベネフィット: 購入後の未来を見せる
3. 希少性: 期間限定/人数限定
4. 社会的証明: 購入者の声

【出力形式】

━━━━━━━━━━━━━━━━━━━━
【メイン案】
▼レイアウト:
▼キャッチコピー:
  - メイン（10文字以内）:
  - サブ:
▼使用する数字/実績:
▼人物/アイコン:
▼配色:
▼フォント:

【信頼性重視版】
【緊急性重視版】
【ベネフィット重視版】
━━━━━━━━━━━━━━━━━━━━

【価格設定提案】
・推奨価格:
・理由:
・返金保証の有無:

【画像生成プロンプト】`;
    }

    // ==========================================
    // COPYWRITING TOOLS (3)
    // ==========================================

    else if (toolType === "sales-letter") {
      const product = formData.get("product") as string || topic;
      const framework = formData.get("framework") as string || "aida";
      const evidence = formData.get("evidence") as string;
      const painPoints = formData.get("painPoints") as string;
      const priceStrategy = formData.get("priceStrategy") as string;

      const frameworks: Record<string, string> = {
        aida: "AIDA（注意→興味→欲求→行動）",
        pas: "PAS（問題→煽り→解決）",
        quest: "QUEST（適格→理解→教育→刺激→移行）"
      };

      prompt = `あなたは年商10億円のセールスライターです。成約率を最大化するセールスレターを作成してください。

【商品/サービス】
${product}

【ターゲット】
${target || "30-50代経営者・個人事業主"}

【使用フレームワーク】
${frameworks[framework] || frameworks.aida}

【証拠・実績】
${evidence || "事例3つ以上必要"}

【痛みポイント】
${painPoints || "時間がない、成果が出ない、やり方がわからない"}

【価格戦略】
${priceStrategy || "価値提示後に価格、アンカリング使用"}

【最新情報】
${searchContext}

【セールスレター必須要素】
1. ヘッドライン: 一瞬で読み進めたくなる
2. オープニング: 共感から入る
3. ストーリー: Before→気づき→After
4. ベネフィット: 箇条書きで10個以上
5. 証拠: 実績、お客様の声
6. オファー: 価格＋特典＋保証
7. 緊急性: 期間/数量限定
8. CTA: 複数回設置

【出力形式】

━━━━━━━━━━━━━━━━━━━━
【ヘッドライン】
（キャッチ＋サブヘッド）

【オープニング（共感）】

【問題提起】

【煽り/深掘り】

【解決策提示】

【ベネフィット（10個）】
1.
2.
...

【証拠/実績】

【お客様の声】3件

【オファー】
・本体価格:
・特典1:
・特典2:
・特典3:
・保証:
・特別価格:

【緊急性】

【CTA】

【追伸】
━━━━━━━━━━━━━━━━━━━━`;
    }

    else if (toolType === "lp-writing") {
      const product = formData.get("product") as string || topic;
      const firstView = formData.get("firstView") as string;
      const benefits = formData.get("benefits") as string;
      const faq = formData.get("faq") as string;
      const cta = formData.get("cta") as string;

      prompt = `あなたはCVR（コンバージョン率）5%以上を達成するLPライターです。

【商品/サービス】
${product}

【ターゲット】
${target || "20-40代、課題解決を求めている層"}

【ファーストビュー案】
${firstView || "キャッチコピー＋ビジュアル＋CTA"}

【3大ベネフィット】
${benefits || "自動提案してください"}

【よくある質問】
${faq || "3つ自動生成"}

【CTA】
${cta || "無料で試す"}

【最新トレンド】
${searchContext}

【LP成功の法則】
1. ファーストビュー: 3秒で離脱を防ぐ
2. 問題提起: 「あなたも○○で悩んでいませんか？」
3. ベネフィット: 機能ではなく得られる未来
4. 社会的証明: 実績＋お客様の声
5. FAQ: 購入障壁を除去
6. CTA: 複数箇所に設置

【出力形式】

━━━━━━━━━━━━━━━━━━━━
【セクション1: ファーストビュー】
▼キャッチコピー:
▼サブコピー:
▼メインビジュアル案:
▼CTA:

【セクション2: 問題提起】
▼見出し:
▼本文:

【セクション3: 解決策】
▼見出し:
▼商品紹介:

【セクション4: ベネフィット】
▼ベネフィット1:
▼ベネフィット2:
▼ベネフィット3:

【セクション5: 実績/証明】

【セクション6: お客様の声】3件

【セクション7: 料金プラン】

【セクション8: FAQ】3問

【セクション9: 最終CTA】
━━━━━━━━━━━━━━━━━━━━

【CTAバリエーション】
・ボタン文言案×5

【HTML構造提案】`;
    }

    else if (toolType === "vsl-writing") {
      const product = formData.get("product") as string || topic;
      const duration = formData.get("duration") as string || "15";
      const storyArc = formData.get("storyArc") as string;
      const emotionalCurve = formData.get("emotionalCurve") as string;
      const brollNotes = formData.get("brollNotes") as string;

      prompt = `あなたはVSL（ビデオセールスレター）の専門家です。視聴完了率80%、成約率3%以上を狙える台本を作成してください。

【商品/サービス】
${product}

【ターゲット】
${target || "30-50代、購買意欲の高い層"}

【動画尺】
${duration}分

【ストーリーアーク】
${storyArc || "どん底→気づき→変革→成功"}

【感情曲線】
${emotionalCurve || "共感→焦り→希望→確信→行動"}

【B-roll素材メモ】
${brollNotes || "自動提案"}

【VSL成功の法則】
1. 冒頭: 「今すぐ閉じないで」のフック
2. ストーリー: 共感できる体験談
3. 問題深掘り: 痛みを明確に
4. 解決策: 唯一無二の方法
5. 証拠: before/after、実績
6. オファー: 価値＞価格
7. 緊急性: 今買う理由
8. CTA: 複数回

【出力形式】

━━━━━━━━━━━━━━━━━━━━
【分単位構成】

【0:00-0:30】オープニングフック
▼ナレーション:
▼B-roll:
▼テロップ:

【0:30-2:00】ストーリー導入
▼ナレーション:
▼B-roll:

【2:00-5:00】問題の深掘り
▼ナレーション:
▼データ/グラフ:

【5:00-8:00】解決策の提示
▼ナレーション:
▼B-roll:

【8:00-10:00】証拠/実績
▼お客様の声（3人）:
▼Before/After:

【10:00-12:00】オファー
▼ナレーション:
▼価格提示:
▼特典紹介:

【12:00-14:00】緊急性/限定性
▼ナレーション:

【14:00-15:00】最終CTA
▼ナレーション:
▼画面表示:
━━━━━━━━━━━━━━━━━━━━

【撮影指示書】`;
    }

    // ==========================================
    // STRATEGY TOOLS (3)
    // ==========================================

    else if (toolType === "product-design") {
      const niche = formData.get("niche") as string || topic;
      const marketAnalysis = formData.get("marketAnalysis") as string;
      const competitors = formData.get("competitors") as string;
      const budget = formData.get("budget") as string;

      prompt = `あなたは年商10億円規模のプロダクトマネージャーです。売れる商品を設計してください。

【ニッチ/市場】
${niche}

【ターゲット顧客】
${target || "30-50代、課題解決意欲が高い層"}

【市場分析】
${marketAnalysis || "自動分析してください"}

【競合情報】
${competitors || "主要競合3社を想定"}

【価格帯】
${budget || "3万円〜10万円"}

【商品設計フレームワーク】
1. 顧客の痛み（本質的課題）
2. 理想の未来（ゴール）
3. 現状の障壁（なぜ達成できないか）
4. 解決策（あなたの商品）
5. 差別化ポイント

【出力形式】

━━━━━━━━━━━━━━━━━━━━
【商品案1】
▼商品名:
▼コンセプト（一言）:
▼ターゲット詳細:
▼痛み:
▼ゴール:
▼提供内容:
  - メイン:
  - サブ1:
  - サブ2:
▼差別化ポイント:
▼推奨価格:
▼収益シミュレーション:
▼実装ステップ:
  1.
  2.
  3.

【商品案2】
【商品案3】
━━━━━━━━━━━━━━━━━━━━

【比較表】
| 項目 | 案1 | 案2 | 案3 |
|------|-----|-----|-----|

【推奨案とその理由】`;
    }

    else if (toolType === "funnel-design") {
      const product = formData.get("product") as string || topic;
      const budget = formData.get("budget") as string;
      const existingList = formData.get("existingList") as string;
      const tools = formData.get("tools") as string;
      const entryPoint = formData.get("entryPoint") as string;

      prompt = `あなたはマーケティングファネルの専門家です。売上最大化のファネルを設計してください。

【最終商品】
${product}

【入口商品】
${entryPoint || "無料PDF/ウェビナー"}

【予算】
${budget || "月10万円"}

【既存リスト】
${existingList || "ゼロからスタート"}

【使用可能ツール】
${tools || "LINE、メール、LP、決済システム"}

【ファネル設計原則】
1. 認知→興味→検討→購入→リピート
2. 各段階で価値提供
3. アップセル/クロスセル設計
4. LTV最大化

【出力形式】

━━━━━━━━━━━━━━━━━━━━
【ファネル全体図】
（テキストベースのフロー図）

【STEP1: 認知/集客】
▼チャネル:
▼施策:
▼KPI:
▼予算配分:

【STEP2: リード獲得】
▼無料オファー:
▼LP設計:
▼KPI:

【STEP3: 教育/ナーチャリング】
▼シナリオ:
  - Day1:
  - Day3:
  - Day7:
▼使用ツール:

【STEP4: フロントエンド販売】
▼商品:
▼価格:
▼セールス手法:

【STEP5: バックエンド販売】
▼商品:
▼価格:
▼タイミング:

【STEP6: リピート/紹介】
▼施策:
━━━━━━━━━━━━━━━━━━━━

【KPI一覧】
| ステップ | 目標数値 | 計測方法 |

【月間売上シミュレーション】

【必要ツール一覧】`;
    }

    else if (toolType === "curriculum") {
      const courseTitle = formData.get("topic") as string || topic;
      const learnerLevel = formData.get("learnerLevel") as string;
      const weeks = formData.get("weeks") as string || "4";
      const completionCriteria = formData.get("completionCriteria") as string;
      const materialFormat = formData.get("materialFormat") as string;

      prompt = `あなたはオンラインコース設計のプロです。修了率80%以上のカリキュラムを設計してください。

【コーステーマ】
${courseTitle}

【受講者レベル】
${learnerLevel || target || "初心者〜中級者"}

【期間】
${weeks}週間

【修了条件】
${completionCriteria || "全レッスン完了＋課題提出"}

【教材形式】
${materialFormat || "動画＋テキスト＋ワークシート"}

【カリキュラム設計原則】
1. 学習目標の明確化（各週/各レッスン）
2. スモールステップ
3. 実践→フィードバック→改善のサイクル
4. モチベーション維持の仕掛け
5. コミュニティ/サポート設計

【出力形式】

━━━━━━━━━━━━━━━━━━━━
【コース概要】
▼タイトル:
▼サブタイトル:
▼対象者:
▼ゴール:
▼修了後の姿:

【週別カリキュラム】

【Week 1: ○○】
▼テーマ:
▼学習目標:
▼レッスン1:
  - 内容:
  - 形式: 動画○分/テキスト
  - 課題:
▼レッスン2:
▼週末課題:
▼チェックポイント:

【Week 2-${weeks}】
（同様の形式で）
━━━━━━━━━━━━━━━━━━━━

【評価基準】
| 課題 | 配点 | 評価基準 |

【サポート体制】
・Q&A:
・コミュニティ:
・個別サポート:

【教材リスト】
・動画数:
・テキスト量:
・ワークシート:`;
    }

    // ==========================================
    // DEFAULT FALLBACK
    // ==========================================
    else {
      prompt = `以下のテーマについて、プロフェッショナルなコンテンツを作成してください:

テーマ: ${topic}
ターゲット: ${target || "一般層"}
トーン: ${tone || "丁寧かつ実用的"}

詳細で実用的な内容を出力してください。`;
    }

    const result = await generateText(prompt, 0.7);
    return { result };

  } catch (e: any) {
    console.error("Studio generation error:", e);
    return { error: e.message || "生成中にエラーが発生しました" };
  }
}
