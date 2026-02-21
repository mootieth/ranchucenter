import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface DashboardStats {
  totalPatients: number;
  todayAppointments: number;
  pendingBillings: number;
  todayRevenue: number;
}

export const useDashboardStats = () => {
  return useQuery({
    queryKey: ["dashboard", "stats"],
    queryFn: async () => {
      const today = new Date().toISOString().split("T")[0];

      // Get total patients
      const { count: patientCount } = await supabase
        .from("patients")
        .select("*", { count: "exact", head: true })
        .eq("status", "active");

      // Get today's appointments
      const { count: appointmentCount } = await supabase
        .from("appointments")
        .select("*", { count: "exact", head: true })
        .eq("appointment_date", today)
        .neq("status", "cancelled");

      // Get pending billings
      const { count: pendingCount } = await supabase
        .from("billings")
        .select("*", { count: "exact", head: true })
        .eq("payment_status", "pending");

      // Get today's revenue
      const { data: revenueData } = await supabase
        .from("billings")
        .select("paid_amount")
        .eq("billing_date", today)
        .eq("payment_status", "paid");

      const todayRevenue = revenueData?.reduce(
        (sum, b) => sum + (Number(b.paid_amount) || 0),
        0
      ) || 0;

      return {
        totalPatients: patientCount || 0,
        todayAppointments: appointmentCount || 0,
        pendingBillings: pendingCount || 0,
        todayRevenue,
      } as DashboardStats;
    },
  });
};

export const useRecentPatients = (limit = 5) => {
  return useQuery({
    queryKey: ["patients", "recent", limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("patients")
        .select("id, hn, first_name, last_name, phone, created_at")
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data;
    },
  });
};
