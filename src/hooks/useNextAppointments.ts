import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const useNextAppointments = (patientIds: string[]) => {
  return useQuery({
    queryKey: ["next-appointments", patientIds],
    queryFn: async () => {
      if (patientIds.length === 0) return {};

      const today = new Date().toISOString().split("T")[0];

      const { data, error } = await supabase
        .from("appointments")
        .select("id, patient_id, appointment_date, start_time, status")
        .in("patient_id", patientIds)
        .gte("appointment_date", today)
        .in("status", ["scheduled", "confirmed"])
        .order("appointment_date", { ascending: true })
        .order("start_time", { ascending: true });

      if (error) throw error;

      // Keep only the earliest appointment per patient
      const map: Record<string, { appointment_date: string; start_time: string }> = {};
      for (const apt of data) {
        if (!map[apt.patient_id]) {
          map[apt.patient_id] = {
            appointment_date: apt.appointment_date,
            start_time: apt.start_time,
          };
        }
      }
      return map;
    },
    enabled: patientIds.length > 0,
  });
};

