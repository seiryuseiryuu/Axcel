"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Loader2, CheckCircle, AlertCircle, Shield } from "lucide-react";
import { useRouter } from "next/navigation";

export default function SetupPage() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [displayName, setDisplayName] = useState("");
    const [loading, setLoading] = useState(false);
    const [checking, setChecking] = useState(true);
    const [hasAdmin, setHasAdmin] = useState(false);
    const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
    const router = useRouter();

    useEffect(() => {
        checkAdminStatus();
    }, []);

    const checkAdminStatus = async () => {
        try {
            const res = await fetch("/api/setup/admin");
            const data = await res.json();
            setHasAdmin(data.hasAdmin);
        } catch (error) {
            console.error("Failed to check admin status");
        } finally {
            setChecking(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setMessage(null);

        try {
            const res = await fetch("/api/setup/admin", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, password, displayName }),
            });

            const data = await res.json();

            if (data.success) {
                setMessage({ type: "success", text: "管理者アカウントを作成しました！ログインページに移動します..." });
                setTimeout(() => {
                    router.push("/login");
                }, 2000);
            } else {
                setMessage({ type: "error", text: data.error || "エラーが発生しました" });
            }
        } catch (error) {
            setMessage({ type: "error", text: "通信エラーが発生しました" });
        } finally {
            setLoading(false);
        }
    };

    if (checking) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-background p-4">
            <Card className="w-full max-w-md">
                <CardHeader className="text-center">
                    <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                        <Shield className="h-6 w-6 text-primary" />
                    </div>
                    <CardTitle className="text-2xl">初期セットアップ</CardTitle>
                    <CardDescription>
                        最初の管理者アカウントを作成します
                    </CardDescription>
                </CardHeader>

                {hasAdmin ? (
                    <CardContent className="text-center space-y-4">
                        <div className="bg-green-500/10 text-green-500 p-4 rounded-lg flex items-center gap-2 justify-center">
                            <CheckCircle className="h-5 w-5" />
                            <span>管理者アカウントは既に存在します</span>
                        </div>
                        <Button onClick={() => router.push("/login")}>
                            ログインページへ
                        </Button>
                    </CardContent>
                ) : (
                    <form onSubmit={handleSubmit}>
                        <CardContent className="space-y-4">
                            {message && (
                                <div className={`p-3 rounded-md flex items-center gap-2 ${message.type === "success"
                                        ? "bg-green-500/10 text-green-500"
                                        : "bg-destructive/10 text-destructive"
                                    }`}>
                                    {message.type === "success" ? (
                                        <CheckCircle className="h-4 w-4" />
                                    ) : (
                                        <AlertCircle className="h-4 w-4" />
                                    )}
                                    {message.text}
                                </div>
                            )}

                            <div className="space-y-2">
                                <Label htmlFor="displayName">表示名</Label>
                                <Input
                                    id="displayName"
                                    value={displayName}
                                    onChange={(e) => setDisplayName(e.target.value)}
                                    placeholder="管理者"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="email">メールアドレス *</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="admin@example.com"
                                    required
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="password">パスワード *</Label>
                                <Input
                                    id="password"
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="8文字以上"
                                    minLength={8}
                                    required
                                />
                            </div>
                        </CardContent>
                        <CardFooter>
                            <Button type="submit" className="w-full" disabled={loading}>
                                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                管理者アカウントを作成
                            </Button>
                        </CardFooter>
                    </form>
                )}
            </Card>
        </div>
    );
}
