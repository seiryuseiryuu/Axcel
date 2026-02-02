"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Send, Sparkles, Loader2, RotateCcw } from "lucide-react";
import { refineContent } from "@/app/actions/refine";
import { useToast } from "@/hooks/use-toast";

interface RefinementAreaProps {
    initialContent: string;
    contextData: any;
    onContentUpdate: (newContent: string) => void;
    contentType?: 'text' | 'script' | 'html';
}

export function RefinementArea({ initialContent, contextData, onContentUpdate, contentType = 'text' }: RefinementAreaProps) {
    const { toast } = useToast();
    const [content, setContent] = useState(initialContent);
    const [instruction, setInstruction] = useState("");
    const [isPending, startTransition] = useTransition();
    const [history, setHistory] = useState<{ role: 'user' | 'ai', text: string }[]>([]);

    const handleRefine = () => {
        if (!instruction.trim()) return;

        // Add user instruction to local display history (optional UI enhancement)
        const newHistory = [...history, { role: 'user' as const, text: instruction }];
        setHistory(newHistory);

        startTransition(async () => {
            const result = await refineContent(content, instruction, contextData, contentType);

            if (result.success && result.data) {
                setContent(result.data);
                onContentUpdate(result.data); // Propagate up
                setHistory(prev => [...prev, { role: 'ai' as const, text: "修正しました。" }]);
                setInstruction("");
                toast({ title: "修正完了", description: "コンテンツを更新しました" });
            } else {
                toast({ title: "エラー", description: "修正に失敗しました", variant: "destructive" });
            }
        });
    };

    return (
        <Card className="mt-8 border-primary/20 bg-primary/5">
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                    <Sparkles className="w-5 h-5 text-yellow-500" />
                    AIリライティング (対話修正)
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                {/* Content Display/Edit Area */}
                <div className="space-y-2">
                    <div className="flex items-center justify-between">
                        <Label>現在のコンテンツ</Label>
                        <span className="text-xs text-muted-foreground">※直接編集も可能です</span>
                    </div>

                    {contentType === 'html' ? (
                        <div className="border rounded-md overflow-hidden bg-background">
                            <Tabs defaultValue="preview" className="w-full">
                                <TabsList className="w-full justify-start rounded-none border-b bg-muted/50 p-0 h-9">
                                    <TabsTrigger value="preview" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-background h-9 px-4">プレビュー</TabsTrigger>
                                    <TabsTrigger value="code" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-background h-9 px-4">HTMLソース</TabsTrigger>
                                </TabsList>
                                <TabsContent value="preview" className="p-6 min-h-[300px] prose dark:prose-invert max-w-none">
                                    <div dangerouslySetInnerHTML={{ __html: content }} />
                                </TabsContent>
                                <TabsContent value="code" className="p-0">
                                    <Textarea
                                        value={content}
                                        onChange={(e) => {
                                            setContent(e.target.value);
                                            onContentUpdate(e.target.value);
                                        }}
                                        className="min-h-[300px] font-mono border-0 rounded-none focus-visible:ring-0 resize-y p-4"
                                    />
                                </TabsContent>
                            </Tabs>
                        </div>
                    ) : (
                        <Textarea
                            value={content}
                            onChange={(e) => {
                                setContent(e.target.value);
                                onContentUpdate(e.target.value);
                            }}
                            className="min-h-[200px] font-mono bg-background"
                        />
                    )}
                </div>

                <div className="text-sm text-muted-foreground pt-4 border-t">
                    これまでの分析結果やターゲット情報を踏まえて、成果物を修正できます。<br />
                    例：「もっとエモーショナルにして」「第2章を詳しくして」「女性向けに口調を変えて」
                </div>

                {/* History */}
                {history.length > 0 && (
                    <div className="space-y-2 p-4 bg-background/50 rounded-lg max-h-[200px] overflow-y-auto mb-4 border">
                        {history.map((msg, i) => (
                            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                <div className={`text-xs px-3 py-2 rounded-lg max-w-[80%] ${msg.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                                    {msg.text}
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                <div className="flex gap-2">
                    <Textarea
                        placeholder="修正指示を入力してください..."
                        value={instruction}
                        onChange={(e) => setInstruction(e.target.value)}
                        className="min-h-[60px] bg-background"
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                                handleRefine();
                            }
                        }}
                    />
                    <Button
                        onClick={handleRefine}
                        disabled={isPending || !instruction.trim()}
                        className="h-auto self-end px-6"
                    >
                        {isPending ? <Loader2 className="animate-spin" /> : <Send />}
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}
