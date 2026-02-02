"use client";
import { ToolPlaceholder } from "@/components/features/studio/ToolPlaceholder";

export default function FunnelDesignPage() {
    return (
        <ToolPlaceholder
            title="マーケティングファネル設計"
            description="集客から販売、LTV向上までのマーケティング導線全体を設計・可視化"
            features={[
                "AIDAモデル等のフレームワーク活用",
                "各フェーズ（認知・興味・検討・購入）のアクション設計",
                "KPIシミュレーション（CVR計算）",
                "必要なクリエイティブ（LP, 動画, メール）のリストアップ"
            ]}
            steps={[
                "ビジネスモデル・ゴール設定",
                "現状の課題分析",
                "ファネル全体のステップ設計",
                "各ステップでの施策・コンテンツ決定",
                "ファネル図・To-Doリスト出力"
            ]}
        />
    );
}
