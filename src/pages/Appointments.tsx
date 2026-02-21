import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import {
  format,
  addDays,
  startOfWeek,
  addMonths,
  startOfMonth,
  endOfMonth,
  getDay,
  differenceInCalendarDays,
} from "date-fns";
import { th } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { sendAppointmentEmail } from "@/utils/appointmentEmail";
import { toast } from "sonner";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Clock,
  Filter,
  Loader2,
  CalendarIcon,
  X,
  Edit,
  Trash2,
  Ban,
  User,
  Search,
  LayoutGrid,
  List,
  Check,
  ChevronsUpDown,
  Printer,
  Download,
  MapPin,
  Users,
  Stethoscope,
} from "lucide-react";
import MainLayout from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";

import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  useWeekAppointments,
  useCreateAppointment,
  useUpdateAppointment,
  useDeleteAppointment,
  Appointment,
} from "@/hooks/useAppointments";
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
import { usePatients } from "@/hooks/usePatients";
import { useProviders } from "@/hooks/useProviders";
import {
  useCreateBilling,
  useUpdateBillingStatus,
  Billing,
} from "@/hooks/useBillings";
import ServiceSelector, {
  ServiceItem,
} from "@/components/treatments/ServiceSelector";
import { useServices } from "@/hooks/useServices";
import { useServiceLocations } from "@/hooks/useServiceLocations";
import { useGoogleCalendar } from "@/hooks/useGoogleCalendar";
import { useAuth } from "@/contexts/AuthContext";
import type { DateRange } from "react-day-picker";
import WeekTimeSlotView from "@/components/appointments/WeekTimeSlotView";
import { PROVIDER_COLORS } from "@/components/appointments/WeekTimeSlotView";
import type { BusySlot } from "@/components/ui/scroll-time-picker";
import DateTimeSlotPicker from "@/components/appointments/DateTimeSlotPicker";
import { useAllProviderSchedules } from "@/hooks/useProviderSchedules";

const CLINIC_INFO = {
  name: "Ranchu Center",
  subtitle: "คลินิกสุขภาพจิต",
  company: "บริษัท แทนปรางกรุ๊ป จำกัด เลขที่ผู้เสียภาษี 0105566165639",
  address: "646 ถนนเทศบาลนิมิตรเหนือ แขวงลาดยาว เขตจตุจักร กรุงเทพมหานคร 10900",
  phone: "082-387-9955",
};

const paymentMethodLabels: Record<string, string> = {
  cash: "เงินสด",
  transfer: "โอนเงิน",
  credit_card: "บัตรเครดิต",
  promptpay: "พร้อมเพย์",
};

const generateAppointmentReceiptHTML = (invoice: Billing) => {
  const patientName = invoice.patients
    ? `${invoice.patients.first_name} ${invoice.patients.last_name}`
    : "ไม่ทราบชื่อ";
  const patientHn = invoice.patients?.hn || "-";

  const itemsHTML = (invoice.billing_items || [])
    .map(
      (item) => `
        <tr>
          <td style="padding:6px 8px;border-bottom:1px solid #eee;">${item.description}</td>
          <td style="padding:6px 8px;border-bottom:1px solid #eee;text-align:center;">${item.quantity}</td>
          <td style="padding:6px 8px;border-bottom:1px solid #eee;text-align:right;">฿${item.unit_price.toLocaleString()}</td>
          <td style="padding:6px 8px;border-bottom:1px solid #eee;text-align:right;">฿${item.total.toLocaleString()}</td>
        </tr>`,
    )
    .join("");

  return `
<!DOCTYPE html>
<html lang="th">
<head>
  <meta charset="UTF-8">
  <title>ใบเสร็จรับเงิน - ${invoice.invoice_number}</title>
  <style>
    @media print { body { margin: 0; } .no-print { display: none !important; } }
    body { font-family: 'Sarabun', 'Noto Sans Thai', sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; color: #333; }
    .header { text-align: center; margin-bottom: 24px; border-bottom: 2px solid #333; padding-bottom: 16px; }
    .header h1 { margin: 0; font-size: 22px; }
    .header p { margin: 4px 0; font-size: 13px; color: #666; }
    .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 20px; font-size: 14px; }
    .info-label { color: #888; font-size: 12px; }
    table { width: 100%; border-collapse: collapse; margin: 16px 0; font-size: 14px; }
    th { background: #f5f5f5; padding: 8px; text-align: left; border-bottom: 2px solid #ddd; }
    th:nth-child(2), th:nth-child(3), th:nth-child(4) { text-align: center; }
    th:nth-child(3), th:nth-child(4) { text-align: right; }
    .total-section { text-align: right; margin-top: 16px; padding-top: 12px; border-top: 2px solid #333; }
    .total-amount { font-size: 20px; font-weight: bold; }
    .footer { text-align: center; margin-top: 40px; font-size: 12px; color: #888; border-top: 1px solid #eee; padding-top: 16px; }
  </style>
</head>
<body>
  <div class="header">
    <h1>${CLINIC_INFO.name}</h1>
    <p>${CLINIC_INFO.subtitle}</p>
    <p>${CLINIC_INFO.address}</p>
    <p>โทร: ${CLINIC_INFO.phone}</p>
  </div>
  <h2 style="text-align:center;margin-bottom:20px;">ใบเสร็จรับเงิน</h2>
  <div class="info-grid">
    <div>
      <p class="info-label">เลขที่ใบเสร็จ</p>
      <p style="font-family:monospace;font-weight:600;">${invoice.invoice_number}</p>
    </div>
    <div style="text-align:right;">
      <p class="info-label">วันที่</p>
      <p>${format(new Date(invoice.billing_date), "d MMMM yyyy", { locale: th })}</p>
    </div>
    <div>
      <p class="info-label">ผู้ป่วย</p>
      <p style="font-weight:600;">${patientName}</p>
      <p style="font-size:12px;color:#888;">HN: ${patientHn}</p>
    </div>
    <div style="text-align:right;">
      <p class="info-label">สถานะ</p>
      <span style="display:inline-block;padding:2px 10px;border-radius:12px;font-size:12px;background:#dcfce7;color:#16a34a;">ชำระแล้ว</span>
    </div>
  </div>
  <table>
    <thead>
      <tr>
        <th>รายการ</th>
        <th style="text-align:center;">จำนวน</th>
        <th style="text-align:right;">ราคา/หน่วย</th>
        <th style="text-align:right;">รวม</th>
      </tr>
    </thead>
    <tbody>
      ${itemsHTML || '<tr><td colspan="4" style="text-align:center;padding:16px;color:#888;">ไม่มีรายการ</td></tr>'}
    </tbody>
  </table>
  <div class="total-section">
    <span>รวมทั้งสิ้น: </span>
    <span class="total-amount">฿${invoice.total.toLocaleString()}</span>
  </div>
  ${invoice.payment_method ? `<div style="text-align:right;font-size:13px;color:#666;margin-top:8px;">ชำระโดย: ${paymentMethodLabels[invoice.payment_method] || invoice.payment_method}</div>` : ""}
  <div class="footer">
    <p>ขอบคุณที่ใช้บริการ ${CLINIC_INFO.name}</p>
    <p>เอกสารนี้ออกโดยระบบอัตโนมัติ</p>
  </div>
</body>
</html>`;
};

const typeLabels: Record<string, string> = {
  consultation: "ปรึกษา/บำบัด",
  assessment: "ตรวจประเมิน",
  follow_up: "ติดตามอาการ",
  diagnosis: "ตรวจวินิจฉัย",
};

const typeColors: Record<string, string> = {
  consultation:
    "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800",
  assessment:
    "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800",
  follow_up:
    "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800",
  diagnosis:
    "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800",
};

const statusLabels: Record<string, string> = {
  scheduled: "ทำนัดหมาย",
  confirmed: "ยืนยันนัดหมาย",
  completed: "เสร็จสิ้น",
  no_show: "ไม่มา",
  cancelled: "ยกเลิก",
};

const statusColors: Record<string, string> = {
  scheduled:
    "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300",
  confirmed:
    "bg-green-100 text-green-700 border-green-200 dark:bg-green-950/40 dark:text-green-300",
  completed:
    "bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-800/40 dark:text-gray-300",
  cancelled:
    "bg-red-100 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-300",
  no_show:
    "bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-950/40 dark:text-orange-300",
};

const Appointments = () => {
  const { isAdmin, isStaff, isDoctor, isTherapist, user, hasPermission } =
    useAuth();
  const isProvider = (isDoctor || isTherapist) && !isAdmin && !isStaff; // restrict only if no admin/staff role
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDoctor, setSelectedDoctor] = useState<string>(
    isProvider && user ? user.id : "all",
  );
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [viewMode, setViewMode] = useState<
    "calendar" | "day" | "list" | "month" | "provider"
  >("calendar");
  const [activeProviderIds, setActiveProviderIds] = useState<string[]>([]);
  const [isNewAppointmentOpen, setIsNewAppointmentOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selectedAppointment, setSelectedAppointment] =
    useState<Appointment | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);

  // Edit form state
  const [editDate, setEditDate] = useState("");
  const [editTime, setEditTime] = useState("");
  const [editType, setEditType] = useState("");
  const [editStatus, setEditStatus] = useState("");
  const [editComplaint, setEditComplaint] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [editProvider, setEditProvider] = useState("");
  const [editServices, setEditServices] = useState<ServiceItem[]>([]);
  const [appointmentBillingId, setAppointmentBillingId] = useState<
    string | null
  >(null);
  const [billingPaymentStatus, setBillingPaymentStatus] =
    useState<string>("pending");
  const [paymentMethod, setPaymentMethod] = useState<string>("cash");
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [paidBillingData, setPaidBillingData] = useState<Billing | null>(null);

  // New appointment form state
  const [selectedPatient, setSelectedPatient] = useState<string>("");
  const [patientPopoverOpen, setPatientPopoverOpen] = useState(false);
  const [appointmentDate, setAppointmentDate] = useState<string>("");
  const [appointmentTime, setAppointmentTime] = useState<string>("");
  const [appointmentType, setAppointmentType] = useState<string>("");
  const [appointmentProvider, setAppointmentProvider] = useState<string>(
    isProvider && user ? user.id : "",
  );
  const [chiefComplaint, setChiefComplaint] = useState<string>("");
  const [selectedServices, setSelectedServices] = useState<ServiceItem[]>([]);
  const [selectedLocationId, setSelectedLocationId] = useState<string>("");
  const [editLocationId, setEditLocationId] = useState<string>("");
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [googleEvents, setGoogleEvents] = useState<
    Array<{
      id: string;
      summary: string;
      start: string;
      end: string;
      status: string;
      provider_id?: string;
    }>
  >([]);

  // Compute display range
  const isCustomRange = dateRange?.from && dateRange?.to;
  const weekStart = isCustomRange
    ? dateRange.from!
    : viewMode === "month"
      ? startOfMonth(currentDate)
      : viewMode === "day" || viewMode === "provider"
        ? currentDate
        : startOfWeek(currentDate, { weekStartsOn: 1 });
  const weekEnd = isCustomRange
    ? dateRange.to!
    : viewMode === "month"
      ? endOfMonth(currentDate)
      : viewMode === "day" || viewMode === "provider"
        ? currentDate
        : addDays(startOfWeek(currentDate, { weekStartsOn: 1 }), 6);
  const totalDays = differenceInCalendarDays(weekEnd, weekStart) + 1;
  const displayDays = Array.from({ length: totalDays }, (_, i) =>
    addDays(weekStart, i),
  );

  const { data: appointments = [], isLoading } = useWeekAppointments(
    format(weekStart, "yyyy-MM-dd"),
    format(weekEnd, "yyyy-MM-dd"),
  );
  const { data: patients = [] } = usePatients();
  const { data: providers = [] } = useProviders();
  const queryClient = useQueryClient();
  const createAppointment = useCreateAppointment();
  const updateAppointment = useUpdateAppointment();
  const deleteAppointment = useDeleteAppointment();
  const createBilling = useCreateBilling();
  const updateBillingStatus = useUpdateBillingStatus();
  const { data: allServices = [] } = useServices(false);
  const { data: serviceLocations = [] } = useServiceLocations(false);
  const googleCalendar = useGoogleCalendar();
  const { data: providerSchedules = [] } = useAllProviderSchedules();

  // Fetch billing items for all appointments in range (for list view service display)
  const appointmentIds = appointments.map((a) => a.id);
  const { data: allBillingsForRange = [] } = useQuery({
    queryKey: ["billings-for-appointments", appointmentIds],
    queryFn: async () => {
      if (appointmentIds.length === 0) return [];
      const { data, error } = await supabase
        .from("billings")
        .select("appointment_id, billing_items(description, item_type)")
        .in("appointment_id", appointmentIds);
      if (error) throw error;
      return data || [];
    },
    enabled: appointmentIds.length > 0,
  });

  // Fetch linked treatment for selected appointment
  const { data: linkedTreatment } = useQuery({
    queryKey: ["linked-treatment", selectedAppointment?.id],
    queryFn: async () => {
      if (!selectedAppointment?.id) return null;
      const { data, error } = await supabase
        .from("treatments")
        .select(
          "id, treatment_date, diagnosis, symptoms, treatment_plan, clinical_notes, provider_id",
        )
        .eq("appointment_id", selectedAppointment.id)
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;
      // fetch provider name
      let providerName: string | null = null;
      if (data.provider_id) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("user_id", data.provider_id)
          .maybeSingle();
        providerName = profile?.full_name || null;
      }
      return { ...data, provider_name: providerName };
    },
    enabled: !!selectedAppointment?.id,
  });

  const getServiceNamesForAppointment = (appointmentId: string): string[] => {
    const billing = allBillingsForRange.find(
      (b: any) => b.appointment_id === appointmentId,
    );
    if (!billing || !billing.billing_items) return [];
    return billing.billing_items
      .filter((bi: any) =>
        ["treatment", "consultation", "procedure"].includes(bi.item_type),
      )
      .map((bi: any) => bi.description);
  };

  // Fetch Google Calendar events for display
  useEffect(() => {
    const startDate = format(weekStart, "yyyy-MM-dd");
    const endDate = format(weekEnd, "yyyy-MM-dd");

    if (isAdmin || isStaff) {
      // Admin/Staff: fetch events from ALL providers' calendars
      googleCalendar
        .fetchAllProvidersEvents(startDate, endDate)
        .then((eventsByProvider) => {
          const allEvents: Array<{
            id: string;
            summary: string;
            start: string;
            end: string;
            status: string;
            provider_id?: string;
          }> = [];
          Object.entries(eventsByProvider).forEach(([providerId, data]) => {
            (data.events || []).forEach((event) => {
              allEvents.push({ ...event, provider_id: providerId });
            });
          });
          setGoogleEvents(allEvents);
        });
    } else if (googleCalendar.status.connected) {
      // Doctor/Therapist: fetch only own events
      googleCalendar.fetchGoogleEvents(startDate, endDate).then((events) => {
        setGoogleEvents(
          (events || []).map((e) => ({ ...e, provider_id: user?.id })),
        );
      });
    } else {
      setGoogleEvents([]);
    }
  }, [
    isAdmin,
    isStaff,
    isProvider,
    googleCalendar.status.connected,
    weekStart,
    weekEnd,
  ]);

  // Auto-open new appointment dialog with pre-selected patient from URL
  useEffect(() => {
    const patientId = searchParams.get("patient_id");
    const action = searchParams.get("action");
    const googleConnected = searchParams.get("google_connected");
    const appointmentId = searchParams.get("appointment_id");

    if (googleConnected === "true") {
      googleCalendar.refreshStatus();
      setSearchParams({}, { replace: true });
    }

    if (appointmentId) {
      // Fetch the specific appointment and open its detail
      const fetchAndOpen = async () => {
        const { data } = await supabase
          .from("appointments")
          .select(
            `
            *,
            patients (id, hn, first_name, last_name, phone, id_card),
            service_locations (id, name, address)
          `,
          )
          .eq("id", appointmentId)
          .maybeSingle();
        if (data) {
          openDetail(data as Appointment);
          setSearchParams({}, { replace: true });
        }
      };
      fetchAndOpen();
      return;
    }

    if (patientId && action === "new" && patients.length > 0) {
      const found = patients.find((p) => p.id === patientId);
      if (found) {
        setSelectedPatient(patientId);
        setIsNewAppointmentOpen(true);
        setSearchParams({}, { replace: true });
      }
    }
  }, [searchParams, patients]);

  const navigateWeek = (direction: "prev" | "next") => {
    if (isCustomRange) {
      setDateRange(undefined);
    }
    if (viewMode === "month") {
      setCurrentDate((prev) => addMonths(prev, direction === "next" ? 1 : -1));
    } else if (viewMode === "day" || viewMode === "provider") {
      setCurrentDate((prev) => addDays(prev, direction === "next" ? 1 : -1));
    } else {
      setCurrentDate((prev) => addDays(prev, direction === "next" ? 7 : -7));
    }
  };

  const getAppointmentsForDate = (date: Date): Appointment[] => {
    const dateKey = format(date, "yyyy-MM-dd");
    let filtered = appointments.filter(
      (apt) => apt.appointment_date === dateKey,
    );
    if (statusFilter !== "all") {
      filtered = filtered.filter((apt) => apt.status === statusFilter);
    }
    if (typeFilter !== "all") {
      filtered = filtered.filter((apt) => apt.appointment_type === typeFilter);
    }
    if (selectedDoctor !== "all") {
      filtered = filtered.filter((apt) => apt.provider_id === selectedDoctor);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      filtered = filtered.filter((apt) => {
        const p = apt.patients;
        if (!p) return false;
        return (
          p.first_name?.toLowerCase().includes(q) ||
          p.last_name?.toLowerCase().includes(q) ||
          `${p.first_name} ${p.last_name}`.toLowerCase().includes(q) ||
          p.hn?.toLowerCase().includes(q) ||
          p.phone?.includes(q) ||
          p.id_card?.toLowerCase().includes(q)
        );
      });
    }
    return filtered;
  };

  // Get Google Calendar events for a specific date (excluding events that match app appointments)
  const getGoogleEventsForDate = (date: Date) => {
    const dateKey = format(date, "yyyy-MM-dd");
    return googleEvents
      .filter((event) => {
        if (!event.start || event.status === "cancelled") return false;
        const eventDate = event.start.substring(0, 10);
        return eventDate === dateKey;
      })
      .filter((event) => {
        // Exclude events that were synced from this app (they have matching google_event_id)
        return !appointments.some((apt) => apt.google_event_id === event.id);
      })
      .filter((event) => {
        // Filter by selected provider (doctor filter) - only show events for the selected provider
        if (selectedDoctor !== "all") {
          return event.provider_id === selectedDoctor;
        }
        return true;
      });
  };

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`;
  };

  // Compute busy slots for a given provider + date
  const getBusySlotsForProvider = (
    providerId: string | null,
    date: string,
    excludeAptId?: string,
  ): BusySlot[] => {
    if (!providerId || !date) return [];
    const busy: BusySlot[] = [];

    // Google Calendar events
    const providerGoogleEvents = googleEvents
      .filter((ge) => {
        if (!ge.start || ge.status === "cancelled") return false;
        if (ge.provider_id && ge.provider_id !== providerId) return false;
        return ge.start.substring(0, 10) === date;
      })
      .filter(
        (ge) => !appointments.some((apt) => apt.google_event_id === ge.id),
      );

    for (const ge of providerGoogleEvents) {
      const geStart =
        ge.start.length > 10 ? ge.start.substring(11, 16) : "00:00";
      const geEnd = ge.end.length > 10 ? ge.end.substring(11, 16) : "23:59";
      // Generate all 30-min slots within this event
      const [sh, sm] = geStart.split(":").map(Number);
      const [eh, em] = geEnd.split(":").map(Number);
      const startMin = sh * 60 + sm;
      const endMin = eh * 60 + em;
      for (let t = startMin; t < endMin; t += 30) {
        const hh = Math.floor(t / 60)
          .toString()
          .padStart(2, "0");
        const mm = (t % 60).toString().padStart(2, "0");
        busy.push({
          time: `${hh}:${mm}`,
          reason: ge.summary || "ไม่ว่าง (Google Calendar)",
        });
      }
    }

    // Existing appointments
    const providerApts = appointments.filter(
      (apt) =>
        apt.provider_id === providerId &&
        apt.appointment_date === date &&
        apt.status !== "cancelled" &&
        apt.id !== excludeAptId,
    );
    for (const apt of providerApts) {
      const aptStart = apt.start_time.substring(0, 5);
      const aptEnd = apt.end_time
        ? apt.end_time.substring(0, 5)
        : (() => {
            const [h, m] = aptStart.split(":").map(Number);
            const endMin = h * 60 + m + 30;
            return `${Math.floor(endMin / 60)
              .toString()
              .padStart(2, "0")}:${(endMin % 60).toString().padStart(2, "0")}`;
          })();
      const [sh, sm] = aptStart.split(":").map(Number);
      const [eh, em] = aptEnd.split(":").map(Number);
      const startMin = sh * 60 + sm;
      const endMin = eh * 60 + em;
      const name =
        `${apt.patients?.first_name || ""} ${apt.patients?.last_name || ""}`.trim() ||
        "มีนัดหมายแล้ว";
      for (let t = startMin; t < endMin; t += 30) {
        const hh = Math.floor(t / 60)
          .toString()
          .padStart(2, "0");
        const mm = (t % 60).toString().padStart(2, "0");
        busy.push({ time: `${hh}:${mm}`, reason: name });
      }
    }

    // Provider schedule blocking - mark slots outside working hours
    const dateObj = new Date(date + "T00:00:00");
    const dayOfWeek = dateObj.getDay(); // 0=Sunday
    const providerDaySchedules = providerSchedules.filter(
      (s) =>
        s.provider_id === providerId &&
        s.day_of_week === dayOfWeek &&
        s.is_active,
    );
    const hasAnySchedule = providerSchedules.some(
      (s) => s.provider_id === providerId && s.is_active,
    );

    if (hasAnySchedule && providerDaySchedules.length > 0) {
      // Block times outside working hours
      const busyTimes = new Set(busy.map((b) => b.time));
      for (let h = 9; h < 20; h++) {
        for (let m = 0; m < 60; m += 30) {
          const timeStr = `${h.toString().padStart(2, "0")}:${(m % 60).toString().padStart(2, "0")}`;
          if (busyTimes.has(timeStr)) continue;
          const withinSchedule = providerDaySchedules.some((s) => {
            const sStart = s.start_time.substring(0, 5);
            const sEnd = s.end_time.substring(0, 5);
            return timeStr >= sStart && timeStr < sEnd;
          });
          if (!withinSchedule) {
            busy.push({ time: timeStr, reason: "นอกเวลาทำงาน" });
          }
        }
      }
    } else if (hasAnySchedule && providerDaySchedules.length === 0) {
      // Provider doesn't work on this day - block all slots
      for (let h = 9; h < 20; h++) {
        for (let m = 0; m < 60; m += 30) {
          const timeStr = `${h.toString().padStart(2, "0")}:${(m % 60).toString().padStart(2, "0")}`;
          busy.push({ time: timeStr, reason: "ไม่ได้ทำงานวันนี้" });
        }
      }
    }

    return busy;
  };

  const openDetail = async (apt: Appointment) => {
    setSelectedAppointment(apt);
    setEditDate(apt.appointment_date);
    setEditTime(apt.start_time.slice(0, 5));
    setEditType(apt.appointment_type || "consultation");
    setEditStatus(apt.status || "scheduled");
    setEditComplaint(apt.chief_complaint || "");
    setEditNotes(apt.notes || "");
    setEditProvider(apt.provider_id || "");
    setEditLocationId(apt.location_id || "");
    setIsEditing(false);
    setIsDetailOpen(true);

    // Fetch billing + items for this appointment
    setEditServices([]);
    setAppointmentBillingId(null);
    setBillingPaymentStatus("pending");
    setPaymentMethod("cash");
    setPaidBillingData(null);
    const { data: billings } = await supabase
      .from("billings")
      .select("id, payment_status, total, billing_items(*)")
      .eq("appointment_id", apt.id)
      .limit(1);

    if (billings && billings.length > 0) {
      const billing = billings[0];
      setAppointmentBillingId(billing.id);
      setAppointmentBillingId(billing.id);
      setBillingPaymentStatus(billing.payment_status || "pending");
      const items: ServiceItem[] = (billing.billing_items || [])
        .filter(
          (bi: any) =>
            bi.item_type === "treatment" ||
            bi.item_type === "consultation" ||
            bi.item_type === "procedure",
        )
        .map((bi: any) => {
          // Match back to service by name to get service_id and duration
          const matchedService = allServices.find(
            (s) => s.name === bi.description,
          );
          return {
            service_id: matchedService?.id || "",
            service_name: bi.description,
            quantity: bi.quantity,
            unit_price: bi.unit_price,
            duration_minutes: matchedService?.duration_minutes || null,
          };
        });
      setEditServices(items);

      // If already paid, fetch full billing for receipt
      if (billing.payment_status === "paid") {
        const { data: fullBilling } = await supabase
          .from("billings")
          .select(
            "*, patients(id, hn, first_name, last_name, phone, id_card), billing_items(*)",
          )
          .eq("id", billing.id)
          .single();
        if (fullBilling) {
          setPaidBillingData(fullBilling as Billing);
        }
      }
    }
  };

  const handleUpdate = async () => {
    if (!selectedAppointment) return;

    // Calculate end_time from edit services
    const totalDuration = editServices.reduce(
      (sum, s) => sum + (s.duration_minutes || 0) * s.quantity,
      0,
    );
    let calculatedEndTime: string | null = selectedAppointment.end_time;
    if (editTime && totalDuration > 0) {
      const [h, m] = editTime.split(":").map(Number);
      const totalMin = h * 60 + m + totalDuration;
      const endH = Math.floor(totalMin / 60) % 24;
      const endM = totalMin % 60;
      calculatedEndTime = `${endH.toString().padStart(2, "0")}:${endM.toString().padStart(2, "0")}`;
    }

    updateAppointment.mutate(
      {
        id: selectedAppointment.id,
        input: {
          appointment_date: editDate,
          start_time: editTime,
          end_time: calculatedEndTime,
          appointment_type: editType,
          status: editStatus,
          chief_complaint: editComplaint || null,
          notes: editNotes || null,
          provider_id:
            editProvider && editProvider !== "none" ? editProvider : null,
          location_id:
            editLocationId && editLocationId !== "none" ? editLocationId : null,
        },
      },
      {
        onSuccess: async () => {
          // Send email if status changed to confirmed
          if (
            editStatus === "confirmed" &&
            selectedAppointment.status !== "confirmed"
          ) {
            sendAppointmentEmail(selectedAppointment.id, "confirmed");
          }
          // Sync billing items
          const serviceItems = editServices.filter(
            (s) => s.service_name && s.unit_price > 0,
          );
          const subtotal = serviceItems.reduce(
            (sum, s) => sum + s.quantity * s.unit_price,
            0,
          );

          if (appointmentBillingId) {
            // Delete old items and insert new
            await supabase
              .from("billing_items")
              .delete()
              .eq("billing_id", appointmentBillingId)
              .in("item_type", ["treatment", "consultation", "procedure"]);
            if (serviceItems.length > 0) {
              await supabase.from("billing_items").insert(
                serviceItems.map((s) => ({
                  billing_id: appointmentBillingId,
                  description: s.service_name,
                  item_type: "treatment",
                  quantity: s.quantity,
                  unit_price: s.unit_price,
                  total: s.quantity * s.unit_price,
                })),
              );
              // Recalculate billing total (keep non-service items)
              const { data: remainingItems } = await supabase
                .from("billing_items")
                .select("total")
                .eq("billing_id", appointmentBillingId);
              const newTotal = (remainingItems || []).reduce(
                (s, i) => s + i.total,
                0,
              );
              await supabase
                .from("billings")
                .update({ subtotal: newTotal, total: newTotal })
                .eq("id", appointmentBillingId);
            } else {
              // No services left, update billing total to reflect remaining items
              const { data: remainingItems } = await supabase
                .from("billing_items")
                .select("total")
                .eq("billing_id", appointmentBillingId);
              const newTotal = (remainingItems || []).reduce(
                (s, i) => s + i.total,
                0,
              );
              await supabase
                .from("billings")
                .update({ subtotal: newTotal, total: newTotal })
                .eq("id", appointmentBillingId);
            }
          } else if (serviceItems.length > 0) {
            // Create new billing
            await createBilling.mutateAsync({
              billing: {
                patient_id: selectedAppointment.patient_id,
                appointment_id: selectedAppointment.id,
                subtotal,
                total: subtotal,
                payment_status: "pending",
              },
              items: serviceItems.map((s) => ({
                description: s.service_name,
                item_type: "treatment",
                quantity: s.quantity,
                unit_price: s.unit_price,
                total: s.quantity * s.unit_price,
              })),
            });
          }

          // Sync update to provider's Google Calendar
          const targetProvider =
            editProvider && editProvider !== "none" ? editProvider : null;
          if (targetProvider) {
            const patient = patients.find(
              (p) => p.id === selectedAppointment.patient_id,
            );
            const location = serviceLocations.find(
              (l) => l.id === editLocationId,
            );
            googleCalendar.syncToGoogle(
              selectedAppointment.id,
              {
                appointment_date: editDate,
                start_time: editTime,
                end_time: calculatedEndTime,
                appointment_type: editType,
                chief_complaint: editComplaint || null,
                notes: editNotes || null,
                patient_name: patient
                  ? `${patient.first_name} ${patient.last_name}`
                  : undefined,
                patient_hn: patient?.hn,
                google_event_id: selectedAppointment.google_event_id,
                location_name: location?.name || null,
              },
              targetProvider,
            );
          }

          setIsEditing(false);
          setIsDetailOpen(false);
        },
      },
    );
  };

  const handlePrintReceipt = (billing: Billing) => {
    const html = generateAppointmentReceiptHTML(billing);
    const printWindow = window.open("", "_blank");
    if (printWindow) {
      printWindow.document.write(html);
      printWindow.document.close();
      printWindow.onload = () => printWindow.print();
    }
  };

  const handleDownloadReceipt = (billing: Billing) => {
    const html = generateAppointmentReceiptHTML(billing);
    const blob = new Blob([html], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `receipt-${billing.invoice_number}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handlePayment = async () => {
    if (!selectedAppointment || !appointmentBillingId) return;
    setIsProcessingPayment(true);
    try {
      const subtotal = editServices.reduce(
        (sum, s) => sum + s.quantity * s.unit_price,
        0,
      );
      await updateBillingStatus.mutateAsync({
        id: appointmentBillingId,
        payment_status: "paid",
        payment_method: paymentMethod,
        paid_amount: subtotal,
      });
      // Auto-confirm appointment
      await updateAppointment.mutateAsync({
        id: selectedAppointment.id,
        input: { status: "confirmed" },
      });
      // Send confirmation email
      sendAppointmentEmail(selectedAppointment.id, "confirmed");
      setBillingPaymentStatus("paid");

      // Fetch full billing data for receipt
      const { data: billingData } = await supabase
        .from("billings")
        .select(
          "*, patients(id, hn, first_name, last_name, phone, id_card), billing_items(*)",
        )
        .eq("id", appointmentBillingId)
        .single();
      if (billingData) {
        setPaidBillingData(billingData as Billing);
      }
    } catch (err) {
      console.error("Payment error:", err);
    } finally {
      setIsProcessingPayment(false);
    }
  };

  const handleCancel = () => {
    if (!selectedAppointment) return;
    // Delete from provider's Google Calendar when cancelling
    const providerId = selectedAppointment.provider_id;
    if (providerId && selectedAppointment.google_event_id) {
      googleCalendar.deleteFromGoogle(selectedAppointment.id, providerId);
    }
    // Delete Google Meet if exists
    if (selectedAppointment.google_meet_event_id) {
      googleCalendar.deleteMeet(selectedAppointment.id);
    }
    updateAppointment.mutate(
      {
        id: selectedAppointment.id,
        input: { status: "cancelled", meet_link: null },
      },
      {
        onSuccess: () => {
          setIsDetailOpen(false);
        },
      },
    );
  };

  const handleDelete = () => {
    if (!selectedAppointment) return;
    // Send cancellation email before deleting
    sendAppointmentEmail(selectedAppointment.id, "cancelled");
    // Delete from provider's Google Calendar
    const providerId = selectedAppointment.provider_id;
    if (providerId) {
      googleCalendar.deleteFromGoogle(selectedAppointment.id, providerId);
    }
    // Delete Meet event if exists
    if (selectedAppointment.google_meet_event_id) {
      googleCalendar.deleteMeet(selectedAppointment.id);
    }
    deleteAppointment.mutate(selectedAppointment.id, {
      onSuccess: () => {
        setIsDeleteDialogOpen(false);
        setIsDetailOpen(false);
      },
    });
  };

  const handleSubmit = async () => {
    if (
      !selectedPatient ||
      !appointmentDate ||
      !appointmentTime ||
      !appointmentType ||
      !appointmentProvider ||
      appointmentProvider === "none"
    ) {
      return;
    }

    // Calculate end_time from service durations
    const totalDuration = selectedServices.reduce(
      (sum, s) => sum + (s.duration_minutes || 0) * s.quantity,
      0,
    );
    let calculatedEndTime: string | null = null;
    if (appointmentTime && totalDuration > 0) {
      const [h, m] = appointmentTime.split(":").map(Number);
      const totalMin = h * 60 + m + totalDuration;
      const endH = Math.floor(totalMin / 60) % 24;
      const endM = totalMin % 60;
      calculatedEndTime = `${endH.toString().padStart(2, "0")}:${endM.toString().padStart(2, "0")}`;
    }

    createAppointment.mutate(
      {
        patient_id: selectedPatient,
        appointment_date: appointmentDate,
        start_time: appointmentTime,
        end_time: calculatedEndTime,
        appointment_type: appointmentType,
        chief_complaint: chiefComplaint || null,
        provider_id:
          appointmentProvider && appointmentProvider !== "none"
            ? appointmentProvider
            : null,
        location_id:
          selectedLocationId && selectedLocationId !== "none"
            ? selectedLocationId
            : null,
      },
      {
        onSuccess: async (data) => {
          // Auto-create billing if services selected
          if (selectedServices.length > 0) {
            const billingItems = selectedServices
              .filter((s) => s.service_id && s.unit_price > 0)
              .map((s) => ({
                description: s.service_name,
                item_type: "treatment",
                quantity: s.quantity,
                unit_price: s.unit_price,
                total: s.quantity * s.unit_price,
              }));

            if (billingItems.length > 0) {
              const subtotal = billingItems.reduce(
                (sum, item) => sum + item.total,
                0,
              );
              await createBilling.mutateAsync({
                billing: {
                  patient_id: selectedPatient,
                  appointment_id: data?.id || null,
                  subtotal,
                  total: subtotal,
                  payment_status: "pending",
                },
                items: billingItems,
              });
            }
          }

          // Sync to Google Calendar (to the provider's calendar)
          const targetProviderId =
            appointmentProvider && appointmentProvider !== "none"
              ? appointmentProvider
              : null;
          if (data?.id && targetProviderId) {
            const patient = patients.find((p) => p.id === selectedPatient);
            const location = serviceLocations.find(
              (l) => l.id === selectedLocationId,
            );
            googleCalendar.syncToGoogle(
              data.id,
              {
                appointment_date: appointmentDate,
                start_time: appointmentTime,
                end_time: calculatedEndTime,
                appointment_type: appointmentType,
                chief_complaint: chiefComplaint || null,
                patient_name: patient
                  ? `${patient.first_name} ${patient.last_name}`
                  : undefined,
                patient_hn: patient?.hn,
                location_name: location?.name || null,
              },
              targetProviderId,
            );
          }

          // Auto-create Google Meet for online appointments
          const hasOnlineService = selectedServices.some((s) => {
            const svc = allServices.find((as) => as.id === s.service_id);
            return svc?.service_mode === "online";
          });
          if (data?.id && hasOnlineService) {
            const patient = patients.find((p) => p.id === selectedPatient);
            const providerProfile = providers.find(
              (p) => p.user_id === appointmentProvider,
            );
            const serviceName = selectedServices
              .map((s) => s.service_name)
              .join(", ");
            const meetLink = await googleCalendar.createMeet(
              data.id,
              {
                appointment_date: appointmentDate,
                start_time: appointmentTime,
                end_time: calculatedEndTime,
                patient_name: patient
                  ? `${patient.first_name} ${patient.last_name}`
                  : undefined,
                patient_hn: patient?.hn,
                patient_email: patient?.email,
                provider_name: providerProfile?.full_name,
                service_name: serviceName,
              },
              appointmentProvider,
            );
            if (meetLink) {
              await supabase
                .from("appointments")
                .update({ meet_link: meetLink })
                .eq("id", data.id);
              queryClient.invalidateQueries({ queryKey: ["appointments"] });
            }
          }

          // Send email AFTER meet link is created so it's included in the email
          if (data?.id) {
            sendAppointmentEmail(data.id, "created");
          }

          setIsNewAppointmentOpen(false);
          setSelectedPatient("");
          setAppointmentDate("");
          setAppointmentTime("");
          setAppointmentType("");
          setAppointmentProvider("");
          setChiefComplaint("");
          setSelectedServices([]);
          setSelectedLocationId("");
        },
      },
    );
  };

  const handleDateRangeSelect = (range: DateRange | undefined) => {
    setDateRange(range);
    if (range?.from && range?.to) {
      setIsDatePickerOpen(false);
    }
  };

  const clearDateRange = () => {
    setDateRange(undefined);
  };

  return (
    <MainLayout title="ตารางนัดหมาย">
      {/* Search + View Toggle */}
      <div className="flex gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="ค้นหาชื่อ, HN, เบอร์โทร, เลขบัตรประชาชน..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 input-focus"
          />
        </div>
        <div className="flex border rounded-md overflow-hidden">
          <Button
            variant={viewMode === "day" ? "default" : "ghost"}
            size="icon"
            className="rounded-none h-10 w-10"
            onClick={() => setViewMode("day")}
            title="มุมมองรายวัน"
          >
            <Clock className="w-4 h-4" />
          </Button>
          <Button
            variant={viewMode === "calendar" ? "default" : "ghost"}
            size="icon"
            className="rounded-none h-10 w-10"
            onClick={() => setViewMode("calendar")}
            title="มุมมองสัปดาห์"
          >
            <LayoutGrid className="w-4 h-4" />
          </Button>
          <Button
            variant={viewMode === "month" ? "default" : "ghost"}
            size="icon"
            className="rounded-none h-10 w-10"
            onClick={() => setViewMode("month")}
            title="มุมมองเดือน"
          >
            <CalendarIcon className="w-4 h-4" />
          </Button>
          <Button
            variant={viewMode === "list" ? "default" : "ghost"}
            size="icon"
            className="rounded-none h-10 w-10"
            onClick={() => setViewMode("list")}
            title="มุมมองรายการ"
          >
            <List className="w-4 h-4" />
          </Button>
          {!isProvider && (
            <Button
              variant={viewMode === "provider" ? "default" : "ghost"}
              size="icon"
              className="rounded-none h-10 w-10"
              onClick={() => {
                setViewMode("provider");
                if (activeProviderIds.length === 0 && providers.length > 0) {
                  setActiveProviderIds(providers.map((p) => p.user_id));
                }
              }}
              title="มุมมองแยกผู้ให้บริการ"
            >
              <Users className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Header Controls */}
      <div className="flex items-center gap-2 mb-6 flex-wrap">
        {/* Date Navigation */}
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="icon"
            className="h-9 w-9"
            onClick={() => navigateWeek("prev")}
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <div className="min-w-[180px] text-center">
            <h2 className="font-semibold text-sm">
              {viewMode === "month"
                ? format(currentDate, "MMMM yyyy", { locale: th })
                : viewMode === "day" || viewMode === "provider"
                  ? format(currentDate, "d MMMM yyyy", { locale: th })
                  : `${format(weekStart, "d MMM", { locale: th })} - ${format(weekEnd, "d MMM yyyy", { locale: th })}`}
            </h2>
          </div>
          <Button
            variant="outline"
            size="icon"
            className="h-9 w-9"
            onClick={() => navigateWeek("next")}
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="h-9"
          onClick={() => {
            setCurrentDate(new Date());
            setDateRange(undefined);
          }}
        >
          วันนี้
        </Button>

        <div className="h-6 w-px bg-border mx-1 hidden sm:block" />

        {/* Filters */}
        {/* Date Range Picker */}
        <Popover open={isDatePickerOpen} onOpenChange={setIsDatePickerOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="h-9 gap-2">
              <CalendarIcon className="w-4 h-4" />
              {isCustomRange
                ? `${format(dateRange.from!, "d MMM", { locale: th })} - ${format(dateRange.to!, "d MMM", { locale: th })}`
                : "เลือกช่วงวันที่"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="end">
            <Calendar
              mode="range"
              selected={dateRange}
              onSelect={handleDateRangeSelect}
              numberOfMonths={2}
              className="p-3 pointer-events-auto"
            />
          </PopoverContent>
        </Popover>
        {isCustomRange && (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={clearDateRange}
          >
            <X className="w-4 h-4" />
          </Button>
        )}

        {/* Type Filter */}
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-36 h-9">
            <Filter className="w-4 h-4 mr-1" />
            <SelectValue placeholder="ประเภท" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">ทุกประเภท</SelectItem>
            <SelectItem value="consultation">ปรึกษา/บำบัด</SelectItem>
            <SelectItem value="assessment">ตรวจประเมิน</SelectItem>
            <SelectItem value="follow_up">ติดตามอาการ</SelectItem>
            <SelectItem value="diagnosis">ตรวจวินิจฉัย</SelectItem>
          </SelectContent>
        </Select>

        {/* Status Filter */}
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-36 h-9">
            <Filter className="w-4 h-4 mr-1" />
            <SelectValue placeholder="สถานะ" />
            <span className="mr-20" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">ทุกสถานะ</SelectItem>
            {Object.entries(statusLabels).map(([key, label]) => (
              <SelectItem key={key} value={key}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Doctor Filter - hidden for doctor/therapist (they only see their own) */}
        {!isProvider ? (
          <Select value={selectedDoctor} onValueChange={setSelectedDoctor}>
            <SelectTrigger className="w-40 h-9">
              <User className="w-4 h-4 mr-1" />
              <SelectValue placeholder="ผู้ให้บริการ" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">ทุกผู้ให้บริการ</SelectItem>
              {providers.map((provider) => (
                <SelectItem key={provider.user_id} value={provider.user_id}>
                  {provider.full_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <div className="flex items-center gap-2 h-9 px-3 rounded-md border bg-muted text-sm text-muted-foreground">
            <User className="w-4 h-4" />
            <span>
              {providers.find((p) => p.user_id === user?.id)?.full_name ||
                "ตารางของฉัน"}
            </span>
          </div>
        )}

        {/* Google Calendar Connection */}
        {googleCalendar.status.connected ? (
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="h-9 gap-2 text-green-600 border-green-200"
              >
                <CalendarIcon className="w-4 h-4" />
                <span className="hidden sm:inline">
                  {googleCalendar.status.email || "Google Calendar"}
                </span>
                <span className="w-2 h-2 rounded-full bg-green-500" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64 p-3" align="end">
              <div className="space-y-2">
                <p className="text-sm font-medium">
                  เชื่อมต่อ Google Calendar แล้ว
                </p>
                <p className="text-xs text-muted-foreground">
                  {googleCalendar.status.email}
                </p>
                <Button
                  variant="destructive"
                  size="sm"
                  className="w-full"
                  onClick={googleCalendar.disconnect}
                >
                  ยกเลิกการเชื่อมต่อ
                </Button>
              </div>
            </PopoverContent>
          </Popover>
        ) : (
          <Button
            variant="outline"
            size="sm"
            className="h-9 gap-2"
            onClick={googleCalendar.connect}
          >
            <CalendarIcon className="w-4 h-4" />
            <span className="hidden sm:inline">เชื่อม Google Calendar</span>
          </Button>
        )}

        <div className="h-6 w-px bg-border mx-1 hidden sm:block" />

        <Dialog
          open={isNewAppointmentOpen}
          onOpenChange={setIsNewAppointmentOpen}
        >
          <DialogTrigger asChild>
            <Button className="h-9 bg-gradient-primary hover:opacity-90">
              <Plus className="w-4 h-4 mr-2" />
              สร้างนัดหมาย
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-lg">
                <CalendarIcon className="w-5 h-5 text-primary" />
                สร้างนัดหมายใหม่
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-5 pt-2">
              {/* Patient - Searchable */}
              <div className="space-y-2">
                <Label className="flex items-center gap-1.5 text-sm font-medium">
                  <User className="w-4 h-4 text-primary" />
                  ผู้ป่วย <span className="text-destructive">*</span>
                </Label>
                <Popover
                  open={patientPopoverOpen}
                  onOpenChange={setPatientPopoverOpen}
                >
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      className={cn(
                        "w-full justify-between font-normal h-10",
                        !selectedPatient && "text-muted-foreground",
                      )}
                    >
                      {selectedPatient
                        ? (() => {
                            const p = patients.find(
                              (pt) => pt.id === selectedPatient,
                            );
                            return p
                              ? `${p.first_name} ${p.last_name} (${p.hn})`
                              : "เลือกผู้ป่วย";
                          })()
                        : "ค้นหาหรือเลือกผู้ป่วย..."}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent
                    className="w-[--radix-popover-trigger-width] p-0"
                    align="start"
                  >
                    <Command>
                      <CommandInput placeholder="ค้นหาชื่อ, HN..." />
                      <CommandList>
                        <CommandEmpty>ไม่พบผู้ป่วย</CommandEmpty>
                        <CommandGroup>
                          {patients.map((patient) => (
                            <CommandItem
                              key={patient.id}
                              value={`${patient.first_name} ${patient.last_name} ${patient.hn}`}
                              onSelect={() => {
                                setSelectedPatient(patient.id);
                                setPatientPopoverOpen(false);
                              }}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  selectedPatient === patient.id
                                    ? "opacity-100"
                                    : "opacity-0",
                                )}
                              />
                              <div className="flex flex-col">
                                <span>
                                  {patient.first_name} {patient.last_name}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                  HN: {patient.hn}
                                  {patient.phone ? ` • ${patient.phone}` : ""}
                                </span>
                              </div>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>

              {/* Type & Provider Row - moved before date/time */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="flex items-center gap-1.5 text-sm font-medium">
                    ประเภท <span className="text-destructive">*</span>
                  </Label>
                  <Select
                    value={appointmentType}
                    onValueChange={setAppointmentType}
                  >
                    <SelectTrigger className="h-10">
                      <SelectValue placeholder="เลือกประเภท" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="consultation">ปรึกษา/บำบัด</SelectItem>
                      <SelectItem value="assessment">ตรวจประเมิน</SelectItem>
                      <SelectItem value="follow_up">ติดตามอาการ</SelectItem>
                      <SelectItem value="diagnosis">ตรวจวินิจฉัย</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-1.5 text-sm font-medium">
                    <User className="w-4 h-4 text-primary" />
                    ผู้รักษา/ผู้บำบัด{" "}
                    <span className="text-destructive">*</span>
                  </Label>
                  {isProvider ? (
                    <div className="flex items-center h-10 px-3 rounded-md border bg-muted text-sm">
                      {providers.find((p) => p.user_id === user?.id)
                        ?.full_name || "ตัวเอง"}
                    </div>
                  ) : (
                    <Select
                      value={appointmentProvider}
                      onValueChange={(val) => {
                        setAppointmentProvider(val);
                        // Check if current date is valid for new provider's schedule
                        if (appointmentDate && val && val !== "none") {
                          const hasSchedule = providerSchedules.some(
                            (s) => s.provider_id === val && s.is_active,
                          );
                          if (hasSchedule) {
                            const dateObj = new Date(
                              appointmentDate + "T00:00:00",
                            );
                            const dayOfWeek = dateObj.getDay();
                            const worksOnDay = providerSchedules.some(
                              (s) =>
                                s.provider_id === val &&
                                s.day_of_week === dayOfWeek &&
                                s.is_active,
                            );
                            if (!worksOnDay) {
                              setAppointmentDate("");
                              setAppointmentTime("");
                              toast.warning(
                                "วันที่เลือกไว้ไม่ตรงกับตารางผู้รักษา ระบบได้ล้างวันที่และเวลาแล้ว",
                              );
                              return;
                            }
                          }
                        }
                        setAppointmentTime("");
                      }}
                    >
                      <SelectTrigger className="h-10">
                        <SelectValue placeholder="เลือกผู้รักษา/ผู้บำบัด" />
                      </SelectTrigger>
                      <SelectContent>
                        {providers.map((prov) => (
                          <SelectItem key={prov.user_id} value={prov.user_id}>
                            {prov.full_name}
                            {prov.specialty ? ` (${prov.specialty})` : ""}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
              </div>

              {/* Date & Time Slot Picker */}
              <DateTimeSlotPicker
                selectedDate={appointmentDate}
                selectedTime={appointmentTime}
                onDateChange={(date) => {
                  setAppointmentDate(date);
                  setAppointmentTime("");
                }}
                onTimeChange={setAppointmentTime}
                providerSchedules={providerSchedules}
                providerId={
                  appointmentProvider && appointmentProvider !== "none"
                    ? appointmentProvider
                    : null
                }
              />

              {/* Chief Complaint */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">อาการหลัก</Label>
                <Textarea
                  placeholder="อาการหลักที่มาพบแพทย์ (ถ้ามี)"
                  rows={2}
                  value={chiefComplaint}
                  onChange={(e) => setChiefComplaint(e.target.value)}
                  className="resize-none"
                />
              </div>

              {/* Service Selector */}
              <ServiceSelector
                value={selectedServices}
                onChange={setSelectedServices}
                appointmentType={appointmentType || null}
              />

              {/* Location selector - show when onsite services selected */}
              {selectedServices.some((s) => {
                const svc = allServices.find((as) => as.id === s.service_id);
                return svc?.service_mode === "onsite";
              }) &&
                serviceLocations.length > 0 && (
                  <div className="space-y-2">
                    <Label className="flex items-center gap-1.5 text-sm font-medium">
                      <MapPin className="w-4 h-4 text-primary" />
                      สถานที่ให้บริการ
                    </Label>
                    <Select
                      value={selectedLocationId}
                      onValueChange={setSelectedLocationId}
                    >
                      <SelectTrigger className="h-10">
                        <SelectValue placeholder="เลือกสถานที่ให้บริการ" />
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

              {/* Service Summary */}
              {selectedServices.length > 0 &&
                (() => {
                  const totalDuration = selectedServices.reduce(
                    (sum, s) => sum + (s.duration_minutes || 0) * s.quantity,
                    0,
                  );
                  const estimatedEndTime =
                    appointmentTime && totalDuration > 0
                      ? (() => {
                          const [h, m] = appointmentTime.split(":").map(Number);
                          const totalMin = h * 60 + m + totalDuration;
                          const endH = Math.floor(totalMin / 60) % 24;
                          const endM = totalMin % 60;
                          return `${endH.toString().padStart(2, "0")}:${endM.toString().padStart(2, "0")}`;
                        })()
                      : null;

                  return (
                    <div className="p-3 bg-muted/30 rounded-lg space-y-1">
                      <p className="text-sm font-semibold">สรุปค่าบริการ</p>
                      {selectedServices
                        .filter((s) => s.service_id)
                        .map((s, i) => (
                          <div key={i} className="flex justify-between text-sm">
                            <span>
                              {s.service_name} x{s.quantity}
                            </span>
                            <span>
                              {(s.quantity * s.unit_price).toLocaleString()} ฿
                            </span>
                          </div>
                        ))}
                      <div className="border-t pt-1 flex justify-between font-semibold text-sm">
                        <span>รวมทั้งหมด</span>
                        <span>
                          {selectedServices
                            .reduce(
                              (sum, s) => sum + s.quantity * s.unit_price,
                              0,
                            )
                            .toLocaleString()}{" "}
                          ฿
                        </span>
                      </div>
                      {totalDuration > 0 && (
                        <div className="border-t pt-1 mt-1 flex items-center justify-between text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5" />
                            ระยะเวลารวม:{" "}
                            {totalDuration >= 60
                              ? `${Math.floor(totalDuration / 60)} ชม.${totalDuration % 60 > 0 ? ` ${totalDuration % 60} นาที` : ""}`
                              : `${totalDuration} นาที`}
                          </span>
                          {estimatedEndTime && (
                            <span className="font-semibold text-foreground">
                              เวลาสิ้นสุด ~{estimatedEndTime} น.
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })()}

              <div className="flex justify-end gap-2 pt-2 border-t">
                <Button
                  variant="outline"
                  onClick={() => setIsNewAppointmentOpen(false)}
                >
                  ยกเลิก
                </Button>
                <Button
                  className="bg-gradient-primary"
                  onClick={handleSubmit}
                  disabled={
                    createAppointment.isPending ||
                    !selectedPatient ||
                    !appointmentDate ||
                    !appointmentTime ||
                    !appointmentType
                  }
                >
                  {createAppointment.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      กำลังบันทึก...
                    </>
                  ) : (
                    "บันทึก"
                  )}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Provider filter bar for provider mode */}
      {viewMode === "provider" && providers.length > 0 && (
        <div className="flex items-center gap-2 mb-4 flex-wrap">
          <span className="text-sm font-medium text-muted-foreground mr-1">
            ผู้ให้บริการ:
          </span>
          {providers.map((prov) => {
            const isActive = activeProviderIds.includes(prov.user_id);
            return (
              <button
                key={prov.user_id}
                onClick={() => {
                  setActiveProviderIds((prev) =>
                    isActive
                      ? prev.filter((id) => id !== prov.user_id)
                      : [...prev, prov.user_id],
                  );
                }}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs transition-all",
                  isActive
                    ? "border-primary bg-primary/10 text-primary font-medium"
                    : "border-border text-muted-foreground hover:border-primary/50",
                )}
              >
                <User className="w-3 h-3" />
                {prov.full_name}
              </button>
            );
          })}
          <button
            onClick={() =>
              setActiveProviderIds(providers.map((p) => p.user_id))
            }
            className="text-xs text-muted-foreground hover:text-foreground underline ml-2"
          >
            เลือกทั้งหมด
          </button>
        </div>
      )}

      {viewMode === "provider" ? (
        <WeekTimeSlotView
          displayDays={displayDays}
          isLoading={isLoading}
          getAppointmentsForDate={getAppointmentsForDate}
          getGoogleEventsForDate={getGoogleEventsForDate}
          onAppointmentClick={openDetail}
          isDayView
          providerColumnMode
          selectedProviders={providers.filter((p) =>
            activeProviderIds.includes(p.user_id),
          )}
          allProviders={providers}
          onAppointmentDrop={(aptId, newDate, newStartTime, newEndTime) => {
            updateAppointment.mutate({
              id: aptId,
              input: {
                appointment_date: newDate,
                start_time: newStartTime,
                end_time: newEndTime,
              },
            });
          }}
        />
      ) : viewMode === "calendar" || viewMode === "day" ? (
        <WeekTimeSlotView
          displayDays={displayDays}
          isLoading={isLoading}
          getAppointmentsForDate={getAppointmentsForDate}
          getGoogleEventsForDate={getGoogleEventsForDate}
          onAppointmentClick={openDetail}
          isDayView={viewMode === "day"}
          allProviders={providers}
          onAppointmentDrop={(aptId, newDate, newStartTime, newEndTime) => {
            updateAppointment.mutate({
              id: aptId,
              input: {
                appointment_date: newDate,
                start_time: newStartTime,
                end_time: newEndTime,
              },
            });
          }}
        />
      ) : viewMode === "month" ? (
        /* Month View */
        <div className="bg-card rounded-2xl shadow-soft overflow-hidden">
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : (
            (() => {
              const monthStart = startOfMonth(currentDate);
              const monthEnd = endOfMonth(currentDate);
              // getDay: 0=Sun, adjust for Mon start: (getDay+6)%7
              const startDayOfWeek = (getDay(monthStart) + 6) % 7;
              const daysInMonth =
                differenceInCalendarDays(monthEnd, monthStart) + 1;
              const totalCells = startDayOfWeek + daysInMonth;
              const rows = Math.ceil(totalCells / 7);
              const dayHeaders = ["จ.", "อ.", "พ.", "พฤ.", "ศ.", "ส.", "อา."];

              return (
                <>
                  {/* Day headers */}
                  <div className="grid grid-cols-7 border-b">
                    {dayHeaders.map((d, i) => (
                      <div
                        key={i}
                        className="text-center py-2 text-xs font-medium text-muted-foreground border-r last:border-r-0"
                      >
                        {d}
                      </div>
                    ))}
                  </div>
                  {/* Day cells */}
                  <div className="grid grid-cols-7">
                    {Array.from({ length: rows * 7 }, (_, i) => {
                      const dayIndex = i - startDayOfWeek;
                      const isValidDay =
                        dayIndex >= 0 && dayIndex < daysInMonth;
                      const cellDate = isValidDay
                        ? addDays(monthStart, dayIndex)
                        : null;
                      const isToday = cellDate
                        ? format(cellDate, "yyyy-MM-dd") ===
                          format(new Date(), "yyyy-MM-dd")
                        : false;
                      const dayApts = cellDate
                        ? getAppointmentsForDate(cellDate)
                        : [];

                      return (
                        <div
                          key={i}
                          className={cn(
                            "border-r border-b last:border-r-0 min-h-[100px] p-1",
                            !isValidDay && "bg-muted/20",
                            isToday && "bg-primary/5",
                          )}
                        >
                          {isValidDay && cellDate && (
                            <>
                              <div
                                className={cn(
                                  "text-right text-xs mb-1 px-1",
                                  isToday
                                    ? "font-bold text-primary"
                                    : "text-muted-foreground",
                                )}
                              >
                                {format(cellDate, "d")}
                              </div>
                              <div className="space-y-0.5">
                                {dayApts.slice(0, 3).map((apt) => {
                                  const provIdx = providers.findIndex(
                                    (p) => p.user_id === apt.provider_id,
                                  );
                                  const provColor =
                                    PROVIDER_COLORS[
                                      provIdx >= 0
                                        ? provIdx % PROVIDER_COLORS.length
                                        : 0
                                    ];
                                  return (
                                    <div
                                      key={apt.id}
                                      onClick={() => openDetail(apt)}
                                      className={cn(
                                        "text-[10px] px-1 py-0.5 rounded-sm cursor-pointer truncate border-l-2",
                                        provColor.bg,
                                        provColor.border,
                                        provColor.text,
                                      )}
                                    >
                                      <span className="font-medium">
                                        {apt.start_time.slice(0, 5)}
                                      </span>{" "}
                                      {apt.patients
                                        ? `${apt.patients.first_name}`
                                        : "-"}
                                      {apt.status &&
                                        apt.status !== "scheduled" && (
                                          <span
                                            className={cn(
                                              "ml-1 px-1 rounded text-[8px]",
                                              statusColors[apt.status],
                                            )}
                                          >
                                            {statusLabels[apt.status]}
                                          </span>
                                        )}
                                    </div>
                                  );
                                })}
                                {dayApts.length > 3 && (
                                  <p className="text-[10px] text-muted-foreground text-center">
                                    +{dayApts.length - 3} อื่นๆ
                                  </p>
                                )}
                                {/* Google Calendar blocked events in month view */}
                                {cellDate &&
                                  getGoogleEventsForDate(cellDate)
                                    .slice(0, Math.max(0, 3 - dayApts.length))
                                    .map((gEvent) => {
                                      const startTime = gEvent.start?.includes(
                                        "T",
                                      )
                                        ? gEvent.start.substring(11, 16)
                                        : "";
                                      const provName = gEvent.provider_id
                                        ? providers.find(
                                            (p) =>
                                              p.user_id === gEvent.provider_id,
                                          )?.full_name
                                        : null;
                                      return (
                                        <div
                                          key={`g-${gEvent.id}`}
                                          className="text-[10px] px-1 py-0.5 rounded truncate border border-dashed border-muted-foreground/30 bg-muted/40 text-muted-foreground"
                                          title={
                                            provName
                                              ? `ไม่ว่าง - ${provName}`
                                              : "ไม่ว่าง"
                                          }
                                        >
                                          <span className="font-medium">
                                            {startTime}
                                          </span>{" "}
                                          ไม่ว่าง
                                          {provName ? ` (${provName})` : ""}
                                        </div>
                                      );
                                    })}
                              </div>
                            </>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </>
              );
            })()
          )}
        </div>
      ) : (
        /* List View */
        <div className="bg-card rounded-2xl shadow-soft overflow-hidden">
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : (
            (() => {
              // Group appointments by date, only dates with appointments
              const groupedByDate = displayDays
                .map((day) => ({
                  date: day,
                  dateKey: format(day, "yyyy-MM-dd"),
                  appointments: getAppointmentsForDate(day),
                }))
                .filter((g) => g.appointments.length > 0);

              if (groupedByDate.length === 0) {
                return (
                  <div className="text-center py-16">
                    <p className="text-muted-foreground">
                      ไม่มีนัดหมายในช่วงวันที่เลือก
                    </p>
                  </div>
                );
              }

              return (
                <div className="divide-y">
                  {groupedByDate.map(
                    ({ date, dateKey, appointments: dayApts }) => {
                      const isToday =
                        dateKey === format(new Date(), "yyyy-MM-dd");
                      return (
                        <div key={dateKey}>
                          {/* Date Header */}
                          <div
                            className={cn(
                              "px-4 py-3 flex items-center gap-3 sticky top-0 z-10",
                              isToday ? "bg-primary/10" : "bg-muted/30",
                            )}
                          >
                            <div
                              className={cn(
                                "w-10 h-10 rounded-lg flex flex-col items-center justify-center text-center",
                                isToday
                                  ? "bg-primary text-primary-foreground"
                                  : "bg-muted",
                              )}
                            >
                              <span className="text-xs leading-none">
                                {format(date, "EEE", { locale: th })}
                              </span>
                              <span className="text-sm font-bold leading-none mt-0.5">
                                {format(date, "d")}
                              </span>
                            </div>
                            <div>
                              <p
                                className={cn(
                                  "text-sm font-semibold",
                                  isToday && "text-primary",
                                )}
                              >
                                {format(date, "d MMMM yyyy", { locale: th })}
                                {isToday && (
                                  <span className="ml-2 text-xs font-normal">
                                    (วันนี้)
                                  </span>
                                )}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {dayApts.length} นัดหมาย
                              </p>
                            </div>
                          </div>
                          {/* Appointment Items */}
                          <div className="divide-y divide-border/50">
                            {dayApts.map((apt) => {
                              const patientName = apt.patients
                                ? `${apt.patients.first_name} ${apt.patients.last_name}`
                                : "ไม่ทราบชื่อ";
                              const patientInitials = apt.patients
                                ? getInitials(
                                    apt.patients.first_name,
                                    apt.patients.last_name,
                                  )
                                : "??";
                              const appointmentTypeKey =
                                apt.appointment_type || "consultation";
                              const provIdx = providers.findIndex(
                                (p) => p.user_id === apt.provider_id,
                              );
                              const provColor =
                                PROVIDER_COLORS[
                                  provIdx >= 0
                                    ? provIdx % PROVIDER_COLORS.length
                                    : 0
                                ];

                              return (
                                <div
                                  key={apt.id}
                                  onClick={() => openDetail(apt)}
                                  className="flex items-center gap-4 px-4 py-3 hover:bg-muted/30 cursor-pointer transition-colors"
                                >
                                  <div className="flex items-center gap-2 w-28 shrink-0">
                                    <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                                    <span className="text-sm font-medium">
                                      {apt.start_time.slice(0, 5)}
                                      {apt.end_time && (
                                        <span className="text-muted-foreground">
                                          {" "}
                                          - {apt.end_time.slice(0, 5)}
                                        </span>
                                      )}
                                    </span>
                                  </div>
                                  <div
                                    className={cn(
                                      "w-1.5 h-8 rounded-full shrink-0",
                                      provColor.dot,
                                    )}
                                  />
                                  <Avatar className="w-8 h-8 shrink-0">
                                    <AvatarFallback className="text-[10px] bg-secondary text-secondary-foreground">
                                      {patientInitials}
                                    </AvatarFallback>
                                  </Avatar>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium truncate">
                                      {patientName}
                                    </p>
                                    <p className="text-xs text-muted-foreground truncate">
                                      HN: {apt.patients?.hn || "-"}
                                      {apt.provider_profile &&
                                        ` • ${apt.provider_profile.full_name}`}
                                      {apt.chief_complaint &&
                                        ` • ${apt.chief_complaint}`}
                                      {apt.service_locations &&
                                        ` • 📍${apt.service_locations.name}`}
                                    </p>
                                    {(() => {
                                      const serviceNames =
                                        getServiceNamesForAppointment(apt.id);
                                      return serviceNames.length > 0 ? (
                                        <p className="text-xs text-primary/80 truncate mt-0.5">
                                          บริการ: {serviceNames.join(", ")}
                                        </p>
                                      ) : null;
                                    })()}
                                  </div>
                                  <Badge
                                    variant="outline"
                                    className={cn(
                                      "text-xs shrink-0",
                                      typeColors[appointmentTypeKey],
                                    )}
                                  >
                                    {typeLabels[appointmentTypeKey] ||
                                      appointmentTypeKey}
                                  </Badge>
                                  <Badge
                                    variant="outline"
                                    className="text-xs shrink-0"
                                  >
                                    {statusLabels[apt.status || "scheduled"]}
                                  </Badge>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    },
                  )}
                </div>
              );
            })()
          )}
        </div>
      )}

      {/* Provider Color Legend - hidden for doctor/therapist */}
      {!isProvider && (
        <div className="flex items-center gap-3 mt-4 justify-center flex-wrap">
          <span className="text-xs text-muted-foreground font-medium">
            ผู้ให้บริการ:
          </span>
          {providers.map((prov, i) => {
            const color = PROVIDER_COLORS[i % PROVIDER_COLORS.length];
            return (
              <div
                key={prov.user_id}
                className="flex items-center gap-1.5 px-2 py-1 rounded-full border border-border text-xs"
              >
                <div className={cn("w-2.5 h-2.5 rounded-full", color.dot)} />
                <span>{prov.full_name}</span>
              </div>
            );
          })}
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-full border border-dashed border-red-300 text-xs text-red-500">
            <Ban className="w-3 h-3" />
            <span>ไม่ว่าง (Google)</span>
          </div>
        </div>
      )}

      {/* Detail / Edit Dialog */}
      <Dialog
        open={isDetailOpen}
        onOpenChange={(open) => {
          setIsDetailOpen(open);
          if (!open) setIsEditing(false);
        }}
      >
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>{isEditing ? "แก้ไขนัดหมาย" : "รายละเอียดนัดหมาย"}</span>
              {!isEditing && (
                <div className="flex items-center">
                  <div className="flex items-center gap-2 mr-10">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setIsEditing(true)}
                    >
                      <Edit className="w-4 h-4 mr-1" />
                      แก้ไข
                    </Button>
                    {selectedAppointment?.status !== "cancelled" && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-orange-600 hover:text-orange-700 hover:bg-orange-50"
                        onClick={handleCancel}
                        disabled={updateAppointment.isPending}
                      >
                        <Ban className="w-4 h-4 mr-1" />
                        ยกเลิก
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={() => setIsDeleteDialogOpen(true)}
                    >
                      <Trash2 className="w-4 h-4 mr-1" />
                      ลบ
                    </Button>
                  </div>
                  {/* The close button is rendered by DialogContent, so we add margin to separate */}
                </div>
              )}
            </DialogTitle>
          </DialogHeader>
          {selectedAppointment && (
            <div className="space-y-4 pt-2">
              {/* Patient Info (read-only) */}
              <div
                className={cn(
                  "p-3 rounded-lg border",
                  typeColors[
                    selectedAppointment.appointment_type || "consultation"
                  ],
                )}
              >
                <div className="flex items-center gap-2">
                  <Avatar className="w-8 h-8">
                    <AvatarFallback className="text-xs bg-background/60">
                      {selectedAppointment.patients
                        ? getInitials(
                            selectedAppointment.patients.first_name,
                            selectedAppointment.patients.last_name,
                          )
                        : "??"}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium text-sm">
                      {selectedAppointment.patients
                        ? `${selectedAppointment.patients.first_name} ${selectedAppointment.patients.last_name}`
                        : "ไม่ทราบชื่อ"}
                    </p>
                    <p className="text-xs opacity-70">
                      HN: {selectedAppointment.patients?.hn || "-"}
                      {selectedAppointment.patients?.phone &&
                        ` | ${selectedAppointment.patients.phone}`}
                    </p>
                  </div>
                </div>
              </div>

              {isEditing ? (
                <>
                  {/* Provider & Type - moved before date/time */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>
                        ประเภท <span className="text-destructive">*</span>
                      </Label>
                      <Select value={editType} onValueChange={setEditType}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="consultation">
                            ปรึกษา/บำบัด
                          </SelectItem>
                          <SelectItem value="assessment">
                            ตรวจประเมิน
                          </SelectItem>
                          <SelectItem value="follow_up">ติดตามอาการ</SelectItem>
                          <SelectItem value="diagnosis">
                            ตรวจวินิจฉัย
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>
                        ผู้รักษา/ผู้บำบัด{" "}
                        <span className="text-destructive">*</span>
                      </Label>
                      {isProvider ? (
                        <div className="flex items-center h-10 px-3 rounded-md border bg-muted text-sm">
                          {providers.find((p) => p.user_id === user?.id)
                            ?.full_name || "ตัวเอง"}
                        </div>
                      ) : (
                        <Select
                          value={editProvider}
                          onValueChange={(val) => {
                            setEditProvider(val);
                            // Check if current date is valid for new provider's schedule
                            if (editDate && val && val !== "none") {
                              const hasSchedule = providerSchedules.some(
                                (s) => s.provider_id === val && s.is_active,
                              );
                              if (hasSchedule) {
                                const dateObj = new Date(
                                  editDate + "T00:00:00",
                                );
                                const dayOfWeek = dateObj.getDay();
                                const worksOnDay = providerSchedules.some(
                                  (s) =>
                                    s.provider_id === val &&
                                    s.day_of_week === dayOfWeek &&
                                    s.is_active,
                                );
                                if (!worksOnDay) {
                                  setEditDate("");
                                  setEditTime("");
                                  toast.warning(
                                    "วันที่เลือกไว้ไม่ตรงกับตารางผู้รักษา ระบบได้ล้างวันที่และเวลาแล้ว",
                                  );
                                  return;
                                }
                              }
                            }
                            setEditTime("");
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="เลือกผู้ให้บริการ" />
                          </SelectTrigger>
                          <SelectContent>
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
                      )}
                    </div>
                  </div>
                  {/* Date & Time Slot Picker */}
                  <DateTimeSlotPicker
                    selectedDate={editDate}
                    selectedTime={editTime}
                    onDateChange={(date) => {
                      setEditDate(date);
                      setEditTime("");
                    }}
                    onTimeChange={setEditTime}
                    providerSchedules={providerSchedules}
                    providerId={
                      editProvider && editProvider !== "none"
                        ? editProvider
                        : null
                    }
                    excludeAppointmentId={selectedAppointment?.id}
                  />
                  {/* Status */}
                  <div className="space-y-2">
                    <Label>สถานะ</Label>
                    <Select value={editStatus} onValueChange={setEditStatus}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="scheduled">ทำนัดหมาย</SelectItem>
                        <SelectItem value="confirmed">ยืนยันนัดหมาย</SelectItem>
                        <SelectItem value="completed">เสร็จสิ้น</SelectItem>
                        <SelectItem value="no_show">ไม่มา</SelectItem>
                        <SelectItem value="cancelled">ยกเลิก</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>อาการหลัก</Label>
                    <Textarea
                      rows={2}
                      value={editComplaint}
                      onChange={(e) => setEditComplaint(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>บันทึกเพิ่มเติม</Label>
                    <Textarea
                      rows={2}
                      value={editNotes}
                      onChange={(e) => setEditNotes(e.target.value)}
                    />
                  </div>
                  {/* Service Selector in Edit Mode */}
                  <ServiceSelector
                    value={editServices}
                    onChange={setEditServices}
                    appointmentType={editType || null}
                  />
                  {/* Location selector in edit mode */}
                  {editServices.some((s) => {
                    const svc = allServices.find(
                      (as) => as.id === s.service_id,
                    );
                    return svc?.service_mode === "onsite";
                  }) &&
                    serviceLocations.length > 0 && (
                      <div className="space-y-2">
                        <Label className="flex items-center gap-1.5">
                          <MapPin className="w-4 h-4" />
                          สถานที่ให้บริการ
                        </Label>
                        <Select
                          value={editLocationId}
                          onValueChange={setEditLocationId}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="เลือกสถานที่ให้บริการ" />
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
                  {editServices.length > 0 && (
                    <div className="bg-muted/30 rounded-lg px-3 py-2 text-sm">
                      <div className="flex justify-between font-medium">
                        <span>รวมค่าบริการ</span>
                        <span>
                          {editServices
                            .reduce(
                              (sum, s) => sum + s.quantity * s.unit_price,
                              0,
                            )
                            .toLocaleString()}{" "}
                          ฿
                        </span>
                      </div>
                    </div>
                  )}
                  <div className="flex justify-end gap-2 pt-2">
                    <Button
                      variant="outline"
                      onClick={() => setIsEditing(false)}
                    >
                      ยกเลิก
                    </Button>
                    <Button
                      className="bg-gradient-primary"
                      onClick={handleUpdate}
                      disabled={updateAppointment.isPending}
                    >
                      {updateAppointment.isPending ? (
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      ) : null}
                      บันทึก
                    </Button>
                  </div>
                </>
              ) : (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-muted-foreground">วันที่</p>
                      <p className="text-sm font-medium">
                        {editDate
                          ? format(new Date(editDate), "d MMMM yyyy", {
                              locale: th,
                            })
                          : "-"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">เวลา</p>
                      <p className="text-sm font-medium">{editTime} น.</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-muted-foreground">ประเภท</p>
                      <Badge className={cn("mt-1", typeColors[editType])}>
                        {typeLabels[editType] || editType}
                      </Badge>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">สถานะ</p>
                      <p className="text-sm font-medium mt-1">
                        {statusLabels[editStatus] || editStatus}
                      </p>
                    </div>
                  </div>
                  {selectedAppointment?.provider_profile && (
                    <div>
                      <p className="text-xs text-muted-foreground">
                        ผู้รักษา/ผู้บำบัด
                      </p>
                      <p className="text-sm font-medium mt-1">
                        <User className="w-3.5 h-3.5 inline mr-1" />
                        {selectedAppointment.provider_profile.full_name}
                      </p>
                    </div>
                  )}
                  {selectedAppointment?.service_locations && (
                    <div>
                      <p className="text-xs text-muted-foreground">
                        สถานที่ให้บริการ
                      </p>
                      <p className="text-sm font-medium mt-1">
                        <MapPin className="w-3.5 h-3.5 inline mr-1" />
                        {selectedAppointment.service_locations.name}
                        {selectedAppointment.service_locations.address && (
                          <span className="text-muted-foreground font-normal">
                            {" "}
                            - {selectedAppointment.service_locations.address}
                          </span>
                        )}
                      </p>
                    </div>
                  )}
                  {selectedAppointment?.meet_link &&
                    selectedAppointment?.status !== "cancelled" && (
                      <div className="p-3 rounded-lg border border-blue-200 bg-blue-50/50 dark:border-blue-800 dark:bg-blue-950/30">
                        <p className="text-xs text-muted-foreground mb-1">
                          🎥 บัญชี Google Meet สำหรับนัดหมายออนไลน์
                        </p>
                        <a
                          href={selectedAppointment.meet_link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline break-all"
                        >
                          {selectedAppointment.meet_link}
                        </a>
                        <div className="mt-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="gap-1.5 text-blue-600 border-blue-200 hover:bg-blue-100 dark:text-blue-400 dark:border-blue-800 dark:hover:bg-blue-900/50"
                            onClick={() =>
                              window.open(
                                selectedAppointment.meet_link!,
                                "_blank",
                              )
                            }
                          >
                            <CalendarIcon className="w-3.5 h-3.5" />
                            เข้าร่วมประชุม
                          </Button>
                        </div>
                      </div>
                    )}
                  {editComplaint && (
                    <div>
                      <p className="text-xs text-muted-foreground">อาการหลัก</p>
                      <p className="text-sm mt-1">{editComplaint}</p>
                    </div>
                  )}
                  {editNotes && (
                    <div>
                      <p className="text-xs text-muted-foreground">
                        บันทึกเพิ่มเติม
                      </p>
                      <p className="text-sm mt-1">{editNotes}</p>
                    </div>
                  )}
                  {/* Services in Detail View */}
                  {editServices.length > 0 && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-2">
                        รายการบริการ
                      </p>
                      <div className="space-y-1.5">
                        {editServices.map((s, i) => (
                          <div
                            key={i}
                            className="flex items-center justify-between text-sm bg-muted/30 rounded-lg px-3 py-2"
                          >
                            <span>{s.service_name}</span>
                            <span className="text-muted-foreground">
                              {s.quantity > 1 ? `${s.quantity} × ` : ""}
                              {s.unit_price.toLocaleString()} ฿
                            </span>
                          </div>
                        ))}
                        <div className="flex justify-between font-medium text-sm pt-1">
                          <span>รวม</span>
                          <span>
                            {editServices
                              .reduce(
                                (sum, s) => sum + s.quantity * s.unit_price,
                                0,
                              )
                              .toLocaleString()}{" "}
                            ฿
                          </span>
                        </div>
                      </div>

                      {/* Payment Section */}
                      {appointmentBillingId && (
                        <div className="mt-4 p-3 rounded-lg border bg-muted/20 space-y-3">
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-semibold">การชำระเงิน</p>
                            <Badge
                              className={cn(
                                billingPaymentStatus === "paid"
                                  ? "bg-green-100 text-green-700 border-green-200 dark:bg-green-950/40 dark:text-green-300"
                                  : "bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-950/40 dark:text-yellow-300",
                              )}
                            >
                              {billingPaymentStatus === "paid"
                                ? "ชำระแล้ว"
                                : "รอชำระ"}
                            </Badge>
                          </div>

                          {billingPaymentStatus !== "paid" ? (
                            <>
                              <div className="space-y-2">
                                <Label className="text-xs">วิธีชำระเงิน</Label>
                                <Select
                                  value={paymentMethod}
                                  onValueChange={setPaymentMethod}
                                >
                                  <SelectTrigger className="h-9">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="cash">เงินสด</SelectItem>
                                    <SelectItem value="transfer">
                                      โอนเงิน
                                    </SelectItem>
                                    <SelectItem value="credit_card">
                                      บัตรเครดิต
                                    </SelectItem>
                                    <SelectItem value="promptpay">
                                      พร้อมเพย์
                                    </SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              <Button
                                className="w-full bg-gradient-primary"
                                onClick={handlePayment}
                                disabled={
                                  isProcessingPayment ||
                                  updateBillingStatus.isPending
                                }
                              >
                                {isProcessingPayment ? (
                                  <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    กำลังดำเนินการ...
                                  </>
                                ) : (
                                  <>
                                    <Check className="w-4 h-4 mr-2" />
                                    ชำระเงิน{" "}
                                    {editServices
                                      .reduce(
                                        (sum, s) =>
                                          sum + s.quantity * s.unit_price,
                                        0,
                                      )
                                      .toLocaleString()}{" "}
                                    ฿
                                  </>
                                )}
                              </Button>
                            </>
                          ) : (
                            <div className="space-y-3">
                              <p className="text-xs text-muted-foreground">
                                ชำระโดย:{" "}
                                {paymentMethodLabels[paymentMethod] ||
                                  paymentMethod}
                              </p>
                              {paidBillingData && (
                                <div className="flex gap-2">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="flex-1 gap-1.5"
                                    onClick={() =>
                                      handlePrintReceipt(paidBillingData)
                                    }
                                  >
                                    <Printer className="w-4 h-4" />
                                    พิมพ์ใบเสร็จ
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="flex-1 gap-1.5"
                                    onClick={() =>
                                      handleDownloadReceipt(paidBillingData)
                                    }
                                  >
                                    <Download className="w-4 h-4" />
                                    ดาวน์โหลด
                                  </Button>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                  {/* Treatment Record Section */}
                  {selectedAppointment &&
                    selectedAppointment.status !== "cancelled" && (
                      <div className="pt-3 border-t space-y-3">
                        {linkedTreatment ? (
                          <div className="rounded-lg border bg-muted/30 p-3 space-y-2">
                            <div className="flex items-center gap-2 text-sm font-semibold text-primary">
                              <Stethoscope className="w-4 h-4" />
                              บันทึกการรักษาที่เชื่อมโยง
                            </div>
                            <div className="grid grid-cols-2 gap-2 text-sm">
                              <div>
                                <p className="text-xs text-muted-foreground">
                                  วันที่รักษา
                                </p>
                                <p className="font-medium">
                                  {format(
                                    new Date(linkedTreatment.treatment_date),
                                    "d MMM yyyy",
                                    { locale: th },
                                  )}
                                </p>
                              </div>
                              {linkedTreatment.provider_name && (
                                <div>
                                  <p className="text-xs text-muted-foreground">
                                    ผู้รักษา
                                  </p>
                                  <p className="font-medium">
                                    {linkedTreatment.provider_name}
                                  </p>
                                </div>
                              )}
                            </div>
                            {linkedTreatment.diagnosis && (
                              <div className="text-sm">
                                <p className="text-xs text-muted-foreground">
                                  การวินิจฉัย
                                </p>
                                <p className="font-medium line-clamp-2">
                                  {linkedTreatment.diagnosis}
                                </p>
                              </div>
                            )}
                            {linkedTreatment.symptoms && (
                              <div className="text-sm">
                                <p className="text-xs text-muted-foreground">
                                  อาการ
                                </p>
                                <p className="font-medium line-clamp-2">
                                  {linkedTreatment.symptoms}
                                </p>
                              </div>
                            )}
                            {hasPermission("treatments") && (
                              <Button
                                className="w-full gap-2"
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setIsDetailOpen(false);
                                  navigate(
                                    `/treatments?highlight=${linkedTreatment.id}`,
                                  );
                                }}
                              >
                                <Stethoscope className="w-4 h-4" />
                                ดูรายละเอียดการรักษา
                              </Button>
                            )}
                          </div>
                        ) : (
                          hasPermission("treatments") && (
                            <Button
                              className="w-full gap-2"
                              variant="outline"
                              onClick={() => {
                                setIsDetailOpen(false);
                                navigate(
                                  `/treatments?patient_id=${selectedAppointment.patient_id}&appointment_id=${selectedAppointment.id}&action=new`,
                                );
                              }}
                            >
                              <Stethoscope className="w-4 h-4" />
                              บันทึกการรักษา / การให้คำปรึกษา
                            </Button>
                          )
                        )}
                      </div>
                    )}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>ยืนยันการลบนัดหมาย</AlertDialogTitle>
            <AlertDialogDescription>
              คุณต้องการลบนัดหมายนี้หรือไม่? การดำเนินการนี้ไม่สามารถย้อนกลับได้
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteAppointment.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : null}
              ลบนัดหมาย
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </MainLayout>
  );
};

export default Appointments;
