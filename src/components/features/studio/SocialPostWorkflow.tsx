"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Copy, Sparkles, ArrowRight, ArrowLeft, CheckCircle2, MessageSquare, Repeat, RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { analyzePostStructure, analyzeAccountTone, generateSocialPosts } from "@/app/actions/socialPost";
import { MarkdownRenderer } from "@/components/ui/markdown-renderer";
import { saveCreation } from "@/app/actions/history";
import { RefinementArea } from "@/components/features/studio/RefinementArea";

// Steps Enum
const STEPS = {
    REFERENCE: 1,
    ANALYSIS: 2,
    TONE: 3,
    THEME: 4,
    RESULT: 5
};

export function SocialPostWorkflow() {
    const { toast } = useToast();
    const [step, setStep] = useState(STEPS.REFERENCE);
    const [isPending, startTransition] = useTransition();

    // Data State
    const [platform, setPlatform] = useState<"x" | "threads">("x");
    const [referenceContent, setReferenceContent] = useState("");

    // Analysis Result
    const [structureData, setStructureData] = useState<any>(null);

    // Tone State
    const [accountUrl, setAccountUrl] = useState("");
    const [samplePostsText, setSamplePostsText] = useState("");
    const [toneMethod, setToneMethod] = useState<"url" | "text">("text"); // Default to text for reliability
    const [toneData, setToneData] = useState<any>(null);

    // Theme State
    const [theme, setTheme] = useState("");

    // Final Result
    const [generatedPosts, setGeneratedPosts] = useState<any[]>([]);
    const [selectedPostIndex, setSelectedPostIndex] = useState<number | null>(null);

    // Handlers
    const handleAnalyzeStructure = () => {
        if (!referenceContent.trim()) {
            toast({ title: "エラー", description: "参考投稿を入力してください", variant: "destructive" });
            return;
        }

        startTransition(async () => {
            const result = await analyzePostStructure(referenceContent, platform);
            if (result.success && result.data) {
                setStructureData(result.data);
                setStep(STEPS.ANALYSIS);
                toast({ title: "分析完了", description: "投稿の構造化に成功しました" });
            } else {
                toast({ title: "エラー", description: result.error || "分析に失敗しました", variant: "destructive" });
            }
        });
    };

    const handleAnalyzeTone = () => {
        const textToAnalyze = toneMethod === "text" ? samplePostsText : "";

        if (toneMethod === "text" && !textToAnalyze.trim()) {
            toast({ title: "エラー", description: "過去の投稿テキストを入力してください", variant: "destructive" });
            return;
        }

        // Simulating URL fetch failure or using text
        let samples: string[] = [];
        if (toneMethod === "text") {
            samples = [textToAnalyze];
        } else {
            // TODO: Implement URL fetching via Tavily or similar in server action
            toast({ title: "未実装", description: "URLからの自動取得は現在調整中です。テキスト入力を利用してください。" });
            return;
        }

        startTransition(async () => {
            const result = await analyzeAccountTone(samples);
            if (result.success && result.data) {
                setToneData(result.data);
                setStep(STEPS.THEME);
                toast({ title: "トーン分析完了", description: "アカウントのトーンを抽出しました" });
            } else {
                toast({ title: "エラー", description: result.error || "トーン分析に失敗しました", variant: "destructive" });
            }
        });
    };

    const handleGenerate = () => {
        if (!theme.trim()) {
            toast({ title: "エラー", description: "テーマを入力してください", variant: "destructive" });
            return;
        }

        startTransition(async () => {
            const result = await generateSocialPosts(structureData, toneData, theme, platform);
            if (result.success && result.data) {
                setGeneratedPosts(result.data);
                setStep(STEPS.RESULT);
                toast({ title: "生成完了", description: "3パターンの投稿を作成しました" });

                // Save to History with generation context
                try {
                    const contentText = result.data.map((p: any) => `【${p.type || 'パターン'}】\n${p.content}\n\n`).join("---\n\n");
                    await saveCreation(
                        `${platform === 'x' ? 'X投稿' : 'Threads投稿'}: ${theme.slice(0, 30)}...`,
                        'mixed',
                        { finalScript: contentText, theme, platform }
                    );
                } catch (e) {
                    console.error("Failed to save history", e);
                }
            } else {
                toast({ title: "エラー", description: result.error || "生成に失敗しました", variant: "destructive" });
            }
        });
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        toast({ title: "コピーしました", duration: 1500 });
    };

    const resetFlow = () => {
        if (confirm("入力内容をリセットして最初に戻りますか？")) {
            setStep(STEPS.REFERENCE);
            setReferenceContent("");
            setStructureData(null);
            setToneData(null);
            setTheme("");
            setGeneratedPosts([]);
            setSelectedPostIndex(null);
        }
    };

    return (
        <div className="max-w-4xl mx-auto space-y-8 pb-20">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold flex items-center gap-2">
                        {platform === "x" ? <Repeat className="w-8 h-8" /> : <div className="w-8 h-8 rounded-full border-2 border-current flex items-center justify-center font-serif italic font-bold">@</div>}
                        X・Threads投稿作成ツール
                    </h1>
                    <p className="text-muted-foreground mt-2">
                        バズポストの構造を分解・再構築するプロフェッショナルツール
                    </p>
                </div>
                <Button variant="outline" size="sm" onClick={resetFlow} className="gap-2">
                    <RefreshCw className="w-4 h-4" />
                    リセット
                </Button>
            </div>

            {/* Progress Steps */}
            <div className="flex items-center justify-between mb-8 px-4 relative">
                <div className="absolute left-0 top-1/2 w-full h-0.5 bg-muted -z-10" />
                {[
                    { s: STEPS.REFERENCE, label: "参考投稿" },
                    { s: STEPS.ANALYSIS, label: "構造分析" },
                    { s: STEPS.TONE, label: "トーン" },
                    { s: STEPS.THEME, label: "テーマ" },
                    { s: STEPS.RESULT, label: "生成結果" }
                ].map((item) => (
                    <div key={item.s} className={`flex flex-col items-center gap-2 bg-background px-2 ${step >= item.s ? "text-primary" : "text-muted-foreground"}`}>
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all ${step >= item.s ? "border-primary bg-primary text-primary-foreground" : "border-muted"
                            }`}>
                            {step > item.s ? <CheckCircle2 className="w-5 h-5" /> : item.s}
                        </div>
                        <span className="text-xs font-semibold">{item.label}</span>
                    </div>
                ))}
            </div>

            {/* STEP 1: REFERENCE */}
            {step === STEPS.REFERENCE && (
                <Card className="animate-in fade-in slide-in-from-bottom-4">
                    <CardHeader>
                        <CardTitle>STEP 1: 参考投稿の入力</CardTitle>
                        <CardDescription>
                            それでは、参考にしたいバズポストを入力してください。
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="space-y-4">
                            <div className="flex gap-4">
                                <Button
                                    variant={platform === "x" ? "default" : "outline"}
                                    onClick={() => setPlatform("x")}
                                    className="flex-1"
                                >
                                    X (旧Twitter)
                                </Button>
                                <Button
                                    variant={platform === "threads" ? "default" : "outline"}
                                    onClick={() => setPlatform("threads")}
                                    className="flex-1"
                                >
                                    Threads
                                </Button>
                            </div>

                            <div className="space-y-2">
                                <Label>参考にする投稿の文章</Label>
                                <Textarea
                                    placeholder="ここにバズった投稿のテキストを貼り付けてください..."
                                    className="min-h-[200px]"
                                    value={referenceContent}
                                    onChange={(e) => setReferenceContent(e.target.value)}
                                />
                                <p className="text-xs text-muted-foreground text-right">{referenceContent.length}文字</p>
                            </div>
                        </div>
                    </CardContent>
                    <CardFooter>
                        <Button className="w-full" onClick={handleAnalyzeStructure} disabled={isPending || !referenceContent.trim()}>
                            {isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
                            構造を分析する
                        </Button>
                    </CardFooter>
                </Card>
            )}

            {/* STEP 2: ANALYSIS RESULT */}
            {step === STEPS.ANALYSIS && structureData && (
                <Card className="animate-in fade-in slide-in-from-bottom-4">
                    <CardHeader>
                        <CardTitle>STEP 2: 構造分析結果</CardTitle>
                        <CardDescription>参考投稿を以下のように分解・テンプレート化しました。</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="grid gap-6 md:grid-cols-2">
                            <div className="space-y-4">
                                <div className="bg-muted p-4 rounded-lg space-y-2">
                                    <Label className="text-primary font-bold">投稿タイプ</Label>
                                    <p className="text-lg font-semibold">{structureData.postType}</p>
                                </div>
                                <div className="bg-muted/50 p-4 rounded-lg space-y-2">
                                    <Label className="font-semibold">STEP 1: 構造分析・抽象化</Label>
                                    <div className="prose prose-sm max-w-none">
                                        <MarkdownRenderer content={structureData.analysisSummary || ""} />
                                    </div>
                                </div>
                            </div>
                            <div className="space-y-4">
                                <div className="border-2 border-primary/20 p-4 rounded-lg bg-primary/5 space-y-3">
                                    <Label className="font-bold text-primary flex items-center gap-2">
                                        <Sparkles className="w-4 h-4" />
                                        STEP 3: 汎用テンプレート
                                    </Label>
                                    <div className="text-sm font-medium whitespace-pre-wrap leading-relaxed bg-white/50 p-3 rounded border border-primary/10">
                                        {structureData.step3_template || (structureData.simplifiedStructure?.join("\n↓\n"))}
                                    </div>
                                    <p className="text-xs text-muted-foreground">※このテンプレートを使って、STEP 5であなたのテーマに合わせた投稿を作成します。</p>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                    <CardFooter className="flex justify-between">
                        <Button variant="ghost" onClick={() => setStep(STEPS.REFERENCE)}>戻る</Button>
                        <Button onClick={() => setStep(STEPS.TONE)}>
                            次へ（トーン分析）
                            <ArrowRight className="w-4 h-4 ml-2" />
                        </Button>
                    </CardFooter>
                </Card>
            )}

            {/* STEP 3: TONE ANALYSIS */}
            {step === STEPS.TONE && (
                <Card className="animate-in fade-in slide-in-from-bottom-4">
                    <CardHeader>
                        <CardTitle>STEP 3: アカウントトーン分析</CardTitle>
                        <CardDescription>
                            あなたの過去の投稿から、文体や雰囲気を学習します。
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <Tabs value={toneMethod} onValueChange={(v) => setToneMethod(v as "url" | "text")}>
                            <TabsList className="w-full">
                                <TabsTrigger value="text" className="flex-1">テキスト貼り付け（推奨）</TabsTrigger>
                                <TabsTrigger value="url" className="flex-1">アカウントURL（β版）</TabsTrigger>
                            </TabsList>

                            <TabsContent value="text" className="space-y-4 mt-4">
                                <div className="space-y-2">
                                    <Label>過去の投稿サンプル</Label>
                                    <Textarea
                                        placeholder="あなたの過去の投稿をいくつかコピーして貼り付けてください（詳しいほど精度が上がります）..."
                                        className="min-h-[200px]"
                                        value={samplePostsText}
                                        onChange={(e) => setSamplePostsText(e.target.value)}
                                    />
                                    <p className="text-xs text-muted-foreground">※ 3〜5投稿程度を含めることをお勧めします</p>
                                </div>
                            </TabsContent>

                            <TabsContent value="url" className="space-y-4 mt-4">
                                <div className="space-y-2">
                                    <Label>アカウントURL</Label>
                                    <Input
                                        placeholder="https://twitter.com/username"
                                        value={accountUrl}
                                        onChange={(e) => setAccountUrl(e.target.value)}
                                    />
                                    <p className="text-xs text-destructive">※ 現在、URLからの自動取得は不安定な場合があります。テキスト貼り付けを推奨します。</p>
                                </div>
                            </TabsContent>
                        </Tabs>

                        {toneData && (
                            <div className="mt-4 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg animate-in fade-in">
                                <div className="flex items-center gap-2 text-green-700 dark:text-green-400 font-bold mb-2">
                                    <CheckCircle2 className="w-5 h-5" />
                                    分析完了
                                </div>
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                    <div>
                                        <span className="font-semibold block text-muted-foreground">トーンタイプ</span>
                                        {toneData.toneType}
                                    </div>
                                    <div>
                                        <span className="font-semibold block text-muted-foreground">一人称</span>
                                        {toneData.firstPerson}
                                    </div>
                                    <div className="col-span-2">
                                        <span className="font-semibold block text-muted-foreground">特徴</span>
                                        {toneData.description}
                                    </div>
                                </div>
                            </div>
                        )}
                    </CardContent>
                    <CardFooter className="flex justify-between">
                        <Button variant="ghost" onClick={() => setStep(STEPS.ANALYSIS)}>戻る</Button>
                        {!toneData ? (
                            <Button onClick={handleAnalyzeTone} disabled={isPending}>
                                {isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
                                トーンを分析する
                            </Button>
                        ) : (
                            <Button onClick={() => setStep(STEPS.THEME)}>
                                次へ（テーマ決定）
                                <ArrowRight className="w-4 h-4 ml-2" />
                            </Button>
                        )}
                    </CardFooter>
                </Card>
            )}

            {/* STEP 4: THEME */}
            {step === STEPS.THEME && (
                <Card className="animate-in fade-in slide-in-from-bottom-4">
                    <CardHeader>
                        <CardTitle>STEP 4: 作成テーマの入力</CardTitle>
                        <CardDescription>
                            それではテンプレートを使ってオリジナルポストを作成します。テーマやジャンルなどを教えてください。
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label>どんなテーマで投稿を作りたいですか？</Label>
                            <Textarea
                                placeholder="例：リモートワークでの失敗談、新人時代の学び、最近買ってよかったもの..."
                                className="min-h-[120px] text-lg"
                                value={theme}
                                onChange={(e) => setTheme(e.target.value)}
                            />
                        </div>
                    </CardContent>
                    <CardFooter className="flex justify-between">
                        <Button variant="ghost" onClick={() => setStep(STEPS.TONE)}>戻る</Button>
                        <Button onClick={handleGenerate} disabled={isPending || !theme.trim()} size="lg" className="w-full md:w-auto">
                            {isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
                            投稿を生成する (3パターン)
                        </Button>
                    </CardFooter>
                </Card>
            )}

            {/* STEP 5: RESULT */}
            {step === STEPS.RESULT && generatedPosts.length > 0 && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
                    <div className="flex items-center justify-between">
                        <h2 className="text-2xl font-bold">生成結果 (STEP 5)</h2>
                        <Button variant="outline" onClick={() => setStep(STEPS.THEME)}>テーマを変えて再生成</Button>
                    </div>

                    <div className="grid gap-6 md:grid-cols-3">
                        {generatedPosts.map((post, i) => (
                            <Card key={i} className={`flex flex-col h-full transition-all ${selectedPostIndex === i ? 'ring-2 ring-primary border-primary' : 'hover:border-primary/50'}`}>
                                <CardHeader className="pb-3">
                                    <Badge className="w-fit mb-2">{post.type || `パターン ${i + 1}`}</Badge>
                                    <CardDescription className="text-xs">{post.explanation}</CardDescription>
                                </CardHeader>
                                <CardContent className="flex-1">
                                    <div className="bg-muted/30 p-4 rounded-lg whitespace-pre-wrap font-sans text-sm leading-relaxed border min-h-[200px]">
                                        {post.content}
                                    </div>
                                    <div className="mt-2 text-right text-xs text-muted-foreground">
                                        {post.content.length}文字
                                    </div>
                                </CardContent>
                                <CardFooter className="flex gap-2">
                                    <Button variant="secondary" className="flex-1" onClick={() => copyToClipboard(post.content)}>
                                        <Copy className="w-4 h-4 mr-2" />
                                        コピー
                                    </Button>
                                    <Button
                                        variant={selectedPostIndex === i ? "default" : "outline"}
                                        className="flex-1"
                                        onClick={() => setSelectedPostIndex(i)}
                                    >
                                        <Sparkles className="w-4 h-4 mr-2" />
                                        {selectedPostIndex === i ? "修正中" : "修正する"}
                                    </Button>
                                </CardFooter>
                            </Card>
                        ))}
                    </div>

                    {/* Refinement Area */}
                    {selectedPostIndex !== null && (
                        <div className="animate-in fade-in slide-in-from-bottom-4">
                            <RefinementArea
                                initialContent={generatedPosts[selectedPostIndex].content}
                                contextData={{
                                    theme,
                                    platform,
                                    structure: structureData,
                                    tone: toneData,
                                    postType: generatedPosts[selectedPostIndex].type
                                }}
                                onContentUpdate={(newContent) => {
                                    const newPosts = [...generatedPosts];
                                    newPosts[selectedPostIndex] = {
                                        ...newPosts[selectedPostIndex],
                                        content: newContent
                                    };
                                    setGeneratedPosts(newPosts);
                                }}
                                contentType="text"
                            />
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
