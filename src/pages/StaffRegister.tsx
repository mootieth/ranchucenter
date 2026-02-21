import { useState, useEffect, useCallback } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Eye, EyeOff, User, AlertTriangle, MapPin, Lock } from "lucide-react";
import { DateInput } from "@/components/ui/date-input";
import { z } from "zod";
import WebcamCapture from "@/components/WebcamCapture";
import AddressSearchSelect from "@/components/ui/address-search-select";
import {
  useProvinceNames,
  useDistrictsByProvince,
  useSubdistrictsByDistrict,
  usePostalCode,
} from "@/hooks/useThailandAddresses";

const registerSchema = z.object({
  full_name: z.string().min(2, "กรุณากรอกชื่อ-นามสกุล"),
  nickname: z.string().min(1, "กรุณากรอกชื่อเล่น"),
  id_card: z.string().min(1, "กรุณากรอกเลขบัตรประชาชน"),
  date_of_birth: z.string().min(1, "กรุณากรอกวันเกิด"),
  phone: z.string().min(1, "กรุณากรอกเบอร์โทรศัพท์"),
  email: z.string().email("กรุณากรอกอีเมลที่ถูกต้อง"),
  specialty: z.string().min(1, "กรุณากรอกตำแหน่ง/ความเชี่ยวชาญ"),
  
  house_number: z.string().min(1, "กรุณากรอกบ้านเลขที่"),
  province: z.string().min(1, "กรุณาเลือกจังหวัด"),
  district: z.string().min(1, "กรุณาเลือกอำเภอ/เขต"),
  subdistrict: z.string().min(1, "กรุณาเลือกตำบล/แขวง"),
  password: z.string().min(6, "รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร"),
  confirmPassword: z.string().min(1, "กรุณายืนยันรหัสผ่าน"),
}).refine((data) => data.password === data.confirmPassword, {
  message: "รหัสผ่านไม่ตรงกัน",
  path: ["confirmPassword"],
});

const ROLE_LABELS: Record<string, string> = {
  admin: "ผู้ดูแลระบบ",
  doctor: "แพทย์",
  therapist: "นักจิตวิทยา",
  staff: "เจ้าหน้าที่",
};

const StaffRegister = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const token = searchParams.get("token");

  const [isLoading, setIsLoading] = useState(false);
  const [isValidating, setIsValidating] = useState(true);
  const [tokenValid, setTokenValid] = useState(false);
  const [tokenRole, setTokenRole] = useState<string>("staff");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [registered, setRegistered] = useState(false);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  const [form, setForm] = useState({
    full_name: "",
    nickname: "",
    id_card: "",
    date_of_birth: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
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
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Address hooks
  const { data: provinces } = useProvinceNames();
  const { data: districts } = useDistrictsByProvince(form.province);
  const { data: subdistricts } = useSubdistrictsByDistrict(form.province, form.district);
  const postalCode = usePostalCode(form.province, form.district, form.subdistrict);

  const isDoctorOrTherapist = tokenRole === "doctor" || tokenRole === "therapist";

  useEffect(() => {
    const validateToken = async () => {
      if (!token) {
        setIsValidating(false);
        return;
      }
      const { data, error } = await supabase
        .from("invite_tokens")
        .select("*")
        .eq("token", token)
        .is("used_at", null)
        .single();

      if (error || !data || new Date(data.expires_at) < new Date()) {
        setTokenValid(false);
      } else {
        setTokenValid(true);
        setTokenRole(data.role);
      }
      setIsValidating(false);
    };
    validateToken();
  }, [token]);

  const handleWebcamCapture = useCallback((blob: Blob) => {
    const file = new File([blob], "avatar.jpg", { type: blob.type || "image/jpeg" });
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(blob));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const result = registerSchema.safeParse(form);
    if (!result.success) {
      const errs: Record<string, string> = {};
      result.error.errors.forEach((err) => {
        errs[err.path[0] as string] = err.message;
      });
      setErrors(errs);
      return;
    }

    setIsLoading(true);
    try {
      // Convert photo to base64 if available
      let photo_base64: string | undefined;
      if (photoFile) {
        const buffer = await photoFile.arrayBuffer();
        const bytes = new Uint8Array(buffer);
        let binary = "";
        for (let i = 0; i < bytes.length; i++) {
          binary += String.fromCharCode(bytes[i]);
        }
        photo_base64 = btoa(binary);
      }

      const { data, error } = await supabase.functions.invoke("register-with-invite", {
        body: {
          token,
          email: form.email,
          password: form.password,
          full_name: form.full_name,
          nickname: form.nickname || undefined,
          phone: form.phone || undefined,
          specialty: form.specialty || undefined,
          license_number: form.license_number || undefined,
          salary: form.salary ? parseFloat(form.salary) : undefined,
          id_card: form.id_card || undefined,
          date_of_birth: form.date_of_birth || undefined,
          house_number: form.house_number || undefined,
          moo: form.moo || undefined,
          street: form.street || undefined,
          province: form.province || undefined,
          district: form.district || undefined,
          subdistrict: form.subdistrict || undefined,
          postal_code: form.postal_code || undefined,
          photo_base64,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setRegistered(true);
      toast({
        title: "สมัครสมาชิกสำเร็จ!",
        description: "คุณสามารถเข้าสู่ระบบได้แล้ว",
      });
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "สมัครสมาชิกไม่สำเร็จ",
        description: err.message || "เกิดข้อผิดพลาด กรุณาลองใหม่",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (isValidating) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-primary/5 to-secondary/10">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!token || !tokenValid) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[hsl(40,30%,95%)] p-4">
        <Card className="w-full max-w-md border-0 shadow-xl">
          <CardContent className="p-8 text-center space-y-4">
            <AlertTriangle className="w-16 h-16 text-destructive mx-auto" />
            <h2 className="text-xl font-bold text-foreground">ลิงก์ไม่ถูกต้อง</h2>
            <p className="text-muted-foreground">
              ลิงก์เชิญนี้ไม่ถูกต้อง หมดอายุ หรือถูกใช้งานแล้ว กรุณาติดต่อผู้ดูแลระบบเพื่อขอลิงก์ใหม่
            </p>
            <Button variant="outline" onClick={() => navigate("/auth")}>
              ไปหน้าเข้าสู่ระบบ
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (registered) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[hsl(40,30%,95%)] p-4">
        <Card className="w-full max-w-md border-0 shadow-xl">
          <CardContent className="p-8 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
              <User className="w-8 h-8 text-primary" />
            </div>
            <h2 className="text-xl font-bold text-foreground">สมัครสมาชิกสำเร็จ!</h2>
            <p className="text-muted-foreground">
              บัญชีของคุณถูกสร้างเรียบร้อยแล้ว ตำแหน่ง: <span className="font-medium text-foreground">{ROLE_LABELS[tokenRole] || tokenRole}</span>
            </p>
            <Button onClick={() => navigate("/auth")} className="w-full">
              ไปหน้าเข้าสู่ระบบ
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[hsl(40,30%,95%)] p-4 py-8">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <img alt="Ranchu Center" className="w-16 h-16 rounded-none object-cover" src="/lovable-uploads/3a43d539-8288-45ca-bb0b-21d6b15cb782.png" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Ranchu Center</h1>
          <p className="text-muted-foreground mt-1">ลงทะเบียนเข้าใช้งานระบบ</p>
        </div>

        <Card className="border-0 shadow-xl bg-card/95 backdrop-blur">
          <form onSubmit={handleSubmit}>
            <CardHeader className="pb-4">
              <CardTitle className="text-lg">สมัครสมาชิกบุคลากร</CardTitle>
              <CardDescription>
                กรอกข้อมูลบุคลากรเพื่อลงทะเบียนเข้าระบบ — ตำแหน่ง: <span className="font-medium text-foreground">{ROLE_LABELS[tokenRole] || tokenRole}</span>
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Photo */}
              <WebcamCapture
                currentPhotoUrl={photoPreview}
                onCapture={handleWebcamCapture}
                initials={form.full_name ? form.full_name.substring(0, 2).toUpperCase() : "?"}
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* ชื่อ-สกุล */}
                <div className="sm:col-span-2">
                  <Label>ชื่อ-สกุล <span className="text-destructive">*</span></Label>
                  <Input value={form.full_name} onChange={(e) => setForm(f => ({ ...f, full_name: e.target.value }))} disabled={isLoading} />
                  {errors.full_name && <p className="text-sm text-destructive mt-1">{errors.full_name}</p>}
                </div>

                {/* ชื่อเล่น */}
                <div>
                  <Label>ชื่อเล่น <span className="text-destructive">*</span></Label>
                  <Input value={form.nickname} onChange={(e) => setForm(f => ({ ...f, nickname: e.target.value }))} disabled={isLoading} />
                </div>

                {/* เลขบัตรประชาชน */}
                <div>
                  <Label>เลขที่บัตรประชาชน <span className="text-destructive">*</span></Label>
                  <Input value={form.id_card} onChange={(e) => setForm(f => ({ ...f, id_card: e.target.value }))} placeholder="x-xxxx-xxxxx-xx-x" disabled={isLoading} />
                </div>

                {/* วันเกิด */}
                <div>
                  <Label>วัน/เดือน/ปี เกิด <span className="text-destructive">*</span></Label>
                  <DateInput value={form.date_of_birth} onChange={(v) => setForm(f => ({ ...f, date_of_birth: v }))} />
                </div>

                {/* เบอร์โทร */}
                <div>
                  <Label>เบอร์โทรศัพท์ <span className="text-destructive">*</span></Label>
                  <Input value={form.phone} onChange={(e) => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="08x-xxx-xxxx" disabled={isLoading} />
                </div>

                {/* อีเมล */}
                <div>
                  <Label>อีเมล <span className="text-destructive">*</span></Label>
                  <Input type="email" value={form.email} onChange={(e) => setForm(f => ({ ...f, email: e.target.value }))} placeholder="email@example.com" disabled={isLoading} />
                  {errors.email && <p className="text-sm text-destructive mt-1">{errors.email}</p>}
                </div>

                {/* ตำแหน่ง/ความเชี่ยวชาญ */}
                <div>
                  <Label>{isDoctorOrTherapist ? "ความเชี่ยวชาญ" : "ตำแหน่ง"} <span className="text-destructive">*</span></Label>
                  <Input value={form.specialty} onChange={(e) => setForm(f => ({ ...f, specialty: e.target.value }))} placeholder={isDoctorOrTherapist ? "เช่น จิตแพทย์" : "เช่น พนักงานต้อนรับ"} disabled={isLoading} />
                </div>

                {/* เลขใบอนุญาต - เฉพาะแพทย์/นักจิตวิทยา */}
                {isDoctorOrTherapist && (
                  <div>
                    <Label>เลขใบอนุญาตประกอบวิชาชีพ <span className="text-destructive">*</span></Label>
                    <Input value={form.license_number} onChange={(e) => setForm(f => ({ ...f, license_number: e.target.value }))} disabled={isLoading} />
                  </div>
                )}

              </div>

              {/* Address Section */}
              <Separator />
              <div className="space-y-1">
                <Label className="text-base font-medium flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  ที่อยู่ตามบัตรประชาชน
                </Label>
                <p className="text-xs text-muted-foreground">สำหรับออกสลิปเงินเดือน</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label>บ้านเลขที่ <span className="text-destructive">*</span></Label>
                  <Input value={form.house_number} onChange={(e) => setForm(f => ({ ...f, house_number: e.target.value }))} placeholder="เช่น 123/4" disabled={isLoading} />
                </div>
                <div>
                  <Label>หมู่</Label>
                  <Input value={form.moo} onChange={(e) => setForm(f => ({ ...f, moo: e.target.value }))} placeholder="เช่น 5" disabled={isLoading} />
                </div>
                <div className="sm:col-span-2">
                  <Label>ถนน/ซอย</Label>
                  <Input value={form.street} onChange={(e) => setForm(f => ({ ...f, street: e.target.value }))} placeholder="เช่น ถนนสุขุมวิท ซอย 12" disabled={isLoading} />
                </div>
                <div>
                  <Label>จังหวัด <span className="text-destructive">*</span></Label>
                  <AddressSearchSelect
                    value={form.province}
                    onValueChange={(v) => setForm(f => ({ ...f, province: v, district: "", subdistrict: "", postal_code: "" }))}
                    options={provinces}
                    placeholder="เลือกจังหวัด"
                    searchPlaceholder="ค้นหาจังหวัด..."
                  />
                </div>
                <div>
                  <Label>อำเภอ/เขต <span className="text-destructive">*</span></Label>
                  <AddressSearchSelect
                    value={form.district}
                    onValueChange={(v) => setForm(f => ({ ...f, district: v, subdistrict: "", postal_code: "" }))}
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
                    onValueChange={(v) => {
                      const sub = subdistricts.find((s) => s.name === v);
                      setForm(f => ({ ...f, subdistrict: v, postal_code: sub?.postalCode || postalCode || "" }));
                    }}
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

              {/* รหัสผ่าน - ล่างสุด */}
              <Separator />
              <div className="space-y-1">
                <Label className="text-base font-medium flex items-center gap-2">
                  <Lock className="w-4 h-4" />
                  ตั้งรหัสผ่าน
                </Label>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label>รหัสผ่าน <span className="text-destructive">*</span></Label>
                  <div className="relative">
                    <Input type={showPassword ? "text" : "password"} value={form.password} onChange={(e) => setForm(f => ({ ...f, password: e.target.value }))} className="pr-10" placeholder="อย่างน้อย 6 ตัวอักษร" disabled={isLoading} />
                    <Button type="button" variant="ghost" size="icon" className="absolute right-0 top-0 h-full px-3 hover:bg-transparent" onClick={() => setShowPassword(!showPassword)}>
                      {showPassword ? <EyeOff className="w-4 h-4 text-muted-foreground" /> : <Eye className="w-4 h-4 text-muted-foreground" />}
                    </Button>
                  </div>
                  {errors.password && <p className="text-sm text-destructive mt-1">{errors.password}</p>}
                </div>
                <div>
                  <Label>ยืนยันรหัสผ่าน <span className="text-destructive">*</span></Label>
                  <div className="relative">
                    <Input type={showConfirmPassword ? "text" : "password"} value={form.confirmPassword} onChange={(e) => setForm(f => ({ ...f, confirmPassword: e.target.value }))} className="pr-10" placeholder="กรอกรหัสผ่านอีกครั้ง" disabled={isLoading} />
                    <Button type="button" variant="ghost" size="icon" className="absolute right-0 top-0 h-full px-3 hover:bg-transparent" onClick={() => setShowConfirmPassword(!showConfirmPassword)}>
                      {showConfirmPassword ? <EyeOff className="w-4 h-4 text-muted-foreground" /> : <Eye className="w-4 h-4 text-muted-foreground" />}
                    </Button>
                  </div>
                  {errors.confirmPassword && <p className="text-sm text-destructive mt-1">{errors.confirmPassword}</p>}
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    กำลังลงทะเบียน...
                  </>
                ) : "ลงทะเบียน"}
              </Button>
            </CardFooter>
          </form>
        </Card>

        <p className="text-center text-sm text-muted-foreground mt-6">© 2026 Ranchu Center. All rights reserved.</p>
      </div>
    </div>
  );
};

export default StaffRegister;
