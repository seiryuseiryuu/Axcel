"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetFooter,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from "@/components/ui/sheet";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { useRouter } from "next/navigation";
import { Plus, Sparkles } from "lucide-react";

// Studio subscription options
const STUDIO_DURATION_OPTIONS = [
    { value: "0", label: "無効（Studioアクセスなし）" },
    { value: "1", label: "1ヶ月" },
    { value: "3", label: "3ヶ月" },
    { value: "6", label: "6ヶ月" },
    { value: "12", label: "12ヶ月" },
    { value: "unlimited", label: "無期限" },
];

export function CreateStudentSheet({ availableCourses }: { availableCourses?: { id: string; title: string }[] }) {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        email: "",
        password: "",
        displayName: "",
        studioMonths: "0",  // Default: no studio access
    });
    const router = useRouter();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const res = await fetch("/api/admin/create-student", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formData),
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || "Failed to create student");
            }

            setOpen(false);
            router.refresh();
            setFormData({ email: "", password: "", displayName: "", studioMonths: "0" });
        } catch (error: any) {
            alert(error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
                <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Student
                </Button>
            </SheetTrigger>
            <SheetContent>
                <form onSubmit={handleSubmit}>
                    <SheetHeader>
                        <SheetTitle>Add Student</SheetTitle>
                        <SheetDescription>
                            Create a new student account with AI Studio access settings.
                        </SheetDescription>
                    </SheetHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="email">Email</Label>
                            <Input
                                id="email"
                                type="email"
                                required
                                value={formData.email}
                                onChange={(e) =>
                                    setFormData({ ...formData, email: e.target.value })
                                }
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="name">Display Name</Label>
                            <Input
                                id="name"
                                required
                                value={formData.displayName}
                                onChange={(e) =>
                                    setFormData({ ...formData, displayName: e.target.value })
                                }
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="password">Initial Password</Label>
                            <Input
                                id="password"
                                type="password"
                                required
                                minLength={8}
                                value={formData.password}
                                onChange={(e) =>
                                    setFormData({ ...formData, password: e.target.value })
                                }
                            />
                        </div>

                        {/* AI Studio Access Duration */}
                        <div className="grid gap-2 pt-4 border-t">
                            <Label htmlFor="studioMonths" className="flex items-center gap-2">
                                <Sparkles className="h-4 w-4 text-primary" />
                                AI Studio 利用期間
                            </Label>
                            <Select
                                value={formData.studioMonths}
                                onValueChange={(value) =>
                                    setFormData({ ...formData, studioMonths: value })
                                }
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="利用期間を選択" />
                                </SelectTrigger>
                                <SelectContent>
                                    {STUDIO_DURATION_OPTIONS.map((option) => (
                                        <SelectItem key={option.value} value={option.value}>
                                            {option.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <p className="text-xs text-muted-foreground">
                                サムネイル作成・SEO記事作成・動画台本作成の3ツールが利用可能
                            </p>
                        </div>
                    </div>
                    <SheetFooter>
                        <Button type="submit" disabled={loading}>
                            {loading ? "Creating..." : "Create Account"}
                        </Button>
                    </SheetFooter>
                </form>
            </SheetContent>
        </Sheet>
    );
}

