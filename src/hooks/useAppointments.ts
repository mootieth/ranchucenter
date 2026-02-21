import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { sendAppointmentEmail } from "@/utils/appointmentEmail";

export interface Appointment {
  id: string;
  patient_id: string;
  provider_id: string | null;
  appointment_date: string;
  start_time: string;
  end_time: string | null;
  appointment_type: string | null;
  status: string | null;
  chief_complaint: string | null;
  google_event_id: string | null;
  google_meet_event_id: string | null;
  meet_link: string | null;
  notes: string | null;
  location_id: string | null;
  created_at: string;
  patients?: {
    id: string;
    hn: string;
    first_name: string;
    last_name: string;
    phone: string | null;
    id_card: string | null;
  };
  provider_profile?: {
    full_name: string;
  } | null;
  service_locations?: {
    id: string;
    name: string;
    address: string | null;
  } | null;
}

export interface AppointmentInput {
  patient_id: string;
  provider_id?: string | null;
  appointment_date: string;
  start_time: string;
  end_time?: string | null;
  appointment_type?: string;
  chief_complaint?: string | null;
  notes?: string | null;
  location_id?: string | null;
}

const enrichWithProviders = async (appointments: any[]): Promise<Appointment[]> => {
  const providerIds = appointments
    .map(a => a.provider_id)
    .filter((id): id is string => id !== null);

  let profilesMap: Record<string, { full_name: string }> = {};
  if (providerIds.length > 0) {
    const uniqueIds = [...new Set(providerIds)];
    const { data: profilesData } = await supabase
      .from("profiles")
      .select("user_id, full_name")
      .in("user_id", uniqueIds);

    if (profilesData) {
      profilesMap = profilesData.reduce((acc, p) => {
        acc[p.user_id] = { full_name: p.full_name };
        return acc;
      }, {} as Record<string, { full_name: string }>);
    }
  }

  return appointments.map(a => ({
    ...a,
    provider_profile: a.provider_id ? profilesMap[a.provider_id] || null : null,
  }));
};

export const useAppointments = (date?: string) => {
  return useQuery({
    queryKey: ["appointments", date],
    queryFn: async () => {
      let query = supabase
        .from("appointments")
        .select(`
          *,
          patients (id, hn, first_name, last_name, phone, id_card),
          service_locations (id, name, address)
        `)
        .order("appointment_date", { ascending: true })
        .order("start_time", { ascending: true });

      if (date) {
        query = query.eq("appointment_date", date);
      }

      const { data, error } = await query;
      if (error) throw error;
      return enrichWithProviders(data || []);
    },
  });
};

export const useTodayAppointments = () => {
  const today = new Date().toISOString().split("T")[0];
  return useAppointments(today);
};

export const useWeekAppointments = (startDate: string, endDate: string) => {
  return useQuery({
    queryKey: ["appointments", "week", startDate, endDate],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("appointments")
        .select(`
          *,
          patients (id, hn, first_name, last_name, phone, id_card),
          service_locations (id, name, address)
        `)
        .gte("appointment_date", startDate)
        .lte("appointment_date", endDate)
        .order("appointment_date", { ascending: true })
        .order("start_time", { ascending: true });

      if (error) throw error;
      return enrichWithProviders(data || []);
    },
  });
};

export const usePatientAppointments = (patientId: string) => {
  return useQuery({
    queryKey: ["appointments", "patient", patientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("appointments")
        .select("*")
        .eq("patient_id", patientId)
        .order("appointment_date", { ascending: false });

      if (error) throw error;
      return data as Appointment[];
    },
    enabled: !!patientId,
  });
};

export const useCreateAppointment = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (input: AppointmentInput) => {
      const { data, error } = await supabase
        .from("appointments")
        .insert({
          ...input,
          created_by: user?.id,
        })
        .select()
        .single();

      if (error) throw error;

      // Auto-assign provider to patient_providers if provider is selected
      if (input.provider_id && input.patient_id) {
        const { data: existing } = await supabase
          .from("patient_providers")
          .select("id")
          .eq("patient_id", input.patient_id)
          .eq("provider_id", input.provider_id)
          .maybeSingle();

        if (!existing) {
          await supabase.from("patient_providers").insert({
            patient_id: input.patient_id,
            provider_id: input.provider_id,
          });
        }
      }

      return data as Appointment;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
      queryClient.invalidateQueries({ queryKey: ["patient-providers"] });
      toast({
        title: "นัดหมายสำเร็จ",
        description: "เพิ่มนัดหมายใหม่เรียบร้อยแล้ว",
      });
    },
    onError: (error) => {
      console.error("Error creating appointment:", error);
      toast({
        variant: "destructive",
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถเพิ่มนัดหมายได้",
      });
    },
  });
};

export const useUpdateAppointment = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, input }: { id: string; input: Partial<AppointmentInput & { status: string; meet_link: string | null }> }) => {
      const { data, error } = await supabase
        .from("appointments")
        .update(input)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;

      // Auto-assign provider to patient_providers if provider changed
      if (input.provider_id && data.patient_id) {
        const { data: existing } = await supabase
          .from("patient_providers")
          .select("id")
          .eq("patient_id", data.patient_id)
          .eq("provider_id", input.provider_id)
          .maybeSingle();

        if (!existing) {
          await supabase.from("patient_providers").insert({
            patient_id: data.patient_id,
            provider_id: input.provider_id,
          });
        }
      }

      return data as Appointment;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
      queryClient.invalidateQueries({ queryKey: ["patient-providers"] });
      const isCancelled = variables.input.status === "cancelled";
      toast({
        title: isCancelled ? "ยกเลิกสำเร็จ" : "อัปเดตสำเร็จ",
        description: isCancelled ? "ยกเลิกนัดหมายเรียบร้อยแล้ว" : "แก้ไขนัดหมายเรียบร้อยแล้ว",
      });
      // Send email notification for updates/cancellations
      if (data?.id) {
        const trigger = isCancelled ? "cancelled" : variables.input.status === "confirmed" ? "confirmed" : "updated";
        sendAppointmentEmail(data.id, trigger);
      }
    },
    onError: (error) => {
      console.error("Error updating appointment:", error);
      toast({
        variant: "destructive",
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถแก้ไขนัดหมายได้",
      });
    },
  });
};

export const useDeleteAppointment = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      // Delete related billing_items -> billings that reference this appointment
      const { data: relatedBillings } = await supabase
        .from("billings")
        .select("id")
        .eq("appointment_id", id);

      if (relatedBillings && relatedBillings.length > 0) {
        const billingIds = relatedBillings.map(b => b.id);
        await supabase.from("billing_items").delete().in("billing_id", billingIds);
        await supabase.from("billings").delete().eq("appointment_id", id);
      }

      // Delete related treatments (and their prescriptions/billings via cascade function or manual)
      const { data: relatedTreatments } = await supabase
        .from("treatments")
        .select("id")
        .eq("appointment_id", id);

      if (relatedTreatments && relatedTreatments.length > 0) {
        const treatmentIds = relatedTreatments.map(t => t.id);
        // Delete prescription items -> prescriptions for these treatments
        const { data: relatedPrescriptions } = await supabase
          .from("prescriptions")
          .select("id")
          .in("treatment_id", treatmentIds);
        if (relatedPrescriptions && relatedPrescriptions.length > 0) {
          const prescriptionIds = relatedPrescriptions.map(p => p.id);
          await supabase.from("prescription_items").delete().in("prescription_id", prescriptionIds);
          await supabase.from("prescriptions").delete().in("treatment_id", treatmentIds);
        }
        // Delete billings linked to treatments
        const { data: treatmentBillings } = await supabase
          .from("billings")
          .select("id")
          .in("treatment_id", treatmentIds);
        if (treatmentBillings && treatmentBillings.length > 0) {
          const tbIds = treatmentBillings.map(b => b.id);
          await supabase.from("billing_items").delete().in("billing_id", tbIds);
          await supabase.from("billings").delete().in("treatment_id", treatmentIds);
        }
        await supabase.from("treatments").delete().eq("appointment_id", id);
      }

      // Finally delete the appointment
      const { error } = await supabase
        .from("appointments")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
      toast({
        title: "ลบสำเร็จ",
        description: "ลบนัดหมายเรียบร้อยแล้ว",
      });
    },
    onError: (error) => {
      console.error("Error deleting appointment:", error);
      toast({
        variant: "destructive",
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถลบนัดหมายได้",
      });
    },
  });
};
