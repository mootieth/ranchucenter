import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface ProviderSchedule {
  id: string;
  provider_id: string;
  day_of_week: number; // 0=Sunday, 6=Saturday
  start_time: string;
  end_time: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ProviderScheduleInput {
  provider_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_active?: boolean;
}

const DAY_NAMES_TH = ["อาทิตย์", "จันทร์", "อังคาร", "พุธ", "พฤหัสบดี", "ศุกร์", "เสาร์"];

export const getDayNameTh = (dayOfWeek: number) => DAY_NAMES_TH[dayOfWeek] || "";

export const useProviderSchedules = (providerId?: string) => {
  return useQuery({
    queryKey: ["provider_schedules", providerId],
    queryFn: async () => {
      let query = supabase
        .from("provider_schedules")
        .select("*")
        .order("day_of_week", { ascending: true })
        .order("start_time", { ascending: true });

      if (providerId) {
        query = query.eq("provider_id", providerId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as ProviderSchedule[];
    },
    enabled: providerId !== undefined,
  });
};

export const useAllProviderSchedules = () => {
  return useQuery({
    queryKey: ["provider_schedules", "all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("provider_schedules")
        .select("*")
        .eq("is_active", true)
        .order("day_of_week", { ascending: true })
        .order("start_time", { ascending: true });

      if (error) throw error;
      return data as ProviderSchedule[];
    },
  });
};

export const useSaveProviderSchedules = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ providerId, schedules }: { providerId: string; schedules: ProviderScheduleInput[] }) => {
      // Delete existing schedules for this provider
      const { error: deleteError } = await supabase
        .from("provider_schedules")
        .delete()
        .eq("provider_id", providerId);

      if (deleteError) throw deleteError;

      // Insert new schedules
      if (schedules.length > 0) {
        const { error: insertError } = await supabase
          .from("provider_schedules")
          .insert(schedules.map(s => ({
            provider_id: providerId,
            day_of_week: s.day_of_week,
            start_time: s.start_time,
            end_time: s.end_time,
            is_active: s.is_active ?? true,
          })));

        if (insertError) throw insertError;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["provider_schedules"] });
      toast({
        title: "บันทึกสำเร็จ",
        description: "บันทึกตารางเวลาทำงานเรียบร้อยแล้ว",
      });
    },
    onError: (error) => {
      console.error("Error saving provider schedules:", error);
      toast({
        variant: "destructive",
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถบันทึกตารางเวลาได้",
      });
    },
  });
};

/**
 * Check if a given time falls within a provider's working schedule for a specific day.
 */
export const isWithinProviderSchedule = (
  schedules: ProviderSchedule[],
  providerId: string,
  dayOfWeek: number,
  time: string
): boolean => {
  const providerDaySchedules = schedules.filter(
    s => s.provider_id === providerId && s.day_of_week === dayOfWeek && s.is_active
  );

  // If no schedule defined, allow all times (backwards compatible)
  if (providerDaySchedules.length === 0) return true;

  return providerDaySchedules.some(s => {
    return time >= s.start_time.substring(0, 5) && time < s.end_time.substring(0, 5);
  });
};

/**
 * Check if a provider works on a given day of week.
 */
export const providerWorksOnDay = (
  schedules: ProviderSchedule[],
  providerId: string,
  dayOfWeek: number
): boolean => {
  const providerDaySchedules = schedules.filter(
    s => s.provider_id === providerId && s.day_of_week === dayOfWeek && s.is_active
  );
  // If no schedule at all for any day, assume works every day (backwards compatible)
  const hasAnySchedule = schedules.some(s => s.provider_id === providerId && s.is_active);
  if (!hasAnySchedule) return true;
  return providerDaySchedules.length > 0;
};
