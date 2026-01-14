"use server";

import { generateText, generateWithYouTube, generateMultimodal } from "@/lib/gemini";
import { fetchVideoData } from "@/lib/youtube";
import { sendSlackNotification } from "@/lib/slack";

export async function analyzeStructure(referenceUrl: string) {
    try {
        console.log("[analyzeStructure] Starting analysis for:", referenceUrl);

        // YouTube動画の情報と字幕を取得
        const videoData = await fetchVideoData(referenceUrl);

        let videoContext = "";
        let hasTranscriptData = false;
        let originalTranscript = "";  // 元動画の字幕を保存

        if (videoData.success && videoData.data) {
            const { title, description, channelTitle, transcript, hasTranscript } = videoData.data;
            hasTranscriptData = hasTranscript && transcript.length > 0;

            console.log("[analyzeStructure] Video data retrieved:", {
                title,
                hasTranscript: hasTranscriptData,
                transcriptLength: transcript?.length || 0
            });

            // 字幕を保存（台本作成時に使用）
            if (hasTranscriptData) {
                originalTranscript = transcript;
            }

            videoContext = `
【動画情報】
タイトル: ${title}
チャンネル: ${channelTitle}
概要欄: ${description?.slice(0, 1000) || "（なし）"}

${hasTranscriptData ? `【動画の字幕（トランスクリプト）】
以下は動画の実際の発言内容です。これを詳細に分析してください。

${transcript}` : "【注意】字幕が取得できませんでした。動画を直接分析してください。"}
`;
        } else {
            console.log("[analyzeStructure] Failed to fetch video data:", videoData.error);
            videoContext = `
【参考動画URL】
${referenceUrl}

※動画情報の取得に失敗しました。動画を直接分析してください。`;
        }

        const prompt = `あなたは超一流のYouTubeコンサルタントです。以下の動画を詳細に分析し、Markdownで構成分解を行ってください。

${videoContext}

## 分析指示

この動画の構成を以下の形式で詳細に分解してください。
**動画の実際の内容を必ず反映し、決して省略せず、動画の最初から最後まで全ての要素を分析してください。具体的に何を話しているか詳細に記述してください。**

### 良い分析の例（Few-shot Example）
| セクション | 項目 | 実際の内容 | 推定時間 |
|:---|:---|:---|:---|
| **OP** | インパクトのある結果提示 | 「実は、たった3ヶ月で偏差値が20上がった勉強法があります」と成績表を見せながら提示 | 〜30秒 |
| **PASTOR** | 悩みの言語化 | 「毎日机に向かっているのに成績が上がらない、そんな悩みはありませんか？」 | |

### 出力フォーマット

# 動画分析レポート

## 基本情報
- **動画タイトル**: （動画のタイトル）
- **チャンネル**: （チャンネル名）
- **テーマ**: （この動画の主なテーマ）
- **ターゲット視聴者**: （想定される視聴者層）

---

## 構成分解

| セクション | 項目 | 実際の内容 | 推定時間 |
|:---------|:-----|:---------|:--------|
| **OP** | インパクトのある結果提示 | 動画から抽出した実際の発言内容を要約 | 〜30秒 |
| | 挨拶・導入 | 実際の挨拶内容 | 〜15秒 |
| **PASTOR** | 視聴者への共感 | 実際に語られている共感ポイント | |
| | 悩みの言語化 | 具体的にどんな悩みを言及しているか | |
| | 問題の拡大 | 放置するとどうなるか | |
| | 得られる利益 | この動画を見るメリット | |
| | 理想の状態 | 解決後のビジョン | |
| | 信頼性の提示 | 実績・証拠の提示方法 | |
| | CTA | LINE・登録誘導の方法 | |
| **プレ本編** | 衝撃の結論 | 常識を覆すメッセージ | |
| | 根拠・理由 | なぜそう言えるのか | |
| | 具体例 | 実際に使われている例 | |
| **本編** | ポイント1 | 具体的な内容 | |
| | ポイント2 | 具体的な内容 | |
| | ポイント3 | 具体的な内容 | |
| **ED** | まとめ | 振り返りの方法 | |
| | 最終CTA | 登録・LINE誘導 | |

---

必ず上記のMarkdown形式で出力してください。テーブルは見やすく整形してください。絵文字は使用しないでください。詳細な分析をお願いします。`;

        // 常にGeminiの動画分析機能を使用（字幕取得は不安定なため）
        console.log("[analyzeStructure] Using Gemini video analysis for:", referenceUrl);
        // Temperature 0.3: 分析精度優先（ハルシネーション抑制）
        const result = await generateWithYouTube(prompt, referenceUrl, 0.3);

        // 字幕があれば一緒に返す（なくても分析は成功）
        return { success: true, data: result, transcript: originalTranscript || "（Geminiが動画を直接分析しました）" };
    } catch (e: any) {
        console.error("[analyzeStructure] Error:", e);
        const errorMessage = e.message || "構成分解に失敗しました";
        await sendSlackNotification(`[Script] Structure Analysis Failed: ${errorMessage}`, 'error');
        return { success: false, error: `構成分解エラー: ${errorMessage}`, transcript: "" };
    }
}

// Import fetchChannelInfo and fetchChannelVideos from youtube actions
import { fetchChannelInfo, fetchChannelVideos } from "@/app/actions/youtube";

/**
 * Analyze channel style from a single Channel URL (Automated)
 */
export async function analyzeChannelFromChannelUrl(channelUrl: string) {
    try {
        console.log("[analyzeChannelFromChannelUrl] Starting analysis for:", channelUrl);

        // 1. Fetch Channel Info (to get uploads playlist)
        const channelInfo = await fetchChannelInfo(channelUrl);
        if (!channelInfo.success) {
            return { success: false, error: channelInfo.error || "チャンネル情報の取得に失敗しました" };
        }
        if (!channelInfo.data) {
            return { success: false, error: "チャンネル情報の取得に失敗しました（データなし）" };
        }

        console.log("[analyzeChannelFromChannelUrl] Channel found:", channelInfo.data.name);

        // 2. Fetch Recent Videos (長尺動画のみ、ショートは除外)
        // fetchChannelVideosはショート動画を自動的に除外するので、10本取得して最新3本を使用
        const videos = await fetchChannelVideos(channelInfo.data.id, channelInfo.data.uploadsPlaylistId, 10);
        if (!videos.success || !videos.data || videos.data.length === 0) {
            return { success: false, error: "チャンネルの長尺動画が見つかりませんでした（ショート動画は除外されます）" };
        }

        // 3. Select top 3 videos and fetch transcripts
        // We need to fetch transcripts for these videos to perform style analysis
        const recentVideos = videos.data.slice(0, 3);
        const videoUrls = recentVideos.map(v => `https://www.youtube.com/watch?v=${v.video_id}`);

        console.log("[analyzeChannelFromChannelUrl] Analyzing videos:", videoUrls);

        // Reuse existing logic to fetch transcripts
        // We'll reimplement the parallel fetch here to also return the video metadata for UI display
        const videoAnalyses = await Promise.all(recentVideos.map(async (video) => {
            const url = `https://www.youtube.com/watch?v=${video.video_id}`;
            const data = await fetchVideoData(url);

            if (data.success && data.data?.hasTranscript && data.data.transcript) {
                return {
                    url,
                    transcript: data.data.transcript,
                    title: video.video_title,
                    thumbnail: video.thumbnail_url
                };
            }
            return null;
        }));

        const validVideos = videoAnalyses.filter((v): v is { url: string; transcript: string; title: string; thumbnail: string } => v !== null);

        if (validVideos.length === 0) {
            return {
                success: false,
                error: "有効な字幕データを持つ動画が見つかりませんでした（最新3件を分析）。"
            };
        }

        // 4. Analyze Style (with metadata)
        const styleResult = await analyzeChannelStyle(
            validVideos,
            channelInfo.data.name,
            validVideos.map(v => v.title)
        );

        return {
            success: styleResult.success,
            data: styleResult.data,
            analyzedVideos: validVideos.map(v => ({ title: v.title, thumbnail: v.thumbnail, url: v.url })),
            error: styleResult.error
        };

    } catch (e: any) {
        console.error("[analyzeChannelFromChannelUrl] Error:", e);
        return { success: false, error: "チャンネル分析中にエラーが発生しました" };
    }
}

/**
 * Analyze channel style from multiple video URLs (Manual Legacy)
 */
export async function analyzeChannelFromUrls(urls: string[]) {
    try {
        console.log("[analyzeChannelFromUrls] Fetching transcripts for:", urls);

        // 並列で字幕を取得
        const results = await Promise.all(urls.map(async (url) => {
            if (!url.trim()) return null;
            const data = await fetchVideoData(url); // Restore this line

            if (data.success && data.data) {
                // Get best thumbnail
                const thumbs = data.data.thumbnails || {};
                const thumbUrl = thumbs.maxres?.url || thumbs.high?.url || thumbs.medium?.url || thumbs.default?.url;

                // Allow even if no transcript, so we can use image analysis
                const hasTranscript = data.data.hasTranscript && data.data.transcript;

                return {
                    url,
                    transcript: hasTranscript ? data.data.transcript : "",
                    thumbnail: thumbUrl
                };
            }
            return null;
        }));

        const validVideos = results.filter((v) => v !== null) as { url: string; transcript: string; thumbnail?: string }[];

        if (validVideos.length === 0) {
            return {
                success: false,
                error: "有効な字幕データが取得できませんでした。URLを確認するか、字幕のある動画を指定してください。"
            };
        }

        return await analyzeChannelStyle(validVideos);
    } catch (e: any) {
        console.error("[analyzeChannelFromUrls] Error:", e);
        return { success: false, error: "チャンネル分析中にエラーが発生しました" };
    }
}


/**
 * Extract channel style from multiple videos (E-E-A-T, tone, speaking style)
 */
export async function analyzeChannelStyle(
    channelVideos: { url: string; transcript: string; thumbnail?: string }[],
    channelName: string = "",
    videoTitles: string[] = []
) {
    const transcripts = channelVideos
        .filter(v => v.transcript && v.transcript.length > 100)
        .slice(0, 3)
        .map((v, i) => `【動画${i + 1}のタイトル】${videoTitles[i] || '（不明）'}\n【動画${i + 1}の発言内容】\n${v.transcript.slice(0, 4000)}`)
        .join('\n\n');

    // 画像データの取得（最初3件のみ）
    const imageParts: { mimeType: string; data: string }[] = [];

    // サムネイル画像の並列ダウンロード（字幕がない場合の補完用）
    if (channelVideos.length > 0) {
        try {
            const fetchPromises = channelVideos.slice(0, 3).map(async (v) => {
                const thumbUrl = v.thumbnail;
                if (!thumbUrl) return null;

                try {
                    const res = await fetch(thumbUrl);
                    if (!res.ok) return null;
                    const buffer = await res.arrayBuffer();
                    const base64 = Buffer.from(buffer).toString('base64');
                    const mimeType = res.headers.get('content-type') || 'image/jpeg';
                    return { mimeType, data: base64 };
                } catch { return null; }
            });

            const fetchedImages = await Promise.all(fetchPromises);
            fetchedImages.forEach(img => {
                if (img) imageParts.push(img);
            });
            console.log(`[analyzeChannelStyle] Fetched ${imageParts.length} thumbnails for analysis`);
        } catch (e) {
            console.warn("[analyzeChannelStyle] Failed to fetch thumbnails:", e);
        }
    }

    // If no transcripts, use titles as fallback context
    const analysisTarget = transcripts || channelVideos.map((v, i) => `【動画${i + 1}のタイトル】${videoTitles[i] || '（不明）'}\n（字幕データ取得不可）`).join('\n\n');

    // Remove the early return that was returning dummy data
    // Instead, we proceed to let the AI infer from titles/channel name

    const metadataContext = channelName ? `\n【チャンネル名】\n${channelName}\n※このチャンネル名から話者の名前や属性を推測できる場合は活用してください。` : "";

    const prompt = `あなたは超優秀な言語分析の専門家です。以下の動画字幕（または動画情報）から、話者の特徴を**必ず具体的に**抽出してください。
    ${imageParts.length > 0 ? '\n\n【参考】：提供されたサムネイル画像からも、チャンネルのターゲット層や雰囲気を分析してください。' : ''}

【重要なルール】
- 「不明」「分かれば」などの曖昧な回答は禁止です
- 字幕に明確な情報がない場合でも、チャンネル名や動画タイトル、字幕内容から推測して具体的に答えてください
- 一人称は字幕から「僕」「私」「俺」「自分」などを探して特定してください
- 語尾は実際に使われているものを3つ以上抽出してください

${metadataContext}

${analysisTarget}

【分析指示】
1. **一人称の特定**: 字幕の中から「僕」「私」「俺」「自分」などの一人称を探し出してください。見つからない場合は文脈から推測してください。
2. **視聴者への呼びかけ**: 「皆さん」「あなた」「君」などの呼びかけを探してください。
3. **語尾パターン**: 実際に使われている語尾を最低3つ抽出してください（例：〜ですね, 〜なんですよね, 〜というわけです）。
    - 曖昧な語尾ではなく、その人特有の口癖を含めてください。
4. **話し方の特徴**: テンション、スピード、説明の丁寧さなどを分析してください。
5. **専門性**: どの分野の専門家か、どんな知識を持っているかを推測してください。
6. **定型挨拶（重要）**: 「冒頭の挨拶（OP）」と「締めの挨拶（ED）」を特定してください。これらは台本作成時にそのまま使うので、**一字一句正確に**抽出してください。
7. **トーン**: 親近感、権威性、情熱など、視聴者が感じる印象を具体的に言語化してください（例：デュエマプレイヤーとしての親近感を持ちつつ、環境の変化や予想外の事象に対しては驚きと分析を交えた情報提供者としてのトーン）。

【出力形式】以下のJSON形式で出力してください。**全ての項目を具体的に埋めてください**：
\`\`\`json
{
  "name": "話者の名前（字幕で自己紹介があれば。なければチャンネル名から推測）。推測も不可なら「${channelName || '（特定不可）'}の中の人」",
  "title": "話者の肩書き・専門分野（例：資産運用アドバイザー、FP、投資家など）",
  "speakingStyle": "話し方の特徴を詳しく（例：落ち着いた解説調、熱量高めの説得調）",
  "firstPerson": "一人称（僕/私/俺/自分など。必ず1つ特定）",
  "secondPerson": "視聴者への呼びかけ（皆さん/あなた/視聴者の方など必ず1つ特定）",
  "endings": ["語尾1", "語尾2", "語尾3"],
  "tone": "全体的なトーン（例：親しみやすいが権威的、危機感を煽る調子など）",
  "catchphrases": ["よく使うフレーズ1", "よく使うフレーズ2"],
  "expertise": "専門性・知識領域（例：資産運用、老後資金、iDeCo/NISAなど）",
  "opening": "冒頭の定型挨拶（例：こんにちは、〇〇です）。なければ「こんにちは、[名前]です」と推測して作成",
  "closing": "締めの定型挨拶（例：最後までご覧いただきありがとうございました、チャンネル登録お願いします）。なければ一般的なYoutubeの締めを作成"
}
\`\`\`

**重要：「不明」という回答は絶対に禁止です。必ず具体的な内容を出力してください。**`;

    try {
        // Use gemini-2.0-flash for speed (用戶要望: "ぱっと出すように")
        // Temperature 0.4 for balance between creativity and consistency
        let result;
        if (imageParts.length > 0) {
            // Multimodal analysis
            result = await generateMultimodal(prompt, imageParts);
        } else {
            // Text only
            result = await generateText(prompt, 0.4, "gemini-2.0-flash");
        }

        const match = result.match(/\{[\s\S]*\}/);
        if (match) {
            const parsed = JSON.parse(match[0]);
            // 「不明」があれば置換
            for (const key of Object.keys(parsed)) {
                if (typeof parsed[key] === 'string' && (parsed[key] === '不明' || parsed[key].includes('不明') || parsed[key] === '（特定不可）')) {
                    if (key === 'firstPerson') parsed[key] = '私';
                    else if (key === 'secondPerson') parsed[key] = '皆さん';
                    else if (key === 'name') parsed[key] = channelName || '（特定不可）';
                    else if (key === 'title') parsed[key] = '専門家';
                    else if (key === 'expertise') parsed[key] = '（推測による）';
                }
            }
            return { success: true, data: parsed };
        }
        return { success: false, error: "チャンネルスタイルの解析に失敗しました" };
    } catch (e: any) {
        return { success: false, error: e.message || "チャンネルスタイル分析エラー" };
    }
}

/**
 * Extract text from thumbnail image using Gemini Vision
 */
export async function extractThumbnailText(thumbnailUrl: string) {
    try {
        // Fetch the thumbnail image
        const response = await fetch(thumbnailUrl);
        if (!response.ok) {
            return { success: false, error: "サムネイル画像の取得に失敗しました" };
        }

        const buffer = await response.arrayBuffer();
        const base64 = Buffer.from(buffer).toString('base64');
        const mimeType = response.headers.get('content-type') || 'image/jpeg';

        // Use Gemini to extract text from image
        const prompt = `このYouTubeサムネイル画像に含まれるテキスト（文言）を全て抽出してください。

【出力形式】JSONのみ：
    \`\`\`json
{
  "mainText": "メインの大きな文字",
  "subText": "サブの文字（あれば）",
  "allTexts": ["全ての文字をリストで"]
}
\`\`\``;

        const result = await generateMultimodal(prompt, [{ mimeType, data: base64 }]);
        const match = result.match(/\{[\s\S]*\}/);
        if (match) {
            return { success: true, data: JSON.parse(match[0]) };
        }
        return { success: true, data: { mainText: "", subText: "", allTexts: [] } };
    } catch (e: any) {
        console.error("[extractThumbnailText] Error:", e);
        return { success: false, error: e.message || "サムネイル文言の抽出に失敗しました" };
    }
}

/**
 * Remove filler words from transcript
 */
export async function removeFillerWords(transcript: string): Promise<string> {
    // Common Japanese filler words
    const fillers = [
        /えー+っと?/g,
        /あー+/g,
        /うー+ん?/g,
        /まあ?ね?[、。]?/g,
        /なんか[、。]?/g,
        /こう[、。]?(?=\s)/g,
        /あの[ー〜]+/g,
        /その[ー〜]+/g,
        /ちょっと待って[、。]?/g,
    ];

    let cleaned = transcript;
    for (const filler of fillers) {
        cleaned = cleaned.replace(filler, '');
    }
    // Clean up extra spaces
    cleaned = cleaned.replace(/\s+/g, ' ').trim();
    return cleaned;
}

export async function analyzeViewers(structureAnalysis: string, thumbnailText?: string) {
    const thumbnailContext = thumbnailText
        ? `\n【重要：サムネイル文言】\n${thumbnailText}\n\nこのサムネイルを見た視聴者は「何を期待してクリックしたか」を最重要視して分析してください。
サムネイルの訴求が動画内容と乖離している場合、その点も指摘してください。`
        : '';

    const prompt = `あなたは超一流のYouTubeマーケターです。視聴者の心理を深く理解し、表面的ではない本質的な分析を行ってください。

【分析思考プロセス（Chain of Thought）】
1. **直感分析（Surface）**: サムネイルの文言とデザインから、視聴者が抱く直感的な感情（期待、恐怖、好奇心など）を想像してください。
2. **深層心理（Deep）**: なぜそのテーマが気になるのか？背後にある恐怖や欲望、現状の不満は何ですか？
3. **競合比較（Differentiation）**: 他の類似動画ではなく、なぜ「この動画」を選んだのか？（権威性？新奇性？簡易性？）
4. **心理的ハードル**: 動画を見始めた瞬間の「疑い（本当かな？）」や「心理的障壁（難しそう）」を推測してください。
5. **結論導出**: これらの分析から、具体的な「クリック動機」と「求めている本質的価値」を結論付けてください。

この思考プロセスを経て、以下の形式で出力してください。

【重要な観点】
- 「浅い・抽象的」な分析ではなく「現場レベル・具体的」な分析を行うこと
- サムネイルを見てクリックした視聴者の「本当の期待」を言語化すること
- 視聴者が「この動画に何を求めているか」を具体的に記述すること
${thumbnailContext}

【構成分析】
${structureAnalysis}

## 出力フォーマット（Markdown）

# 視聴者分析レポート

## 1. クリック動機（最重要）

### サムネイルから読み取れる視聴者の期待
> サムネイルの文言・デザインを見た視聴者が「何を期待してクリックするか」を具体的に記述してください。
> 例：「1000万円貯めたら、3000万円まで驚くほど簡単に増やせる秘密の方法があるのでは？」と期待している

### 視聴者が求めている「価値」
- （表面的な「情報が欲しい」ではなく、本当に求めている価値を記述）
- 例：「楽にお金を増やせる裏ワザ」「他の人が知らない特別な方法」

### 視聴者の感情的な動機
- （論理ではなく感情。「不安を解消したい」「優越感を得たい」など）

---

## 2. 視聴者のレベル感

| レベル | 説明 | この動画の視聴者 | 理由 |
|:------|:----|:---------------|:-----|
| 超初心者 | 全く情報収集すらしたことがない | 該当 / 非該当 | |
| 初心者 | 情報収集はしていて、行動し始めたばかり | 該当 / 非該当 | |
| 中級者 | 行動しているが、最適な方法が分かっていない | 該当 / 非該当 | |
| 上級者 | すでに結果が出ているが、さらに上を目指したい | 該当 / 非該当 | |

**この動画の主なターゲット**: （例：初心者〜中級者）

---

## 3. 動画を見る前の心理状態

### サムネをクリックした瞬間の期待
> 具体的に何を期待しているかを1〜2文で記述

### 視聴者が持っている前提知識・仮説
- （視聴者がすでに知っていること、信じていること）

### 視聴者が抱えている不安・疑問
- （動画を見ながら「これ本当かな？」と思うポイント）

---

## 4. ペルソナ

| 項目 | 内容 |
|:----|:----|
| 年代 | |
| 職業 | |
| 現在の状況 | |
| 目標 | |
| 最大の障壁 | |
| この動画に求めること | |

---

上記のMarkdown形式で出力してください。**絵文字は一切使用しないでください。**
**重要：抽象的・機械的な分析ではなく、実際の視聴者の気持ちに寄り添った具体的な分析をしてください。**`;

    try {
        // Temperature 0.4: 分析精度優先（創造性より正確性）
        const result = await generateText(prompt, 0.4);
        return { success: true, data: result };
    } catch (e: any) {
        return { success: false, error: e.message || "視聴者分析に失敗しました" };
    }
}

export async function analyzeVideo(structureAnalysis: string, viewerNeeds: string, transcript?: string) {
    const transcriptContext = transcript ? `\n【動画の実際の字幕（トランスクリプト）】\n${transcript.slice(0, 10000)}...` : '';

    const prompt = `あなたは超一流のYouTubeコンサルタントです。視聴者のクリック動機を踏まえて、動画内容を詳細に分析してください。

【構成分析】
${structureAnalysis}

【視聴者分析】
${viewerNeeds}
${transcriptContext}

## 出力フォーマット（Markdown）

# 動画詳細分析レポート

## 1. 冒頭オープニング分析（30〜60秒）

### 訴求の核心（この動画が受けている理由）
> （簡潔に1〜2文でまとめる。例：「衝撃の結論による常識の破壊」「具体的な数字提示による信頼性」）

### 離脱を防ぐキーポイント
- 
- 

---

## 2. 本題前の前提部分

### 本編に入る前に伝えていること
> （本編までに何を言っているかについて言及。過不足なくまとめる）

---

## 3. 本題・価値提供部分

### 動画を見続ける理由（何を伝えているからか）
> （衝撃の結論や常識の破壊など、視聴維持の理由を簡潔に）

### コンテンツ構成
| ポイント | 内容の要約 |
|:--------|:---------|
| ポイント1 | |
| ポイント2 | |
| ポイント3 | |

---

## 4. 視聴動機に対する最適度分析

### クリック動機 vs 本編内容

視聴者がサムネイルを見てクリックした時の期待と、実際の動画内容がどの程度マッチしているかを分析します。

| 視聴者の期待 | 本編での対応状況 | 最適度 |
|:-----------|:--------------|:------|
| （サムネから期待される内容1） | （動画内で対応している / していない） | 高/中/低 |
| （サムネから期待される内容2） | （動画内で対応している / していない） | 高/中/低 |
| （サムネから期待される内容3） | （動画内で対応している / していない） | 高/中/低 |

### ギャップ分析
> クリック動機と本編内容の乖離がある場合、その理由と影響を記述してください。
> 例：「サムネでは『秘密の方法』を示唆しているが、本編では一般的なノウハウに終始している」

### 改善すべきポイント
- （視聴者の期待に応えるために、本編で強調すべき内容）
- （クリック動機を満たすための追加コンテンツ案）

---

上記のMarkdown形式で出力してください。**絵文字は一切使用しないでください。**`;

    try {
        // Temperature 0.5: 分析精度優先
        const result = await generateText(prompt, 0.5);
        return { success: true, data: result };
    } catch (e: any) {
        return { success: false, error: e.message || "動画分析に失敗しました" };
    }
}

export async function generateImprovements(structureAnalysis: string, viewerNeeds: string, openingAnalysis: string, ctaContent?: string, transcript?: string) {
    const ctaContext = ctaContent ? `\n【CTA内容】\n${ctaContent}` : '';
    const transcriptContext = transcript ? `\n【動画の実際の字幕（トランスクリプト）】\n${transcript.slice(0, 10000)}...` : '';

    const prompt = `あなたは超一流のYouTubeコンサルタントです。
参考動画の分析結果を踏まえ、この動画をベースに新しい動画を作る際の「改善の軸」を提案してください。

【前提：これまでの分析要約】
以下の情報はすべて、この動画を深く理解するための重要な文脈です。これらを前提として思考してください。
1. **構成概要**: 動画の骨組み
2. **視聴者心理**: クリック動機と潜在ニーズ
3. **動画詳細**: オープニング戦略とコンテンツ構成

【重要指示：分析の統合】
以下の3つの分析結果（構成、視聴者心理、動画詳細）および実際の動画の字幕内容を**全て統合し、前提として踏まえた上で**、新しい改善案を作成してください。単なる要約ではなく、これらの分析から導き出される論理的な改善策である必要があります。
特に「視聴者が求めているが、元の動画では満たせていないギャップ」を埋める提案を優先してください。

${ctaContext}

【構成分析】
${structureAnalysis}

【視聴者分析】
${viewerNeeds}
${transcriptContext}

【動画分析】
${openingAnalysis}

【重要な観点】
- 参考動画をそのままリライトするのではなく、「どういう方向に改善するか」の軸を提案する
- 視聴者のクリック動機を満たす動画にするための戦略を提案する
- 新規チャンネルでも成立する本質的な改善を提案する

【出力形式】
JSON形式で出力してください。絵文字は使用しないでください。

\`\`\`json
{
  "improvementAxes": [
    {
      "axisName": "ターゲット変更",
      "description": "例：20代向けを40代向けに変更する",
      "example": "40代からのFIRE戦略",
      "reason": "なぜこの軸での改善が効果的か"
    },
    {
      "axisName": "ノウハウの深化",
      "description": "例：全レベル向けを初心者特化にする",
      "example": "完全初心者向け資産形成入門",
      "reason": "なぜこの軸での改善が効果的か"
    },
    {
      "axisName": "訴求軸の変更",
      "description": "例：安心訴求から緊急性訴求に変える",
      "example": "今やらないと手遅れになる理由",
      "reason": "なぜこの軸での改善が効果的か"
    }
  ],
  "contentStructure": {
    "opening": {
      "hookType": "衝撃の事実 / 疑問提起 / 結論先出し",
      "suggestedHook": "具体的なフックの内容"
    },
    "preProblem": {
      "commonMisconception": "視聴者の誤解・思い込み",
      "truthReveal": "常識を覆す真実"
    },
    "mainContent": {
      "structure": "番号ポイント / ストーリー形式 / ビフォーアフター",
      "keyPoints": ["ポイント1", "ポイント2", "ポイント3"]
    },
    "ending": {
      "registrationTarget": "LINE / チャンネル登録 / メルマガ",
      "registrationBenefit": "登録することで得られる具体的なメリット",
      "callToAction": "具体的なCTAの文言"
    }
  },
  "gapAnalysis": {
    "originalVideoIssue": "参考動画の課題（クリック動機との乖離など）",
    "proposedSolution": "提案する解決策"
  }
}
\`\`\`

※必ずJSONのみを出力してください。`;

    // リトライロジック: JSONパース失敗時に最大2回再生成
    const maxRetries = 2;
    let lastError: string = "";

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            // Temperature 0.6: 安定性と創造性のバランス
            const result = await generateText(prompt, 0.6);

            // JSONとしてパース可能か確認
            const cleanJson = result.replace(/```json/g, "").replace(/```/g, "").trim();
            const match = cleanJson.match(/\{[\s\S]*\}/);
            if (match) {
                JSON.parse(match[0]); // パースチェック
                return { success: true, data: result };
            }

            lastError = "JSONフォーマットが見つかりませんでした";
            console.log(`[generateImprovements] Attempt ${attempt + 1}: JSON not found, retrying...`);
        } catch (e: any) {
            lastError = e.message || "改善提案の生成に失敗しました";
            console.log(`[generateImprovements] Attempt ${attempt + 1} failed:`, lastError);
            if (attempt === maxRetries) break;
        }
    }

    return { success: false, error: `改善提案の生成に失敗しました: ${lastError}` };
}

export async function writeScript(
    structureAnalysis: string,
    viewerNeeds: string,
    selectedImprovements: { type: string; content: string }[],
    channelStyle: any,
    referenceUrl?: string,
    originalTranscript?: string,
    improvementData?: any // New: Structured improvement data
) {
    // 元動画の字幕がある場合、口調分析を追加
    let toneAnalysis = "";
    let transcriptContext = "";
    let targetLengthInfo = "";

    // チャンネルスタイル反映
    if (channelStyle) {
        toneAnalysis += `
==========================================
【チャンネルスタイル・話者プロファイル】
==========================================
以下の分析結果に基づき、このチャンネルの話者として振る舞ってください：
- **一人称**: ${channelStyle.firstPerson || "僕"}
- **視聴者呼称**: ${channelStyle.secondPerson || "皆さん"}
- **話し方**: ${channelStyle.speakingStyle || "親しみやすい"}（${channelStyle.tone || "カジュアル"}）
- **特徴的な語尾**: ${channelStyle.endings?.join("、") || "〜ですね"}
- **口癖**: ${channelStyle.catchphrases?.join("、") || "特になし"}
- **権威性(E-E-A-T)**: ${channelStyle.expertise || "専門家"}
- **冒頭挨拶(OP)**: ${channelStyle.opening || "こんにちは"}
- **締め挨拶(ED)**: ${channelStyle.closing || "ありがとうございました"}

この話者のペルソナを**完全に再現**してください。特に挨拶は上記の定型文を必ず使用してください。
`;
    }

    if (originalTranscript && originalTranscript.length > 100) {
        const charCount = originalTranscript.length;
        const minTarget = Math.floor(charCount * 0.9); // 元の90%以上の分量を要求

        transcriptContext = `
==========================================
【最重要：元動画のデータ】
==========================================
以下は元動画で話者が実際に発言した内容です。
この話し方・口調・語尾・言い回しを**完全に踏襲**してください。

${originalTranscript}

==========================================
`;

        targetLengthInfo = `
【重要：文章量（尺）の指定】
元動画の情報の網羅性を担保するため、**必ず「${minTarget}文字以上」**の台本を作成してください。
内容を要約したり、端折ったりすることは厳禁です。
元動画と同じくらいの時間をかけて話す詳細な台本にしてください。
`;

        toneAnalysis += `
==========================================
【口調・話し方・人格の完全コピー指示】
==========================================

あなたは、上記の元動画の話者そのものになりきってください。
以下の要素を**徹底的に模倣**してください：

1. **語尾・口癖**
   - 元動画で「〜ますね」と言っているなら「〜ますね」、「〜だろ」なら「〜だろ」を使ってください。

2. **話の展開スピード**
   - 元動画がゆっくり話すなら丁寧に、早口ならテンポよく。

3. **禁止事項（厳守）**
   - ❌ **絵文字（😊, ✨, 🔥など）は一切使用しないでください。**
   - ❌ **フィラー（「えー」「あー」「えっと」など）は削除し、読みやすい文章にしてください。**
   - ❌ AIっぽい硬い表現（「〜しましょう」「〜不可欠です」等）は避け、口語に直してください。
   - ❌ 「まとめ」で急に別人格にならないでください。
`;
    } else {
        // 字幕がない場合のフォールバックルール
        toneAnalysis += `
==========================================
【話し方のルール】
==========================================
1. 親しみやすいカジュアルトーンを維持
2. 「ですよね」「でしょ？」など共感を誘う語尾を使用
3. 専門用語は分かりやすく説明
4. 同じ語尾を2文以上連続で使用しない
5. 小学5年生でも伝わる表現
6. **絵文字は一切使用しない**
7. **フィラー（えー、あー等）は入れない**
`;
    }

    // Prepare improvements context
    let improvementsContext = "";
    if (improvementData && improvementData.improvementAxes) {
        // 使用可能な形式の改善データがある場合（新形式）
        const activeAxes = improvementData.improvementAxes.filter((a: any) => a.selected !== false);

        improvementsContext = `
==========================================
【重要：台本への反映事項（改善方針）】
==========================================
以下の「改善の軸」と「構成案」に基づいて、元動画をアップグレードした台本を作成してください。

### 1. 改善のコンセプト（これらを台本全体に反映させてください）
${activeAxes.map((axis: any) => `- **${axis.axisName}**: ${axis.description} (意図: ${axis.reason})`).join('\n')}

### 2. 構成の変更点（gapAnalysis）
${improvementData.gapAnalysis ? `- 課題: ${improvementData.gapAnalysis.originalVideoIssue}\n- 解決策: ${improvementData.gapAnalysis.proposedSolution}` : ''}

### 3. 具体的な構成案（contentStructure）
${improvementData.contentStructure ? JSON.stringify(improvementData.contentStructure, null, 2) : ''}
`;
    } else if (selectedImprovements && selectedImprovements.length > 0) {
        // 旧形式のフォールバック
        improvementsContext = `
==========================================
【重要：台本への反映事項】
==========================================
元動画の構成をベースにしつつ、以下の改善点を**必ず**盛り込んでください：

${selectedImprovements.map(i => `- 【${i.type === 'add' ? '追加' : '削除'}】 ${i.content}`).join('\n')}
`;
    } else {
        improvementsContext = "【改善事項】特になし（元動画の構成を維持してください）";
    }

    const prompt = `あなたは超一流のYouTube構成作家であり、**カメレオン俳優**です。
指定された人物（元動画の話者またはチャンネルのスタイル）に完全になりきって台本を書いてください。

${transcriptContext}

${targetLengthInfo}

${toneAnalysis}

==========================================
【分析結果】
==========================================

【構成分析】
${structureAnalysis}

【想定視聴者】
${viewerNeeds}

${improvementsContext}

==========================================
【台本作成の指示】
==========================================

## 出力フォーマット（Markdown）

# 📝 YouTube台本

---

## OP（冒頭）

### 🎯 インパクトのある結果提示
> （視聴者の注目を引く強烈なフックから始める。）

### 👋 挨拶（3秒以内）
### 👋 挨拶（3秒以内）
> **必ず以下の定型挨拶を使用してください：**
> "${channelStyle.opening || "こんにちは、[名前]です。"}"
> ※状況に合わせて微調整しても良いですが、基本の型は崩さないでください。

---

## PASTOR（問題提起〜解決への導入）

### 💭 視聴者への共感
> （具体的な悩みに寄り添う）

### 😰 悩みの言語化
> （痛みを明確にする）

### ⚠️ 問題の拡大（放置した結果）
> 

### 🎁 この動画で得られること
> 

### ✨ 解決後の理想状態
> 

### 🏆 実績・信頼性の提示
> 

### 📲 LINE・チャンネル登録誘導
> 

---

## プレ本編

### 💡 衝撃の結論（常識の破壊）
> 

### 📊 根拠・理由
> 

### 📌 具体例
> 

### 🚀 アクションプラン
> 

### ➡️ メインテーマへの導入
> 

---

## 本編

【重要】元動画で話されている内容（もしあれば）を**全て網羅**し、さらに上記の【採用する改善点】を深く反映させること。
単に改善点を列挙するのではなく、**台本の内容そのものを改善点に基づいて書き換えてください。**
**各項目300文字以上**を目指して具体的に記述すること。

### 📍 ポイント①
> 

#### 問題の具体例
> 

#### 原因
> 

#### 解決方法
> 

#### 実践手順
1. 
2. 
3. 

#### 注意点・コツ
> 

---

### 📍 ポイント②
（同様の形式で詳細に記述）

---

### 📍 ポイント③
（同様の形式で詳細に記述）

---

## まとめ

### 🎯 要約・行動促進
> 

---

## ED（エンディング）

### 💬 エモいメッセージ
> 

### 🎁 追加価値の提示
> 

### 📝 復習
> 

### 👍 評価誘導・エンディング挨拶
> **必ず以下の定型挨拶を使用してください：**
> "${channelStyle.closing || "最後までご覧いただきありがとうございました。"}" 

---

【絶対守るべき制約条件】
1. **口調の完全踏襲** - ペルソナになりきる
2. **内容の充実** - 情報量を最大化する
3. **絵文字完全禁止** - 一切使わない
4. **フィラー削除** - 素読みできる整った日本語にする

上記のMarkdown形式で、全セクションを省略せず完成させてください。
特に本編は具体的かつ詳細に書いてください。`;

    // Try Gemini 3 Flash first, fallback to 2.0 Flash if not available
    const primaryModel = "gemini-3-flash-preview";
    const fallbackModel = "gemini-2.0-flash";

    try {
        console.log(`[writeScript] Attempting with ${primaryModel}...`);
        // Temperature 0.4: 創造性よりもスタイル模倣と正確性を重視
        const result = await generateText(prompt, 0.4, primaryModel);
        console.log(`[writeScript] Success with ${primaryModel}`);
        return { success: true, data: result };
    } catch (primaryError: any) {
        console.warn(`[writeScript] ${primaryModel} failed: ${primaryError.message}`);
        console.log(`[writeScript] Falling back to ${fallbackModel}...`);

        try {
            // Temperature 0.4 for fallback as well
            const result = await generateText(prompt, 0.4, fallbackModel);
            console.log(`[writeScript] Success with fallback ${fallbackModel}`);
            return { success: true, data: result };
        } catch (fallbackError: any) {
            console.error(`[writeScript] Both models failed. Primary: ${primaryError.message}, Fallback: ${fallbackError.message}`);
            await sendSlackNotification(`[Script] Final Script Generation Failed: ${fallbackError.message}`, 'error');
            return { success: false, error: `台本作成に失敗しました: ${fallbackError.message}` };
        }
    }
}
