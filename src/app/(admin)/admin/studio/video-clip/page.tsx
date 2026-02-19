"use client";

import { VideoClipWorkflow } from "@/components/features/studio/VideoClipWorkflow";

export default function VideoClipPage() {
    return (
        <div className="container py-8">
            <div className="text-center mb-8">
                <div className="inline-flex items-center gap-3 mb-2">
                    <div className="p-2 bg-orange-500/10 rounded-xl">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-orange-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="6" cy="6" r="3" /><path d="M8.12 8.12 12 12" /><path d="M20 4 8.12 15.88" /><circle cx="6" cy="18" r="3" /><path d="M14.8 14.8 20 20" /></svg>
                    </div>
                    <h1 className="text-3xl font-bold">動画切り抜き分析</h1>
                </div>
                <p className="text-muted-foreground">タイムコード付き字幕から最適な切り抜きポイントをAIが分析</p>
            </div>
            <VideoClipWorkflow />
        </div>
    );
}
