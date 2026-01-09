"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
    ArrowRight, ArrowLeft, Check, Loader2, Sparkles,
    Video, Users, Search, ListChecks, FileText, Edit3, Eye, Code,
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
    analyzeChannelFromChannelUrl,
    analyzeChannelFromUrls // Keep for backward compatibility if needed, though we use the new one primarily
} from "@/app/actions/scriptWorkflow";

interface ChannelStyle {
    name: string;
    speakingStyle: string;
    firstPerson: string;
    secondPerson: string;
    endings: string[];
    tone: string;
    expertise?: string;
}

interface YouTubeScriptWorkflowProps {
    onError: (error: string) => void;
}

interface ImprovementAxis {
    axisName: string;
    description: string;
    example: string;
    reason: string;
    selected: boolean;
}

interface ImprovementData {
    improvementAxes: ImprovementAxis[];
    contentStructure: {
        opening: { hookType: string; suggestedHook: string };
        preProblem: { commonMisconception: string; truthReveal: string };
        mainContent: { structure: string; keyPoints: string[] };
        ending: { registrationTarget: string; registrationBenefit: string; callToAction: string };
    };
    gapAnalysis: { originalVideoIssue: string; proposedSolution: string };
}

interface WorkflowState {
    step: number;
    // STEP1: Channel Analysis & Reference Video
    channelUrl: string;
    channelVideoUrls: string[]; // Keep for compatibility / state shape
    analyzedVideos: { title: string; thumbnail: string; url: string }[];
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
    // STEP5 - CTA分割入力
    ctaRegistrationType: string; // 登録先（LINE/チャンネル登録/メルマガなど）
    ctaBenefit: string; // ユーザーにとってのメリット
    ctaContent: string; // 古い形式との互換性用
    improvements: { id: string; section: string; type: 'add' | 'remove'; content: string; reason: string; selected: boolean }[];
    improvementData: ImprovementData | null; // 新形式のデータ
    // STEP6
    finalScript: string;
}

const STEPS = [
    { num: 1, title: "チャンネル・参考動画", icon: Video, description: "あなたのチャンネルと参考にしたい動画のURLを入力してください" },
    { num: 2, title: "構成分解", icon: ListChecks, description: "参考動画の構成を分析・分解します" },
    { num: 3, title: "視聴者分析", icon: Users, description: "ターゲットとなる視聴者のニーズや悩みを分析します" },
    { num: 4, title: "動画分析", icon: Search, description: "動画の冒頭（フック）や工夫点を分析します" },
    { num: 5, title: "改善提案", icon: Sparkles, description: "あなたのチャンネルらしさを加えるための改善案を生成します" },
    { num: 6, title: "台本作成", icon: FileText, description: "分析結果を元に、新しい動画の台本を作成します" },
];

function ResultDisplay({ content, onChange, label }: { content: string, onChange: (v: string) => void, label: string }) {
    const [isEditing, setIsEditing] = useState(false);
    const [viewMode, setViewMode] = useState<"preview" | "source">("preview");

    return (
        <div className="space-y-2 animate-in fade-in slide-in-from-bottom-2">
            <div className="flex items-center justify-between">
                <Label className="text-base font-bold text-foreground flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-primary" />
                    {label}
                </Label>
                <div className="flex bg-muted rounded-lg p-0.5 border">
                    <button
                        onClick={() => setViewMode("preview")}
                        className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all flex items-center gap-1 ${viewMode === "preview"
                            ? "bg-background text-foreground shadow-sm"
                            : "text-muted-foreground hover:text-foreground"
                            }`}
                    >
                        <Eye className="w-3.5 h-3.5" />
                        プレビュー
                    </button>
                    <button
                        onClick={() => setViewMode("source")}
                        className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all flex items-center gap-1 ${viewMode === "source"
                            ? "bg-background text-foreground shadow-sm"
                            : "text-muted-foreground hover:text-foreground"
                            }`}
                    >
                        <Code className="w-3.5 h-3.5" />
                        ソース
                    </button>
                </div>
            </div>

            {viewMode === "preview" ? (
                <div className="border border-border/60 rounded-xl overflow-hidden bg-muted/20">
                    <div className="bg-background/50 p-2 flex justify-end border-b">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                                setViewMode("source");
                                setIsEditing(true);
                            }}
                            className="h-7 text-xs"
                        >
                            <Edit3 className="w-3.5 h-3.5 mr-1.5" />
                            編集する
                        </Button>
                    </div>
                    <article className="prose prose-sm dark:prose-invert max-w-none p-6 bg-background">
                        <MarkdownRenderer content={content} />
                    </article>
                </div>
            ) : (
                <div className="border border-border/60 rounded-xl overflow-hidden shadow-sm transition-all focus-within:ring-1 focus-within:ring-primary/20">
                    <Textarea
                        className="min-h-[400px] font-mono text-sm leading-relaxed border-0 focus-visible:ring-0 p-6 resize-y bg-background"
                        value={content}
                        onChange={(e) => onChange(e.target.value)}
                        placeholder={`${label}がここに表示されます`}
                    />
                </div>
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
        channelUrl: "",
        channelVideoUrls: ["", "", ""],
        analyzedVideos: [],
        channelStyle: null,
        referenceUrl: "",
        thumbnailText: "",
        structureAnalysis: "",
        originalTranscript: "",
        viewerNeeds: "",
        openingAnalysis: "",
        ctaRegistrationType: "",
        ctaBenefit: "",
        ctaContent: "",
        improvements: [],
        improvementData: null,
        finalScript: "",
    });

    // Scroll to top on step change
    const goToStep = (step: number) => {
        setWorkflow(prev => ({ ...prev, step }));
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    // Channel Analysis
    const runChannelAnalysis = () => {
        if (!workflow.channelUrl.trim()) {
            toast({ title: "エラー", description: "チャンネルURLを入力してください", variant: "destructive" });
            return;
        }

        startTransition(async () => {
            const result = await analyzeChannelFromChannelUrl(workflow.channelUrl);

            if (result.success && result.data) {
                // @ts-ignore
                setWorkflow(prev => ({
                    ...prev,
                    channelStyle: result.data,
                    analyzedVideos: result.analyzedVideos || []
                }));
                toast({ title: "チャンネル分析完了", description: "最新動画からスタイルを抽出しました" });
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
        // CTA情報を結合
        const ctaInfo = workflow.ctaRegistrationType || workflow.ctaBenefit
            ? `登録先: ${workflow.ctaRegistrationType || '未指定'}\nユーザーへのメリット: ${workflow.ctaBenefit || '未指定'}`
            : workflow.ctaContent || undefined;

        startTransition(async () => {
            const result = await generateImprovements(
                workflow.structureAnalysis,
                workflow.viewerNeeds,
                workflow.openingAnalysis,
                ctaInfo
            );

            if (result.success && result.data) {
                console.log("[runImprovements] Raw result:", result.data.substring(0, 500));
                try {
                    const cleanJson = result.data.replace(/```json/g, "").replace(/```/g, "").trim();
                    console.log("[runImprovements] Clean JSON:", cleanJson.substring(0, 500));
                    const parsed = JSON.parse(cleanJson);
                    console.log("[runImprovements] Parsed keys:", Object.keys(parsed));

                    // 新形式（improvementAxes）の処理
                    if (parsed.improvementAxes && Array.isArray(parsed.improvementAxes)) {
                        console.log("[runImprovements] Using NEW format (improvementAxes)");
                        const axesWithSelection = (parsed.improvementAxes || []).map((axis: any) => ({
                            ...axis,
                            axisName: axis.axisName || '改善項目',
                            description: axis.description || '',
                            example: axis.example || '',
                            reason: axis.reason || '',
                            selected: true // デフォルトで全て選択
                        }));

                        // デフォルト値を設定して安全にセット
                        const safeImprovementData = {
                            improvementAxes: axesWithSelection,
                            contentStructure: parsed.contentStructure || null,
                            gapAnalysis: parsed.gapAnalysis || null
                        };

                        setWorkflow(prev => ({
                            ...prev,
                            improvementData: safeImprovementData,
                            improvements: [] // 新形式では使わない
                        }));
                        toast({ title: "改善提案完了", description: "改善の軸と構成提案を確認してください" });
                    }
                    // 古い形式（improvements配列）のフォールバック
                    else if (parsed.improvements && Array.isArray(parsed.improvements)) {
                        const improvements: WorkflowState['improvements'] = [];
                        parsed.improvements.forEach((section: any) => {
                            const sectionName = section.section || "その他";
                            section.additions?.forEach((item: any, i: number) => {
                                improvements.push({
                                    id: `${sectionName}-add-${i}`,
                                    section: sectionName,
                                    type: 'add',
                                    content: typeof item === 'string' ? item : item.content,
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

                        setWorkflow(prev => ({ ...prev, improvements, improvementData: null }));
                        toast({ title: "改善提案完了", description: "採用するものを選択して「確認して次へ」をクリックしてください" });
                    } else {
                        // どちらの形式でもない場合、生データを表示
                        setWorkflow(prev => ({
                            ...prev,
                            improvements: [{ id: 'raw', section: '全般', type: 'add', content: result.data!, reason: '', selected: false }],
                            improvementData: null
                        }));
                    }
                } catch (e) {
                    console.error("JSON parse error:", e);
                    setWorkflow(prev => ({
                        ...prev,
                        improvements: [
                            { id: 'raw', section: '全般', type: 'add', content: result.data!, reason: '', selected: false }
                        ],
                        improvementData: null
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
            case 5: return workflow.improvements.length > 0 || workflow.improvementData !== null;
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
                                        過去の動画を分析して、あなたの話し方やスタイルを台本に反映させます（自動で最新3件を取得）
                                    </p>
                                </div>
                                <div className="space-y-2">
                                    <Label>チャンネルURL / ハンドル名</Label>
                                    <div className="flex gap-2">
                                        <Input
                                            placeholder="例: @user-handle または https://www.youtube.com/@..."
                                            value={workflow.channelUrl}
                                            onChange={e => setWorkflow(prev => ({ ...prev, channelUrl: e.target.value }))}
                                        />
                                        <Button onClick={runChannelAnalysis} disabled={isPending}>
                                            {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                                            <span className="ml-2">分析する</span>
                                        </Button>
                                    </div>
                                    <p className="text-xs text-muted-foreground">
                                        ※URLまたは「@」から始まるハンドル名を入力してください。最新の動画3本を自動取得して分析します。
                                    </p>
                                </div>

                                {/* Analyzed Videos Display */}
                                {workflow.analyzedVideos.length > 0 && (
                                    <div className="mt-4 p-3 bg-muted/30 rounded-lg">
                                        <Label className="text-xs text-muted-foreground mb-2 block">分析に使用した動画</Label>
                                        <div className="grid grid-cols-3 gap-2">
                                            {workflow.analyzedVideos.map((v, i) => (
                                                <div key={i} className="space-y-1">
                                                    <div className="aspect-video relative rounded overflow-hidden border">
                                                        <img src={v.thumbnail} alt={v.title} className="w-full h-full object-cover" />
                                                    </div>
                                                    <p className="text-[10px] text-muted-foreground line-clamp-2 leading-tight">{v.title}</p>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {workflow.channelStyle && (
                                    <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg border border-green-200 dark:border-green-800">
                                        <div className="flex items-center gap-2 mb-2 text-green-700 dark:text-green-400 font-semibold">
                                            <Check className="w-4 h-4" />
                                            <span>分析完了: {workflow.channelStyle.name || "チャンネル"}</span>
                                        </div>
                                        <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm text-green-800 dark:text-green-300">
                                            <p>🔍 <strong>一人称:</strong> {workflow.channelStyle.firstPerson}</p>
                                            <p>🗣 <strong>語尾:</strong> {workflow.channelStyle.endings?.slice(0, 3).join(", ")}</p>
                                            <p>🎵 <strong>トーン:</strong> {workflow.channelStyle.tone}</p>
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

                            {/* CTA Input - 分割入力 */}
                            <div className="space-y-4 border rounded-lg p-4 bg-muted/10">
                                <Label className="text-base font-semibold flex items-center gap-2">
                                    <Sparkles className="w-4 h-4 text-primary" />
                                    この動画のゴール（CTA設定）
                                </Label>
                                <div className="grid gap-4 md:grid-cols-2">
                                    <div className="space-y-2">
                                        <Label htmlFor="ctaRegistrationType">登録先</Label>
                                        <Input
                                            id="ctaRegistrationType"
                                            placeholder="例：公式LINE、チャンネル登録、メルマガ"
                                            value={workflow.ctaRegistrationType}
                                            onChange={(e) => setWorkflow(prev => ({ ...prev, ctaRegistrationType: e.target.value }))}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="ctaBenefit">ユーザーへのメリット</Label>
                                        <Input
                                            id="ctaBenefit"
                                            placeholder="例：限定動画が見れる、最新情報が届く、無料相談ができる"
                                            value={workflow.ctaBenefit}
                                            onChange={(e) => setWorkflow(prev => ({ ...prev, ctaBenefit: e.target.value }))}
                                        />
                                    </div>
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    視聴者に何をしてもらいたいか、そのメリットは何かを設定すると、改善提案とCTAの精度が向上します。
                                </p>
                            </div>

                            <Button onClick={runImprovements} disabled={isPending} className="w-full" variant={workflow.improvementData ? "outline" : "default"}>
                                {isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
                                {workflow.improvementData ? "改善提案を再生成する" : "改善提案を生成する"}
                            </Button>

                            {/* 新形式: improvementAxes表示 */}
                            {workflow.improvementData && (
                                <div className="space-y-6">
                                    {/* 改善の軸 */}
                                    {workflow.improvementData.improvementAxes && workflow.improvementData.improvementAxes.length > 0 && (
                                        <Card>
                                            <CardHeader className="py-3 bg-primary/10 border-b">
                                                <CardTitle className="text-base font-bold">改善の軸</CardTitle>
                                                <CardDescription>提案された改善アプローチを確認してください</CardDescription>
                                            </CardHeader>
                                            <CardContent className="p-4 space-y-4">
                                                {workflow.improvementData.improvementAxes.map((axis, i) => (
                                                    <div key={i} className="border rounded-lg p-4 bg-background hover:bg-muted/30 transition-colors">
                                                        <div className="flex items-start justify-between gap-4">
                                                            <div className="flex-1 space-y-2">
                                                                <Input
                                                                    value={axis.axisName || ''}
                                                                    onChange={(e) => {
                                                                        const newAxes = [...workflow.improvementData!.improvementAxes];
                                                                        newAxes[i] = { ...newAxes[i], axisName: e.target.value };
                                                                        setWorkflow(prev => ({
                                                                            ...prev,
                                                                            improvementData: { ...prev.improvementData!, improvementAxes: newAxes }
                                                                        }));
                                                                    }}
                                                                    placeholder="改善の軸名"
                                                                    className="font-semibold text-primary"
                                                                />
                                                                <Textarea
                                                                    value={axis.description || ''}
                                                                    onChange={(e) => {
                                                                        const newAxes = [...workflow.improvementData!.improvementAxes];
                                                                        newAxes[i] = { ...newAxes[i], description: e.target.value };
                                                                        setWorkflow(prev => ({
                                                                            ...prev,
                                                                            improvementData: { ...prev.improvementData!, improvementAxes: newAxes }
                                                                        }));
                                                                    }}
                                                                    placeholder="改善の説明"
                                                                    className="text-sm min-h-[60px]"
                                                                />
                                                                {axis.example && <p className="text-sm mt-2"><strong>例：</strong>{axis.example}</p>}
                                                                {axis.reason && <p className="text-xs text-muted-foreground mt-1">💡 {axis.reason}</p>}
                                                            </div>
                                                            <div
                                                                onClick={() => {
                                                                    const newAxes = [...workflow.improvementData!.improvementAxes];
                                                                    newAxes[i] = { ...newAxes[i], selected: !newAxes[i].selected };
                                                                    setWorkflow(prev => ({
                                                                        ...prev,
                                                                        improvementData: { ...prev.improvementData!, improvementAxes: newAxes }
                                                                    }));
                                                                }}
                                                                className={`w-6 h-6 rounded cursor-pointer flex items-center justify-center transition-all shrink-0 ${axis.selected
                                                                    ? "bg-primary text-primary-foreground"
                                                                    : "border border-muted-foreground text-transparent"
                                                                    }`}
                                                            >
                                                                <Check className="w-4 h-4" />
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </CardContent>
                                        </Card>
                                    )}

                                    {/* 構成提案 */}
                                    {workflow.improvementData.contentStructure && (
                                        <Card>
                                            <CardHeader className="py-3 bg-secondary/30 border-b">
                                                <CardTitle className="text-base font-bold">構成提案</CardTitle>
                                            </CardHeader>
                                            <CardContent className="p-4 space-y-4">
                                                <div className="grid gap-4 md:grid-cols-2">
                                                    {workflow.improvementData.contentStructure.opening && (
                                                        <div className="border rounded p-3 space-y-2">
                                                            <h5 className="font-semibold text-sm">オープニング</h5>
                                                            <Input
                                                                value={workflow.improvementData.contentStructure.opening.hookType || ''}
                                                                onChange={(e) => setWorkflow(prev => ({
                                                                    ...prev,
                                                                    improvementData: {
                                                                        ...prev.improvementData!,
                                                                        contentStructure: {
                                                                            ...prev.improvementData!.contentStructure,
                                                                            opening: { ...prev.improvementData!.contentStructure.opening, hookType: e.target.value }
                                                                        }
                                                                    }
                                                                }))}
                                                                placeholder="フックタイプ"
                                                                className="text-xs"
                                                            />
                                                            <Textarea
                                                                value={workflow.improvementData.contentStructure.opening.suggestedHook || ''}
                                                                onChange={(e) => setWorkflow(prev => ({
                                                                    ...prev,
                                                                    improvementData: {
                                                                        ...prev.improvementData!,
                                                                        contentStructure: {
                                                                            ...prev.improvementData!.contentStructure,
                                                                            opening: { ...prev.improvementData!.contentStructure.opening, suggestedHook: e.target.value }
                                                                        }
                                                                    }
                                                                }))}
                                                                placeholder="具体的なフック文言"
                                                                className="text-sm min-h-[60px]"
                                                            />
                                                        </div>
                                                    )}
                                                    {workflow.improvementData.contentStructure.preProblem && (
                                                        <div className="border rounded p-3 space-y-2">
                                                            <h5 className="font-semibold text-sm">問題提起</h5>
                                                            <Input
                                                                value={workflow.improvementData.contentStructure.preProblem.commonMisconception || ''}
                                                                onChange={(e) => setWorkflow(prev => ({
                                                                    ...prev,
                                                                    improvementData: {
                                                                        ...prev.improvementData!,
                                                                        contentStructure: {
                                                                            ...prev.improvementData!.contentStructure,
                                                                            preProblem: { ...prev.improvementData!.contentStructure.preProblem, commonMisconception: e.target.value }
                                                                        }
                                                                    }
                                                                }))}
                                                                placeholder="視聴者の誤解"
                                                                className="text-xs"
                                                            />
                                                            <Textarea
                                                                value={workflow.improvementData.contentStructure.preProblem.truthReveal || ''}
                                                                onChange={(e) => setWorkflow(prev => ({
                                                                    ...prev,
                                                                    improvementData: {
                                                                        ...prev.improvementData!,
                                                                        contentStructure: {
                                                                            ...prev.improvementData!.contentStructure,
                                                                            preProblem: { ...prev.improvementData!.contentStructure.preProblem, truthReveal: e.target.value }
                                                                        }
                                                                    }
                                                                }))}
                                                                placeholder="真実・常識を覆す内容"
                                                                className="text-sm min-h-[60px]"
                                                            />
                                                        </div>
                                                    )}
                                                </div>
                                                {workflow.improvementData.contentStructure.mainContent && (
                                                    <div className="border rounded p-3 space-y-2">
                                                        <h5 className="font-semibold text-sm">本編構成</h5>
                                                        <Input
                                                            value={workflow.improvementData.contentStructure.mainContent.structure || ''}
                                                            onChange={(e) => setWorkflow(prev => ({
                                                                ...prev,
                                                                improvementData: {
                                                                    ...prev.improvementData!,
                                                                    contentStructure: {
                                                                        ...prev.improvementData!.contentStructure,
                                                                        mainContent: { ...prev.improvementData!.contentStructure.mainContent, structure: e.target.value }
                                                                    }
                                                                }
                                                            }))}
                                                            placeholder="構成形式（例: ポイント3つ）"
                                                            className="text-xs"
                                                        />
                                                        <Textarea
                                                            value={workflow.improvementData.contentStructure.mainContent.keyPoints?.join('\n') || ''}
                                                            onChange={(e) => setWorkflow(prev => ({
                                                                ...prev,
                                                                improvementData: {
                                                                    ...prev.improvementData!,
                                                                    contentStructure: {
                                                                        ...prev.improvementData!.contentStructure,
                                                                        mainContent: { ...prev.improvementData!.contentStructure.mainContent, keyPoints: e.target.value.split('\n').filter(p => p.trim()) }
                                                                    }
                                                                }
                                                            }))}
                                                            placeholder="キーポイント（1行ずつ）"
                                                            className="text-sm min-h-[80px]"
                                                        />
                                                    </div>
                                                )}
                                                {workflow.improvementData.contentStructure.ending && (
                                                    <div className="border rounded p-3 bg-primary/5 space-y-2">
                                                        <h5 className="font-semibold text-sm">CTA（エンディング）</h5>
                                                        <div className="grid gap-2 md:grid-cols-2">
                                                            <Input
                                                                value={workflow.improvementData.contentStructure.ending.registrationTarget || ''}
                                                                onChange={(e) => setWorkflow(prev => ({
                                                                    ...prev,
                                                                    improvementData: {
                                                                        ...prev.improvementData!,
                                                                        contentStructure: {
                                                                            ...prev.improvementData!.contentStructure,
                                                                            ending: { ...prev.improvementData!.contentStructure.ending, registrationTarget: e.target.value }
                                                                        }
                                                                    }
                                                                }))}
                                                                placeholder="登録先（LINE/チャンネル登録）"
                                                                className="text-sm"
                                                            />
                                                            <Input
                                                                value={workflow.improvementData.contentStructure.ending.registrationBenefit || ''}
                                                                onChange={(e) => setWorkflow(prev => ({
                                                                    ...prev,
                                                                    improvementData: {
                                                                        ...prev.improvementData!,
                                                                        contentStructure: {
                                                                            ...prev.improvementData!.contentStructure,
                                                                            ending: { ...prev.improvementData!.contentStructure.ending, registrationBenefit: e.target.value }
                                                                        }
                                                                    }
                                                                }))}
                                                                placeholder="メリット"
                                                                className="text-sm"
                                                            />
                                                        </div>
                                                        <Textarea
                                                            value={workflow.improvementData.contentStructure.ending.callToAction || ''}
                                                            onChange={(e) => setWorkflow(prev => ({
                                                                ...prev,
                                                                improvementData: {
                                                                    ...prev.improvementData!,
                                                                    contentStructure: {
                                                                        ...prev.improvementData!.contentStructure,
                                                                        ending: { ...prev.improvementData!.contentStructure.ending, callToAction: e.target.value }
                                                                    }
                                                                }
                                                            }))}
                                                            placeholder="CTA文言"
                                                            className="text-sm min-h-[60px]"
                                                        />
                                                    </div>
                                                )}
                                            </CardContent>
                                        </Card>
                                    )}

                                    {/* ギャップ分析 */}
                                    {workflow.improvementData.gapAnalysis && (
                                        <Card>
                                            <CardHeader className="py-3 bg-yellow-50 dark:bg-yellow-900/20 border-b">
                                                <CardTitle className="text-base font-bold">ギャップ分析</CardTitle>
                                            </CardHeader>
                                            <CardContent className="p-4">
                                                <p className="text-sm"><strong>参考動画の課題:</strong> {workflow.improvementData.gapAnalysis.originalVideoIssue || '分析中'}</p>
                                                <p className="text-sm mt-2"><strong>提案する解決策:</strong> {workflow.improvementData.gapAnalysis.proposedSolution || '分析中'}</p>
                                            </CardContent>
                                        </Card>
                                    )}
                                </div>
                            )}

                            {/* 古い形式: Improvements Table Display */}
                            {workflow.improvements.length > 0 && !workflow.improvementData && (
                                <div className="space-y-8">
                                    {["OP", "PASTOR", "プレ本編", "本編", "ED", "全般"].map(section => {
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
