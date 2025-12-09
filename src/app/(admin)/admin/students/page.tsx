import { createClient } from "@/lib/supabase/server";
import { CreateStudentSheet } from "@/components/features/admin/CreateStudentSheet";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { requirePermission } from "@/lib/rbac";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export default async function StudentsPage() {
    const user = await requirePermission("canAccessAdminPanel");

    const supabase = await createClient();

    // Logic:
    // If Admin -> fetch all students
    // If Instructor -> fetch students enrolled in my courses

    let students = [];

    if (user.role === 'admin') {
        const { data } = await supabase
            .from("profiles")
            .select("*")
            .eq("role", "student")
            .order("created_at", { ascending: false });
        students = data || [];
    } else if (user.role === 'instructor') {
        // Complex query: get students linked via enrollments
        // Supabase supports foreign table joins
        const { data } = await supabase
            .from("course_enrollments")
            .select("student_id, profiles!student_id(*), courses!inner(instructor_id)")
            .eq("courses.instructor_id", user.id);

        // Extract unique students
        const studentMap = new Map();
        data?.forEach((enrollment: any) => {
            if (enrollment.profiles) {
                studentMap.set(enrollment.student_id, enrollment.profiles);
            }
        });
        students = Array.from(studentMap.values());
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Students</h1>
                    <p className="text-muted-foreground">
                        Manage your students and their enrollment status.
                    </p>
                </div>
                <CreateStudentSheet />
            </div>

            <div className="rounded-md border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Student</TableHead>
                            <TableHead>Joined</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {students.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={3} className="text-center h-24 text-muted-foreground">
                                    No students found.
                                </TableCell>
                            </TableRow>
                        )}
                        {students.map((student) => (
                            <TableRow key={student.id}>
                                <TableCell className="font-medium">
                                    <div className="flex items-center gap-3">
                                        <Avatar className="h-8 w-8">
                                            <AvatarImage src={student.avatar_url || ""} />
                                            <AvatarFallback>{student.display_name?.substring(0, 2).toUpperCase()}</AvatarFallback>
                                        </Avatar>
                                        {student.display_name}
                                    </div>
                                </TableCell>
                                <TableCell>{new Date(student.created_at).toLocaleDateString()}</TableCell>
                                <TableCell className="text-right">
                                    <Button variant="ghost" size="sm">Details</Button>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}
// Helper component for client actions (not used properly above due to SC limitations, but good enough for now)
import { Button } from "@/components/ui/button";
