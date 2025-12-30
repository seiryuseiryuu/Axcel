"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ChannelSelector } from "@/components/features/studio/ChannelSelector";
import { ChannelInput, ChannelThumbnail } from "@/types/thumbnail";
import { analyzePatterns, generateModelImages, generateFinalThumbnails, PatternCategory, ModelImageInfo, PatternAnalysisResult } from "@/app/actions/thumbnail";
import {
    ArrowRight, ArrowLeft, Check, Loader2, Sparkles, RefreshCw,
    Download, Type, Camera, Eye, Wand2, Youtube, Code, ChevronDown, ChevronUp, Package
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ThumbnailWorkflowProps {
    onPromptGenerated: (prompt: string) => void;
    onError: (msg: string) => void;
}

interface WorkflowState {
    step: number;
    videoTitle: string;
    videoDescription: string;
    selectedThumbnails: ChannelThumbnail[];
    patternAnalysis: PatternAnalysisResult | null;
    modelImages: ModelImageInfo[];
    selectedModelIndex: number | null;
    text: string;
    generatedImages: string[];
    logs: string[];
}

const STEPS = [
    { num: 1, title: "タイトル入力", icon: Type },
    { num: 2, title: "チャンネル選択", icon: Youtube },
    { num: 3, title: "パターン分析", icon: Eye },
    { num: 4, title: "モデル選択", icon: Sparkles },
    { num: 5, title: "素材・文言", icon: Camera },
    { num: 6, title: "AI生成", icon: Wand2 },
];

export function ThumbnailWorkflow({ onPromptGenerated, onError }: ThumbnailWorkflowProps) {
    const { toast } = useToast();
    const [isPending, startTransition] = useTransition();
    const [isLogsOpen, setIsLogsOpen] = useState(false);

    // Workflow State
    const [workflow, setWorkflow] = useState<WorkflowState>({
        step: 1,
        videoTitle: "",
        videoDescription: "",
        selectedThumbnails: [],
        patternAnalysis: null,
        modelImages: [],
        selectedModelIndex: null,
        text: "",
        generatedImages: [],
        logs: [],
    });

    // Channel State
    const [ownChannel, setOwnChannel] = useState<ChannelInput>({
        id: 'own', url: '', name: '', type: 'own', thumbnails: [], isLoading: false
    });
    const [competitors, setCompetitors] = useState<ChannelInput[]>([
        { id: 'comp-1', url: '', name: '', type: 'competitor', thumbnails: [], isLoading: false }
    ]);

    // Actions
    const goToStep = (step: number) => setWorkflow(prev => ({ ...prev, step }));

    const handleThumbnailSelect = (thumb: ChannelThumbnail) => {
        setWorkflow(prev => {
            const exists = prev.selectedThumbnails.find(t => t.id === thumb.id);
            if (exists) return { ...prev, selectedThumbnails: prev.selectedThumbnails.filter(t => t.id !== thumb.id) };
            if (prev.selectedThumbnails.length >= 10) return prev;
            return { ...prev, selectedThumbnails: [...prev.selectedThumbnails, thumb] };
        });
    };

    const runAnalysis = () => {
        if (workflow.selectedThumbnails.length < 3) {
            toast({ title: "エラー", description: "少なくとも3枚選択してください", variant: "destructive" });
            return;
        }

        startTransition(async () => {
            setWorkflow(prev => ({ ...prev, logs: ["開始: 分析プロセスを起動中..."] }));
            const urls = workflow.selectedThumbnails.map(t => t.thumbnail_url);
            const titles = workflow.selectedThumbnails.map(t => t.video_title);

            const res = await analyzePatterns(urls, titles);

            if (res.logs) setWorkflow(prev => ({ ...prev, logs: [...prev.logs, ...res.logs!] }));

            if (res.error) {
                onError(res.error);
                toast({ title: "分析失敗", description: res.error, variant: "destructive" });
            } else if (res.data) {
                setWorkflow(prev => ({ ...prev, patternAnalysis: res.data!, step: 4 }));

                // Auto-generate model images with reference thumbnails
                const modelRes = await generateModelImages(
                    res.data.patterns,
                    workflow.videoTitle,
                    workflow.videoDescription,
                    urls, // Pass all selected thumbnail URLs for reference
                    workflow.text // Pass input text for model generation
                );

                if (modelRes.logs) setWorkflow(prev => ({ ...prev, logs: [...prev.logs, ...modelRes.logs!] }));

                if (modelRes.error) {
                    toast({ title: "画像生成警告", description: "一部のモデル画像生成に失敗しました: " + modelRes.error, variant: "destructive" });
                    // Still stay on step 4 to show patterns, but maybe no images?
                } else if (modelRes.data) {
                    setWorkflow(prev => ({ ...prev, modelImages: modelRes.data! }));
                }

                toast({ title: "分析完了", description: `${res.data.patterns.length}パターンを検出` });
            }
        });
    };

    const selectModel = (index: number) => {
        setWorkflow(prev => ({ ...prev, selectedModelIndex: index }));
    };

    const generateFinal = () => {
        if (!workflow.text.trim()) {
            toast({ title: "エラー", description: "サムネイルに表示する文言（テロップ）を入力してください", variant: "destructive" });
            return;
        }

        startTransition(async () => {
            const selectedModel = workflow.selectedModelIndex !== null
                ? workflow.modelImages[workflow.selectedModelIndex]
                : null;

            // Get pattern data for text styling
            const patternData = workflow.selectedModelIndex !== null && workflow.patternAnalysis
                ? workflow.patternAnalysis.patterns[workflow.selectedModelIndex]
                : undefined;

            // Get reference URLs from selected pattern's example images
            const exampleIndices = patternData?.exampleImageIndices || [];
            const referenceUrls = exampleIndices
                .map(idx => workflow.selectedThumbnails[idx - 1]?.thumbnail_url)
                .filter(Boolean)
                .slice(0, 2);

            const res = await generateFinalThumbnails(
                selectedModel,
                workflow.text,
                workflow.videoTitle,
                3,
                patternData,
                referenceUrls
            );

            if (res.error) {
                onError(res.error);
                toast({ title: "生成エラー", description: res.error, variant: "destructive" });
            } else if (res.data) {
                setWorkflow(prev => ({ ...prev, generatedImages: res.data!, step: 6 }));
                toast({ title: "生成完了", description: `${res.data.length}枚のサムネイルを生成` });
            }
        });
    };

    const reset = () => {
        setWorkflow({
            step: 1,
            videoTitle: "",
            videoDescription: "",
            selectedThumbnails: [],
            patternAnalysis: null,
            modelImages: [],
            selectedModelIndex: null,
            text: "",
            generatedImages: [],
            logs: [],
        });
        setOwnChannel({ id: 'own', url: '', name: '', type: 'own', thumbnails: [], isLoading: false });
        setCompetitors([{ id: 'comp-1', url: '', name: '', type: 'competitor', thumbnails: [], isLoading: false }]);
    };

    const selectedModel = workflow.selectedModelIndex !== null
        ? workflow.modelImages[workflow.selectedModelIndex]
        : null;

    return (
        <div className="space-y-6">
            {/* Logic Logs Section */}
            {workflow.logs.length > 0 && (
                <Card className="mb-4 bg-muted/50">
                    <div
                        className="p-4 flex items-center justify-between cursor-pointer hover:bg-muted/80 transition-colors"
                        onClick={() => setIsLogsOpen(!isLogsOpen)}
                    >
                        <div className="flex items-center gap-2">
                            <Code className="w-4 h-4 text-muted-foreground" />
                            <span className="text-sm font-medium text-muted-foreground">AI思考ロジック・生成ログ</span>
                            <Badge variant="outline" className="text-xs">{workflow.logs.length}件</Badge>
                        </div>
                        {isLogsOpen ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                    </div>
                    {isLogsOpen && (
                        <CardContent className="pt-0 pb-4 px-4">
                            <div className="bg-black/90 rounded-md p-4 font-mono text-xs text-green-400 overflow-x-auto max-h-[300px] overflow-y-auto whitespace-pre-wrap">
                                {workflow.logs.map((log, i) => (
                                    <div key={i} className="mb-1 border-b border-green-900/30 pb-1 last:border-0">
                                        <span className="opacity-50 select-none mr-2">[{i + 1}]</span>
                                        {log}
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    )}
                </Card>
            )}

            {/* Progress Bar - Matched with ScriptWorkflow */}
            <div className="flex items-center justify-between bg-muted/30 rounded-lg p-4 overflow-x-auto">
                {STEPS.map((s, i) => (
                    <div key={s.num} className="flex items-center">
                        <button
                            onClick={() => goToStep(s.num)}
                            disabled={s.num > workflow.step && !workflow.generatedImages.length}
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

            {/* Step 1: Video Title & Text */}
            {workflow.step === 1 && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Type className="w-5 h-5" />
                            Step 1: 動画タイトル・サムネイル文言を入力
                        </CardTitle>
                        <CardDescription>サムネイルを作成したい動画の情報と、サムネイルに入れたい文言を入力してください</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-foreground">動画タイトル <span className="text-red-500">*</span></label>
                            <Input
                                value={workflow.videoTitle}
                                onChange={(e) => setWorkflow(prev => ({ ...prev, videoTitle: e.target.value }))}
                                placeholder="例：【衝撃】〇〇を試したら驚きの結果に..."
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-foreground">サムネイル文言（テロップ） <span className="text-red-500">*</span></label>
                            <Textarea
                                value={workflow.text}
                                onChange={(e) => setWorkflow(prev => ({ ...prev, text: e.target.value }))}
                                placeholder="例：衝撃、必見、〇〇の結果...（画像生成時に使用されます）"
                                className="min-h-[80px] resize-none"
                            />
                            <p className="text-xs text-muted-foreground">※ここで入力した文言がStep 3のモデル画像生成時に反映されます</p>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-muted-foreground">動画の概要（任意）</label>
                            <Textarea
                                value={workflow.videoDescription}
                                onChange={(e) => setWorkflow(prev => ({ ...prev, videoDescription: e.target.value }))}
                                placeholder="動画の内容を簡単に説明..."
                                className="min-h-[100px] resize-none"
                            />
                        </div>
                        <div className="flex justify-end pt-2">
                            <Button
                                onClick={() => goToStep(2)}
                                disabled={!workflow.videoTitle.trim() || !workflow.text.trim()}
                            >
                                次へ <ArrowRight className="w-4 h-4 ml-2" />
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Step 2: Channel Selection */}
            {workflow.step === 2 && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Youtube className="w-5 h-5" />
                            Step 2: チャンネル選択 & サムネイル選択
                        </CardTitle>
                        <CardDescription>参考にしたいチャンネルのサムネイルを3枚以上選択してください</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <ChannelSelector
                            channels={[ownChannel, ...competitors]}
                            onAddChannel={() => setCompetitors(p => [...p, {
                                id: `comp-${p.length + 1}`, url: '', name: '', type: 'competitor', thumbnails: [], isLoading: false
                            }])}
                            onRemoveChannel={(id) => setCompetitors(p => p.filter(c => c.id !== id))}
                            onUpdateChannel={(id, data) => {
                                if (id === 'own') setOwnChannel(p => ({ ...p, ...data }));
                                else setCompetitors(p => p.map(c => c.id === id ? { ...c, ...data } : c));
                            }}
                            onSelectThumbnail={handleThumbnailSelect}
                            selectedThumbnails={workflow.selectedThumbnails}
                        />

                        <div className="pt-6 border-t flex items-center justify-between">
                            <p className="text-sm font-medium text-muted-foreground">
                                選択中: <Badge variant="secondary" className="ml-2 font-bold">{workflow.selectedThumbnails.length}枚</Badge>
                            </p>
                            <div className="flex gap-3">
                                <Button variant="ghost" onClick={() => goToStep(1)}>
                                    <ArrowLeft className="w-4 h-4 mr-2" /> 戻る
                                </Button>
                                <Button
                                    onClick={runAnalysis}
                                    disabled={isPending || workflow.selectedThumbnails.length < 3}
                                >
                                    {isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Eye className="w-4 h-4 mr-2" />}
                                    パターン分析
                                </Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Step 4: Model Selection */}
            {workflow.step === 4 && workflow.patternAnalysis && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Sparkles className="w-5 h-5" />
                            Step 4: モデル画像を選択
                        </CardTitle>
                        <CardDescription className="text-base">
                            {workflow.patternAnalysis.summary}
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {isPending && workflow.modelImages.length === 0 && (
                            <div className="flex flex-col items-center justify-center py-12 space-y-4">
                                <Loader2 className="w-10 h-10 animate-spin text-muted-foreground" />
                                <span className="text-muted-foreground font-medium">AIが最適な構図を生成中...</span>
                            </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {workflow.modelImages.map((model, i) => (
                                <Card
                                    key={i}
                                    className={`cursor-pointer transition-all duration-300 hover:shadow-lg border-2 overflow-hidden ${workflow.selectedModelIndex === i
                                        ? 'border-primary bg-primary/5 shadow-md'
                                        : 'border-transparent hover:border-border/80 bg-muted/40'
                                        }`}
                                    onClick={() => selectModel(i)}
                                >
                                    <div className="relative aspect-video bg-muted/30">
                                        <img
                                            src={model.imageUrl}
                                            alt={model.patternName}
                                            className="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
                                            onError={(e) => {
                                                (e.target as HTMLImageElement).style.display = 'none';
                                            }}
                                        />
                                        <div className="absolute top-2 left-2">
                                            <Badge variant="secondary" className="backdrop-blur-md bg-white/80 dark:bg-black/50 shadow-sm border-0">
                                                {model.patternName}
                                            </Badge>
                                        </div>
                                        {workflow.selectedModelIndex === i && (
                                            <div className="absolute top-2 right-2 bg-primary text-primary-foreground rounded-full p-1 shadow-lg animate-in zoom-in">
                                                <Check className="w-4 h-4" />
                                            </div>
                                        )}
                                    </div>
                                    <CardContent className="p-4 space-y-3">
                                        <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
                                            {model.description}
                                        </p>

                                        {/* Logic Tags */}
                                        {(() => {
                                            const pattern = workflow.patternAnalysis?.patterns.find(p => p.name === model.patternName);
                                            if (!pattern) return null;
                                            return (
                                                <div className="flex flex-wrap gap-1 mt-2">
                                                    {pattern.characteristics.sentiment && (
                                                        <Badge variant="secondary" className="text-[10px] px-1.5 h-5 bg-blue-500/10 text-blue-500 hover:bg-blue-500/20">
                                                            {pattern.characteristics.sentiment}
                                                        </Badge>
                                                    )}
                                                    <Badge variant="outline" className="text-[10px] px-1.5 h-5 text-muted-foreground">
                                                        {pattern.characteristics.textPosition}
                                                    </Badge>
                                                    {pattern.characteristics.subjectType !== 'none' && (
                                                        <Badge variant="outline" className="text-[10px] px-1.5 h-5 text-muted-foreground">
                                                            {pattern.characteristics.subjectType === 'real_person' ? '人物' : 'イラスト'}
                                                        </Badge>
                                                    )}
                                                </div>
                                            );
                                        })()}

                                        {/* Suggested Texts */}
                                        <div className="flex flex-wrap gap-1.5">
                                            {model.suggestedTexts.slice(0, 3).map((s, j) => (
                                                <Badge
                                                    key={j}
                                                    variant="outline"
                                                    className="cursor-pointer hover:bg-muted transition-colors py-0.5"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setWorkflow(prev => ({ ...prev, text: s.text }));
                                                    }}
                                                >
                                                    {s.text}
                                                </Badge>
                                            ))}
                                        </div>

                                        {/* Required Materials */}
                                        {workflow.patternAnalysis?.patterns[i]?.requiredMaterials && (
                                            <div className="pt-2 border-t border-border/30">
                                                <p className="text-xs font-semibold text-muted-foreground mb-1.5 flex items-center">
                                                    <Package className="w-3 h-3 mr-1" /> 必要素材
                                                </p>
                                                <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-xs text-muted-foreground">
                                                    <span className="truncate">• 背景: {workflow.patternAnalysis.patterns[i].requiredMaterials?.background || '未指定'}</span>
                                                    <span className="truncate">• 人物: {workflow.patternAnalysis.patterns[i].requiredMaterials?.person || '未指定'}</span>
                                                </div>
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>
                            ))}
                        </div>

                        <div className="pt-6 border-t flex items-center justify-between">
                            <Button variant="ghost" onClick={() => goToStep(2)}>
                                <ArrowLeft className="w-4 h-4 mr-2" /> 戻る
                            </Button>
                            <Button
                                onClick={() => goToStep(5)}
                                disabled={workflow.selectedModelIndex === null}
                            >
                                次へ <ArrowRight className="w-4 h-4 ml-2" />
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Step 5: Text & Materials */}
            {workflow.step === 5 && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Camera className="w-5 h-5" />
                            Step 5: テキスト・素材を指定
                        </CardTitle>
                        <CardDescription>サムネイルに表示するテキストは非常に重要です。「クリックしたくなる」言葉を選びましょう</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {/* Selected Model Preview */}
                        {selectedModel && (
                            <div className="flex gap-4 p-4 bg-muted/30 rounded-xl border">
                                <div className="w-32 aspect-video rounded-lg overflow-hidden shrink-0 bg-muted">
                                    <img src={selectedModel.imageUrl} className="w-full h-full object-cover opacity-80" />
                                </div>
                                <div className="space-y-1">
                                    <p className="text-sm font-bold text-foreground">選択パターン: {selectedModel.patternName}</p>
                                    <p className="text-xs text-muted-foreground line-clamp-2">{selectedModel.description}</p>
                                </div>
                            </div>
                        )}

                        <div className="space-y-3">
                            <label className="text-sm font-semibold text-foreground">サムネイル文言（テロップ）</label>
                            <Textarea
                                value={workflow.text}
                                onChange={(e) => setWorkflow(prev => ({ ...prev, text: e.target.value }))}
                                placeholder="例：衝撃、必見、〇〇を試したら驚きの結果に... など自由に入力"
                                className="min-h-[120px] text-lg font-medium resize-y"
                            />
                            <p className="text-xs text-muted-foreground flex items-center justify-between">
                                <span>💡 インパクトのある短い言葉が効果的です</span>
                                <span>{workflow.text.length}文字</span>
                            </p>
                        </div>

                        {/* Quick Text Suggestions */}
                        {selectedModel && selectedModel.suggestedTexts.length > 0 && (
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-muted-foreground">AIからの提案</label>
                                <div className="flex flex-wrap gap-2">
                                    {selectedModel.suggestedTexts.map((s, i) => (
                                        <Button
                                            key={i}
                                            variant="outline"
                                            size="sm"
                                            className="hover:bg-muted"
                                            onClick={() => setWorkflow(prev => ({ ...prev, text: s.text }))}
                                        >
                                            <Sparkles className="w-3 h-3 mr-1.5 opacity-70" />
                                            {s.text}
                                        </Button>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div className="pt-6 border-t flex items-center justify-between">
                            <Button variant="ghost" onClick={() => goToStep(4)}>
                                <ArrowLeft className="w-4 h-4 mr-2" /> 戻る
                            </Button>
                            <Button
                                onClick={generateFinal}
                                disabled={isPending}
                            >
                                {isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Wand2 className="w-4 h-4 mr-2" />}
                                サムネイル生成を実行
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Step 6: Results */}
            {workflow.step === 6 && (
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                        <div>
                            <CardTitle className="flex items-center gap-2">
                                <Wand2 className="w-5 h-5" />
                                生成結果
                            </CardTitle>
                            <CardDescription>{workflow.generatedImages.length}枚のサムネイルを生成しました</CardDescription>
                        </div>
                        <Button variant="outline" size="sm" onClick={reset}>
                            <RefreshCw className="w-4 h-4 mr-2" /> 新規作成
                        </Button>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {workflow.generatedImages.map((url, i) => (
                                <div key={i} className="relative group rounded-xl overflow-hidden shadow-md hover:shadow-xl transition-all duration-300 ring-1 ring-border/50">
                                    <div className="aspect-video bg-muted">
                                        <img
                                            src={url}
                                            alt={`サムネイル バリエーション ${i + 1}`}
                                            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                                            onError={(e) => {
                                                const target = e.target as HTMLImageElement;
                                                target.style.display = 'none';
                                                target.parentElement!.innerHTML = '<div class="flex items-center justify-center h-full flex-col gap-2"><span class="text-xs text-muted-foreground">画像読み込みエラー</span></div>';
                                            }}
                                        />
                                    </div>
                                    <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex justify-end gap-2">
                                        <Button
                                            size="sm"
                                            variant="secondary"
                                            className="h-8 text-xs backdrop-blur-md bg-white/20 hover:bg-white/40 text-white border-none"
                                            onClick={() => {
                                                const a = document.createElement('a');
                                                a.href = url;
                                                a.download = `thumbnail-${i + 1}.png`;
                                                a.click();
                                                toast({ title: "ダウンロード開始", description: "間もなく保存されます" });
                                            }}
                                        >
                                            <Download className="w-3 h-3 mr-1" /> 保存
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="mt-8 pt-6 border-t border-border/40">
                            <div className="flex items-center justify-center p-6 bg-muted/20 rounded-xl border border-dashed border-border">
                                <div className="text-center space-y-2">
                                    <h3 className="font-semibold text-foreground">気に入ったものはありましたか？</h3>
                                    <p className="text-sm text-muted-foreground">
                                        微調整したい場合は、テキストを変更して再生成できます
                                    </p>
                                    <Button variant="outline" onClick={() => goToStep(5)} className="mt-2">
                                        <ArrowLeft className="w-4 h-4 mr-2" /> テキストを変更して再生成
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
