"use client";
import { ToolPlaceholder } from "@/components/features/studio/ToolPlaceholder";

export default function VideoClipPage() {
    return (
        <ToolPlaceholder
            title="動画切り抜き分析ツール"
            description="長尺動画から「バズる可能性の高い」切り抜きポイントをAIが自動抽出・提案"
            features={[
                "トランスクリプト解析による盛り上がり検知",
                "ショート動画に適した時間（60秒以内）での切り出し",
                "テロップ・効果音の挿入ポイント提案",
                "切り抜き動画のタイトル・サムネイル案"
            ]}
            steps={[
                "元動画URL（YouTubeなど）入力",
                "動画全体の解析（会話・トーン分析）",
                "切り抜き候補シーンの抽出・一覧表示",
                "選択したシーンの編集コンテ作成",
                "編集指示書出力"
            ]}
        />
    );
}
