"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Sparkles, Link, Users, ListChecks, FileText, Check, ArrowRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { MarkdownRenderer } from "@/components/ui/markdown-renderer";
import { RefinementArea } from "./RefinementArea";
import * as SalesLetterActions from "@/app/actions/salesLetter";
import * as LpWritingActions from "@/app/actions/lpWriting";


interface CopywritingSteps {
    analyzeStructure: (url: string, productInfo: string) => Promise<{ success: boolean; data?: string; error?: string }>;
    analyzeCustomer: (structure: string) => Promise<{ success: boolean; data?: string; error?: string }>;
    analyzeDeep: (structure: string, customer: string) => Promise<{ success: boolean; data?: string; error?: string }>;
    generateCopy: (structure: string, customer: string, deepAnalysis: string, productInfo: string) => Promise<{ success: boolean; data?: string; error?: string }>;
}

interface CopywritingWorkflowProps {
    type?: "sales-letter" | "lp-writing";
    toolName?: string;
    actions?: CopywritingSteps;
    defaultProductInfo?: string;
}

const STEPS = [
    { num: 1, title: "情報入力", icon: Link },
    { num: 2, title: "構成分解", icon: ListChecks },
    { num: 3, title: "顧客分析", icon: Users },
    { num: 4, title: "詳細分析", icon: sparkIcon }, // sparkIcon is dummy, used Sparkles below
    { num: 5, title: "コピー生成", icon: FileText },
];

function sparkIcon(props: any) { return <Sparkles {...props} /> }

export function CopywritingWorkflow({ type, toolName, actions, defaultProductInfo = "" }: CopywritingWorkflowProps) {
    const { toast } = useToast();
    const [isPending, startTransition] = useTransition();
    const [step, setStep] = useState(1);

    // Resolve actions and toolName based on type if not provided
    const resolvedActions: CopywritingSteps = actions || (type === "sales-letter" ? {
        analyzeStructure: SalesLetterActions.analyzeSalesStructure,
        analyzeCustomer: SalesLetterActions.analyzeSalesCustomer,
        analyzeDeep: SalesLetterActions.analyzeSalesDeep,
        generateCopy: SalesLetterActions.writeSalesLetter
    } : {
        analyzeStructure: LpWritingActions.analyzeLpStructure,
        analyzeCustomer: LpWritingActions.analyzeLpCustomer,
        analyzeDeep: LpWritingActions.analyzeLpDeep,
        generateCopy: LpWritingActions.writeLpCopy
    });

    const resolvedToolName = toolName || (type === "sales-letter" ? "セールスレター作成" : "LPライティング");

    if (!resolvedActions.analyzeStructure) {
        return <div className="p-4 text-red-500">Error: Invalid configuration. Actions or Type must be provided.</div>;
    }

    // Data
    const [referenceUrl, setReferenceUrl] = useState("");
    const [productInfo, setProductInfo] = useState(defaultProductInfo);

    // Analysis Results
    const [structureAnalysis, setStructureAnalysis] = useState("");
    const [customerAnalysis, setCustomerAnalysis] = useState("");
    const [deepAnalysis, setDeepAnalysis] = useState("");
    const [finalCopy, setFinalCopy] = useState("");

    const handleAnalyzeStructure = () => {
        if (!referenceUrl || !productInfo) {
            toast({ title: "URLと商品情報を入力してください", variant: "destructive" });
            return;
        }
        startTransition(async () => {
            const result = await resolvedActions.analyzeStructure(referenceUrl, productInfo);
            if (result.success && result.data) {
                setStructureAnalysis(result.data);
                toast({ title: "構成分解完了", description: "次のステップへ進んでください" });
                setStep(2);
            } else {
                toast({ title: "エラー", description: result.error, variant: "destructive" });
            }
        });
    };

    const handleAnalyzeCustomer = () => {
        startTransition(async () => {
            const result = await resolvedActions.analyzeCustomer(structureAnalysis);
            if (result.success && result.data) {
                setCustomerAnalysis(result.data);
                toast({ title: "顧客分析完了", description: "ターゲットの深層心理を分析しました" });
                setStep(3);
            } else {
                toast({ title: "エラー", description: result.error, variant: "destructive" });
            }
        });
    };

    const handleAnalyzeDeep = () => {
        startTransition(async () => {
            const result = await resolvedActions.analyzeDeep(structureAnalysis, customerAnalysis);
            if (result.success && result.data) {
                setDeepAnalysis(result.data);
                toast({ title: "詳細分析完了", description: "訴求ポイントを洗い出しました" });
                setStep(4);
            } else {
                toast({ title: "エラー", description: result.error, variant: "destructive" });
            }
        });
    };

    const handleGenerateCopy = () => {
        startTransition(async () => {
            const result = await resolvedActions.generateCopy(structureAnalysis, customerAnalysis, deepAnalysis, productInfo);
            if (result.success && result.data) {
                setFinalCopy(result.data);

                // Save to History
                import("@/app/actions/history").then(({ saveCreation }) => {
                    saveCreation(
                        `${resolvedToolName}: ${productInfo.slice(0, 20)}...`,
                        resolvedToolName.includes("LP") || resolvedToolName.includes("セールス") ? 'seo_article' : 'mixed', // Use seo_article as proxy for long text
                        { finalScript: result.data, structure: structureAnalysis }
                    ).catch(e => console.error("History save failed", e));
                });

                toast({ title: "コピー生成完了", description: "履歴に保存されました" });
                setStep(5);
            } else {
                toast({ title: "エラー", description: result.error, variant: "destructive" });
            }
        });
    };

    return (
        <div className="space-y-8 max-w-5xl mx-auto pb-20">
            {/* Progress Bar */}
            <div className="flex justify-between items-center relative px-4 overflow-x-auto pb-4">
                <div className="absolute left-0 top-1/2 w-full h-0.5 bg-muted -z-10 translate-y-[-50%]" />
                {STEPS.map((s) => (
                    <div key={s.num} className={`bg-background px-4 flex flex-col items-center gap-2 min-w-[80px] ${step >= s.num ? "text-primary" : "text-muted-foreground"}`}>
                        <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all ${step >= s.num ? "border-primary bg-primary text-primary-foreground" : "border-muted bg-background"}`}>
                            {step > s.num ? <Check className="w-4 h-4" /> : <s.icon className="w-4 h-4" />}
                        </div>
                        <span className="text-xs font-bold whitespace-nowrap">{s.title}</span>
                    </div>
                ))}
            </div>

            {/* STEP 1: Input */}
            <div className={step === 1 ? "block space-y-6 animate-in slide-in-from-right-4 fade-in" : "hidden"}>
                <Card>
                    <CardHeader>
                        <CardTitle>STEP 1: 基本情報入力</CardTitle>
                        <CardDescription>参考にしたいページと、あなたの商品の情報を入力してください。</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="space-y-2">
                            <Label>参考URL（競合のLP・セールスレター）</Label>
                            <Input
                                placeholder="https://example.com/sales-page"
                                value={referenceUrl}
                                onChange={(e) => setReferenceUrl(e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>商品・サービス情報（名称、特徴、価格、ターゲットなど）</Label>
                            <Textarea
                                className="min-h-[150px]"
                                placeholder={`商品名：〇〇\n価格：19,800円\nターゲット：30代男性\n特徴：...`}
                                value={productInfo}
                                onChange={(e) => setProductInfo(e.target.value)}
                            />
                        </div>
                        <Button className="w-full" size="lg" onClick={handleAnalyzeStructure} disabled={isPending}>
                            {isPending ? <Loader2 className="mr-2 animate-spin" /> : <ListChecks className="mr-2" />}
                            構成分解を開始
                        </Button>
                    </CardContent>
                </Card>
            </div>

            {/* STEP 2: Structure Analysis */}
            <div className={step === 2 ? "block space-y-6 animate-in slide-in-from-right-4 fade-in" : "hidden"}>
                <Card>
                    <CardHeader>
                        <CardTitle>STEP 2: 構成分解結果</CardTitle>
                        <CardDescription>参考ページの構造を分析しました。</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="bg-muted/30 p-4 rounded-lg border max-h-[500px] overflow-y-auto">
                            <MarkdownRenderer content={structureAnalysis} />
                        </div>
                        <Button className="w-full" onClick={handleAnalyzeCustomer} disabled={isPending}>
                            {isPending ? <Loader2 className="mr-2 animate-spin" /> : <Users className="mr-2" />}
                            次へ（顧客分析）
                        </Button>
                    </CardContent>
                </Card>
            </div>

            {/* STEP 3: Customer Analysis */}
            <div className={step === 3 ? "block space-y-6 animate-in slide-in-from-right-4 fade-in" : "hidden"}>
                <Card>
                    <CardHeader>
                        <CardTitle>STEP 3: 想定顧客分析</CardTitle>
                        <CardDescription>ターゲットの心理・悩みを深掘りしました。</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="bg-muted/30 p-4 rounded-lg border max-h-[500px] overflow-y-auto">
                            <MarkdownRenderer content={customerAnalysis} />
                        </div>
                        <Button className="w-full" onClick={handleAnalyzeDeep} disabled={isPending}>
                            {isPending ? <Loader2 className="mr-2 animate-spin" /> : <Sparkles className="mr-2" />}
                            次へ（詳細分析）
                        </Button>
                    </CardContent>
                </Card>
            </div>

            {/* STEP 4: Deep Analysis */}
            <div className={step === 4 ? "block space-y-6 animate-in slide-in-from-right-4 fade-in" : "hidden"}>
                <Card>
                    <CardHeader>
                        <CardTitle>STEP 4: 詳細分析（訴求ポイント）</CardTitle>
                        <CardDescription>オファーや証拠、ベネフィットの分析結果です。</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="bg-muted/30 p-4 rounded-lg border max-h-[500px] overflow-y-auto">
                            <MarkdownRenderer content={deepAnalysis} />
                        </div>
                        <Button className="w-full" onClick={handleGenerateCopy} disabled={isPending}>
                            {isPending ? <Loader2 className="mr-2 animate-spin" /> : <FileText className="mr-2" />}
                            コピー生成（最終ステップ）
                        </Button>
                    </CardContent>
                </Card>
            </div>

            {/* STEP 5: Final Copy */}
            <div className={step === 5 ? "block space-y-6 animate-in slide-in-from-right-4 fade-in" : "hidden"}>
                <Card>
                    <CardHeader>
                        <CardTitle>完成した{resolvedToolName}</CardTitle>
                        <CardDescription>分析結果に基づいた最適化されたコピーです。</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="bg-background p-6 rounded-lg border shadow-sm prose prose-sm max-w-none dark:prose-invert">
                            <MarkdownRenderer content={finalCopy} />
                        </div>
                        <div className="flex gap-4">
                            <Button variant="outline" className="flex-1" onClick={() => setStep(1)}>
                                最初に戻る
                            </Button>
                            <Button className="flex-1" onClick={() => navigator.clipboard.writeText(finalCopy)}>
                                コピーする
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                {/* Refinement Area */}
                <RefinementArea
                    initialContent={finalCopy}
                    contextData={{
                        productInfo,
                        structure: structureAnalysis,
                        customer: customerAnalysis,
                        deep: deepAnalysis
                    }}
                    onContentUpdate={(newContent) => setFinalCopy(newContent)}
                />
            </div>
        </div>
    );
}

