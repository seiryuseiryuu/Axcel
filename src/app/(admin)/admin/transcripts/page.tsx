import { createClient } from "@/lib/supabase/server";
import { requirePermission } from "@/lib/rbac";
import { Button } from "@/components/ui/button";

export default async function TranscriptsPage() {
    await requirePermission("canManageTranscripts");
    const supabase = await createClient();

    const { data: transcripts } = await supabase
        .from("transcripts")
        .select("*, contents(title, course_id, courses(title))")
        .order("created_at", { ascending: false });

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Transcripts & RAG</h1>
                    <p className="text-muted-foreground">
                        Manage knowledge base sources and embeddings.
                    </p>
                </div>
                <Button>Upload Transcript</Button>
            </div>

            <div className="border rounded-md p-8 text-center bg-muted/20">
                <h3 className="text-lg font-medium">No Transcripts Processed</h3>
                <p className="text-muted-foreground mb-4">Upload a transcript or link to a video to start RAG indexing.</p>
                {/* List would act here */}
                {transcripts?.length === 0 && <p>No records found.</p>}
            </div>
        </div>
    );
}
