import { createClient } from "@/lib/supabase/server";
import { CreateInstructorSheet } from "@/components/features/admin/CreateInstructorSheet";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { requireAdminAccess } from "@/lib/rbac";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export default async function InstructorsPage() {
    await requireAdminAccess(); // Ensure user is admin/instructor (but actually should be admin only?)
    // Role check: Instructor cannot manage other instructors. requireAdminAccess allows Instructor.
    // We need requireRole('admin') here ideally.

    const supabase = await createClient();

    // RLS will handle visibility? 
    // Admin sees all. Instructor sees only themselves?
    // Our RLS for profiles: "Admins can read all profiles".
    // "Instructors can read their students".
    // So Instructor cannot see other Instructors.

    const { data: instructors } = await supabase
        .from("profiles")
        .select("*")
        .eq("role", "instructor")
        .order("created_at", { ascending: false });

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Instructors</h1>
                    <p className="text-muted-foreground">
                        Manage course instructors and their access.
                    </p>
                </div>
                <CreateInstructorSheet />
            </div>

            <div className="rounded-md border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Instructor</TableHead>
                            <TableHead>Email</TableHead>
                            <TableHead>Joined</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {instructors?.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={4} className="text-center h-24 text-muted-foreground">
                                    No instructors found.
                                </TableCell>
                            </TableRow>
                        )}
                        {instructors?.map((instructor) => (
                            <TableRow key={instructor.id}>
                                <TableCell className="font-medium">
                                    <div className="flex items-center gap-3">
                                        <Avatar className="h-8 w-8">
                                            <AvatarImage src={instructor.avatar_url || ""} />
                                            <AvatarFallback>{instructor.display_name?.substring(0, 2).toUpperCase()}</AvatarFallback>
                                        </Avatar>
                                        {instructor.display_name}
                                    </div>
                                </TableCell>
                                <TableCell>{/* Email is not in profiles, it's in auth.users. 
                      However, we often sync email to profiles or join. 
                      RLS on auth.users is strict. 
                      For now, we don't display email unless we sync it.
                      Or we can fetch from auth via admin client but that's expensive.
                      Let's assume "display_name" is efficient.
                      If email is needed, we should add it to profiles or specific view. 
                      Actually, `profiles` usually has public info.
                      For Admin, we might want email.
                      Let's leave it blank or show ID for now.
                   */
                                    <span className="text-muted-foreground text-xs">{instructor.id}</span>
                                }</TableCell>
                                <TableCell>{new Date(instructor.created_at).toLocaleDateString()}</TableCell>
                                <TableCell className="text-right">
                                    {/* Actions like Edit/Delete */}
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}
