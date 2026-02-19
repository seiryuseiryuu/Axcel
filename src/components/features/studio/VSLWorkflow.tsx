"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Loader2, Sparkles, Video, Users, ListChecks, FileText, Check, PenTool } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { MarkdownRenderer } from "@/components/ui/markdown-renderer";
import {
    analyzeVslStructure,
    analyzeVslAudience,
    analyzeVslDeep,
    analyzeVslImprovement,
    writeVslScript
} from "@/app/actions/vslWriting";
import { RefinementArea } from "@/components/features/studio/RefinementArea";

const STEPS = [
    { num: 1, title: "設定・入力", icon: PenTool },
    { num: 2, title: "構造分析", icon: ListChecks },
    { num: 3, title: "視聴者分析", icon: Users },
    { num: 4, title: "詳細分析", icon: Sparkles },
    { num: 5, title: "改善提案", icon: ListChecks },
    { num: 6, title: "脚本執筆", icon: FileText },
];

export function VSLWorkflow() {
    const { toast } = useToast();
    const [isPending, startTransition] = useTransition();
    const [step, setStep] = useState(1);

    // Inputs
    const [referenceUrl, setReferenceUrl] = useState("");
    const [productInfo, setProductInfo] = useState("");

    // Results
    const [structureAnalysis, setStructureAnalysis] = useState("");
    const [audienceAnalysis, setAudienceAnalysis] = useState("");
    const [deepAnalysis, setDeepAnalysis] = useState("");
    const [improvementAnalysis, setImprovementAnalysis] = useState("");
    const [finalScript, setFinalScript] = useState("");

    const handleAnalyzeStructure = () => {
        if (!referenceUrl || !productInfo) {
            toast({ title: "URLと商品情報を入力してください", variant: "destructive" });
            return;
        }
        startTransition(async () => {
            const result = await analyzeVslStructure(referenceUrl, productInfo);
            if (result.success && result.data) {
                setStructureAnalysis(result.data);
                setStep(2);
                toast({ title: "分析完了", description: "動画の構造を分析しました" });
            } else {
                toast({ title: "エラー", description: result.error, variant: "destructive" });
            }
        });
    };

    const handleAnalyzeAudience = () => {
        startTransition(async () => {
            const result = await analyzeVslAudience(structureAnalysis);
            if (result.success && result.data) {
                setAudienceAnalysis(result.data);
                setStep(3);
                toast({ title: "分析完了", description: "視聴者心理を分析しました" });
            } else {
                toast({ title: "エラー", description: result.error, variant: "destructive" });
            }
        });
    };

    const handleAnalyzeDeep = () => {
        startTransition(async () => {
            const result = await analyzeVslDeep(structureAnalysis, audienceAnalysis);
            if (result.success && result.data) {
                setDeepAnalysis(result.data);
                setStep(4);
                toast({ title: "分析完了", description: "売れる仕掛けを分析しました" });
            } else {
                toast({ title: "エラー", description: result.error, variant: "destructive" });
            }
        });
    };

    const handleAnalyzeImprovement = () => {
        startTransition(async () => {
            const result = await analyzeVslImprovement(structureAnalysis, deepAnalysis, productInfo);
            if (result.success && result.data) {
                setImprovementAnalysis(result.data);
                setStep(5);
                toast({ title: "分析完了", description: "改善提案を作成しました" });
            } else {
                toast({ title: "エラー", description: result.error, variant: "destructive" });
            }
        });
    };

    const handleWriteScript = () => {
        startTransition(async () => {
            const result = await writeVslScript(
                structureAnalysis,
                audienceAnalysis,
                deepAnalysis,
                improvementAnalysis,
                productInfo
            );
            if (result.success && result.data) {
                setFinalScript(result.data);

                // Save to History
                import("@/app/actions/history").then(({ saveCreation }) => {
                    saveCreation(
                        `VSL脚本: ${productInfo.slice(0, 20)}...`,
                        'video_script',
                        { finalScript: result.data, productInfo }
                    ).catch(e => console.error("History save failed", e));
                });

                setStep(6);
                toast({ title: "執筆完了", description: "履歴に保存されました" });
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

            {/* STEP 1: Inputs */}
            <div className={step === 1 ? "block space-y-6 animate-in slide-in-from-right-4 fade-in" : "hidden"}>
                <Card>
                    <CardHeader>
                        <CardTitle>STEP 1: 動画設定</CardTitle>
                        <CardDescription>参考にしたいYouTube動画のURLと、販売したい商品情報を入力してください。</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="space-y-2">
                            <Label>参考動画URL（YouTubeなど）<span className="text-red-500">*</span></Label>
                            <Input
                                placeholder="https://www.youtube.com/watch?v=..."
                                value={referenceUrl}
                                onChange={e => setReferenceUrl(e.target.value)}
                            />
                            <p className="text-xs text-muted-foreground">※字幕（トランスクリプト）が取得可能な動画を指定してください。</p>
                        </div>

                        <div className="space-y-2">
                            <Label>販売・紹介したい商品情報<span className="text-red-500">*</span></Label>
                            <Textarea
                                placeholder="商品名、ターゲット、特徴、価格、ベネフィットなど詳しく入力してください..."
                                value={productInfo}
                                onChange={e => setProductInfo(e.target.value)}
                                className="min-h-[150px]"
                            />
                        </div>

                        <Button className="w-full" size="lg" onClick={handleAnalyzeStructure} disabled={isPending}>
                            {isPending ? <Loader2 className="animate-spin mr-2" /> : <Video className="mr-2" />}
                            分析を開始（字幕取得）
                        </Button>
                    </CardContent>
                </Card>
            </div>

            {/* Steps 2-5 are generic viewers */}
            {[
                { s: 2, data: structureAnalysis, next: handleAnalyzeAudience, label: "構造分析・字幕解析結果", btn: "次へ（視聴者分析）" },
                { s: 3, data: audienceAnalysis, next: handleAnalyzeDeep, label: "視聴者分析結果", btn: "次へ（詳細分析）" },
                { s: 4, data: deepAnalysis, next: handleAnalyzeImprovement, label: "詳細分析結果", btn: "次へ（改善提案）" },
                { s: 5, data: improvementAnalysis, next: handleWriteScript, label: "改善提案・構成案", btn: "脚本を執筆する" }
            ].map(item => (
                <div key={item.s} className={step === item.s ? "block space-y-6 animate-in slide-in-from-right-4 fade-in" : "hidden"}>
                    <Card>
                        <CardHeader><CardTitle>{item.label}</CardTitle></CardHeader>
                        <CardContent className="space-y-4">
                            <div className="bg-muted/30 p-4 rounded-lg border max-h-[500px] overflow-y-auto">
                                <MarkdownRenderer content={item.data} />
                            </div>
                            <Button className="w-full" onClick={item.next} disabled={isPending}>
                                {isPending ? <Loader2 className="animate-spin mr-2" /> : <Sparkles className="mr-2" />}
                                {item.btn}
                            </Button>
                        </CardContent>
                    </Card>
                </div>
            ))}

            {/* STEP 6: Final */}
            <div className={step === 6 ? "block space-y-6 animate-in slide-in-from-right-4 fade-in" : "hidden"}>
                <Card>
                    <CardHeader>
                        <CardTitle>執筆完了</CardTitle>
                        <CardDescription>出力されたVSL脚本を確認・調整してください。</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="bg-background p-6 rounded-lg border shadow-sm prose prose-sm max-w-none dark:prose-invert">
                            <MarkdownRenderer content={finalScript} />
                        </div>

                        <RefinementArea
                            initialContent={finalScript}
                            contextData={{
                                productInfo,
                                structure: structureAnalysis,
                                audience: audienceAnalysis,
                                deep: deepAnalysis,
                                improvement: improvementAnalysis
                            }}
                            onContentUpdate={(newContent) => setFinalScript(newContent)}
                            contentType="script"
                        />

                        <div className="flex gap-4">
                            <Button variant="outline" className="flex-1" onClick={() => setStep(1)}>トップへ戻る</Button>
                            <Button className="flex-1" onClick={() => navigator.clipboard.writeText(finalScript)}>コピー</Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
