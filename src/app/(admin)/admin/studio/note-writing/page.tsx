"use client";

import { NoteWritingWorkflow } from "@/components/features/studio/NoteWritingWorkflow";

export default function NoteWritingPage() {
    return (
        <div className="container py-8">
            <h1 className="text-3xl font-bold mb-8">note記事作成ツール</h1>
            <NoteWritingWorkflow />
        </div>
    );
}
