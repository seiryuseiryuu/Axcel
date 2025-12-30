"use client";

import { useState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format, addDays, addWeeks, addMonths } from "date-fns";
import { ja } from "date-fns/locale";
import { Plus, Loader2, CalendarClock, UserCog, RefreshCw, Calendar, ArrowLeft, Ban } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { createUser, getUsers, updateUserAccess, updateUserAccessByDate, disableUserAccess } from "@/app/actions/admin";

export default function AdminUsersPage() {
    const { toast } = useToast();
    const router = useRouter();
    const [users, setUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isPending, startTransition] = useTransition();
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [selectedUser, setSelectedUser] = useState<any>(null);
    const [durationType, setDurationType] = useState<"preset" | "custom" | "date">("preset");
    const [customDays, setCustomDays] = useState(30);
    const [customDate, setCustomDate] = useState("");
    const [createDurationType, setCreateDurationType] = useState<"preset" | "custom" | "date">("preset");
    const [createCustomDays, setCreateCustomDays] = useState(30);
    const [createCustomDate, setCreateCustomDate] = useState("");

    // Fetch users
    const loadUsers = async () => {
        setLoading(true);
        try {
            const data = await getUsers();
            setUsers(data);
        } catch (error) {
            toast({
                title: "エラー",
                description: "ユーザー一覧の取得に失敗しました",
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadUsers();
    }, []);

    // Handle Revoke Access
    const handleRevokeAccess = async (userId: string) => {
        startTransition(async () => {
            const result = await disableUserAccess(userId);
            if (result.success) {
                toast({
                    title: "権限剥奪完了",
                    description: "ユーザーのAI Studioアクセス権を剥奪しました",
                });
                loadUsers();
            } else {
                toast({
                    title: "エラー",
                    description: result.error,
                    variant: "destructive",
                });
            }
        });
    };

    // Handle Create User
    const handleCreate = async (formData: FormData) => {
        startTransition(async () => {
            const result = await createUser(formData);
            if (result.success) {
                toast({
                    title: "作成完了",
                    description: "新しいユーザーを作成しました",
                });
                setIsCreateOpen(false);
                loadUsers();
            } else {
                toast({
                    title: "作成失敗",
                    description: result.error,
                    variant: "destructive",
                });
            }
        });
    };

    // Calculate expiration date based on input type
    const calculateExpirationDate = (type: string, preset?: string, days?: number, dateStr?: string): Date | null => {
        if (type === "preset") {
            if (preset === "unlimited") return null;
            const months = parseInt(preset || "3");
            return addMonths(new Date(), months);
        } else if (type === "custom" && days) {
            return addDays(new Date(), days);
        } else if (type === "date" && dateStr) {
            return new Date(dateStr);
        }
        return addMonths(new Date(), 3); // default
    };

    // Handle Update Access
    const handleUpdateAccess = async (formData: FormData) => {
        if (!selectedUser) return;

        let expirationDate: Date | null = null;

        if (durationType === "preset") {
            const duration = formData.get("duration") as string;
            if (duration === "unlimited") {
                expirationDate = null;
            } else {
                expirationDate = addMonths(new Date(), parseInt(duration));
            }
        } else if (durationType === "custom") {
            expirationDate = addDays(new Date(), customDays);
        } else if (durationType === "date") {
            expirationDate = customDate ? new Date(customDate) : null;
        }

        startTransition(async () => {
            const result = await updateUserAccessByDate(
                selectedUser.id,
                expirationDate ? expirationDate.toISOString() : null
            );
            if (result.success) {
                toast({
                    title: "更新完了",
                    description: "アクセス権限を更新しました",
                });
                setIsEditOpen(false);
                setDurationType("preset");
                loadUsers();
            } else {
                toast({
                    title: "更新失敗",
                    description: result.error,
                    variant: "destructive",
                });
            }
        });
    };

    return (
        <div className="container mx-auto py-10 space-y-8">
            <div className="flex justify-between items-center">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={() => router.back()}>
                        <ArrowLeft className="w-5 h-5" />
                    </Button>
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">ユーザー管理</h1>
                        <p className="text-muted-foreground">アカウントの作成とAI Studio利用期限の管理を行います</p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={loadUsers} disabled={loading}>
                        <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
                        更新
                    </Button>
                    <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                        <DialogTrigger asChild>
                            <Button>
                                <Plus className="w-4 h-4 mr-2" />
                                新規ユーザー作成
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>新規ユーザー作成</DialogTitle>
                                <DialogDescription>
                                    生徒アカウントを作成し、AIツールへのアクセス権を設定します。
                                </DialogDescription>
                            </DialogHeader>
                            <form action={handleCreate} className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="displayName">表示名</Label>
                                    <Input id="displayName" name="displayName" placeholder="例: 山田 太郎" />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="email">メールアドレス *</Label>
                                    <Input id="email" name="email" type="email" required placeholder="user@example.com" />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="password">パスワード *</Label>
                                    <Input id="password" name="password" type="password" required />
                                </div>
                                <div className="space-y-2">
                                    <Label>ご利用期間</Label>
                                    <Tabs value={createDurationType} onValueChange={(v) => setCreateDurationType(v as any)} className="w-full">
                                        <TabsList className="grid w-full grid-cols-3">
                                            <TabsTrigger value="preset">プリセット</TabsTrigger>
                                            <TabsTrigger value="custom">日数指定</TabsTrigger>
                                            <TabsTrigger value="date">日付指定</TabsTrigger>
                                        </TabsList>
                                        <TabsContent value="preset" className="mt-2">
                                            <Select name="duration" defaultValue="3">
                                                <SelectTrigger>
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="1">1ヶ月</SelectItem>
                                                    <SelectItem value="2">2ヶ月</SelectItem>
                                                    <SelectItem value="3">3ヶ月</SelectItem>
                                                    <SelectItem value="6">6ヶ月</SelectItem>
                                                    <SelectItem value="9">9ヶ月</SelectItem>
                                                    <SelectItem value="12">12ヶ月（1年）</SelectItem>
                                                    <SelectItem value="18">18ヶ月</SelectItem>
                                                    <SelectItem value="24">24ヶ月（2年）</SelectItem>
                                                    <SelectItem value="unlimited">無期限</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </TabsContent>
                                        <TabsContent value="custom" className="mt-2">
                                            <div className="flex items-center gap-2">
                                                <Input
                                                    type="number"
                                                    name="customDays"
                                                    value={createCustomDays}
                                                    onChange={(e) => setCreateCustomDays(parseInt(e.target.value) || 0)}
                                                    min={1}
                                                    max={3650}
                                                    className="w-24"
                                                />
                                                <span className="text-sm text-muted-foreground">日間</span>
                                                <div className="flex gap-1 ml-auto">
                                                    <Button type="button" variant="outline" size="sm" onClick={() => setCreateCustomDays(7)}>7日</Button>
                                                    <Button type="button" variant="outline" size="sm" onClick={() => setCreateCustomDays(14)}>14日</Button>
                                                    <Button type="button" variant="outline" size="sm" onClick={() => setCreateCustomDays(30)}>30日</Button>
                                                    <Button type="button" variant="outline" size="sm" onClick={() => setCreateCustomDays(90)}>90日</Button>
                                                </div>
                                            </div>
                                        </TabsContent>
                                        <TabsContent value="date" className="mt-2">
                                            <div className="flex items-center gap-2">
                                                <Calendar className="w-4 h-4 text-muted-foreground" />
                                                <Input
                                                    type="date"
                                                    name="expirationDate"
                                                    value={createCustomDate}
                                                    onChange={(e) => setCreateCustomDate(e.target.value)}
                                                    min={format(addDays(new Date(), 1), 'yyyy-MM-dd')}
                                                    className="flex-1"
                                                />
                                            </div>
                                        </TabsContent>
                                    </Tabs>
                                    <input type="hidden" name="durationType" value={createDurationType} />
                                    <input type="hidden" name="customDaysValue" value={createCustomDays} />
                                    <input type="hidden" name="customDateValue" value={createCustomDate} />
                                </div>
                                <DialogFooter>
                                    <Button type="submit" disabled={isPending}>
                                        {isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                                        作成する
                                    </Button>
                                </DialogFooter>
                            </form>
                        </DialogContent>
                    </Dialog>
                </div>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>ユーザー一覧</CardTitle>
                    <CardDescription>{users.length}名のアカウントが登録されています</CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>ユーザー名</TableHead>
                                <TableHead>メールアドレス</TableHead>
                                <TableHead>ロール</TableHead>
                                <TableHead>ステータス</TableHead>
                                <TableHead>有効期限</TableHead>
                                <TableHead className="text-right">操作</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {users.map((user) => (
                                <TableRow key={user.id}>
                                    <TableCell className="font-medium">{user.display_name || "未設定"}</TableCell>
                                    <TableCell>{user.email}</TableCell>
                                    <TableCell>
                                        <Badge variant={user.role === "admin" ? "secondary" : "outline"}>
                                            {user.role}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        {user.studio_enabled ? (
                                            <Badge className="bg-green-500 hover:bg-green-600">有効</Badge>
                                        ) : (
                                            <Badge variant="destructive">無効</Badge>
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        {user.studio_expires_at ? (
                                            <div className="flex items-center text-sm">
                                                <CalendarClock className="w-4 h-4 mr-1 text-muted-foreground" />
                                                {format(new Date(user.studio_expires_at), "yyyy/MM/dd", { locale: ja })}
                                                {new Date(user.studio_expires_at) < new Date() && (
                                                    <span className="text-red-500 ml-2 text-xs font-bold">(期限切れ)</span>
                                                )}
                                            </div>
                                        ) : (
                                            <span className="text-muted-foreground text-sm">無期限</span>
                                        )}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex items-center justify-end gap-1">
                                            {user.studio_enabled && (
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => handleRevokeAccess(user.id)}
                                                    disabled={isPending}
                                                    title="権限剥奪"
                                                >
                                                    <Ban className="w-4 h-4 text-red-500" />
                                                </Button>
                                            )}
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => {
                                                    setSelectedUser(user);
                                                    setIsEditOpen(true);
                                                }}
                                            >
                                                <UserCog className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            {/* Edit Access Dialog */}
            <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>権限設定の変更</DialogTitle>
                        <DialogDescription>
                            {selectedUser?.display_name || selectedUser?.email} のAI Studio利用期限を変更します。
                        </DialogDescription>
                    </DialogHeader>
                    <form action={handleUpdateAccess} className="space-y-4">
                        <div className="space-y-3">
                            <Label>新しい有効期限</Label>

                            {/* Current expiration info */}
                            {selectedUser?.studio_expires_at && (
                                <div className="text-sm p-2 bg-muted rounded-md">
                                    現在の期限: <span className="font-medium">
                                        {format(new Date(selectedUser.studio_expires_at), "yyyy年MM月dd日", { locale: ja })}
                                    </span>
                                    {new Date(selectedUser.studio_expires_at) < new Date() && (
                                        <Badge variant="destructive" className="ml-2">期限切れ</Badge>
                                    )}
                                </div>
                            )}

                            <Tabs value={durationType} onValueChange={(v) => setDurationType(v as any)} className="w-full">
                                <TabsList className="grid w-full grid-cols-3">
                                    <TabsTrigger value="preset">プリセット</TabsTrigger>
                                    <TabsTrigger value="custom">日数指定</TabsTrigger>
                                    <TabsTrigger value="date">日付指定</TabsTrigger>
                                </TabsList>

                                <TabsContent value="preset" className="mt-3 space-y-2">
                                    <Select name="duration" defaultValue="3">
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="1">1ヶ月</SelectItem>
                                            <SelectItem value="2">2ヶ月</SelectItem>
                                            <SelectItem value="3">3ヶ月</SelectItem>
                                            <SelectItem value="6">6ヶ月</SelectItem>
                                            <SelectItem value="9">9ヶ月</SelectItem>
                                            <SelectItem value="12">12ヶ月（1年）</SelectItem>
                                            <SelectItem value="18">18ヶ月</SelectItem>
                                            <SelectItem value="24">24ヶ月（2年）</SelectItem>
                                            <SelectItem value="36">36ヶ月（3年）</SelectItem>
                                            <SelectItem value="unlimited">無期限</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <p className="text-xs text-muted-foreground">
                                        今日から選択した期間が有効になります
                                    </p>
                                </TabsContent>

                                <TabsContent value="custom" className="mt-3 space-y-2">
                                    <div className="flex items-center gap-2">
                                        <Input
                                            type="number"
                                            value={customDays}
                                            onChange={(e) => setCustomDays(parseInt(e.target.value) || 0)}
                                            min={1}
                                            max={3650}
                                            className="w-24"
                                        />
                                        <span className="text-sm">日間</span>
                                    </div>
                                    <div className="flex flex-wrap gap-1">
                                        <Button type="button" variant="outline" size="sm" onClick={() => setCustomDays(7)}>1週間</Button>
                                        <Button type="button" variant="outline" size="sm" onClick={() => setCustomDays(14)}>2週間</Button>
                                        <Button type="button" variant="outline" size="sm" onClick={() => setCustomDays(30)}>1ヶ月</Button>
                                        <Button type="button" variant="outline" size="sm" onClick={() => setCustomDays(45)}>45日</Button>
                                        <Button type="button" variant="outline" size="sm" onClick={() => setCustomDays(60)}>60日</Button>
                                        <Button type="button" variant="outline" size="sm" onClick={() => setCustomDays(90)}>90日</Button>
                                        <Button type="button" variant="outline" size="sm" onClick={() => setCustomDays(180)}>半年</Button>
                                        <Button type="button" variant="outline" size="sm" onClick={() => setCustomDays(365)}>1年</Button>
                                    </div>
                                    {customDays > 0 && (
                                        <p className="text-xs text-muted-foreground">
                                            → {format(addDays(new Date(), customDays), "yyyy年MM月dd日", { locale: ja })} まで有効
                                        </p>
                                    )}
                                </TabsContent>

                                <TabsContent value="date" className="mt-3 space-y-2">
                                    <div className="flex items-center gap-2">
                                        <Calendar className="w-4 h-4 text-muted-foreground" />
                                        <Input
                                            type="date"
                                            value={customDate}
                                            onChange={(e) => setCustomDate(e.target.value)}
                                            min={format(addDays(new Date(), 1), 'yyyy-MM-dd')}
                                            className="flex-1"
                                        />
                                    </div>
                                    {customDate && (
                                        <p className="text-xs text-muted-foreground">
                                            → {format(new Date(customDate), "yyyy年MM月dd日", { locale: ja })} まで有効
                                        </p>
                                    )}
                                </TabsContent>
                            </Tabs>
                        </div>
                        <DialogFooter>
                            <Button type="submit" disabled={isPending}>
                                {isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                                更新する
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
}
