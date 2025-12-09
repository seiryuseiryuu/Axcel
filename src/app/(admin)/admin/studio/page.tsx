import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { BookText, Video, Image, Cpu } from "lucide-react";

export default function StudioDashboard() {
    const tools = [
        {
            title: "SEO Article Generator",
            description: "Generate high-quality articles optimized for search engines.",
            href: "/admin/studio/seo",
            icon: BookText,
            color: "text-blue-500"
        },
        {
            title: "Video Script Writer",
            description: "Create engaging scripts for your course videos from topics.",
            href: "/admin/studio/script",
            icon: Video,
            color: "text-red-500"
        },
        {
            title: "Thumbnail Creator",
            description: "Design eye-catching thumbnails using Nanobanana AI.",
            href: "/admin/studio/thumbnail",
            icon: Image,
            color: "text-purple-500"
        },
        {
            title: "Curriculum Architect",
            description: "Build complete course structures instantly.",
            href: "/admin/studio/curriculum",
            icon: Cpu,
            color: "text-emerald-500"
        }
    ];

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">AI Creation Studio</h1>
                <p className="text-muted-foreground">Supercharge your content creation with AI tools.</p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
                {tools.map((tool) => (
                    <Link href={tool.href} key={tool.href}>
                        <Card className="hover:shadow-lg transition-all cursor-pointer h-full border-2 hover:border-primary/20">
                            <CardHeader>
                                <div className="flex items-center gap-4">
                                    <div className={`p-2 rounded-lg bg-muted ${tool.color}`}>
                                        <tool.icon className="w-6 h-6" />
                                    </div>
                                    <CardTitle className="text-xl">{tool.title}</CardTitle>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <CardDescription className="text-base">{tool.description}</CardDescription>
                            </CardContent>
                        </Card>
                    </Link>
                ))}
            </div>
        </div>
    );
}
