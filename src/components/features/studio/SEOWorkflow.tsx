"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import {
    Loader2, Copy, Download, ArrowLeft, ArrowRight, Check, Edit3, RefreshCw,
    Search, Globe, Users, Lightbulb, FileText, PenTool, Link as LinkIcon, MessageSquare
} from "lucide-react";
import {
    SEOWorkflowState,
    SearchIntentAnalysis,
    ArticleStructureAnalysis,
    ReaderAnalysis,
    ImprovementSuggestions,
    ArticleOutline,
    GeneratedArticle,
    Tone,
    ReaderLevel,
    TONE_OPTIONS,
    READER_LEVEL_OPTIONS,
    initialSEOState,
    InternalLink
} from "@/types/seo-types";
import { saveCreation } from "@/app/actions/history";
import { RefinementArea } from "@/components/features/studio/RefinementArea";

const STEPS = [
    { num: 1, label: "キーワード・参考記事", icon: Search },
    { num: 2, label: "構成分解", icon: FileText },
    { num: 3, label: "読者分析", icon: Users },
    { num: 4, label: "改善点", icon: Lightbulb },
    { num: 5, label: "記事構成", icon: FileText },
    { num: 6, label: "ライティング", icon: PenTool },
];

interface SEOWorkflowProps {
    onError?: (message: string) => void;
}

export function SEOWorkflow({ onError }: SEOWorkflowProps) {
    const [state, setState] = useState<SEOWorkflowState>(initialSEOState);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isEditingReaderAnalysis, setIsEditingReaderAnalysis] = useState(false);
    const [isEditingImprovements, setIsEditingImprovements] = useState(false);
    const [showRegenerateStep2, setShowRegenerateStep2] = useState(false);
    const [showRegenerateStep3, setShowRegenerateStep3] = useState(false);
    const [showRegenerateStep4, setShowRegenerateStep4] = useState(false);
    const [showRegenerateStep5, setShowRegenerateStep5] = useState(false);
    const [outputFormat, setOutputFormat] = useState<'html' | 'markdown' | 'plaintext'>('html');

    // Scroll to top whenever step changes
    useEffect(() => {
        window.scrollTo({ top: 0, behavior: 'instant' }); // Use 'instant' to prevent weird visual jumps during render
    }, [state.step]);

    const updateState = (updates: Partial<SEOWorkflowState>) => {
        setState(prev => ({ ...prev, ...updates }));
    };

    const setErrorMessage = (msg: string) => {
        setError(msg);
        onError?.(msg);
    };

    // Fetch top articles using Tavily API and scrape full content
    const handleFetchTopArticles = async () => {
        if (!state.primaryKeyword.trim()) {
            setErrorMessage("メインキーワードを入力してください");
            return;
        }
        setLoading(true);
        setError(null);

        try {
            // Step 1: Get top article URLs from Tavily
            const response = await fetch("/api/seo/fetch-articles", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ keyword: state.primaryKeyword, count: 3 }),
            });
            const data = await response.json();

            if (!data.success) {
                setErrorMessage(data.error || "上位記事の取得に失敗しました");
                return;
            }

            const initialArticles = data.data.map((a: { url: string; title: string; snippet: string }) => ({
                url: a.url,
                title: a.title || "",
                content: a.snippet || "",
                h2Sections: [],
            }));

            const urls = initialArticles.map((a: { url: string }) => a.url);
            updateState({ referenceUrls: urls, referenceArticles: initialArticles });

            // Step 2: Scrape full content for each article
            const scrapedArticles = await Promise.all(
                initialArticles.map(async (article: { url: string; title: string; content: string }) => {
                    try {
                        const scrapeResponse = await fetch("/api/seo/scrape", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ url: article.url }),
                        });
                        const scrapeData = await scrapeResponse.json();

                        if (scrapeData.success) {
                            return {
                                url: article.url,
                                title: scrapeData.data.title || article.title,
                                content: scrapeData.data.content || article.content,
                                h2Sections: scrapeData.data.h2Sections || [],
                            };
                        }
                    } catch (e) {
                        console.error("Scraping failed for:", article.url, e);
                    }
                    // Return original article if scraping fails
                    return article;
                })
            );

            updateState({ referenceArticles: scrapedArticles });
        } catch (e: unknown) {
            setErrorMessage(e instanceof Error ? e.message : "上位記事の取得に失敗しました");
        } finally {
            setLoading(false);
        }
    };

    // Step 1: Analyze search intent from reference articles
    const handleAnalyzeSearchIntent = async () => {
        if (!state.primaryKeyword.trim()) {
            setErrorMessage("メインキーワードを入力してください");
            return;
        }
        setLoading(true);
        setError(null);

        try {
            const mockArticles = state.referenceUrls.map((url, i) => ({
                title: `参考記事${i + 1}`,
                h2List: ["導入", "方法", "メリット", "注意点", "まとめ"],
            }));

            const response = await fetch("/api/seo/search-intent", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    primaryKeyword: state.primaryKeyword,
                    referenceArticles: mockArticles,
                }),
            });
            const data = await response.json();
            if (data.success) {
                updateState({ searchIntentAnalysis: data.data as SearchIntentAnalysis });
            } else {
                setErrorMessage(data.error || "検索意図の分析に失敗しました");
            }
        } catch (e: unknown) {
            setErrorMessage(e instanceof Error ? e.message : "検索意図の分析に失敗しました");
        } finally {
            setLoading(false);
        }
    };

    // Confirm Step 1 and move to Step 2
    const handleConfirmStep1 = async () => {
        setLoading(true);
        setError(null);

        try {
            const analyses: ArticleStructureAnalysis[] = [];
            const errors: string[] = [];

            // If we have saved reference articles with content, use those
            const articlesToAnalyze = state.referenceArticles.length > 0
                ? state.referenceArticles
                : state.referenceUrls.map((url, i) => ({
                    url,
                    title: `${state.primaryKeyword}に関する参考記事${i + 1}`,
                    content: `この記事は${state.primaryKeyword}について解説しています。URL: ${url}`,
                    h2Sections: [],
                }));

            for (const article of articlesToAnalyze) {
                try {
                    const response = await fetch("/api/seo/structure", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            articleTitle: article.title || `${state.primaryKeyword}に関する記事`,
                            articleContent: article.content || `この記事は${state.primaryKeyword}について解説しています。`,
                        }),
                    });
                    const data = await response.json();
                    if (data.success) {
                        analyses.push(data.data as ArticleStructureAnalysis);
                    } else {
                        errors.push(`${article.title || '記事'}: ${data.error}`);
                    }
                } catch (e: any) {
                    errors.push(`${article.title || '記事'}: ${e.message}`);
                }
            }

            if (analyses.length === 0) {
                // If all failed
                setErrorMessage(`全ての記事の構成分解に失敗しました。\n${errors.join('\n')}`);
                return;
            }

            if (errors.length > 0) {
                // Partial failure - warn but proceed
                console.warn("Some analyses failed:", errors);
                // Optionally showing a toast or non-blocking error here would be good, 
                // but for now we proceed with what we have.
            }

            updateState({
                step: 2,
                step1Confirmed: true,
                structureAnalyses: analyses,
            });
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } catch (e: unknown) {
            setErrorMessage(e instanceof Error ? e.message : "構成分解に失敗しました");
        } finally {
            setLoading(false);
        }
    };

    // Confirm Step 2 and move to Step 3
    const handleConfirmStep2 = async () => {
        setLoading(true);
        setError(null);

        try {
            const articleSummary = state.structureAnalyses
                .map(a => a.h2Analyses.map(h => h.h2Text).join(", "))
                .join("\n");

            const response = await fetch("/api/seo/reader", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    primaryKeyword: state.primaryKeyword,
                    articleSummary,
                    searchIntentAnalysis: state.searchIntentAnalysis,
                }),
            });
            const data = await response.json();
            if (data.success) {
                updateState({
                    step: 3,
                    step2Confirmed: true,
                    readerAnalysis: data.data as ReaderAnalysis,
                });
                window.scrollTo({ top: 0, behavior: 'smooth' });
            } else {
                setErrorMessage(data.error || "読者分析に失敗しました");
            }
        } catch (e: unknown) {
            setErrorMessage(e instanceof Error ? e.message : "読者分析に失敗しました");
        } finally {
            setLoading(false);
        }
    };

    // Confirm Step 3 and move to Step 4
    const handleConfirmStep3 = async () => {
        setLoading(true);
        setError(null);

        try {
            const response = await fetch("/api/seo/improvements", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    readerAnalysis: state.readerAnalysis,
                    structureAnalyses: state.structureAnalyses,
                }),
            });
            const data = await response.json();
            if (data.success) {
                const improvements = data.data as ImprovementSuggestions;
                // Initialize with all axes selected by default
                const selectedAxes = (improvements.axes || []).map((_, i) => ({
                    axisIndex: i,
                    additionSelected: true,
                    removalSelected: true,
                }));
                updateState({
                    step: 4,
                    step3Confirmed: true,
                    improvements,
                    selectedImprovements: { selectedAxes },
                });
                window.scrollTo({ top: 0, behavior: 'smooth' });
            } else {
                setErrorMessage(data.error || "改善点の分析に失敗しました");
            }
        } catch (e: unknown) {
            setErrorMessage(e instanceof Error ? e.message : "改善点の分析に失敗しました");
        } finally {
            setLoading(false);
        }
    };

    // Toggle improvement selection (axis-based)
    const toggleAxisAddition = (axisIndex: number) => {
        const currentAxes = state.selectedImprovements?.selectedAxes || [];
        const newAxes = currentAxes.map(ax =>
            ax.axisIndex === axisIndex
                ? { ...ax, additionSelected: !ax.additionSelected }
                : ax
        );
        updateState({
            selectedImprovements: { ...state.selectedImprovements!, selectedAxes: newAxes },
        });
    };

    const toggleAxisRemoval = (axisIndex: number) => {
        const currentAxes = state.selectedImprovements?.selectedAxes || [];
        const newAxes = currentAxes.map(ax =>
            ax.axisIndex === axisIndex
                ? { ...ax, removalSelected: !ax.removalSelected }
                : ax
        );
        updateState({
            selectedImprovements: { ...state.selectedImprovements!, selectedAxes: newAxes },
        });
    };

    // Confirm Step 4 and move to Step 5
    const handleConfirmStep4 = async () => {
        setLoading(true);
        setError(null);

        try {
            const titleAnalysis = state.structureAnalyses[0]?.titleAnalysis;
            const h2Structure = state.structureAnalyses.flatMap(a => a.h2Analyses);

            const response = await fetch("/api/seo/outline", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    primaryKeyword: state.primaryKeyword,
                    secondaryKeywords: state.secondaryKeywords.split(",").map(k => k.trim()).filter(Boolean),
                    readerAnalysis: state.readerAnalysis,
                    titleAnalysis,
                    h2Structure,
                    selectedImprovements: state.selectedImprovements,
                    improvements: state.improvements,
                    wordCountMin: state.wordCountMin,
                    wordCountMax: state.wordCountMax,
                }),
            });
            const data = await response.json();
            if (data.success) {
                updateState({
                    step: 5,
                    step4Confirmed: true,
                    outline: data.data as ArticleOutline,
                });
                window.scrollTo({ top: 0, behavior: 'smooth' });
            } else {
                setErrorMessage(data.error || "記事構成の生成に失敗しました");
            }
        } catch (e: unknown) {
            setErrorMessage(e instanceof Error ? e.message : "記事構成の生成に失敗しました");
        } finally {
            setLoading(false);
        }
    };

    // Select title
    const selectTitle = (index: number) => {
        if (state.outline) {
            updateState({
                outline: { ...state.outline, selectedTitleIndex: index },
            });
        }
    };

    // Confirm Step 5 (Outline) - Just mark as confirmed to show Link Settings
    const handleConfirmStep5 = () => {
        updateState({ step5Confirmed: true });
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };


    // Fetch Internal Links - now auto-suggests based on article structure
    const handleFetchInternalLinks = async () => {
        if (!state.internalLinksUrl.trim()) return;

        setLoading(true);
        try {
            // Get the selected title and outline sections for relevance filtering
            const selectedTitle = state.outline?.titleCandidates?.[state.outline?.selectedTitleIndex]?.title || state.outline?.h1 || state.primaryKeyword;
            const outlineSections = state.outline?.sections?.map(s => ({
                h2: s.h2,
                h3List: s.h3List
            })) || [];

            const response = await fetch("/api/seo/fetch-links", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    url: state.internalLinksUrl,
                    keyword: state.primaryKeyword,
                    articleTitle: selectedTitle,
                    outlineSections: outlineSections
                }),
            });
            const data = await response.json();
            if (data.success) {
                updateState({
                    internalLinks: data.data,
                    // Default select all suggested (since they are already filtered by AI)
                    selectedInternalLinks: data.data
                });
            } else {
                setErrorMessage(data.error || "内部リンクの取得に失敗しました");
            }
        } catch (e) {
            setErrorMessage("内部リンクの取得に失敗しました");
        } finally {
            setLoading(false);
        }
    };

    const toggleInternalLink = (link: InternalLink) => {
        const selected = state.selectedInternalLinks || [];
        const exists = selected.find(l => l.url === link.url);

        if (exists) {
            updateState({
                selectedInternalLinks: selected.filter(l => l.url !== link.url)
            });
        } else {
            updateState({
                selectedInternalLinks: [...selected, link]
            });
        }
    };

    // Generate Draft (Step 6)
    const handleGenerateDraft = async () => {
        setLoading(true);
        setError(null);

        try {
            const response = await fetch("/api/seo/draft", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    primaryKeyword: state.primaryKeyword,
                    secondaryKeywords: state.secondaryKeywords.split(",").map(k => k.trim()).filter(Boolean),
                    outline: state.outline,
                    readerAnalysis: state.readerAnalysis,
                    tone: state.tone,
                    wordCountMin: state.wordCountMin,
                    wordCountMax: state.wordCountMax,
                    authorName: state.authorName,
                    authorTitle: state.authorTitle,
                    authorProfile: state.authorProfile,
                    ctaLink: state.ctaLink,
                    ctaText: state.ctaText,
                    referenceArticles: state.referenceArticles,
                    structureAnalyses: state.structureAnalyses,
                    internalLinks: state.selectedInternalLinks,
                    includeEyeCatch: state.includeEyeCatch,
                }),
            });
            const data = await response.json();
            if (data.success) {
                const articleData = data.data as GeneratedArticle;
                updateState({
                    step: 6,
                    generatedContent: articleData,
                });

                // Helper to save history
                try {
                    // Convert HTML to Markdown for history
                    let markdownContent = articleData.content || "";
                    markdownContent = markdownContent
                        .replace(/<h1[^>]*>(.*?)<\/h1>/g, '# $1\n')
                        .replace(/<h2[^>]*>(.*?)<\/h2>/g, '## $1\n')
                        .replace(/<h3[^>]*>(.*?)<\/h3>/g, '### $1\n')
                        .replace(/<p[^>]*>(.*?)<\/p>/g, '$1\n\n')
                        .replace(/<strong>(.*?)<\/strong>/g, '**$1**')
                        .replace(/<em>(.*?)<\/em>/g, '*$1*')
                        .replace(/<li>(.*?)<\/li>/g, '- $1\n')
                        .replace(/<ul[^>]*>|<\/ul>|<ol[^>]*>|<\/ol>/g, '\n')
                        .replace(/<[^>]+>/g, '');

                    const historyData = {
                        ...articleData,
                        content: markdownContent
                    };

                    const saveResult = await saveCreation(
                        `SEO記事: ${state.primaryKeyword}`,
                        'seo_article',
                        historyData
                    );
                    if (!saveResult.success) {
                        console.error("Failed to save history:", saveResult.error);
                        // Show error to user
                        setErrorMessage(`履歴保存エラー: ${saveResult.error}`);
                    }
                } catch (err: any) {
                    console.error("Failed to save history:", err);
                    setErrorMessage(`履歴保存例外: ${err.message}`);
                }

                window.scrollTo({ top: 0, behavior: 'smooth' });
            } else {
                setErrorMessage(data.error || "記事の生成に失敗しました");
            }
        } catch (e: unknown) {
            setErrorMessage(e instanceof Error ? e.message : "記事の生成に失敗しました");
        } finally {
            setLoading(false);
        }
    };

    const handleCopy = () => {
        if (state.generatedContent?.content) {
            let content = state.generatedContent.content;
            if (outputFormat === 'markdown') {
                // Convert HTML to Markdown (simple conversion)
                content = content
                    .replace(/<h1[^>]*>(.*?)<\/h1>/g, '# $1\n')
                    .replace(/<h2[^>]*>(.*?)<\/h2>/g, '## $1\n')
                    .replace(/<h3[^>]*>(.*?)<\/h3>/g, '### $1\n')
                    .replace(/<p[^>]*>(.*?)<\/p>/g, '$1\n\n')
                    .replace(/<strong>(.*?)<\/strong>/g, '**$1**')
                    .replace(/<em>(.*?)<\/em>/g, '*$1*')
                    .replace(/<li>(.*?)<\/li>/g, '- $1\n')
                    .replace(/<ul[^>]*>|<\/ul>|<ol[^>]*>|<\/ol>/g, '\n')
                    .replace(/<[^>]+>/g, '');
            } else if (outputFormat === 'plaintext') {
                // Convert HTML to plain text
                content = content.replace(/<[^>]+>/g, '').replace(/\n\s*\n/g, '\n\n');
            }
            navigator.clipboard.writeText(content);
        }
    };

    const handleDownload = () => {
        if (state.generatedContent?.content) {
            let content = state.generatedContent.content;
            let mimeType = 'text/html;charset=utf-8';
            let extension = 'html';

            if (outputFormat === 'markdown') {
                content = content
                    .replace(/<h1[^>]*>(.*?)<\/h1>/g, '# $1\n')
                    .replace(/<h2[^>]*>(.*?)<\/h2>/g, '## $1\n')
                    .replace(/<h3[^>]*>(.*?)<\/h3>/g, '### $1\n')
                    .replace(/<p[^>]*>(.*?)<\/p>/g, '$1\n\n')
                    .replace(/<strong>(.*?)<\/strong>/g, '**$1**')
                    .replace(/<em>(.*?)<\/em>/g, '*$1*')
                    .replace(/<li>(.*?)<\/li>/g, '- $1\n')
                    .replace(/<ul[^>]*>|<\/ul>|<ol[^>]*>|<\/ol>/g, '\n')
                    .replace(/<[^>]+>/g, '');
                mimeType = 'text/markdown;charset=utf-8';
                extension = 'md';
            } else if (outputFormat === 'plaintext') {
                content = content.replace(/<[^>]+>/g, '').replace(/\n\s*\n/g, '\n\n');
                mimeType = 'text/plain;charset=utf-8';
                extension = 'txt';
            }

            const blob = new Blob([content], { type: mimeType });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `${state.primaryKeyword.replace(/\s+/g, "_")}_article.${extension}`;
            a.click();
            URL.revokeObjectURL(url);
        }
    };

    const handleReset = () => {
        setState(initialSEOState);
        setError(null);
    };

    const goToStep = (step: 1 | 2 | 3 | 4 | 5 | 6) => {
        if (step < state.step) {
            updateState({ step });
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    };

    // Regeneration handlers with modification instructions
    const handleRegenerateStep2 = async () => {
        setLoading(true);
        setError(null);
        try {
            const analyses: ArticleStructureAnalysis[] = [];
            const articlesToAnalyze = state.referenceArticles.length > 0
                ? state.referenceArticles
                : state.referenceUrls.map((url, i) => ({
                    url,
                    title: `${state.primaryKeyword}に関する参考記事${i + 1}`,
                    content: `この記事は${state.primaryKeyword}について解説しています。URL: ${url}`,
                    h2Sections: [],
                }));

            for (const article of articlesToAnalyze) {
                const response = await fetch("/api/seo/structure", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        articleTitle: article.title || `${state.primaryKeyword}に関する記事`,
                        articleContent: article.content || "",
                        modificationInstructions: state.regenerateStep2Instructions,
                    }),
                });
                const data = await response.json();
                if (data.success) {
                    analyses.push(data.data as ArticleStructureAnalysis);
                }
            }
            updateState({ structureAnalyses: analyses, regenerateStep2Instructions: '' });
            setShowRegenerateStep2(false);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } catch (e: unknown) {
            setErrorMessage(e instanceof Error ? e.message : "再生成に失敗しました");
        } finally {
            setLoading(false);
        }
    };

    const handleRegenerateStep3 = async () => {
        setLoading(true);
        setError(null);
        try {
            const articleSummary = state.structureAnalyses
                .map(a => a.h2Analyses.map(h => h.h2Text).join(", "))
                .join("\n");

            const response = await fetch("/api/seo/reader", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    primaryKeyword: state.primaryKeyword,
                    articleSummary,
                    searchIntentAnalysis: state.searchIntentAnalysis,
                    modificationInstructions: state.regenerateStep3Instructions,
                }),
            });
            const data = await response.json();
            if (data.success) {
                updateState({ readerAnalysis: data.data as ReaderAnalysis, regenerateStep3Instructions: '' });
                setShowRegenerateStep3(false);
                window.scrollTo({ top: 0, behavior: 'smooth' });
            } else {
                setErrorMessage(data.error || "再生成に失敗しました");
            }
        } catch (e: unknown) {
            setErrorMessage(e instanceof Error ? e.message : "再生成に失敗しました");
        } finally {
            setLoading(false);
        }
    };

    const handleRegenerateStep4 = async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await fetch("/api/seo/improvements", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    readerAnalysis: state.readerAnalysis,
                    structureAnalyses: state.structureAnalyses,
                    modificationInstructions: state.regenerateStep4Instructions,
                }),
            });
            const data = await response.json();
            if (data.success) {
                const improvements = data.data as ImprovementSuggestions;
                const selectedAxes = (improvements.axes || []).map((_, i) => ({
                    axisIndex: i,
                    additionSelected: true,
                    removalSelected: true,
                }));
                updateState({
                    improvements,
                    selectedImprovements: { selectedAxes },
                    regenerateStep4Instructions: ''
                });
                setShowRegenerateStep4(false);
                window.scrollTo({ top: 0, behavior: 'smooth' });
            } else {
                setErrorMessage(data.error || "再生成に失敗しました");
            }
        } catch (e: unknown) {
            setErrorMessage(e instanceof Error ? e.message : "再生成に失敗しました");
        } finally {
            setLoading(false);
        }
    };

    const handleRegenerateStep5 = async () => {
        setLoading(true);
        setError(null);
        try {
            const titleAnalysis = state.structureAnalyses[0]?.titleAnalysis;
            const h2Structure = state.structureAnalyses.flatMap(a => a.h2Analyses);

            const response = await fetch("/api/seo/outline", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    primaryKeyword: state.primaryKeyword,
                    secondaryKeywords: state.secondaryKeywords.split(",").map(k => k.trim()).filter(Boolean),
                    readerAnalysis: state.readerAnalysis,
                    titleAnalysis,
                    h2Structure,
                    selectedImprovements: state.selectedImprovements,
                    improvements: state.improvements,
                    wordCountMin: state.wordCountMin,
                    wordCountMax: state.wordCountMax,
                    modificationInstructions: state.regenerateStep5Instructions,
                }),
            });
            const data = await response.json();
            if (data.success) {
                updateState({
                    outline: data.data as ArticleOutline,
                    regenerateStep5Instructions: ''
                });
                setShowRegenerateStep5(false);
                window.scrollTo({ top: 0, behavior: 'smooth' });
            } else {
                setErrorMessage(data.error || "再生成に失敗しました");
            }
        } catch (e: unknown) {
            setErrorMessage(e instanceof Error ? e.message : "再生成に失敗しました");
        } finally {
            setLoading(false);
        }
    };

    const progress = (state.step / 6) * 100;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold">SEO記事作成エージェント v2</h1>
                    <p className="text-muted-foreground">6段階のワークフローで高品質なSEO記事を作成</p>
                </div>
                {state.step > 1 && (
                    <Button variant="outline" size="sm" onClick={handleReset}>
                        <RefreshCw className="h-4 w-4 mr-2" />
                        やり直す
                    </Button>
                )}
            </div>

            {/* Progress */}
            <div className="space-y-2">
                <div className="flex justify-between text-xs">
                    {STEPS.map((s) => (
                        <button
                            key={s.num}
                            onClick={() => goToStep(s.num as 1 | 2 | 3 | 4 | 5 | 6)}
                            className={`flex flex-col items-center gap-1 ${state.step >= s.num ? "text-primary" : "text-muted-foreground"
                                } ${state.step > s.num ? "cursor-pointer hover:text-primary/80" : "cursor-default"}`}
                            disabled={state.step < s.num}
                        >
                            <s.icon className="h-4 w-4" />
                            <span className="hidden md:inline">{s.label}</span>
                            <span className="md:hidden">{s.num}</span>
                        </button>
                    ))}
                </div>
                <Progress value={progress} className="h-2" />
            </div>

            {/* Error display */}
            {error && (
                <div className="bg-destructive/10 text-destructive p-4 rounded-md">
                    {error}
                </div>
            )}

            {/* Step 1: Keywords & Reference Articles */}
            {state.step === 1 && (
                <div className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Search className="h-5 w-5" />
                                Step 1: キーワードと参考記事の入力
                            </CardTitle>
                            <CardDescription>
                                メインキーワードと参考にする上位記事を設定してください
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid gap-4 md:grid-cols-2">
                                <div className="space-y-2">
                                    <Label>メインキーワード *</Label>
                                    <div className="flex gap-2">
                                        <Input
                                            value={state.primaryKeyword}
                                            onChange={(e) => updateState({ primaryKeyword: e.target.value })}
                                            placeholder="例: Webデザイン 独学 始め方"
                                        />
                                        <Button
                                            variant="outline"
                                            onClick={handleFetchTopArticles}
                                            disabled={loading || !state.primaryKeyword.trim()}
                                        >
                                            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Globe className="h-4 w-4" />}
                                        </Button>
                                    </div>
                                    <p className="text-xs text-muted-foreground">
                                        ボタンをクリックで上位記事を自動取得
                                    </p>
                                </div>
                                <div className="space-y-2">
                                    <Label>サブキーワード（カンマ区切り）</Label>
                                    <Input
                                        value={state.secondaryKeywords}
                                        onChange={(e) => updateState({ secondaryKeywords: e.target.value })}
                                        placeholder="例: 初心者向け, 副業, スキルアップ"
                                    />
                                </div>
                            </div>

                            <div className="flex items-center gap-2 pt-2">
                                <Checkbox
                                    id="includeEyeCatch"
                                    checked={state.includeEyeCatch}
                                    onCheckedChange={(c) => updateState({ includeEyeCatch: !!c })}
                                />
                                <Label htmlFor="includeEyeCatch" className="cursor-pointer text-sm">
                                    アイキャッチ画像用の説明を挿入する
                                </Label>
                            </div>


                            <div className="space-y-2">
                                <Label>参考記事URL（1〜3本）*</Label>
                                {[0, 1, 2].map((i) => (
                                    <Input
                                        key={i}
                                        value={state.referenceUrls[i] || ""}
                                        onChange={(e) => {
                                            const urls = [...state.referenceUrls];
                                            urls[i] = e.target.value;
                                            updateState({ referenceUrls: urls.filter(Boolean) });
                                        }}
                                        placeholder={`参考記事${i + 1}のURL`}
                                    />
                                ))}
                            </div>

                            <div className="space-y-2">
                                <Label>文体</Label>
                                <Select
                                    value={state.tone}
                                    onValueChange={(v) => updateState({ tone: v as Tone })}
                                >
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        {TONE_OPTIONS.map(opt => (
                                            <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Optional Word Count */}
                            <div className="space-y-3">
                                <div className="flex items-center gap-2">
                                    <Checkbox
                                        id="useWordCount"
                                        checked={state.useWordCount}
                                        onCheckedChange={(checked) => updateState({ useWordCount: !!checked })}
                                    />
                                    <Label htmlFor="useWordCount" className="cursor-pointer">文字数を指定する</Label>
                                </div>
                                {state.useWordCount && (
                                    <div className="grid gap-4 md:grid-cols-2 pl-6">
                                        <div className="space-y-2">
                                            <Label>最小文字数</Label>
                                            <Input
                                                type="number"
                                                value={state.wordCountMin}
                                                onChange={(e) => updateState({ wordCountMin: parseInt(e.target.value) || 3000 })}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>最大文字数</Label>
                                            <Input
                                                type="number"
                                                value={state.wordCountMax}
                                                onChange={(e) => updateState({ wordCountMax: parseInt(e.target.value) || 6000 })}
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="grid gap-4 md:grid-cols-2">
                                <div className="space-y-2">
                                    <Label>誘導先リンク（CTA）</Label>
                                    <Input
                                        value={state.ctaLink}
                                        onChange={(e) => updateState({ ctaLink: e.target.value })}
                                        placeholder="https://example.com/your-service"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>CTAボタンテキスト</Label>
                                    <Input
                                        value={state.ctaText}
                                        onChange={(e) => updateState({ ctaText: e.target.value })}
                                        placeholder="無料で始める"
                                    />
                                </div>
                            </div>

                            {/* E-E-A-T Fields (Separated) */}
                            <div className="space-y-4">
                                <Label className="text-base font-semibold">E-E-A-T情報（任意）</Label>
                                <div className="grid gap-4 md:grid-cols-2">
                                    <div className="space-y-2">
                                        <Label>著者名</Label>
                                        <Input
                                            value={state.authorName}
                                            onChange={(e) => updateState({ authorName: e.target.value })}
                                            placeholder="例: 山田 太郎"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>肩書き</Label>
                                        <Input
                                            value={state.authorTitle}
                                            onChange={(e) => updateState({ authorTitle: e.target.value })}
                                            placeholder="例: 現役Webデザイナー / SEO専門家"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label>プロフィール・実績</Label>
                                    <Textarea
                                        value={state.authorProfile}
                                        onChange={(e) => updateState({ authorProfile: e.target.value })}
                                        placeholder="例: 10年間Webデザイン業界で活動。講座受講者300名以上を指導。"
                                        rows={2}
                                    />
                                </div>
                            </div>

                            {/* Direct Proceed Button (removed search intent analysis) */}
                            <Button
                                onClick={handleConfirmStep1}
                                disabled={loading || !state.primaryKeyword.trim() || state.referenceUrls.filter(u => u.trim()).length === 0}
                            >
                                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                参考記事を分析して次へ
                                <ArrowRight className="ml-2 h-4 w-4" />
                            </Button>
                        </CardContent>
                    </Card>
                </div>
            )
            }


            {/* Step 2: Structure Analysis */}
            {
                state.step === 2 && state.structureAnalyses.length > 0 && (
                    <div className="space-y-4">
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <FileText className="h-5 w-5" />
                                    Step 2: 参考記事の構成分解（H2ごとの詳細分析）
                                </CardTitle>
                                <CardDescription>
                                    この分析で合っていますか？修正があればお知らせください。
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                {state.structureAnalyses.map((analysis, idx) => (
                                    <div key={idx} className="border rounded-lg p-4 space-y-4">
                                        <h3 className="font-semibold">参考記事 {idx + 1}</h3>

                                        {/* Title Analysis */}
                                        <div className="bg-muted/50 p-3 rounded">
                                            <Label className="text-muted-foreground">タイトル構成分析</Label>
                                            <div className="text-sm space-y-1 mt-2">
                                                <p><span className="font-medium">文節:</span> {analysis.titleAnalysis.segments.join(" / ")}</p>
                                                <p><span className="font-medium">語順の意図:</span> {analysis.titleAnalysis.wordOrderIntent}</p>
                                                <p><span className="font-medium">惹きつける要素:</span> {analysis.titleAnalysis.attractiveElements}</p>
                                            </div>
                                        </div>

                                        {/* H2 Analyses */}
                                        <div className="space-y-2">
                                            <Label className="text-muted-foreground">H2ごとの詳細分析</Label>
                                            {analysis.h2Analyses.map((h2, h2Idx) => (
                                                <div key={h2Idx} className="border-l-2 border-primary/30 pl-3 text-sm">
                                                    <p className="font-medium">{h2.h2Text}</p>
                                                    <p className="text-muted-foreground">提供価値: {h2.providedValue}</p>
                                                    {h2.h3List.length > 0 && (
                                                        <p className="text-muted-foreground">H3: {h2.h3List.join(", ")}</p>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}

                                {/* Regeneration UI */}
                                {showRegenerateStep2 ? (
                                    <div className="border-t pt-4 mt-4 space-y-3">
                                        <Label className="flex items-center gap-2">
                                            <MessageSquare className="h-4 w-4" />
                                            修正指示を入力してください
                                        </Label>
                                        <Textarea
                                            value={state.regenerateStep2Instructions}
                                            onChange={(e) => updateState({ regenerateStep2Instructions: e.target.value })}
                                            placeholder="例: H2の順序を変更して、まず基礎知識から説明してください"
                                            rows={3}
                                        />
                                        <div className="flex gap-2">
                                            <Button variant="outline" onClick={() => setShowRegenerateStep2(false)}>
                                                キャンセル
                                            </Button>
                                            <Button onClick={handleRegenerateStep2} disabled={loading}>
                                                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                                <RefreshCw className="mr-2 h-4 w-4" />
                                                再生成
                                            </Button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex gap-2 pt-4">
                                        <Button variant="outline" onClick={() => updateState({ step: 1 })}>
                                            <ArrowLeft className="mr-2 h-4 w-4" />
                                            戻る
                                        </Button>
                                        <Button variant="outline" onClick={() => setShowRegenerateStep2(true)}>
                                            <Edit3 className="mr-2 h-4 w-4" />
                                            修正して再生成
                                        </Button>
                                        <Button onClick={handleConfirmStep2} disabled={loading}>
                                            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                            この分析で進む
                                            <ArrowRight className="ml-2 h-4 w-4" />
                                        </Button>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                )
            }

            {/* Step 3: Reader Analysis */}
            {
                state.step === 3 && state.readerAnalysis && (
                    <div className="space-y-4">
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Users className="h-5 w-5" />
                                    Step 3: 想定読者の分析（導入への興味を重視）
                                </CardTitle>
                                <CardDescription>
                                    想定読者はこのような方ですね？修正があればお知らせください。
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="grid gap-4 md:grid-cols-2">
                                    <div>
                                        <Label className="text-muted-foreground">レベル感</Label>
                                        <Badge className="mt-1">
                                            {READER_LEVEL_OPTIONS.find(o => o.value === state.readerAnalysis?.level)?.label}
                                        </Badge>
                                        <p className="text-sm text-muted-foreground mt-1">
                                            {state.readerAnalysis.levelEvidence}
                                        </p>
                                    </div>
                                    <div>
                                        <Label className="text-muted-foreground">ペルソナ像</Label>
                                        <p className="text-sm">
                                            {state.readerAnalysis.persona.ageGroup}・
                                            {state.readerAnalysis.persona.occupation}
                                        </p>
                                        <p className="text-sm text-muted-foreground">
                                            {state.readerAnalysis.persona.situation}
                                        </p>
                                    </div>
                                </div>

                                <div>
                                    <div className="flex justify-between items-center mb-2">
                                        <Label className="text-muted-foreground">悩み・ニーズ</Label>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => setIsEditingReaderAnalysis(!isEditingReaderAnalysis)}
                                        >
                                            <Edit3 className="h-4 w-4 mr-1" />
                                            {isEditingReaderAnalysis ? "完了" : "修正する"}
                                        </Button>
                                    </div>

                                    {isEditingReaderAnalysis ? (
                                        <div className="space-y-4 border p-4 rounded-md bg-muted/20">
                                            <div className="space-y-2">
                                                <Label>悩み（カンマ区切りなどで自由に入力）</Label>
                                                <Textarea
                                                    value={state.readerAnalysis.painPoints.join('\n')}
                                                    onChange={(e) => {
                                                        const points = e.target.value.split('\n').filter(line => line.trim());
                                                        updateState({
                                                            readerAnalysis: {
                                                                ...state.readerAnalysis!,
                                                                painPoints: points
                                                            }
                                                        });
                                                    }}
                                                    rows={4}
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label>導入で興味を持つポイント（カンマ区切りなどで自由に入力）</Label>
                                                <Textarea
                                                    value={state.readerAnalysis.introductionInterest.interestPoints.join('\n')}
                                                    onChange={(e) => {
                                                        const points = e.target.value.split('\n').filter(line => line.trim());
                                                        updateState({
                                                            readerAnalysis: {
                                                                ...state.readerAnalysis!,
                                                                introductionInterest: {
                                                                    ...state.readerAnalysis!.introductionInterest,
                                                                    interestPoints: points
                                                                }
                                                            }
                                                        });
                                                    }}
                                                    rows={4}
                                                />
                                            </div>
                                        </div>
                                    ) : (
                                        <>
                                            <ul className="list-disc list-inside text-sm">
                                                {state.readerAnalysis.painPoints.map((point, i) => (
                                                    <li key={i}>{point}</li>
                                                ))}
                                            </ul>
                                        </>
                                    )}
                                </div>

                                <div className="bg-primary/5 p-4 rounded-lg">
                                    <Label className="text-primary font-medium">導入に対する興味分析（重視）</Label>
                                    <div className="text-sm space-y-2 mt-2">
                                        <p><span className="font-medium">クリック理由:</span> {state.readerAnalysis.introductionInterest.clickReason}</p>
                                        <p><span className="font-medium">興味ポイント:</span> {state.readerAnalysis.introductionInterest.interestPoints.join(", ")}</p>
                                        <p><span className="font-medium">読み続ける要素:</span> {state.readerAnalysis.introductionInterest.continueReadingElements}</p>
                                        <p><span className="font-medium">離脱対策:</span> {state.readerAnalysis.introductionInterest.bounceRiskAndSolution}</p>
                                    </div>
                                </div>

                                {/* Enhanced Editing for Level and Persona */}
                                {isEditingReaderAnalysis && (
                                    <div className="border-t pt-4 mt-4 space-y-4">
                                        <div className="grid gap-4 md:grid-cols-2">
                                            <div className="space-y-2">
                                                <Label>レベル感</Label>
                                                <Select
                                                    value={state.readerAnalysis.level}
                                                    onValueChange={(v) => updateState({
                                                        readerAnalysis: {
                                                            ...state.readerAnalysis!,
                                                            level: v as ReaderLevel
                                                        }
                                                    })}
                                                >
                                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                                    <SelectContent>
                                                        {READER_LEVEL_OPTIONS.map(opt => (
                                                            <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            <div className="space-y-2">
                                                <Label>年齢層</Label>
                                                <Input
                                                    value={state.readerAnalysis.persona.ageGroup}
                                                    onChange={(e) => updateState({
                                                        readerAnalysis: {
                                                            ...state.readerAnalysis!,
                                                            persona: {
                                                                ...state.readerAnalysis!.persona,
                                                                ageGroup: e.target.value
                                                            }
                                                        }
                                                    })}
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label>職業</Label>
                                                <Input
                                                    value={state.readerAnalysis.persona.occupation}
                                                    onChange={(e) => updateState({
                                                        readerAnalysis: {
                                                            ...state.readerAnalysis!,
                                                            persona: {
                                                                ...state.readerAnalysis!.persona,
                                                                occupation: e.target.value
                                                            }
                                                        }
                                                    })}
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label>状況</Label>
                                                <Input
                                                    value={state.readerAnalysis.persona.situation}
                                                    onChange={(e) => updateState({
                                                        readerAnalysis: {
                                                            ...state.readerAnalysis!,
                                                            persona: {
                                                                ...state.readerAnalysis!.persona,
                                                                situation: e.target.value
                                                            }
                                                        }
                                                    })}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Regeneration UI */}
                                {showRegenerateStep3 ? (
                                    <div className="border-t pt-4 mt-4 space-y-3">
                                        <Label className="flex items-center gap-2">
                                            <MessageSquare className="h-4 w-4" />
                                            修正指示を入力してください
                                        </Label>
                                        <Textarea
                                            value={state.regenerateStep3Instructions}
                                            onChange={(e) => updateState({ regenerateStep3Instructions: e.target.value })}
                                            placeholder="例: ペルソナをもっと具体的に。30代の主婦で副業を探している人に変更してください"
                                            rows={3}
                                        />
                                        <div className="flex gap-2">
                                            <Button variant="outline" onClick={() => setShowRegenerateStep3(false)}>
                                                キャンセル
                                            </Button>
                                            <Button onClick={handleRegenerateStep3} disabled={loading}>
                                                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                                <RefreshCw className="mr-2 h-4 w-4" />
                                                再生成
                                            </Button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex gap-2 pt-4">
                                        <Button variant="outline" onClick={() => { updateState({ step: 2 }); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>
                                            <ArrowLeft className="mr-2 h-4 w-4" />
                                            戻る
                                        </Button>
                                        <Button variant="outline" onClick={() => setShowRegenerateStep3(true)}>
                                            <RefreshCw className="mr-2 h-4 w-4" />
                                            修正して再生成
                                        </Button>
                                        <Button onClick={handleConfirmStep3} disabled={loading}>
                                            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                            この分析で進む
                                            <ArrowRight className="ml-2 h-4 w-4" />
                                        </Button>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                )
            }

            {/* Step 4: Improvements (Axis-based Table) */}
            {
                state.step === 4 && state.improvements && (
                    <div className="space-y-4">
                        {/* Show Reader Analysis Summary at top */}
                        {state.readerAnalysis && (
                            <Card className="border-blue-200 bg-blue-50/50">
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-sm font-medium text-blue-700">想定読者・ニーズ</CardTitle>
                                </CardHeader>
                                <CardContent className="pt-0">
                                    <div className="text-sm space-y-1">
                                        <p><span className="font-medium">レベル:</span> {READER_LEVEL_OPTIONS.find(o => o.value === state.readerAnalysis?.level)?.label}</p>
                                        <p><span className="font-medium">悩み:</span> {state.readerAnalysis.painPoints.slice(0, 3).join(", ")}</p>
                                        <p><span className="font-medium">求めている情報:</span> {state.readerAnalysis.informationLiteracy.seekingNew.slice(0, 3).join(", ")}</p>
                                    </div>
                                </CardContent>
                            </Card>
                        )}

                        <Card>
                            <CardHeader>
                                <div className="flex items-center justify-between">
                                    <CardTitle className="flex items-center gap-2">
                                        <Lightbulb className="h-5 w-5" />
                                        Step 4: 参考記事の改善点（軸ベース分析）
                                    </CardTitle>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => setIsEditingImprovements(!isEditingImprovements)}
                                        className={isEditingImprovements ? "bg-primary/10 text-primary" : "text-muted-foreground"}
                                    >
                                        <Edit3 className="w-4 h-4 mr-2" />
                                        {isEditingImprovements ? "編集を終了" : "提案を編集"}
                                    </Button>
                                </div>
                                <CardDescription>
                                    競合記事から抽出した内容軸ごとに、追加・削除を選択してください。
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                {/* Axis-based Table */}
                                <div className="overflow-x-auto">
                                    <table className="w-full border-collapse text-sm">
                                        <thead className="bg-muted">
                                            <tr>
                                                <th className="border p-2 text-left font-medium">内容軸</th>
                                                <th className="border p-2 text-left font-medium">競合記事の内容（SEO順）</th>
                                                <th className="border p-2 text-left font-medium w-64">追加（選択 / 編集）</th>
                                                <th className="border p-2 text-left font-medium w-64">削除（選択 / 編集）</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {(state.improvements.axes || []).map((axis, i) => {
                                                const selection = state.selectedImprovements?.selectedAxes?.find(s => s.axisIndex === i);
                                                return (
                                                    <tr key={i} className="hover:bg-muted/50">
                                                        <td className="border p-2 font-medium align-top">{axis.axis}</td>
                                                        <td className="border p-2 align-top">
                                                            <ul className="list-decimal list-inside space-y-1 text-muted-foreground">
                                                                {axis.competitorContent.map((content, j) => (
                                                                    <li key={j}>{content}</li>
                                                                ))}
                                                            </ul>
                                                        </td>
                                                        <td className="border p-2 align-top">
                                                            <div className="flex items-start gap-2">
                                                                <Checkbox
                                                                    id={`add-${i}`}
                                                                    checked={selection?.additionSelected ?? true}
                                                                    onCheckedChange={() => toggleAxisAddition(i)}
                                                                    className="mt-1"
                                                                />
                                                                <div className="flex-1">
                                                                    {isEditingImprovements ? (
                                                                        <Textarea
                                                                            value={axis.suggestedAddition}
                                                                            onChange={(e) => {
                                                                                const newAxes = [...state.improvements!.axes!];
                                                                                newAxes[i] = { ...newAxes[i], suggestedAddition: e.target.value };
                                                                                updateState({
                                                                                    improvements: { ...state.improvements!, axes: newAxes }
                                                                                });
                                                                            }}
                                                                            className="min-h-[80px] text-xs"
                                                                        />
                                                                    ) : (
                                                                        <label htmlFor={`add-${i}`} className="text-sm cursor-pointer text-green-700 block">
                                                                            {axis.suggestedAddition}
                                                                        </label>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="border p-2 align-top">
                                                            <div className="flex items-start gap-2">
                                                                <Checkbox
                                                                    id={`rem-${i}`}
                                                                    checked={selection?.removalSelected ?? true}
                                                                    onCheckedChange={() => toggleAxisRemoval(i)}
                                                                    className="mt-1"
                                                                />
                                                                <div className="flex-1">
                                                                    {isEditingImprovements ? (
                                                                        <Textarea
                                                                            value={axis.suggestedRemoval}
                                                                            onChange={(e) => {
                                                                                const newAxes = [...state.improvements!.axes!];
                                                                                newAxes[i] = { ...newAxes[i], suggestedRemoval: e.target.value };
                                                                                updateState({
                                                                                    improvements: { ...state.improvements!, axes: newAxes }
                                                                                });
                                                                            }}
                                                                            className="min-h-[80px] text-xs"
                                                                        />
                                                                    ) : (
                                                                        <label htmlFor={`rem-${i}`} className="text-sm cursor-pointer text-orange-700 block">
                                                                            {axis.suggestedRemoval}
                                                                        </label>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>

                                {/* Regeneration UI */}
                                {showRegenerateStep4 ? (
                                    <div className="border-t pt-4 mt-4 space-y-3">
                                        <Label className="flex items-center gap-2">
                                            <MessageSquare className="h-4 w-4" />
                                            修正指示を入力してください
                                        </Label>
                                        <Textarea
                                            value={state.regenerateStep4Instructions}
                                            onChange={(e) => updateState({ regenerateStep4Instructions: e.target.value })}
                                            placeholder="例: 差別化ポイントをもっと具体的に提案してください"
                                            rows={3}
                                        />
                                        <div className="flex gap-2">
                                            <Button variant="outline" onClick={() => setShowRegenerateStep4(false)}>
                                                キャンセル
                                            </Button>
                                            <Button onClick={handleRegenerateStep4} disabled={loading}>
                                                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                                <RefreshCw className="mr-2 h-4 w-4" />
                                                再生成
                                            </Button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex gap-2 pt-4">
                                        <Button variant="outline" onClick={() => { updateState({ step: 3 }); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>
                                            <ArrowLeft className="mr-2 h-4 w-4" />
                                            戻る
                                        </Button>
                                        <Button variant="outline" onClick={() => setShowRegenerateStep4(true)}>
                                            <RefreshCw className="mr-2 h-4 w-4" />
                                            修正して再生成
                                        </Button>
                                        <Button onClick={handleConfirmStep4} disabled={loading}>
                                            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                            選択した改善点で構成を作成
                                            <ArrowRight className="ml-2 h-4 w-4" />
                                        </Button>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                )
            }

            {/* Step 5: Outline */}
            {
                state.step === 5 && state.outline && (
                    <div className="space-y-4">
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <FileText className="h-5 w-5" />
                                    Step 5: 記事構成の作成（参考記事の構成に沿う）
                                </CardTitle>
                                <CardDescription>
                                    マーケットイン：参考記事の構成・語順に沿って作成しました。タイトルを選択してください。
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                {/* Title Selection */}
                                <div>
                                    <Label className="text-lg font-medium">タイトル案（3パターン）</Label>
                                    <div className="space-y-2 mt-2">
                                        {state.outline.titleCandidates.map((candidate, i) => (
                                            <div
                                                key={i}
                                                className={`p-3 border rounded-lg cursor-pointer transition-colors ${state.outline?.selectedTitleIndex === i
                                                    ? "border-primary bg-primary/5"
                                                    : "hover:border-primary/50"
                                                    }`}
                                                onClick={() => selectTitle(i)}
                                            >
                                                <div className="flex items-start gap-2">
                                                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 ${state.outline?.selectedTitleIndex === i
                                                        ? "border-primary bg-primary text-primary-foreground"
                                                        : "border-muted-foreground"
                                                        }`}>
                                                        {state.outline?.selectedTitleIndex === i && <Check className="h-3 w-3" />}
                                                    </div>
                                                    <div>
                                                        <p className="font-medium">{candidate.title}</p>
                                                        <p className="text-xs text-muted-foreground">
                                                            参考: {candidate.referenceElement} / {candidate.wordOrderIntent}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Outline Sections */}
                                <div className="bg-muted/50 p-4 rounded-lg">
                                    <Label className="text-lg font-medium">見出し構成</Label>
                                    <div className="space-y-3 mt-3">
                                        {state.outline.sections.map((section, i) => (
                                            <div key={i} className="border-l-2 border-primary pl-3">
                                                <div className="flex items-center gap-2">
                                                    <Badge variant="secondary">{i + 1}</Badge>
                                                    <span className="font-medium">{section.h2}</span>
                                                    <span className="text-xs text-muted-foreground">
                                                        ({section.estimatedWordCount}文字)
                                                    </span>
                                                </div>
                                                <ul className="list-disc list-inside text-sm text-muted-foreground ml-4 mt-1">
                                                    {section.h3List.map((h3, j) => (
                                                        <li key={j}>{h3}</li>
                                                    ))}
                                                </ul>
                                                <p className="text-xs text-muted-foreground ml-4 mt-1">
                                                    概要: {section.sectionSummary}
                                                </p>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div>
                                    <Label className="text-muted-foreground">メタディスクリプション</Label>
                                    <p className="text-sm bg-muted/50 p-2 rounded mt-1">
                                        {state.outline.metaDescription}
                                    </p>
                                </div>

                                {/* Regeneration UI */}
                                {showRegenerateStep5 ? (
                                    <div className="border-t pt-4 mt-4 space-y-3">
                                        <Label className="flex items-center gap-2">
                                            <MessageSquare className="h-4 w-4" />
                                            修正指示を入力してください
                                        </Label>
                                        <Textarea
                                            value={state.regenerateStep5Instructions}
                                            onChange={(e) => updateState({ regenerateStep5Instructions: e.target.value })}
                                            placeholder="例: H2の順序を入れ替えて、まず基礎編から始めてください"
                                            rows={3}
                                        />
                                        <div className="flex gap-2">
                                            <Button variant="outline" onClick={() => setShowRegenerateStep5(false)}>
                                                キャンセル
                                            </Button>
                                            <Button onClick={handleRegenerateStep5} disabled={loading}>
                                                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                                <RefreshCw className="mr-2 h-4 w-4" />
                                                再生成
                                            </Button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex gap-2 pt-4">
                                        <Button variant="outline" onClick={() => { updateState({ step: 4 }); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>
                                            <ArrowLeft className="mr-2 h-4 w-4" />
                                            戻る
                                        </Button>
                                        <Button variant="outline" onClick={() => setShowRegenerateStep5(true)}>
                                            <RefreshCw className="mr-2 h-4 w-4" />
                                            修正して再生成
                                        </Button>
                                        <Button onClick={handleConfirmStep5} disabled={loading}>
                                            構成を確定して次へ
                                            <ArrowRight className="ml-2 h-4 w-4" />
                                        </Button>
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* Step 5.5: Internal Links Settings (Only show if Step 5 Confirmed) */}
                        {state.step5Confirmed && (
                            <Card className="border-green-500 border-2">
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <LinkIcon className="h-5 w-5 text-green-600" />
                                        内部リンク設定
                                    </CardTitle>
                                    <CardDescription>
                                        自社メディアの記事リンクを自動取得し、記事内に挿入します。
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="flex gap-2">
                                        <Input
                                            value={state.internalLinksUrl}
                                            onChange={(e) => updateState({ internalLinksUrl: e.target.value })}
                                            placeholder="https://example.com"
                                            className="flex-1"
                                        />
                                        <Button onClick={handleFetchInternalLinks} disabled={loading} variant="outline">
                                            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
                                            リンク取得
                                        </Button>
                                    </div>

                                    {state.internalLinks && state.internalLinks.length > 0 && (
                                        <div className="border rounded-lg p-4 max-h-[300px] overflow-y-auto space-y-2">
                                            <Label className="mb-2 block">挿入候補のリンク（選択してください）</Label>
                                            {state.internalLinks.map((link, i) => {
                                                const isSelected = state.selectedInternalLinks.some(l => l.url === link.url);
                                                return (
                                                    <div key={i} className="flex items-start gap-2 p-2 hover:bg-muted/50 rounded">
                                                        <Checkbox
                                                            id={`link-${i}`}
                                                            checked={isSelected}
                                                            onCheckedChange={() => toggleInternalLink(link)}
                                                        />
                                                        <div className="grid gap-1">
                                                            <label htmlFor={`link-${i}`} className="text-sm font-medium leading-none cursor-pointer">
                                                                {link.title}
                                                            </label>
                                                            <p className="text-xs text-muted-foreground">{link.url}</p>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}

                                    <div className="pt-4 border-t flex justify-between items-center bg-green-50 p-4 -mx-6 -mb-6 mt-4">
                                        <div className="text-sm text-green-800 font-medium">
                                            <span className="font-bold">準備完了！</span> {state.selectedInternalLinks.length}件のリンクを使って記事を作成します
                                        </div>
                                        <Button onClick={handleGenerateDraft} disabled={loading} className="bg-green-600 hover:bg-green-700 text-white">
                                            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                            <PenTool className="mr-2 h-4 w-4" />
                                            記事を生成する
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        )}
                    </div>
                )
            }

            {/* Step 6: Generated Content */}
            {
                state.step === 6 && state.generatedContent && (
                    <div className="space-y-4">
                        <Card>
                            <CardHeader>
                                <div className="flex items-center justify-between">
                                    <div>
                                        <CardTitle className="flex items-center gap-2">
                                            <PenTool className="h-5 w-5 text-green-500" />
                                            Step 6: 記事のライティング完成！
                                        </CardTitle>
                                        <CardDescription>
                                            約{state.generatedContent.wordCount}文字 | {state.generatedContent.metaTitle}
                                        </CardDescription>
                                    </div>
                                    <div className="flex gap-2">
                                        <Button variant="outline" size="sm" onClick={handleCopy}>
                                            <Copy className="h-4 w-4 mr-1" />
                                            コピー
                                        </Button>
                                        <Button variant="outline" size="sm" onClick={handleDownload}>
                                            <Download className="h-4 w-4 mr-1" />
                                            ダウンロード
                                        </Button>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="p-3 bg-muted/50 rounded-lg">
                                    <Label className="text-xs text-muted-foreground">Meta Title</Label>
                                    <p className="font-medium">{state.generatedContent.metaTitle}</p>
                                </div>
                                <div className="p-3 bg-muted/50 rounded-lg">
                                    <Label className="text-xs text-muted-foreground">Meta Description</Label>
                                    <p className="text-sm">{state.generatedContent.metaDescription}</p>
                                </div>

                                {state.generatedContent.faqs && state.generatedContent.faqs.length > 0 && (
                                    <div className="p-3 bg-muted/50 rounded-lg">
                                        <Label className="text-xs text-muted-foreground">FAQ</Label>
                                        <div className="space-y-2 mt-2">
                                            {state.generatedContent.faqs.map((faq, i) => (
                                                <div key={i} className="text-sm">
                                                    <p className="font-medium">Q: {faq.question}</p>
                                                    <p className="text-muted-foreground">A: {faq.answer}</p>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                <RefinementArea
                                    initialContent={typeof state.generatedContent.content === 'string' ? state.generatedContent.content : JSON.stringify(state.generatedContent.content)}
                                    contextData={{
                                        tool: "seo_article",
                                        toolName: "SEO記事作成",
                                        primaryKeyword: state.primaryKeyword
                                    }}
                                    onContentUpdate={(newContent) => updateState({
                                        generatedContent: { ...state.generatedContent!, content: newContent }
                                    })}
                                    contentType="html"
                                />

                                <div className="flex gap-2 pt-4">
                                    <Button variant="outline" onClick={() => { updateState({ step: 5 }); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>
                                        <ArrowLeft className="mr-2 h-4 w-4" />
                                        構成に戻る
                                    </Button>
                                    <Button variant="outline" onClick={handleConfirmStep5} disabled={loading}>
                                        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                        <RefreshCw className="mr-2 h-4 w-4" />
                                        再生成
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                )
            }
        </div >
    );
}
