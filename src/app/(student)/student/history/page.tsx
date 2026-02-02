"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { fetchHistory } from "@/app/actions/history";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Calendar, FileText, Image as ImageIcon, Video, ArrowLeft, Sparkles, PenTool, Layout, MessageSquare, Zap } from "lucide-react";
import Link from "next/link";
import { MarkdownRenderer } from "@/components/ui/markdown-renderer";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ThemeCustomizer } from "@/components/ui/ThemeCustomizer";

export default function StudentHistoryPage() {
    const router = useRouter();
    const [history, setHistory] = useState<any[]>([]);
    const [isLoading, startTransition] = useTransition();
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        startTransition(async () => {
            const result = await fetchHistory();
            if (result.success && result.data) {
                setHistory(result.data);
            } else if (result.error) {
                setError(result.error);
            }
        });
    }, []);

    const getTypeConfig = (type: string) => {
        switch (type) {
            case 'video_script':
                return { icon: Video, label: 'YouTube台本', color: 'bg-red-500/10 text-red-500 border-red-500/20' };
            case 'thumbnail':
                return { icon: ImageIcon, label: 'サムネイル', color: 'bg-purple-500/10 text-purple-500 border-purple-500/20' };
            case 'image':
                return { icon: ImageIcon, label: '画像', color: 'bg-blue-500/10 text-blue-500 border-blue-500/20' };
            case 'seo_article':
                return { icon: FileText, label: 'SEO記事', color: 'bg-green-500/10 text-green-500 border-green-500/20' };
            case 'mixed':
                return { icon: Zap, label: 'コンテンツ', color: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20' };
            default:
                return { icon: FileText, label: type, color: 'bg-gray-500/10 text-gray-500 border-gray-500/20' };
        }
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <Loader2 className="animate-spin w-12 h-12 text-primary" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background">
            {/* Theme Customizer */}
            <ThemeCustomizer />

            {/* Header */}
            <div className="border-b bg-card/50 backdrop-blur-xl sticky top-0 z-10">
                <div className="container py-6">
                    <div className="flex items-center gap-4">
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => router.back()}
                            className="hover:bg-muted"
                        >
                            <ArrowLeft className="w-5 h-5" />
                        </Button>
                        <div>
                            <h1 className="text-2xl font-bold flex items-center gap-2">
                                <Sparkles className="w-6 h-6 text-primary" />
                                生成履歴
                            </h1>
                            <p className="text-sm text-muted-foreground">過去に作成した成果物を確認・再利用できます</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="container py-8">
                {error && (
                    <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 mb-6 text-red-400">
                        エラー: {error}
                    </div>
                )}

                {history.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {history.map((project) => {
                            const config = getTypeConfig(project.type);
                            const IconComponent = config.icon;
                            const artifact = project.generated_artifacts?.[0];

                            return (
                                <Card
                                    key={project.id}
                                    className="bg-card border hover:bg-accent/50 hover:border-primary/20 transition-all duration-300 group overflow-hidden"
                                >
                                    {/* Preview Image */}
                                    {artifact?.content && (
                                        <div className="aspect-video bg-muted overflow-hidden">
                                            {renderPreviewImage(artifact)}
                                        </div>
                                    )}

                                    <CardHeader className="pb-3">
                                        <div className="flex justify-between items-start">
                                            <Badge variant="outline" className={`${config.color} flex gap-1.5 items-center px-2 py-1`}>
                                                <IconComponent className="w-3 h-3" />
                                                {config.label}
                                            </Badge>
                                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                                                <Calendar className="w-3 h-3" />
                                                {new Date(project.created_at).toLocaleDateString('ja-JP')}
                                            </span>
                                        </div>
                                        <CardTitle className="text-lg mt-3 truncate group-hover:text-primary transition-colors">
                                            {project.title}
                                        </CardTitle>
                                    </CardHeader>

                                    <CardContent className="pt-0">
                                        {artifact && (
                                            <Dialog>
                                                <DialogTrigger asChild>
                                                    <Button
                                                        variant="outline"
                                                        className="w-full"
                                                    >
                                                        詳細を見る
                                                    </Button>
                                                </DialogTrigger>
                                                <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                                                    <DialogHeader>
                                                        <DialogTitle className="flex items-center gap-2">
                                                            <IconComponent className="w-5 h-5 text-primary" />
                                                            {project.title}
                                                        </DialogTitle>
                                                    </DialogHeader>
                                                    <div className="mt-4">
                                                        {renderContent(artifact)}
                                                    </div>
                                                </DialogContent>
                                            </Dialog>
                                        )}
                                    </CardContent>
                                </Card>
                            );
                        })}
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center py-20 text-center">
                        <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center mb-6">
                            <Sparkles className="w-12 h-12 text-primary" />
                        </div>
                        <h2 className="text-2xl font-bold mb-2">
                            まだ履歴がありません
                        </h2>
                        <p className="text-muted-foreground mb-6 max-w-md">
                            AIスタジオでコンテンツを作成すると、ここに保存されます。
                        </p>
                        <Link href="/studio">
                            <Button className="bg-primary hover:bg-primary/90">
                                <Sparkles className="w-4 h-4 mr-2" />
                                スタジオで作成を始める
                            </Button>
                        </Link>
                    </div>
                )}
            </div>
        </div>
    );
}

function renderPreviewImage(artifact: any) {
    const { content } = artifact;

    // Array of images
    if (Array.isArray(content) && content[0]?.image) {
        return (
            <img
                src={content[0].image}
                alt="Preview"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
        );
    }

    // Text content - show placeholder
    return (
        <div className="w-full h-full flex items-center justify-center text-white/20">
            <FileText className="w-12 h-12" />
        </div>
    );
}

function renderContent(artifact: any) {
    const { content } = artifact;

    // String (markdown)
    if (typeof content === 'string') {
        return <MarkdownRenderer content={content} />;
    }

    // Object
    if (typeof content === 'object') {
        // Scripts with finalScript
        if (content.finalScript) {
            return <MarkdownRenderer content={content.finalScript} />;
        }

        // Array of images
        if (Array.isArray(content)) {
            return (
                <div className="grid grid-cols-2 gap-4">
                    {content.map((item: any, idx: number) => (
                        <div key={idx} className="rounded-lg overflow-hidden border border-white/10">
                            {item.image ? (
                                <img src={item.image} alt={`Generated ${idx + 1}`} className="w-full" />
                            ) : (
                                <pre className="text-xs bg-white/5 p-3 overflow-x-auto">{JSON.stringify(item, null, 2)}</pre>
                            )}
                        </div>
                    ))}
                </div>
            );
        }

        // SEO article structure
        if (content.title && content.content) {
            return (
                <div className="space-y-4">
                    <h2 className="text-xl font-bold">{content.title}</h2>
                    <MarkdownRenderer content={content.content} />
                </div>
            );
        }

        // Fallback JSON
        return <pre className="text-xs bg-white/5 p-4 rounded-lg overflow-x-auto">{JSON.stringify(content, null, 2)}</pre>;
    }

    return <div className="text-white/60">表示できないコンテンツ形式です</div>;
}
