"use server";

import { generateText, generateWithYouTube, generateMultimodal } from "@/lib/gemini";
import { fetchVideoData } from "@/lib/youtube";

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

必ず上記のMarkdown形式で出力してください。テーブルは見やすく整形してください。絵文字は使用しないでください。`;

        // 常にGeminiの動画分析機能を使用（字幕取得は不安定なため）
        console.log("[analyzeStructure] Using Gemini video analysis for:", referenceUrl);
        const result = await generateWithYouTube(prompt, referenceUrl, 0.7);

        // 字幕があれば一緒に返す（なくても分析は成功）
        return { success: true, data: result, transcript: originalTranscript || "（Geminiが動画を直接分析しました）" };
    } catch (e: any) {
        console.error("[analyzeStructure] Error:", e);
        const errorMessage = e.message || "構成分解に失敗しました";
        return { success: false, error: `構成分解エラー: ${errorMessage}`, transcript: "" };
    }
}

/**
 * Analyze channel style from multiple video URLs
 */
export async function analyzeChannelFromUrls(urls: string[]) {
    try {
        console.log("[analyzeChannelFromUrls] Fetching transcripts for:", urls);

        // 並列で字幕を取得
        const results = await Promise.all(urls.map(async (url) => {
            if (!url.trim()) return null;
            const data = await fetchVideoData(url);
            if (data.success && data.data?.hasTranscript && data.data.transcript) {
                return { url, transcript: data.data.transcript };
            }
            return null;
        }));

        const validVideos = results.filter((v): v is { url: string; transcript: string } => v !== null);

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
export async function analyzeChannelStyle(channelVideos: { url: string; transcript: string }[]) {
    const transcripts = channelVideos
        .filter(v => v.transcript && v.transcript.length > 100)
        .slice(0, 3)
        .map((v, i) => `【動画${i + 1}の発言内容】\n${v.transcript.slice(0, 3000)}`)
        .join('\n\n');

    if (!transcripts) {
        return {
            success: true,
            data: {
                name: "",
                title: "",
                speakingStyle: "カジュアル",
                firstPerson: "僕",
                endings: ["〜ですね", "〜ですよ"],
                tone: "親しみやすい",
                expertise: "",
                secondPerson: "皆さん"
            }
        };
    }

    const prompt = `以下は同一チャンネルの複数動画から取得した発言内容です。
このチャンネルの話者のスタイル・E-E-A-T（専門性・権威性・信頼性）を分析してください。

${transcripts}

【分析指示】
1. **E-E-A-T**: 話者の名前、肩書き、どのような実績や権威性を持っているかを分析してください。
2. **話し方**: 語尾、口癖、一人称、視聴者への呼びかけ方などを詳細に抽出してください。

【出力形式】JSONのみ出力してください（絵文字は使用しないでください）：
\`\`\`json
{
  "name": "話者の名前（分かれば）",
  "title": "話者の肩書き（〇〇専門家、など）",
  "speakingStyle": "話し方の特徴（例：テンション高め、落ち着いた語り口）",
  "firstPerson": "一人称（僕、私、俺など）",
  "secondPerson": "視聴者の呼び方（あなた、みんな、君など）",
  "endings": ["よく使う語尾1", "よく使う語尾2"],
  "tone": "全体的なトーン（カジュアル、専門的、など）",
  "catchphrases": ["口癖1", "口癖2"],
  "expertise": "専門性・権威性（例：元〇〇、〇〇著者など）"
}
\`\`\``;

    try {
        const result = await generateText(prompt, 0.5);
        const match = result.match(/\{[\s\S]*\}/);
        if (match) {
            return { success: true, data: JSON.parse(match[0]) };
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
        ? `\n【サムネイル文言】\n${thumbnailText}\nこのサムネイル文言から、視聴者が何を期待してクリックするかを考慮してください。`
        : '';

    const prompt = `以下の参考動画の構成分析をもとに、想定視聴者を詳細に分析してください。
${thumbnailContext}

【構成分析】
${structureAnalysis}

## 出力フォーマット（Markdown）

# 視聴者分析レポート

## 1. 視聴者のレベル感

| レベル | 説明 | この動画の視聴者 |
|:------|:----|:---------------|
| 超初心者 | 全く情報収集すらしたことがない | 該当 / 非該当 |
| 初心者 | 情報収集はしていて、行動し始めたばかり | 該当 / 非該当 |
| 中級者 | 行動しているが、最適な方法が分かっていない | 該当 / 非該当 |
| 上級者 | すでに結果が出ているが、さらに上を目指したい | 該当 / 非該当 |

**この動画の主なターゲット**: （例：初心者〜中級者）

---

## 2. 視聴者の悩み・ニーズ

### 顕在ニーズ（自覚している悩み）
- 
- 
- 

### 動画を視聴する動機
- なぜこの動画をクリックしたのか
- 何を解決したいと思っているのか

---

## 3. 視聴者の既存知識

### すでに知っていると思われる情報
- （レベル感に合わせて想定されるリテラシーを明確にする）
- 

### 動画を見る前の心理状態
- 

---

## 4. ペルソナ

| 項目 | 内容 |
|:----|:----|
| 年代 | |
| 職業 | |
| 目標 | |
| 最大の障壁 | |
| 情報収集源 | |

---

上記のMarkdown形式で出力してください。**絵文字は一切使用しないでください。**`;

    try {
        const result = await generateText(prompt, 0.7);
        return { success: true, data: result };
    } catch (e: any) {
        return { success: false, error: e.message || "視聴者分析に失敗しました" };
    }
}

export async function analyzeVideo(structureAnalysis: string, viewerNeeds: string) {
    const prompt = `以下の参考動画の構成分析をもとに、詳細な動画分析を行ってください。

【構成分析】
${structureAnalysis}

【想定視聴者】
${viewerNeeds}

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

## 4. 構成分解との比較（STEP2参照用）

### STEP2で分解した構成要素の該当箇所

| 構成要素 | この動画での実装 |
|:--------|:--------------|
| OP・インパクト提示 | |
| PASTOR・共感部分 | |
| プレ本編・衝撃の結論 | |
| 本編・価値提供 | |
| ED・CTA | |

---

上記のMarkdown形式で出力してください。**絵文字は一切使用しないでください。**`;

    try {
        const result = await generateText(prompt, 0.7);
        return { success: true, data: result };
    } catch (e: any) {
        return { success: false, error: e.message || "動画分析に失敗しました" };
    }
}

export async function generateImprovements(structureAnalysis: string, viewerNeeds: string, openingAnalysis: string, ctaContent?: string) {
    const ctaContext = ctaContent ? `\n【CTA内容】\n${ctaContent}` : '';

    const prompt = `以下の分析結果をもとに、構成部分ごとに改善点を提案してください。
${ctaContext}

【構成分析】
${structureAnalysis}

【想定視聴者】
${viewerNeeds}

【動画分析】
${openingAnalysis}

【出力形式】
JSON形式で、以下の構成部分ごとに改善提案を出力してください。
各セクションにつき、**「追加すべき内容」を10個、「削除すべき内容」を10個**提案してください。
絵文字は使用しないでください。「想定評価」「視聴者評価」などの項目は不要です。

\`\`\`json
{
  "improvements": [
    {
      "section": "OP",
      "additions": ["追加案1", "追加案2", ..., "追加案10"],
      "removals": ["削除案1", "削除案2", ..., "削除案10"]
    },
    {
      "section": "PASTOR",
      "additions": [...],
      "removals": [...]
    },
    {
      "section": "プレ本編",
      "additions": [...],
      "removals": [...]
    },
    {
      "section": "本編",
      "additions": [...],
      "removals": [...]
    },
    {
      "section": "ED",
      "additions": [...],
      "removals": [...]
    }
  ]
}
\`\`\`

※必ずJSONのみを出力してください。`;

    try {
        const result = await generateText(prompt, 0.7);
        return { success: true, data: result };
    } catch (e: any) {
        return { success: false, error: e.message || "改善提案の生成に失敗しました" };
    }
}

export async function writeScript(
    structureAnalysis: string,
    viewerNeeds: string,
    selectedImprovements: { type: string; content: string }[],
    channelStyle: any,
    referenceUrl?: string,
    originalTranscript?: string
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

この話者のペルソナを**完全に再現**してください。
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

【採用する改善点】
${selectedImprovements.map(i => `${i.type === 'add' ? '✅ 追加' : '❌ 削除'} ${i.content}`).join('\n')}

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
> （チャンネル特有の挨拶）

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

【重要】元動画で話されている内容（もしあれば）を**全て網羅**し、さらに改善点を反映した深い内容にすること。
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
> 

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
        const result = await generateText(prompt, 0.7, primaryModel);
        console.log(`[writeScript] Success with ${primaryModel}`);
        return { success: true, data: result };
    } catch (primaryError: any) {
        console.warn(`[writeScript] ${primaryModel} failed: ${primaryError.message}`);
        console.log(`[writeScript] Falling back to ${fallbackModel}...`);

        try {
            const result = await generateText(prompt, 0.7, fallbackModel);
            console.log(`[writeScript] Success with fallback ${fallbackModel}`);
            return { success: true, data: result };
        } catch (fallbackError: any) {
            console.error(`[writeScript] Both models failed. Primary: ${primaryError.message}, Fallback: ${fallbackError.message}`);
            return { success: false, error: `台本作成に失敗しました: ${fallbackError.message}` };
        }
    }
}
