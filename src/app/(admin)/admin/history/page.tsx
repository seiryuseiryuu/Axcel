"use client";

import { useEffect, useState, useTransition } from "react";
import { fetchHistory } from "@/app/actions/history";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Calendar, FileText, Image as ImageIcon, Video, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { MarkdownRenderer } from "@/components/ui/markdown-renderer";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

export default function HistoryPage() {
    const [history, setHistory] = useState<any[]>([]);
    const [isLoading, startTransition] = useTransition();

    useEffect(() => {
        startTransition(async () => {
            const result = await fetchHistory();
            if (result.success && result.data) {
                setHistory(result.data);
            }
        });
    }, []);

    const getIcon = (type: string) => {
        switch (type) {
            case 'video_script': return <Video className="w-4 h-4" />;
            case 'thumbnail':
            case 'image': return <ImageIcon className="w-4 h-4" />;
            default: return <FileText className="w-4 h-4" />;
        }
    };

    if (isLoading) {
        return <div className="p-8 flex justify-center"><Loader2 className="animate-spin w-8 h-8" /></div>;
    }

    return (

        <div className="container py-8 space-y-8">
            <div className="flex items-center gap-4">
                <Link href="/admin/studio">
                    <Button variant="ghost" size="icon">
                        <ArrowLeft className="w-4 h-4" />
                    </Button>
                </Link>
                <h1 className="text-3xl font-bold">生成履歴</h1>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {history.map((project) => (
                    <Card key={project.id} className="hover:shadow-md transition-shadow">
                        <CardHeader className="pb-3">
                            <div className="flex justify-between items-start">
                                <Badge variant="outline" className="flex gap-1 items-center">
                                    {getIcon(project.type)}
                                    {project.type}
                                </Badge>
                                <span className="text-xs text-muted-foreground flex items-center gap-1">
                                    <Calendar className="w-3 h-3" />
                                    {new Date(project.created_at).toLocaleDateString()}
                                </span>
                            </div>
                            <CardTitle className="text-lg mt-2 truncate">{project.title}</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {project.generated_artifacts?.[0] && (
                                <ArtifactPreview artifact={project.generated_artifacts[0]} />
                            )}
                        </CardContent>
                    </Card>
                ))}
                {history.length === 0 && (
                    <p className="text-muted-foreground col-span-full text-center py-10">履歴はまだありません。</p>
                )}
            </div>
        </div>
    );
}

function ArtifactPreview({ artifact }: { artifact: any }) {
    // Determine content type and show preview button
    return (
        <div className="space-y-4">
            <div className="text-sm text-muted-foreground truncate">
                {artifact.type === 'seo_article' || artifact.type === 'video_script'
                    ? "テキストコンテンツ"
                    : "画像コンテンツ"}
            </div>

            <Dialog>
                <DialogTrigger asChild>
                    <Button variant="outline" className="w-full">詳細を見る</Button>
                </DialogTrigger>
                <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>{artifact.title}</DialogTitle>
                    </DialogHeader>

                    <div className="mt-4">
                        {renderContent(artifact)}
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}

function renderContent(artifact: any) {
    const { content } = artifact;

    // If content is string (markdown etc)
    if (typeof content === 'string') {
        return <MarkdownRenderer content={content} />;
    }

    // If content is object (JSON structure for scripts, or list of images)
    if (typeof content === 'object') {
        // Scripts often have 'finalScript' or similar
        if (content.finalScript) {
            return <MarkdownRenderer content={content.finalScript} />;
        }

        // Images (e.g. from thumbnail tool)
        // Check array
        if (Array.isArray(content)) {
            return (
                <div className="grid grid-cols-2 gap-4">
                    {content.map((item: any, idx: number) => (
                        <div key={idx}>
                            {item.image ? (
                                <img src={item.image} alt="Generated" className="rounded border" />
                            ) : (
                                <pre className="text-xs bg-muted p-2">{JSON.stringify(item, null, 2)}</pre>
                            )}
                        </div>
                    ))}
                </div>
            )
        }

        // Fallback JSON dump
        return <pre className="text-xs bg-muted p-4 rounded overflow-x-auto">{JSON.stringify(content, null, 2)}</pre>;
    }

    return <div>Unsupported content format</div>;
}
