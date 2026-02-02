"use client";
import { ToolPlaceholder } from "@/components/features/studio/ToolPlaceholder";

export default function VSLWritingPage() {
    return (
        <ToolPlaceholder
            title="VSLライティングツール"
            description="Video Sales Letter（動画セールスレター）専用のシナリオ・台本を作成"
            features={[
                "視聴維持率を高めるスライド型動画の構成",
                "視覚情報（スライド）と聴覚情報（ナレーション）の同期",
                "動画内での視聴者への行動喚起（CTA）設計",
                "ウェビナー台本のベースとしても利用可能"
            ]}
            steps={[
                "販売する商品・オファー内容の設定",
                "VSLの構成パターン（教育型、ストーリー型等）選択",
                "各シーンのスクリプト・スライド指示作成",
                "音声読み上げ用テキストの調整",
                "全体台本の出力"
            ]}
        />
    );
}
