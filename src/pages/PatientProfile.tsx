import { useState, useCallback, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { format, differenceInYears } from "date-fns";
import { th } from "date-fns/locale";
import { 
  ArrowLeft,
  User,
  UserPlus,
  X as XIcon,
  Phone, 
  Mail, 
  MapPin, 
  Calendar,
  AlertTriangle,
  Pill,
  FileText,
  Clock,
  Edit,
  Plus,
  Heart,
  Loader2,
  Save,
  X,
  Paperclip
} from "lucide-react";
import MainLayout from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DateInput } from "@/components/ui/date-input";
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { usePatient, useUpdatePatient } from "@/hooks/usePatients";
import { usePatientAllergies } from "@/hooks/useAllergies";
import { useTreatments } from "@/hooks/useTreatments";
import { useAppointments } from "@/hooks/useAppointments";
import { useBillings } from "@/hooks/useBillings";
import { usePrescriptions } from "@/hooks/usePrescriptions";
import { supabase } from "@/integrations/supabase/client";
import { useProviders } from "@/hooks/useProviders";
import WebcamCapture from "@/components/WebcamCapture";
import PatientImportMenu from "@/components/PatientImportMenu";
import { type SmartCardData } from "@/services/smartCardReader";
import {
  useProvinceNames,
  useDistrictsByProvince,
  useSubdistrictsByDistrict,
} from "@/hooks/useThailandAddresses";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import TreatmentFiles from "@/components/treatments/TreatmentFiles";
import { useTreatmentFileCounts } from "@/hooks/useTreatmentFileCounts";
import PatientFiles from "@/components/patients/PatientFiles";

const PatientProfile = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { hasPermission } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<Record<string, string>>({});
  
  // Address state
  const [province, setProvince] = useState("");
  const [district, setDistrict] = useState("");
  const [subdistrict, setSubdistrict] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [houseNumber, setHouseNumber] = useState("");
  const [moo, setMoo] = useState("");
  const [street, setStreet] = useState("");
  const [sameAddress, setSameAddress] = useState(true);
  const [currentAddress, setCurrentAddress] = useState("");
  const [photoBlob, setPhotoBlob] = useState<Blob | null>(null);

  const handlePhotoCapture = useCallback((blob: Blob) => {
    setPhotoBlob(blob);
  }, []);

  const { data: provinceNames } = useProvinceNames();
  const { data: districtsList } = useDistrictsByProvince(province);
  const { data: subdistrictsList } = useSubdistrictsByDistrict(province, district);

  const { data: patient, isLoading } = usePatient(id || "");
  const { data: providers = [] } = useProviders();
  const updatePatient = useUpdatePatient();
  const [patientProviderIds, setPatientProviderIds] = useState<string[]>([]);
  const [addProviderOpen, setAddProviderOpen] = useState(false);
  const [selectedTreatment, setSelectedTreatment] = useState<any>(null);

  // Fetch patient providers from junction table
  useEffect(() => {
    if (!id) return;
    const fetchProviders = async () => {
      const { data } = await supabase
        .from("patient_providers")
        .select("provider_id")
        .eq("patient_id", id);
      setPatientProviderIds((data || []).map(d => d.provider_id));
    };
    fetchProviders();
  }, [id]);

  const addPatientProvider = async (providerId: string) => {
    if (!id) return;
    const { error } = await supabase
      .from("patient_providers")
      .insert({ patient_id: id, provider_id: providerId });
    if (!error) {
      setPatientProviderIds(prev => [...prev, providerId]);
      setAddProviderOpen(false);
    }
  };

  const removePatientProvider = async (providerId: string) => {
    if (!id) return;
    const { error } = await supabase
      .from("patient_providers")
      .delete()
      .eq("patient_id", id)
      .eq("provider_id", providerId);
    if (!error) {
      setPatientProviderIds(prev => prev.filter(p => p !== providerId));
    }
  };
  
  // Related data
  const { data: allergies } = usePatientAllergies(id || "");
  const { data: treatments } = useTreatments();
  const { data: appointmentsData } = useAppointments();
  const { data: billingsData } = useBillings();
  const { data: prescriptions } = usePrescriptions();

  // Filter data for this patient
  const patientTreatments = treatments?.filter(t => t.patient_id === id) || [];
  const { data: treatmentFileCounts = {} } = useTreatmentFileCounts(patientTreatments.map(t => t.id));
  const patientAppointments = appointmentsData?.filter(a => a.patient_id === id) || [];
  const patientBillings = billingsData?.filter(b => b.patient_id === id) || [];
  const patientPrescriptions = prescriptions?.filter(p => p.patient_id === id) || [];

  const handleEdit = () => {
    if (patient) {
      setEditForm({
        prefix: patient.prefix || "",
        first_name: patient.first_name || "",
        last_name: patient.last_name || "",
        nickname: patient.nickname || "",
        id_card: patient.id_card || "",
        date_of_birth: patient.date_of_birth || "",
        phone: patient.phone || "",
        email: patient.email || "",
        gender: patient.gender || "",
        blood_type: patient.blood_type || "",
        emergency_contact: patient.emergency_contact || "",
        emergency_phone: patient.emergency_phone || "",
        occupation: patient.occupation || "",
        marital_status: patient.marital_status || "",
        notes: patient.notes || "",
      });
      
      // Load individual address fields from DB
      setHouseNumber(patient.house_number || "");
      setMoo(patient.moo || "");
      setStreet(patient.street || "");
      setProvince(patient.province || "");
      setDistrict(patient.district || "");
      setSubdistrict(patient.subdistrict || "");
      setPostalCode(patient.postal_code || "");
      
      const patientCurrentAddress = (patient as any).current_address || "";
      setSameAddress(!patientCurrentAddress);
      setCurrentAddress(patientCurrentAddress);
      
      setIsEditing(true);
    }
  };

  const handleSave = async () => {
    if (!patient || !id) return;

    if (!editForm.first_name?.trim()) {
      toast({ title: "กรุณากรอกชื่อ", variant: "destructive" });
      return;
    }
    if (!editForm.last_name?.trim()) {
      toast({ title: "กรุณากรอกนามสกุล", variant: "destructive" });
      return;
    }
    if (!editForm.gender) {
      toast({ title: "กรุณาเลือกเพศ", variant: "destructive" });
      return;
    }

    // Compose full address for backward compatibility
    const addressComponents = [
      houseNumber && `${houseNumber}`,
      moo && `หมู่ ${moo}`,
      street && `${street}`,
      subdistrict && `ต.${subdistrict}`,
      district && `อ.${district}`,
      province && `จ.${province}`,
      postalCode && `${postalCode}`,
    ].filter(Boolean);
    
    const fullAddress = addressComponents.join(" ");

    try {
      // Upload photo if captured
      let photoUrl: string | undefined = undefined;
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

      await updatePatient.mutateAsync({
        id,
        input: {
          ...editForm,
          blood_type: editForm.blood_type || null,
          marital_status: editForm.marital_status || null,
          occupation: editForm.occupation || null,
          nickname: editForm.nickname || null,
          id_card: editForm.id_card || null,
          address: fullAddress || null,
          house_number: houseNumber || null,
          moo: moo || null,
          street: street || null,
          subdistrict: subdistrict || null,
          district: district || null,
          province: province || null,
          postal_code: postalCode || null,
          current_address: sameAddress ? null : (currentAddress || null),
          ...(photoUrl !== undefined && { photo_url: photoUrl }),
        },
      });
      setIsEditing(false);
    } catch (error) {
      console.error("Error updating patient:", error);
    }
  };

  const handleSmartCardImport = useCallback((data: SmartCardData) => {
    setEditForm(prev => ({
      ...prev,
      prefix: data.prefix || prev.prefix,
      first_name: data.firstName || prev.first_name,
      last_name: data.lastName || prev.last_name,
      id_card: data.cid || prev.id_card,
      gender: data.gender || prev.gender,
      date_of_birth: data.birthDate || prev.date_of_birth,
    }));
    if (data.houseNumber) setHouseNumber(data.houseNumber);
    if (data.moo) setMoo(data.moo);
    if (data.street) setStreet(data.street);
    if (data.province) setProvince(data.province);
    if (data.district) setDistrict(data.district);
    if (data.subdistrict) setSubdistrict(data.subdistrict);
    if (data.postalCode) setPostalCode(data.postalCode);
    if (data.photo) {
      const byteString = atob(data.photo);
      const ab = new ArrayBuffer(byteString.length);
      const ia = new Uint8Array(ab);
      for (let i = 0; i < byteString.length; i++) ia[i] = byteString.charCodeAt(i);
      const blob = new Blob([ab], { type: "image/jpeg" });
      setPhotoBlob(blob);
    }
  }, []);

  const handleProvinceChange = (value: string) => {
    setProvince(value);
    setDistrict("");
    setSubdistrict("");
    setPostalCode("");
  };

  const handleDistrictChange = (value: string) => {
    setDistrict(value);
    setSubdistrict("");
    setPostalCode("");
  };

  const handleSubdistrictChange = (value: string) => {
    setSubdistrict(value);
    const match = subdistrictsList.find((s) => s.name === value);
    setPostalCode(match?.postalCode || "");
  };

  if (isLoading) {
    return (
      <MainLayout title="โปรไฟล์ผู้ป่วย">
        <div className="flex items-center justify-center h-96">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </MainLayout>
    );
  }

  if (!patient) {
    return (
      <MainLayout title="โปรไฟล์ผู้ป่วย">
        <div className="flex flex-col items-center justify-center h-96 gap-4">
          <p className="text-muted-foreground">ไม่พบข้อมูลผู้ป่วย</p>
          <Button asChild>
            <Link to="/patients">กลับไปหน้ารายชื่อผู้ป่วย</Link>
          </Button>
        </div>
      </MainLayout>
    );
  }

  const age = patient.date_of_birth 
    ? differenceInYears(new Date(), new Date(patient.date_of_birth))
    : null;
  
  const initials = `${patient.first_name?.charAt(0) || ""}${patient.last_name?.charAt(0) || ""}`;
  
  const genderDisplay = patient.gender === "male" ? "ชาย" : patient.gender === "female" ? "หญิง" : patient.gender || "-";

  const formatThaiDate = (dateStr: string | null) => {
    if (!dateStr) return "-";
    try {
      return format(new Date(dateStr), "d MMMM yyyy", { locale: th });
    } catch {
      return dateStr;
    }
  };

  return (
    <MainLayout title="โปรไฟล์ผู้ป่วย">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Button 
            variant="ghost" 
            size="icon" 
            asChild
            className="rounded-full"
          >
            <Link to="/patients">
              <ArrowLeft className="w-5 h-5" />
            </Link>
          </Button>
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-semibold">
                {patient.prefix || ""} {patient.first_name} {patient.last_name}
              </h2>
              <Badge variant="outline" className={
                patient.status === "active" 
                  ? "bg-success/10 text-success border-success/20"
                  : "bg-muted text-muted-foreground"
              }>
                {patient.status === "active" ? "กำลังรักษา" : "ปิดการรักษา"}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">HN: {patient.hn}</p>
          </div>
          <Button variant="outline" onClick={handleEdit}>
            <Edit className="w-4 h-4 mr-2" />
            แก้ไขข้อมูล
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Patient Info */}
          <div className="space-y-6">
            {/* Profile Card */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex flex-col items-center text-center mb-6">
                  <Avatar className="w-20 h-20 mb-3">
                    {patient.photo_url ? (
                      <img src={patient.photo_url} alt="Patient" className="w-full h-full object-cover rounded-full" />
                    ) : null}
                    <AvatarFallback className="bg-primary text-primary-foreground text-2xl">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <h3 className="font-semibold text-lg">
                    {patient.prefix || ""} {patient.first_name} {patient.last_name}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {genderDisplay} {age ? `• ${age} ปี` : ""} {patient.blood_type ? `• กรุ๊ปเลือด ${patient.blood_type}` : ""}
                  </p>
                </div>

                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <Phone className="w-4 h-4 text-muted-foreground mt-0.5" />
                    <p className="text-sm">{patient.phone || "-"}</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <Mail className="w-4 h-4 text-muted-foreground mt-0.5" />
                    <p className="text-sm">{patient.email || "-"}</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <MapPin className="w-4 h-4 text-muted-foreground mt-0.5" />
                    <p className="text-sm">{patient.address || "-"}</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <Calendar className="w-4 h-4 text-muted-foreground mt-0.5" />
                    <p className="text-sm">
                      เกิด {formatThaiDate(patient.date_of_birth)}
                    </p>
                  </div>
                </div>

                <div className="border-t mt-4 pt-4">
                  <p className="text-xs text-muted-foreground mb-1">ผู้ติดต่อฉุกเฉิน</p>
                  <p className="text-sm font-medium">{patient.emergency_contact || "-"}</p>
                  <p className="text-sm text-muted-foreground">{patient.emergency_phone || "-"}</p>
                </div>

                {patient.id_card && (
                  <div className="border-t mt-4 pt-4">
                    <p className="text-xs text-muted-foreground mb-1">เลขบัตรประชาชน</p>
                    <p className="text-sm font-mono">{patient.id_card}</p>
                  </div>
                )}

                <div className="border-t mt-4 pt-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs text-muted-foreground">แพทย์/นักจิตวิทยาประจำ</p>
                    <Popover open={addProviderOpen} onOpenChange={setAddProviderOpen}>
                      <PopoverTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-6 w-6">
                          <UserPlus className="w-3.5 h-3.5 text-primary" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-64 p-2" align="end">
                        <p className="text-xs font-medium text-muted-foreground mb-2 px-1">เลือกแพทย์/นักจิตวิทยา</p>
                        <div className="space-y-1 max-h-48 overflow-y-auto">
                          {providers
                            .filter(p => !patientProviderIds.includes(p.user_id))
                            .map(prov => (
                              <Button
                                key={prov.user_id}
                                variant="ghost"
                                size="sm"
                                className="w-full justify-start text-sm h-8"
                                onClick={() => addPatientProvider(prov.user_id)}
                              >
                                {prov.full_name}{prov.specialty ? ` (${prov.specialty})` : ""}
                              </Button>
                            ))}
                          {providers.filter(p => !patientProviderIds.includes(p.user_id)).length === 0 && (
                            <p className="text-xs text-muted-foreground text-center py-2">ไม่มีผู้ให้บริการเพิ่มเติม</p>
                          )}
                        </div>
                      </PopoverContent>
                    </Popover>
                  </div>
                  {patientProviderIds.length > 0 ? (
                    <div className="space-y-1.5">
                      {patientProviderIds.map(pid => {
                        const prov = providers.find(p => p.user_id === pid);
                        if (!prov) return null;
                        return (
                          <div key={pid} className="flex items-center justify-between group">
                            <div className="flex items-center gap-2">
                              <User className="w-3.5 h-3.5 text-primary" />
                              <p className="text-sm">{prov.full_name}{prov.specialty ? ` (${prov.specialty})` : ""}</p>
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={() => removePatientProvider(pid)}
                            >
                              <XIcon className="w-3 h-3 text-muted-foreground" />
                            </Button>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">ยังไม่ได้กำหนด</p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Allergies Card */}
            <Card className="border-destructive/30 bg-destructive/5">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2 text-destructive">
                  <AlertTriangle className="w-4 h-4" />
                  ประวัติแพ้ยา
                </CardTitle>
              </CardHeader>
              <CardContent>
                {allergies && allergies.length > 0 ? (
                  <div className="space-y-2">
                    {allergies.map((allergy) => (
                      <div key={allergy.id} className="p-2 bg-background rounded-lg">
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-sm">{allergy.allergen}</span>
                          <Badge variant="destructive" className="text-xs">
                            {allergy.severity === "severe" ? "รุนแรง" : 
                             allergy.severity === "moderate" ? "ปานกลาง" : "เล็กน้อย"}
                          </Badge>
                        </div>
                        {allergy.reaction && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {allergy.reaction}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">ไม่มีประวัติแพ้ยา</p>
                )}
              </CardContent>
            </Card>

            {/* Current Medications */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Pill className="w-4 h-4 text-primary" />
                  ยาปัจจุบัน
                </CardTitle>
              </CardHeader>
              <CardContent>
                {patientPrescriptions && patientPrescriptions.length > 0 ? (
                  <div className="space-y-3">
                    {patientPrescriptions.slice(0, 3).map((prescription) => (
                      <div key={prescription.id} className="p-3 bg-muted/30 rounded-lg">
                        <p className="font-medium text-sm">
                          ใบสั่งยา #{prescription.id.slice(0, 8)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          วันที่: {formatThaiDate(prescription.prescription_date)}
                        </p>
                        <Badge variant="outline" className="text-xs mt-1">
                          {prescription.status === "dispensed" ? "จ่ายยาแล้ว" : 
                           prescription.status === "pending" ? "รอจ่ายยา" : prescription.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">ไม่มียาที่สั่ง</p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Tabs */}
          <div className="lg:col-span-2">
            <Tabs defaultValue="history" className="w-full">
              <TabsList className="w-full grid grid-cols-4 mb-4">
                <TabsTrigger value="history">ประวัติการรักษา</TabsTrigger>
                <TabsTrigger value="appointments">นัดหมาย</TabsTrigger>
                <TabsTrigger value="billing">ประวัติชำระเงิน</TabsTrigger>
                <TabsTrigger value="documents">เอกสาร</TabsTrigger>
              </TabsList>

              <TabsContent value="history">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      <FileText className="w-4 h-4 text-primary" />
                      บันทึกการรักษา
                    </CardTitle>
                    {hasPermission("treatments") && (
                      <Button size="sm" className="bg-gradient-primary" asChild>
                        <Link to={`/treatments?patient_id=${id}&action=new`}>
                          <Plus className="w-4 h-4 mr-1" />
                          เพิ่มบันทึก
                        </Link>
                      </Button>
                    )}
                  </CardHeader>
                  <CardContent>
                    {patientTreatments && patientTreatments.length > 0 ? (
                      <div className="space-y-4">
                        {patientTreatments.map((record, index) => (
                          <div key={record.id} className="relative pl-6 pb-4">
                            {index < patientTreatments.length - 1 && (
                              <div className="absolute left-[9px] top-6 w-0.5 h-full bg-border" />
                            )}
                            <div className="absolute left-0 top-1.5 w-[18px] h-[18px] rounded-full bg-primary/10 border-2 border-primary flex items-center justify-center">
                              <div className="w-2 h-2 rounded-full bg-primary" />
                            </div>
                            
                            <div
                              className="bg-muted/30 rounded-xl p-4 cursor-pointer hover:bg-muted/50 transition-colors"
                              onClick={() => setSelectedTreatment(record)}
                            >
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                  <Badge variant="outline">
                                    {record.diagnosis || "การรักษา"}
                                  </Badge>
                                </div>
                                <span className="text-xs text-muted-foreground">
                                  {formatThaiDate(record.treatment_date)}
                                </span>
                              </div>
                              <p className="text-sm">{record.symptoms || record.clinical_notes || "-"}</p>
                              <div className="flex items-center gap-3 mt-2">
                                {treatmentFileCounts[record.id] > 0 && (
                                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                    <Paperclip className="w-3.5 h-3.5 text-primary" />
                                    <span>{treatmentFileCounts[record.id]} ไฟล์</span>
                                  </div>
                                )}
                                {record.follow_up_date && (
                                  <div className="flex items-center gap-1.5 text-xs text-primary">
                                    <Clock className="w-3.5 h-3.5" />
                                    นัดครั้งถัดไป: {formatThaiDate(record.follow_up_date)}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        <p>ยังไม่มีประวัติการรักษา</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="appointments">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-primary" />
                      นัดหมายที่กำลังจะมาถึง
                    </CardTitle>
                    {hasPermission("appointments") && (
                      <Button size="sm" className="bg-gradient-primary" asChild>
                        <Link to={`/appointments?patient_id=${id}&action=new`}>
                          <Plus className="w-4 h-4 mr-1" />
                          สร้างนัดหมาย
                        </Link>
                      </Button>
                    )}
                  </CardHeader>
                  <CardContent>
                    {patientAppointments.length > 0 ? (
                      <div className="space-y-3">
                        {patientAppointments.map((apt) => (
                          <div
                            key={apt.id}
                            className="flex items-center justify-between p-4 bg-muted/30 rounded-xl cursor-pointer hover:bg-muted/50 transition-colors"
                            onClick={() => navigate(`/appointments?appointment_id=${apt.id}`)}
                          >
                            <div className="flex items-center gap-4">
                              <div className="text-center">
                                <p className="text-2xl font-bold text-primary">
                                  {new Date(apt.appointment_date).getDate()}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {format(new Date(apt.appointment_date), "MMM", { locale: th })}
                                </p>
                              </div>
                              <div>
                                <p className="font-medium">{apt.appointment_type || "ติดตาม"}</p>
                                <div className="flex items-center gap-2 mt-1">
                                  <Badge variant="outline" className="text-xs">
                                    {apt.status === "scheduled" ? "นัดหมาย" : 
                                     apt.status === "completed" ? "เสร็จสิ้น" : 
                                     apt.status === "cancelled" ? "ยกเลิก" : apt.status}
                                  </Badge>
                                  <span className="text-xs text-muted-foreground">
                                    <Clock className="w-3 h-3 inline mr-1" />
                                    {apt.start_time}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        <p>ยังไม่มีนัดหมาย</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="billing">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Heart className="w-4 h-4 text-primary" />
                      ประวัติการชำระเงิน
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {patientBillings.length > 0 ? (
                      <div className="space-y-3">
                        {patientBillings.map((billing) => (
                          <div key={billing.id} className="flex items-center justify-between p-4 bg-muted/30 rounded-xl">
                            <div>
                              <p className="font-medium">#{billing.invoice_number}</p>
                              <p className="text-sm text-muted-foreground">
                                {formatThaiDate(billing.billing_date)}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="font-semibold text-primary">
                                ฿{billing.total?.toLocaleString() || 0}
                              </p>
                              <Badge variant={billing.payment_status === "paid" ? "default" : "outline"}>
                                {billing.payment_status === "paid" ? "ชำระแล้ว" : "รอชำระ"}
                              </Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        <p>ยังไม่มีประวัติการชำระเงิน</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="documents">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Paperclip className="w-4 h-4 text-primary" />
                      เอกสารทั่วไป
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <PatientFiles patientId={id!} />
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>

      {/* Treatment Detail Dialog */}
      <Dialog open={!!selectedTreatment} onOpenChange={(open) => !open && setSelectedTreatment(null)}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" />
              ประวัติการรักษา
            </DialogTitle>
          </DialogHeader>
          {selectedTreatment && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Badge variant="outline" className="text-sm">
                  {selectedTreatment.diagnosis || "การรักษา"}
                </Badge>
                <span className="text-sm text-muted-foreground">
                  {formatThaiDate(selectedTreatment.treatment_date)}
                </span>
              </div>

              {selectedTreatment.diagnosis_code && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">รหัสวินิจฉัย</p>
                  <p className="text-sm">{selectedTreatment.diagnosis_code}</p>
                </div>
              )}

              {selectedTreatment.symptoms && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">อาการ</p>
                  <p className="text-sm">{selectedTreatment.symptoms}</p>
                </div>
              )}

              {selectedTreatment.treatment_plan && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">แผนการรักษา</p>
                  <p className="text-sm">{selectedTreatment.treatment_plan}</p>
                </div>
              )}

              {selectedTreatment.procedures && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">หัตถการ</p>
                  <p className="text-sm">{selectedTreatment.procedures}</p>
                </div>
              )}

              {selectedTreatment.clinical_notes && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">บันทึกทางคลินิก</p>
                  <p className="text-sm">{selectedTreatment.clinical_notes}</p>
                </div>
              )}

              {selectedTreatment.vital_signs && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">สัญญาณชีพ</p>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    {(selectedTreatment.vital_signs as any).blood_pressure && (
                      <div className="p-2 bg-muted/30 rounded-lg">
                        <span className="text-xs text-muted-foreground">ความดันโลหิต</span>
                        <p className="font-medium">{(selectedTreatment.vital_signs as any).blood_pressure} mmHg</p>
                      </div>
                    )}
                    {(selectedTreatment.vital_signs as any).heart_rate && (
                      <div className="p-2 bg-muted/30 rounded-lg">
                        <span className="text-xs text-muted-foreground">ชีพจร</span>
                        <p className="font-medium">{(selectedTreatment.vital_signs as any).heart_rate} bpm</p>
                      </div>
                    )}
                    {(selectedTreatment.vital_signs as any).temperature && (
                      <div className="p-2 bg-muted/30 rounded-lg">
                        <span className="text-xs text-muted-foreground">อุณหภูมิ</span>
                        <p className="font-medium">{(selectedTreatment.vital_signs as any).temperature} °C</p>
                      </div>
                    )}
                    {(selectedTreatment.vital_signs as any).weight && (
                      <div className="p-2 bg-muted/30 rounded-lg">
                        <span className="text-xs text-muted-foreground">น้ำหนัก</span>
                        <p className="font-medium">{(selectedTreatment.vital_signs as any).weight} kg</p>
                      </div>
                    )}
                    {(selectedTreatment.vital_signs as any).height && (
                      <div className="p-2 bg-muted/30 rounded-lg">
                        <span className="text-xs text-muted-foreground">ส่วนสูง</span>
                        <p className="font-medium">{(selectedTreatment.vital_signs as any).height} cm</p>
                      </div>
                    )}
                    {(selectedTreatment.vital_signs as any).respiratory_rate && (
                      <div className="p-2 bg-muted/30 rounded-lg">
                        <span className="text-xs text-muted-foreground">อัตราหายใจ</span>
                        <p className="font-medium">{(selectedTreatment.vital_signs as any).respiratory_rate} /min</p>
                      </div>
                    )}
                    {(selectedTreatment.vital_signs as any).oxygen_saturation && (
                      <div className="p-2 bg-muted/30 rounded-lg">
                        <span className="text-xs text-muted-foreground">ออกซิเจน</span>
                        <p className="font-medium">{(selectedTreatment.vital_signs as any).oxygen_saturation} %</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {selectedTreatment.follow_up_date && (
                <div className="flex items-center gap-2 p-3 bg-primary/5 border border-primary/20 rounded-lg">
                  <Clock className="w-4 h-4 text-primary" />
                  <div>
                    <p className="text-xs text-muted-foreground">นัดครั้งถัดไป</p>
                    <p className="text-sm font-medium text-primary">{formatThaiDate(selectedTreatment.follow_up_date)}</p>
                    {selectedTreatment.follow_up_notes && (
                      <p className="text-xs text-muted-foreground mt-0.5">{selectedTreatment.follow_up_notes}</p>
                    )}
                  </div>
                </div>
              )}

              {selectedTreatment.provider_id && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">ผู้รักษา</p>
                  <p className="text-sm">
                    {providers.find(p => p.user_id === selectedTreatment.provider_id)?.full_name || "-"}
                  </p>
                </div>
              )}

              {/* Attached files */}
              <div className="pt-2 border-t">
                <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1.5">
                  <Paperclip className="w-3.5 h-3.5" />
                  ไฟล์แนบ
                </p>
                <TreatmentFiles
                  patientId={id!}
                  treatmentId={selectedTreatment.id}
                  compact
                />
              </div>

              {hasPermission("treatments") && (
                <div className="pt-2 border-t">
                  <Button
                    className="w-full bg-gradient-primary"
                    onClick={() => {
                      setSelectedTreatment(null);
                      navigate(`/treatments?treatment_id=${selectedTreatment.id}&action=edit`);
                    }}
                  >
                    <Edit className="w-4 h-4 mr-2" />
                    แก้ไขบันทึกการรักษา
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={isEditing} onOpenChange={setIsEditing}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle>แก้ไขข้อมูลผู้ป่วย</DialogTitle>
              <PatientImportMenu onImport={handleSmartCardImport} />
            </div>
          </DialogHeader>
          
          <div className="flex flex-col items-center gap-2 mb-2">
            <WebcamCapture
              currentPhotoUrl={patient.photo_url}
              onCapture={handlePhotoCapture}
              initials={initials}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>คำนำหน้า</Label>
              <Select
                value={editForm.prefix || ""}
                onValueChange={(value) => setEditForm({ ...editForm, prefix: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="เลือกคำนำหน้า" />
                </SelectTrigger>
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
            </div>
            <div>
              <Label>ชื่อ <span className="text-destructive">*</span></Label>
              <Input
                value={editForm.first_name || ""}
                onChange={(e) => setEditForm({ ...editForm, first_name: e.target.value })}
              />
            </div>
            <div>
              <Label>นามสกุล <span className="text-destructive">*</span></Label>
              <Input
                value={editForm.last_name || ""}
                onChange={(e) => setEditForm({ ...editForm, last_name: e.target.value })}
              />
            </div>
            <div>
              <Label>ชื่อเล่น</Label>
              <Input
                value={editForm.nickname || ""}
                onChange={(e) => setEditForm({ ...editForm, nickname: e.target.value })}
              />
            </div>
            <div>
              <Label>เลขบัตรประชาชน</Label>
              <Input
                value={editForm.id_card || ""}
                onChange={(e) => setEditForm({ ...editForm, id_card: e.target.value })}
                maxLength={13}
                className="font-mono"
              />
            </div>
            <div>
              <Label>วันเกิด</Label>
              <DateInput
                max={format(new Date(), "yyyy-MM-dd")}
                value={editForm.date_of_birth || ""}
                onChange={(val) => setEditForm({ ...editForm, date_of_birth: val })}
              />
            </div>
            <div>
              <Label>เพศ <span className="text-destructive">*</span></Label>
              <Select
                value={editForm.gender || ""}
                onValueChange={(value) => setEditForm({ ...editForm, gender: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="เลือกเพศ" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="male">ชาย</SelectItem>
                  <SelectItem value="female">หญิง</SelectItem>
                  <SelectItem value="other">อื่นๆ</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>กรุ๊ปเลือด</Label>
              <Select
                value={editForm.blood_type || ""}
                onValueChange={(value) => setEditForm({ ...editForm, blood_type: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="เลือกกรุ๊ปเลือด" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="A">A</SelectItem>
                  <SelectItem value="B">B</SelectItem>
                  <SelectItem value="AB">AB</SelectItem>
                  <SelectItem value="O">O</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>อาชีพ</Label>
              <Input
                value={editForm.occupation || ""}
                onChange={(e) => setEditForm({ ...editForm, occupation: e.target.value })}
              />
            </div>
            <div>
              <Label>สถานภาพ</Label>
              <Select
                value={editForm.marital_status || ""}
                onValueChange={(value) => setEditForm({ ...editForm, marital_status: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="เลือกสถานภาพ" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="single">โสด</SelectItem>
                  <SelectItem value="married">สมรส</SelectItem>
                  <SelectItem value="divorced">หย่าร้าง</SelectItem>
                  <SelectItem value="widowed">หม้าย</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Address Fields */}
            <div className="col-span-2">
              <Label className="text-base font-semibold">ที่อยู่</Label>
            </div>
            <div>
              <Label>บ้านเลขที่ <span className="text-muted-foreground font-normal text-xs">(เช่น 123/45)</span></Label>
              <Input
                value={houseNumber}
                onChange={(e) => setHouseNumber(e.target.value)}
              />
            </div>
            <div>
              <Label>หมู่ที่ <span className="text-muted-foreground font-normal text-xs">(เช่น 5)</span></Label>
              <Input
                value={moo}
                onChange={(e) => setMoo(e.target.value)}
              />
            </div>
            <div className="col-span-2">
              <Label>ถนน/ซอย <span className="text-muted-foreground font-normal text-xs">(เช่น ถนนพหลโยธิน ซอยสุขใจ)</span></Label>
              <Input
                value={street}
                onChange={(e) => setStreet(e.target.value)}
              />
            </div>
            <div>
              <Label>จังหวัด</Label>
              <AddressSearchSelect
                value={province}
                onValueChange={handleProvinceChange}
                options={provinceNames || []}
                placeholder="เลือกจังหวัด"
                searchPlaceholder="พิมพ์ชื่อจังหวัด..."
                emptyMessage="ไม่พบจังหวัด"
              />
            </div>
            <div>
              <Label>อำเภอ/เขต</Label>
              <AddressSearchSelect
                value={district}
                onValueChange={handleDistrictChange}
                options={districtsList || []}
                placeholder="เลือกอำเภอ"
                searchPlaceholder="พิมพ์ชื่ออำเภอ..."
                emptyMessage="ไม่พบอำเภอ"
                disabled={!province}
              />
            </div>
            <div>
              <Label>ตำบล/แขวง</Label>
              <AddressSearchSelect
                value={subdistrict}
                onValueChange={handleSubdistrictChange}
                options={subdistrictsList?.map((s) => s.name) || []}
                placeholder="เลือกตำบล"
                searchPlaceholder="พิมพ์ชื่อตำบล..."
                emptyMessage="ไม่พบตำบล"
                disabled={!district}
              />
            </div>
            <div>
              <Label>รหัสไปรษณีย์</Label>
              <Input
                value={postalCode}
                onChange={(e) => setPostalCode(e.target.value)}
                placeholder="10900"
              />
            </div>

            {/* Contact Information */}
            <div className="col-span-2">
              <Label className="text-base font-semibold">ข้อมูลติดต่อ</Label>
            </div>
            <div>
              <Label>เบอร์โทรศัพท์</Label>
              <Input
                value={editForm.phone || ""}
                onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
              />
            </div>
            <div>
              <Label>อีเมล</Label>
              <Input
                value={editForm.email || ""}
                onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
              />
            </div>

            <div className="col-span-2 space-y-3">
              <div className="flex items-center space-x-3">
                <Checkbox
                  id="sameAddress"
                  checked={sameAddress}
                  onCheckedChange={(checked) => setSameAddress(checked === true)}
                />
                <Label htmlFor="sameAddress" className="font-normal cursor-pointer">
                  ที่อยู่ปัจจุบันเดียวกับที่อยู่ตามบัตรประชาชน
                </Label>
              </div>
              {!sameAddress && (
                <div>
                  <Label>ที่อยู่ติดต่อปัจจุบัน</Label>
                  <Textarea
                    value={currentAddress}
                    onChange={(e) => setCurrentAddress(e.target.value)}
                    placeholder="กรอกที่อยู่ติดต่อปัจจุบัน"
                    rows={3}
                  />
                </div>
              )}
            </div>

            {/* Emergency Contact */}
            <div className="col-span-2">
              <Label className="text-base font-semibold">ผู้ติดต่อฉุกเฉิน</Label>
            </div>
            <div>
              <Label>ชื่อผู้ติดต่อ</Label>
              <Input
                value={editForm.emergency_contact || ""}
                onChange={(e) => setEditForm({ ...editForm, emergency_contact: e.target.value })}
              />
            </div>
            <div>
              <Label>เบอร์โทรฉุกเฉิน</Label>
              <Input
                value={editForm.emergency_phone || ""}
                onChange={(e) => setEditForm({ ...editForm, emergency_phone: e.target.value })}
              />
            </div>


            <div className="col-span-2">
              <Label>หมายเหตุ</Label>
              <Textarea
                value={editForm.notes || ""}
                onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                rows={3}
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setIsEditing(false)}>
              <X className="w-4 h-4 mr-2" />
              ยกเลิก
            </Button>
            <Button onClick={handleSave} disabled={updatePatient.isPending}>
              {updatePatient.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              บันทึก
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
};

export default PatientProfile;
