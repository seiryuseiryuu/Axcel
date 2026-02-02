"use client";
import { ToolPlaceholder } from "@/components/features/studio/ToolPlaceholder";

export default function InstaStoryPage() {
    return (
        <ToolPlaceholder
            title="インスタストーリー作成"
            description="Instagramストーリーズでのエンゲージメント（反応）を高める画像・構成を作成"
            features={[
                "アンケート・質問箱への誘導デザイン",
                "離脱を防ぐストーリーテリング構成",
                "ハイライト用カバー作成機能",
                "縦型（9:16）最適化デザイン"
            ]}
            steps={[
                "投稿の目的（ファン化、販売、リサーチ等）設定",
                "ストーリーの構成案（何枚で何を伝えるか）",
                "各スライドの背景・テキストデザイン生成",
                "スタンプ配置位置の提案",
                "画像一括出力"
            ]}
        />
    );
}
