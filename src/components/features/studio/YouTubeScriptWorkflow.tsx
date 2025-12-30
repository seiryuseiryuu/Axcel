"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    ArrowRight, ArrowLeft, Check, Loader2, Sparkles,
    Video, Users, Search, ListChecks, FileText, Edit3, Square, CheckSquare, Eye, Code,
    ChevronDown, ChevronUp
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { MarkdownRenderer } from "@/components/ui/markdown-renderer";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
    analyzeStructure,
    analyzeViewers,
    analyzeVideo,
    generateImprovements,
    writeScript,
    extractThumbnailText,
    analyzeChannelFromUrls
} from "@/app/actions/scriptWorkflow";

export interface ChannelStyle {
    name?: string;
    title?: string;
    speakingStyle?: string;
    firstPerson?: string;
    secondPerson?: string;
    endings?: string[];
    tone?: string;
    catchphrases?: string[];
    expertise?: string;
}

interface YouTubeScriptWorkflowProps {
    onError: (msg: string) => void;
}

interface WorkflowState {
    step: number;
    // STEP1: Channel Analysis & Reference Video
    channelVideoUrls: string[]; // User's channel videos (max 3)
    channelStyle: ChannelStyle | null;
    referenceUrl: string;
    thumbnailText: string;
    // STEP2
    structureAnalysis: string;
    originalTranscript: string;
    // STEP3
    viewerNeeds: string;
    // STEP4
    openingAnalysis: string;
    // STEP5
    ctaContent: string;
    improvements: { id: string; section: string; type: 'add' | 'remove'; content: string; reason: string; selected: boolean }[];
    // STEP6
    finalScript: string;
}

const STEPS = [
    { num: 1, title: "参考動画入力", icon: Video, description: "分析したいYouTube動画のURLを入力" },
    { num: 2, title: "構成分解", icon: FileText, description: "動画の字幕を取得して構成を詳細分析" },
    { num: 3, title: "視聴者分析", icon: Users, description: "想定視聴者のレベル・悩み・リテラシーを分析" },
    { num: 4, title: "動画分析", icon: Search, description: "参考動画の冒頭・前提・本編を分析" },
    { num: 5, title: "改善提案", icon: ListChecks, description: "追加・削除すべき内容を提案" },
    { num: 6, title: "台本作成", icon: Edit3, description: "分析結果をもとに台本をライティング" },
];

// Markdown/Raw切り替え可能な結果表示コンポーネント
function ResultDisplay({
    content,
    onChange,
    label,
}: {
    content: string;
    onChange: (value: string) => void;
    label: string;
}) {
    const [viewMode, setViewMode] = useState<"preview" | "edit">("preview");

    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between">
                <Label className="text-base font-bold text-foreground">{label}</Label>
                <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as "preview" | "edit")}>
                    <TabsList className="h-9">
                        <TabsTrigger value="preview" className="text-xs px-3 h-7">
                            <Eye className="w-3.5 h-3.5 mr-1.5" />
                            プレビュー
                        </TabsTrigger>
                        <TabsTrigger value="edit" className="text-xs px-3 h-7">
                            <Code className="w-3.5 h-3.5 mr-1.5" />
                            編集
                        </TabsTrigger>
                    </TabsList>
                </Tabs>
            </div>

            {viewMode === "preview" ? (
                <div className="border border-border/60 rounded-xl p-6 bg-card min-h-[500px] max-h-[700px] overflow-y-auto shadow-sm">
                    <article className="prose prose-sm md:prose-base dark:prose-invert max-w-none 
                        prose-headings:text-foreground prose-headings:font-bold prose-p:text-muted-foreground prose-p:leading-relaxed
                        prose-li:text-muted-foreground prose-strong:text-foreground prose-strong:font-semibold
                        prose-blockquote:border-l-4 prose-blockquote:border-primary/50 prose-blockquote:bg-muted/30 prose-blockquote:py-1 prose-blockquote:px-4 prose-blockquote:rounded-r-lg prose-blockquote:not-italic
                        ">
                        <MarkdownRenderer content={content} />
                    </article>
                </div>
            ) : (
                <Textarea
                    className="min-h-[500px] font-mono text-sm leading-relaxed p-4 bg-muted/20 focus:bg-background transition-colors"
                    value={content}
                    onChange={(e) => onChange(e.target.value)}
                    placeholder="ここに分析結果や台本が表示されます..."
                />
            )}
        </div>
    );
}

export function YouTubeScriptWorkflow({ onError }: YouTubeScriptWorkflowProps) {
    const { toast } = useToast();
    const [isPending, startTransition] = useTransition();
    const [isStep2Visible, setIsStep2Visible] = useState(false);

    const [workflow, setWorkflow] = useState<WorkflowState>({
        step: 1,
        channelVideoUrls: ["", "", ""],
        channelStyle: null,
        referenceUrl: "",
        thumbnailText: "",
        structureAnalysis: "",
        originalTranscript: "",
        viewerNeeds: "",
        openingAnalysis: "",
        ctaContent: "",
        improvements: [],
        finalScript: "",
    });

    // Scroll to top on step change
    const goToStep = (step: number) => {
        setWorkflow(prev => ({ ...prev, step }));
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    // Channel Analysis
    const runChannelAnalysis = () => {
        const urls = workflow.channelVideoUrls.filter(u => u.trim());
        if (urls.length === 0) {
            toast({ title: "エラー", description: "チャンネル動画のURLを少なくとも1つ入力してください", variant: "destructive" });
            return;
        }

        startTransition(async () => {
            const result = await analyzeChannelFromUrls(urls);
            if (result.success && result.data) {
                // @ts-ignore
                setWorkflow(prev => ({ ...prev, channelStyle: result.data }));
                toast({ title: "チャンネル分析完了", description: "スタイル情報を取得しました" });
            } else {
                onError(result.error || "チャンネル分析に失敗しました");
            }
        });
    };

    // STEP2: 構成分解
    const runStructureAnalysis = () => {
        if (!workflow.referenceUrl) {
            toast({ title: "エラー", description: "参考動画URLを入力してください", variant: "destructive" });
            return;
        }

        console.log("[YouTubeScriptWorkflow] Starting structure analysis...");
        console.log("[YouTubeScriptWorkflow] Reference URL:", workflow.referenceUrl);

        startTransition(async () => {
            try {
                console.log("[YouTubeScriptWorkflow] Calling analyzeStructure...");

                // Parallel: structure analysis + thumbnail extraction
                const [result, thumbnailResult] = await Promise.all([
                    analyzeStructure(workflow.referenceUrl),
                    extractThumbnailText(workflow.referenceUrl)
                ]);

                console.log("[YouTubeScriptWorkflow] Result:", result);
                console.log("[YouTubeScriptWorkflow] Thumbnail text:", thumbnailResult);

                if (result.success && result.data) {
                    // Extract main text from thumbnail
                    let thumbnailText = "";
                    if (thumbnailResult.success && thumbnailResult.data) {
                        thumbnailText = thumbnailResult.data.mainText || "";
                        if (thumbnailResult.data.subText) {
                            thumbnailText += " / " + thumbnailResult.data.subText;
                        }
                    }

                    setWorkflow(prev => ({
                        ...prev,
                        structureAnalysis: result.data!,
                        originalTranscript: result.transcript || "",
                        thumbnailText
                    }));
                    toast({
                        title: "構成分解完了",
                        description: thumbnailText
                            ? `サムネイル文言:「${thumbnailText}」も抽出しました`
                            : "内容を確認して「確認して次へ」をクリックしてください"
                    });
                } else {
                    console.error("[YouTubeScriptWorkflow] Error:", result.error);
                    toast({
                        title: "エラー",
                        description: result.error || "構成分解に失敗しました",
                        variant: "destructive"
                    });
                    onError(result.error || "構成分解に失敗しました");
                }
            } catch (e: any) {
                console.error("[YouTubeScriptWorkflow] Exception:", e);
                toast({
                    title: "エラー",
                    description: e.message || "予期せぬエラーが発生しました",
                    variant: "destructive"
                });
                onError(e.message || "予期せぬエラーが発生しました");
            }
        });
    };

    // STEP3: 視聴者分析
    const runViewerAnalysis = () => {
        startTransition(async () => {
            // Pass thumbnailText to viewer analysis for context
            const result = await analyzeViewers(workflow.structureAnalysis, workflow.thumbnailText);

            if (result.success && result.data) {
                setWorkflow(prev => ({ ...prev, viewerNeeds: result.data! }));
                toast({ title: "視聴者分析完了", description: "内容を確認して「確認して次へ」をクリックしてください" });
            } else {
                onError(result.error || "視聴者分析に失敗しました");
            }
        });
    };

    // STEP4: 動画分析
    const runVideoAnalysis = () => {
        startTransition(async () => {
            const result = await analyzeVideo(workflow.structureAnalysis, workflow.viewerNeeds);

            if (result.success && result.data) {
                setWorkflow(prev => ({ ...prev, openingAnalysis: result.data! }));
                toast({ title: "動画分析完了", description: "内容を確認して「確認して次へ」をクリックしてください" });
            } else {
                onError(result.error || "動画分析に失敗しました");
            }
        });
    };

    // STEP5: 改善提案
    const runImprovements = () => {
        startTransition(async () => {
            const result = await generateImprovements(
                workflow.structureAnalysis,
                workflow.viewerNeeds,
                workflow.openingAnalysis,
                workflow.ctaContent || undefined
            );

            if (result.success && result.data) {
                try {
                    const cleanJson = result.data.replace(/```json/g, "").replace(/```/g, "").trim();
                    const parsed = JSON.parse(cleanJson);
                    const improvements: WorkflowState['improvements'] = [];

                    if (parsed.improvements && Array.isArray(parsed.improvements)) {
                        parsed.improvements.forEach((section: any) => {
                            const sectionName = section.section || "その他";
                            section.additions?.forEach((item: any, i: number) => {
                                improvements.push({
                                    id: `${sectionName}-add-${i}`,
                                    section: sectionName,
                                    type: 'add',
                                    content: typeof item === 'string' ? item : item.content, // Handle both string and object
                                    reason: item.reason || "",
                                    selected: false,
                                });
                            });
                            section.removals?.forEach((item: any, i: number) => {
                                improvements.push({
                                    id: `${sectionName}-rem-${i}`,
                                    section: sectionName,
                                    type: 'remove',
                                    content: typeof item === 'string' ? item : item.content,
                                    reason: item.reason || "",
                                    selected: false,
                                });
                            });
                        });
                    } else {
                        // Fallback for old format
                        parsed.additions?.forEach((item: any, i: number) => {
                            improvements.push({
                                id: `add-${i}`,
                                section: "全般",
                                type: 'add',
                                content: item.content,
                                reason: item.reason || "",
                                selected: false,
                            });
                        });
                        parsed.removals?.forEach((item: any, i: number) => {
                            improvements.push({
                                id: `rem-${i}`,
                                section: "全般",
                                type: 'remove',
                                content: item.content,
                                reason: item.reason || "",
                                selected: false,
                            });
                        });
                    }

                    setWorkflow(prev => ({ ...prev, improvements }));
                    toast({ title: "改善提案完了", description: "採用するものを選択して「確認して次へ」をクリックしてください" });
                } catch {
                    setWorkflow(prev => ({
                        ...prev,
                        improvements: [
                            { id: 'raw', section: '全般', type: 'add', content: result.data!, reason: '', selected: false }
                        ]
                    }));
                }
            } else {
                onError(result.error || "改善提案の生成に失敗しました");
            }
        });
    };

    // STEP6: 台本作成
    const runScriptWriting = () => {
        const selectedImprovements = workflow.improvements
            .filter(i => i.selected)
            .map(i => ({ type: i.type, content: i.content }));

        startTransition(async () => {
            const result = await writeScript(
                workflow.structureAnalysis,
                workflow.viewerNeeds,
                selectedImprovements,
                workflow.channelStyle, // Pass channel style for persona
                workflow.referenceUrl,  // 元動画のURL
                workflow.originalTranscript  // 元動画の字幕（口調を踏襲するため）
            );

            if (result.success && result.data) {
                setWorkflow(prev => ({ ...prev, finalScript: result.data! }));
                toast({ title: "台本作成完了！", description: "台本が完成しました" });
            } else {
                onError(result.error || "台本作成に失敗しました");
            }
        });
    };

    const toggleImprovement = (id: string) => {
        setWorkflow(prev => ({
            ...prev,
            improvements: prev.improvements.map(i =>
                i.id === id ? { ...i, selected: !i.selected } : i
            )
        }));
    };

    // 確認して次へ進む
    const confirmAndNext = () => {
        if (workflow.step < 6) {
            goToStep(workflow.step + 1);
        }
    };

    // ステップごとの結果があるか
    const hasResult = () => {
        switch (workflow.step) {
            case 2: return !!workflow.structureAnalysis;
            case 3: return !!workflow.viewerNeeds;
            case 4: return !!workflow.openingAnalysis;
            case 5: return workflow.improvements.length > 0;
            case 6: return !!workflow.finalScript;
            default: return false;
        }
    };

    return (
        <div className="space-y-6">
            {/* Progress Bar */}
            <div className="flex items-center justify-between bg-muted/30 rounded-lg p-4 overflow-x-auto">
                {STEPS.map((s, i) => (
                    <div key={s.num} className="flex items-center">
                        <button
                            onClick={() => goToStep(s.num)}
                            className={`flex flex-col items-center gap-1 transition-all ${workflow.step === s.num
                                ? "text-primary"
                                : workflow.step > s.num
                                    ? "text-green-500"
                                    : "text-muted-foreground"
                                }`}
                        >
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 ${workflow.step === s.num
                                ? "border-primary bg-primary text-white"
                                : workflow.step > s.num
                                    ? "border-green-500 bg-green-500 text-white"
                                    : "border-muted-foreground"
                                }`}>
                                {workflow.step > s.num ? <Check className="w-5 h-5" /> : <s.icon className="w-5 h-5" />}
                            </div>
                            <span className="text-xs font-medium whitespace-nowrap">{s.title}</span>
                        </button>
                        {i < STEPS.length - 1 && (
                            <div className={`w-8 h-0.5 mx-1 ${workflow.step > s.num ? "bg-green-500" : "bg-muted"}`} />
                        )}
                    </div>
                ))}
            </div>

            {/* Step Content */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        {(() => { const Icon = STEPS[workflow.step - 1].icon; return <Icon className="w-5 h-5" />; })()}
                        STEP{workflow.step}: {STEPS[workflow.step - 1].title}
                    </CardTitle>
                    <CardDescription>{STEPS[workflow.step - 1].description}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {/* STEP 1: 参考動画入力 */}
                    {workflow.step === 1 && (
                        <div className="space-y-8">
                            {/* Channel Analysis Section */}
                            <div className="space-y-4 border p-4 rounded-lg bg-secondary/10">
                                <div className="space-y-2">
                                    <h3 className="font-semibold flex items-center gap-2 text-primary">
                                        <Users className="w-4 h-4" />
                                        あなたのチャンネル分析（任意）
                                    </h3>
                                    <p className="text-xs text-muted-foreground">
                                        過去の動画を分析して、あなたの話し方やスタイルを台本に反映させます（最大3つ）。
                                    </p>
                                </div>
                                <div className="space-y-2">
                                    {workflow.channelVideoUrls.map((url, i) => (
                                        <Input
                                            key={i}
                                            placeholder={`チャンネル動画 URL ${i + 1}`}
                                            value={url}
                                            onChange={(e) => {
                                                const newUrls = [...workflow.channelVideoUrls];
                                                newUrls[i] = e.target.value;
                                                setWorkflow(prev => ({ ...prev, channelVideoUrls: newUrls }));
                                            }}
                                            className="bg-background"
                                        />
                                    ))}
                                </div>
                                <Button onClick={runChannelAnalysis} disabled={isPending} variant="outline" className="w-full">
                                    {isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
                                    チャンネルスタイルを分析する
                                </Button>

                                {workflow.channelStyle && (
                                    <div className="bg-background p-4 rounded border text-sm space-y-2 animate-in fade-in slide-in-from-top-2">
                                        <div className="font-medium text-green-600 flex items-center gap-2">
                                            <Check className="w-4 h-4" /> 分析完了
                                        </div>
                                        <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                                            <div><span className="font-semibold">話し方:</span> {workflow.channelStyle.speakingStyle}</div>
                                            <div><span className="font-semibold">一人称:</span> {workflow.channelStyle.firstPerson}</div>
                                            <div><span className="font-semibold">トーン:</span> {workflow.channelStyle.tone}</div>
                                            <div><span className="font-semibold">権威性:</span> {workflow.channelStyle.expertise || "なし"}</div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <Label className="text-base">台本の参考にする動画URL <span className="text-red-500">*</span></Label>
                                    <Input
                                        placeholder="https://youtube.com/watch?v=..."
                                        value={workflow.referenceUrl}
                                        onChange={(e) => setWorkflow(prev => ({ ...prev, referenceUrl: e.target.value }))}
                                        className="h-12 text-lg"
                                    />
                                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                                        <Video className="w-3 h-3" />
                                        この動画の構成をベースに台本を作成します
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* STEP 2: 構成分解 */}
                    {workflow.step === 2 && (
                        <>
                            <Button onClick={runStructureAnalysis} disabled={isPending} className="w-full">
                                {isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
                                {isPending ? "字幕を取得して分析中..." : "構成を分析する"}
                            </Button>
                            {workflow.structureAnalysis && (
                                <div className="space-y-6">
                                    <ResultDisplay
                                        content={workflow.structureAnalysis}
                                        onChange={(v) => setWorkflow(prev => ({ ...prev, structureAnalysis: v }))}
                                        label="構成分析結果"
                                    />

                                    {/* Raw Transcript Display (User Requested) */}
                                    <div className="space-y-2">
                                        <Label className="text-base font-bold text-foreground">取得した字幕（トランスクリプト）</Label>
                                        <div className="border border-border/60 rounded-xl p-4 bg-muted/20">
                                            <Textarea
                                                readOnly
                                                className="min-h-[200px] max-h-[400px] font-mono text-xs leading-relaxed bg-transparent border-none resize-y focus-visible:ring-0"
                                                value={workflow.originalTranscript || "字幕が取得できませんでした"}
                                                placeholder="字幕データ..."
                                            />
                                            <p className="text-xs text-muted-foreground mt-2 text-right">
                                                ※この字幕データを元に分析・台本作成が行われます
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </>
                    )}

                    {/* STEP 3: 視聴者分析 */}
                    {workflow.step === 3 && (
                        <>
                            <Button onClick={runViewerAnalysis} disabled={isPending} className="w-full">
                                {isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
                                視聴者を分析する
                            </Button>
                            {workflow.viewerNeeds && (
                                <ResultDisplay
                                    content={workflow.viewerNeeds}
                                    onChange={(v) => setWorkflow(prev => ({ ...prev, viewerNeeds: v }))}
                                    label="視聴者分析結果"
                                />
                            )}
                        </>
                    )}

                    {/* STEP 4: 動画分析 */}
                    {workflow.step === 4 && (
                        <>
                            <div className="border rounded-lg p-4 bg-muted/20 mb-4">
                                <button
                                    onClick={() => setIsStep2Visible(!isStep2Visible)}
                                    className="flex items-center gap-2 text-sm font-medium w-full hover:text-primary transition-colors"
                                >
                                    {isStep2Visible ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                    {isStep2Visible ? "Step 2（構成分解）の結果を隠す" : "Step 2（構成分解）の結果と比較する"}
                                </button>
                                {isStep2Visible && (
                                    <div className="mt-4 max-h-[400px] overflow-y-auto bg-background rounded border p-4 shadow-inner">
                                        <MarkdownRenderer content={workflow.structureAnalysis} />
                                    </div>
                                )}
                            </div>

                            <Button onClick={runVideoAnalysis} disabled={isPending} className="w-full">
                                {isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
                                動画を分析する
                            </Button>
                            {workflow.openingAnalysis && (
                                <ResultDisplay
                                    content={workflow.openingAnalysis}
                                    onChange={(v) => setWorkflow(prev => ({ ...prev, openingAnalysis: v }))}
                                    label="動画分析結果"
                                />
                            )}
                        </>
                    )}

                    {/* STEP 5: 改善提案 */}
                    {workflow.step === 5 && (
                        <div className="space-y-6">
                            {/* Step 2 Comparison Toggle */}
                            <div className="border rounded-lg p-4 bg-muted/20">
                                <button
                                    onClick={() => setIsStep2Visible(!isStep2Visible)}
                                    className="flex items-center gap-2 text-sm font-medium w-full hover:text-primary transition-colors"
                                >
                                    {isStep2Visible ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                    {isStep2Visible ? "Step 2（構成分解）の結果を隠す" : "Step 2（構成分解）の結果を参照しながら改善案を検討する"}
                                </button>
                                {isStep2Visible && (
                                    <div className="mt-4 max-h-[400px] overflow-y-auto bg-background rounded border p-4 shadow-inner">
                                        <MarkdownRenderer content={workflow.structureAnalysis} />
                                    </div>
                                )}
                            </div>

                            {/* CTA Input */}
                            <div className="space-y-2">
                                <Label>この動画のゴール（CTA：Call To Action）</Label>
                                <Input
                                    placeholder="例：公式LINEに登録させる、チャンネル登録を促す、メルマガへ誘導 など"
                                    value={workflow.ctaContent}
                                    onChange={(e) => setWorkflow(prev => ({ ...prev, ctaContent: e.target.value }))}
                                />
                                <p className="text-xs text-muted-foreground">
                                    動画の最後に視聴者に何をしてほしいかを設定すると、改善提案の精度が向上します。
                                </p>
                            </div>

                            <Button onClick={runImprovements} disabled={isPending} className="w-full">
                                {isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
                                改善提案を生成する
                            </Button>

                            {/* Improvements Table Display */}
                            {workflow.improvements.length > 0 && (
                                <div className="space-y-8">
                                    {["OP", "PASTOR", "プレ本編", "本編", "ED"].map(section => {
                                        const sectionItems = workflow.improvements.filter(i => i.section === section);
                                        if (sectionItems.length === 0) return null;

                                        return (
                                            <Card key={section} className="overflow-hidden">
                                                <CardHeader className="py-3 bg-secondary/30 border-b">
                                                    <CardTitle className="text-base font-bold flex items-center justify-between">
                                                        {section}
                                                        <span className="text-xs font-normal text-muted-foreground bg-background px-2 py-1 rounded-full border">
                                                            {sectionItems.length}件の提案
                                                        </span>
                                                    </CardTitle>
                                                </CardHeader>
                                                <CardContent className="p-0">
                                                    <Table>
                                                        <TableHeader>
                                                            <TableRow>
                                                                <TableHead className="w-[80px] text-center">タイプ</TableHead>
                                                                <TableHead>改善内容</TableHead>
                                                                <TableHead className="w-[60px] text-center">採用</TableHead>
                                                            </TableRow>
                                                        </TableHeader>
                                                        <TableBody>
                                                            {sectionItems.map(item => (
                                                                <TableRow
                                                                    key={item.id}
                                                                    onClick={() => toggleImprovement(item.id)}
                                                                    className={`cursor-pointer transition-colors ${item.selected
                                                                        ? "bg-primary/5 hover:bg-primary/10"
                                                                        : "hover:bg-muted/50"
                                                                        }`}
                                                                >
                                                                    <TableCell className="text-center">
                                                                        {item.type === 'add' ? (
                                                                            <span className="inline-flex items-center justify-center px-2 py-1 rounded text-[10px] font-bold bg-green-100 text-green-700 border border-green-200 w-full">
                                                                                追加
                                                                            </span>
                                                                        ) : (
                                                                            <span className="inline-flex items-center justify-center px-2 py-1 rounded text-[10px] font-bold bg-red-100 text-red-700 border border-red-200 w-full">
                                                                                削除
                                                                            </span>
                                                                        )}
                                                                    </TableCell>
                                                                    <TableCell className="text-sm py-3">
                                                                        {item.content}
                                                                        {item.reason && (
                                                                            <p className="text-xs text-muted-foreground mt-1">💡 {item.reason}</p>
                                                                        )}
                                                                    </TableCell>
                                                                    <TableCell className="text-center">
                                                                        <div className={`w-5 h-5 mx-auto rounded flex items-center justify-center transition-all ${item.selected
                                                                            ? "bg-primary text-primary-foreground"
                                                                            : "border border-muted-foreground text-transparent"
                                                                            }`}>
                                                                            <Check className="w-3.5 h-3.5" />
                                                                        </div>
                                                                    </TableCell>
                                                                </TableRow>
                                                            ))}
                                                        </TableBody>
                                                    </Table>
                                                </CardContent>
                                            </Card>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    )}

                    {/* STEP 6: 台本作成 */}
                    {workflow.step === 6 && (
                        <>
                            <Button onClick={runScriptWriting} disabled={isPending} className="w-full" size="lg">
                                {isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
                                台本を作成する
                            </Button>
                            {workflow.finalScript && (
                                <ResultDisplay
                                    content={workflow.finalScript}
                                    onChange={(v) => setWorkflow(prev => ({ ...prev, finalScript: v }))}
                                    label="完成台本"
                                />
                            )}
                        </>
                    )}
                </CardContent>
            </Card>

            {/* Navigation */}
            <div className="flex justify-between gap-4">
                <Button
                    variant="outline"
                    onClick={() => goToStep(workflow.step - 1)}
                    disabled={workflow.step === 1}
                >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    前へ
                </Button>

                {workflow.step === 1 ? (
                    <Button
                        onClick={() => goToStep(2)}
                        disabled={!workflow.referenceUrl}
                    >
                        次へ
                        <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                ) : workflow.step < 6 && hasResult() ? (
                    <Button onClick={confirmAndNext} className="bg-green-600 hover:bg-green-700">
                        <Check className="w-4 h-4 mr-2" />
                        確認して次へ
                    </Button>
                ) : workflow.step < 6 ? (
                    <Button variant="ghost" disabled>
                        上のボタンで分析を実行してください
                    </Button>
                ) : null}
            </div>
        </div>
    );
}
