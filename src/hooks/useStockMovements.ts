import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface StockMovement {
  id: string;
  medication_id: string;
  movement_type: string;
  quantity: number;
  previous_stock: number;
  new_stock: number;
  reference_type: string | null;
  reference_id: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
}

export interface StockMovementWithMedication extends StockMovement {
  medication_name: string;
  medication_unit: string;
}

export const useStockMovements = (medicationId?: string, limit: number = 100, startDate?: string, endDate?: string) => {
  return useQuery({
    queryKey: ["stock-movements", medicationId, limit, startDate, endDate],
    queryFn: async () => {
      let query = supabase
        .from("stock_movements")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(limit);

      if (medicationId) {
        query = query.eq("medication_id", medicationId);
      }

      if (startDate) {
        query = query.gte("created_at", `${startDate}T00:00:00`);
      }
      if (endDate) {
        query = query.lte("created_at", `${endDate}T23:59:59`);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Fetch medication names
      const medIds = [...new Set((data || []).map((m: any) => m.medication_id))];
      const { data: meds } = await supabase
        .from("medications")
        .select("id, name, unit")
        .in("id", medIds);

      const medMap = new Map(meds?.map((m) => [m.id, { name: m.name, unit: m.unit }]) || []);

      return (data || []).map((m: any) => ({
        ...m,
        medication_name: medMap.get(m.medication_id)?.name || "ไม่ทราบ",
        medication_unit: medMap.get(m.medication_id)?.unit || "เม็ด",
      })) as StockMovementWithMedication[];
    },
  });
};

export const useCreateStockMovement = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (movement: {
      medication_id: string;
      movement_type: string;
      quantity: number;
      previous_stock: number;
      new_stock: number;
      reference_type?: string;
      reference_id?: string;
      notes?: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();

      const { data, error } = await supabase
        .from("stock_movements")
        .insert({
          ...movement,
          created_by: user?.id || null,
        } as any)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["stock-movements"] });
    },
  });
};
