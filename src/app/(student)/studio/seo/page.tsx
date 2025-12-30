"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import {
    Loader2, Copy, Download, ArrowLeft, ArrowRight, Check, Edit3, RefreshCw,
    Search, Globe, Users, Lightbulb, FileText, PenTool
} from "lucide-react";
import {
    SEOWorkflowState,
    SearchIntentAnalysis,
    ArticleStructureAnalysis,
    ReaderAnalysis,
    ImprovementSuggestions,
    ArticleOutline,
    GeneratedArticle,
    Tone,
    TONE_OPTIONS,
    READER_LEVEL_OPTIONS,
    initialSEOState,
} from "@/types/seo-types";

const STEPS = [
    { num: 1, label: "キーワード・参考記事", icon: Search },
    { num: 2, label: "構成分解", icon: FileText },
    { num: 3, label: "読者分析", icon: Users },
    { num: 4, label: "改善点", icon: Lightbulb },
    { num: 5, label: "記事構成", icon: FileText },
    { num: 6, label: "ライティング", icon: PenTool },
];

export default function SEOGeneratorPage() {
    const [state, setState] = useState<SEOWorkflowState>(initialSEOState);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const updateState = (updates: Partial<SEOWorkflowState>) => {
        setState(prev => ({ ...prev, ...updates }));
    };

    // Fetch top articles using Tavily API
    const handleFetchTopArticles = async () => {
        if (!state.primaryKeyword.trim()) {
            setError("メインキーワードを入力してください");
            return;
        }
        setLoading(true);
        setError(null);

        try {
            const response = await fetch("/api/seo/fetch-articles", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ keyword: state.primaryKeyword, count: 3 }),
            });
            const data = await response.json();
            if (data.success) {
                const urls = data.data.map((a: { url: string }) => a.url);
                updateState({ referenceUrls: urls });
            } else {
                setError(data.error || "上位記事の取得に失敗しました");
            }
        } catch (e: unknown) {
            setError(e instanceof Error ? e.message : "上位記事の取得に失敗しました");
        } finally {
            setLoading(false);
        }
    };

    // Step 1: Analyze search intent from reference articles
    const handleAnalyzeSearchIntent = async () => {
        if (!state.primaryKeyword.trim()) {
            setError("メインキーワードを入力してください");
            return;
        }
        setLoading(true);
        setError(null);

        try {
            const mockArticles = state.referenceUrls.map((url, i) => ({
                title: `参考記事${i + 1}`,
                h2List: ["導入", "方法", "メリット", "注意点", "まとめ"],
            }));

            const response = await fetch("/api/seo/search-intent", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    primaryKeyword: state.primaryKeyword,
                    referenceArticles: mockArticles,
                }),
            });
            const data = await response.json();
            if (data.success) {
                updateState({ searchIntentAnalysis: data.data as SearchIntentAnalysis });
            } else {
                setError(data.error || "検索意図の分析に失敗しました");
            }
        } catch (e: unknown) {
            setError(e instanceof Error ? e.message : "検索意図の分析に失敗しました");
        } finally {
            setLoading(false);
        }
    };

    // Confirm Step 1 and move to Step 2
    const handleConfirmStep1 = async () => {
        setLoading(true);
        setError(null);

        try {
            const analyses: ArticleStructureAnalysis[] = [];
            for (const url of state.referenceUrls) {
                const response = await fetch("/api/seo/structure", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        articleTitle: `${state.primaryKeyword}に関する記事`,
                        articleContent: `この記事は${state.primaryKeyword}について解説しています。URL: ${url}`,
                    }),
                });
                const data = await response.json();
                if (data.success) {
                    analyses.push(data.data as ArticleStructureAnalysis);
                }
            }

            updateState({
                step: 2,
                step1Confirmed: true,
                structureAnalyses: analyses,
            });
        } catch (e: unknown) {
            setError(e instanceof Error ? e.message : "構成分解に失敗しました");
        } finally {
            setLoading(false);
        }
    };

    // Confirm Step 2 and move to Step 3
    const handleConfirmStep2 = async () => {
        setLoading(true);
        setError(null);

        try {
            const articleSummary = state.structureAnalyses
                .map(a => a.h2Analyses.map(h => h.h2Text).join(", "))
                .join("\n");

            const response = await fetch("/api/seo/reader", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    primaryKeyword: state.primaryKeyword,
                    articleSummary,
                    searchIntentAnalysis: state.searchIntentAnalysis,
                }),
            });
            const data = await response.json();
            if (data.success) {
                updateState({
                    step: 3,
                    step2Confirmed: true,
                    readerAnalysis: data.data as ReaderAnalysis,
                });
            } else {
                setError(data.error || "読者分析に失敗しました");
            }
        } catch (e: unknown) {
            setError(e instanceof Error ? e.message : "読者分析に失敗しました");
        } finally {
            setLoading(false);
        }
    };

    // Confirm Step 3 and move to Step 4
    const handleConfirmStep3 = async () => {
        setLoading(true);
        setError(null);

        try {
            const response = await fetch("/api/seo/improvements", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    readerAnalysis: state.readerAnalysis,
                    structureAnalyses: state.structureAnalyses,
                }),
            });
            const data = await response.json();
            if (data.success) {
                updateState({
                    step: 4,
                    step3Confirmed: true,
                    improvements: data.data as ImprovementSuggestions,
                    selectedImprovements: {
                        selectedAdditions: [],
                        selectedRemovals: [],
                    },
                });
            } else {
                setError(data.error || "改善点の分析に失敗しました");
            }
        } catch (e: unknown) {
            setError(e instanceof Error ? e.message : "改善点の分析に失敗しました");
        } finally {
            setLoading(false);
        }
    };

    // Toggle improvement selection
    const toggleAddition = (index: number) => {
        const current = state.selectedImprovements?.selectedAdditions || [];
        const newSelection = current.includes(index)
            ? current.filter(i => i !== index)
            : [...current, index];
        updateState({
            selectedImprovements: {
                ...state.selectedImprovements!,
                selectedAdditions: newSelection,
            },
        });
    };

    const toggleRemoval = (index: number) => {
        const current = state.selectedImprovements?.selectedRemovals || [];
        const newSelection = current.includes(index)
            ? current.filter(i => i !== index)
            : [...current, index];
        updateState({
            selectedImprovements: {
                ...state.selectedImprovements!,
                selectedRemovals: newSelection,
            },
        });
    };

    // Confirm Step 4 and move to Step 5
    const handleConfirmStep4 = async () => {
        setLoading(true);
        setError(null);

        try {
            const titleAnalysis = state.structureAnalyses[0]?.titleAnalysis;
            const h2Structure = state.structureAnalyses.flatMap(a => a.h2Analyses);

            const response = await fetch("/api/seo/outline", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    primaryKeyword: state.primaryKeyword,
                    secondaryKeywords: state.secondaryKeywords.split(",").map(k => k.trim()).filter(Boolean),
                    readerAnalysis: state.readerAnalysis,
                    titleAnalysis,
                    h2Structure,
                    selectedImprovements: state.selectedImprovements,
                    improvements: state.improvements,
                    wordCountMin: state.wordCountMin,
                    wordCountMax: state.wordCountMax,
                }),
            });
            const data = await response.json();
            if (data.success) {
                updateState({
                    step: 5,
                    step4Confirmed: true,
                    outline: data.data as ArticleOutline,
                });
            } else {
                setError(data.error || "記事構成の生成に失敗しました");
            }
        } catch (e: unknown) {
            setError(e instanceof Error ? e.message : "記事構成の生成に失敗しました");
        } finally {
            setLoading(false);
        }
    };

    // Select title
    const selectTitle = (index: number) => {
        if (state.outline) {
            updateState({
                outline: { ...state.outline, selectedTitleIndex: index },
            });
        }
    };

    // Confirm Step 5 and move to Step 6
    const handleConfirmStep5 = async () => {
        setLoading(true);
        setError(null);

        try {
            const response = await fetch("/api/seo/draft", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    primaryKeyword: state.primaryKeyword,
                    secondaryKeywords: state.secondaryKeywords.split(",").map(k => k.trim()).filter(Boolean),
                    outline: state.outline,
                    readerAnalysis: state.readerAnalysis,
                    tone: state.tone,
                    wordCountMin: state.wordCountMin,
                    wordCountMax: state.wordCountMax,
                    authorExpertise: state.authorExpertise,
                    ctaLink: state.ctaLink,
                    ctaText: state.ctaText,
                }),
            });
            const data = await response.json();
            if (data.success) {
                updateState({
                    step: 6,
                    step5Confirmed: true,
                    generatedContent: data.data as GeneratedArticle,
                });
            } else {
                setError(data.error || "記事の生成に失敗しました");
            }
        } catch (e: unknown) {
            setError(e instanceof Error ? e.message : "記事の生成に失敗しました");
        } finally {
            setLoading(false);
        }
    };

    const handleCopy = () => {
        if (state.generatedContent?.content) {
            navigator.clipboard.writeText(state.generatedContent.content);
        }
    };

    const handleDownload = () => {
        if (state.generatedContent?.content) {
            const blob = new Blob([state.generatedContent.content], { type: "text/html;charset=utf-8" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `${state.primaryKeyword.replace(/\s+/g, "_")}_article.html`;
            a.click();
            URL.revokeObjectURL(url);
        }
    };

    const handleReset = () => {
        setState(initialSEOState);
        setError(null);
    };

    const goToStep = (step: 1 | 2 | 3 | 4 | 5 | 6) => {
        if (step < state.step) {
            updateState({ step });
        }
    };

    const progress = (state.step / 6) * 100;

    return (
        <div className="max-w-5xl mx-auto space-y-6 p-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold">SEO記事作成エージェント v2</h1>
                    <p className="text-muted-foreground">6段階のワークフローで高品質なSEO記事を作成</p>
                </div>
                {state.step > 1 && (
                    <Button variant="outline" size="sm" onClick={handleReset}>
                        <RefreshCw className="h-4 w-4 mr-2" />
                        やり直す
                    </Button>
                )}
            </div>

            {/* Progress */}
            <div className="space-y-2">
                <div className="flex justify-between text-xs">
                    {STEPS.map((s) => (
                        <button
                            key={s.num}
                            onClick={() => goToStep(s.num as 1 | 2 | 3 | 4 | 5 | 6)}
                            className={`flex flex-col items-center gap-1 ${state.step >= s.num ? "text-primary" : "text-muted-foreground"
                                } ${state.step > s.num ? "cursor-pointer hover:text-primary/80" : "cursor-default"}`}
                            disabled={state.step < s.num}
                        >
                            <s.icon className="h-4 w-4" />
                            <span className="hidden md:inline">{s.label}</span>
                            <span className="md:hidden">{s.num}</span>
                        </button>
                    ))}
                </div>
                <Progress value={progress} className="h-2" />
            </div>

            {/* Error display */}
            {error && (
                <div className="bg-destructive/10 text-destructive p-4 rounded-md">
                    {error}
                </div>
            )}

            {/* Step 1: Keywords & Reference Articles */}
            {state.step === 1 && (
                <div className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Search className="h-5 w-5" />
                                Step 1: キーワードと参考記事の入力
                            </CardTitle>
                            <CardDescription>
                                メインキーワードと参考にする上位記事を設定してください
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid gap-4 md:grid-cols-2">
                                <div className="space-y-2">
                                    <Label>メインキーワード *</Label>
                                    <div className="flex gap-2">
                                        <Input
                                            value={state.primaryKeyword}
                                            onChange={(e) => updateState({ primaryKeyword: e.target.value })}
                                            placeholder="例: Webデザイン 独学 始め方"
                                        />
                                        <Button
                                            variant="outline"
                                            onClick={handleFetchTopArticles}
                                            disabled={loading || !state.primaryKeyword.trim()}
                                        >
                                            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Globe className="h-4 w-4" />}
                                        </Button>
                                    </div>
                                    <p className="text-xs text-muted-foreground">
                                        ボタンをクリックで上位記事を自動取得
                                    </p>
                                </div>
                                <div className="space-y-2">
                                    <Label>サブキーワード（カンマ区切り）</Label>
                                    <Input
                                        value={state.secondaryKeywords}
                                        onChange={(e) => updateState({ secondaryKeywords: e.target.value })}
                                        placeholder="例: 初心者向け, 副業, スキルアップ"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label>参考記事URL（1〜3本）*</Label>
                                {[0, 1, 2].map((i) => (
                                    <Input
                                        key={i}
                                        value={state.referenceUrls[i] || ""}
                                        onChange={(e) => {
                                            const urls = [...state.referenceUrls];
                                            urls[i] = e.target.value;
                                            updateState({ referenceUrls: urls.filter(Boolean) });
                                        }}
                                        placeholder={`参考記事${i + 1}のURL`}
                                    />
                                ))}
                            </div>

                            <div className="grid gap-4 md:grid-cols-2">
                                <div className="space-y-2">
                                    <Label>ターゲット読者</Label>
                                    <Input
                                        value={state.targetAudience}
                                        onChange={(e) => updateState({ targetAudience: e.target.value })}
                                        placeholder="例: 未経験からWebデザイナーを目指す人"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>文体</Label>
                                    <Select
                                        value={state.tone}
                                        onValueChange={(v) => updateState({ tone: v as Tone })}
                                    >
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            {TONE_OPTIONS.map(opt => (
                                                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <div className="grid gap-4 md:grid-cols-2">
                                <div className="space-y-2">
                                    <Label>最小文字数</Label>
                                    <Input
                                        type="number"
                                        value={state.wordCountMin}
                                        onChange={(e) => updateState({ wordCountMin: parseInt(e.target.value) || 3000 })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>最大文字数</Label>
                                    <Input
                                        type="number"
                                        value={state.wordCountMax}
                                        onChange={(e) => updateState({ wordCountMax: parseInt(e.target.value) || 6000 })}
                                    />
                                </div>
                            </div>

                            <div className="grid gap-4 md:grid-cols-2">
                                <div className="space-y-2">
                                    <Label>誘導先リンク（CTA）</Label>
                                    <Input
                                        value={state.ctaLink}
                                        onChange={(e) => updateState({ ctaLink: e.target.value })}
                                        placeholder="https://example.com/your-service"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>CTAボタンテキスト</Label>
                                    <Input
                                        value={state.ctaText}
                                        onChange={(e) => updateState({ ctaText: e.target.value })}
                                        placeholder="無料で始める"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label>著者の専門性（E-E-A-T）</Label>
                                <Textarea
                                    value={state.authorExpertise}
                                    onChange={(e) => updateState({ authorExpertise: e.target.value })}
                                    placeholder="例: 現役Webデザイナー10年、講座受講者300名以上"
                                    rows={2}
                                />
                            </div>

                            {!state.searchIntentAnalysis && (
                                <Button
                                    onClick={handleAnalyzeSearchIntent}
                                    disabled={loading || !state.primaryKeyword.trim()}
                                >
                                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    上位記事から検索意図を分析
                                </Button>
                            )}
                        </CardContent>
                    </Card>

                    {/* Search Intent Result */}
                    {state.searchIntentAnalysis && (
                        <Card className="border-primary">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Check className="h-5 w-5 text-primary" />
                                    検索意図の分析結果
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="grid gap-4 md:grid-cols-2">
                                    <div>
                                        <Label className="text-muted-foreground">検索意図</Label>
                                        <Badge className="mt-1">{state.searchIntentAnalysis.searchIntent}</Badge>
                                    </div>
                                    <div>
                                        <Label className="text-muted-foreground">根拠</Label>
                                        <p className="text-sm">{state.searchIntentAnalysis.evidence}</p>
                                    </div>
                                </div>
                                <div>
                                    <Label className="text-muted-foreground">検索者の状況</Label>
                                    <p className="text-sm">{state.searchIntentAnalysis.searcherSituation}</p>
                                </div>
                                <div>
                                    <Label className="text-muted-foreground">求められている情報</Label>
                                    <ul className="list-disc list-inside text-sm">
                                        {state.searchIntentAnalysis.expectedInformation.map((info, i) => (
                                            <li key={i}>{info}</li>
                                        ))}
                                    </ul>
                                </div>
                                <div>
                                    <Label className="text-muted-foreground">必須トピック</Label>
                                    <div className="flex flex-wrap gap-1 mt-1">
                                        {state.searchIntentAnalysis.requiredTopics.map((topic, i) => (
                                            <Badge key={i} variant="secondary">{topic}</Badge>
                                        ))}
                                    </div>
                                </div>

                                <div className="flex gap-2 pt-4">
                                    <Button onClick={handleConfirmStep1} disabled={loading}>
                                        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                        この分析で進む
                                        <ArrowRight className="ml-2 h-4 w-4" />
                                    </Button>
                                    <Button variant="outline" onClick={() => updateState({ searchIntentAnalysis: null })}>
                                        <Edit3 className="mr-2 h-4 w-4" />
                                        再分析
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </div>
            )}

            {/* Step 2: Structure Analysis */}
            {state.step === 2 && state.structureAnalyses.length > 0 && (
                <div className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <FileText className="h-5 w-5" />
                                Step 2: 参考記事の構成分解（H2ごとの詳細分析）
                            </CardTitle>
                            <CardDescription>
                                この分析で合っていますか？修正があればお知らせください。
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            {state.structureAnalyses.map((analysis, idx) => (
                                <div key={idx} className="border rounded-lg p-4 space-y-4">
                                    <h3 className="font-semibold">参考記事 {idx + 1}</h3>

                                    {/* Title Analysis */}
                                    <div className="bg-muted/50 p-3 rounded">
                                        <Label className="text-muted-foreground">タイトル構成分析</Label>
                                        <div className="text-sm space-y-1 mt-2">
                                            <p><span className="font-medium">文節:</span> {analysis.titleAnalysis.segments.join(" / ")}</p>
                                            <p><span className="font-medium">語順の意図:</span> {analysis.titleAnalysis.wordOrderIntent}</p>
                                            <p><span className="font-medium">惹きつける要素:</span> {analysis.titleAnalysis.attractiveElements}</p>
                                        </div>
                                    </div>

                                    {/* H2 Analyses */}
                                    <div className="space-y-2">
                                        <Label className="text-muted-foreground">H2ごとの詳細分析</Label>
                                        {analysis.h2Analyses.map((h2, h2Idx) => (
                                            <div key={h2Idx} className="border-l-2 border-primary/30 pl-3 text-sm">
                                                <p className="font-medium">{h2.h2Text}</p>
                                                <p className="text-muted-foreground">提供価値: {h2.providedValue}</p>
                                                {h2.h3List.length > 0 && (
                                                    <p className="text-muted-foreground">H3: {h2.h3List.join(", ")}</p>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}

                            <div className="flex gap-2 pt-4">
                                <Button variant="outline" onClick={() => updateState({ step: 1 })}>
                                    <ArrowLeft className="mr-2 h-4 w-4" />
                                    戻る
                                </Button>
                                <Button onClick={handleConfirmStep2} disabled={loading}>
                                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    この分析で進む
                                    <ArrowRight className="ml-2 h-4 w-4" />
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* Step 3: Reader Analysis */}
            {state.step === 3 && state.readerAnalysis && (
                <div className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Users className="h-5 w-5" />
                                Step 3: 想定読者の分析（導入への興味を重視）
                            </CardTitle>
                            <CardDescription>
                                想定読者はこのような方ですね？修正があればお知らせください。
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid gap-4 md:grid-cols-2">
                                <div>
                                    <Label className="text-muted-foreground">レベル感</Label>
                                    <Badge className="mt-1">
                                        {READER_LEVEL_OPTIONS.find(o => o.value === state.readerAnalysis?.level)?.label}
                                    </Badge>
                                    <p className="text-sm text-muted-foreground mt-1">
                                        {state.readerAnalysis.levelEvidence}
                                    </p>
                                </div>
                                <div>
                                    <Label className="text-muted-foreground">ペルソナ像</Label>
                                    <p className="text-sm">
                                        {state.readerAnalysis.persona.ageGroup}・
                                        {state.readerAnalysis.persona.occupation}
                                    </p>
                                    <p className="text-sm text-muted-foreground">
                                        {state.readerAnalysis.persona.situation}
                                    </p>
                                </div>
                            </div>

                            <div>
                                <Label className="text-muted-foreground">悩み・ニーズ</Label>
                                <ul className="list-disc list-inside text-sm">
                                    {state.readerAnalysis.painPoints.map((point, i) => (
                                        <li key={i}>{point}</li>
                                    ))}
                                </ul>
                            </div>

                            <div className="bg-primary/5 p-4 rounded-lg">
                                <Label className="text-primary font-medium">導入に対する興味分析（重視）</Label>
                                <div className="text-sm space-y-2 mt-2">
                                    <p><span className="font-medium">クリック理由:</span> {state.readerAnalysis.introductionInterest.clickReason}</p>
                                    <p><span className="font-medium">興味ポイント:</span> {state.readerAnalysis.introductionInterest.interestPoints.join(", ")}</p>
                                    <p><span className="font-medium">読み続ける要素:</span> {state.readerAnalysis.introductionInterest.continueReadingElements}</p>
                                    <p><span className="font-medium">離脱対策:</span> {state.readerAnalysis.introductionInterest.bounceRiskAndSolution}</p>
                                </div>
                            </div>

                            <div className="flex gap-2 pt-4">
                                <Button variant="outline" onClick={() => updateState({ step: 2 })}>
                                    <ArrowLeft className="mr-2 h-4 w-4" />
                                    戻る
                                </Button>
                                <Button onClick={handleConfirmStep3} disabled={loading}>
                                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    この分析で進む
                                    <ArrowRight className="ml-2 h-4 w-4" />
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* Step 4: Improvements */}
            {state.step === 4 && state.improvements && (
                <div className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Lightbulb className="h-5 w-5" />
                                Step 4: 参考記事の改善点を出力
                            </CardTitle>
                            <CardDescription>
                                以下の改善点を提案します。採用するものにチェックを入れてください。
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div>
                                <Label className="text-lg font-medium text-green-600">【付け加える内容】</Label>
                                <div className="space-y-2 mt-2">
                                    {state.improvements.additions.map((item, i) => (
                                        <div key={i} className="flex items-center space-x-2">
                                            <Checkbox
                                                id={`add-${i}`}
                                                checked={state.selectedImprovements?.selectedAdditions.includes(i)}
                                                onCheckedChange={() => toggleAddition(i)}
                                            />
                                            <label htmlFor={`add-${i}`} className="text-sm cursor-pointer">
                                                {i + 1}. {item}
                                            </label>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <Label className="text-lg font-medium text-orange-600">【削除/改善する内容】</Label>
                                <div className="space-y-2 mt-2">
                                    {state.improvements.removals.map((item, i) => (
                                        <div key={i} className="flex items-center space-x-2">
                                            <Checkbox
                                                id={`rem-${i}`}
                                                checked={state.selectedImprovements?.selectedRemovals.includes(i)}
                                                onCheckedChange={() => toggleRemoval(i)}
                                            />
                                            <label htmlFor={`rem-${i}`} className="text-sm cursor-pointer">
                                                {i + 1}. {item}
                                            </label>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="flex gap-2 pt-4">
                                <Button variant="outline" onClick={() => updateState({ step: 3 })}>
                                    <ArrowLeft className="mr-2 h-4 w-4" />
                                    戻る
                                </Button>
                                <Button onClick={handleConfirmStep4} disabled={loading}>
                                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    選択した改善点で構成を作成
                                    <ArrowRight className="ml-2 h-4 w-4" />
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* Step 5: Outline */}
            {state.step === 5 && state.outline && (
                <div className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <FileText className="h-5 w-5" />
                                Step 5: 記事構成の作成（参考記事の構成に沿う）
                            </CardTitle>
                            <CardDescription>
                                マーケットイン：参考記事の構成・語順に沿って作成しました。タイトルを選択してください。
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            {/* Title Selection */}
                            <div>
                                <Label className="text-lg font-medium">タイトル案（3パターン）</Label>
                                <div className="space-y-2 mt-2">
                                    {state.outline.titleCandidates.map((candidate, i) => (
                                        <div
                                            key={i}
                                            className={`p-3 border rounded-lg cursor-pointer transition-colors ${state.outline?.selectedTitleIndex === i
                                                ? "border-primary bg-primary/5"
                                                : "hover:border-primary/50"
                                                }`}
                                            onClick={() => selectTitle(i)}
                                        >
                                            <div className="flex items-start gap-2">
                                                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 ${state.outline?.selectedTitleIndex === i
                                                    ? "border-primary bg-primary text-primary-foreground"
                                                    : "border-muted-foreground"
                                                    }`}>
                                                    {state.outline?.selectedTitleIndex === i && <Check className="h-3 w-3" />}
                                                </div>
                                                <div>
                                                    <p className="font-medium">{candidate.title}</p>
                                                    <p className="text-xs text-muted-foreground">
                                                        参考: {candidate.referenceElement} / {candidate.wordOrderIntent}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Outline Sections */}
                            <div className="bg-muted/50 p-4 rounded-lg">
                                <Label className="text-lg font-medium">見出し構成</Label>
                                <div className="space-y-3 mt-3">
                                    {state.outline.sections.map((section, i) => (
                                        <div key={i} className="border-l-2 border-primary pl-3">
                                            <div className="flex items-center gap-2">
                                                <Badge variant="secondary">{i + 1}</Badge>
                                                <span className="font-medium">{section.h2}</span>
                                                <span className="text-xs text-muted-foreground">
                                                    ({section.estimatedWordCount}文字)
                                                </span>
                                            </div>
                                            <ul className="list-disc list-inside text-sm text-muted-foreground ml-4 mt-1">
                                                {section.h3List.map((h3, j) => (
                                                    <li key={j}>{h3}</li>
                                                ))}
                                            </ul>
                                            <p className="text-xs text-muted-foreground ml-4 mt-1">
                                                概要: {section.sectionSummary}
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <Label className="text-muted-foreground">メタディスクリプション</Label>
                                <p className="text-sm bg-muted/50 p-2 rounded mt-1">
                                    {state.outline.metaDescription}
                                </p>
                            </div>

                            <div className="flex gap-2 pt-4">
                                <Button variant="outline" onClick={() => updateState({ step: 4 })}>
                                    <ArrowLeft className="mr-2 h-4 w-4" />
                                    戻る
                                </Button>
                                <Button onClick={handleConfirmStep5} disabled={loading}>
                                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    この構成で記事を生成
                                    <ArrowRight className="ml-2 h-4 w-4" />
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* Step 6: Generated Content */}
            {state.step === 6 && state.generatedContent && (
                <div className="space-y-4">
                    <Card>
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <div>
                                    <CardTitle className="flex items-center gap-2">
                                        <PenTool className="h-5 w-5 text-green-500" />
                                        Step 6: 記事のライティング完成！
                                    </CardTitle>
                                    <CardDescription>
                                        約{state.generatedContent.wordCount}文字 | {state.generatedContent.metaTitle}
                                    </CardDescription>
                                </div>
                                <div className="flex gap-2">
                                    <Button variant="outline" size="sm" onClick={handleCopy}>
                                        <Copy className="h-4 w-4 mr-1" />
                                        コピー
                                    </Button>
                                    <Button variant="outline" size="sm" onClick={handleDownload}>
                                        <Download className="h-4 w-4 mr-1" />
                                        ダウンロード
                                    </Button>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="p-3 bg-muted/50 rounded-lg">
                                <Label className="text-xs text-muted-foreground">Meta Title</Label>
                                <p className="font-medium">{state.generatedContent.metaTitle}</p>
                            </div>
                            <div className="p-3 bg-muted/50 rounded-lg">
                                <Label className="text-xs text-muted-foreground">Meta Description</Label>
                                <p className="text-sm">{state.generatedContent.metaDescription}</p>
                            </div>

                            {state.generatedContent.faqs && state.generatedContent.faqs.length > 0 && (
                                <div className="p-3 bg-muted/50 rounded-lg">
                                    <Label className="text-xs text-muted-foreground">FAQ</Label>
                                    <div className="space-y-2 mt-2">
                                        {state.generatedContent.faqs.map((faq, i) => (
                                            <div key={i} className="text-sm">
                                                <p className="font-medium">Q: {faq.question}</p>
                                                <p className="text-muted-foreground">A: {faq.answer}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <Textarea
                                className="min-h-[500px] font-mono text-sm"
                                value={state.generatedContent.content}
                                onChange={(e) => updateState({
                                    generatedContent: { ...state.generatedContent!, content: e.target.value }
                                })}
                            />

                            <div className="flex gap-2 pt-4">
                                <Button variant="outline" onClick={() => updateState({ step: 5 })}>
                                    <ArrowLeft className="mr-2 h-4 w-4" />
                                    構成に戻る
                                </Button>
                                <Button variant="outline" onClick={handleConfirmStep5} disabled={loading}>
                                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    <RefreshCw className="mr-2 h-4 w-4" />
                                    再生成
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}
        </div>
    );
}
