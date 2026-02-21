import { useState, useEffect, useMemo } from "react";
import MainLayout from "@/components/layout/MainLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Search, ShieldCheck, Lock, Users } from "lucide-react";
import { useUsers, UserWithRoles } from "@/hooks/useUsers";
import { useAuth } from "@/contexts/AuthContext";
import {
  PERMISSION_KEYS,
  type PermissionKey,
  type UserPermission,
  getDefaultPermissions,
  resolvePermissions,
  useUserPermissions,
  useSaveUserPermissions,
} from "@/hooks/useUserPermissions";
import { Database } from "@/integrations/supabase/types";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

type AppRole = Database["public"]["Enums"]["app_role"];

const ROLE_CONFIG: Record<AppRole, { label: string; color: string }> = {
  admin: {
    label: "ผู้ดูแลระบบ",
    color: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  },
  doctor: {
    label: "แพทย์",
    color: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  },
  therapist: {
    label: "นักจิตวิทยา",
    color:
      "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
  },
  staff: {
    label: "เจ้าหน้าที่",
    color:
      "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  },
};

const PermissionManagement = () => {
  const { data: users, isLoading } = useUsers();
  const { user: currentUser, refreshPermissions } = useAuth();
  const savePermissions = useSaveUserPermissions();
  const { toast } = useToast();

  const [searchTerm, setSearchTerm] = useState("");
  const [editingUser, setEditingUser] = useState<UserWithRoles | null>(null);
  const [permOverrides, setPermOverrides] = useState<Record<string, boolean>>(
    {},
  );
  const { data: userPerms } = useUserPermissions(editingUser?.user_id);

  // Fetch all user permission overrides for accurate menu counts
  const { data: allOverrides } = useQuery({
    queryKey: ["all-user-permissions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_permissions")
        .select("user_id, permission_key, is_allowed");
      if (error) throw error;
      return (data || []) as UserPermission[];
    },
  });

  // Group overrides by user_id
  const overridesByUser = useMemo(() => {
    const map = new Map<string, UserPermission[]>();
    for (const o of allOverrides || []) {
      if (!map.has(o.user_id)) map.set(o.user_id, []);
      map.get(o.user_id)!.push(o);
    }
    return map;
  }, [allOverrides]);

  useEffect(() => {
    if (!userPerms) return;
    const map: Record<string, boolean> = {};
    for (const p of userPerms) {
      map[p.permission_key] = p.is_allowed;
    }
    setPermOverrides(map);
  }, [userPerms]);

  const filteredUsers = users?.filter((user) => {
    if (!user.is_active) return false;
    return (
      user.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.roles.some((r) => ROLE_CONFIG[r]?.label.includes(searchTerm))
    );
  });

  const getInitials = (name: string) =>
    name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .substring(0, 2)
      .toUpperCase();

  const handleSave = async () => {
    if (!editingUser) return;
    try {
      const permEntries = Object.entries(permOverrides)
        .filter(([_, v]) => v !== undefined)
        .map(([key, is_allowed]) => ({ permission_key: key, is_allowed }));
      await savePermissions.mutateAsync({
        userId: editingUser.user_id,
        permissions: permEntries,
      });
      toast({
        title: "สำเร็จ",
        description: `บันทึกสิทธิ์ของ ${editingUser.full_name} เรียบร้อยแล้ว`,
      });
      // Refresh own permissions if editing self
      if (editingUser.user_id === currentUser?.id) {
        await refreshPermissions();
      }
      setEditingUser(null);
    } catch {
      // handled by hook
    }
  };

  const getUserPermissionSummary = (user: UserWithRoles) => {
    const userOverrides = overridesByUser.get(user.user_id) || [];
    const effective = resolvePermissions(
      user.roles as AppRole[],
      userOverrides,
    );
    return effective.size;
  };

  return (
    <MainLayout title="กำหนดสิทธิ์การเข้าถึง">
      <div className="p-6 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <ShieldCheck className="w-7 h-7 text-primary" />
            กำหนดสิทธิ์การเข้าถึง
          </h1>
          <p className="text-muted-foreground mt-1">
            กำหนดเมนูและฟีเจอร์ที่ผู้ใช้แต่ละคนสามารถเข้าถึงได้
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="border-0 shadow-sm bg-card">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <Users className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">
                  ผู้ใช้ที่ใช้งานอยู่
                </p>
                <p className="text-2xl font-bold text-foreground">
                  {users?.filter((u) => u.is_active).length || 0}
                </p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm bg-card">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <Lock className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">เมนูทั้งหมด</p>
                <p className="text-2xl font-bold text-foreground">
                  {Object.keys(PERMISSION_KEYS).length}
                </p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm bg-card">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <ShieldCheck className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">บทบาททั้งหมด</p>
                <p className="text-2xl font-bold text-foreground">4</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            placeholder="ค้นหาชื่อผู้ใช้หรือบทบาท..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Users Table */}
        <Card className="border-0 shadow-sm">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ผู้ใช้</TableHead>
                  <TableHead>บทบาท</TableHead>
                  <TableHead className="text-center">
                    เมนูที่เข้าถึงได้
                  </TableHead>
                  <TableHead className="text-right">จัดการ</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell>
                        <Skeleton className="h-10 w-48" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-6 w-24" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-6 w-12 mx-auto" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-8 w-24 ml-auto" />
                      </TableCell>
                    </TableRow>
                  ))
                ) : filteredUsers?.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={4}
                      className="text-center py-8 text-muted-foreground"
                    >
                      ไม่พบผู้ใช้
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredUsers?.map((user) => (
                    <TableRow key={user.user_id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-9 w-9">
                            <AvatarImage src={user.avatar_url || undefined} />
                            <AvatarFallback className="text-xs bg-primary/10 text-primary">
                              {getInitials(user.full_name)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium text-foreground">
                              {user.full_name}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {user.specialty || "-"}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {user.roles.map((role) => (
                            <Badge
                              key={role}
                              variant="secondary"
                              className={ROLE_CONFIG[role]?.color}
                            >
                              {ROLE_CONFIG[role]?.label || role}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline">
                          {getUserPermissionSummary(user)} เมนู
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setEditingUser(user);
                            setPermOverrides({});
                          }}
                          disabled={false}
                        >
                          <Lock className="w-4 h-4 mr-1" />
                          กำหนดสิทธิ์
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Permission Edit Dialog */}
      <Dialog open={!!editingUser} onOpenChange={() => setEditingUser(null)}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-primary mr-2" />
              <span className="mr-20">กำหนดสิทธิ์การเข้าถึงเมนู</span>
            </DialogTitle>
            <DialogDescription>
              {editingUser && (
                <span className="flex items-center gap-2 mt-1">
                  <Avatar className="h-6 w-6">
                    <AvatarImage src={editingUser.avatar_url || undefined} />
                    <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
                      {getInitials(editingUser.full_name)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="font-medium text-foreground">
                    {editingUser.full_name}
                  </span>
                  <span className="text-muted-foreground">—</span>
                  {editingUser.roles.map((r) => (
                    <Badge
                      key={r}
                      variant="secondary"
                      className={`${ROLE_CONFIG[r]?.color} text-[10px]`}
                    >
                      {ROLE_CONFIG[r]?.label}
                    </Badge>
                  ))}
                </span>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2 py-2">
            <p className="text-xs text-muted-foreground">
              เปิด = มีสิทธิ์เข้าถึง, ปิด = ไม่มีสิทธิ์ |
              กดรีเซ็ตเพื่อใช้ค่าเริ่มต้นตามบทบาท
            </p>
            {(Object.entries(PERMISSION_KEYS) as [PermissionKey, string][]).map(
              ([key, label]) => {
                const roleDefaults = editingUser
                  ? getDefaultPermissions(editingUser.roles as AppRole[])
                  : new Set<PermissionKey>();
                const isDefault = roleDefaults.has(key);
                const hasOverride = key in permOverrides;
                const isAllowed = hasOverride ? permOverrides[key] : isDefault;
                const isAdminOnly = key === "users" || key === "settings";

                return (
                  <div
                    key={key}
                    className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{label}</span>
                      {hasOverride ? (
                        <Badge
                          variant="outline"
                          className="text-[10px] px-1.5 py-0"
                        >
                          กำหนดเอง
                        </Badge>
                      ) : isDefault ? (
                        <Badge
                          variant="secondary"
                          className="text-[10px] px-1.5 py-0"
                        >
                          ค่าเริ่มต้น
                        </Badge>
                      ) : (
                        <Badge
                          variant="secondary"
                          className="text-[10px] px-1.5 py-0 opacity-50"
                        >
                          ไม่มีสิทธิ์
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {hasOverride && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 text-xs px-2"
                          onClick={() => {
                            const newOverrides = { ...permOverrides };
                            delete newOverrides[key];
                            setPermOverrides(newOverrides);
                          }}
                        >
                          รีเซ็ต
                        </Button>
                      )}
                      <Switch
                        checked={isAllowed}
                        onCheckedChange={(checked) => {
                          if (checked === isDefault) {
                            const newOverrides = { ...permOverrides };
                            delete newOverrides[key];
                            setPermOverrides(newOverrides);
                          } else {
                            setPermOverrides({
                              ...permOverrides,
                              [key]: checked,
                            });
                          }
                        }}
                        disabled={
                          editingUser?.roles.includes("admin") && isAdminOnly
                        }
                      />
                    </div>
                  </div>
                );
              },
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingUser(null)}>
              ยกเลิก
            </Button>
            <Button onClick={handleSave} disabled={savePermissions.isPending}>
              {savePermissions.isPending ? "กำลังบันทึก..." : "บันทึกสิทธิ์"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
};

export default PermissionManagement;
