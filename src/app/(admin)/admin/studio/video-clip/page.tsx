"use client";

import { VideoClipWorkflow } from "@/components/features/studio/VideoClipWorkflow";

export default function VideoClipPage() {
    return (
        <div className="container py-8">
            <h1 className="text-3xl font-bold mb-8">動画切り抜き分析ツール</h1>
            <VideoClipWorkflow />
        </div>
    );
}
