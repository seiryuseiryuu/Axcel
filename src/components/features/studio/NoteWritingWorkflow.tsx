"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Sparkles, Link, Users, ListChecks, FileText, Check, PenTool } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { MarkdownRenderer } from "@/components/ui/markdown-renderer";
import {
    analyzeNoteStructure,
    analyzeNoteReader,
    analyzeNoteDeep,
    writeNoteArticle
} from "@/app/actions/noteWriting";
import { RefinementArea } from "@/components/features/studio/RefinementArea";

const STEPS = [
    { num: 1, title: "設定・入力", icon: PenTool },
    { num: 2, title: "構成分解", icon: ListChecks },
    { num: 3, title: "読者分析", icon: Users },
    { num: 4, title: "詳細分析", icon: Sparkles },
    { num: 5, title: "執筆", icon: FileText },
];

export function NoteWritingWorkflow() {
    const { toast } = useToast();
    const [isPending, startTransition] = useTransition();
    const [step, setStep] = useState(1);

    // Inputs
    const [referenceUrl, setReferenceUrl] = useState("");
    const [articleType, setArticleType] = useState("free");
    const [category, setCategory] = useState("howto");
    const [theme, setTheme] = useState("");
    const [target, setTarget] = useState("");

    // Results
    const [structureAnalysis, setStructureAnalysis] = useState("");
    const [readerAnalysis, setReaderAnalysis] = useState("");
    const [deepAnalysis, setDeepAnalysis] = useState("");
    const [finalArticle, setFinalArticle] = useState("");

    const handleAnalyzeStructure = () => {
        if (!referenceUrl || !theme) {
            toast({ title: "URLとテーマを入力してください", variant: "destructive" });
            return;
        }
        startTransition(async () => {
            const result = await analyzeNoteStructure(referenceUrl, articleType, category, theme);
            if (result.success && result.data) {
                setStructureAnalysis(result.data);
                setStep(2);
                toast({ title: "分析完了", description: "記事の構造を分解しました" });
            } else {
                toast({ title: "エラー", description: result.error, variant: "destructive" });
            }
        });
    };

    const handleAnalyzeReader = () => {
        startTransition(async () => {
            const result = await analyzeNoteReader(structureAnalysis);
            if (result.success && result.data) {
                setReaderAnalysis(result.data);
                setStep(3);
                toast({ title: "分析完了", description: "読者心理を分析しました" });
            }
        });
    };

    const handleAnalyzeDeep = () => {
        startTransition(async () => {
            const result = await analyzeNoteDeep(structureAnalysis, readerAnalysis, category);
            if (result.success && result.data) {
                setDeepAnalysis(result.data);
                setStep(4);
                toast({ title: "分析完了", description: "詳細な戦略を分析しました" });
            }
        });
    };

    const handleWriteArticle = () => {
        startTransition(async () => {
            const result = await writeNoteArticle(
                structureAnalysis,
                readerAnalysis,
                deepAnalysis,
                { type: articleType, category, theme, target }
            );
            if (result.success && result.data) {
                setFinalArticle(result.data);

                // Save to History
                import("@/app/actions/history").then(({ saveCreation }) => {
                    saveCreation(
                        `Note記事: ${theme}`,
                        'seo_article',
                        { finalScript: result.data, type: articleType, category }
                    ).catch(e => console.error("History save failed", e));
                });

                setStep(5);
                toast({ title: "執筆完了", description: "履歴に保存されました" });
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
                        <CardTitle>STEP 1: 記事設定</CardTitle>
                        <CardDescription>作成したいnote記事の設定と、参考にしたい記事URLを入力してください。</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>記事タイプ</Label>
                                <Select value={articleType} onValueChange={setArticleType}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="free">無料公開（フォロワー獲得）</SelectItem>
                                        <SelectItem value="paid">有料販売（収益化）</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>カテゴリ</Label>
                                <Select value={category} onValueChange={setCategory}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="howto">ノウハウ・ハウツー</SelectItem>
                                        <SelectItem value="experience">体験談・エッセイ</SelectItem>
                                        <SelectItem value="lecture">講座・教育</SelectItem>
                                        <SelectItem value="summary">情報まとめ</SelectItem>
                                        <SelectItem value="review">レビュー・評価</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label>テーマ（記事タイトル案）<span className="text-red-500">*</span></Label>
                            <Input placeholder="例：初心者が1ヶ月で月5万稼いだ方法" value={theme} onChange={e => setTheme(e.target.value)} />
                        </div>

                        <div className="space-y-2">
                            <Label>参考記事URL（noteなど）<span className="text-red-500">*</span></Label>
                            <Input placeholder="https://note.com/..." value={referenceUrl} onChange={e => setReferenceUrl(e.target.value)} />
                        </div>

                        <div className="space-y-2">
                            <Label>ターゲット読者（任意）</Label>
                            <Input placeholder="例：副業に興味がある20代会社員" value={target} onChange={e => setTarget(e.target.value)} />
                        </div>

                        <Button className="w-full" size="lg" onClick={handleAnalyzeStructure} disabled={isPending}>
                            {isPending ? <Loader2 className="animate-spin mr-2" /> : <ListChecks className="mr-2" />}
                            構成分解を開始
                        </Button>
                    </CardContent>
                </Card>
            </div>

            {/* Steps 2-5 are generic viewers */}
            {[
                { s: 2, data: structureAnalysis, next: handleAnalyzeReader, label: "構成分解結果", btn: "次へ（読者分析）" },
                { s: 3, data: readerAnalysis, next: handleAnalyzeDeep, label: "読者分析結果", btn: "次へ（詳細分析）" },
                { s: 4, data: deepAnalysis, next: handleWriteArticle, label: "詳細分析結果", btn: "記事を執筆する" }
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

            {/* STEP 5: Final */}
            <div className={step === 5 ? "block space-y-6 animate-in slide-in-from-right-4 fade-in" : "hidden"}>
                <Card>
                    <CardHeader>
                        <CardTitle>執筆完了</CardTitle>
                        <CardDescription>出力された記事を確認・調整してください。</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="bg-background p-6 rounded-lg border shadow-sm prose prose-sm max-w-none dark:prose-invert">
                            <MarkdownRenderer content={finalArticle} />
                        </div>

                        <RefinementArea
                            initialContent={finalArticle}
                            contextData={{
                                theme,
                                target,
                                structure: structureAnalysis,
                                reader: readerAnalysis,
                                strategy: deepAnalysis
                            }}
                            onContentUpdate={(newContent) => setFinalArticle(newContent)}
                            contentType="text"
                        />

                        <div className="flex gap-4">
                            <Button variant="outline" className="flex-1" onClick={() => setStep(1)}>トップへ戻る</Button>
                            <Button className="flex-1" onClick={() => navigator.clipboard.writeText(finalArticle)}>コピー</Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
