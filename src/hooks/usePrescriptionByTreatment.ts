import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Tables } from "@/integrations/supabase/types";

export type PrescriptionWithItems = Tables<"prescriptions"> & {
  prescription_items: Tables<"prescription_items">[];
};

export const usePrescriptionByTreatment = (treatmentId: string | undefined) => {
  return useQuery({
    queryKey: ["prescription-by-treatment", treatmentId],
    queryFn: async () => {
      if (!treatmentId) return null;

      const { data, error } = await supabase
        .from("prescriptions")
        .select(`
          *,
          prescription_items (*)
        `)
        .eq("treatment_id", treatmentId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data as PrescriptionWithItems | null;
    },
    enabled: !!treatmentId,
  });
};
