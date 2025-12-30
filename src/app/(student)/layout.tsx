// Simplified layout for AI Studio focus
export const maxDuration = 60; // Set Vercel Function timeout to 60s (Hobby Limit)

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
