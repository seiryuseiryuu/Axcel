import { Sidebar, MobileSidebar } from "@/components/layout/sidebar";

import { requireAdminAccess } from "@/lib/rbac";

export default async function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    await requireAdminAccess();

    return (
        <div className="h-full relative">
            <div className="hidden h-full md:flex md:w-72 md:flex-col md:fixed md:inset-y-0 z-[80] bg-gray-900">
                <Sidebar role="admin" />
            </div>
            <main className="md:pl-72 h-full">
                <div className="flex items-center p-4 md:hidden">
                    <MobileSidebar role="admin" />
                </div>
                <div className="p-8 h-full">
                    {children}
                </div>
            </main>
        </div>
    );
}
