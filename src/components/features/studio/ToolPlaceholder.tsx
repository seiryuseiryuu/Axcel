import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Construction, ArrowLeft, FileText, CheckCircle2 } from "lucide-react";
import Link from "next/link";

interface ToolPlaceholderProps {
    title: string;
    description: string;
    features: string[];
    steps: string[];
}

export function ToolPlaceholder({ title, description, features, steps }: ToolPlaceholderProps) {
    return (
        <div className="max-w-4xl mx-auto space-y-8">
            <div className="flex items-center gap-4">
                <Link href="/admin">
                    <Button variant="ghost" size="icon">
                        <ArrowLeft className="w-5 h-5" />
                    </Button>
                </Link>
                <div>
                    <h1 className="text-3xl font-bold flex items-center gap-3">
                        {title}
                        <Badge variant="secondary" className="text-sm font-normal">
                            <Construction className="w-3 h-3 mr-1" />
                            開発中
                        </Badge>
                    </h1>
                    <p className="text-muted-foreground mt-2">{description}</p>
                </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <FileText className="w-5 h-5 text-primary" />
                            要件定義・機能一覧
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ul className="space-y-3">
                            {features.map((feature, i) => (
                                <li key={i} className="flex items-start gap-2 text-sm">
                                    <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
                                    <span>{feature}</span>
                                </li>
                            ))}
                        </ul>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>実装予定フロー</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="relative border-l-2 border-muted ml-3 space-y-6">
                            {steps.map((step, i) => (
                                <div key={i} className="ml-6 relative">
                                    <div className="absolute -left-[31px] top-0 w-4 h-4 rounded-full bg-muted border-2 border-background" />
                                    <h3 className="font-semibold text-sm">STEP {i + 1}</h3>
                                    <p className="text-sm text-muted-foreground mt-1">{step}</p>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </div>

            <div className="p-8 bg-muted/30 rounded-lg text-center border-2 border-dashed">
                <p className="text-muted-foreground">
                    このツールは現在開発キューに入っています。<br />
                    実装優先度の変更が必要な場合は、開発者までご連絡ください。
                </p>
            </div>
        </div>
    );
}
