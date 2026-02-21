import { useState, useEffect, useRef } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import {
  Upload,
  Search,
  Plus,
  FileText,
  Calendar,
  User,
  Clock,
  Edit,
  Eye,
  Loader2,
  Activity,
  Trash2,
  ShieldAlert,
  MapPin,
  Lock,
  Unlock,
  Paperclip,
} from "lucide-react";
import MainLayout from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent } from "@/components/ui/card";
import { DateInput } from "@/components/ui/date-input";
import {
  useTreatments,
  useCreateTreatment,
  useUpdateTreatment,
  useDeleteTreatmentCascade,
  Treatment,
} from "@/hooks/useTreatments";
import { useCreatePrescription } from "@/hooks/usePrescriptions";
import {
  useCreateAppointment,
  useUpdateAppointment,
  useAppointments,
  Appointment,
} from "@/hooks/useAppointments";
import { useQueryClient } from "@tanstack/react-query";

import { usePatients } from "@/hooks/usePatients";
import { useCreateBilling } from "@/hooks/useBillings";
import { useMedications } from "@/hooks/useMedications";
import { useAuth } from "@/contexts/AuthContext";
import { usePatientAllergies } from "@/hooks/useAllergies";
import { useProviders } from "@/hooks/useProviders";
import { toast } from "sonner";
import { format } from "date-fns";
import { th } from "date-fns/locale";
import VitalSignsForm, {
  VitalSignsData,
} from "@/components/treatments/VitalSignsForm";
import VitalSignsDisplay from "@/components/treatments/VitalSignsDisplay";
import MedicationSelector, {
  MedicationItem,
  AllergyInfo,
} from "@/components/treatments/MedicationSelector";
import PrescriptionDisplay from "@/components/treatments/PrescriptionDisplay";
import ServiceSelector, {
  ServiceItem,
} from "@/components/treatments/ServiceSelector";
import DateTimeSlotPicker from "@/components/appointments/DateTimeSlotPicker";
import { useAllProviderSchedules } from "@/hooks/useProviderSchedules";
import { useServices } from "@/hooks/useServices";
import { useServiceLocations } from "@/hooks/useServiceLocations";
import { useGoogleCalendar } from "@/hooks/useGoogleCalendar";
import { sendAppointmentEmail } from "@/utils/appointmentEmail";
import TreatmentFiles from "@/components/treatments/TreatmentFiles";
import { useTreatmentFileCounts } from "@/hooks/useTreatmentFileCounts";

const typeLabels: Record<string, string> = {
  consultation: "ปรึกษา/บำบัด",
  assessment: "ตรวจประเมิน",
  follow_up: "ติดตามอาการ",
  diagnosis: "ตรวจวินิจฉัย",
};

const typeColors: Record<string, string> = {
  consultation: "bg-info/10 text-info border-info/20",
  therapy: "bg-secondary text-secondary-foreground border-secondary",
  follow_up: "bg-success/10 text-success border-success/20",
};

const Treatments = () => {
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();
  const { data: providers = [] } = useProviders();
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [isNewRecordOpen, setIsNewRecordOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<Treatment | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingRecord, setEditingRecord] = useState<Treatment | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Treatment | null>(null);
  const [deletePassword, setDeletePassword] = useState("");
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const newRecordFileInputRef = useRef<HTMLInputElement>(null);
  const [isDraggingNewRecord, setIsDraggingNewRecord] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    patient_id: "",
    treatment_date: new Date().toISOString().split("T")[0],
    symptoms: "",
    diagnosis: "",
    diagnosis_code: "",
    treatment_plan: "",
    clinical_notes: "",
    follow_up_date: "",
    procedures: "",
    follow_up_notes: "",
  });

  // Service items state
  const [serviceItems, setServiceItems] = useState<ServiceItem[]>([]);

  // Vital signs state
  const [vitalSigns, setVitalSigns] = useState<VitalSignsData>({
    pulse: null,
    systolic: null,
    diastolic: null,
    weight: null,
    height: null,
    temperature: null,
    oxygen_saturation: null,
  });

  // Medication items state
  const [medicationItems, setMedicationItems] = useState<MedicationItem[]>([]);
  const [existingBillingMedItems, setExistingBillingMedItems] = useState<
    {
      description: string;
      quantity: number;
      unit_price: number;
      total: number;
    }[]
  >([]);
  const [selectedProvider, setSelectedProvider] = useState<string>("");
  const [linkedAppointmentId, setLinkedAppointmentId] = useState<string | null>(
    null,
  );
  const [linkedAppointmentData, setLinkedAppointmentData] =
    useState<Appointment | null>(null);
  const [appointmentEditUnlocked, setAppointmentEditUnlocked] = useState(false);
  const [editAppointmentDate, setEditAppointmentDate] = useState("");
  const [editAppointmentTime, setEditAppointmentTime] = useState("");
  const [editAppointmentType, setEditAppointmentType] = useState("");
  const [editAppointmentProvider, setEditAppointmentProvider] = useState("");
  const [editAppointmentChiefComplaint, setEditAppointmentChiefComplaint] =
    useState("");
  const [editAppointmentLocationId, setEditAppointmentLocationId] =
    useState("");
  const [editAppointmentNotes, setEditAppointmentNotes] = useState("");

  // Follow-up appointment fields
  const [existingFollowUpAppointment, setExistingFollowUpAppointment] =
    useState<Appointment | null>(null);
  const [showFollowUp, setShowFollowUp] = useState(false);
  const [followUpType, setFollowUpType] = useState("follow_up");
  const [followUpProvider, setFollowUpProvider] = useState("");
  const [followUpTime, setFollowUpTime] = useState("");
  const [followUpChiefComplaint, setFollowUpChiefComplaint] = useState("");
  const [followUpServices, setFollowUpServices] = useState<ServiceItem[]>([]);
  const [followUpLocationId, setFollowUpLocationId] = useState("");

  // Set default followUpProvider to current user when user loads
  useEffect(() => {
    if (user?.id && !followUpProvider) {
      setFollowUpProvider(user.id);
    }
  }, [user?.id]);

  const { data: treatments = [], isLoading } = useTreatments(
    searchQuery,
    typeFilter,
  );
  const { data: treatmentFileCounts = {} } = useTreatmentFileCounts(
    treatments.map((t) => t.id),
  );
  const { data: patients = [] } = usePatients();
  const { data: allMedications = [] } = useMedications();
  const { data: providerSchedules = [] } = useAllProviderSchedules();
  const { data: allAppointments = [] } = useAppointments();
  const { data: allServices = [] } = useServices(false);
  const { data: serviceLocations = [] } = useServiceLocations(false);
  const googleCalendar = useGoogleCalendar();
  const queryClient = useQueryClient();
  const createTreatment = useCreateTreatment();
  const updateTreatment = useUpdateTreatment();
  const createBilling = useCreateBilling();
  const deleteTreatmentCascade = useDeleteTreatmentCascade();
  const updateAppointment = useUpdateAppointment();

  // Fetch patient allergies for the selected patient
  const selectedPatientId = isEditMode
    ? editingRecord?.patient_id
    : formData.patient_id;
  const { data: patientAllergiesData = [] } = usePatientAllergies(
    selectedPatientId || "",
  );
  const patientAllergies: AllergyInfo[] = patientAllergiesData.map((a) => ({
    allergen: a.allergen,
    severity: a.severity,
    reaction: a.reaction,
  }));
  useEffect(() => {
    const patientId = searchParams.get("patient_id");
    const action = searchParams.get("action");
    const appointmentId = searchParams.get("appointment_id");
    const treatmentId = searchParams.get("treatment_id");

    if (
      treatmentId &&
      action === "edit" &&
      treatments &&
      treatments.length > 0
    ) {
      const found = treatments.find((t) => t.id === treatmentId);
      if (found) {
        setSearchParams({}, { replace: true });
        handleOpenEdit(found);
      }
    } else if (patientId && action === "new" && patients.length > 0) {
      const found = patients.find((p) => p.id === patientId);
      if (found) {
        setFormData((prev) => ({ ...prev, patient_id: patientId }));
        if (appointmentId) {
          setLinkedAppointmentId(appointmentId);
          const apt = allAppointments.find((a) => a.id === appointmentId);
          if (apt?.provider_id) {
            setSelectedProvider(apt.provider_id);
          } else {
            setSelectedProvider(user?.id || "");
          }
        } else {
          setSelectedProvider(user?.id || "");
        }
        setIsNewRecordOpen(true);
        setSearchParams({}, { replace: true });
      }
    }
  }, [searchParams, patients, allAppointments, treatments]);

  const createPrescription = useCreatePrescription();
  const createAppointment = useCreateAppointment();

  const resetForm = () => {
    setFormData({
      patient_id: "",
      treatment_date: new Date().toISOString().split("T")[0],
      symptoms: "",
      diagnosis: "",
      diagnosis_code: "",
      treatment_plan: "",
      clinical_notes: "",
      follow_up_date: "",
      procedures: "",
      follow_up_notes: "",
    });
    setVitalSigns({
      pulse: null,
      systolic: null,
      diastolic: null,
      weight: null,
      height: null,
      temperature: null,
      oxygen_saturation: null,
    });
    setMedicationItems([]);
    setServiceItems([]);
    setExistingBillingMedItems([]);
    setSelectedProvider("");
    setLinkedAppointmentId(null);
    setLinkedAppointmentData(null);
    setPendingFiles([]);
    setIsDraggingNewRecord(false);
    setAppointmentEditUnlocked(false);
    setEditAppointmentDate("");
    setEditAppointmentTime("");
    setEditAppointmentType("");
    setEditAppointmentProvider("");
    setEditAppointmentChiefComplaint("");
    setEditAppointmentLocationId("");
    setEditAppointmentNotes("");
    setExistingFollowUpAppointment(null);
    setShowFollowUp(false);
    setFollowUpType("follow_up");
    setFollowUpProvider(user?.id || "");
    setFollowUpTime("");
    setFollowUpChiefComplaint("");
    setFollowUpServices([]);
    setFollowUpLocationId("");
  };

  const createAutoBilling = async (
    patientId: string,
    treatmentId: string,
    selectedServices: ServiceItem[],
    selectedMedications: MedicationItem[],
  ) => {
    const billingItems: {
      description: string;
      item_type: string;
      quantity: number;
      unit_price: number;
      total: number;
    }[] = [];

    // Add service fees
    for (const svc of selectedServices) {
      if (svc.service_id && svc.unit_price > 0) {
        billingItems.push({
          description: svc.service_name,
          item_type: "treatment",
          quantity: svc.quantity,
          unit_price: svc.unit_price,
          total: svc.quantity * svc.unit_price,
        });
      }
    }

    // Add medication costs
    for (const item of selectedMedications) {
      const med = allMedications.find((m) => m.id === item.medication_id);
      const unitPrice = med?.price || 0;
      const total = unitPrice * item.quantity;
      if (total > 0) {
        billingItems.push({
          description: `ยา: ${item.medication_name}`,
          item_type: "medication",
          quantity: item.quantity,
          unit_price: unitPrice,
          total,
        });
      }
    }

    if (billingItems.length === 0) return;

    const subtotal = billingItems.reduce((sum, item) => sum + item.total, 0);

    await createBilling.mutateAsync({
      billing: {
        patient_id: patientId,
        treatment_id: treatmentId,
        subtotal,
        total: subtotal,
        payment_status: "pending",
      },
      items: billingItems,
    });
  };

  const handleOpenEdit = async (record: Treatment, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
    }
    setEditingRecord(record);

    let existingServiceItems: ServiceItem[] = [];
    let existingMedBillingItems: {
      description: string;
      quantity: number;
      unit_price: number;
      total: number;
    }[] = [];
    let loadedMedicationItems: MedicationItem[] = [];
    try {
      // Check if prescription exists and load its items
      const { data: prescriptionData } = await supabase
        .from("prescriptions")
        .select("id, status, prescription_items (*)")
        .eq("treatment_id", record.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      const isCancelled = prescriptionData?.status === "cancelled";

      // Load existing prescription items into medication selector (unless cancelled)
      if (
        prescriptionData &&
        !isCancelled &&
        prescriptionData.prescription_items
      ) {
        loadedMedicationItems = prescriptionData.prescription_items.map(
          (item: any) => ({
            medication_id: item.medication_id || "",
            medication_name: item.medication_name,
            dosage: item.dosage,
            frequency: item.frequency,
            duration: item.duration || "",
            quantity: item.quantity,
            instructions: item.instructions || "",
          }),
        );
      }

      const { data: billingData } = await supabase
        .from("billings")
        .select("id")
        .eq("treatment_id", record.id)
        .limit(1)
        .maybeSingle();

      // Fetch services list to match by name
      const { data: servicesData } = await supabase
        .from("services")
        .select("id, name")
        .eq("is_active", true);
      const servicesList = servicesData || [];

      if (billingData) {
        const { data: items } = await supabase
          .from("billing_items")
          .select("description, item_type, quantity, unit_price, total")
          .eq("billing_id", billingData.id);

        if (items) {
          existingServiceItems = items
            .filter((i) => i.item_type === "treatment")
            .map((i) => {
              const matched = servicesList.find(
                (s) => s.name === i.description,
              );
              return {
                service_id: matched?.id || "",
                service_name: i.description,
                quantity: i.quantity,
                unit_price: i.unit_price,
              };
            });
          // Exclude medication items if prescription is cancelled
          if (!isCancelled) {
            existingMedBillingItems = items
              .filter((i) => i.item_type === "medication")
              .map((i) => ({
                description: i.description,
                quantity: i.quantity,
                unit_price: i.unit_price,
                total: i.total,
              }));
          }
        }
      }
    } catch {
      // ignore fetch error
    }
    // If we loaded medications from prescription, they are the source of truth
    // Don't show existing billing med items separately to avoid duplication
    if (loadedMedicationItems.length > 0) {
      setExistingBillingMedItems([]);
    } else {
      setExistingBillingMedItems(existingMedBillingItems);
    }
    setMedicationItems(loadedMedicationItems);
    setServiceItems(existingServiceItems);

    setFormData({
      patient_id: record.patient_id,
      treatment_date:
        record.treatment_date || new Date().toISOString().split("T")[0],
      symptoms: record.symptoms || "",
      diagnosis: record.diagnosis || "",
      diagnosis_code: record.diagnosis_code || "",
      treatment_plan: record.treatment_plan || "",
      clinical_notes: record.clinical_notes || "",
      follow_up_date: record.follow_up_date || "",
      procedures: record.procedures || "",
      follow_up_notes: record.follow_up_notes || "",
    });
    const recordVitalSigns = record.vital_signs as VitalSignsData | null;
    setVitalSigns({
      pulse: recordVitalSigns?.pulse ?? null,
      systolic: recordVitalSigns?.systolic ?? null,
      diastolic: recordVitalSigns?.diastolic ?? null,
      weight: recordVitalSigns?.weight ?? null,
      height: recordVitalSigns?.height ?? null,
      temperature: recordVitalSigns?.temperature ?? null,
      oxygen_saturation: recordVitalSigns?.oxygen_saturation ?? null,
    });
    setSelectedProvider(record.provider_id || "");
    setShowFollowUp(!!record.follow_up_date);

    // Fetch linked appointment data if exists
    if (record.appointment_id) {
      setLinkedAppointmentId(record.appointment_id);
      try {
        const { data: aptData } = await supabase
          .from("appointments")
          .select(
            `*, patients (id, hn, first_name, last_name, phone, id_card), service_locations (id, name, address)`,
          )
          .eq("id", record.appointment_id)
          .maybeSingle();
        if (aptData) {
          let providerProfile = null;
          if (aptData.provider_id) {
            const { data: profileData } = await supabase
              .from("profiles")
              .select("full_name")
              .eq("user_id", aptData.provider_id)
              .maybeSingle();
            providerProfile = profileData;
          }
          const enrichedApt = {
            ...aptData,
            provider_profile: providerProfile,
          } as Appointment;
          setLinkedAppointmentData(enrichedApt);
          setEditAppointmentDate(aptData.appointment_date || "");
          setEditAppointmentTime(aptData.start_time || "");
          setEditAppointmentType(aptData.appointment_type || "");
          setEditAppointmentProvider(aptData.provider_id || "");
          setEditAppointmentChiefComplaint(aptData.chief_complaint || "");
          setEditAppointmentLocationId(aptData.location_id || "");
          setEditAppointmentNotes(aptData.notes || "");
        }
      } catch {
        // ignore
      }
    } else {
      setLinkedAppointmentData(null);
      setLinkedAppointmentId(null);
    }
    setAppointmentEditUnlocked(false);

    // Fetch existing follow-up appointment if follow_up_date exists
    if (record.follow_up_date) {
      try {
        const { data: followUpApts } = await supabase
          .from("appointments")
          .select(
            `*, patients (id, hn, first_name, last_name, phone, id_card), service_locations (id, name, address)`,
          )
          .eq("patient_id", record.patient_id)
          .eq("appointment_date", record.follow_up_date)
          .order("created_at", { ascending: false })
          .limit(1);
        if (followUpApts && followUpApts.length > 0) {
          const fuApt = followUpApts[0];
          let providerProfile = null;
          if (fuApt.provider_id) {
            const { data: profileData } = await supabase
              .from("profiles")
              .select("full_name")
              .eq("user_id", fuApt.provider_id)
              .maybeSingle();
            providerProfile = profileData;
          }
          setExistingFollowUpAppointment({
            ...fuApt,
            provider_profile: providerProfile,
          } as Appointment);
        } else {
          setExistingFollowUpAppointment(null);
        }
      } catch {
        setExistingFollowUpAppointment(null);
      }
    } else {
      setExistingFollowUpAppointment(null);
    }

    setIsEditMode(true);
  };

  const handleCloseEdit = () => {
    setIsEditMode(false);
    setEditingRecord(null);
    resetForm();
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget || !user?.email) return;
    setDeleteLoading(true);
    try {
      // Re-authenticate admin with password
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: deletePassword,
      });
      if (authError) {
        toast.error("รหัสผ่านไม่ถูกต้อง กรุณาลองใหม่");
        setDeleteLoading(false);
        return;
      }
      await deleteTreatmentCascade.mutateAsync(deleteTarget.id);
      toast.success("ลบบันทึกการรักษาและข้อมูลที่เกี่ยวข้องสำเร็จ");
      setDeleteTarget(null);
      setDeletePassword("");
      setSelectedRecord(null);
    } catch (error: any) {
      toast.error(error?.message || "เกิดข้อผิดพลาดในการลบ");
    } finally {
      setDeleteLoading(false);
    }
  };

  const getPatientInitials = (treatment: Treatment) => {
    if (!treatment.patients) return "?";
    const first = treatment.patients.first_name?.[0] || "";
    const last = treatment.patients.last_name?.[0] || "";
    return `${first}${last}`;
  };

  const getPatientName = (treatment: Treatment) => {
    if (!treatment.patients) return "ไม่ระบุ";
    const prefix = treatment.patients.prefix || "";
    return `${prefix}${treatment.patients.first_name} ${treatment.patients.last_name}`;
  };

  const formatDate = (dateStr: string) => {
    try {
      return format(new Date(dateStr), "d MMM yyyy", { locale: th });
    } catch {
      return dateStr;
    }
  };

  const formatTime = (dateStr: string) => {
    try {
      return format(new Date(dateStr), "HH:mm");
    } catch {
      return "";
    }
  };

  const handleSubmit = async () => {
    if (!formData.patient_id) {
      toast.error("กรุณาเลือกผู้ป่วย");
      return;
    }

    // Filter out null values from vital signs
    const cleanedVitalSigns = Object.fromEntries(
      Object.entries(vitalSigns).filter(
        ([_, v]) => v !== null && v !== undefined,
      ),
    );

    try {
      const treatmentData = await createTreatment.mutateAsync({
        patient_id: formData.patient_id,
        treatment_date:
          formData.treatment_date || new Date().toISOString().split("T")[0],
        symptoms: formData.symptoms || null,
        diagnosis: formData.diagnosis || null,
        diagnosis_code: formData.diagnosis_code || null,
        treatment_plan: formData.treatment_plan || null,
        clinical_notes: formData.clinical_notes || null,
        follow_up_date: formData.follow_up_date || null,
        procedures: formData.procedures || null,
        follow_up_notes: formData.follow_up_notes || null,
        provider_id:
          selectedProvider && selectedProvider !== "none"
            ? selectedProvider
            : user?.id || null,
        vital_signs:
          Object.keys(cleanedVitalSigns).length > 0 ? cleanedVitalSigns : null,
        appointment_id: linkedAppointmentId || null,
      });

      // Upload pending files if any
      if (pendingFiles.length > 0) {
        try {
          const {
            data: { user: currentUser },
          } = await supabase.auth.getUser();
          for (const file of pendingFiles) {
            const fileExt = file.name.split(".").pop();
            const fileName = `${formData.patient_id}/${treatmentData.id}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
            const { data: uploadData, error: uploadError } =
              await supabase.storage
                .from("treatment-files")
                .upload(fileName, file);
            if (uploadError) throw uploadError;
            const { data: urlData } = supabase.storage
              .from("treatment-files")
              .getPublicUrl(uploadData.path);
            await supabase.from("treatment_files").insert({
              treatment_id: treatmentData.id,
              patient_id: formData.patient_id,
              file_name: file.name,
              file_url: urlData.publicUrl,
              file_type: file.type,
              file_size: file.size,
              uploaded_by: currentUser?.id || null,
            });
          }
          queryClient.invalidateQueries({ queryKey: ["treatment-files"] });
        } catch {
          toast.warning("บันทึกการรักษาสำเร็จ แต่อัปโหลดไฟล์ไม่สำเร็จ");
        }
      }

      // Auto-create prescription if medications were selected
      const validMedications = medicationItems.filter(
        (item) => item.medication_id && item.medication_name,
      );
      if (validMedications.length > 0) {
        try {
          await createPrescription.mutateAsync({
            prescription: {
              patient_id: formData.patient_id,
              treatment_id: treatmentData.id,
              provider_id: user?.id || null,
              status: "pending",
              notes: formData.diagnosis
                ? `จากการวินิจฉัย: ${formData.diagnosis}`
                : null,
            },
            items: validMedications.map((item) => ({
              medication_id: item.medication_id,
              medication_name: item.medication_name,
              dosage: item.dosage || "-",
              frequency: item.frequency,
              duration: item.duration || null,
              quantity: item.quantity,
              instructions: item.instructions || null,
            })),
          });
          // success toast handled below
        } catch {
          toast.warning("บันทึกการรักษาสำเร็จ แต่สร้างใบสั่งยาไม่สำเร็จ");
        }
      }

      // Auto-create follow-up appointment if follow_up_date is set
      if (formData.follow_up_date) {
        // Validation: require time and provider (match Main Appointment behavior)
        const aptProviderId =
          followUpProvider && followUpProvider !== "none"
            ? followUpProvider
            : null;
        if (!followUpTime || !aptProviderId) {
          if (!followUpTime) toast.warning("กรุณาเลือกเวลานัดหมาย Follow-Up");
          if (!aptProviderId)
            toast.warning("กรุณาเลือกผู้รักษาสำหรับ Follow-Up");
        } else {
          try {
            // Calculate end_time: null if no services (match Main Appointment)
            const totalDuration = followUpServices.reduce(
              (sum, s) => sum + (s.duration_minutes || 0) * s.quantity,
              0,
            );
            let calculatedEndTime: string | null = null;
            if (followUpTime && totalDuration > 0) {
              const [h, m] = followUpTime.split(":").map(Number);
              const totalMin = h * 60 + m + totalDuration;
              const endH = Math.floor(totalMin / 60) % 24;
              const endM = totalMin % 60;
              calculatedEndTime = `${endH.toString().padStart(2, "0")}:${endM.toString().padStart(2, "0")}`;
            }

            const aptLocationId =
              followUpLocationId && followUpLocationId !== "none"
                ? followUpLocationId
                : null;
            const newApt = await createAppointment.mutateAsync({
              patient_id: formData.patient_id,
              appointment_date: formData.follow_up_date,
              start_time: followUpTime,
              end_time: calculatedEndTime,
              appointment_type: followUpType || "follow_up",
              chief_complaint: followUpChiefComplaint || null,
              notes: formData.follow_up_notes || null,
              provider_id: aptProviderId,
              location_id: aptLocationId,
            });

            // Billing for follow-up appointment services
            const validFollowUpServices = followUpServices.filter(
              (s) => s.service_id && s.unit_price > 0,
            );
            if (validFollowUpServices.length > 0) {
              const billingItems = validFollowUpServices.map((s) => ({
                description: s.service_name,
                item_type: "treatment",
                quantity: s.quantity,
                unit_price: s.unit_price,
                total: s.quantity * s.unit_price,
              }));
              const subtotal = billingItems.reduce(
                (sum, item) => sum + item.total,
                0,
              );
              await createBilling.mutateAsync({
                billing: {
                  patient_id: formData.patient_id,
                  appointment_id: newApt.id,
                  subtotal,
                  total: subtotal,
                  payment_status: "pending",
                },
                items: billingItems,
              });
            }

            // Sync to Google Calendar + track google_event_id
            const aptLocation = aptLocationId
              ? serviceLocations.find((l) => l.id === aptLocationId)
              : null;
            const aptPatient = patients.find(
              (p) => p.id === formData.patient_id,
            );
            if (aptProviderId) {
              const eventId = await googleCalendar.syncToGoogle(
                newApt.id,
                {
                  appointment_date: formData.follow_up_date,
                  start_time: followUpTime,
                  end_time: calculatedEndTime,
                  appointment_type: followUpType || "follow_up",
                  chief_complaint: followUpChiefComplaint || null,
                  patient_name: aptPatient
                    ? `${aptPatient.first_name} ${aptPatient.last_name}`
                    : undefined,
                  patient_hn: aptPatient?.hn,
                  location_name: aptLocation?.name || null,
                },
                aptProviderId,
              );
              if (eventId) {
                await supabase
                  .from("appointments")
                  .update({ google_event_id: eventId })
                  .eq("id", newApt.id);
              }
            }

            // Auto-create Google Meet for online services (silent, no banner)
            const hasOnlineService = followUpServices.some((s) => {
              const svc = allServices.find((as) => as.id === s.service_id);
              return svc?.service_mode === "online";
            });
            if (hasOnlineService) {
              const providerProfile = providers.find(
                (p) => p.user_id === aptProviderId,
              );
              const meetLink = await googleCalendar.createMeet(
                newApt.id,
                {
                  appointment_date: formData.follow_up_date,
                  start_time: followUpTime,
                  end_time: calculatedEndTime,
                  patient_name: aptPatient
                    ? `${aptPatient.first_name} ${aptPatient.last_name}`
                    : undefined,
                  patient_hn: aptPatient?.hn,
                  patient_email: aptPatient?.email || undefined,
                  provider_name: providerProfile?.full_name,
                  service_name: followUpServices
                    .map((s) => s.service_name)
                    .join(", "),
                },
                aptProviderId,
              );
              if (meetLink) {
                await supabase
                  .from("appointments")
                  .update({ meet_link: meetLink })
                  .eq("id", newApt.id);
                queryClient.invalidateQueries({ queryKey: ["appointments"] });
              }
            }

            // Send email AFTER meet link is created so it's included
            sendAppointmentEmail(newApt.id, "created");
          } catch {
            toast.warning("บันทึกการรักษาสำเร็จ แต่สร้างนัดหมายไม่สำเร็จ");
          }
        }
      }

      // Auto-create billing record
      const validMedsForBilling =
        validMedications.length > 0 ? validMedications : [];
      const validServices = serviceItems.filter(
        (s) => s.service_id && s.unit_price > 0,
      );
      if (validServices.length > 0 || validMedsForBilling.length > 0) {
        try {
          await createAutoBilling(
            formData.patient_id,
            treatmentData.id,
            validServices,
            validMedsForBilling,
          );
        } catch {
          toast.warning(
            "บันทึกการรักษาสำเร็จ แต่สร้างใบเสร็จอัตโนมัติไม่สำเร็จ",
          );
        }
      }

      const hasRx = validMedications.length > 0;
      const hasAppt = !!formData.follow_up_date;
      const hasBilling =
        validServices.length > 0 || validMedsForBilling.length > 0;
      if (!hasRx && !hasAppt && !hasBilling) {
        toast.success("บันทึกการรักษาสำเร็จ");
      } else {
        const parts = ["บันทึกการรักษา"];
        if (hasRx) parts.push("ใบสั่งยา");
        if (hasBilling) parts.push("ใบเสร็จ");
        if (hasAppt) parts.push("นัดหมาย");
        toast.success(`${parts.join(", ")} สำเร็จ`);
      }

      setIsNewRecordOpen(false);
      resetForm();
    } catch (error) {
      toast.error("เกิดข้อผิดพลาดในการบันทึก");
    }
  };

  const handleUpdate = async () => {
    if (!editingRecord) return;

    // Filter out null values from vital signs
    const cleanedVitalSigns = Object.fromEntries(
      Object.entries(vitalSigns).filter(
        ([_, v]) => v !== null && v !== undefined,
      ),
    );

    try {
      // 1. Update treatment record
      await updateTreatment.mutateAsync({
        id: editingRecord.id,
        treatment_date: formData.treatment_date || undefined,
        symptoms: formData.symptoms || null,
        diagnosis: formData.diagnosis || null,
        diagnosis_code: formData.diagnosis_code || null,
        treatment_plan: formData.treatment_plan || null,
        clinical_notes: formData.clinical_notes || null,
        follow_up_date: formData.follow_up_date || null,
        procedures: formData.procedures || null,
        follow_up_notes: formData.follow_up_notes || null,
        vital_signs:
          Object.keys(cleanedVitalSigns).length > 0 ? cleanedVitalSigns : null,
        provider_id:
          selectedProvider && selectedProvider !== "none"
            ? selectedProvider
            : editingRecord.provider_id,
      });

      // 1.5. Update linked appointment if unlocked and changed
      if (appointmentEditUnlocked && linkedAppointmentData) {
        try {
          const aptProviderId =
            editAppointmentProvider && editAppointmentProvider !== "none"
              ? editAppointmentProvider
              : null;
          await updateAppointment.mutateAsync({
            id: linkedAppointmentData.id,
            input: {
              appointment_date:
                editAppointmentDate || linkedAppointmentData.appointment_date,
              start_time:
                editAppointmentTime || linkedAppointmentData.start_time,
              appointment_type: editAppointmentType || undefined,
              provider_id: aptProviderId,
              chief_complaint: editAppointmentChiefComplaint || null,
              location_id:
                editAppointmentLocationId &&
                editAppointmentLocationId !== "none"
                  ? editAppointmentLocationId
                  : null,
              notes: editAppointmentNotes || null,
            },
          });
        } catch {
          toast.warning("แก้ไขการรักษาสำเร็จ แต่อัปเดตนัดหมายไม่สำเร็จ");
        }
      }

      // 2. Update or create prescription at the same treatment ID
      const validMedications = medicationItems.filter(
        (item) => item.medication_id && item.medication_name,
      );
      if (validMedications.length > 0) {
        try {
          // Check if a prescription already exists for this treatment
          const { data: existingRx } = await supabase
            .from("prescriptions")
            .select("id, status")
            .eq("treatment_id", editingRecord.id)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();

          if (existingRx) {
            // Update existing prescription
            await supabase
              .from("prescriptions")
              .update({
                provider_id: user?.id || null,
                notes: formData.diagnosis
                  ? `จากการวินิจฉัย: ${formData.diagnosis}`
                  : null,
              })
              .eq("id", existingRx.id);

            // Delete old prescription items and re-insert new ones
            await supabase
              .from("prescription_items")
              .delete()
              .eq("prescription_id", existingRx.id);

            await supabase.from("prescription_items").insert(
              validMedications.map((item) => ({
                prescription_id: existingRx.id,
                medication_id: item.medication_id,
                medication_name: item.medication_name,
                dosage: item.dosage || "-",
                frequency: item.frequency,
                duration: item.duration || null,
                quantity: item.quantity,
                instructions: item.instructions || null,
              })),
            );
          } else {
            // No existing prescription — create new one
            await createPrescription.mutateAsync({
              prescription: {
                patient_id: editingRecord.patient_id,
                treatment_id: editingRecord.id,
                provider_id: user?.id || null,
                status: "pending",
                notes: formData.diagnosis
                  ? `จากการวินิจฉัย: ${formData.diagnosis}`
                  : null,
              },
              items: validMedications.map((item) => ({
                medication_id: item.medication_id,
                medication_name: item.medication_name,
                dosage: item.dosage || "-",
                frequency: item.frequency,
                duration: item.duration || null,
                quantity: item.quantity,
                instructions: item.instructions || null,
              })),
            });
          }
        } catch {
          toast.warning("แก้ไขการรักษาสำเร็จ แต่อัปเดตใบสั่งยาไม่สำเร็จ");
        }
      }

      // 3. Update or create billing at the same treatment ID
      const validMedsForBilling =
        validMedications.length > 0 ? validMedications : [];
      const validServices = serviceItems.filter(
        (s) => (s.service_id || s.service_name) && s.unit_price > 0,
      );
      if (validServices.length > 0 || validMedsForBilling.length > 0) {
        try {
          // Build billing items
          const billingItems: {
            description: string;
            item_type: string;
            quantity: number;
            unit_price: number;
            total: number;
          }[] = [];

          for (const svc of validServices) {
            billingItems.push({
              description: svc.service_name,
              item_type: "treatment",
              quantity: svc.quantity,
              unit_price: svc.unit_price,
              total: svc.quantity * svc.unit_price,
            });
          }

          for (const item of validMedsForBilling) {
            const med = allMedications.find((m) => m.id === item.medication_id);
            const unitPrice = med?.price || 0;
            const total = unitPrice * item.quantity;
            if (total > 0) {
              billingItems.push({
                description: `ยา: ${item.medication_name}`,
                item_type: "medication",
                quantity: item.quantity,
                unit_price: unitPrice,
                total,
              });
            }
          }

          const subtotal = billingItems.reduce(
            (sum, item) => sum + item.total,
            0,
          );

          // Check if billing already exists for this treatment
          const { data: existingBilling } = await supabase
            .from("billings")
            .select("id")
            .eq("treatment_id", editingRecord.id)
            .limit(1)
            .maybeSingle();

          if (existingBilling) {
            // Update existing billing totals
            await supabase
              .from("billings")
              .update({ subtotal, total: subtotal })
              .eq("id", existingBilling.id);

            // Delete old billing items and re-insert
            await supabase
              .from("billing_items")
              .delete()
              .eq("billing_id", existingBilling.id);

            if (billingItems.length > 0) {
              await supabase.from("billing_items").insert(
                billingItems.map((item) => ({
                  ...item,
                  billing_id: existingBilling.id,
                })),
              );
            }
          } else if (billingItems.length > 0) {
            // No existing billing — create new one
            await createAutoBilling(
              editingRecord.patient_id,
              editingRecord.id,
              validServices,
              validMedsForBilling,
            );
          }
        } catch {
          toast.warning("แก้ไขการรักษาสำเร็จ แต่อัปเดตใบเสร็จไม่สำเร็จ");
        }
      }

      // 4. Auto-create follow-up appointment if follow_up_date is set
      if (formData.follow_up_date) {
        // Validation: require time and provider (match Main Appointment behavior)
        const aptProviderId =
          followUpProvider && followUpProvider !== "none"
            ? followUpProvider
            : null;
        if (!followUpTime || !aptProviderId) {
          if (!followUpTime) toast.warning("กรุณาเลือกเวลานัดหมาย Follow-Up");
          if (!aptProviderId)
            toast.warning("กรุณาเลือกผู้รักษาสำหรับ Follow-Up");
        } else {
          try {
            // Calculate end_time: null if no services (match Main Appointment)
            const totalDuration = followUpServices.reduce(
              (sum, s) => sum + (s.duration_minutes || 0) * s.quantity,
              0,
            );
            let calculatedEndTime: string | null = null;
            if (followUpTime && totalDuration > 0) {
              const [h, m] = followUpTime.split(":").map(Number);
              const totalMin = h * 60 + m + totalDuration;
              const endH = Math.floor(totalMin / 60) % 24;
              const endM = totalMin % 60;
              calculatedEndTime = `${endH.toString().padStart(2, "0")}:${endM.toString().padStart(2, "0")}`;
            }

            const aptLocationId =
              followUpLocationId && followUpLocationId !== "none"
                ? followUpLocationId
                : null;
            const newApt = await createAppointment.mutateAsync({
              patient_id: editingRecord.patient_id,
              appointment_date: formData.follow_up_date,
              start_time: followUpTime,
              end_time: calculatedEndTime,
              appointment_type: followUpType || "follow_up",
              chief_complaint: followUpChiefComplaint || null,
              notes: formData.follow_up_notes || null,
              provider_id: aptProviderId,
              location_id: aptLocationId,
            });

            // Billing for follow-up appointment services
            const validFollowUpServices = followUpServices.filter(
              (s) => s.service_id && s.unit_price > 0,
            );
            if (validFollowUpServices.length > 0) {
              const billingItems = validFollowUpServices.map((s) => ({
                description: s.service_name,
                item_type: "treatment",
                quantity: s.quantity,
                unit_price: s.unit_price,
                total: s.quantity * s.unit_price,
              }));
              const subtotal = billingItems.reduce(
                (sum, item) => sum + item.total,
                0,
              );
              await createBilling.mutateAsync({
                billing: {
                  patient_id: editingRecord.patient_id,
                  appointment_id: newApt.id,
                  subtotal,
                  total: subtotal,
                  payment_status: "pending",
                },
                items: billingItems,
              });
            }

            // Sync to Google Calendar + track google_event_id
            const aptLocation = aptLocationId
              ? serviceLocations.find((l) => l.id === aptLocationId)
              : null;
            const aptPatient = patients.find(
              (p) => p.id === editingRecord.patient_id,
            );
            if (aptProviderId) {
              const eventId = await googleCalendar.syncToGoogle(
                newApt.id,
                {
                  appointment_date: formData.follow_up_date,
                  start_time: followUpTime,
                  end_time: calculatedEndTime,
                  appointment_type: followUpType || "follow_up",
                  chief_complaint: followUpChiefComplaint || null,
                  patient_name: aptPatient
                    ? `${aptPatient.first_name} ${aptPatient.last_name}`
                    : undefined,
                  patient_hn: aptPatient?.hn,
                  location_name: aptLocation?.name || null,
                },
                aptProviderId,
              );
              if (eventId) {
                await supabase
                  .from("appointments")
                  .update({ google_event_id: eventId })
                  .eq("id", newApt.id);
              }
            }

            // Auto-create Google Meet for online services (silent, no banner)
            const hasOnlineService = followUpServices.some((s) => {
              const svc = allServices.find((as) => as.id === s.service_id);
              return svc?.service_mode === "online";
            });
            if (hasOnlineService) {
              const providerProfile = providers.find(
                (p) => p.user_id === aptProviderId,
              );
              const meetLink = await googleCalendar.createMeet(
                newApt.id,
                {
                  appointment_date: formData.follow_up_date,
                  start_time: followUpTime,
                  end_time: calculatedEndTime,
                  patient_name: aptPatient
                    ? `${aptPatient.first_name} ${aptPatient.last_name}`
                    : undefined,
                  patient_hn: aptPatient?.hn,
                  patient_email: aptPatient?.email || undefined,
                  provider_name: providerProfile?.full_name,
                  service_name: followUpServices
                    .map((s) => s.service_name)
                    .join(", "),
                },
                aptProviderId,
              );
              if (meetLink) {
                await supabase
                  .from("appointments")
                  .update({ meet_link: meetLink })
                  .eq("id", newApt.id);
                queryClient.invalidateQueries({ queryKey: ["appointments"] });
              }
            }

            // Send email AFTER meet link is created so it's included
            sendAppointmentEmail(newApt.id, "created");
          } catch {
            toast.warning("แก้ไขการรักษาสำเร็จ แต่สร้างนัดหมายไม่สำเร็จ");
          }
        }
      }

      toast.success("แก้ไขบันทึกการรักษาสำเร็จ");

      handleCloseEdit();
      setSelectedRecord(null);
    } catch (error) {
      toast.error("เกิดข้อผิดพลาดในการแก้ไข");
    }
  };

  if (isLoading) {
    return (
      <MainLayout title="บันทึกการรักษา">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout title="บันทึกการรักษา">
      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="ค้นหาชื่อผู้ป่วย, HN, เบอร์โทร, เลขบัตรประชาชน, การวินิจฉัย..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 input-focus"
          />
        </div>

        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue placeholder="ประเภท" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">ทั้งหมด</SelectItem>
            <SelectItem value="consultation">ปรึกษา/บำบัด</SelectItem>
            <SelectItem value="assessment">ตรวจประเมิน</SelectItem>
            <SelectItem value="follow_up">ติดตามอาการ</SelectItem>
            <SelectItem value="diagnosis">ตรวจวินิจฉัย</SelectItem>
          </SelectContent>
        </Select>

        <Dialog
          open={isNewRecordOpen}
          onOpenChange={(open) => {
            if (open && !selectedProvider) {
              setSelectedProvider(user?.id || "");
            }
            setIsNewRecordOpen(open);
          }}
        >
          <DialogTrigger asChild>
            <Button className="bg-gradient-primary hover:opacity-90">
              <Plus className="w-4 h-4 mr-2" />
              เพิ่มบันทึก
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="mr-20">บันทึกการรักษาใหม่</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label>ผู้ป่วย *</Label>
                <Select
                  value={formData.patient_id}
                  onValueChange={(value) =>
                    setFormData({ ...formData, patient_id: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="เลือกผู้ป่วย" />
                  </SelectTrigger>
                  <SelectContent>
                    {patients.map((patient) => (
                      <SelectItem key={patient.id} value={patient.id}>
                        {patient.prefix}
                        {patient.first_name} {patient.last_name} ({patient.hn})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>วันที่รักษา</Label>
                <DateInput
                  value={formData.treatment_date}
                  onChange={(val) =>
                    setFormData({ ...formData, treatment_date: val })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label>ผู้รักษา/ผู้บำบัด</Label>
                <Select
                  value={selectedProvider}
                  onValueChange={setSelectedProvider}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="เลือกผู้ให้บริการ (ค่าเริ่มต้น: ตัวเอง)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">
                      ไม่ระบุ (ใช้ผู้ล็อกอิน)
                    </SelectItem>
                    {providers.map((prov) => (
                      <SelectItem key={prov.user_id} value={prov.user_id}>
                        {prov.full_name}
                        {prov.specialty ? ` (${prov.specialty})` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Vital Signs */}
              <VitalSignsForm value={vitalSigns} onChange={setVitalSigns} />

              <div className="space-y-2">
                <Label>อาการ</Label>
                <Textarea
                  placeholder="บันทึกอาการที่ผู้ป่วยมาพบ"
                  rows={3}
                  className="input-focus"
                  value={formData.symptoms}
                  onChange={(e) =>
                    setFormData({ ...formData, symptoms: e.target.value })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label>การวินิจฉัย</Label>
                <Textarea
                  placeholder="การวินิจฉัยโรค"
                  rows={2}
                  className="input-focus"
                  value={formData.diagnosis}
                  onChange={(e) =>
                    setFormData({ ...formData, diagnosis: e.target.value })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label>แผนการรักษา</Label>
                <Textarea
                  placeholder="รายละเอียดการรักษาและการสั่งยา"
                  rows={3}
                  className="input-focus"
                  value={formData.treatment_plan}
                  onChange={(e) =>
                    setFormData({ ...formData, treatment_plan: e.target.value })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label>หัตถการ</Label>
                <Textarea
                  placeholder="หัตถการที่ทำ"
                  rows={2}
                  className="input-focus"
                  value={formData.procedures}
                  onChange={(e) =>
                    setFormData({ ...formData, procedures: e.target.value })
                  }
                />
              </div>

              {/* Medication Selection */}
              <MedicationSelector
                value={medicationItems}
                onChange={setMedicationItems}
                patientAllergies={patientAllergies}
              />

              {/* Service Items */}
              <ServiceSelector
                value={serviceItems}
                onChange={setServiceItems}
                label="ค่าบริการเพิ่มเติมในครั้งนี้"
                appointmentType={
                  linkedAppointmentData?.appointment_type ||
                  editAppointmentType ||
                  null
                }
              />

              <div className="space-y-2">
                <Label>หมายเหตุทางคลินิก</Label>
                <Textarea
                  placeholder="หมายเหตุเพิ่มเติม"
                  rows={2}
                  className="input-focus"
                  value={formData.clinical_notes}
                  onChange={(e) =>
                    setFormData({ ...formData, clinical_notes: e.target.value })
                  }
                />
              </div>

              {/* Follow-up Appointment Section */}
              <div className="border rounded-lg p-4 space-y-4 bg-muted/20">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-primary" />
                    <Label className="font-semibold">นัดหมายครั้งถัดไป</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Label className="text-sm text-muted-foreground">
                      มีนัดหมาย Follow-up
                    </Label>
                    <Switch
                      checked={showFollowUp}
                      onCheckedChange={setShowFollowUp}
                    />
                  </div>
                </div>

                {showFollowUp && (
                  <>
                    {/* Step 1: Provider Schedule */}
                    <div className="space-y-3">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        1. ผู้รักษาและตารางนัด
                      </p>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-2">
                          <Label className="text-sm">ประเภทการนัดหมาย</Label>
                          <Select
                            value={followUpType}
                            onValueChange={setFollowUpType}
                          >
                            <SelectTrigger className="h-9">
                              <SelectValue placeholder="เลือกประเภท" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="consultation">
                                ปรึกษา/บำบัด
                              </SelectItem>
                              <SelectItem value="assessment">
                                ตรวจประเมิน
                              </SelectItem>
                              <SelectItem value="follow_up">
                                ติดตามอาการ
                              </SelectItem>
                              <SelectItem value="diagnosis">
                                ตรวจวินิจฉัย
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label className="text-sm">ผู้รักษา/ผู้บำบัด</Label>
                          <Select
                            value={followUpProvider}
                            onValueChange={(val) => {
                              setFollowUpProvider(val);
                              setFollowUpTime("");
                            }}
                          >
                            <SelectTrigger className="h-9">
                              <SelectValue placeholder="เลือกผู้รักษา" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">ไม่ระบุ</SelectItem>
                              {providers.map((prov) => (
                                <SelectItem
                                  key={prov.user_id}
                                  value={prov.user_id}
                                >
                                  {prov.full_name}
                                  {prov.specialty ? ` (${prov.specialty})` : ""}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <DateTimeSlotPicker
                        selectedDate={formData.follow_up_date}
                        selectedTime={followUpTime}
                        onDateChange={(date) => {
                          setFormData({ ...formData, follow_up_date: date });
                          setFollowUpTime("");
                        }}
                        onTimeChange={setFollowUpTime}
                        providerSchedules={providerSchedules}
                        providerId={
                          followUpProvider && followUpProvider !== "none"
                            ? followUpProvider
                            : null
                        }
                      />
                    </div>

                    {/* Step 2: Service */}
                    <div className="space-y-3">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        2. บริการ
                      </p>
                      <ServiceSelector
                        value={followUpServices}
                        onChange={setFollowUpServices}
                      />

                      {/* Calculated End Time Display */}
                      {followUpTime &&
                        followUpServices.length > 0 &&
                        (() => {
                          const totalDuration = followUpServices.reduce(
                            (sum, s) =>
                              sum + (s.duration_minutes || 0) * s.quantity,
                            0,
                          );
                          if (totalDuration <= 0) return null;
                          const [h, m] = followUpTime.split(":").map(Number);
                          const endTotalMin = h * 60 + m + totalDuration;
                          const endH = Math.floor(endTotalMin / 60)
                            .toString()
                            .padStart(2, "0");
                          const endM = (endTotalMin % 60)
                            .toString()
                            .padStart(2, "0");
                          const hours = Math.floor(totalDuration / 60);
                          const mins = totalDuration % 60;
                          const durationText =
                            hours > 0
                              ? `${hours} ชม.${mins > 0 ? ` ${mins} นาที` : ""}`
                              : `${mins} นาที`;
                          return (
                            <div className="flex items-center gap-2 p-2.5 rounded-lg bg-primary/5 border border-primary/20">
                              <Clock className="w-4 h-4 text-primary shrink-0" />
                              <span className="text-sm font-medium text-primary">
                                เวลานัด: {followUpTime} - {endH}:{endM} (
                                {durationText})
                              </span>
                            </div>
                          );
                        })()}
                    </div>

                    {/* Step 3: Service Location / Google Meet */}
                    {followUpServices.length > 0 &&
                      (() => {
                        const hasOnsiteService = followUpServices.some((s) => {
                          const svc = allServices.find(
                            (as) => as.id === s.service_id,
                          );
                          return svc?.service_mode === "onsite";
                        });
                        const hasOnlineService = followUpServices.some((s) => {
                          const svc = allServices.find(
                            (as) => as.id === s.service_id,
                          );
                          return svc?.service_mode === "online";
                        });
                        if (!hasOnsiteService && !hasOnlineService) return null;
                        return (
                          <div className="space-y-3">
                            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                              3. สถานที่ให้บริการ
                            </p>

                            {hasOnsiteService &&
                              serviceLocations.length > 0 && (
                                <div className="space-y-2">
                                  <Label className="flex items-center gap-1.5 text-sm">
                                    <MapPin className="w-4 h-4 text-primary" />
                                    สถานที่นัดหมาย
                                  </Label>
                                  <Select
                                    value={followUpLocationId}
                                    onValueChange={setFollowUpLocationId}
                                  >
                                    <SelectTrigger className="h-9">
                                      <SelectValue placeholder="เลือกสถานที่ให้บริการ" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="none">
                                        ไม่ระบุ
                                      </SelectItem>
                                      {serviceLocations.map((loc) => (
                                        <SelectItem key={loc.id} value={loc.id}>
                                          {loc.name}
                                          {loc.address
                                            ? ` - ${loc.address}`
                                            : ""}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                              )}

                            {hasOnlineService && (
                              <p className="text-xs text-muted-foreground">
                                * Google Meet link
                                จะถูกสร้างอัตโนมัติเมื่อบันทึก
                              </p>
                            )}
                          </div>
                        );
                      })()}

                    {/* Step 4: Additional Info */}
                    <div className="space-y-3">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        4. ข้อมูลเพิ่มเติม
                      </p>
                      <div className="space-y-2">
                        <Label className="text-sm">อาการหลัก</Label>
                        <Textarea
                          placeholder="อาการหลักที่มาพบแพทย์ครั้งถัดไป (ถ้ามี)"
                          rows={2}
                          className="input-focus resize-none"
                          value={followUpChiefComplaint}
                          onChange={(e) =>
                            setFollowUpChiefComplaint(e.target.value)
                          }
                        />
                      </div>

                      <div className="space-y-2">
                        <Label className="text-sm">หมายเหตุการนัดหมาย</Label>
                        <Textarea
                          placeholder="หมายเหตุสำหรับการนัดหมายครั้งถัดไป"
                          rows={2}
                          className="input-focus resize-none"
                          value={formData.follow_up_notes}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              follow_up_notes: e.target.value,
                            })
                          }
                        />
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Cost Summary */}
              {(() => {
                // Treatment services
                const validServices = serviceItems.filter(
                  (s) => s.service_id && s.unit_price > 0,
                );
                const totalServices = validServices.reduce(
                  (sum, s) => sum + s.quantity * s.unit_price,
                  0,
                );
                // Medications
                const validMeds = medicationItems.filter(
                  (item) => item.medication_id && item.medication_name,
                );
                const medCosts = validMeds
                  .map((item) => {
                    const med = allMedications.find(
                      (m) => m.id === item.medication_id,
                    );
                    const unitPrice = med?.price || 0;
                    return {
                      name: item.medication_name,
                      quantity: item.quantity,
                      unitPrice,
                      total: unitPrice * item.quantity,
                    };
                  })
                  .filter((m) => m.total > 0);
                const totalMed = medCosts.reduce((sum, m) => sum + m.total, 0);
                // Follow-up services
                const validFollowUp = followUpServices.filter(
                  (s) => s.service_id && s.unit_price > 0,
                );
                const totalFollowUp = validFollowUp.reduce(
                  (sum, s) => sum + s.quantity * s.unit_price,
                  0,
                );
                // Follow-up time summary
                const followUpDuration = followUpServices.reduce(
                  (sum, s) => sum + (s.duration_minutes || 0) * s.quantity,
                  0,
                );
                let followUpEndTime: string | null = null;
                if (followUpTime && followUpDuration > 0) {
                  const [fh, fm] = followUpTime.split(":").map(Number);
                  const totalMin = fh * 60 + fm + followUpDuration;
                  followUpEndTime = `${Math.floor(totalMin / 60)
                    .toString()
                    .padStart(
                      2,
                      "0",
                    )}:${(totalMin % 60).toString().padStart(2, "0")}`;
                }

                const totalAll = totalServices + totalMed + totalFollowUp;
                if (
                  totalAll <= 0 &&
                  validServices.length === 0 &&
                  medCosts.length === 0 &&
                  validFollowUp.length === 0
                )
                  return null;
                return (
                  <Card className="border-primary/20 bg-primary/5">
                    <CardContent className="p-4 space-y-2">
                      <h4 className="font-semibold text-sm flex items-center gap-2">
                        <FileText className="w-4 h-4 text-primary" />
                        สรุปค่าใช้จ่าย
                      </h4>
                      {validServices.length > 0 && (
                        <>
                          <p className="text-xs text-muted-foreground font-medium">
                            ค่าบริการ (การรักษาครั้งนี้):
                          </p>
                          {validServices.map((s, i) => (
                            <div
                              key={`svc-${i}`}
                              className="flex justify-between text-sm"
                            >
                              <span className="truncate mr-2">
                                {s.service_name} x{s.quantity}
                              </span>
                              <span className="whitespace-nowrap">
                                {(s.quantity * s.unit_price).toLocaleString()}{" "}
                                บาท
                              </span>
                            </div>
                          ))}
                        </>
                      )}
                      {medCosts.length > 0 && (
                        <>
                          <p className="text-xs text-muted-foreground font-medium pt-1">
                            ค่ายา:
                          </p>
                          {medCosts.map((m, i) => (
                            <div
                              key={i}
                              className="flex justify-between text-sm"
                            >
                              <span className="truncate mr-2">
                                ยา: {m.name} x{m.quantity}
                              </span>
                              <span className="whitespace-nowrap">
                                {m.total.toLocaleString()} บาท
                              </span>
                            </div>
                          ))}
                        </>
                      )}
                      {validFollowUp.length > 0 && (
                        <>
                          <p className="text-xs text-muted-foreground font-medium pt-1">
                            ค่าบริการ (นัดหมายครั้งถัดไป):
                          </p>
                          {validFollowUp.map((s, i) => (
                            <div
                              key={`fu-${i}`}
                              className="flex justify-between text-sm"
                            >
                              <span className="truncate mr-2">
                                {s.service_name} x{s.quantity}
                              </span>
                              <span className="whitespace-nowrap">
                                {(s.quantity * s.unit_price).toLocaleString()}{" "}
                                บาท
                              </span>
                            </div>
                          ))}
                          {followUpTime &&
                            followUpDuration > 0 &&
                            followUpEndTime && (
                              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                <Clock className="w-3 h-3" />
                                <span>
                                  เวลานัด: {followUpTime} - {followUpEndTime} (
                                  {followUpDuration >= 60
                                    ? `${Math.floor(followUpDuration / 60)} ชม.${followUpDuration % 60 > 0 ? ` ${followUpDuration % 60} นาที` : ""}`
                                    : `${followUpDuration} นาที`}
                                  )
                                </span>
                              </div>
                            )}
                        </>
                      )}
                      <div className="border-t border-primary/20 pt-2 flex justify-between font-semibold">
                        <span>รวมทั้งหมด</span>
                        <span className="text-primary">
                          {totalAll.toLocaleString()} บาท
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                );
              })()}

              {/* Pending Files Upload */}
              <div className="pt-2">
                <Label className="text-sm font-medium mb-2 block">
                  <Paperclip className="w-4 h-4 inline mr-1" />
                  ไฟล์แนบ
                </Label>
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setIsDraggingNewRecord(true);
                  }}
                  onDragLeave={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setIsDraggingNewRecord(false);
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setIsDraggingNewRecord(false);
                    if (e.dataTransfer.files)
                      setPendingFiles((prev) => [
                        ...prev,
                        ...Array.from(e.dataTransfer.files),
                      ]);
                  }}
                  onClick={() => newRecordFileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors ${isDraggingNewRecord ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/30"}`}
                >
                  <input
                    ref={newRecordFileInputRef}
                    type="file"
                    multiple
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files) {
                        setPendingFiles((prev) => [
                          ...prev,
                          ...Array.from(e.target.files!),
                        ]);
                        e.target.value = "";
                      }
                    }}
                    accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"
                  />
                  <div className="flex flex-col items-center gap-1.5">
                    <Upload className="w-5 h-5 text-muted-foreground" />
                    <p className="text-xs text-muted-foreground">
                      ลากไฟล์มาวางที่นี่ หรือ{" "}
                      <span className="text-primary font-medium">
                        คลิกเลือกไฟล์
                      </span>
                    </p>
                    <p className="text-[10px] text-muted-foreground/60">
                      รองรับ รูปภาพ, PDF, Word, Excel
                    </p>
                  </div>
                </div>
                {pendingFiles.length > 0 && (
                  <div className="space-y-1.5 mt-2">
                    {pendingFiles.map((file, idx) => (
                      <div
                        key={idx}
                        className="flex items-center gap-2 p-2 bg-muted/30 rounded-lg text-sm"
                      >
                        <FileText className="w-4 h-4 text-muted-foreground shrink-0" />
                        <span className="flex-1 truncate">{file.name}</span>
                        <span className="text-xs text-muted-foreground shrink-0">
                          {file.size < 1024 * 1024
                            ? `${(file.size / 1024).toFixed(1)} KB`
                            : `${(file.size / (1024 * 1024)).toFixed(1)} MB`}
                        </span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-destructive"
                          onClick={(e) => {
                            e.stopPropagation();
                            setPendingFiles((prev) =>
                              prev.filter((_, i) => i !== idx),
                            );
                          }}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button
                  variant="outline"
                  onClick={() => setIsNewRecordOpen(false)}
                >
                  ยกเลิก
                </Button>
                <Button
                  className="bg-gradient-primary"
                  onClick={handleSubmit}
                  disabled={
                    createTreatment.isPending ||
                    createPrescription.isPending ||
                    createAppointment.isPending
                  }
                >
                  {(createTreatment.isPending ||
                    createPrescription.isPending ||
                    createAppointment.isPending) && (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  )}
                  บันทึก
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Records List */}
      {treatments.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>ไม่พบบันทึกการรักษา</p>
        </div>
      ) : (
        <div className="space-y-4">
          {treatments.map((record) => (
            <Card
              key={record.id}
              className="hover-lift cursor-pointer"
              onClick={() => setSelectedRecord(record)}
            >
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  {/* Patient Avatar */}
                  <Avatar className="w-12 h-12">
                    <AvatarFallback className="bg-primary/10 text-primary">
                      {getPatientInitials(record)}
                    </AvatarFallback>
                  </Avatar>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold">
                          {getPatientName(record)}
                        </h3>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Calendar className="w-4 h-4" />
                        {formatDate(record.treatment_date)}
                        <Clock className="w-4 h-4 ml-2" />
                        {formatTime(record.created_at)}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                      <span className="font-mono">
                        {record.patients?.hn || "-"}
                      </span>
                      {record.provider_profile && (
                        <>
                          <span>•</span>
                          <User className="w-4 h-4" />
                          <span>{record.provider_profile.full_name}</span>
                        </>
                      )}
                    </div>

                    {/* Quick vital signs indicator */}
                    {record.vital_signs && (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                        <Activity className="w-3.5 h-3.5 text-primary" />
                        <span>มี Vital Signs</span>
                      </div>
                    )}

                    {/* File attachment indicator */}
                    {treatmentFileCounts[record.id] > 0 && (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                        <Paperclip className="w-3.5 h-3.5 text-primary" />
                        <span>{treatmentFileCounts[record.id]} ไฟล์แนบ</span>
                      </div>
                    )}

                    {record.diagnosis && (
                      <p className="text-sm font-medium text-primary mb-1">
                        {record.diagnosis}
                      </p>
                    )}
                    {record.symptoms && (
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {record.symptoms}
                      </p>
                    )}

                    {record.follow_up_date && (
                      <div className="flex items-center gap-1.5 mt-3 text-xs text-primary">
                        <Calendar className="w-3.5 h-3.5" />
                        นัดครั้งถัดไป: {formatDate(record.follow_up_date)}
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedRecord(record);
                      }}
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={(e) => handleOpenEdit(record, e)}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Record Detail Dialog */}
      <Dialog
        open={!!selectedRecord && !isEditMode}
        onOpenChange={() => setSelectedRecord(null)}
      >
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          {!!selectedRecord && (
            <>
              <div className="relative">
                {/* Header and top-right actions row */}
                <div className="flex items-start justify-between mb-2">
                  <DialogHeader>
                    <DialogTitle className="flex items-center ga   p-2">
                      <FileText className="w-5 h-5 text-primary" />
                      บันทึกการรักษา
                    </DialogTitle>
                  </DialogHeader>
                  {/* Action buttons - same row as close button, spaced to the left, with more vertical margin */}
                  <div className="flex items-center">
                    <div className="flex items-center gap-2 mr-10">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleOpenEdit(selectedRecord)}
                      >
                        <Edit className="w-4 h-4 mr-1" />
                        แก้ไข
                      </Button>
                      {isAdmin && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => {
                            setDeleteTarget(selectedRecord);
                          }}
                        >
                          <Trash2 className="w-4 h-4 mr-1" />
                          ลบ
                        </Button>
                      )}
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  {/* Patient & Date Info */}
                  <div className="flex items-center justify-between p-4 bg-muted/30 rounded-xl">
                    <div className="flex items-center gap-3">
                      <Avatar className="w-12 h-12">
                        <AvatarFallback className="bg-primary/10 text-primary">
                          {getPatientInitials(selectedRecord)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-semibold">
                          {getPatientName(selectedRecord)}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {selectedRecord.patients?.hn}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">
                        {formatDate(selectedRecord.treatment_date)}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {formatTime(selectedRecord.created_at)}
                      </p>
                    </div>
                  </div>

                  {/* Doctor */}
                  {selectedRecord.provider_profile && (
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm">
                        {selectedRecord.provider_profile.full_name}
                      </span>
                    </div>
                  )}

                  {/* Vital Signs Display */}
                  <VitalSignsDisplay
                    data={selectedRecord.vital_signs as VitalSignsData | null}
                  />

                  {/* Content Sections */}
                  <div className="space-y-4">
                    {selectedRecord.diagnosis && (
                      <div>
                        <Label className="text-sm text-muted-foreground">
                          การวินิจฉัย
                        </Label>
                        <p className="font-medium text-primary">
                          {selectedRecord.diagnosis}
                        </p>
                      </div>
                    )}

                    {selectedRecord.symptoms && (
                      <div>
                        <Label className="text-sm text-muted-foreground">
                          อาการ
                        </Label>
                        <p className="text-sm">{selectedRecord.symptoms}</p>
                      </div>
                    )}

                    {selectedRecord.treatment_plan && (
                      <div>
                        <Label className="text-sm text-muted-foreground">
                          แผนการรักษา
                        </Label>
                        <p className="text-sm">
                          {selectedRecord.treatment_plan}
                        </p>
                      </div>
                    )}

                    {selectedRecord.procedures && (
                      <div>
                        <Label className="text-sm text-muted-foreground">
                          หัตถการ
                        </Label>
                        <p className="text-sm">{selectedRecord.procedures}</p>
                      </div>
                    )}

                    {selectedRecord.clinical_notes && (
                      <div>
                        <Label className="text-sm text-muted-foreground">
                          หมายเหตุทางคลินิก
                        </Label>
                        <p className="text-sm">
                          {selectedRecord.clinical_notes}
                        </p>
                      </div>
                    )}

                    {selectedRecord.follow_up_date && (
                      <div className="flex items-center gap-2 p-3 bg-primary/5 rounded-lg">
                        <Calendar className="w-4 h-4 text-primary" />
                        <span className="text-sm font-medium">
                          นัดครั้งถัดไป:{" "}
                          {formatDate(selectedRecord.follow_up_date)}
                        </span>
                      </div>
                    )}

                    {selectedRecord.follow_up_notes && (
                      <div>
                        <Label className="text-sm text-muted-foreground">
                          หมายเหตุการนัดหมาย
                        </Label>
                        <p className="text-sm">
                          {selectedRecord.follow_up_notes}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Prescription / Medication List */}
                  <PrescriptionDisplay treatmentId={selectedRecord.id} />

                  {/* Files */}
                  <div className="pt-2">
                    <Label className="text-sm font-medium mb-2 block">
                      ไฟล์แนบ
                    </Label>
                    <TreatmentFiles
                      patientId={selectedRecord.patient_id}
                      treatmentId={selectedRecord.id}
                    />
                  </div>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Treatment Dialog */}
      <Dialog open={isEditMode} onOpenChange={handleCloseEdit}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit className="w-5 h-5 text-primary" />
              แก้ไขบันทึกการรักษา
            </DialogTitle>
          </DialogHeader>
          {editingRecord && (
            <div className="space-y-4 pt-4">
              {/* Patient Info (Read-only) */}
              <div className="p-4 bg-muted/30 rounded-xl">
                <div className="flex items-center gap-3">
                  <Avatar className="w-10 h-10">
                    <AvatarFallback className="bg-primary/10 text-primary">
                      {getPatientInitials(editingRecord)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-semibold">
                      {getPatientName(editingRecord)}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {editingRecord.patients?.hn}
                    </p>
                  </div>
                </div>
              </div>

              {/* Linked Appointment Section */}
              {linkedAppointmentData && (
                <div className="border rounded-lg p-4 space-y-3 bg-muted/20">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-primary" />
                      <Label className="font-semibold">
                        นัดหมายที่เชื่อมโยง
                      </Label>
                    </div>
                    <Button
                      type="button"
                      variant={
                        appointmentEditUnlocked ? "secondary" : "outline"
                      }
                      size="sm"
                      onClick={() =>
                        setAppointmentEditUnlocked(!appointmentEditUnlocked)
                      }
                      className="gap-1.5"
                    >
                      {appointmentEditUnlocked ? (
                        <>
                          <Lock className="w-3.5 h-3.5" />
                          ล็อก
                        </>
                      ) : (
                        <>
                          <Unlock className="w-3.5 h-3.5" />
                          แก้ไขนัดหมาย
                        </>
                      )}
                    </Button>
                  </div>

                  {!appointmentEditUnlocked ? (
                    /* Read-only display */
                    <div className="space-y-2 text-sm">
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <span className="text-muted-foreground">
                            วันที่นัด:
                          </span>{" "}
                          <span className="font-medium">
                            {formatDate(linkedAppointmentData.appointment_date)}
                          </span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">เวลา:</span>{" "}
                          <span className="font-medium">
                            {linkedAppointmentData.start_time?.substring(0, 5)}
                            {linkedAppointmentData.end_time
                              ? ` - ${linkedAppointmentData.end_time.substring(0, 5)}`
                              : ""}
                          </span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">ประเภท:</span>{" "}
                          <span className="font-medium">
                            {typeLabels[
                              linkedAppointmentData.appointment_type || ""
                            ] ||
                              linkedAppointmentData.appointment_type ||
                              "-"}
                          </span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">
                            ผู้รักษา:
                          </span>{" "}
                          <span className="font-medium">
                            {linkedAppointmentData.provider_profile
                              ?.full_name || "-"}
                          </span>
                        </div>
                      </div>
                      {linkedAppointmentData.chief_complaint && (
                        <div>
                          <span className="text-muted-foreground">
                            อาการหลัก:
                          </span>{" "}
                          <span>{linkedAppointmentData.chief_complaint}</span>
                        </div>
                      )}
                      {linkedAppointmentData.service_locations?.name && (
                        <div>
                          <span className="text-muted-foreground">
                            สถานที่:
                          </span>{" "}
                          <span>
                            {linkedAppointmentData.service_locations.name}
                          </span>
                        </div>
                      )}
                      {linkedAppointmentData.notes && (
                        <div>
                          <span className="text-muted-foreground">
                            หมายเหตุ:
                          </span>{" "}
                          <span>{linkedAppointmentData.notes}</span>
                        </div>
                      )}
                    </div>
                  ) : (
                    /* Editable fields */
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-2">
                          <Label className="text-sm">ประเภทการนัดหมาย</Label>
                          <Select
                            value={editAppointmentType}
                            onValueChange={setEditAppointmentType}
                          >
                            <SelectTrigger className="h-9">
                              <SelectValue placeholder="เลือกประเภท" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="consultation">
                                ปรึกษา/บำบัด
                              </SelectItem>
                              <SelectItem value="assessment">
                                ตรวจประเมิน
                              </SelectItem>
                              <SelectItem value="follow_up">
                                ติดตามอาการ
                              </SelectItem>
                              <SelectItem value="diagnosis">
                                ตรวจวินิจฉัย
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label className="text-sm">ผู้รักษา/ผู้บำบัด</Label>
                          <Select
                            value={editAppointmentProvider}
                            onValueChange={(val) => {
                              setEditAppointmentProvider(val);
                              setEditAppointmentTime("");
                            }}
                          >
                            <SelectTrigger className="h-9">
                              <SelectValue placeholder="เลือกผู้รักษา" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">ไม่ระบุ</SelectItem>
                              {providers.map((prov) => (
                                <SelectItem
                                  key={prov.user_id}
                                  value={prov.user_id}
                                >
                                  {prov.full_name}
                                  {prov.specialty ? ` (${prov.specialty})` : ""}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <DateTimeSlotPicker
                        selectedDate={editAppointmentDate}
                        selectedTime={editAppointmentTime}
                        onDateChange={(date) => {
                          setEditAppointmentDate(date);
                          setEditAppointmentTime("");
                        }}
                        onTimeChange={setEditAppointmentTime}
                        providerSchedules={providerSchedules}
                        providerId={
                          editAppointmentProvider &&
                          editAppointmentProvider !== "none"
                            ? editAppointmentProvider
                            : null
                        }
                        excludeAppointmentId={linkedAppointmentData.id}
                      />

                      <div className="space-y-2">
                        <Label className="text-sm">อาการหลัก</Label>
                        <Textarea
                          placeholder="อาการหลักที่มาพบ"
                          rows={2}
                          className="input-focus resize-none"
                          value={editAppointmentChiefComplaint}
                          onChange={(e) =>
                            setEditAppointmentChiefComplaint(e.target.value)
                          }
                        />
                      </div>

                      {serviceLocations.length > 0 && (
                        <div className="space-y-2">
                          <Label className="text-sm flex items-center gap-1.5">
                            <MapPin className="w-4 h-4 text-primary" />
                            สถานที่นัดหมาย
                          </Label>
                          <Select
                            value={editAppointmentLocationId}
                            onValueChange={setEditAppointmentLocationId}
                          >
                            <SelectTrigger className="h-9">
                              <SelectValue placeholder="เลือกสถานที่" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">ไม่ระบุ</SelectItem>
                              {serviceLocations.map((loc) => (
                                <SelectItem key={loc.id} value={loc.id}>
                                  {loc.name}
                                  {loc.address ? ` - ${loc.address}` : ""}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}

                      <div className="space-y-2">
                        <Label className="text-sm">หมายเหตุนัดหมาย</Label>
                        <Textarea
                          placeholder="หมายเหตุ"
                          rows={2}
                          className="input-focus resize-none"
                          value={editAppointmentNotes}
                          onChange={(e) =>
                            setEditAppointmentNotes(e.target.value)
                          }
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="space-y-2">
                <Label>วันที่รักษา</Label>
                <DateInput
                  value={formData.treatment_date}
                  onChange={(val) =>
                    setFormData({ ...formData, treatment_date: val })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label>ผู้รักษา/ผู้บำบัด</Label>
                <Select
                  value={selectedProvider}
                  onValueChange={setSelectedProvider}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="เลือกผู้ให้บริการ" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">
                      ไม่ระบุ (ใช้ผู้ล็อกอิน)
                    </SelectItem>
                    {providers.map((prov) => (
                      <SelectItem key={prov.user_id} value={prov.user_id}>
                        {prov.full_name}
                        {prov.specialty ? ` (${prov.specialty})` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Vital Signs */}
              <VitalSignsForm value={vitalSigns} onChange={setVitalSigns} />

              <div className="space-y-2">
                <Label>อาการ</Label>
                <Textarea
                  placeholder="บันทึกอาการที่ผู้ป่วยมาพบ"
                  rows={3}
                  className="input-focus"
                  value={formData.symptoms}
                  onChange={(e) =>
                    setFormData({ ...formData, symptoms: e.target.value })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label>การวินิจฉัย</Label>
                <Textarea
                  placeholder="การวินิจฉัยโรค"
                  rows={2}
                  className="input-focus"
                  value={formData.diagnosis}
                  onChange={(e) =>
                    setFormData({ ...formData, diagnosis: e.target.value })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label>แผนการรักษา</Label>
                <Textarea
                  placeholder="รายละเอียดการรักษาและการสั่งยา"
                  rows={3}
                  className="input-focus"
                  value={formData.treatment_plan}
                  onChange={(e) =>
                    setFormData({ ...formData, treatment_plan: e.target.value })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label>หัตถการ</Label>
                <Textarea
                  placeholder="หัตถการที่ทำ"
                  rows={2}
                  className="input-focus"
                  value={formData.procedures}
                  onChange={(e) =>
                    setFormData({ ...formData, procedures: e.target.value })
                  }
                />
              </div>

              {/* Existing Prescription Display */}
              <PrescriptionDisplay treatmentId={editingRecord.id} />

              {/* Medication Selection in Edit Mode */}
              <MedicationSelector
                value={medicationItems}
                onChange={setMedicationItems}
                patientAllergies={patientAllergies}
              />

              {/* Service Items */}
              <ServiceSelector
                value={serviceItems}
                onChange={setServiceItems}
                label="ค่าบริการเพิ่มเติมในครั้งนี้"
                appointmentType={
                  linkedAppointmentData?.appointment_type ||
                  editAppointmentType ||
                  null
                }
              />

              <div className="space-y-2">
                <Label>หมายเหตุทางคลินิก</Label>
                <Textarea
                  placeholder="หมายเหตุเพิ่มเติม"
                  rows={2}
                  className="input-focus"
                  value={formData.clinical_notes}
                  onChange={(e) =>
                    setFormData({ ...formData, clinical_notes: e.target.value })
                  }
                />
              </div>

              {/* Follow-up Appointment Section */}
              <div className="border rounded-lg p-4 space-y-4 bg-muted/20">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-primary" />
                    <Label className="font-semibold">นัดหมายครั้งถัดไป</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Label className="text-sm text-muted-foreground">
                      มีนัดหมาย Follow-up
                    </Label>
                    <Switch
                      checked={showFollowUp}
                      onCheckedChange={setShowFollowUp}
                      disabled={!!existingFollowUpAppointment}
                    />
                  </div>
                </div>

                {showFollowUp && existingFollowUpAppointment ? (
                  /* Locked: existing follow-up appointment */
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 p-2.5 rounded-lg bg-primary/5 border border-primary/20">
                      <Lock className="w-4 h-4 text-primary shrink-0" />
                      <span className="text-sm font-medium text-primary">
                        นัดหมายถูกสร้างเรียบร้อยแล้ว
                      </span>
                    </div>
                    <div className="space-y-2 text-sm">
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <span className="text-muted-foreground">
                            วันที่นัด:
                          </span>{" "}
                          <span className="font-medium">
                            {formatDate(
                              existingFollowUpAppointment.appointment_date,
                            )}
                          </span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">เวลา:</span>{" "}
                          <span className="font-medium">
                            {existingFollowUpAppointment.start_time?.substring(
                              0,
                              5,
                            )}
                            {existingFollowUpAppointment.end_time
                              ? ` - ${existingFollowUpAppointment.end_time.substring(0, 5)}`
                              : ""}
                          </span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">ประเภท:</span>{" "}
                          <span className="font-medium">
                            {typeLabels[
                              existingFollowUpAppointment.appointment_type || ""
                            ] ||
                              existingFollowUpAppointment.appointment_type ||
                              "-"}
                          </span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">
                            ผู้รักษา:
                          </span>{" "}
                          <span className="font-medium">
                            {existingFollowUpAppointment.provider_profile
                              ?.full_name || "-"}
                          </span>
                        </div>
                      </div>
                      {existingFollowUpAppointment.chief_complaint && (
                        <div>
                          <span className="text-muted-foreground">
                            อาการหลัก:
                          </span>{" "}
                          <span>
                            {existingFollowUpAppointment.chief_complaint}
                          </span>
                        </div>
                      )}
                      {existingFollowUpAppointment.service_locations?.name && (
                        <div>
                          <span className="text-muted-foreground">
                            สถานที่:
                          </span>{" "}
                          <span>
                            {existingFollowUpAppointment.service_locations.name}
                          </span>
                        </div>
                      )}
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="gap-1.5 w-full"
                      onClick={() => {
                        handleCloseEdit();
                        navigate("/appointments");
                      }}
                    >
                      <Edit className="w-3.5 h-3.5" />
                      แก้ไขนัดหมายในหน้านัดหมาย
                    </Button>
                  </div>
                ) : (
                  showFollowUp && (
                    <>
                      {/* Step 1: Provider Schedule */}
                      <div className="space-y-3">
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                          1. ผู้รักษาและตารางนัด
                        </p>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-2">
                            <Label className="text-sm">ประเภทการนัดหมาย</Label>
                            <Select
                              value={followUpType}
                              onValueChange={setFollowUpType}
                            >
                              <SelectTrigger className="h-9">
                                <SelectValue placeholder="เลือกประเภท" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="consultation">
                                  ปรึกษา/บำบัด
                                </SelectItem>
                                <SelectItem value="assessment">
                                  ตรวจประเมิน
                                </SelectItem>
                                <SelectItem value="follow_up">
                                  ติดตามอาการ
                                </SelectItem>
                                <SelectItem value="diagnosis">
                                  ตรวจวินิจฉัย
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label className="text-sm">ผู้รักษา/ผู้บำบัด</Label>
                            <Select
                              value={followUpProvider}
                              onValueChange={(val) => {
                                setFollowUpProvider(val);
                                setFollowUpTime("");
                              }}
                            >
                              <SelectTrigger className="h-9">
                                <SelectValue placeholder="เลือกผู้รักษา" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="none">ไม่ระบุ</SelectItem>
                                {providers.map((prov) => (
                                  <SelectItem
                                    key={prov.user_id}
                                    value={prov.user_id}
                                  >
                                    {prov.full_name}
                                    {prov.specialty
                                      ? ` (${prov.specialty})`
                                      : ""}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        <DateTimeSlotPicker
                          selectedDate={formData.follow_up_date}
                          selectedTime={followUpTime}
                          onDateChange={(date) => {
                            setFormData({ ...formData, follow_up_date: date });
                            setFollowUpTime("");
                          }}
                          onTimeChange={setFollowUpTime}
                          providerSchedules={providerSchedules}
                          providerId={
                            followUpProvider && followUpProvider !== "none"
                              ? followUpProvider
                              : null
                          }
                        />
                      </div>

                      {/* Step 2: Service */}
                      <div className="space-y-3">
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                          2. บริการ
                        </p>
                        <ServiceSelector
                          value={followUpServices}
                          onChange={setFollowUpServices}
                        />

                        {/* Calculated End Time Display */}
                        {followUpTime &&
                          followUpServices.length > 0 &&
                          (() => {
                            const totalDuration = followUpServices.reduce(
                              (sum, s) =>
                                sum + (s.duration_minutes || 0) * s.quantity,
                              0,
                            );
                            if (totalDuration <= 0) return null;
                            const [h, m] = followUpTime.split(":").map(Number);
                            const endTotalMin = h * 60 + m + totalDuration;
                            const endH = Math.floor(endTotalMin / 60)
                              .toString()
                              .padStart(2, "0");
                            const endM = (endTotalMin % 60)
                              .toString()
                              .padStart(2, "0");
                            const hours = Math.floor(totalDuration / 60);
                            const mins = totalDuration % 60;
                            const durationText =
                              hours > 0
                                ? `${hours} ชม.${mins > 0 ? ` ${mins} นาที` : ""}`
                                : `${mins} นาที`;
                            return (
                              <div className="flex items-center gap-2 p-2.5 rounded-lg bg-primary/5 border border-primary/20">
                                <Clock className="w-4 h-4 text-primary shrink-0" />
                                <span className="text-sm font-medium text-primary">
                                  เวลานัด: {followUpTime} - {endH}:{endM} (
                                  {durationText})
                                </span>
                              </div>
                            );
                          })()}
                      </div>

                      {/* Step 3: Service Location / Google Meet */}
                      {followUpServices.length > 0 &&
                        (() => {
                          const hasOnsiteService = followUpServices.some(
                            (s) => {
                              const svc = allServices.find(
                                (as) => as.id === s.service_id,
                              );
                              return svc?.service_mode === "onsite";
                            },
                          );
                          const hasOnlineService = followUpServices.some(
                            (s) => {
                              const svc = allServices.find(
                                (as) => as.id === s.service_id,
                              );
                              return svc?.service_mode === "online";
                            },
                          );
                          if (!hasOnsiteService && !hasOnlineService)
                            return null;
                          return (
                            <div className="space-y-3">
                              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                3. สถานที่ให้บริการ
                              </p>

                              {hasOnsiteService &&
                                serviceLocations.length > 0 && (
                                  <div className="space-y-2">
                                    <Label className="flex items-center gap-1.5 text-sm">
                                      <MapPin className="w-4 h-4 text-primary" />
                                      สถานที่นัดหมาย
                                    </Label>
                                    <Select
                                      value={followUpLocationId}
                                      onValueChange={setFollowUpLocationId}
                                    >
                                      <SelectTrigger className="h-9">
                                        <SelectValue placeholder="เลือกสถานที่ให้บริการ" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="none">
                                          ไม่ระบุ
                                        </SelectItem>
                                        {serviceLocations.map((loc) => (
                                          <SelectItem
                                            key={loc.id}
                                            value={loc.id}
                                          >
                                            {loc.name}
                                            {loc.address
                                              ? ` - ${loc.address}`
                                              : ""}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  </div>
                                )}

                              {hasOnlineService && (
                                <p className="text-xs text-muted-foreground">
                                  * Google Meet link
                                  จะถูกสร้างอัตโนมัติเมื่อบันทึก
                                </p>
                              )}
                            </div>
                          );
                        })()}

                      {/* Step 4: Additional Info */}
                      <div className="space-y-3">
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                          4. ข้อมูลเพิ่มเติม
                        </p>
                        <div className="space-y-2">
                          <Label className="text-sm">อาการหลัก</Label>
                          <Textarea
                            placeholder="อาการหลักที่มาพบแพทย์ครั้งถัดไป (ถ้ามี)"
                            rows={2}
                            className="input-focus resize-none"
                            value={followUpChiefComplaint}
                            onChange={(e) =>
                              setFollowUpChiefComplaint(e.target.value)
                            }
                          />
                        </div>

                        <div className="space-y-2">
                          <Label className="text-sm">หมายเหตุการนัดหมาย</Label>
                          <Textarea
                            placeholder="หมายเหตุสำหรับการนัดหมายครั้งถัดไป"
                            rows={2}
                            className="input-focus resize-none"
                            value={formData.follow_up_notes}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                follow_up_notes: e.target.value,
                              })
                            }
                          />
                        </div>
                      </div>
                    </>
                  )
                )}
              </div>

              {/* Cost Summary - includes existing + new items + follow-up */}
              {(() => {
                const validServices = serviceItems.filter(
                  (s) => (s.service_id || s.service_name) && s.unit_price > 0,
                );
                const totalServices = validServices.reduce(
                  (sum, s) => sum + s.quantity * s.unit_price,
                  0,
                );

                // Existing medication costs from billing
                const existingMedTotal = existingBillingMedItems.reduce(
                  (sum, m) => sum + m.total,
                  0,
                );

                // All medication costs (existing loaded + newly added)
                const validMeds = medicationItems.filter(
                  (item) => item.medication_id && item.medication_name,
                );
                const newMedCosts = validMeds
                  .map((item) => {
                    const med = allMedications.find(
                      (m) => m.id === item.medication_id,
                    );
                    const unitPrice = med?.price || 0;
                    return {
                      name: item.medication_name,
                      quantity: item.quantity,
                      unitPrice,
                      total: unitPrice * item.quantity,
                    };
                  })
                  .filter((m) => m.total > 0);
                const newMedTotal = newMedCosts.reduce(
                  (sum, m) => sum + m.total,
                  0,
                );

                const totalMed = existingMedTotal + newMedTotal;

                // Follow-up services
                const validFollowUp = followUpServices.filter(
                  (s) => s.service_id && s.unit_price > 0,
                );
                const totalFollowUp = validFollowUp.reduce(
                  (sum, s) => sum + s.quantity * s.unit_price,
                  0,
                );
                // Follow-up time summary
                const followUpDuration = followUpServices.reduce(
                  (sum, s) => sum + (s.duration_minutes || 0) * s.quantity,
                  0,
                );
                let followUpEndTime: string | null = null;
                if (followUpTime && followUpDuration > 0) {
                  const [fh, fm] = followUpTime.split(":").map(Number);
                  const totalMin = fh * 60 + fm + followUpDuration;
                  followUpEndTime = `${Math.floor(totalMin / 60)
                    .toString()
                    .padStart(
                      2,
                      "0",
                    )}:${(totalMin % 60).toString().padStart(2, "0")}`;
                }

                const totalAll = totalServices + totalMed + totalFollowUp;

                const hasAnything =
                  totalAll > 0 ||
                  validServices.length > 0 ||
                  existingBillingMedItems.length > 0 ||
                  newMedCosts.length > 0 ||
                  validFollowUp.length > 0;
                if (!hasAnything) return null;

                return (
                  <Card className="border-primary/20 bg-primary/5">
                    <CardContent className="p-4 space-y-2">
                      <h4 className="font-semibold text-sm flex items-center gap-2">
                        <FileText className="w-4 h-4 text-primary" />
                        สรุปค่าใช้จ่าย
                      </h4>
                      {validServices.length > 0 && (
                        <>
                          <p className="text-xs text-muted-foreground font-medium">
                            ค่าบริการ (การรักษาครั้งนี้):
                          </p>
                          {validServices.map((s, i) => (
                            <div
                              key={`svc-${i}`}
                              className="flex justify-between text-sm"
                            >
                              <span className="truncate mr-2">
                                {s.service_name} x{s.quantity}
                              </span>
                              <span className="whitespace-nowrap">
                                {(s.quantity * s.unit_price).toLocaleString()}{" "}
                                บาท
                              </span>
                            </div>
                          ))}
                        </>
                      )}
                      {existingBillingMedItems.length > 0 && (
                        <>
                          <p className="text-xs text-muted-foreground font-medium pt-1">
                            ยาที่สั่งไว้เดิม:
                          </p>
                          {existingBillingMedItems.map((m, i) => (
                            <div
                              key={`existing-${i}`}
                              className="flex justify-between text-sm"
                            >
                              <span className="truncate mr-2">
                                {m.description} x{m.quantity}
                              </span>
                              <span className="whitespace-nowrap">
                                {m.total.toLocaleString()} บาท
                              </span>
                            </div>
                          ))}
                        </>
                      )}
                      {newMedCosts.length > 0 && (
                        <>
                          {existingBillingMedItems.length > 0 ? (
                            <p className="text-xs text-muted-foreground font-medium pt-1">
                              ยาที่เพิ่มใหม่:
                            </p>
                          ) : (
                            <p className="text-xs text-muted-foreground font-medium pt-1">
                              ค่ายา:
                            </p>
                          )}
                          {newMedCosts.map((m, i) => (
                            <div
                              key={`new-${i}`}
                              className="flex justify-between text-sm"
                            >
                              <span className="truncate mr-2">
                                ยา: {m.name} x{m.quantity}
                              </span>
                              <span className="whitespace-nowrap">
                                {m.total.toLocaleString()} บาท
                              </span>
                            </div>
                          ))}
                        </>
                      )}
                      {validFollowUp.length > 0 && (
                        <>
                          <p className="text-xs text-muted-foreground font-medium pt-1">
                            ค่าบริการ (นัดหมายครั้งถัดไป):
                          </p>
                          {validFollowUp.map((s, i) => (
                            <div
                              key={`fu-${i}`}
                              className="flex justify-between text-sm"
                            >
                              <span className="truncate mr-2">
                                {s.service_name} x{s.quantity}
                              </span>
                              <span className="whitespace-nowrap">
                                {(s.quantity * s.unit_price).toLocaleString()}{" "}
                                บาท
                              </span>
                            </div>
                          ))}
                          {followUpTime &&
                            followUpDuration > 0 &&
                            followUpEndTime && (
                              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                <Clock className="w-3 h-3" />
                                <span>
                                  เวลานัด: {followUpTime} - {followUpEndTime} (
                                  {followUpDuration >= 60
                                    ? `${Math.floor(followUpDuration / 60)} ชม.${followUpDuration % 60 > 0 ? ` ${followUpDuration % 60} นาที` : ""}`
                                    : `${followUpDuration} นาที`}
                                  )
                                </span>
                              </div>
                            )}
                        </>
                      )}
                      <div className="border-t border-primary/20 pt-2 flex justify-between font-semibold">
                        <span>รวมทั้งหมด</span>
                        <span className="text-primary">
                          {totalAll.toLocaleString()} บาท
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                );
              })()}

              {/* Files */}
              {editingRecord && (
                <div className="pt-2">
                  <Label className="text-sm font-medium mb-2 block">
                    ไฟล์แนบ
                  </Label>
                  <TreatmentFiles
                    patientId={editingRecord.patient_id}
                    treatmentId={editingRecord.id}
                  />
                </div>
              )}

              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={handleCloseEdit}>
                  ยกเลิก
                </Button>
                <Button
                  className="bg-gradient-primary"
                  onClick={handleUpdate}
                  disabled={
                    updateTreatment.isPending || createPrescription.isPending
                  }
                >
                  {(updateTreatment.isPending ||
                    createPrescription.isPending) && (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  )}
                  บันทึกการแก้ไข
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={!!deleteTarget}
        onOpenChange={() => {
          setDeleteTarget(null);
          setDeletePassword("");
        }}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <ShieldAlert className="w-5 h-5" />
              ยืนยันการลบบันทึกการรักษา
            </DialogTitle>
          </DialogHeader>
          {deleteTarget && (
            <div className="space-y-4 pt-2">
              <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 text-sm space-y-1">
                <p className="font-semibold text-destructive">
                  ⚠️ การดำเนินการนี้ไม่สามารถย้อนกลับได้
                </p>
                <p>ระบบจะลบข้อมูลทั้งหมดที่เกี่ยวข้อง:</p>
                <ul className="list-disc list-inside text-muted-foreground text-xs space-y-0.5 ml-2">
                  <li>บันทึกการรักษา</li>
                  <li>ใบสั่งยาและรายการยา</li>
                  <li>ใบเสร็จและรายการค่าใช้จ่าย</li>
                </ul>
              </div>
              <div className="text-sm">
                <p className="text-muted-foreground">
                  ผู้ป่วย:{" "}
                  <span className="font-medium text-foreground">
                    {getPatientName(deleteTarget)}
                  </span>
                </p>
                <p className="text-muted-foreground">
                  วันที่รักษา:{" "}
                  <span className="font-medium text-foreground">
                    {formatDate(deleteTarget.treatment_date)}
                  </span>
                </p>
                {deleteTarget.diagnosis && (
                  <p className="text-muted-foreground">
                    การวินิจฉัย:{" "}
                    <span className="font-medium text-foreground">
                      {deleteTarget.diagnosis}
                    </span>
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label>กรุณากรอกรหัสผ่าน Admin เพื่อยืนยัน</Label>
                <Input
                  type="password"
                  placeholder="รหัสผ่านของคุณ"
                  value={deletePassword}
                  onChange={(e) => setDeletePassword(e.target.value)}
                  className="input-focus"
                />
              </div>
              <div className="flex gap-2 pt-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    setDeleteTarget(null);
                    setDeletePassword("");
                  }}
                >
                  ยกเลิก
                </Button>
                <Button
                  variant="destructive"
                  className="flex-1"
                  disabled={!deletePassword || deleteLoading}
                  onClick={handleDeleteConfirm}
                >
                  {deleteLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4 mr-2" />
                      ยืนยันลบ
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
};

export default Treatments;
