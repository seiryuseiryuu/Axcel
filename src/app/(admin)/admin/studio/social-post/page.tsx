"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Copy, Twitter, Hash, RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const PURPOSES = [
    { value: "engagement", label: "エンゲージメント獲得" },
    { value: "promotion", label: "宣伝・告知" },
    { value: "thought-leadership", label: "思考リーダーシップ" },
    { value: "personal", label: "日常・パーソナル" },
];

const TONES = [
    { value: "casual", label: "カジュアル" },
    { value: "professional", label: "プロフェッショナル" },
    { value: "humorous", label: "ユーモア" },
    { value: "inspirational", label: "インスピレーション" },
];

interface GeneratedPost {
    platform: "x" | "threads";
    content: string;
    hashtags: string[];
    charCount: number;
}

export default function SocialPostPage() {
    const [topic, setTopic] = useState("");
    const [purpose, setPurpose] = useState("engagement");
    const [tone, setTone] = useState("casual");
    const [platform, setPlatform] = useState<"x" | "threads">("x");
    const [loading, setLoading] = useState(false);
    const [posts, setPosts] = useState<GeneratedPost[]>([]);

    const handleGenerate = async () => {
        if (!topic.trim()) return;
        setLoading(true);

        try {
            const selectedPurpose = PURPOSES.find(p => p.value === purpose);
            const selectedTone = TONES.find(t => t.value === tone);
            const charLimit = platform === "x" ? 280 : 500;

            const response = await fetch("/api/ai/generate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    type: "text",
                    prompt: `${platform === "x" ? "X（旧Twitter）" : "Threads"}用の投稿を3パターン作成してください。

トピック: ${topic}
目的: ${selectedPurpose?.label}
トーン: ${selectedTone?.label}
文字数制限: ${charLimit}文字以内

以下のJSON形式で出力してください（コードブロックなし）:
[
  {"content": "投稿本文1", "hashtags": ["ハッシュタグ1", "ハッシュタグ2"]},
  {"content": "投稿本文2", "hashtags": ["ハッシュタグ1", "ハッシュタグ2"]},
  {"content": "投稿本文3", "hashtags": ["ハッシュタグ1", "ハッシュタグ2"]}
]

※絵文字を適度に使用
※エンゲージメントを意識した文章
※ハッシュタグは3つまで`,
                    system: "あなたはSNSマーケティングのプロです。"
                })
            });

            const data = await response.json();
            if (data.success && data.data) {
                try {
                    const jsonMatch = data.data.match(/\[[\s\S]*\]/);
                    if (jsonMatch) {
                        const parsed = JSON.parse(jsonMatch[0]);
                        const generatedPosts: GeneratedPost[] = parsed.map((p: { content: string; hashtags: string[] }) => ({
                            platform,
                            content: p.content,
                            hashtags: p.hashtags || [],
                            charCount: p.content.length,
                        }));
                        setPosts(generatedPosts);
                    }
                } catch {
                    // Fallback: treat as single post
                    setPosts([{
                        platform,
                        content: data.data,
                        hashtags: [],
                        charCount: data.data.length,
                    }]);
                }
            }
        } catch (error) {
            console.error("Generation error:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleCopy = (content: string, hashtags: string[]) => {
        const fullContent = content + (hashtags.length > 0 ? "\n\n" + hashtags.map(h => `#${h}`).join(" ") : "");
        navigator.clipboard.writeText(fullContent);
    };

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <div>
                <h1 className="text-2xl font-bold flex items-center gap-2">
                    <Twitter className="h-6 w-6 text-primary" />
                    X・Threads投稿作成
                </h1>
                <p className="text-muted-foreground">バズるSNS投稿をAIで作成</p>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
                <Card>
                    <CardHeader>
                        <CardTitle>設定</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label>投稿のトピック *</Label>
                            <Textarea
                                value={topic}
                                onChange={(e) => setTopic(e.target.value)}
                                placeholder="例: 新しいブログ記事を公開しました。React入門ガイドについて..."
                                rows={3}
                            />
                        </div>

                        <Tabs value={platform} onValueChange={(v) => setPlatform(v as "x" | "threads")}>
                            <TabsList className="w-full">
                                <TabsTrigger value="x" className="flex-1">X（280文字）</TabsTrigger>
                                <TabsTrigger value="threads" className="flex-1">Threads（500文字）</TabsTrigger>
                            </TabsList>
                        </Tabs>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>目的</Label>
                                <Select value={purpose} onValueChange={setPurpose}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        {PURPOSES.map(p => (
                                            <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>トーン</Label>
                                <Select value={tone} onValueChange={setTone}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        {TONES.map(t => (
                                            <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <Button className="w-full" onClick={handleGenerate} disabled={loading || !topic.trim()}>
                            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {loading ? "生成中..." : "投稿を生成（3パターン）"}
                        </Button>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>生成結果</CardTitle>
                        <CardDescription>クリックでコピー</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {posts.length > 0 ? (
                            posts.map((post, i) => (
                                <div
                                    key={i}
                                    className="p-4 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                                    onClick={() => handleCopy(post.content, post.hashtags)}
                                >
                                    <div className="flex items-center justify-between mb-2">
                                        <Badge variant="secondary">パターン {i + 1}</Badge>
                                        <span className={`text-xs ${post.charCount > (platform === "x" ? 280 : 500) ? "text-destructive" : "text-muted-foreground"}`}>
                                            {post.charCount}文字
                                        </span>
                                    </div>
                                    <p className="text-sm whitespace-pre-wrap mb-2">{post.content}</p>
                                    {post.hashtags.length > 0 && (
                                        <div className="flex flex-wrap gap-1">
                                            {post.hashtags.map((tag, j) => (
                                                <Badge key={j} variant="outline" className="text-xs">
                                                    <Hash className="h-3 w-3 mr-1" />
                                                    {tag}
                                                </Badge>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ))
                        ) : (
                            <div className="h-[300px] flex items-center justify-center text-muted-foreground border-2 border-dashed rounded-md">
                                <div className="text-center">
                                    <Twitter className="h-12 w-12 mx-auto mb-2 opacity-50" />
                                    <p>投稿案がここに表示されます</p>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
