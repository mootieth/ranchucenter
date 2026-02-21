import { useState, useCallback } from "react";
import MainLayout from "@/components/layout/MainLayout";
import WebcamCapture from "@/components/WebcamCapture";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { User, MapPin, Save, Phone, Stethoscope, FileText, Lock, Eye, EyeOff, Calendar, Loader2, Unlink, CreditCard } from "lucide-react";
import { DateInput } from "@/components/ui/date-input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import AddressSearchSelect from "@/components/ui/address-search-select";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import {
  useProvinceNames,
  useDistrictsByProvince,
  useSubdistrictsByDistrict,
  usePostalCode,
} from "@/hooks/useThailandAddresses";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { useGoogleCalendar } from "@/hooks/useGoogleCalendar";

const roleLabels: Record<string, string> = {
  admin: "ผู้ดูแลระบบ",
  doctor: "แพทย์",
  therapist: "นักบำบัด",
  staff: "เจ้าหน้าที่",
};

const MyProfile = () => {
  const { user, profile, roles } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { status: gcalStatus, connect: gcalConnect, disconnect: gcalDisconnect } = useGoogleCalendar();

  const [isSaving, setIsSaving] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [form, setForm] = useState({
    full_name: profile?.full_name || "",
    nickname: "",
    phone: profile?.phone || "",
    specialty: profile?.specialty || "",
    license_number: profile?.license_number || "",
    id_card: "",
    date_of_birth: "",
    house_number: "",
    moo: "",
    street: "",
    province: "",
    district: "",
    subdistrict: "",
    postal_code: "",
  });
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(profile?.avatar_url || null);
  const [loaded, setLoaded] = useState(false);

  // Load full profile data on mount
  const loadFullProfile = useCallback(async () => {
    if (!user?.id || loaded) return;
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", user.id)
      .single();
    if (data) {
      setForm({
        full_name: data.full_name || "",
        nickname: (data as any).nickname || "",
        phone: data.phone || "",
        specialty: data.specialty || "",
        license_number: data.license_number || "",
        id_card: (data as any).id_card || "",
        date_of_birth: (data as any).date_of_birth || "",
        house_number: data.house_number || "",
        moo: data.moo || "",
        street: data.street || "",
        province: data.province || "",
        district: data.district || "",
        subdistrict: data.subdistrict || "",
        postal_code: data.postal_code || "",
      });
      setPhotoPreview(data.avatar_url || null);
    }
    setLoaded(true);
  }, [user?.id, loaded]);

  // Trigger load
  if (!loaded && user?.id) {
    loadFullProfile();
  }

  // Address hooks
  const { data: provinces } = useProvinceNames();
  const { data: districts } = useDistrictsByProvince(form.province);
  const { data: subdistricts } = useSubdistrictsByDistrict(form.province, form.district);
  const postalCode = usePostalCode(form.province, form.district, form.subdistrict);

  const handleProvinceChange = (v: string) => {
    setForm((f) => ({ ...f, province: v, district: "", subdistrict: "", postal_code: "" }));
  };
  const handleDistrictChange = (v: string) => {
    setForm((f) => ({ ...f, district: v, subdistrict: "", postal_code: "" }));
  };
  const handleSubdistrictChange = (v: string) => {
    const sub = subdistricts.find((s) => s.name === v);
    setForm((f) => ({ ...f, subdistrict: v, postal_code: sub?.postalCode || postalCode || "" }));
  };

  const handlePhotoCapture = useCallback((blob: Blob) => {
    const file = new File([blob], "avatar.jpg", { type: blob.type || "image/jpeg" });
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(blob));
  }, []);

  const isProvider = roles.some((r) => r === "doctor" || r === "therapist");

  const handleSave = async () => {
    if (!user?.id) return;

    // Validate required fields
    const missing: string[] = [];
    if (!form.full_name.trim()) missing.push("ชื่อ-สกุล");
    if (!form.nickname.trim()) missing.push("ชื่อเล่น");
    if (!form.phone.trim()) missing.push("เบอร์โทรศัพท์");
    if (!form.specialty.trim()) missing.push(isProvider ? "ความเชี่ยวชาญ" : "ตำแหน่ง");
    if (isProvider && !form.license_number.trim()) missing.push("เลขใบประกอบวิชาชีพ");
    if (!form.province) missing.push("จังหวัด");
    if (!form.district) missing.push("อำเภอ/เขต");
    if (!form.subdistrict) missing.push("ตำบล/แขวง");

    if (missing.length > 0) {
      toast({ title: "กรุณากรอกข้อมูลให้ครบ", description: missing.join(", "), variant: "destructive" });
      return;
    }

    setIsSaving(true);
    try {
      let avatarUrl = profile?.avatar_url || null;

      // Upload avatar if photo file is selected
      if (photoFile) {
        const fileExt = photoFile.name.split(".").pop();
        const filePath = `${user.id}/avatar.${fileExt}`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from("staff-photos")
          .upload(filePath, photoFile, { upsert: true });

        if (uploadError) {
          console.error("Avatar upload error:", uploadError);
          throw new Error(`อัปโหลดรูปภาพล้มเหลว: ${uploadError.message}`);
        }

        // Get public URL only if upload succeeded
        const { data: publicUrl } = supabase.storage.from("staff-photos").getPublicUrl(filePath);
        avatarUrl = `${publicUrl.publicUrl}?t=${Date.now()}`;
      }

      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: form.full_name,
          nickname: form.nickname || null,
          phone: form.phone || null,
          specialty: form.specialty || null,
          license_number: form.license_number || null,
          id_card: form.id_card || null,
          date_of_birth: form.date_of_birth || null,
          avatar_url: avatarUrl,
          house_number: form.house_number || null,
          moo: form.moo || null,
          street: form.street || null,
          province: form.province || null,
          district: form.district || null,
          subdistrict: form.subdistrict || null,
          postal_code: form.postal_code || null,
        })
        .eq("user_id", user.id);

      if (error) throw error;

      toast({ title: "บันทึกสำเร็จ", description: "อัปเดตโปรไฟล์เรียบร้อยแล้ว" });
      setPhotoFile(null);
      // Refresh auth context
      queryClient.invalidateQueries();
    } catch (err: any) {
      toast({ title: "เกิดข้อผิดพลาด", description: err.message, variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (!newPassword || !confirmPassword) {
      toast({ title: "กรุณากรอกรหัสผ่านใหม่", variant: "destructive" });
      return;
    }
    if (newPassword.length < 6) {
      toast({ title: "รหัสผ่านใหม่ต้องมีอย่างน้อย 6 ตัวอักษร", variant: "destructive" });
      return;
    }
    if (newPassword !== confirmPassword) {
      toast({ title: "รหัสผ่านใหม่ไม่ตรงกัน", variant: "destructive" });
      return;
    }

    setIsChangingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      toast({ title: "เปลี่ยนรหัสผ่านสำเร็จ", description: "รหัสผ่านของคุณถูกอัปเดตแล้ว" });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      toast({ title: "เกิดข้อผิดพลาด", description: err.message, variant: "destructive" });
    } finally {
      setIsChangingPassword(false);
    }
  };

  const getInitials = (name: string) =>
    name.split(" ").map((n) => n[0]).join("").slice(0, 2);

  return (
    <MainLayout title="โปรไฟล์ของฉัน">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Profile Header Card */}
        <Card className="overflow-hidden">
          <div className="bg-gradient-to-r from-primary/10 to-primary/5 px-6 py-8">
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
              {/* Left: Photo with WebcamCapture */}
              <div className="shrink-0">
                <WebcamCapture
                  currentPhotoUrl={photoPreview}
                  onCapture={handlePhotoCapture}
                  initials={form.full_name ? getInitials(form.full_name) : "?"}
                />
              </div>
              {/* Right: Info */}
              <div className="flex flex-col gap-1.5 min-w-0 pt-2">
                <h2 className="text-xl font-semibold text-foreground truncate">{form.full_name || "ผู้ใช้"}</h2>
                <p className="text-sm text-muted-foreground truncate">{user?.email}</p>
                <div className="flex gap-1.5 flex-wrap">
                  {roles.map((role) => (
                    <Badge key={role} variant="secondary" className="text-xs">
                      {roleLabels[role] || role}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* Basic Info Card */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-base flex items-center gap-2">
              <User className="w-4 h-4" />
              ข้อมูลส่วนตัว
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label>ชื่อ-สกุล *</Label>
                <Input
                  value={form.full_name}
                  onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))}
                />
              </div>
              <div>
                <Label>ชื่อเล่น *</Label>
                <Input
                  value={form.nickname}
                  onChange={(e) => setForm((f) => ({ ...f, nickname: e.target.value }))}
                  placeholder="ชื่อเล่น"
                />
              </div>
              <div>
                <Label className="flex items-center gap-1">
                  <Phone className="w-3.5 h-3.5" />
                  เบอร์โทรศัพท์ *
                </Label>
                <Input
                  value={form.phone}
                  onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                  placeholder="0xx-xxx-xxxx"
                />
              </div>
              <div>
                <Label className="flex items-center gap-1">
                  <Stethoscope className="w-3.5 h-3.5" />
                  {isProvider ? "ความเชี่ยวชาญ *" : "ตำแหน่ง *"}
                </Label>
                <Input
                  value={form.specialty}
                  onChange={(e) => setForm((f) => ({ ...f, specialty: e.target.value }))}
                  placeholder={isProvider ? "เช่น จิตแพทย์, นักจิตวิทยา" : "เช่น พนักงานต้อนรับ, ผู้ช่วย"}
                />
              </div>
              {isProvider && (
                <div className="sm:col-span-2">
                  <Label className="flex items-center gap-1">
                    <FileText className="w-3.5 h-3.5" />
                    เลขใบประกอบวิชาชีพ *
                  </Label>
                  <Input
                    value={form.license_number}
                    onChange={(e) => setForm((f) => ({ ...f, license_number: e.target.value }))}
                    placeholder="เลขที่ใบอนุญาต"
                  />
                </div>
              )}
              <div>
                <Label className="flex items-center gap-1">
                  <CreditCard className="w-3.5 h-3.5" />
                  เลขที่บัตรประชาชน
                </Label>
                <Input
                  value={form.id_card}
                  onChange={(e) => setForm((f) => ({ ...f, id_card: e.target.value }))}
                  placeholder="x-xxxx-xxxxx-xx-x"
                />
              </div>
              <div>
                <Label>วัน/เดือน/ปี เกิด</Label>
                <DateInput
                  value={form.date_of_birth}
                  onChange={(v) => setForm((f) => ({ ...f, date_of_birth: v }))}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Address Card */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-base flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              ที่อยู่
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label>บ้านเลขที่</Label>
                <Input
                  value={form.house_number}
                  onChange={(e) => setForm((f) => ({ ...f, house_number: e.target.value }))}
                />
              </div>
              <div>
                <Label>หมู่</Label>
                <Input
                  value={form.moo}
                  onChange={(e) => setForm((f) => ({ ...f, moo: e.target.value }))}
                />
              </div>
              <div className="sm:col-span-2">
                <Label>ถนน/ซอย</Label>
                <Input
                  value={form.street}
                  onChange={(e) => setForm((f) => ({ ...f, street: e.target.value }))}
                />
              </div>
              <div className="sm:col-span-2">
                <Label>จังหวัด *</Label>
                <AddressSearchSelect
                  value={form.province}
                  onValueChange={handleProvinceChange}
                  options={provinces}
                  placeholder="เลือกจังหวัด"
                  searchPlaceholder="ค้นหาจังหวัด..."
                />
              </div>
              <div className="sm:col-span-2">
                <Label>อำเภอ/เขต *</Label>
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
                <Label>ตำบล/แขวง *</Label>
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
          </CardContent>
        </Card>

        {/* Google Calendar Connection */}
        <Card>
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Calendar className="w-5 h-5 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Google Calendar</p>
                  {gcalStatus.loading ? (
                    <p className="text-xs text-muted-foreground">กำลังตรวจสอบ...</p>
                  ) : gcalStatus.connected ? (
                    <p className="text-xs text-green-600">เชื่อมต่อแล้ว — {gcalStatus.email}</p>
                  ) : (
                    <p className="text-xs text-muted-foreground">ยังไม่ได้เชื่อมต่อ</p>
                  )}
                </div>
              </div>
              {gcalStatus.loading ? (
                <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
              ) : gcalStatus.connected ? (
                <Button variant="outline" size="sm" onClick={gcalDisconnect}>
                  <Unlink className="w-4 h-4 mr-2" />
                  ยกเลิกเชื่อมต่อ
                </Button>
              ) : (
                <Button variant="outline" size="sm" onClick={gcalConnect}>
                  <Calendar className="w-4 h-4 mr-2" />
                  เชื่อมต่อ
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <Button onClick={handleSave} disabled={isSaving} className="flex-1" size="lg">
            <Save className="w-4 h-4 mr-2" />
            {isSaving ? "กำลังบันทึก..." : "บันทึกข้อมูล"}
          </Button>
          <Button
            variant="outline"
            size="lg"
            onClick={() => setIsPasswordDialogOpen(true)}
          >
            <Lock className="w-4 h-4 mr-2" />
            เปลี่ยนรหัสผ่าน
          </Button>
        </div>

        {/* Change Password Dialog */}
        <Dialog open={isPasswordDialogOpen} onOpenChange={(open) => {
          setIsPasswordDialogOpen(open);
          if (!open) { setNewPassword(""); setConfirmPassword(""); }
        }}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Lock className="w-4 h-4" />
                เปลี่ยนรหัสผ่าน
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div>
                <Label>รหัสผ่านใหม่ *</Label>
                <div className="relative">
                  <Input
                    type={showNewPassword ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="อย่างน้อย 6 ตัวอักษร"
                  />
                  <Button type="button" variant="ghost" size="icon"
                    className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                    onClick={() => setShowNewPassword(!showNewPassword)}>
                    {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </Button>
                </div>
              </div>
              <div>
                <Label>ยืนยันรหัสผ่านใหม่ *</Label>
                <div className="relative">
                  <Input
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="กรอกรหัสผ่านใหม่อีกครั้ง"
                  />
                  <Button type="button" variant="ghost" size="icon"
                    className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}>
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </Button>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsPasswordDialogOpen(false)}>ยกเลิก</Button>
              <Button
                onClick={async () => { await handleChangePassword(); if (newPassword && newPassword === confirmPassword && newPassword.length >= 6) setIsPasswordDialogOpen(false); }}
                disabled={isChangingPassword || !newPassword || !confirmPassword}
              >
                <Lock className="w-4 h-4 mr-2" />
                {isChangingPassword ? "กำลังบันทึก..." : "ยืนยัน"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
};

export default MyProfile;
