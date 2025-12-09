import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ShieldAlert } from "lucide-react";

export default function UnauthorizedPage() {
    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4 text-center">
            <div className="rounded-full bg-destructive/10 p-6 mb-6">
                <ShieldAlert className="h-12 w-12 text-destructive" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight mb-2">アクセス権限がありません</h1>
            <p className="text-muted-foreground mb-8 max-w-md">
                このページにアクセスするための権限がありません。<br />
                管理者にお問い合わせいただくか、ダッシュボードへお戻りください。
            </p>
            <div className="flex gap-4">
                <Link href="/dashboard">
                    <Button>ダッシュボードへ戻る</Button>
                </Link>
                <Link href="/">
                    <Button variant="outline">トップページへ</Button>
                </Link>
            </div>
        </div>
    );
}
