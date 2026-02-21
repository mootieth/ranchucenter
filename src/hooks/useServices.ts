import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface Service {
  id: string;
  name: string;
  description: string | null;
  price: number;
  category: string | null;
  duration_minutes: number | null;
  service_mode: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export const useServices = (includeInactive = false) => {
  return useQuery({
    queryKey: ["services", includeInactive],
    queryFn: async () => {
      let query = supabase
        .from("services")
        .select("*")
        .order("name");
      if (!includeInactive) {
        query = query.eq("is_active", true);
      }
      const { data, error } = await query;
      if (error) throw error;
      return data as Service[];
    },
  });
};

export const useCreateService = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (service: { name: string; description?: string; price: number; category?: string; duration_minutes?: number | null; service_mode?: string }) => {
      const { data, error } = await supabase
        .from("services")
        .insert(service)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["services"] }),
  });
};

export const useUpdateService = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; name?: string; description?: string; price?: number; category?: string; duration_minutes?: number | null; service_mode?: string; is_active?: boolean }) => {
      const { data, error } = await supabase
        .from("services")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["services"] }),
  });
};

export const useDeleteService = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("services").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["services"] }),
  });
};
