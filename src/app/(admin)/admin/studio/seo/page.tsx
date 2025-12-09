"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Copy } from "lucide-react";

export default function SEOGeneratorPage() {
    const [topic, setTopic] = useState("");
    const [keywords, setKeywords] = useState("");
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState("");

    const handleGenerate = async () => {
        setLoading(true);
        try {
            const response = await fetch("/api/ai/generate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    type: "text",
                    prompt: `Write a comprehensive SEO-optimized article about "${topic}".
                Target keywords: ${keywords}.
                Structure: Introduction, Key Concepts, Deep Dive, Conclusion.
                Format: Markdown.`,
                    system: "You are an expert SEO content writer."
                })
            });
            const data = await response.json();
            if (data.success) {
                setResult(data.data);
            } else {
                alert("Error: " + data.error);
            }
        } catch (e: any) {
            alert("Failed: " + e.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <div>
                <h1 className="text-2xl font-bold">SEO Article Generator</h1>
                <p className="text-muted-foreground">Create content that ranks.</p>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
                <Card>
                    <CardHeader><CardTitle>Configuration</CardTitle></CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label>Main Topic</Label>
                            <Input
                                placeholder="e.g. How to learn React in 2024"
                                value={topic}
                                onChange={(e) => setTopic(e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Keywords (comma separated)</Label>
                            <Textarea
                                placeholder="react, javascript, frontend, web dev"
                                value={keywords}
                                onChange={(e) => setKeywords(e.target.value)}
                            />
                        </div>
                        <Button className="w-full" onClick={handleGenerate} disabled={loading || !topic}>
                            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {loading ? "Generating..." : "Generate Article"}
                        </Button>
                    </CardContent>
                </Card>

                <Card className="h-full flex flex-col">
                    <CardHeader className="flex flex-row items-center justify-between">
                        <CardTitle>Result</CardTitle>
                        {result && (
                            <Button variant="ghost" size="sm" onClick={() => navigator.clipboard.writeText(result)}>
                                <Copy className="h-4 w-4" />
                            </Button>
                        )}
                    </CardHeader>
                    <CardContent className="flex-1 min-h-[400px]">
                        {result ? (
                            <Textarea className="h-full font-mono text-sm" value={result} readOnly />
                        ) : (
                            <div className="h-full flex items-center justify-center text-muted-foreground border-2 border-dashed rounded-md">
                                Generated content will appear here.
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
