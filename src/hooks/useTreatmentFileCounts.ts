import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const useTreatmentFileCounts = (treatmentIds: string[]) => {
  return useQuery({
    queryKey: ["treatment-file-counts", treatmentIds],
    queryFn: async () => {
      if (treatmentIds.length === 0) return {} as Record<string, number>;

      const { data, error } = await supabase
        .from("treatment_files")
        .select("treatment_id")
        .in("treatment_id", treatmentIds);

      if (error) throw error;

      const counts: Record<string, number> = {};
      for (const row of data || []) {
        counts[row.treatment_id] = (counts[row.treatment_id] || 0) + 1;
      }
      return counts;
    },
    enabled: treatmentIds.length > 0,
  });
};
