import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { CheckCircle } from "lucide-react";

export default async function ContentPage({
    params,
}: {
    params: Promise<{ id: string; contentId: string }>;
}) {
    const { id, contentId } = await params;
    const supabase = await createClient();

    const { data: content } = await supabase
        .from("contents")
        .select("*")
        .eq("id", contentId)
        .single();

    if (!content) return <div>Content not found</div>;

    return (
        <div className="p-6 max-w-4xl mx-auto">
            <div className="aspect-video relative rounded-md overflow-hidden bg-slate-900 mb-8">
                {/* Player Placeholder */}
                <div className="absolute inset-0 flex items-center justify-center text-white">
                    <p>Video Player: {content.video_url || "No Video Source"}</p>
                </div>
            </div>

            <div className="flex items-center justify-between mb-4">
                <h1 className="text-2xl font-bold">{content.title}</h1>
                <Button className="gap-2">
                    <CheckCircle className="h-4 w-4" />
                    Mark as Complete
                </Button>
            </div>

            <div className="prose max-w-none text-muted-foreground">
                <p>{content.description}</p>
                {content.text_content && (
                    <div className="mt-8 border-t pt-8">
                        {content.text_content}
                    </div>
                )}
            </div>
        </div>
    );
}
