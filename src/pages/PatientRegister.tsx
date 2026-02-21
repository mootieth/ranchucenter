import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { th } from "date-fns/locale";
import { 
  User, 
  Phone, 
  Mail, 
  MapPin, 
  Heart, 
  AlertTriangle,
  FileText,
  Save,
  ArrowLeft,
  Loader2,
  CreditCard
} from "lucide-react";
import MainLayout from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import AddressSearchSelect from "@/components/ui/address-search-select";
import { DateInput } from "@/components/ui/date-input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { useCreatePatient } from "@/hooks/usePatients";
import { supabase } from "@/integrations/supabase/client";
import WebcamCapture from "@/components/WebcamCapture";
import PatientImportMenu from "@/components/PatientImportMenu";
import type { SmartCardData } from "@/services/smartCardReader";
import {
  useProvinceNames,
  useDistrictsByProvince,
  useSubdistrictsByDistrict,
} from "@/hooks/useThailandAddresses";

const patientSchema = z.object({
  prefix: z.string().optional(),
  firstName: z.string().min(1, "กรุณากรอกชื่อ"),
  lastName: z.string().min(1, "กรุณากรอกนามสกุล"),
  nickname: z.string().optional(),
  idCard: z.string().length(13, "เลขบัตรประชาชนต้องมี 13 หลัก").optional().or(z.literal("")),
  birthDate: z.date().optional(),
  gender: z.string().min(1, "กรุณาเลือกเพศ"),
  occupation: z.string().optional(),
  maritalStatus: z.string().optional(),
  phone: z.string().min(9, "เบอร์โทรศัพท์ไม่ถูกต้อง").optional().or(z.literal("")),
  email: z.string().email("อีเมลไม่ถูกต้อง").optional().or(z.literal("")),
  sameAddress: z.boolean().optional(),
  currentAddress: z.string().optional(),
  // Address fields
  houseNumber: z.string().optional(),
  moo: z.string().optional(),
  street: z.string().optional(),
  province: z.string().optional(),
  district: z.string().optional(),
  subdistrict: z.string().optional(),
  postalCode: z.string().optional(),
  emergencyContact: z.string().optional(),
  emergencyPhone: z.string().optional(),
  bloodType: z.string().optional(),
  allergies: z.string().optional(),
  medicalHistory: z.string().optional(),
  currentMedications: z.string().optional(),
  chiefComplaint: z.string().optional(),
});

type PatientFormData = z.infer<typeof patientSchema>;

const PatientRegister = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const createPatient = useCreatePatient();
  const [photoBlob, setPhotoBlob] = useState<Blob | null>(null);

  const handlePhotoCapture = useCallback((blob: Blob) => {
    setPhotoBlob(blob);
  }, []);


  const form = useForm<PatientFormData>({
    resolver: zodResolver(patientSchema),
    defaultValues: {
      prefix: "",
      firstName: "",
      lastName: "",
      nickname: "",
      idCard: "",
      gender: "",
      occupation: "",
      maritalStatus: "",
      phone: "",
      email: "",
      sameAddress: true,
      currentAddress: "",
      houseNumber: "",
      moo: "",
      street: "",
      province: "",
      district: "",
      subdistrict: "",
      postalCode: "",
      emergencyContact: "",
      emergencyPhone: "",
      bloodType: "",
      allergies: "",
      medicalHistory: "",
      currentMedications: "",
      chiefComplaint: "",
    },
  });

  const selectedProvince = form.watch("province");
  const selectedDistrict = form.watch("district");

  const handleSmartCardImport = useCallback((data: SmartCardData) => {
    if (data.prefix) form.setValue("prefix", data.prefix);
    if (data.firstName) form.setValue("firstName", data.firstName);
    if (data.lastName) form.setValue("lastName", data.lastName);
    if (data.cid) form.setValue("idCard", data.cid);
    if (data.gender) form.setValue("gender", data.gender);
    if (data.birthDate) {
      try {
        form.setValue("birthDate", new Date(data.birthDate));
      } catch {}
    }
    if (data.houseNumber) form.setValue("houseNumber", data.houseNumber);
    if (data.moo) form.setValue("moo", data.moo);
    if (data.street) form.setValue("street", data.street);
    if (data.province) {
      form.setValue("province", data.province);
      setTimeout(() => {
        if (data.district) {
          form.setValue("district", data.district);
          setTimeout(() => {
            if (data.subdistrict) form.setValue("subdistrict", data.subdistrict);
            if (data.postalCode) form.setValue("postalCode", data.postalCode);
          }, 100);
        }
      }, 100);
    }
    if (data.photo) {
      try {
        const byteChars = atob(data.photo);
        const byteNumbers = new Array(byteChars.length);
        for (let i = 0; i < byteChars.length; i++) {
          byteNumbers[i] = byteChars.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: "image/jpeg" });
        setPhotoBlob(blob);
      } catch {}
    }
  }, [form]);

  const { data: provinceNames } = useProvinceNames();
  const { data: districts } = useDistrictsByProvince(selectedProvince || "");
  const { data: subdistricts } = useSubdistrictsByDistrict(selectedProvince || "", selectedDistrict || "");

  const handleProvinceChange = (value: string) => {
    form.setValue("province", value);
    form.setValue("district", "");
    form.setValue("subdistrict", "");
    form.setValue("postalCode", "");
  };

  const handleDistrictChange = (value: string) => {
    form.setValue("district", value);
    form.setValue("subdistrict", "");
    form.setValue("postalCode", "");
  };

  const handleSubdistrictChange = (value: string) => {
    form.setValue("subdistrict", value);
    const match = subdistricts.find((s) => s.name === value);
    form.setValue("postalCode", match?.postalCode || "");
  };

  const onSubmit = async (data: PatientFormData) => {
    try {
      // Upload photo if captured
      let photoUrl: string | null = null;
      if (photoBlob) {
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.jpg`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from("patient-photos")
          .upload(fileName, photoBlob, { contentType: "image/jpeg" });
        if (uploadError) throw uploadError;
        const { data: urlData } = supabase.storage
          .from("patient-photos")
          .getPublicUrl(uploadData.path);
        photoUrl = urlData.publicUrl;
      }

      // Compose full address for backward compatibility
      const addressComponents = [
        data.houseNumber && `${data.houseNumber}`,
        data.moo && `หมู่ ${data.moo}`,
        data.street && `${data.street}`,
        data.subdistrict && `ต.${data.subdistrict}`,
        data.district && `อ.${data.district}`,
        data.province && `จ.${data.province}`,
        data.postalCode && `${data.postalCode}`,
      ].filter(Boolean);
      
      const fullAddress = addressComponents.join(" ");

      await createPatient.mutateAsync({
        prefix: data.prefix || null,
        first_name: data.firstName,
        last_name: data.lastName,
        nickname: data.nickname || null,
        id_card: data.idCard || null,
        date_of_birth: data.birthDate ? format(data.birthDate, "yyyy-MM-dd") : null,
        gender: data.gender || null,
        occupation: data.occupation || null,
        marital_status: data.maritalStatus || null,
        phone: data.phone || null,
        email: data.email || null,
        address: fullAddress || null,
        house_number: data.houseNumber || null,
        moo: data.moo || null,
        street: data.street || null,
        subdistrict: data.subdistrict || null,
        district: data.district || null,
        province: data.province || null,
        postal_code: data.postalCode || null,
        current_address: data.sameAddress ? null : (data.currentAddress || null),
        emergency_contact: data.emergencyContact || null,
        emergency_phone: data.emergencyPhone || null,
        blood_type: data.bloodType || null,
        photo_url: photoUrl,
        notes: [
          data.allergies ? `ประวัติแพ้ยา: ${data.allergies}` : "",
          data.medicalHistory ? `ประวัติการเจ็บป่วย: ${data.medicalHistory}` : "",
          data.currentMedications ? `ยาที่ใช้ปัจจุบัน: ${data.currentMedications}` : "",
          data.chiefComplaint ? `อาการสำคัญ: ${data.chiefComplaint}` : "",
        ].filter(Boolean).join("\n") || null,
      });
      navigate("/patients");
    } catch (error) {
      console.error("Error creating patient:", error);
    }
  };

  return (
    <MainLayout title="ลงทะเบียนผู้ป่วยใหม่">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => navigate(-1)}
            className="rounded-full"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h2 className="text-xl font-semibold">แบบฟอร์มลงทะเบียนผู้ป่วยใหม่</h2>
            <p className="text-sm text-muted-foreground">กรุณากรอกข้อมูลให้ครบถ้วน</p>
          </div>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Personal Information */}
            <div className="bg-card rounded-2xl shadow-soft p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <User className="w-5 h-5 text-primary" />
                  <h3 className="font-semibold">ข้อมูลส่วนตัว</h3>
                </div>
                <PatientImportMenu onImport={handleSmartCardImport} />
              </div>

              <div className="flex justify-center mb-4">
                <WebcamCapture
                  onCapture={handlePhotoCapture}
                  initials=""
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="prefix"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>คำนำหน้า</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger className="input-focus">
                            <SelectValue placeholder="เลือกคำนำหน้า" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="นาย">นาย</SelectItem>
                          <SelectItem value="นาง">นาง</SelectItem>
                          <SelectItem value="นางสาว">นางสาว</SelectItem>
                          <SelectItem value="เด็กชาย">เด็กชาย</SelectItem>
                          <SelectItem value="เด็กหญิง">เด็กหญิง</SelectItem>
                          <SelectItem value="Mr.">Mr.</SelectItem>
                          <SelectItem value="Mrs.">Mrs.</SelectItem>
                          <SelectItem value="Ms.">Ms.</SelectItem>
                          <SelectItem value="Miss">Miss</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="firstName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>ชื่อ *</FormLabel>
                      <FormControl>
                        <Input placeholder="กรอกชื่อ" {...field} className="input-focus" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="lastName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>นามสกุล *</FormLabel>
                      <FormControl>
                        <Input placeholder="กรอกนามสกุล" {...field} className="input-focus" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="nickname"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>ชื่อเล่น</FormLabel>
                      <FormControl>
                        <Input placeholder="กรอกชื่อเล่น" {...field} className="input-focus" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="idCard"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>เลขบัตรประชาชน</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="X-XXXX-XXXXX-XX-X" 
                          maxLength={13}
                          {...field} 
                          className="input-focus font-mono"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="birthDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>วันเกิด</FormLabel>
                      <FormControl>
                        <DateInput
                          max={format(new Date(), "yyyy-MM-dd")}
                          value={field.value ? format(field.value, "yyyy-MM-dd") : ""}
                          onChange={(val) => {
                            if (val) {
                              field.onChange(new Date(val));
                            } else {
                              field.onChange(undefined);
                            }
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="gender"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>เพศ *</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger className="input-focus">
                            <SelectValue placeholder="เลือกเพศ" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="male">ชาย</SelectItem>
                          <SelectItem value="female">หญิง</SelectItem>
                          <SelectItem value="other">อื่นๆ</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="bloodType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>กรุ๊ปเลือด</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger className="input-focus">
                            <SelectValue placeholder="เลือกกรุ๊ปเลือด" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="A">A</SelectItem>
                          <SelectItem value="B">B</SelectItem>
                          <SelectItem value="AB">AB</SelectItem>
                          <SelectItem value="O">O</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="occupation"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>อาชีพ</FormLabel>
                      <FormControl>
                        <Input placeholder="กรอกอาชีพ" {...field} className="input-focus" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="maritalStatus"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>สถานภาพ</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger className="input-focus">
                            <SelectValue placeholder="เลือกสถานภาพ" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="single">โสด</SelectItem>
                          <SelectItem value="married">สมรส</SelectItem>
                          <SelectItem value="divorced">หย่าร้าง</SelectItem>
                          <SelectItem value="widowed">หม้าย</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            

            {/* Address Information */}
            <div className="bg-card rounded-2xl shadow-soft p-6">
              <div className="flex items-center gap-2 mb-4">
                <MapPin className="w-5 h-5 text-primary" />
                <h3 className="font-semibold">ที่อยู่</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <FormField
                  control={form.control}
                  name="houseNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>บ้านเลขที่ <span className="text-muted-foreground font-normal text-xs">(เช่น 123/45)</span></FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          className="input-focus"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="moo"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>หมู่ที่ <span className="text-muted-foreground font-normal text-xs">(เช่น 5)</span></FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          className="input-focus"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="street"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel>ถนน/ซอย <span className="text-muted-foreground font-normal text-xs">(เช่น ถนนพหลโยธิน ซอยสุขใจ)</span></FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          className="input-focus"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="province"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>จังหวัด</FormLabel>
                      <FormControl>
                        <AddressSearchSelect
                          value={field.value || ""}
                          onValueChange={handleProvinceChange}
                          options={provinceNames || []}
                          placeholder="เลือกจังหวัด"
                          searchPlaceholder="พิมพ์ชื่อจังหวัด..."
                          emptyMessage="ไม่พบจังหวัด"
                          className="input-focus"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="district"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>อำเภอ/เขต</FormLabel>
                      <FormControl>
                        <AddressSearchSelect
                          value={field.value || ""}
                          onValueChange={handleDistrictChange}
                          options={districts || []}
                          placeholder="เลือกอำเภอ"
                          searchPlaceholder="พิมพ์ชื่ออำเภอ..."
                          emptyMessage="ไม่พบอำเภอ"
                          disabled={!selectedProvince}
                          className="input-focus"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="subdistrict"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>ตำบล/แขวง</FormLabel>
                      <FormControl>
                        <AddressSearchSelect
                          value={field.value || ""}
                          onValueChange={handleSubdistrictChange}
                          options={subdistricts?.map((s) => s.name) || []}
                          placeholder="เลือกตำบล"
                          searchPlaceholder="พิมพ์ชื่อตำบล..."
                          emptyMessage="ไม่พบตำบล"
                          disabled={!selectedDistrict}
                          className="input-focus"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="postalCode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>รหัสไปรษณีย์</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="10900" 
                          {...field} 
                          className="input-focus"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Contact Information */}
            <div className="bg-card rounded-2xl shadow-soft p-6">
              <div className="flex items-center gap-2 mb-4">
                <Phone className="w-5 h-5 text-primary" />
                <h3 className="font-semibold">ข้อมูลติดต่อ</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>เบอร์โทรศัพท์ *</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="0XX-XXX-XXXX" 
                          {...field} 
                          className="input-focus"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>อีเมล</FormLabel>
                      <FormControl>
                        <Input 
                          type="email"
                          placeholder="email@example.com" 
                          {...field} 
                          className="input-focus"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="col-span-1 md:col-span-2 space-y-3">
                  <FormField
                    control={form.control}
                    name="sameAddress"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <FormLabel className="font-normal cursor-pointer">
                          ที่อยู่ปัจจุบันเดียวกับที่อยู่ตามบัตรประชาชน
                        </FormLabel>
                      </FormItem>
                    )}
                  />

                  {!form.watch("sameAddress") && (
                    <FormField
                      control={form.control}
                      name="currentAddress"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>ที่อยู่ติดต่อปัจจุบัน</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="กรอกที่อยู่ติดต่อปัจจุบัน"
                              {...field}
                              className="input-focus resize-none"
                              rows={3}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                </div>

                <FormField
                  control={form.control}
                  name="emergencyContact"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>ผู้ติดต่อฉุกเฉิน *</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="ชื่อผู้ติดต่อ" 
                          {...field} 
                          className="input-focus"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="emergencyPhone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>เบอร์โทรฉุกเฉิน *</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="0XX-XXX-XXXX" 
                          {...field} 
                          className="input-focus"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Medical Information */}
            <div className="bg-card rounded-2xl shadow-soft p-6">
              <div className="flex items-center gap-2 mb-4">
                <Heart className="w-5 h-5 text-primary" />
                <h3 className="font-semibold">ข้อมูลทางการแพทย์</h3>
              </div>

              <div className="grid grid-cols-1 gap-4">
                <FormField
                  control={form.control}
                  name="allergies"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-warning" />
                        ประวัติการแพ้ยา / อาหาร
                      </FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="ระบุยาหรืออาหารที่แพ้ (ถ้ามี)" 
                          {...field} 
                          className="input-focus resize-none"
                          rows={2}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="medicalHistory"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>ประวัติการเจ็บป่วย</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="ระบุโรคประจำตัว หรือประวัติการรักษาที่ผ่านมา" 
                          {...field} 
                          className="input-focus resize-none"
                          rows={2}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="currentMedications"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>ยาที่ใช้อยู่ปัจจุบัน</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="ระบุยาที่กำลังใช้อยู่ (ถ้ามี)" 
                          {...field} 
                          className="input-focus resize-none"
                          rows={2}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Chief Complaint */}
            <div className="bg-card rounded-2xl shadow-soft p-6">
              <div className="flex items-center gap-2 mb-4">
                <FileText className="w-5 h-5 text-primary" />
                <h3 className="font-semibold">อาการสำคัญ</h3>
              </div>

              <FormField
                control={form.control}
                name="chiefComplaint"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>อาการสำคัญที่มาพบแพทย์ *</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="อธิบายอาการหรือปัญหาที่ต้องการปรึกษา" 
                        {...field} 
                        className="input-focus resize-none"
                        rows={4}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Submit Button */}
            <div className="flex justify-end gap-4">
              <Button 
                type="button" 
                variant="outline"
                onClick={() => navigate(-1)}
              >
                ยกเลิก
              </Button>
              <Button 
                type="submit" 
                disabled={createPatient.isPending}
                className="bg-gradient-primary hover:opacity-90"
              >
                {createPatient.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    กำลังบันทึก...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    บันทึกข้อมูล
                  </>
                )}
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </MainLayout>
  );
};

export default PatientRegister;
