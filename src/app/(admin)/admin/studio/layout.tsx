import { StudioSidebar } from "@/components/features/studio/StudioSidebar";

export default function StudioLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="flex h-[calc(100vh-4rem)] -m-4 md:-m-8">
            <StudioSidebar />
            <main className="flex-1 overflow-auto">
                <div className="p-6">
                    {children}
                </div>
            </main>
        </div>
    );
}
