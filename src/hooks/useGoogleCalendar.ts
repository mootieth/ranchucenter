import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

interface GoogleCalendarStatus {
  connected: boolean;
  email: string | null;
  loading: boolean;
}

export const useGoogleCalendar = () => {
  const { user, session } = useAuth();
  const { toast } = useToast();
  const [status, setStatus] = useState<GoogleCalendarStatus>({
    connected: false,
    email: null,
    loading: true,
  });

  const checkConnection = useCallback(async () => {
    if (!session?.access_token) {
      setStatus({ connected: false, email: null, loading: false });
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke("google-calendar-sync", {
        body: { action: "check_connection" },
      });

      if (error) throw error;

      setStatus({
        connected: data?.connected || false,
        email: data?.email || null,
        loading: false,
      });
    } catch (err) {
      console.error("Check Google Calendar connection error:", err);
      setStatus({ connected: false, email: null, loading: false });
    }
  }, [session?.access_token]);

  useEffect(() => {
    checkConnection();
  }, [checkConnection]);

  const connect = async () => {
    try {
      const { data, error } = await supabase.functions.invoke("google-calendar-auth", {
        body: { origin: window.location.origin },
      });

      if (error) throw error;
      if (data?.url) {
        window.location.href = data.url;
      }
    } catch (err) {
      console.error("Google Calendar connect error:", err);
      toast({
        variant: "destructive",
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถเชื่อมต่อ Google Calendar ได้",
      });
    }
  };

  const disconnect = async () => {
    try {
      const { data, error } = await supabase.functions.invoke("google-calendar-disconnect", {});

      if (error) throw error;

      setStatus({ connected: false, email: null, loading: false });
      toast({
        title: "ยกเลิกการเชื่อมต่อแล้ว",
        description: "ยกเลิกการเชื่อมต่อ Google Calendar เรียบร้อย",
      });
    } catch (err) {
      console.error("Google Calendar disconnect error:", err);
      toast({
        variant: "destructive",
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถยกเลิกการเชื่อมต่อได้",
      });
    }
  };

  const syncToGoogle = async (appointmentId: string, appointment: {
    appointment_date: string;
    start_time: string;
    end_time?: string | null;
    appointment_type?: string | null;
    chief_complaint?: string | null;
    notes?: string | null;
    patient_name?: string;
    patient_hn?: string;
    google_event_id?: string | null;
    location_name?: string | null;
  }, providerId?: string | null) => {
    try {
      const action = appointment.google_event_id ? "update" : "create";
      const { data, error } = await supabase.functions.invoke("google-calendar-sync", {
        body: {
          action,
          appointment_id: appointmentId,
          appointment,
          provider_id: providerId || undefined,
        },
      });

      if (error) throw error;
      return data?.event_id || null;
    } catch (err) {
      console.error("Sync to Google Calendar error:", err);
      return null;
    }
  };

  const deleteFromGoogle = async (appointmentId: string, providerId?: string | null) => {
    try {
      await supabase.functions.invoke("google-calendar-sync", {
        body: { action: "delete", appointment_id: appointmentId, provider_id: providerId || undefined },
      });
    } catch (err) {
      console.error("Delete from Google Calendar error:", err);
    }
  };

  const createMeet = async (appointmentId: string, appointment: {
    appointment_date: string;
    start_time: string;
    end_time?: string | null;
    patient_name?: string;
    patient_hn?: string;
    patient_email?: string | null;
    provider_name?: string;
    service_name?: string;
    google_meet_event_id?: string | null;
  }, providerId?: string | null) => {
    try {
      const action = appointment.google_meet_event_id ? "update_meet" : "create_meet";
      const { data, error } = await supabase.functions.invoke("google-calendar-sync", {
        body: { action, appointment_id: appointmentId, appointment, provider_id: providerId || undefined },
      });
      if (error) throw error;
      return data?.meet_link || null;
    } catch (err) {
      console.error("Create Meet error:", err);
      return null;
    }
  };

  const deleteMeet = async (appointmentId: string) => {
    try {
      await supabase.functions.invoke("google-calendar-sync", {
        body: { action: "delete_meet", appointment_id: appointmentId },
      });
    } catch (err) {
      console.error("Delete Meet error:", err);
    }
  };

  const connectClinicMeet = async () => {
    try {
      const { data, error } = await supabase.functions.invoke("google-calendar-auth", {
        body: { origin: window.location.origin, mode: "clinic" },
      });
      if (error) throw error;
      if (data?.url) window.location.href = data.url;
    } catch (err) {
      console.error("Connect clinic Meet error:", err);
      toast({
        variant: "destructive",
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถเชื่อมต่อบัญชี Google สำหรับ Meet ได้",
      });
    }
  };

  const fetchGoogleEvents = async (startDate: string, endDate: string) => {
    if (!status.connected) return [];

    try {
      const { data, error } = await supabase.functions.invoke("google-calendar-sync", {
        body: { action: "fetch_events", start_date: startDate, end_date: endDate },
      });

      if (error) throw error;
      return data?.events || [];
    } catch (err) {
      console.error("Fetch Google events error:", err);
      return [];
    }
  };

  const fetchAllProvidersEvents = async (startDate: string, endDate: string): Promise<Record<string, { email: string; events: Array<{ id: string; summary: string; start: string; end: string; status: string }> }>> => {
    try {
      const { data, error } = await supabase.functions.invoke("google-calendar-sync", {
        body: { action: "fetch_all_events", start_date: startDate, end_date: endDate },
      });

      if (error) throw error;
      return data?.events_by_provider || {};
    } catch (err) {
      console.error("Fetch all providers events error:", err);
      return {};
    }
  };

  return {
    status,
    connect,
    disconnect,
    syncToGoogle,
    deleteFromGoogle,
    createMeet,
    deleteMeet,
    connectClinicMeet,
    fetchGoogleEvents,
    fetchAllProvidersEvents,
    refreshStatus: checkConnection,
  };
};
