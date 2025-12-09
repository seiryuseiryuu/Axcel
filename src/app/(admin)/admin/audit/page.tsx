import { createClient } from "@/lib/supabase/server";
import { requireAdminAccess } from "@/lib/rbac";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export default async function AuditPage() {
    await requireAdminAccess();
    const supabase = await createClient();

    const { data: logs } = await supabase
        .from("audit_logs")
        .select("*, profiles!actor_id(display_name, email:id)")
        // Join profiles for name. email is not in profiles, id is.
        .order("created_at", { ascending: false })
        .limit(50);

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Audit Logs</h1>
                <p className="text-muted-foreground">
                    Monitor system activities and security events.
                </p>
            </div>

            <div className="rounded-md border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Time</TableHead>
                            <TableHead>Actor</TableHead>
                            <TableHead>Action</TableHead>
                            <TableHead>Target</TableHead>
                            <TableHead>Details</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {logs?.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={5} className="text-center h-24 text-muted-foreground">
                                    No audit logs found.
                                </TableCell>
                            </TableRow>
                        )}
                        {logs?.map((log: any) => (
                            <TableRow key={log.id}>
                                <TableCell className="whitespace-nowrap font-mono text-xs">
                                    {new Date(log.created_at).toLocaleString()}
                                </TableCell>
                                <TableCell>
                                    <div className="flex flex-col">
                                        <span className="font-medium">{log.profiles?.display_name || 'System'}</span>
                                        <span className="text-xs text-muted-foreground">{log.actor_id}</span>
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <Badge variant="outline">{log.action}</Badge>
                                </TableCell>
                                <TableCell>
                                    <div className="flex flex-col">
                                        <span className="text-sm">{log.target_type}</span>
                                        <span className="text-xs text-muted-foreground font-mono">{log.target_id?.substring(0, 8)}...</span>
                                    </div>
                                </TableCell>
                                <TableCell className="max-w-xs truncate text-xs text-muted-foreground" title={JSON.stringify(log.details, null, 2)}>
                                    {JSON.stringify(log.details)}
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}
