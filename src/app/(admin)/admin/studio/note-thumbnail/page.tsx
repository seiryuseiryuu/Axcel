"use client";

import { NoteThumbnailWorkflow } from "@/components/features/studio/NoteThumbnailWorkflow";

export default function NoteThumbnailPage() {
    return (
        <div className="container py-8">
            <h1 className="text-3xl font-bold mb-8">note/Brainサムネイル作成ツール</h1>
            <NoteThumbnailWorkflow />
        </div>
    );
}
