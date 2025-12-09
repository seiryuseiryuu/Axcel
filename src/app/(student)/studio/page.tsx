"use client";

import { useState, useTransition } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sparkles, FileText, Video, Image as ImageIcon, Copy, Check } from "lucide-react";
import { generateContentAction } from "@/app/actions/studio";

export default function AIStudioPage() {
    const [isPending, startTransition] = useTransition();
    const [result, setResult] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);

    async function handleSubmit(formData: FormData) {
        setError(null);
        setResult(null);

        startTransition(async () => {
            const data = await generateContentAction({}, formData);
            if (data.error) {
                setError(data.error);
            } else if (data.result) {
                setResult(data.result);
            }
        });
    }

    const copyToClipboard = () => {
        if (result) {
            navigator.clipboard.writeText(result);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    return (
        <div className="container mx-auto p-6 space-y-8 max-w-5xl">
            <div className="flex flex-col gap-2">
                <h1 className="text-3xl font-bold tracking-tight text-foreground">AI制作スタジオ (Pro)</h1>
                <p className="text-muted-foreground">
                    高度なプロンプトエンジニアリング技術を搭載。プロ品質の記事や台本を瞬時に生成します。
                </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 h-full">
                {/* Left: Input Forms */}
                <div className="space-y-6">
                    <Tabs defaultValue="article" className="space-y-4">
                        <TabsList className="bg-card border border-border/50 p-1 rounded-xl w-full justify-start">
                            <TabsTrigger value="article" className="flex gap-2 flex-1">
                                <FileText className="w-4 h-4" /> SEO記事
                            </TabsTrigger>
                            <TabsTrigger value="video" className="flex gap-2 flex-1">
                                <Video className="w-4 h-4" /> 動画台本
                            </TabsTrigger>
                            <TabsTrigger value="image" disabled className="flex gap-2 flex-1 opacity-50 cursor-not-allowed">
                                <ImageIcon className="w-4 h-4" /> 画像 (準備中)
                            </TabsTrigger>
                        </TabsList>

                        {/* Article Form */}
                        <TabsContent value="article">
                            <Card className="border-border/50 shadow-sm relative overflow-hidden bg-white/50 backdrop-blur-sm">
                                <form action={handleSubmit}>
                                    <input type="hidden" name="type" value="article" />
                                    <CardHeader>
                                        <CardTitle>SEO記事ジェネレーター</CardTitle>
                                        <CardDescription>
                                            検索意図を満たす高品質なブログ記事構成を作成します。
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        <div className="space-y-2">
                                            <Label>記事のトピック / キーワード <span className="text-red-500">*</span></Label>
                                            <Input name="topic" placeholder="例: Webデザイン 独学 始め方" required />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>ターゲット読者</Label>
                                            <Input name="target" placeholder="例: 未経験から副業を目指す30代会社員" />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>記事のトーン（文体）</Label>
                                            <Input name="tone" placeholder="例: 親しみやすく、かつ論理的" />
                                        </div>
                                        <Button disabled={isPending} className="w-full mt-4 bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-700 hover:to-cyan-600 text-white shadow-lg shadow-blue-500/20 transition-all">
                                            <Sparkles className="w-4 h-4 mr-2" />
                                            {isPending ? "生成中..." : "プロ品質で生成する"}
                                        </Button>
                                    </CardContent>
                                </form>
                            </Card>
                        </TabsContent>

                        {/* Video Form */}
                        <TabsContent value="video">
                            <Card className="border-border/50 shadow-sm relative overflow-hidden bg-white/50 backdrop-blur-sm">
                                <form action={handleSubmit}>
                                    <input type="hidden" name="type" value="script" />
                                    <CardHeader>
                                        <CardTitle>動画台本ジェネレーター</CardTitle>
                                        <CardDescription>
                                            視聴維持率を高めるフックを備えた台本を作成します。
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        <div className="space-y-2">
                                            <Label>動画の企画テーマ <span className="text-red-500">*</span></Label>
                                            <Input name="topic" placeholder="例: 10分で分かるチャットGPT活用術" required />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>ターゲット視聴者層</Label>
                                            <Input name="target" placeholder="例: 業務効率化したいビジネスマン" />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>動画の雰囲気</Label>
                                            <Input name="tone" placeholder="例: テンポよく、エネルギッシュに" />
                                        </div>
                                        <Button disabled={isPending} className="w-full mt-4 bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-700 hover:to-cyan-600 text-white shadow-lg shadow-blue-500/20 transition-all">
                                            <Sparkles className="w-4 h-4 mr-2" />
                                            {isPending ? "生成中..." : "プロ品質で生成する"}
                                        </Button>
                                    </CardContent>
                                </form>
                            </Card>
                        </TabsContent>
                    </Tabs>
                </div>

                {/* Right: Output Area */}
                <div className="h-full min-h-[500px]">
                    <Card className="h-full border-border/50 shadow-md flex flex-col bg-white/80 backdrop-blur-md">
                        <CardHeader className="flex flex-row items-center justify-between py-4 border-b">
                            <CardTitle className="text-lg">出力結果</CardTitle>
                            {result && (
                                <Button variant="ghost" size="sm" onClick={copyToClipboard} className="text-muted-foreground">
                                    {copied ? <Check className="w-4 h-4 mr-1 text-green-500" /> : <Copy className="w-4 h-4 mr-1" />}
                                    {copied ? "コピー完了" : "コピーする"}
                                </Button>
                            )}
                        </CardHeader>
                        <CardContent className="flex-1 p-0 relative overflow-hidden">
                            {isPending ? (
                                <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/50 backdrop-blur-sm z-10 p-6 text-center space-y-4">
                                    <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                                    <p className="text-muted-foreground animate-pulse">
                                        Gemini AIが最高の結果を生成しています...<br />
                                        <span className="text-xs">※長文の場合、30秒ほどかかることがあります</span>
                                    </p>
                                </div>
                            ) : error ? (
                                <div className="p-6 text-red-500 text-center">
                                    {error}
                                </div>
                            ) : result ? (
                                <Textarea
                                    readOnly
                                    className="w-full h-full min-h-[500px] border-0 focus-visible:ring-0 resize-none p-6 font-mono text-sm leading-relaxed bg-transparent"
                                    value={result}
                                />
                            ) : (
                                <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-6 text-center">
                                    <Sparkles className="w-12 h-12 mb-4 text-blue-200" />
                                    <p>左側のフォームから生成を開始してください。</p>
                                    <p className="text-sm mt-2">
                                        生成されたテキストはここに表示され、<br />
                                        ワンクリックでコピーできます。
                                    </p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
