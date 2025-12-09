import { Sidebar, MobileSidebar } from "@/components/layout/sidebar";

export default function StudentLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="h-full relative font-body">
            <div className="hidden h-full md:flex md:w-72 md:flex-col md:fixed md:inset-y-0 z-[80] bg-background border-r border-border">
                <Sidebar role="student" />
            </div>
            <main className="md:pl-72 h-full">
                <div className="flex items-center p-4 md:hidden">
                    <MobileSidebar role="student" />
                </div>
                <div className="p-4 md:p-8 h-full bg-background">
                    {children}
                </div>
            </main>
        </div>
    );
}
