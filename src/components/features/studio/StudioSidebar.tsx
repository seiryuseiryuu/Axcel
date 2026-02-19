"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
    BookText, Video, Image, Cpu, ImagePlus, FileVideo,
    Twitter, Instagram, Presentation, MessageSquare, FileText,
    Mail, Layout, MonitorPlay, Package, GitBranch, Scissors,
    ChevronLeft, ChevronRight, Palette, Sparkles, Users, Clock
} from "lucide-react";

interface ToolItem {
    title: string;
    href: string;
    icon: React.ComponentType<{ className?: string }>;
    category: string;
    comingSoon?: boolean;
}

const tools: ToolItem[] = [
    // Content Tools
    { title: "SEO記事作成", href: "/admin/studio/seo", icon: BookText, category: "content" },
    { title: "YouTube台本", href: "/admin/studio/script", icon: Video, category: "content" },
    { title: "ショート動画台本", href: "/admin/studio/short-script", icon: FileVideo, category: "content" },
    { title: "VSLライティング", href: "/admin/studio/vsl-writing", icon: MonitorPlay, category: "content" },
    { title: "動画切り抜き分析", href: "/admin/studio/video-clip", icon: Scissors, category: "content" },
    { title: "X・Threads投稿", href: "/admin/studio/social-post", icon: Twitter, category: "content" },
    { title: "note文章", href: "/admin/studio/note-writing", icon: FileText, category: "content" },
    { title: "LPライティング", href: "/admin/studio/lp-writing", icon: Layout, category: "content" },
    { title: "セールスレター", href: "/admin/studio/sales-letter", icon: Mail, category: "content" },

    // Image Tools
    { title: "YouTubeサムネイル", href: "/admin/studio/thumbnail", icon: Image, category: "image" },
    { title: "ブログアイキャッチ", href: "/admin/studio/eyecatch", icon: ImagePlus, category: "image", comingSoon: true },
    { title: "LINEバナー", href: "/admin/studio/line-banner", icon: MessageSquare, category: "image" },
    { title: "note/Brain/Tips", href: "/admin/studio/note-thumbnail", icon: FileText, category: "image" },

    // Admin Tools
    { title: "ユーザー管理", href: "/admin/users", icon: Users, category: "admin" },
    { title: "生成履歴", href: "/admin/history", icon: Clock, category: "admin" },
];

const categories = [
    { id: "content", label: "コンテンツ作成", icon: FileText },
    { id: "image", label: "画像作成", icon: Image },
    { id: "admin", label: "管理機能", icon: Users },
];

export function StudioSidebar() {
    const pathname = usePathname();
    const { toast } = useToast();
    const [collapsed, setCollapsed] = useState(false);

    const handleComingSoon = (e: React.MouseEvent, title: string) => {
        e.preventDefault();
        toast({
            title: "準備中",
            description: `${title}機能は現在開発中です。リリースまでお待ちください。`,
        });
    };

    return (
        <div className={cn(
            "border-r bg-card/50 flex flex-col transition-all duration-300 h-screen sticky top-0",
            collapsed ? "w-16" : "w-64"
        )}>
            {/* Header */}
            <div className="p-4 border-b flex items-center justify-between">
                {!collapsed && (
                    <div className="flex items-center gap-2">
                        <Palette className="h-5 w-5 text-primary" />
                        <span className="font-bold">Accel</span>
                    </div>
                )}
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setCollapsed(!collapsed)}
                >
                    {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
                </Button>
            </div>

            {/* Dashboard Link */}
            <div className="p-2">
                <Link href="/admin/studio">
                    <Button
                        variant={pathname === "/admin/studio" ? "secondary" : "ghost"}
                        className={cn("w-full justify-start", collapsed && "justify-center")}
                    >
                        <Sparkles className="h-4 w-4" />
                        {!collapsed && <span className="ml-2">ダッシュボード</span>}
                    </Button>
                </Link>
            </div>

            {/* Tools List */}
            <ScrollArea className="flex-1">
                <div className="p-2 space-y-4">
                    {categories.map((category) => (
                        <div key={category.id}>
                            {!collapsed && (
                                <div className="px-2 py-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                    {category.label}
                                </div>
                            )}
                            <div className="space-y-1">
                                {tools.filter(t => t.category === category.id).map((tool) => {
                                    const isActive = pathname === tool.href;
                                    return (
                                        <div key={tool.href}>
                                            {tool.comingSoon ? (
                                                <Button
                                                    variant="ghost"
                                                    className={cn(
                                                        "w-full justify-start h-9 text-sm text-muted-foreground hover:text-foreground",
                                                        collapsed && "justify-center px-2"
                                                    )}
                                                    onClick={(e) => handleComingSoon(e, tool.title)}
                                                    title={collapsed ? tool.title : undefined}
                                                >
                                                    <tool.icon className="h-4 w-4 flex-shrink-0" />
                                                    {!collapsed && (
                                                        <>
                                                            <span className="ml-2 truncate">{tool.title}</span>
                                                            <span className="ml-auto text-[10px] bg-muted-foreground/20 px-1.5 py-0.5 rounded text-muted-foreground">
                                                                Soon
                                                            </span>
                                                        </>
                                                    )}
                                                </Button>
                                            ) : (
                                                <Link href={tool.href}>
                                                    <Button
                                                        variant={isActive ? "secondary" : "ghost"}
                                                        className={cn(
                                                            "w-full justify-start h-9 text-sm",
                                                            collapsed && "justify-center px-2",
                                                            isActive && "bg-primary/10 text-primary"
                                                        )}
                                                        title={collapsed ? tool.title : undefined}
                                                    >
                                                        <tool.icon className="h-4 w-4 flex-shrink-0" />
                                                        {!collapsed && <span className="ml-2 truncate">{tool.title}</span>}
                                                    </Button>
                                                </Link>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </div>
            </ScrollArea>

            {/* Footer */}
            {!collapsed && (
                <div className="p-4 border-t text-xs text-muted-foreground">
                    {tools.length}個のツール
                </div>
            )}
        </div>
    );
}
