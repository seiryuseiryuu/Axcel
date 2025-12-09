"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Download } from "lucide-react";

export default function ThumbnailGeneratorPage() {
    const [title, setTitle] = useState("");
    const [style, setStyle] = useState("Youtube Clickbait");
    const [loading, setLoading] = useState(false);
    const [imageUrl, setImageUrl] = useState("");

    const handleGenerate = async () => {
        setLoading(true);
        // Mock generation since we don't have real Nanobanana API
        setTimeout(() => {
            setImageUrl(`https://via.placeholder.com/1280x720.png?text=${encodeURIComponent(title)}`);
            setLoading(false);
        }, 2000);
    };

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <div>
                <h1 className="text-2xl font-bold">Thumbnail Creator</h1>
                <p className="text-muted-foreground">Generate viral thumbnails instantly.</p>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
                <Card>
                    <CardHeader><CardTitle>Settings</CardTitle></CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label>Video Title</Label>
                            <Input
                                placeholder="e.g. 10 Tips for Next.js"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Style Preset</Label>
                            <select
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                value={style}
                                onChange={(e) => setStyle(e.target.value)}
                            >
                                <option>Youtube Clickbait</option>
                                <option>Minimalist</option>
                                <option>Corporate</option>
                            </select>
                        </div>
                        <Button className="w-full" onClick={handleGenerate} disabled={loading || !title}>
                            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {loading ? "Dreaming..." : "Generate Thumbnail"}
                        </Button>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader><CardTitle>Preview</CardTitle></CardHeader>
                    <CardContent>
                        <div className="aspect-video bg-black rounded-md overflow-hidden flex items-center justify-center relative group">
                            {imageUrl ? (
                                <>
                                    <img src={imageUrl} alt="Generated Thumbnail" className="w-full h-full object-cover" />
                                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                        <Button variant="secondary">
                                            <Download className="mr-2 h-4 w-4" /> Download
                                        </Button>
                                    </div>
                                </>
                            ) : (
                                <span className="text-muted-foreground">Preview area</span>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
