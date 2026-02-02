// Simplified layout for AI Studio focus
export const runtime = 'nodejs'; // Explicitly use Node.js runtime
export const maxDuration = 300; // Set Vercel Function timeout to 300s (5min)

export default function StudentLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="h-full relative font-body bg-background text-foreground">
            {/* Full width content, no global sidebar */}
            <main className="h-full w-full">
                <div className="h-full">
                    {children}
                </div>
            </main>
        </div>
    );
}
