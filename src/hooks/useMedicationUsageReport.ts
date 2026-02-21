import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface MedicationUsageItem {
  medication_name: string;
  medication_id: string | null;
  total_quantity: number;
  prescription_count: number;
  unit: string;
}

export const useMedicationUsageReport = (startDate: string, endDate: string) => {
  return useQuery({
    queryKey: ["medication-usage-report", startDate, endDate],
    queryFn: async () => {
      // Get prescriptions in date range that are dispensed
      const { data: prescriptions, error: prescError } = await supabase
        .from("prescriptions")
        .select("id, prescription_date, status")
        .gte("prescription_date", startDate)
        .lte("prescription_date", endDate)
        .eq("status", "dispensed");

      if (prescError) throw prescError;
      if (!prescriptions || prescriptions.length === 0) return [];

      const prescriptionIds = prescriptions.map((p) => p.id);

      // Get prescription items for those prescriptions
      const { data: items, error: itemsError } = await supabase
        .from("prescription_items")
        .select("medication_name, medication_id, quantity")
        .in("prescription_id", prescriptionIds);

      if (itemsError) throw itemsError;

      // Aggregate by medication
      const usageMap = new Map<string, MedicationUsageItem>();

      for (const item of items || []) {
        const key = item.medication_id || item.medication_name;
        const existing = usageMap.get(key);
        if (existing) {
          existing.total_quantity += item.quantity;
          existing.prescription_count += 1;
        } else {
          usageMap.set(key, {
            medication_name: item.medication_name,
            medication_id: item.medication_id,
            total_quantity: item.quantity,
            prescription_count: 1,
            unit: "",
          });
        }
      }

      // Get medication units
      const medIds = [...usageMap.values()]
        .map((m) => m.medication_id)
        .filter(Boolean) as string[];

      if (medIds.length > 0) {
        const { data: meds } = await supabase
          .from("medications")
          .select("id, unit")
          .in("id", medIds);

        if (meds) {
          for (const med of meds) {
            for (const usage of usageMap.values()) {
              if (usage.medication_id === med.id) {
                usage.unit = med.unit || "เม็ด";
              }
            }
          }
        }
      }

      return [...usageMap.values()].sort((a, b) => b.total_quantity - a.total_quantity);
    },
    enabled: !!startDate && !!endDate,
  });
};
