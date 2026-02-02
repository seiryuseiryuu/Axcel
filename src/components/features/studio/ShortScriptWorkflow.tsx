"use client";

// Imports
import { useState, useTransition } from "react";
import { RefinementArea } from "@/components/features/studio/RefinementArea";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Sparkles, Video, Users, ListChecks, FileText, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { MarkdownRenderer } from "@/components/ui/markdown-renderer";
import {
    analyzeShortStructure,
    analyzeShortViewer,
    generateShortImprovements,
    writeShortScript
} from "@/app/actions/shortScriptWorkflow";

// Reuse channel analysis from main script workflow as it is generic enough
import { analyzeChannelFromChannelUrl } from "@/app/actions/scriptWorkflow";

const STEPS = [
    { num: 1, title: "動画入力", icon: Video },
    { num: 2, title: "構成分解", icon: ListChecks },
    { num: 3, title: "視聴者分析", icon: Users },
    { num: 4, title: "台本作成", icon: FileText },
];

export function ShortScriptWorkflow() {
    const { toast } = useToast();
    const [isPending, startTransition] = useTransition();

    // State
    const [step, setStep] = useState(1);
    const [platform, setPlatform] = useState("TikTok");

    // Step 1 Data
    const [referenceUrl, setReferenceUrl] = useState("");
    const [channelUrl, setChannelUrl] = useState("");
    const [channelStyle, setChannelStyle] = useState<any>(null);

    // Step 2 Data
    const [structureAnalysis, setStructureAnalysis] = useState("");

    // Step 3 Data
    const [viewerAnalysis, setViewerAnalysis] = useState("");

    // Step 4 Data (Improvements & Script)
    const [theme, setTheme] = useState("");
    const [improvements, setImprovements] = useState<any[]>([]);
    const [finalScript, setFinalScript] = useState("");

    // --- Actions ---

    const handleAnalyzeChannel = () => {
        if (!channelUrl) return;
        startTransition(async () => {
            const result = await analyzeChannelFromChannelUrl(channelUrl);
            if (result.success && result.data) {
                setChannelStyle(result.data);
                toast({ title: "チャンネル分析完了", description: "スタイルを学習しました" });
            } else {
                toast({ title: "エラー", description: result.error, variant: "destructive" });
            }
        });
    };

    const handleAnalyzeStructure = () => {
        if (!referenceUrl) {
            toast({ title: "URLを入力してください", variant: "destructive" });
            return;
        }
        startTransition(async () => {
            const result = await analyzeShortStructure(referenceUrl, platform);
            if (result.success && result.data) {
                setStructureAnalysis(result.data);
                toast({ title: "構成分解完了", description: "次のステップへ進んでください" });
                setStep(2);
            } else {
                toast({ title: "エラー", description: result.error, variant: "destructive" });
            }
        });
    };

    const handleAnalyzeViewer = () => {
        startTransition(async () => {
            const result = await analyzeShortViewer(structureAnalysis, platform);
            if (result.success && result.data) {
                setViewerAnalysis(result.data);
                setStep(3);
            }
        });
    };

    const handleGenerateScript = () => {
        if (!theme) {
            toast({ title: "テーマを入力してください", variant: "destructive" });
            return;
        }
        startTransition(async () => {
            // First get improvements (internal step)
            let currentImprovements = improvements;
            if (currentImprovements.length === 0) {
                const impResult = await generateShortImprovements(structureAnalysis, viewerAnalysis, platform);
                if (impResult.success && impResult.data) {
                    try {
                        const parsed = JSON.parse(impResult.data);
                        currentImprovements = parsed.improvements || [];
                        setImprovements(currentImprovements);
                    } catch (e) {
                        // fallback
                        console.error(e);
                    }
                }
            }

            // Then Write Script
            const result = await writeScript(structureAnalysis, currentImprovements, channelStyle, theme, platform);
            if (result.success && result.data) {
                setFinalScript(result.data);

                // Save to History
                import("@/app/actions/history").then(({ saveCreation }) => {
                    saveCreation(
                        `${platform}台本: ${theme}`,
                        'video_script',
                        { finalScript: result.data, structure: structureAnalysis }
                    ).catch(e => console.error("History save failed", e));
                });

                setStep(4);
                toast({ title: "台本完成！", description: "履歴に保存されました" });
            }
        });
    };

    return (
        <div className="space-y-8 max-w-4xl mx-auto pb-20">
            {/* Progress */}
            <div className="flex justify-between items-center relative px-4">
                <div className="absolute left-0 top-1/2 w-full h-0.5 bg-muted -z-10" />
                {STEPS.map((s) => (
                    <div key={s.num} className={`bg-background px-2 flex flex-col items-center gap-2 ${step >= s.num ? "text-primary" : "text-muted-foreground"}`}>
                        <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center ${step >= s.num ? "border-primary bg-primary text-primary-foreground" : "border-muted"}`}>
                            {step > s.num ? <Check className="w-4 h-4" /> : <s.icon className="w-4 h-4" />}
                        </div>
                        <span className="text-xs font-bold">{s.title}</span>
                    </div>
                ))}
            </div>

            {/* STEP 1 */}
            <div className={step === 1 ? "block space-y-6" : "hidden"}>
                <Card>
                    <CardHeader>
                        <CardTitle>STEP 1: 動画情報の入力</CardTitle>
                        <CardDescription>参考にしたいバズ動画（ショート）を入力してください。</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="space-y-2">
                            <Label>プラットフォーム</Label>
                            <Tabs value={platform} onValueChange={setPlatform}>
                                <TabsList>
                                    <TabsTrigger value="TikTok">TikTok</TabsTrigger>
                                    <TabsTrigger value="YouTube Shorts">Shorts</TabsTrigger>
                                    <TabsTrigger value="Instagram Reels">Reels</TabsTrigger>
                                </TabsList>
                            </Tabs>
                        </div>

                        <div className="space-y-2">
                            <Label>参考動画URL</Label>
                            <Input
                                placeholder="https://www.tiktok.com/@user/video/..."
                                value={referenceUrl}
                                onChange={(e) => setReferenceUrl(e.target.value)}
                            />
                        </div>

                        <div className="space-y-4 border-t pt-4">
                            <h3 className="font-semibold text-sm text-muted-foreground">チャンネルスタイル設定（任意）</h3>
                            <div className="flex gap-2">
                                <Input
                                    placeholder="自分のチャンネルURL (@handle)"
                                    value={channelUrl}
                                    onChange={(e) => setChannelUrl(e.target.value)}
                                />
                                <Button variant="outline" onClick={handleAnalyzeChannel} disabled={isPending}>分析</Button>
                            </div>
                            {channelStyle && (
                                <div className="text-xs bg-green-50 p-2 rounded text-green-700">
                                    学習済み: {channelStyle.name} ({channelStyle.tone})
                                </div>
                            )}
                        </div>

                        <Button className="w-full" size="lg" onClick={handleAnalyzeStructure} disabled={isPending}>
                            {isPending ? <Loader2 className="mr-2 animate-spin" /> : <Sparkles className="mr-2" />}
                            構成を分析する
                        </Button>
                    </CardContent>
                </Card>
            </div>

            {/* STEP 2 */}
            <div className={step === 2 ? "block space-y-6" : "hidden"}>
                <Card>
                    <CardHeader>
                        <CardTitle>STEP 2: 構成分解結果</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="bg-muted/30 p-4 rounded-lg border max-h-[400px] overflow-y-auto">
                            <MarkdownRenderer content={structureAnalysis} />
                        </div>
                        <Button className="w-full" onClick={handleAnalyzeViewer} disabled={isPending}>
                            次へ（視聴者分析）
                        </Button>
                    </CardContent>
                </Card>
            </div>

            {/* STEP 3 */}
            <div className={step === 3 ? "block space-y-6" : "hidden"}>
                <Card>
                    <CardHeader>
                        <CardTitle>STEP 3: 視聴者分析結果</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="bg-muted/30 p-4 rounded-lg border max-h-[400px] overflow-y-auto">
                            <MarkdownRenderer content={viewerAnalysis} />
                        </div>

                        <div className="space-y-2">
                            <Label>作成する動画のテーマ</Label>
                            <Input
                                placeholder="例: 初心者でもできる節約術3選"
                                value={theme}
                                onChange={(e) => setTheme(e.target.value)}
                            />
                            <p className="text-xs text-muted-foreground">この分析結果を元に、新しいテーマで台本を作成します</p>
                        </div>

                        <Button className="w-full" onClick={handleGenerateScript} disabled={isPending || !theme}>
                            台本を作成する
                        </Button>
                    </CardContent>
                </Card>
            </div>

            {/* STEP 4 */}
            <div className={step === 4 ? "block space-y-6" : "hidden"}>
                <Card>
                    <CardHeader>
                        <CardTitle>完成した台本</CardTitle>
                        <CardDescription>TikTok/Reels用に最適化された台本です。</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="bg-background p-6 rounded-lg border shadow-sm prose prose-sm max-w-none dark:prose-invert">
                            <MarkdownRenderer content={finalScript} />
                        </div>

                        <RefinementArea
                            initialContent={finalScript}
                            contextData={{
                                platform,
                                theme,
                                channelUrl,
                                structure: structureAnalysis,
                                viewer: viewerAnalysis
                            }}
                            onContentUpdate={(newContent) => setFinalScript(newContent)}
                            contentType="script"
                        />

                        <div className="flex gap-4">
                            <Button variant="outline" className="flex-1" onClick={() => setStep(1)}>
                                最初に戻る
                            </Button>
                            <Button className="flex-1" onClick={() => navigator.clipboard.writeText(finalScript)}>
                                コピーする
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
