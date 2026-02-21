import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useGoogleCalendar } from "@/hooks/useGoogleCalendar";
import { useState, useEffect } from "react";
import type { BusySlot } from "@/components/ui/scroll-time-picker";
import type { ProviderSchedule } from "@/hooks/useProviderSchedules";

interface UseDateBusySlotsOptions {
  providerId: string | null;
  date: string;
  providerSchedules?: ProviderSchedule[];
  excludeAppointmentId?: string;
  interval?: number;
}

interface UseDateBusySlotsResult {
  busySlots: BusySlot[];
  isLoading: boolean;
}

export const useDateBusySlots = ({
  providerId,
  date,
  providerSchedules = [],
  excludeAppointmentId,
  interval = 30,
}: UseDateBusySlotsOptions): UseDateBusySlotsResult => {
  const { user, isAdmin, isStaff } = useAuth();
  const googleCalendar = useGoogleCalendar();
  const [googleEvents, setGoogleEvents] = useState<
    Array<{ id: string; summary: string; start: string; end: string; status: string; provider_id?: string }>
  >([]);
  const [googleLoading, setGoogleLoading] = useState(false);

  // Fetch appointments for the specific date
  const { data: dateAppointments = [], isLoading: appointmentsLoading } = useQuery({
    queryKey: ["appointments-for-date", date],
    queryFn: async () => {
      if (!date) return [];
      const { data, error } = await supabase
        .from("appointments")
        .select("id, provider_id, appointment_date, start_time, end_time, status, google_event_id, patients (first_name, last_name)")
        .eq("appointment_date", date)
        .neq("status", "cancelled");
      if (error) throw error;
      return data || [];
    },
    enabled: !!date && !!providerId,
  });

  // Fetch Google Calendar events for the specific date
  useEffect(() => {
    if (!date || !providerId) {
      setGoogleEvents([]);
      setGoogleLoading(false);
      return;
    }

    setGoogleLoading(true);
    if (isAdmin || isStaff) {
      googleCalendar.fetchAllProvidersEvents(date, date).then(eventsByProvider => {
        const allEvents: typeof googleEvents = [];
        Object.entries(eventsByProvider).forEach(([pid, data]) => {
          (data.events || []).forEach(event => {
            allEvents.push({ ...event, provider_id: pid });
          });
        });
        setGoogleEvents(allEvents);
      }).finally(() => setGoogleLoading(false));
    } else if (googleCalendar.status.connected) {
      googleCalendar.fetchGoogleEvents(date, date).then(events => {
        setGoogleEvents((events || []).map(e => ({ ...e, provider_id: user?.id })));
      }).finally(() => setGoogleLoading(false));
    } else {
      setGoogleEvents([]);
      setGoogleLoading(false);
    }
  }, [date, providerId, isAdmin, isStaff, googleCalendar.status.connected]);

  const isLoading = appointmentsLoading || googleLoading;

  // Compute busy slots
  if (!providerId || !date) return { busySlots: [], isLoading: false };

  const busy: BusySlot[] = [];

  // Google Calendar events
  const providerGoogleEvents = googleEvents.filter(ge => {
    if (!ge.start || ge.status === "cancelled") return false;
    if (ge.provider_id && ge.provider_id !== providerId) return false;
    return ge.start.substring(0, 10) === date;
  }).filter(ge => !dateAppointments.some(apt => apt.google_event_id === ge.id));

  for (const ge of providerGoogleEvents) {
    const geStart = ge.start.length > 10 ? ge.start.substring(11, 16) : "00:00";
    const geEnd = ge.end.length > 10 ? ge.end.substring(11, 16) : "23:59";
    const [sh, sm] = geStart.split(":").map(Number);
    const [eh, em] = geEnd.split(":").map(Number);
    const startMin = sh * 60 + sm;
    const endMin = eh * 60 + em;
    for (let t = startMin; t < endMin; t += interval) {
      const hh = Math.floor(t / 60).toString().padStart(2, "0");
      const mm = (t % 60).toString().padStart(2, "0");
      busy.push({ time: `${hh}:${mm}`, reason: ge.summary || "ไม่ว่าง (Google Calendar)" });
    }
  }

  // Existing appointments
  const providerApts = dateAppointments.filter(
    apt => apt.provider_id === providerId && apt.id !== excludeAppointmentId
  );
  for (const apt of providerApts) {
    const aptStart = apt.start_time.substring(0, 5);
    const aptEnd = apt.end_time ? apt.end_time.substring(0, 5) : (() => {
      const [h, m] = aptStart.split(":").map(Number);
      const endMin = h * 60 + m + interval;
      return `${Math.floor(endMin / 60).toString().padStart(2, "0")}:${(endMin % 60).toString().padStart(2, "0")}`;
    })();
    const [sh, sm] = aptStart.split(":").map(Number);
    const [eh, em] = aptEnd.split(":").map(Number);
    const startMin = sh * 60 + sm;
    const endMin = eh * 60 + em;
    const name = `${(apt as any).patients?.first_name || ""} ${(apt as any).patients?.last_name || ""}`.trim() || "มีนัดหมายแล้ว";
    for (let t = startMin; t < endMin; t += interval) {
      const hh = Math.floor(t / 60).toString().padStart(2, "0");
      const mm = (t % 60).toString().padStart(2, "0");
      busy.push({ time: `${hh}:${mm}`, reason: name });
    }
  }

  return { busySlots: busy, isLoading };
};
