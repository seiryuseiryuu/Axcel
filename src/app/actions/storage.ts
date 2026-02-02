"use server";

import { createClient } from "@/lib/supabase/server";

/**
 * Uploads a Base64 image to Supabase Storage
 */
export async function uploadImage(
    base64Data: string,
    bucket: string = "thumbnails",
    folder: string = "generated"
): Promise<{ success: boolean; url?: string; error?: string }> {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return { success: false, error: "Unauthorized" };
        }

        // 1. Parse Base64
        // Format: data:image/png;base64,iVBORw0KGgo...
        const matches = base64Data.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);

        if (!matches || matches.length !== 3) {
            // Check if it's raw base64 without prefix (sometimes happens)
            // But usually Gemini sends with prefix if we handle it, 
            // the gemini.ts lib adds it: `data:${inlineData.mimeType};base64,${inlineData.data}`
            return { success: false, error: "Invalid base64 image format" };
        }

        const mimeType = matches[1];
        const buffer = Buffer.from(matches[2], 'base64');
        const extension = mimeType.split('/')[1] || 'png';

        // 2. Generate unique filename
        const filename = `${folder}/${user.id}/${crypto.randomUUID()}.${extension}`;

        // 3. Upload to Supabase Storage
        const { data, error } = await supabase
            .storage
            .from(bucket)
            .upload(filename, buffer, {
                contentType: mimeType,
                upsert: false
            });

        if (error) {
            console.error("Storage upload error:", error);
            // Hint for common error
            if (error.message.includes("Bucket not found")) {
                return { success: false, error: "Storage bucket 'thumbnails' not found. Please create it in Supabase dashboard (Public)." };
            }
            return { success: false, error: error.message };
        }

        // 4. Get Public URL
        const { data: publicUrlData } = supabase
            .storage
            .from(bucket)
            .getPublicUrl(filename);

        return { success: true, url: publicUrlData.publicUrl };

    } catch (e: any) {
        console.error("Upload exception:", e);
        return { success: false, error: e.message };
    }
}
