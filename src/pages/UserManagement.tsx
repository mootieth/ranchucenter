import { useState, useCallback } from "react";
import MainLayout from "@/components/layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, Shield, UserCog, Users, Plus, Pencil, KeyRound, UserX, MapPin, Trash2, CalendarDays, Link2, Copy, Check as CheckIcon, Loader2 } from "lucide-react";
import WebcamCapture from "@/components/WebcamCapture";
import AddressSearchSelect from "@/components/ui/address-search-select";
import { DateInput } from "@/components/ui/date-input";
import ProviderScheduleEditor from "@/components/settings/ProviderScheduleEditor";
import {
  useUsers,
  useUpdateUserRoles,
  useRegisterUser,
  useUpdateUserProfile,
  useDeleteUser,
  UserWithRoles,
} from "@/hooks/useUsers";
import {
  useProvinceNames,
  useDistrictsByProvince,
  useSubdistrictsByDistrict,
  usePostalCode,
} from "@/hooks/useThailandAddresses";
import { Database } from "@/integrations/supabase/types";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { th } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";

type AppRole = Database["public"]["Enums"]["app_role"];

const ROLE_CONFIG: Record<AppRole, { label: string; color: string }> = {
  admin: { label: "ผู้ดูแลระบบ", color: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400" },
  doctor: { label: "แพทย์", color: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400" },
  therapist: {
    label: "นักจิตวิทยา",
    color: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
  },
  staff: { label: "เจ้าหน้าที่", color: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400" },
};

const ALL_ROLES: AppRole[] = ["admin", "doctor", "therapist", "staff"];

// Address fields sub-component for reuse
const AddressFields = ({
  form,
  setForm,
}: {
  form: {
    house_number: string;
    moo: string;
    street: string;
    province: string;
    district: string;
    subdistrict: string;
    postal_code: string;
  };
  setForm: (updater: (prev: any) => any) => void;
}) => {
  const { data: provinces } = useProvinceNames();
  const { data: districts } = useDistrictsByProvince(form.province);
  const { data: subdistricts } = useSubdistrictsByDistrict(form.province, form.district);
  const postalCode = usePostalCode(form.province, form.district, form.subdistrict);

  const handleProvinceChange = (v: string) => {
    setForm((f: any) => ({ ...f, province: v, district: "", subdistrict: "", postal_code: "" }));
  };
  const handleDistrictChange = (v: string) => {
    setForm((f: any) => ({ ...f, district: v, subdistrict: "", postal_code: "" }));
  };
  const handleSubdistrictChange = (v: string) => {
    const sub = subdistricts.find((s) => s.name === v);
    setForm((f: any) => ({ ...f, subdistrict: v, postal_code: sub?.postalCode || postalCode || "" }));
  };

  return (
    <>
      <Separator />
      <div className="space-y-1">
        <Label className="text-base font-medium flex items-center gap-2">
          <MapPin className="w-4 h-4" />
          ที่อยู่ตามบัตรประชาชน
        </Label>
        <p className="text-xs text-muted-foreground">สำหรับออกสลิปเงินเดือน</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div>
          <Label>บ้านเลขที่ <span className="text-destructive">*</span></Label>
          <Input
            value={form.house_number}
            onChange={(e) => setForm((f: any) => ({ ...f, house_number: e.target.value }))}
            placeholder="เช่น 123/4"
          />
        </div>
        <div>
          <Label>หมู่</Label>
          <Input value={form.moo} onChange={(e) => setForm((f: any) => ({ ...f, moo: e.target.value }))} placeholder="เช่น 5" />
        </div>
        <div>
          <Label>ถนน/ซอย</Label>
          <Input value={form.street} onChange={(e) => setForm((f: any) => ({ ...f, street: e.target.value }))} placeholder="เช่น ถนนสุขุมวิท ซอย 12" />
        </div>
        <div>
          <Label>จังหวัด <span className="text-destructive">*</span></Label>
          <AddressSearchSelect
            value={form.province}
            onValueChange={handleProvinceChange}
            options={provinces}
            placeholder="เลือกจังหวัด"
            searchPlaceholder="ค้นหาจังหวัด..."
          />
        </div>
        <div>
          <Label>อำเภอ/เขต <span className="text-destructive">*</span></Label>
          <AddressSearchSelect
            value={form.district}
            onValueChange={handleDistrictChange}
            options={districts}
            placeholder="เลือกอำเภอ/เขต"
            searchPlaceholder="ค้นหาอำเภอ..."
            disabled={!form.province}
          />
        </div>
        <div>
          <Label>ตำบล/แขวง <span className="text-destructive">*</span></Label>
          <AddressSearchSelect
            value={form.subdistrict}
            onValueChange={handleSubdistrictChange}
            options={subdistricts.map((s) => s.name)}
            placeholder="เลือกตำบล/แขวง"
            searchPlaceholder="ค้นหาตำบล..."
            disabled={!form.district}
          />
        </div>
        <div>
          <Label>รหัสไปรษณีย์</Label>
          <Input value={form.postal_code} readOnly placeholder="อัตโนมัติ" className="bg-muted" />
        </div>
      </div>
    </>
  );
};

const UserManagement = () => {
  const { data: users, isLoading } = useUsers();
  const updateRoles = useUpdateUserRoles();
  const registerUser = useRegisterUser();
  const updateProfile = useUpdateUserProfile();
  const deleteUser = useDeleteUser();
  const { toast } = useToast();

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");

  // Role editing dialog
  const [editingUser, setEditingUser] = useState<{
    userId: string;
    fullName: string;
    roles: AppRole[];
  } | null>(null);
  const [selectedRoles, setSelectedRoles] = useState<AppRole[]>([]);

  // Register dialog
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const [registerForm, setRegisterForm] = useState({
    full_name: "",
    nickname: "",
    id_card: "",
    date_of_birth: "",
    email: "",
    password: "",
    confirm_password: "",
    phone: "",
    role: "staff" as AppRole,
    specialty: "",
    license_number: "",
    salary: "",
    house_number: "",
    moo: "",
    street: "",
    province: "",
    district: "",
    subdistrict: "",
    postal_code: "",
  });
  const [registerPhotoFile, setRegisterPhotoFile] = useState<File | null>(null);
  const [registerPhotoPreview, setRegisterPhotoPreview] = useState<string | null>(null);

  // Edit profile dialog
  const [editingProfile, setEditingProfile] = useState<UserWithRoles | null>(null);
  const [editForm, setEditForm] = useState({
    full_name: "",
    nickname: "",
    id_card: "",
    date_of_birth: "",
    phone: "",
    specialty: "",
    license_number: "",
    salary: "",
    is_active: true,
    resignation_date: "",
    deactivation_reason: "",
    suspension_reason: "",
    house_number: "",
    moo: "",
    street: "",
    province: "",
    district: "",
    subdistrict: "",
    postal_code: "",
  });
  const [editPhotoFile, setEditPhotoFile] = useState<File | null>(null);
  const [editPhotoPreview, setEditPhotoPreview] = useState<string | null>(null);
  const [editSelectedRoles, setEditSelectedRoles] = useState<AppRole[]>([]);




  // Reset password dialog
  const [resetPasswordUser, setResetPasswordUser] = useState<{ userId: string; fullName: string } | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [isResetting, setIsResetting] = useState(false);

  // Schedule dialog
  const [scheduleUser, setScheduleUser] = useState<{ userId: string; fullName: string } | null>(null);

  // Delete user dialog
  const [deletingUser, setDeletingUser] = useState<{ userId: string; fullName: string } | null>(null);
  const [deleteConfirmPassword, setDeleteConfirmPassword] = useState("");

  // Invite link dialog
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [inviteRole, setInviteRole] = useState<AppRole>("staff");
  const [generatedLink, setGeneratedLink] = useState<string>("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);

  const handleGenerateInviteLink = async () => {
    setIsGenerating(true);
    try {
      const { data, error } = await supabase
        .from("invite_tokens")
        .insert({
          role: inviteRole,
          created_by: (await supabase.auth.getUser()).data.user?.id || "",
        })
        .select("token")
        .single();

      if (error) throw error;

      const link = `${window.location.origin}/staff-register?token=${data.token}`;
      setGeneratedLink(link);
    } catch (err: any) {
      toast({ title: "เกิดข้อผิดพลาด", description: err.message, variant: "destructive" });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopyLink = async () => {
    await navigator.clipboard.writeText(generatedLink);
    setLinkCopied(true);
    toast({ title: "คัดลอกแล้ว", description: "ลิงก์ถูกคัดลอกไปยังคลิปบอร์ด" });
    setTimeout(() => setLinkCopied(false), 2000);
  };

  const filteredUsers = users?.filter((user) => {
    const matchesSearch =
      user.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.phone?.includes(searchTerm) ||
      user.specialty?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "active" && user.is_active) ||
      (statusFilter === "inactive" && !user.is_active);
    return matchesSearch && matchesStatus;
  });

  // --- Role editing handlers ---
  const handleEditRoles = (user: UserWithRoles) => {
    setEditingUser({
      userId: user.user_id,
      fullName: user.full_name,
      roles: user.roles,
    });
    setSelectedRoles([...user.roles]);
  };

  const handleRoleToggle = (role: AppRole) => {
    setSelectedRoles((prev) => (prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]));
  };

  const handleSaveRoles = async () => {
    if (!editingUser) return;
    await updateRoles.mutateAsync({
      userId: editingUser.userId,
      roles: selectedRoles,
    });
    setEditingUser(null);
  };

  // --- Register handlers ---
  const handleRegisterWebcamCapture = useCallback((blob: Blob) => {
    const file = new File([blob], "avatar.jpg", { type: blob.type || "image/jpeg" });
    setRegisterPhotoFile(file);
    setRegisterPhotoPreview(URL.createObjectURL(blob));
  }, []);

  const resetRegisterForm = () => {
    setRegisterForm({
      full_name: "",
      nickname: "",
      id_card: "",
      date_of_birth: "",
      email: "",
      password: "",
      confirm_password: "",
      phone: "",
      role: "staff",
      specialty: "",
      license_number: "",
      salary: "",
      house_number: "",
      moo: "",
      street: "",
      province: "",
      district: "",
      subdistrict: "",
      postal_code: "",
    });
    setRegisterPhotoFile(null);
    setRegisterPhotoPreview(null);
  };

  const handleRegister = async () => {
    const missingFields: string[] = [];
    if (!registerForm.full_name.trim()) missingFields.push("ชื่อ-สกุล");
    if (!registerForm.nickname.trim()) missingFields.push("ชื่อเล่น");
    if (!registerForm.id_card.trim()) missingFields.push("เลขบัตรประชาชน");
    if (!registerForm.date_of_birth) missingFields.push("วัน/เดือน/ปี เกิด");
    if (!registerForm.phone.trim()) missingFields.push("เบอร์โทรศัพท์");
    if (!registerForm.email.trim()) missingFields.push("อีเมล");
    if (!registerForm.specialty.trim()) missingFields.push((registerForm.role === "doctor" || registerForm.role === "therapist") ? "ความเชี่ยวชาญ" : "ตำแหน่ง");
    if ((registerForm.role === "doctor" || registerForm.role === "therapist") && !registerForm.license_number.trim()) missingFields.push("เลขใบอนุญาตฯ");
    
    if (!registerForm.house_number.trim()) missingFields.push("บ้านเลขที่");
    if (!registerForm.province) missingFields.push("จังหวัด");
    if (!registerForm.district) missingFields.push("อำเภอ/เขต");
    if (!registerForm.subdistrict) missingFields.push("ตำบล/แขวง");
    if (!registerForm.password) missingFields.push("รหัสผ่าน");
    if (!registerForm.confirm_password) missingFields.push("ยืนยันรหัสผ่าน");

    if (missingFields.length > 0) {
      toast({ title: "กรุณากรอกข้อมูลให้ครบ", description: missingFields.join(", "), variant: "destructive" });
      return;
    }
    if (registerForm.password.length < 6) {
      toast({ title: "รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร", variant: "destructive" });
      return;
    }
    if (registerForm.password !== registerForm.confirm_password) {
      toast({ title: "รหัสผ่านไม่ตรงกัน", description: "กรุณากรอกยืนยันรหัสผ่านให้ตรงกัน", variant: "destructive" });
      return;
    }

    try {
      const result = await registerUser.mutateAsync({
        email: registerForm.email,
        password: registerForm.password,
        full_name: registerForm.full_name,
        phone: registerForm.phone || undefined,
        specialty: registerForm.specialty || undefined,
        license_number: registerForm.license_number || undefined,
        role: registerForm.role,
        salary: registerForm.salary ? parseFloat(registerForm.salary) : undefined,
      });

      // Upload photo if selected
      if (registerPhotoFile && result?.user_id) {
        const filePath = `${result.user_id}/avatar.jpg`;
        const { error: uploadError } = await supabase.storage
          .from("staff-photos")
          .upload(filePath, registerPhotoFile, { upsert: true, contentType: "image/jpeg" });

        if (uploadError) {
          console.error("Photo upload error:", uploadError);
          toast({ title: "อัปโหลดรูปไม่สำเร็จ", description: uploadError.message, variant: "destructive" });
        } else {
          const { data: publicUrl } = supabase.storage.from("staff-photos").getPublicUrl(filePath);
          await updateProfile.mutateAsync({
            userId: result.user_id,
            data: { avatar_url: `${publicUrl.publicUrl}?t=${Date.now()}` },
          });
        }
      }

      // Update address and additional fields if provided
      if (result?.user_id) {
        const extraData: Record<string, any> = {};
        if (registerForm.nickname) extraData.nickname = registerForm.nickname;
        if (registerForm.id_card) extraData.id_card = registerForm.id_card;
        if (registerForm.date_of_birth) extraData.date_of_birth = registerForm.date_of_birth;
        if (registerForm.house_number) extraData.house_number = registerForm.house_number;
        if (registerForm.moo) extraData.moo = registerForm.moo;
        if (registerForm.street) extraData.street = registerForm.street;
        if (registerForm.province) extraData.province = registerForm.province;
        if (registerForm.district) extraData.district = registerForm.district;
        if (registerForm.subdistrict) extraData.subdistrict = registerForm.subdistrict;
        if (registerForm.postal_code) extraData.postal_code = registerForm.postal_code;
        if (registerForm.id_card) extraData.id_card = registerForm.id_card;
        if (registerForm.date_of_birth) extraData.date_of_birth = registerForm.date_of_birth;

        if (Object.keys(extraData).length > 0) {
          await updateProfile.mutateAsync({ userId: result.user_id, data: extraData });
        }
      }

      setIsRegisterOpen(false);
      resetRegisterForm();
    } catch {
      // error handled by hook
    }
  };

  // --- Edit profile handlers ---
  const handleEditProfile = (user: UserWithRoles) => {
    setEditingProfile(user);
    setEditForm({
      full_name: user.full_name,
      nickname: user.nickname || "",
      id_card: user.id_card || "",
      date_of_birth: user.date_of_birth || "",
      phone: user.phone || "",
      specialty: user.specialty || "",
      license_number: user.license_number || "",
      salary: user.salary?.toString() || "0",
      is_active: user.is_active,
      resignation_date: user.resignation_date || "",
      deactivation_reason: user.deactivation_reason || "",
      suspension_reason: user.deactivation_reason === "suspended" ? "" : "",
      house_number: user.house_number || "",
      moo: user.moo || "",
      street: user.street || "",
      province: user.province || "",
      district: user.district || "",
      subdistrict: user.subdistrict || "",
      postal_code: user.postal_code || "",
    });
    setEditPhotoPreview(user.avatar_url || null);
    setEditPhotoFile(null);
    setEditSelectedRoles([...user.roles]);
  };

  const handleEditWebcamCapture = useCallback((blob: Blob) => {
    const file = new File([blob], "avatar.jpg", { type: blob.type || "image/jpeg" });
    setEditPhotoFile(file);
    setEditPhotoPreview(URL.createObjectURL(blob));
  }, []);

  const handleEditRoleToggle = (role: AppRole) => {
    setEditSelectedRoles((prev) => (prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]));
  };

  const handleSaveProfile = async () => {
    if (!editingProfile) return;

    try {
      let avatarUrl = editingProfile.avatar_url;

      // Upload new photo if changed
      if (editPhotoFile) {
        const fileExt = editPhotoFile.name.split(".").pop();
        const filePath = `${editingProfile.user_id}/avatar.${fileExt}`;
        const { error: uploadError } = await supabase.storage
          .from("staff-photos")
          .upload(filePath, editPhotoFile, { upsert: true });

        if (!uploadError) {
          const { data: publicUrl } = supabase.storage.from("staff-photos").getPublicUrl(filePath);
          avatarUrl = `${publicUrl.publicUrl}?t=${Date.now()}`;
        }
      }

      await updateProfile.mutateAsync({
        userId: editingProfile.user_id,
        data: {
          full_name: editForm.full_name,
          nickname: editForm.nickname || null,
          phone: editForm.phone || undefined,
          specialty: editForm.specialty || undefined,
          license_number: editForm.license_number || undefined,
          salary: editForm.salary ? parseFloat(editForm.salary) : 0,
          id_card: editForm.id_card || null,
          date_of_birth: editForm.date_of_birth || null,
          avatar_url: avatarUrl || undefined,
          is_active: editForm.is_active,
          resignation_date: editForm.resignation_date || null,
          deactivation_reason: editForm.deactivation_reason || null,
          house_number: editForm.house_number || null,
          moo: editForm.moo || null,
          street: editForm.street || null,
          province: editForm.province || null,
          district: editForm.district || null,
          subdistrict: editForm.subdistrict || null,
          postal_code: editForm.postal_code || null,
        },
      });

      // Update roles
      await updateRoles.mutateAsync({
        userId: editingProfile.user_id,
        roles: editSelectedRoles,
      });



      setEditingProfile(null);
    } catch {
      // error handled by hook
    }
  };

  const handleResetPassword = async () => {
    if (!resetPasswordUser || !newPassword) return;
    if (newPassword.length < 6) {
      toast({ title: "รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร", variant: "destructive" });
      return;
    }
    setIsResetting(true);
    try {
      const { data, error } = await supabase.functions.invoke("reset-user-password", {
        body: { user_id: resetPasswordUser.userId, new_password: newPassword },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast({ title: "สำเร็จ", description: `รีเซ็ตรหัสผ่านของ ${resetPasswordUser.fullName} เรียบร้อยแล้ว` });
      setResetPasswordUser(null);
      setNewPassword("");
    } catch (err: any) {
      toast({ title: "เกิดข้อผิดพลาด", description: err.message, variant: "destructive" });
    } finally {
      setIsResetting(false);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .substring(0, 2)
      .toUpperCase();
  };

  return (
    <MainLayout title="จัดการผู้ใช้และสิทธิ์">
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Shield className="w-7 h-7 text-primary" />
              จัดการผู้ใช้และสิทธิ์
            </h1>
            <p className="text-muted-foreground mt-1">ลงทะเบียน แก้ไข และกำหนดสิทธิ์การเข้าถึงสำหรับบุคลากร</p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setGeneratedLink("");
                setInviteRole("staff");
                setIsInviteOpen(true);
              }}
            >
              <Link2 className="mr-2 h-4 w-4" />
              สร้างลิงก์เชิญ
            </Button>
            <Button
              onClick={() => {
                resetRegisterForm();
                setIsRegisterOpen(true);
              }}
            >
              <Plus className="mr-2 h-4 w-4" />
              ลงทะเบียนผู้ใช้ใหม่
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <Card className="border-0 shadow-sm bg-card">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <Users className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">ผู้ใช้ทั้งหมด</p>
                <p className="text-2xl font-bold text-foreground">{users?.length || 0}</p>
              </div>
            </CardContent>
          </Card>
          {ALL_ROLES.map((role) => (
            <Card key={role} className="border-0 shadow-sm bg-card">
              <CardContent className="p-4 flex items-center gap-4">
                <div
                  className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                    role === "admin"
                      ? "bg-red-100 dark:bg-red-900/30"
                      : role === "doctor"
                        ? "bg-blue-100 dark:bg-blue-900/30"
                        : role === "therapist"
                          ? "bg-purple-100 dark:bg-purple-900/30"
                          : "bg-green-100 dark:bg-green-900/30"
                  }`}
                >
                  <UserCog
                    className={`w-6 h-6 ${
                      role === "admin"
                        ? "text-red-600 dark:text-red-400"
                        : role === "doctor"
                          ? "text-blue-600 dark:text-blue-400"
                          : role === "therapist"
                            ? "text-purple-600 dark:text-purple-400"
                            : "text-green-600 dark:text-green-400"
                    }`}
                  />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{ROLE_CONFIG[role].label}</p>
                  <p className="text-2xl font-bold text-foreground">
                    {users?.filter((u) => u.roles.includes(role)).length || 0}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* User List */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-4">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <CardTitle className="text-lg">รายชื่อผู้ใช้งาน</CardTitle>
              <div className="flex gap-2 flex-col md:flex-row">
                <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as any)}>
                  <SelectTrigger className="w-full md:w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">ทั้งหมด</SelectItem>
                    <SelectItem value="active">ใช้งานอยู่</SelectItem>
                    <SelectItem value="inactive">ยกเลิก/ลาออก</SelectItem>
                  </SelectContent>
                </Select>
                <div className="relative w-full md:w-80">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="ค้นหาชื่อ, เบอร์โทร หรือความเชี่ยวชาญ..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="flex items-center gap-4">
                    <Skeleton className="w-12 h-12 rounded-full" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-48" />
                      <Skeleton className="h-3 w-32" />
                    </div>
                    <Skeleton className="h-8 w-24" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ผู้ใช้งาน</TableHead>
                      <TableHead>สถานะ</TableHead>
                      <TableHead>ผู้ให้การรักษา</TableHead>
                      <TableHead>ความเชี่ยวชาญ</TableHead>
                      <TableHead>สิทธิ์การใช้งาน</TableHead>
                      <TableHead className="text-right">เงินเดือน</TableHead>
                      <TableHead>วันที่สร้าง</TableHead>
                      <TableHead className="text-right">การจัดการ</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsers?.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                          ไม่พบผู้ใช้งาน
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredUsers?.map((user) => (
                        <TableRow key={user.id} className={!user.is_active ? "opacity-60" : ""}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <Avatar className="w-10 h-10">
                                <AvatarImage src={user.avatar_url || undefined} />
                                <AvatarFallback className="bg-primary/10 text-primary font-medium">
                                  {getInitials(user.full_name)}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="font-medium text-foreground">{user.full_name}</p>
                                <p className="text-sm text-muted-foreground">{user.phone || "ไม่ระบุเบอร์โทร"}</p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            {user.is_active ? (
                              <Badge
                                variant="secondary"
                                className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                              >
                                ใช้งาน
                              </Badge>
                            ) : (
                              <div>
                                <Badge
                                  variant="secondary"
                                  className={
                                    user.deactivation_reason === "suspended"
                                      ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400"
                                      : "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
                                  }
                                >
                                  {user.deactivation_reason === "resigned"
                                    ? "ลาออก"
                                    : user.deactivation_reason === "suspended"
                                      ? "ระงับชั่วคราว"
                                      : user.deactivation_reason === "terminated"
                                        ? "เลิกจ้าง"
                                        : "ยกเลิก"}
                                </Badge>
                                {user.resignation_date && (
                                  <p className="text-xs text-muted-foreground mt-1">
                                    {format(new Date(user.resignation_date), "d MMM yyyy", { locale: th })}
                                  </p>
                                )}
                              </div>
                            )}
                          </TableCell>
                          <TableCell>
                            {user.roles.some(r => r === "doctor" || r === "therapist") ? (
                              <Badge variant="secondary" className="bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-400">
                                ✓ ผู้ให้การรักษา
                              </Badge>
                            ) : (
                              <span className="text-sm text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <span className="text-sm text-muted-foreground">{user.specialty || "-"}</span>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              {user.roles.length === 0 ? (
                                <span className="text-sm text-muted-foreground">ไม่มีสิทธิ์</span>
                              ) : (
                                user.roles.map((role) => (
                                  <Badge key={role} variant="secondary" className={ROLE_CONFIG[role].color}>
                                    {ROLE_CONFIG[role].label}
                                  </Badge>
                                ))
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <span className="text-sm text-muted-foreground">
                              {user.salary ? `฿${Number(user.salary).toLocaleString()}` : "-"}
                            </span>
                          </TableCell>
                          <TableCell>
                            <span className="text-sm text-muted-foreground">
                              {format(new Date(user.created_at), "d MMM yyyy", { locale: th })}
                            </span>
                          </TableCell>
                          <TableCell className="text-right">
                            <TooltipProvider delayDuration={200}>
                              <div className="flex gap-1 justify-end">
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="outline"
                                      size="icon"
                                      className="h-8 w-8"
                                      onClick={() => handleEditProfile(user)}
                                    >
                                      <Pencil className="w-4 h-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>แก้ไขข้อมูล</TooltipContent>
                                </Tooltip>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="outline"
                                      size="icon"
                                      className="h-8 w-8"
                                      onClick={() => handleEditRoles(user)}
                                    >
                                      <UserCog className="w-4 h-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>จัดการสิทธิ์การใช้งาน</TooltipContent>
                                </Tooltip>
                                {(user.roles.includes("doctor") || user.roles.includes("therapist")) && (
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        variant="outline"
                                        size="icon"
                                        className="h-8 w-8"
                                        onClick={() => setScheduleUser({ userId: user.user_id, fullName: user.full_name })}
                                      >
                                        <CalendarDays className="w-4 h-4" />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>ตารางเวลาทำงาน</TooltipContent>
                                  </Tooltip>
                                )}
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="outline"
                                      size="icon"
                                      className="h-8 w-8"
                                      onClick={() => {
                                        setResetPasswordUser({ userId: user.user_id, fullName: user.full_name });
                                        setNewPassword("");
                                      }}
                                    >
                                      <KeyRound className="w-4 h-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>รีเซ็ตรหัสผ่าน</TooltipContent>
                                </Tooltip>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="outline"
                                      size="icon"
                                      className="h-8 w-8 text-destructive hover:text-destructive"
                                      onClick={() =>
                                        setDeletingUser({ userId: user.user_id, fullName: user.full_name })
                                      }
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>ลบผู้ใช้</TooltipContent>
                                </Tooltip>
                              </div>
                            </TooltipProvider>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Register User Dialog */}
      <Dialog open={isRegisterOpen} onOpenChange={setIsRegisterOpen}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="w-5 h-5 text-primary" />
              ลงทะเบียนผู้ใช้ใหม่
            </DialogTitle>
            <DialogDescription>กรอกข้อมูลบุคลากรเพื่อลงทะเบียนเข้าระบบ</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <WebcamCapture
              currentPhotoUrl={registerPhotoPreview}
              onCapture={handleRegisterWebcamCapture}
              initials={registerForm.full_name ? registerForm.full_name.substring(0, 2).toUpperCase() : "?"}
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* ชื่อ-สกุล */}
              <div className="sm:col-span-2 lg:col-span-2">
                <Label>ชื่อ-สกุล <span className="text-destructive">*</span></Label>
                <Input
                  value={registerForm.full_name}
                  onChange={(e) => setRegisterForm((f) => ({ ...f, full_name: e.target.value }))}
                />
              </div>
              {/* ชื่อเล่น */}
              <div>
                <Label>ชื่อเล่น <span className="text-destructive">*</span></Label>
                <Input
                  value={registerForm.nickname}
                  onChange={(e) => setRegisterForm((f) => ({ ...f, nickname: e.target.value }))}
                />
              </div>
              {/* เลขบัตรประชาชน */}
              <div>
                <Label>เลขที่บัตรประชาชน <span className="text-destructive">*</span></Label>
                <Input
                  value={registerForm.id_card}
                  onChange={(e) => setRegisterForm((f) => ({ ...f, id_card: e.target.value }))}
                  placeholder="x-xxxx-xxxxx-xx-x"
                />
              </div>
              {/* วันเกิด */}
              <div>
                <Label>วัน/เดือน/ปี เกิด <span className="text-destructive">*</span></Label>
                <DateInput
                  value={registerForm.date_of_birth}
                  onChange={(v) => setRegisterForm((f) => ({ ...f, date_of_birth: v }))}
                />
              </div>
              {/* เบอร์โทร */}
              <div>
                <Label>เบอร์โทรศัพท์ <span className="text-destructive">*</span></Label>
                <Input
                  value={registerForm.phone}
                  onChange={(e) => setRegisterForm((f) => ({ ...f, phone: e.target.value }))}
                  placeholder="08x-xxx-xxxx"
                />
              </div>
              {/* อีเมล */}
              <div>
                <Label>อีเมล <span className="text-destructive">*</span></Label>
                <Input
                  type="email"
                  value={registerForm.email}
                  onChange={(e) => setRegisterForm((f) => ({ ...f, email: e.target.value }))}
                  placeholder="email@example.com"
                />
              </div>
              {/* บทบาท */}
              <div>
                <Label>บทบาท <span className="text-destructive">*</span></Label>
                <Select
                  value={registerForm.role}
                  onValueChange={(v) => setRegisterForm((f) => ({ ...f, role: v as AppRole }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="doctor">{ROLE_CONFIG.doctor.label}</SelectItem>
                    <SelectItem value="therapist">{ROLE_CONFIG.therapist.label}</SelectItem>
                    <SelectItem value="staff">{ROLE_CONFIG.staff.label}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {/* ตำแหน่ง/ความเชี่ยวชาญ */}
              <div>
                <Label>{registerForm.role === "doctor" || registerForm.role === "therapist" ? "ความเชี่ยวชาญ" : "ตำแหน่ง"} <span className="text-destructive">*</span></Label>
                <Input
                  value={registerForm.specialty}
                  onChange={(e) => setRegisterForm((f) => ({ ...f, specialty: e.target.value }))}
                  placeholder={registerForm.role === "doctor" || registerForm.role === "therapist" ? "เช่น จิตแพทย์" : "เช่น พนักงานต้อนรับ"}
                />
              </div>
              {/* เลขใบอนุญาต */}
              {(registerForm.role === "doctor" || registerForm.role === "therapist") && (
                <div>
                  <Label>เลขใบอนุญาตประกอบวิชาชีพ <span className="text-destructive">*</span></Label>
                  <Input
                    value={registerForm.license_number}
                    onChange={(e) => setRegisterForm((f) => ({ ...f, license_number: e.target.value }))}
                  />
                </div>
              )}
            </div>

            <AddressFields form={registerForm} setForm={setRegisterForm} />

            {/* รหัสผ่าน - ล่างสุด */}
            <Separator />
            <div className="space-y-1">
              <Label className="text-base font-medium flex items-center gap-2">
                <KeyRound className="w-4 h-4" />
                ตั้งรหัสผ่าน
              </Label>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <Label>รหัสผ่าน <span className="text-destructive">*</span></Label>
                <Input
                  type="password"
                  value={registerForm.password}
                  onChange={(e) => setRegisterForm((f) => ({ ...f, password: e.target.value }))}
                  placeholder="อย่างน้อย 6 ตัวอักษร"
                />
              </div>
              <div>
                <Label>ยืนยันรหัสผ่าน <span className="text-destructive">*</span></Label>
                <Input
                  type="password"
                  value={registerForm.confirm_password}
                  onChange={(e) => setRegisterForm((f) => ({ ...f, confirm_password: e.target.value }))}
                  placeholder="กรอกรหัสผ่านอีกครั้ง"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRegisterOpen(false)}>
              ยกเลิก
            </Button>
            <Button onClick={handleRegister} disabled={registerUser.isPending}>
              {registerUser.isPending ? "กำลังลงทะเบียน..." : "ลงทะเบียน"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Profile Dialog */}
      <Dialog open={!!editingProfile} onOpenChange={() => setEditingProfile(null)}>
        <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="w-5 h-5 text-primary" />
              แก้ไขข้อมูลผู้ใช้
            </DialogTitle>
            <DialogDescription>แก้ไขข้อมูลส่วนตัว สิทธิ์ และสถานะการใช้งาน</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <WebcamCapture
              currentPhotoUrl={editPhotoPreview}
              onCapture={handleEditWebcamCapture}
              initials={editForm.full_name ? editForm.full_name.substring(0, 2).toUpperCase() : "?"}
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* ชื่อ-สกุล */}
              <div className="sm:col-span-2 lg:col-span-2">
                <Label>ชื่อ-สกุล <span className="text-destructive">*</span></Label>
                <Input
                  value={editForm.full_name}
                  onChange={(e) => setEditForm((f) => ({ ...f, full_name: e.target.value }))}
                />
              </div>
              {/* ชื่อเล่น */}
              <div>
                <Label>ชื่อเล่น <span className="text-destructive">*</span></Label>
                <Input
                  value={editForm.nickname}
                  onChange={(e) => setEditForm((f) => ({ ...f, nickname: e.target.value }))}
                />
              </div>
              {/* เลขบัตรประชาชน */}
              <div>
                <Label>เลขที่บัตรประชาชน <span className="text-destructive">*</span></Label>
                <Input
                  value={editForm.id_card}
                  onChange={(e) => setEditForm((f) => ({ ...f, id_card: e.target.value }))}
                  placeholder="x-xxxx-xxxxx-xx-x"
                />
              </div>
              {/* วันเกิด */}
              <div>
                <Label>วัน/เดือน/ปี เกิด <span className="text-destructive">*</span></Label>
                <DateInput
                  value={editForm.date_of_birth}
                  onChange={(v) => setEditForm((f) => ({ ...f, date_of_birth: v }))}
                />
              </div>
              {/* เบอร์โทร */}
              <div>
                <Label>เบอร์โทรศัพท์ <span className="text-destructive">*</span></Label>
                <Input value={editForm.phone} onChange={(e) => setEditForm((f) => ({ ...f, phone: e.target.value }))} placeholder="08x-xxx-xxxx" />
              </div>
              {/* ตำแหน่ง/ความเชี่ยวชาญ */}
              <div>
                <Label>{editSelectedRoles.some(r => r === "doctor" || r === "therapist") ? "ความเชี่ยวชาญ" : "ตำแหน่ง"} <span className="text-destructive">*</span></Label>
                <Input
                  value={editForm.specialty}
                  onChange={(e) => setEditForm((f) => ({ ...f, specialty: e.target.value }))}
                  placeholder={editSelectedRoles.some(r => r === "doctor" || r === "therapist") ? "เช่น จิตแพทย์" : "เช่น พนักงานต้อนรับ"}
                />
              </div>
              {/* เลขใบอนุญาต - เฉพาะแพทย์/นักจิตวิทยา */}
              {editSelectedRoles.some(r => r === "doctor" || r === "therapist") && (
                <div>
                  <Label>เลขใบอนุญาตประกอบวิชาชีพ <span className="text-destructive">*</span></Label>
                  <Input
                    value={editForm.license_number}
                    onChange={(e) => setEditForm((f) => ({ ...f, license_number: e.target.value }))}
                  />
                </div>
              )}
              {/* เงินเดือน */}
              <div>
                <Label>เงินเดือน <span className="text-destructive">*</span></Label>
                <Input
                  type="number"
                  value={editForm.salary}
                  onChange={(e) => setEditForm((f) => ({ ...f, salary: e.target.value }))}
                  placeholder="บาท"
                />
              </div>
            </div>

            {/* Status / Deactivation */}
            <Separator />
            <div className="space-y-1">
              <Label className="text-base font-medium flex items-center gap-2">
                <UserX className="w-4 h-4" />
                สถานะการใช้งาน
              </Label>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label>สถานะ</Label>
                <Select
                  value={
                    editForm.is_active
                      ? "active"
                      : editForm.deactivation_reason === "suspended"
                        ? "suspended"
                        : "inactive"
                  }
                  onValueChange={(v) => {
                    if (v === "active") {
                      setEditForm((f) => ({
                        ...f,
                        is_active: true,
                        resignation_date: "",
                        deactivation_reason: "",
                      }));
                    } else if (v === "suspended") {
                      setEditForm((f) => ({
                        ...f,
                        is_active: false,
                        deactivation_reason: "suspended",
                      }));
                    } else {
                      setEditForm((f) => ({
                        ...f,
                        is_active: false,
                        deactivation_reason: f.deactivation_reason === "suspended" ? "" : f.deactivation_reason,
                      }));
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">ใช้งานอยู่</SelectItem>
                    <SelectItem value="suspended">ระงับการใช้งานชั่วคราว</SelectItem>
                    <SelectItem value="inactive">ยกเลิก/ลาออก</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {!editForm.is_active && (
                <>
                  {editForm.deactivation_reason !== "suspended" && (
                    <div>
                      <Label>เหตุผล</Label>
                      <Select
                        value={editForm.deactivation_reason}
                        onValueChange={(v) => setEditForm((f) => ({ ...f, deactivation_reason: v }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="เลือกเหตุผล" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="resigned">ลาออก</SelectItem>
                          <SelectItem value="terminated">เลิกจ้าง</SelectItem>
                          <SelectItem value="other">อื่นๆ</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  {editForm.deactivation_reason === "suspended" && (
                    <div>
                      <Label>เหตุผลการระงับ</Label>
                      <Input
                        value={editForm.suspension_reason || ""}
                        onChange={(e) => setEditForm((f) => ({ ...f, suspension_reason: e.target.value }))}
                        placeholder="ระบุเหตุผล"
                      />
                    </div>
                  )}
                  <div>
                    <Label>วันที่มีผล</Label>
                    <DateInput
                      value={editForm.resignation_date}
                      onChange={(v) => setEditForm((f) => ({ ...f, resignation_date: v }))}
                      placeholder="วว/ดด/ปปปป"
                    />
                  </div>
                </>
              )}
            </div>

            {/* Role editing within edit dialog */}
            <Separator />
            <div>
              <Label className="text-base font-medium">สิทธิ์การใช้งาน</Label>
              <div className="space-y-2 mt-2">
                {ALL_ROLES.map((role) => (
                  <div
                    key={role}
                    className="flex items-center space-x-3 p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors"
                  >
                    <Checkbox
                      id={`edit-${role}`}
                      checked={editSelectedRoles.includes(role)}
                      onCheckedChange={() => handleEditRoleToggle(role)}
                    />
                    <Label htmlFor={`edit-${role}`} className="flex-1 cursor-pointer flex items-center justify-between">
                      <span className="font-medium">{ROLE_CONFIG[role].label}</span>
                      <Badge variant="secondary" className={ROLE_CONFIG[role].color}>
                        {role}
                      </Badge>
                    </Label>
                  </div>
                ))}
              </div>
              {editSelectedRoles.length === 0 && (
                <p className="text-sm text-destructive mt-2">⚠️ ผู้ใช้จะไม่สามารถเข้าถึงฟีเจอร์ใดๆ ได้หากไม่มีสิทธิ์</p>
              )}
            </div>



            {/* Address in edit */}
            <AddressFields form={editForm} setForm={setEditForm} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingProfile(null)}>
              ยกเลิก
            </Button>
            <Button onClick={handleSaveProfile} disabled={updateProfile.isPending || updateRoles.isPending}>
              {updateProfile.isPending ? "กำลังบันทึก..." : "บันทึก"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Roles Only Dialog */}
      <Dialog open={!!editingUser} onOpenChange={() => setEditingUser(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-primary" />
              แก้ไขสิทธิ์ผู้ใช้
            </DialogTitle>
            <DialogDescription>กำหนดสิทธิ์การเข้าถึงระบบ</DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-muted-foreground mb-4">
              กำหนดสิทธิ์สำหรับ <span className="font-medium text-foreground">{editingUser?.fullName}</span>
            </p>
            <div className="space-y-3">
              {ALL_ROLES.map((role) => (
                <div
                  key={role}
                  className="flex items-center space-x-3 p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors"
                >
                  <Checkbox
                    id={`role-${role}`}
                    checked={selectedRoles.includes(role)}
                    onCheckedChange={() => handleRoleToggle(role)}
                  />
                  <Label htmlFor={`role-${role}`} className="flex-1 cursor-pointer flex items-center justify-between">
                    <span className="font-medium">{ROLE_CONFIG[role].label}</span>
                    <Badge variant="secondary" className={ROLE_CONFIG[role].color}>
                      {role}
                    </Badge>
                  </Label>
                </div>
              ))}
            </div>
            {selectedRoles.length === 0 && (
              <p className="text-sm text-destructive mt-3">⚠️ ผู้ใช้จะไม่สามารถเข้าถึงฟีเจอร์ใดๆ ได้หากไม่มีสิทธิ์</p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingUser(null)}>
              ยกเลิก
            </Button>
            <Button onClick={handleSaveRoles} disabled={updateRoles.isPending}>
              {updateRoles.isPending ? "กำลังบันทึก..." : "บันทึก"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reset Password Dialog */}
      <Dialog open={!!resetPasswordUser} onOpenChange={() => setResetPasswordUser(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <KeyRound className="w-5 h-5 text-primary" />
              รีเซ็ตรหัสผ่าน
            </DialogTitle>
            <DialogDescription>ตั้งรหัสผ่านใหม่สำหรับผู้ใช้</DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <p className="text-sm text-muted-foreground">
              ตั้งรหัสผ่านใหม่สำหรับ <span className="font-medium text-foreground">{resetPasswordUser?.fullName}</span>
            </p>
            <div>
              <Label>รหัสผ่านใหม่ (อย่างน้อย 6 ตัวอักษร)</Label>
              <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResetPasswordUser(null)}>
              ยกเลิก
            </Button>
            <Button onClick={handleResetPassword} disabled={isResetting || !newPassword}>
              {isResetting ? "กำลังรีเซ็ต..." : "รีเซ็ตรหัสผ่าน"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete User Confirmation Dialog */}
      <AlertDialog
        open={!!deletingUser}
        onOpenChange={(open) => {
          if (!open) {
            setDeletingUser(null);
            setDeleteConfirmPassword("");
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>ยืนยันการลบผู้ใช้</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <p>
                  คุณต้องการลบผู้ใช้ <span className="font-medium text-foreground">{deletingUser?.fullName}</span>{" "}
                  ออกจากระบบหรือไม่? การดำเนินการนี้ไม่สามารถย้อนกลับได้ ข้อมูลบัญชีและสิทธิ์ทั้งหมดจะถูกลบถาวร
                </p>
                <div>
                  <Label>กรอกรหัสผ่านของคุณเพื่อยืนยัน</Label>
                  <Input
                    type="password"
                    value={deleteConfirmPassword}
                    onChange={(e) => setDeleteConfirmPassword(e.target.value)}
                    placeholder="รหัสผ่านของคุณ"
                  />
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={async (e) => {
                e.preventDefault();
                if (!deletingUser || !deleteConfirmPassword) return;
                try {
                  // Verify admin password first
                  const {
                    data: { user },
                  } = await supabase.auth.getUser();
                  if (!user?.email) throw new Error("ไม่พบข้อมูลผู้ใช้");
                  const { error: signInError } = await supabase.auth.signInWithPassword({
                    email: user.email,
                    password: deleteConfirmPassword,
                  });
                  if (signInError) throw new Error("รหัสผ่านไม่ถูกต้อง");
                  await deleteUser.mutateAsync(deletingUser.userId);
                  setDeletingUser(null);
                  setDeleteConfirmPassword("");
                } catch (err: any) {
                  toast({ title: "เกิดข้อผิดพลาด", description: err.message, variant: "destructive" });
                }
              }}
              disabled={deleteUser.isPending || !deleteConfirmPassword}
            >
              {deleteUser.isPending ? "กำลังลบ..." : "ลบผู้ใช้"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Provider Schedule Dialog */}
      <Dialog open={!!scheduleUser} onOpenChange={(open) => !open && setScheduleUser(null)}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CalendarDays className="w-5 h-5 text-primary" />
              ตารางเวลาทำงาน
            </DialogTitle>
          </DialogHeader>
          {scheduleUser && (
            <ProviderScheduleEditor
              providerId={scheduleUser.userId}
              providerName={scheduleUser.fullName}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Invite Link Dialog */}
      <Dialog open={isInviteOpen} onOpenChange={(open) => { if (!open) { setIsInviteOpen(false); setGeneratedLink(""); } }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Link2 className="w-5 h-5 text-primary" />
              สร้างลิงก์เชิญพนักงาน
            </DialogTitle>
            <DialogDescription>
              สร้างลิงก์เชิญเพื่อส่งให้พนักงานลงทะเบียนเข้าใช้งานระบบด้วยตนเอง ลิงก์จะมีอายุ 7 วัน
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>ตำแหน่งที่จะกำหนดให้</Label>
              <Select value={inviteRole} onValueChange={(v) => setInviteRole(v as AppRole)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ALL_ROLES.map((role) => (
                    <SelectItem key={role} value={role}>
                      {ROLE_CONFIG[role].label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {generatedLink ? (
              <div className="space-y-3">
                <Label>ลิงก์เชิญ</Label>
                <div className="flex gap-2">
                  <Input value={generatedLink} readOnly className="text-xs" />
                  <Button variant="outline" size="icon" onClick={handleCopyLink}>
                    {linkCopied ? <CheckIcon className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">ลิงก์นี้ใช้ได้ครั้งเดียวและหมดอายุใน 7 วัน</p>
              </div>
            ) : null}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsInviteOpen(false)}>ปิด</Button>
            <Button onClick={handleGenerateInviteLink} disabled={isGenerating}>
              {isGenerating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  กำลังสร้าง...
                </>
              ) : generatedLink ? "สร้างลิงก์ใหม่" : "สร้างลิงก์"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
};

export default UserManagement;
