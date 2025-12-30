"use client";

import dynamic from "next/dynamic";

interface MarkdownRendererProps {
    content: string;
    className?: string;
}

// ReactMarkdownを動的インポートしてSSRを無効化
const ReactMarkdown = dynamic(
    () => import("react-markdown").then(mod => mod.default),
    {
        ssr: false,
        loading: () => <div className="animate-pulse bg-muted h-32 w-full rounded-lg" />
    }
);

// remark-gfmを動的インポート
import remarkGfm from "remark-gfm";

export function MarkdownRenderer({ content, className = "" }: MarkdownRendererProps) {
    // クライアントサイドでのみレンダリング
    return (
        <div className={`prose prose-sm dark:prose-invert max-w-none ${className}`} suppressHydrationWarning>
            <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                    // テーブルのスタイリング
                    table: ({ children }) => (
                        <div className="overflow-x-auto my-4 rounded-lg border border-border">
                            <table className="w-full border-collapse text-sm">
                                {children}
                            </table>
                        </div>
                    ),
                    thead: ({ children }) => (
                        <thead className="bg-muted/50 border-b border-border">
                            {children}
                        </thead>
                    ),
                    th: ({ children }) => (
                        <th className="px-4 py-3 text-left font-semibold text-foreground border-r border-border last:border-r-0">
                            {children}
                        </th>
                    ),
                    td: ({ children }) => (
                        <td className="px-4 py-3 border-t border-r border-border last:border-r-0 align-top">
                            {children}
                        </td>
                    ),
                    tr: ({ children }) => (
                        <tr className="hover:bg-muted/30 transition-colors">
                            {children}
                        </tr>
                    ),
                    // 見出しのスタイリング
                    h1: ({ children }) => (
                        <h1 className="text-2xl font-bold mt-6 mb-4 pb-2 border-b border-border">
                            {children}
                        </h1>
                    ),
                    h2: ({ children }) => (
                        <h2 className="text-xl font-bold mt-5 mb-3 text-primary">
                            {children}
                        </h2>
                    ),
                    h3: ({ children }) => (
                        <h3 className="text-lg font-semibold mt-4 mb-2">
                            {children}
                        </h3>
                    ),
                    // リストのスタイリング
                    ul: ({ children }) => (
                        <ul className="list-disc list-inside space-y-1 my-2 ml-2">
                            {children}
                        </ul>
                    ),
                    ol: ({ children }) => (
                        <ol className="list-decimal list-inside space-y-1 my-2 ml-2">
                            {children}
                        </ol>
                    ),
                    li: ({ children }) => (
                        <li className="text-muted-foreground">
                            <span className="text-foreground">{children}</span>
                        </li>
                    ),
                    // 段落のスタイリング
                    p: ({ children }) => (
                        <p className="my-2 leading-relaxed">
                            {children}
                        </p>
                    ),
                    // コードブロック
                    code: ({ children, className }) => {
                        const isInline = !className;
                        return isInline ? (
                            <code className="bg-muted px-1.5 py-0.5 rounded text-sm font-mono">
                                {children}
                            </code>
                        ) : (
                            <code className="block bg-muted p-4 rounded-lg overflow-x-auto text-sm font-mono">
                                {children}
                            </code>
                        );
                    },
                    // 引用
                    blockquote: ({ children }) => (
                        <blockquote className="border-l-4 border-primary pl-4 my-4 italic text-muted-foreground">
                            {children}
                        </blockquote>
                    ),
                    // 強調
                    strong: ({ children }) => (
                        <strong className="font-bold text-foreground">
                            {children}
                        </strong>
                    ),
                    // 水平線
                    hr: () => (
                        <hr className="my-6 border-border" />
                    ),
                }}
            >
                {content}
            </ReactMarkdown>
        </div>
    );
}
