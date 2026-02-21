import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";

export type Medication = Tables<"medications">;

export const useMedications = (searchQuery?: string, categoryFilter?: string, activeOnly: boolean = true) => {
  return useQuery({
    queryKey: ["medications", searchQuery, categoryFilter, activeOnly],
    queryFn: async () => {
      let query = supabase
        .from("medications")
        .select("*")
        .order("category")
        .order("name");

      if (activeOnly) {
        query = query.eq("is_active", true);
      }

      const { data, error } = await query;

      if (error) throw error;

      let filtered = data || [];

      // Client-side search filtering
      if (searchQuery) {
        const search = searchQuery.toLowerCase();
        filtered = filtered.filter((med) =>
          med.name.toLowerCase().includes(search) ||
          med.generic_name?.toLowerCase().includes(search) ||
          med.category?.toLowerCase().includes(search)
        );
      }

      // Category filter
      if (categoryFilter && categoryFilter !== "all") {
        filtered = filtered.filter((med) => med.category === categoryFilter);
      }

      return filtered;
    },
  });
};

export const useMedicationCategories = () => {
  return useQuery({
    queryKey: ["medication-categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("medications")
        .select("category")
        .not("category", "is", null);

      if (error) throw error;

      // Get unique categories
      const categories = [...new Set(data.map((m) => m.category))].filter(Boolean) as string[];
      return categories.sort();
    },
  });
};

export const useMedicationStats = () => {
  return useQuery({
    queryKey: ["medication-stats"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("medications")
        .select("*");

      if (error) throw error;

      const medications = data || [];
      const totalMedications = medications.length;
      const activeMedications = medications.filter((m) => m.is_active).length;
      const lowStock = medications.filter(
        (m) => m.is_active && (m.stock_quantity || 0) <= (m.min_stock || 10)
      ).length;

      // Near expiry (within 90 days)
      const now = new Date();
      const nearExpiry = medications.filter((m) => {
        if (!m.is_active || !(m as any).expiry_date) return false;
        const days = Math.ceil((new Date((m as any).expiry_date).getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        return days <= 90;
      }).length;

      // Count by category
      const categoryCount: Record<string, number> = {};
      medications.forEach((m) => {
        const cat = m.category || "ไม่ระบุ";
        categoryCount[cat] = (categoryCount[cat] || 0) + 1;
      });

      return {
        totalMedications,
        activeMedications,
        lowStock,
        nearExpiry,
        categoryCount,
      };
    },
  });
};

export const useCreateMedication = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (medication: TablesInsert<"medications">) => {
      const { data, error } = await supabase
        .from("medications")
        .insert(medication)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["medications"] });
      queryClient.invalidateQueries({ queryKey: ["medication-stats"] });
      queryClient.invalidateQueries({ queryKey: ["medication-categories"] });
    },
  });
};

export const useUpdateMedication = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...medication }: TablesUpdate<"medications"> & { id: string }) => {
      const { data, error } = await supabase
        .from("medications")
        .update(medication)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["medications"] });
      queryClient.invalidateQueries({ queryKey: ["medication-stats"] });
      queryClient.invalidateQueries({ queryKey: ["medication-categories"] });
    },
  });
};

export const useDeleteMedication = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      // Soft delete - just set is_active to false
      const { error } = await supabase
        .from("medications")
        .update({ is_active: false })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["medications"] });
      queryClient.invalidateQueries({ queryKey: ["medication-stats"] });
    },
  });
};

export const useUpdateStock = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, quantity }: { id: string; quantity: number }) => {
      const { data, error } = await supabase
        .from("medications")
        .update({ stock_quantity: quantity })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["medications"] });
      queryClient.invalidateQueries({ queryKey: ["medication-stats"] });
    },
  });
};
