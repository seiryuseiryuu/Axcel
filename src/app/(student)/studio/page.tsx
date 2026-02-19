"use client";

// Longer generation times configured in layout.tsx

import { useState, useTransition, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sparkles, Copy, Check, Download, ArrowRight, BookText, Video, Image as ImageIcon, FileVideo, Twitter, Instagram, Presentation, MessageSquare, FileText, Mail, Layout, MonitorPlay, Package, GitBranch, Scissors, Cpu, AlertCircle, Clock } from "lucide-react";
import { generateContentAction, checkStudioAccess, type StudioAccessResult } from "@/app/actions/studio";
import { useToast } from "@/hooks/use-toast";
import { StudioToolSidebar, tools } from "@/components/features/studio/StudioToolSidebar";
import { ThumbnailWorkflow } from "@/components/features/studio/ThumbnailWorkflow";
import { YouTubeScriptWorkflow } from "@/components/features/studio/YouTubeScriptWorkflow";
import { SEOWorkflow } from "@/components/features/studio/SEOWorkflow";
import { ShortScriptWorkflow } from "@/components/features/studio/ShortScriptWorkflow";
import { NoteWritingWorkflow } from "@/components/features/studio/NoteWritingWorkflow";
import { CopywritingWorkflow } from "@/components/features/studio/CopywritingWorkflow";
import { LineBannerWorkflow } from "@/components/features/studio/LineBannerWorkflow";
import { NoteThumbnailWorkflow } from "@/components/features/studio/NoteThumbnailWorkflow";
import { SocialPostWorkflow } from "@/components/features/studio/SocialPostWorkflow";
import { EyecatchPromptWorkflow } from "@/components/features/studio/EyecatchPromptWorkflow";
import { InstaStoryWorkflow } from "@/components/features/studio/InstaStoryWorkflow";
import { RefinementArea } from "@/components/features/studio/RefinementArea";
import { ThemeCustomizer } from "@/components/ui/ThemeCustomizer";
import { LPWorkflow } from "@/components/features/studio/LPWorkflow";
import { VSLWorkflow } from "@/components/features/studio/VSLWorkflow";
import { VideoClipWorkflow } from "@/components/features/studio/VideoClipWorkflow";


// Student用許可ツール（この3つのみ）
const STUDENT_ALLOWED_TOOLS = [
    "/studio/thumbnail",    // YouTubeサムネイル
    "/studio/seo",          // SEO記事
    "/studio/script",       // YouTube台本
    "/studio/social-post",  // X・Threads投稿
];

// Admin用許可ツール（全部）
const ADMIN_ALLOWED_TOOLS = [
    "/studio/thumbnail",    // YouTubeサムネイル
    "/studio/seo",          // SEO記事
    "/studio/script",       // YouTube台本
    "/studio/short-script", // ショート動画台本
    "/studio/social-post",  // X・Threads
    "/studio/note-writing", // note文章
    "/studio/sales-letter", // セールスレター
    "/studio/lp-writing",   // LPライティング
    "/studio/line-banner",  // LINEバナー
    "/studio/note-thumbnail", // noteサムネイル
    "/studio/eyecatch-prompt", // アイキャッチプロンプト作成
    "/studio/insta-story",  // インスタストーリーズ
];


// Enhanced Tool metadata with expanded input fields
const toolMeta: Record<string, {
    title: string;
    description: string;
    icon: any;
    gradient: string;
    fields: { name: string; label: string; placeholder: string; type?: string; required?: boolean; rows?: number; options?: { value: string; label: string }[] }[];
}> = {
    // ==========================================
    // CONTENT CREATION TOOLS (7)
    // ==========================================
    "/studio/seo": {
        title: "SEO記事ジェネレーター",
        description: "検索1位を狙える高品質なSEO記事をHTML形式で生成",
        icon: BookText,
        gradient: "from-blue-600 to-cyan-500",
        fields: [
            { name: "topic", label: "メインキーワード *", placeholder: "例: Webデザイン 独学 始め方", required: true },
            { name: "subKeywords", label: "サブキーワード（カンマ区切り）", placeholder: "例: 初心者向け, 副業, スキルアップ" },
            { name: "persona", label: "ペルソナ詳細", placeholder: "例: 30代会社員、副業に興味あり、プログラミング経験なし" },
            { name: "target", label: "ターゲット読者", placeholder: "例: 未経験からWebデザイナーを目指す人" },
            { name: "wordCount", label: "目標文字数", placeholder: "3000", type: "number" },
            { name: "structure", label: "希望の記事構成", placeholder: "例: 問題提起→解決策→具体例→まとめ" },
            { name: "competitorUrl", label: "参考競合URL（任意）", placeholder: "https://example.com/..." },
            { name: "ctaLink", label: "誘導先リンク（任意）", placeholder: "例: https://example.com/your-service" },
            { name: "ctaText", label: "CTAボタンテキスト", placeholder: "例: 無料で始める、詳しくはこちら" },
            { name: "internalLinks", label: "内部リンク候補（任意）", placeholder: "例: /blog/related-article1, /blog/related-article2" },
            { name: "authorExpertise", label: "著者の専門性（E-E-A-T）", placeholder: "例: 現役Webデザイナー10年、講座受講者300名以上" },
            { name: "tone", label: "文体", placeholder: "例: 親しみやすく専門的、フランク" },
        ]
    },
    "/studio/script": {
        title: "YouTube動画台本",
        description: "視聴維持率95%を狙う「離脱されない」プロ台本を生成",
        icon: Video,
        gradient: "from-red-500 to-pink-500",
        fields: [
            { name: "referenceUrl", label: "参考動画URL *", placeholder: "例: https://youtube.com/watch?v=...", required: true },
            { name: "videoTitle", label: "今回の動画タイトル", placeholder: "例: 【永久保存版】ChatGPT副業で月10万円稼ぐ完全ロードマップ" },
            { name: "thumbnailText", label: "サムネ文言", placeholder: "例: 月10万円" },
            { name: "topic", label: "動画のテーマ", placeholder: "例: ChatGPT副業で月10万円稼ぐ方法" },
            { name: "duration", label: "動画の長さ（分）", placeholder: "10", type: "number" },
            { name: "targetWordCount", label: "目標文字数", placeholder: "8000", type: "number" },
            { name: "target", label: "ターゲット視聴者", placeholder: "例: 20-40代、副業に興味がある会社員" },
            { name: "channelStyle", label: "チャンネルスタイル", placeholder: "例: 教育系、エンタメ系、Vlog系" },
            { name: "hookStyle", label: "冒頭フックのスタイル", placeholder: "例: 衝撃の事実→共感→解決の約束" },
            { name: "tone", label: "トーン", placeholder: "例: テンポよくエネルギッシュ" },
        ]
    },
    "/studio/short-script": {
        title: "ショート動画台本",
        description: "TikTok/Shorts/Reels用の100万再生を狙うバイラル台本",
        icon: FileVideo,
        gradient: "from-pink-500 to-orange-500",
        fields: [
            { name: "topic", label: "動画のテーマ *", placeholder: "例: 朝5時起きを30日続けた結果", required: true },
            {
                name: "platform", label: "プラットフォーム", placeholder: "", options: [
                    { value: "tiktok", label: "TikTok" },
                    { value: "shorts", label: "YouTube Shorts" },
                    { value: "reels", label: "Instagram Reels" },
                ]
            },
            {
                name: "hookType", label: "フック種類", placeholder: "", options: [
                    { value: "number", label: "数字インパクト（99%が知らない）" },
                    { value: "question", label: "問いかけ（〜してませんか？）" },
                    { value: "shock", label: "衝撃事実（〜だった）" },
                    { value: "story", label: "ストーリー（私が〜した結果）" },
                ]
            },
            { name: "cta", label: "CTA（行動喚起）", placeholder: "例: フォローして続きを見る" },
            { name: "referenceUrl", label: "参考動画URL（任意）", placeholder: "https://..." },
            { name: "tone", label: "トーン", placeholder: "例: カジュアル・共感" },
        ]
    },
    "/studio/video-clip": {
        title: "動画切り抜き分析",
        description: "長尺動画からバズるショートクリップをAIが提案",
        icon: Scissors,
        gradient: "from-orange-500 to-yellow-500",
        fields: [
            { name: "transcript", label: "動画の文字起こし/概要 *", placeholder: "動画の内容を入力してください...", required: true, rows: 6 },
            { name: "clipCount", label: "提案クリップ数", placeholder: "5", type: "number" },
            {
                name: "clipPurpose", label: "切り抜きの目的", placeholder: "", options: [
                    { value: "awareness", label: "チャンネル認知拡大" },
                    { value: "viral", label: "バイラル狙い" },
                    { value: "education", label: "教育・学びのシェア" },
                    { value: "entertainment", label: "エンタメ・笑い" },
                ]
            },
            { name: "targetAudience", label: "ターゲット層", placeholder: "例: 新規視聴者、既存ファン" },
            { name: "maxLength", label: "最大長さ（秒）", placeholder: "60", type: "number" },
        ]
    },
    "/studio/social-post": {
        title: "X・Threads投稿作成",
        description: "エンゲージメント率10%以上を狙う5パターン生成",
        icon: Twitter,
        gradient: "from-sky-500 to-blue-500",
        fields: [
            { name: "topic", label: "投稿のテーマ *", placeholder: "例: AIツールの活用法", required: true },
            {
                name: "platform", label: "プラットフォーム", placeholder: "", options: [
                    { value: "x", label: "X (Twitter)" },
                    { value: "threads", label: "Threads" },
                ]
            },
            { name: "accountTone", label: "アカウントのトーン", placeholder: "例: カジュアルで親しみやすい、専門家っぽく" },
            { name: "pastBuzz", label: "過去のバズ投稿（参考）", placeholder: "例: 前回は○○ネタで1万いいね" },
            { name: "postTime", label: "投稿予定時間帯", placeholder: "例: 19:00-21:00" },
            { name: "hashtags", label: "希望ハッシュタグ", placeholder: "例: #AI #生産性向上" },
        ]
    },
    "/studio/note-writing": {
        title: "note文章ライティング",
        description: "売れるnote記事をマークダウン形式で生成",
        icon: FileText,
        gradient: "from-teal-500 to-green-500",
        fields: [
            { name: "topic", label: "記事のテーマ *", placeholder: "例: フリーランスになって3年で学んだこと", required: true },
            {
                name: "articleType", label: "記事タイプ", placeholder: "", options: [
                    { value: "free", label: "無料記事（フォロワー獲得）" },
                    { value: "paid", label: "有料記事（収益化）" },
                ]
            },
            { name: "target", label: "ターゲット読者", placeholder: "例: 副業を考えている会社員" },
            { name: "outline", label: "希望構成", placeholder: "例: 体験談→気づき→具体的方法→まとめ" },
            { name: "quote", label: "引用/参考情報", placeholder: "例: 〇〇の本から引用したい" },
            { name: "wordCount", label: "目標文字数", placeholder: "2000", type: "number" },
        ]
    },
    "/studio/presentation": {
        title: "プレゼン資料作成",
        description: "スライド構成・デザイン・スピーカーノートを完全設計",
        icon: Presentation,
        gradient: "from-amber-500 to-orange-500",
        fields: [
            { name: "topic", label: "プレゼンのテーマ *", placeholder: "例: Q4マーケティング戦略提案", required: true },
            { name: "duration", label: "発表時間（分）", placeholder: "15", type: "number" },
            { name: "audience", label: "プレゼン対象", placeholder: "例: 経営陣、顧客、チームメンバー" },
            { name: "slideCount", label: "スライド枚数目安", placeholder: "10", type: "number" },
            {
                name: "tool", label: "使用ツール", placeholder: "", options: [
                    { value: "powerpoint", label: "PowerPoint" },
                    { value: "keynote", label: "Keynote" },
                    { value: "googleslides", label: "Google Slides" },
                    { value: "canva", label: "Canva" },
                ]
            },
            { name: "designStyle", label: "デザインスタイル", placeholder: "例: シンプル＆モダン、ダーク、カラフル" },
        ]
    },

    // ==========================================
    // IMAGE CREATION TOOLS (4, excluding thumbnail)
    // ==========================================
    "/studio/thumbnail": {
        title: "YouTubeサムネイル",
        description: "6ステップでプロ級サムネイルを生成",
        icon: ImageIcon,
        gradient: "from-purple-500 to-pink-500",
        fields: [] // Handled by ThumbnailWorkflow
    },
    "/studio/eyecatch-prompt": {
        title: "アイキャッチプロンプト作成",
        description: "SEO記事のHTMLから画像生成AIプロンプトを作成",
        icon: Sparkles,
        gradient: "from-violet-500 to-purple-500",
        fields: [] // Handled by EyecatchPromptWorkflow
    },
    "/studio/insta-story": {
        title: "インスタストーリーズ",
        description: "エンゲージメント最大化のストーリーズシリーズ設計",
        icon: Instagram,
        gradient: "from-fuchsia-500 to-pink-500",
        fields: [] // Handled by InstaStoryWorkflow
    },
    "/studio/line-banner": {
        title: "LINEバナー作成",
        description: "タップ率最大化のリッチメニュー/メッセージ設計",
        icon: MessageSquare,
        gradient: "from-green-500 to-emerald-500",
        fields: [
            { name: "title", label: "バナーのメッセージ *", placeholder: "例: 今だけ限定30%OFF", required: true },
            { name: "campaignDetails", label: "キャンペーン詳細", placeholder: "例: 12/25まで、先着100名" },
            {
                name: "bannerSize", label: "バナーサイズ", placeholder: "", options: [
                    { value: "richMenu", label: "リッチメニュー（2500×1686px）" },
                    { value: "richMessage", label: "リッチメッセージ（1040×1040px）" },
                    { value: "card", label: "カードタイプ（1024×520px）" },
                ]
            },
            { name: "buttonText", label: "ボタンテキスト", placeholder: "例: 今すぐ予約、詳しく見る" },
        ]
    },
    "/studio/note-thumbnail": {
        title: "note/Brain/Tipsサムネイル",
        description: "コンテンツ販売プラットフォーム用の売れるサムネイル設計",
        icon: FileText,
        gradient: "from-emerald-500 to-teal-500",
        fields: [
            { name: "title", label: "コンテンツタイトル *", placeholder: "例: 月収100万円を達成した具体的な方法", required: true },
            {
                name: "platform", label: "プラットフォーム", placeholder: "", options: [
                    { value: "note", label: "note" },
                    { value: "brain", label: "Brain" },
                    { value: "tips", label: "Tips" },
                ]
            },
            { name: "priceRange", label: "想定価格帯", placeholder: "例: 980円、4,980円" },
            { name: "target", label: "ターゲット顧客", placeholder: "例: 副業・スキルアップ志向の会社員" },
            { name: "sellingPoint", label: "売り文句・実績", placeholder: "例: 3ヶ月で100部販売、購入者満足度98%" },
        ]
    },

    // ==========================================
    // COPYWRITING TOOLS (3)
    // ==========================================
    "/studio/sales-letter": {
        title: "セールスレター",
        description: "AIDA/PAS/QUESTフレームワーク対応の成約するレター",
        icon: Mail,
        gradient: "from-rose-500 to-red-500",
        fields: [
            { name: "product", label: "商品・サービス名 *", placeholder: "例: オンライン講座「〇〇マスター」", required: true },
            { name: "target", label: "ターゲット顧客", placeholder: "例: 30-50代経営者、副業を考えている会社員" },
            {
                name: "framework", label: "使用フレームワーク", placeholder: "", options: [
                    { value: "aida", label: "AIDA（注意→興味→欲求→行動）" },
                    { value: "pas", label: "PAS（問題→煽り→解決）" },
                    { value: "quest", label: "QUEST（適格→理解→教育→刺激→移行）" },
                ]
            },
            { name: "evidence", label: "証拠・実績", placeholder: "例: 受講者300名、成功率85%、売上1億円", rows: 2 },
            { name: "painPoints", label: "痛みポイント", placeholder: "例: 時間がない、成果が出ない、やり方がわからない" },
            { name: "priceStrategy", label: "価格戦略", placeholder: "例: 通常価格10万円→特別価格5万円" },
        ]
    },
    "/studio/lp-writing": {
        title: "LPライティング",
        description: "CVR5%以上を狙うLP構成・コピー完全設計",
        icon: Layout,
        gradient: "from-yellow-500 to-amber-500",
        fields: [
            // Handled by LPWorkflow now, fields redundant but kept for meta if needed
        ]
    },
    "/studio/vsl-writing": {
        title: "VSLライティング",
        description: "視聴完了率80%・成約率3%を狙うビデオセールス台本",
        icon: MonitorPlay,
        gradient: "from-violet-500 to-purple-500",
        fields: [
            { name: "product", label: "商品・サービス *", placeholder: "例: ダイエットプログラム", required: true },
            { name: "target", label: "ターゲット", placeholder: "例: 40代男性、健康に不安を感じている" },
            { name: "duration", label: "動画の長さ（分）", placeholder: "15", type: "number" },
            { name: "storyArc", label: "ストーリーアーク", placeholder: "例: どん底→気づき→変革→成功" },
            { name: "emotionalCurve", label: "感情曲線", placeholder: "例: 共感→焦り→希望→確信→行動" },
            { name: "brollNotes", label: "使用したいB-roll素材", placeholder: "例: 実績グラフ、お客様インタビュー" },
        ]
    },

    // ==========================================
    // STRATEGY TOOLS (3)
    // ==========================================
    "/studio/product-design": {
        title: "商品・サービス設計",
        description: "売れる商品アイデアを3案比較表付きで生成",
        icon: Package,
        gradient: "from-cyan-500 to-blue-500",
        fields: [
            { name: "niche", label: "ニッチ/市場 *", placeholder: "例: 副業支援、美容、教育", required: true },
            { name: "target", label: "ターゲット顧客", placeholder: "例: 30-50代会社員" },
            { name: "marketAnalysis", label: "市場分析（知っていれば）", placeholder: "例: 市場規模○○億円、成長率○%", rows: 2 },
            { name: "competitors", label: "競合情報", placeholder: "例: A社（○万円）、B社（○万円）" },
            { name: "budget", label: "想定価格帯", placeholder: "例: 3万円〜10万円" },
        ]
    },
    "/studio/funnel-design": {
        title: "マーケティングファネル設計",
        description: "認知→購入→リピートの完全自動化ファネル設計",
        icon: GitBranch,
        gradient: "from-lime-500 to-green-500",
        fields: [
            { name: "product", label: "最終商品 *", placeholder: "例: 高額コンサルティング", required: true },
            { name: "entryPoint", label: "入口商品/無料オファー", placeholder: "例: 無料PDF、ウェビナー" },
            { name: "budget", label: "月間広告予算", placeholder: "例: 月10万円" },
            { name: "existingList", label: "既存リスト数", placeholder: "例: LINE 500人、メール 1000人" },
            { name: "tools", label: "使用可能ツール", placeholder: "例: LINE、メール、LP、決済システム" },
        ]
    },
    "/studio/curriculum": {
        title: "カリキュラム作成",
        description: "修了率80%以上の完全なコース構成を設計",
        icon: Cpu,
        gradient: "from-slate-500 to-gray-600",
        fields: [
            { name: "topic", label: "コースのテーマ *", placeholder: "例: Webデザイン入門", required: true },
            {
                name: "learnerLevel", label: "受講者レベル", placeholder: "", options: [
                    { value: "beginner", label: "初心者（完全未経験）" },
                    { value: "intermediate", label: "中級者（基礎知識あり）" },
                    { value: "advanced", label: "上級者（実務経験あり）" },
                ]
            },
            { name: "weeks", label: "期間（週）", placeholder: "4", type: "number" },
            { name: "completionCriteria", label: "修了条件", placeholder: "例: 全レッスン完了＋課題提出" },
            {
                name: "materialFormat", label: "教材形式", placeholder: "", options: [
                    { value: "video", label: "動画メイン" },
                    { value: "text", label: "テキストメイン" },
                    { value: "hybrid", label: "動画＋テキスト＋ワーク" },
                    { value: "live", label: "ライブ講義" },
                ]
            },
        ]
    },
};

export default function AIStudioPage() {
    const { toast } = useToast();
    const [isPending, startTransition] = useTransition();
    const [result, setResult] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);
    const [activeTool, setActiveTool] = useState("/studio/seo");

    // Access control state
    const [accessStatus, setAccessStatus] = useState<StudioAccessResult | null>(null);
    const [isCheckingAccess, setIsCheckingAccess] = useState(true);

    // Check access on mount
    useEffect(() => {
        const checkAccess = async () => {
            setIsCheckingAccess(true);
            try {
                const result = await checkStudioAccess();
                setAccessStatus(result);
            } catch (err) {
                setAccessStatus({
                    hasAccess: false,
                    expiresAt: null,
                    daysRemaining: null,
                    isExpired: false,
                    message: "アクセス確認中にエラーが発生しました",
                });
            } finally {
                setIsCheckingAccess(false);
            }
        };
        checkAccess();
    }, []);

    const currentMeta = toolMeta[activeTool] || toolMeta["/studio/seo"];
    const Icon = currentMeta.icon;

    // Check if thumbnail tool is selected
    const isThumbnailTool = activeTool === "/studio/thumbnail";
    // Check if script tool is selected
    const isScriptTool = activeTool === "/studio/script";
    // Check if SEO tool is selected
    const isSeoTool = activeTool === "/studio/seo";

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

    const downloadResult = () => {
        if (result) {
            const blob = new Blob([result], { type: "text/markdown" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `${currentMeta.title}_${Date.now()}.md`;
            a.click();
            URL.revokeObjectURL(url);
        }
    };

    // Loading state
    if (isCheckingAccess) {
        return (
            <div className="flex items-center justify-center h-[calc(100vh-8rem)]">
                <div className="text-center space-y-4">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
                    <p className="text-muted-foreground">アクセス確認中...</p>
                </div>
            </div>
        );
    }

    // Access denied state
    if (!accessStatus?.hasAccess) {
        return (
            <div className="flex items-center justify-center h-[calc(100vh-8rem)]">
                <Card className="max-w-md w-full">
                    <CardHeader className="text-center">
                        <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-destructive/10 flex items-center justify-center">
                            <AlertCircle className="h-6 w-6 text-destructive" />
                        </div>
                        <CardTitle>アクセスできません</CardTitle>
                        <CardDescription>
                            {accessStatus?.message || "AI Studioへのアクセス権がありません"}
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="text-center">
                        {accessStatus?.isExpired && (
                            <p className="text-sm text-muted-foreground">
                                利用期限が切れています。管理者にお問い合わせください。
                            </p>
                        )}
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="flex h-screen bg-gradient-to-br from-background via-background to-muted/20">
            {/* Subscription Info Bar */}
            {accessStatus?.daysRemaining !== null && accessStatus.daysRemaining <= 30 && (
                <div className="fixed top-0 left-0 right-0 z-50 bg-amber-500/90 text-white py-2 px-4 text-center text-sm">
                    <Clock className="inline h-4 w-4 mr-2" />
                    残り{accessStatus.daysRemaining}日で利用期限が切れます
                </div>
            )}

            {/* Sidebar - Limited based on role */}
            <StudioToolSidebar
                activeTool={activeTool}
                onToolChange={(tool) => {
                    setActiveTool(tool);
                    setResult(null);
                    setError(null);
                }}
                allowedTools={accessStatus?.role === 'admin' ? ADMIN_ALLOWED_TOOLS : STUDENT_ALLOWED_TOOLS}
                isAdmin={accessStatus?.role === 'admin'}
            />

            {/* Main Content */}
            <div className="flex-1 overflow-auto p-6">
                {/* Theme Customizer */}
                <ThemeCustomizer />

                {/* Content Area */}
                {activeTool === "/studio/thumbnail" && (
                    <div className="max-w-6xl mx-auto">
                        <ThumbnailWorkflow
                            onPromptGenerated={(prompt) => console.log("Prompt:", prompt)}
                            onError={(msg) => setError(msg)}
                        />
                    </div>
                )}

                {activeTool === "/studio/script" && (
                    <div className="max-w-4xl mx-auto">
                        <YouTubeScriptWorkflow onError={(msg) => setError(msg)} />
                    </div>
                )}

                {activeTool === "/studio/seo" && (
                    <div className="max-w-5xl mx-auto">
                        <SEOWorkflow onError={(msg) => setError(msg)} />
                    </div>
                )}

                {activeTool === "/studio/short-script" && (
                    <div className="max-w-5xl mx-auto">
                        <ShortScriptWorkflow />
                    </div>
                )}

                {activeTool === "/studio/social-post" && (
                    <div className="max-w-4xl mx-auto">
                        <SocialPostWorkflow />
                    </div>
                )}

                {activeTool === "/studio/note-writing" && (
                    <div className="max-w-4xl mx-auto">
                        <NoteWritingWorkflow />
                    </div>
                )}

                {activeTool === "/studio/sales-letter" && (
                    <div className="max-w-4xl mx-auto">
                        <CopywritingWorkflow type="sales-letter" />
                    </div>
                )}

                {activeTool === "/studio/lp-writing" && (
                    <div className="max-w-6xl mx-auto">
                        <LPWorkflow />
                    </div>
                )}

                {activeTool === "/studio/vsl-writing" && (
                    <div className="max-w-6xl mx-auto">
                        <VSLWorkflow />
                    </div>
                )}

                {activeTool === "/studio/line-banner" && (
                    <div className="max-w-4xl mx-auto">
                        <LineBannerWorkflow />
                    </div>
                )}

                {activeTool === "/studio/note-thumbnail" && (
                    <div className="max-w-4xl mx-auto">
                        <NoteThumbnailWorkflow />
                    </div>
                )}

                {activeTool === "/studio/eyecatch-prompt" && (
                    <div className="max-w-4xl mx-auto">
                        <EyecatchPromptWorkflow onError={(msg) => setError(msg)} />
                    </div>
                )}

                {activeTool === "/studio/insta-story" && (
                    <div className="max-w-4xl mx-auto">
                        <InstaStoryWorkflow />
                    </div>
                )}

                {activeTool === "/studio/video-clip" && (
                    <div className="max-w-6xl mx-auto">
                        <VideoClipWorkflow />
                    </div>
                )}

                {/* Generic Tools (Eyecatch, Insta Story, etc.) */}
                {!["/studio/thumbnail", "/studio/script", "/studio/seo", "/studio/short-script", "/studio/social-post", "/studio/note-writing", "/studio/sales-letter", "/studio/lp-writing", "/studio/vsl-writing", "/studio/line-banner", "/studio/note-thumbnail", "/studio/eyecatch-prompt", "/studio/insta-story", "/studio/video-clip"].includes(activeTool) && (
                    <div className="max-w-4xl mx-auto space-y-6">
                        {/* Header */}
                        <div className="flex items-center gap-4">
                            <div className={`p-3 rounded-xl bg-gradient-to-br ${currentMeta.gradient} text-white shadow-lg`}>
                                <Icon className="w-6 h-6" />
                            </div>
                            <div>
                                <h1 className="text-2xl font-bold tracking-tight">{currentMeta.title}</h1>
                                <p className="text-muted-foreground text-sm">{currentMeta.description}</p>
                            </div>
                        </div>

                        {/* Form */}
                        <Card className="border-border/50 shadow-sm bg-white/80 backdrop-blur-sm">
                            <form action={handleSubmit}>
                                <input type="hidden" name="type" value={activeTool.split("/").pop()} />
                                <input type="hidden" name="toolPath" value={activeTool} />
                                <CardContent className="p-6 space-y-4">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {currentMeta.fields.map((field, i) => (
                                            <div key={field.name} className={`space-y-2 ${i === 0 || field.rows ? "md:col-span-2" : ""}`}>
                                                <Label className="text-sm font-medium">
                                                    {field.label}
                                                </Label>
                                                {field.options ? (
                                                    <Select name={field.name} defaultValue={field.options[0].value}>
                                                        <SelectTrigger>
                                                            <SelectValue />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            {field.options.map(opt => (
                                                                <SelectItem key={opt.value} value={opt.value}>
                                                                    {opt.label}
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                ) : field.rows ? (
                                                    <Textarea
                                                        name={field.name}
                                                        placeholder={field.placeholder}
                                                        required={field.required}
                                                        rows={field.rows}
                                                        className="resize-none"
                                                    />
                                                ) : (
                                                    <Input
                                                        name={field.name}
                                                        type={field.type || "text"}
                                                        placeholder={field.placeholder}
                                                        required={field.required}
                                                    />
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                    <Button
                                        disabled={isPending}
                                        className={`w-full mt-4 bg-gradient-to-r ${currentMeta.gradient} hover:opacity-90 text-white shadow-lg transition-all`}
                                    >
                                        <Sparkles className="w-4 h-4 mr-2" />
                                        {isPending ? "生成中..." : "AIで生成する"}
                                    </Button>
                                </CardContent>
                            </form>
                        </Card>

                        {/* Output */}
                        {(result || isPending || error) && (
                            <div className="space-y-6">
                                {/* Loading State */}
                                {isPending && (
                                    <div className="flex flex-col items-center justify-center p-12 text-center space-y-4 bg-white/50 backdrop-blur-sm rounded-xl border border-dashed">
                                        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                                        <p className="text-muted-foreground animate-pulse">
                                            AI が最高の結果を生成しています...<br />
                                            <span className="text-xs">※高品質な出力のため、30秒〜1分ほどかかることがあります</span>
                                        </p>
                                    </div>
                                )}

                                {/* Error State */}
                                {error && (
                                    <div className="p-6 text-red-500 text-center bg-red-50 border border-red-200 rounded-xl">
                                        {error}
                                    </div>
                                )}

                                {/* Result State with Refinement */}
                                {result && !isPending && (
                                    <div className="animate-in fade-in slide-in-from-bottom-4">
                                        <RefinementArea
                                            initialContent={result}
                                            contextData={{
                                                tool: activeTool,
                                                toolName: currentMeta.title,
                                                // Pass form data context if possible, but for generic we keep it simple or extract from last submission if we had state
                                            }}
                                            onContentUpdate={(newContent) => setResult(newContent)}
                                            contentType="text"
                                        />
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
