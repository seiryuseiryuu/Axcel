import { createClient } from "@/lib/supabase/server";
import { CreateStudentSheet } from "@/components/features/admin/CreateStudentSheet";
import { StudentActionMenu } from "@/components/features/admin/StudentActionMenu";
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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";

// Helper function to format studio access status
function getStudioStatus(studioEnabled: boolean, expiresAt: string | null) {
    if (!studioEnabled) {
        return { label: "無効", variant: "outline" as const };
    }

    if (!expiresAt) {
        return { label: "無期限", variant: "default" as const };
    }

    const expDate = new Date(expiresAt);
    const now = new Date();

    if (expDate < now) {
        return { label: "期限切れ", variant: "destructive" as const };
    }

    const daysRemaining = Math.ceil((expDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    if (daysRemaining <= 7) {
        return { label: `残り${daysRemaining}日`, variant: "destructive" as const };
    } else if (daysRemaining <= 30) {
        return { label: `残り${daysRemaining}日`, variant: "secondary" as const };
    }

    return { label: `${expDate.toLocaleDateString()}まで`, variant: "default" as const };
}

export default async function StudentsPage() {
    const user = await requirePermission("canAccessAdminPanel");

    const supabase = await createClient();

    // Logic:
    // If Admin -> fetch all students
    // If Instructor -> fetch students enrolled in my courses

    let students: any[] = [];

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
                    <h1 className="text-3xl font-bold tracking-tight">ユーザー管理</h1>
                    <p className="text-muted-foreground">
                        アカウントの作成とAI Studio利用期限の管理を行います
                    </p>
                </div>
                <CreateStudentSheet />
            </div>

            <div className="rounded-md border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Student</TableHead>
                            <TableHead>
                                <span className="flex items-center gap-1">
                                    <Sparkles className="h-3 w-3" />
                                    AI Studio
                                </span>
                            </TableHead>
                            <TableHead>Joined</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {students.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={4} className="text-center h-24 text-muted-foreground">
                                    No students found.
                                </TableCell>
                            </TableRow>
                        )}
                        {students.map((student) => {
                            const studioStatus = getStudioStatus(
                                student.studio_enabled || false,
                                student.studio_expires_at
                            );
                            return (
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
                                    <TableCell>
                                        <Badge variant={studioStatus.variant}>
                                            {studioStatus.label}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>{new Date(student.created_at).toLocaleDateString()}</TableCell>
                                    <TableCell className="text-right">
                                        <StudentActionMenu
                                            studentId={student.id}
                                            studentName={student.display_name}
                                            studioEnabled={student.studio_enabled}
                                        />
                                    </TableCell>
                                </TableRow>
                            );
                        })}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}
