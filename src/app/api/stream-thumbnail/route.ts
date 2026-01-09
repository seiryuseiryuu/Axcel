import { NextRequest } from "next/server";
import { analyzePatterns, generateSingleModelImage, PatternCategory } from "@/app/actions/thumbnail";
import { sendSlackNotification } from "@/lib/slack";

// Allow long execution
export const maxDuration = 300;
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
    const encoder = new TextEncoder();
    const { thumbnailUrls, thumbnailTitles, videoTitle, videoDescription, uploadedImages, customText } = await req.json();

    const stream = new ReadableStream({
        async start(controller) {
            const sendEvent = (event: string, data: any) => {
                controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
            };

            const sendLog = (message: string) => {
                sendEvent("log", message);
            };

            try {
                sendLog("[System] ストリーミング分析を開始しました...");

                // 1. Analyze Patterns
                sendEvent("status", "analyzing");
                sendLog("[System] パターン分析を実行中...");

                // Call existing server action
                const analysisRes = await analyzePatterns(thumbnailUrls, thumbnailTitles);

                if (analysisRes.error) {
                    sendEvent("error", analysisRes.error);
                    controller.close();
                    return;
                }

                if (!analysisRes.data) {
                    sendEvent("error", "分析結果が取得できませんでした");
                    controller.close();
                    return;
                }

                // Send Analysis Result
                sendEvent("analysis_result", analysisRes.data);

                // Output logs from analysis if any
                if (analysisRes.logs) {
                    analysisRes.logs.forEach(log => sendLog(log));
                }

                // 2. Generate Model Images Loop
                sendEvent("status", "generating");
                const patterns = analysisRes.data.patterns;

                const maxPatterns = Math.min(patterns.length, 4);
                sendLog(`[System] 上位${maxPatterns}件のパターン画像生成を開始します...`);

                const imagePromises = patterns.slice(0, maxPatterns).map(async (pattern, i) => {
                    sendLog(`[Model Gen] パターン ${i + 1}/${maxPatterns}: '${pattern.name}' 生成開始...`);

                    try {
                        const modelRes = await generateSingleModelImage(
                            pattern,
                            videoTitle,
                            videoDescription,
                            thumbnailUrls, // reference URLs for model generation
                            customText // Add custom text
                        );

                        if (modelRes.data) {
                            sendEvent("model_image", modelRes.data);
                            sendLog(`[Model Gen] '${pattern.name}' 生成完了`);
                        } else if (modelRes.error) {
                            sendLog(`[Error] '${pattern.name}' 生成失敗: ${modelRes.error}`);
                            await sendSlackNotification(`[Thumbnail] Pattern Error (${pattern.name}): ${modelRes.error}`, 'error');
                        }
                    } catch (e: any) {
                        sendLog(`[Error] パターン処理中に例外発生: ${e.message}`);
                        await sendSlackNotification(`[Thumbnail] Pattern Exception (${pattern.name}): ${e.message}`, 'error');
                    }
                });

                await Promise.all(imagePromises);

                sendLog("[System] 全工程完了");
                await sendSlackNotification(`[Thumbnail] Generation Complete: ${maxPatterns} patterns generated for "${videoTitle}"`, 'info');
                sendEvent("complete", "done");

            } catch (error: any) {
                console.error("Stream Error:", error);
                await sendSlackNotification(`[Thumbnail] Stream Error: ${error.message}`, 'error');
                sendEvent("error", error.message || "ストリーミング処理中にエラーが発生しました");
            } finally {
                controller.close();
            }
        }
    });

    return new Response(stream, {
        headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
        },
    });
}
