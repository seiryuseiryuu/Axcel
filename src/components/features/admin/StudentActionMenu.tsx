"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { MoreHorizontal, Power, Calendar, CheckCircle, Trash2 } from "lucide-react";
import { disableUserAccess, updateUserAccess, deleteUser } from "@/app/actions/admin";
import { useRouter } from "next/navigation";
// import { toast } from "sonner"; // Assuming sonner is used, or generic alert

const DURATION_OPTIONS = [
    { value: "unlimited", label: "無期限" },
    { value: "1", label: "1ヶ月延長" },
    { value: "3", label: "3ヶ月延長" },
    { value: "6", label: "6ヶ月延長" },
    { value: "12", label: "12ヶ月延長" },
];

interface StudentActionMenuProps {
    studentId: string;
    studentName: string;
    studioEnabled: boolean;
}

export function StudentActionMenu({ studentId, studentName, studioEnabled }: StudentActionMenuProps) {
    const [open, setOpen] = useState(false); // Dialog open state
    const [loading, setLoading] = useState(false);
    const [duration, setDuration] = useState("unlimited");
    const router = useRouter();

    const handleEnable = async () => {
        setLoading(true);
        try {
            const months = duration === "unlimited" ? null : parseInt(duration);
            const result = await updateUserAccess(studentId, months);
            if (!result.success) throw new Error(result.error);

            setOpen(false);
            router.refresh();
            // toast.success("更新しました");
        } catch (error: any) {
            alert(error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async () => {
        if (!confirm(`本当に ${studentName} さんを削除しますか？\nこの操作は取り消せません。`)) return;

        setLoading(true);
        try {
            const result = await deleteUser(studentId);
            if (!result.success) throw new Error(result.error);

            router.refresh();
        } catch (error: any) {
            alert(error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleDisable = async () => {
        if (!confirm(`${studentName}さんのStudioアクセスを無効にしますか？`)) return;

        setLoading(true);
        try {
            const result = await disableUserAccess(studentId);
            if (!result.success) throw new Error(result.error);

            router.refresh();
        } catch (error: any) {
            alert(error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="h-8 w-8 p-0">
                        <span className="sr-only">Open menu</span>
                        <MoreHorizontal className="h-4 w-4" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                    <DropdownMenuLabel>操作</DropdownMenuLabel>
                    <DropdownMenuItem onClick={() => setOpen(true)}>
                        <Calendar className="mr-2 h-4 w-4" />
                        有効期限を変更
                    </DropdownMenuItem>
                    {studioEnabled && (
                        <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={handleDisable} className="text-destructive">
                                <Power className="mr-2 h-4 w-4" />
                                無効にする
                            </DropdownMenuItem>
                        </>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleDelete} className="text-destructive">
                        <Trash2 className="mr-2 h-4 w-4" />
                        削除する
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>

            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Studioアクセスの設定</DialogTitle>
                        <DialogDescription>
                            {studentName}さんのAI Studio利用期間を設定します。
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label>利用期間</Label>
                            <Select value={duration} onValueChange={setDuration}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {DURATION_OPTIONS.map((opt) => (
                                        <SelectItem key={opt.value} value={opt.value}>
                                            {opt.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <p className="text-sm text-muted-foreground">
                                ※「延長」を選択すると、現在の日時から指定期間が設定されます。
                            </p>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>
                            キャンセル
                        </Button>
                        <Button onClick={handleEnable} disabled={loading}>
                            <CheckCircle className="mr-2 h-4 w-4" />
                            設定を保存
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
