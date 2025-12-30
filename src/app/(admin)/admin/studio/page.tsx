import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import {
    BookText, Video, Image, Cpu, ImagePlus, FileVideo,
    Twitter, Instagram, Presentation, MessageSquare, FileText,
    Mail, Layout, MonitorPlay, Package, GitBranch, Scissors,
    Sparkles, ArrowRight
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface Tool {
    title: string;
    description: string;
    href: string;
    icon: React.ComponentType<{ className?: string }>;
    color: string;
    category: "content" | "image" | "copy" | "strategy";
    isNew?: boolean;
}

const tools: Tool[] = [
    // Content Tools
    { title: "SEO記事作成", description: "4段階確認で高品質なSEO記事を作成", href: "/admin/studio/seo", icon: BookText, color: "text-blue-500", category: "content" },
    { title: "YouTube台本", description: "視聴維持率の高い動画台本を生成", href: "/admin/studio/script", icon: Video, color: "text-red-500", category: "content" },
    { title: "ショート動画台本", description: "TikTok/Shorts/Reels用の台本", href: "/admin/studio/short-script", icon: FileVideo, color: "text-pink-500", category: "content" },
    { title: "動画切り抜き分析", description: "長尺動画からバズるショートを提案", href: "/admin/studio/video-clip", icon: Scissors, color: "text-orange-500", category: "content", isNew: true },
    { title: "X・Threads投稿", description: "バズるSNS投稿を3パターン生成", href: "/admin/studio/social-post", icon: Twitter, color: "text-sky-500", category: "content" },
    { title: "note文章", description: "note記事をAIで作成", href: "/admin/studio/note-writing", icon: FileText, color: "text-teal-500", category: "content" },
    { title: "プレゼン資料", description: "スライド構成とノートを生成", href: "/admin/studio/presentation", icon: Presentation, color: "text-amber-500", category: "content" },

    // Image Tools
    { title: "YouTubeサムネイル", description: "JPEG/PNG/PSD(5レイヤー)でダウンロード", href: "/admin/studio/thumbnail", icon: Image, color: "text-purple-500", category: "image" },
    { title: "ブログアイキャッチ", description: "記事のヘッダー画像を作成", href: "/admin/studio/eyecatch", icon: ImagePlus, color: "text-indigo-500", category: "image" },
    { title: "インスタストーリーズ", description: "ストーリーズの構成と背景画像", href: "/admin/studio/insta-story", icon: Instagram, color: "text-fuchsia-500", category: "image" },
    { title: "LINEバナー", description: "LINE公式アカウント用バナー", href: "/admin/studio/line-banner", icon: MessageSquare, color: "text-green-500", category: "image" },
    { title: "note/Brain/Tips", description: "コンテンツ販売プラットフォーム用", href: "/admin/studio/note-thumbnail", icon: FileText, color: "text-emerald-500", category: "image" },

    // Copywriting Tools
    { title: "セールスレター", description: "AIDA/PAS/QUESTフレームワーク", href: "/admin/studio/sales-letter", icon: Mail, color: "text-rose-500", category: "copy" },
    { title: "LPライティング", description: "コンバージョンするLPコピー", href: "/admin/studio/lp-writing", icon: Layout, color: "text-yellow-500", category: "copy" },
    { title: "VSLライティング", description: "ビデオセールスレターの台本", href: "/admin/studio/vsl-writing", icon: MonitorPlay, color: "text-violet-500", category: "copy" },

    // Strategy Tools
    { title: "商品設計", description: "売れる商品アイデアを3案生成", href: "/admin/studio/product-design", icon: Package, color: "text-cyan-500", category: "strategy" },
    { title: "ファネル設計", description: "マーケティングファネルを自動設計", href: "/admin/studio/funnel-design", icon: GitBranch, color: "text-lime-500", category: "strategy" },
    { title: "カリキュラム作成", description: "コース構成を瞬時に構築", href: "/admin/studio/curriculum", icon: Cpu, color: "text-slate-500", category: "strategy" },
];

const categories = [
    { id: "content", label: "コンテンツ作成", description: "記事・台本・投稿", color: "from-blue-500 to-cyan-500" },
    { id: "image", label: "画像作成", description: "サムネイル・バナー・アイキャッチ", color: "from-purple-500 to-pink-500" },
    { id: "copy", label: "コピーライティング", description: "セールスレター・LP・VSL", color: "from-rose-500 to-orange-500" },
    { id: "strategy", label: "戦略設計", description: "商品・ファネル・カリキュラム", color: "from-green-500 to-teal-500" },
];

export default function StudioDashboard() {
    return (
        <div className="space-y-8">
            {/* Hero Section */}
            <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-8 border">
                <div className="relative z-10">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-primary/10 rounded-lg">
                            <Sparkles className="h-6 w-6 text-primary" />
                        </div>
                        <h1 className="text-3xl font-bold tracking-tight">AI Creation Studio</h1>
                    </div>
                    <p className="text-muted-foreground max-w-2xl">
                        18種類のAIツールでコンテンツ制作を加速。サイドバーから各ツールにアクセスできます。
                    </p>
                </div>
                <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl" />
            </div>

            {/* Quick Stats */}
            <div className="grid gap-4 md:grid-cols-4">
                {categories.map((cat) => (
                    <Card key={cat.id} className="relative overflow-hidden">
                        <div className={`absolute inset-0 bg-gradient-to-br ${cat.color} opacity-5`} />
                        <CardHeader className="pb-2">
                            <CardDescription>{cat.label}</CardDescription>
                            <CardTitle className="text-2xl">
                                {tools.filter(t => t.category === cat.id).length}
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-xs text-muted-foreground">{cat.description}</p>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Tools by Category */}
            {categories.map((category) => (
                <div key={category.id} className="space-y-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-xl font-semibold">{category.label}</h2>
                            <p className="text-sm text-muted-foreground">{category.description}</p>
                        </div>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                        {tools.filter(t => t.category === category.id).map((tool) => (
                            <Link href={tool.href} key={tool.href}>
                                <Card className="hover:shadow-md transition-all cursor-pointer h-full border hover:border-primary/30 group">
                                    <CardHeader className="pb-2">
                                        <div className="flex items-center gap-3">
                                            <div className={`p-2 rounded-lg bg-muted ${tool.color} group-hover:scale-110 transition-transform`}>
                                                <tool.icon className="w-4 h-4" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <CardTitle className="text-sm flex items-center gap-2">
                                                    {tool.title}
                                                    {tool.isNew && (
                                                        <span className="text-[10px] bg-primary text-primary-foreground px-1.5 py-0.5 rounded-full">
                                                            NEW
                                                        </span>
                                                    )}
                                                </CardTitle>
                                            </div>
                                            <ArrowRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                                        </div>
                                    </CardHeader>
                                    <CardContent className="pt-0">
                                        <CardDescription className="text-xs line-clamp-2">{tool.description}</CardDescription>
                                    </CardContent>
                                </Card>
                            </Link>
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );
}
