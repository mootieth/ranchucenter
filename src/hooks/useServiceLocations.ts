import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface ServiceLocation {
  id: string;
  name: string;
  address: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export const useServiceLocations = (includeInactive = false) => {
  return useQuery({
    queryKey: ["service_locations", includeInactive],
    queryFn: async () => {
      let query = supabase
        .from("service_locations")
        .select("*")
        .order("name");
      if (!includeInactive) {
        query = query.eq("is_active", true);
      }
      const { data, error } = await query;
      if (error) throw error;
      return data as ServiceLocation[];
    },
  });
};

export const useCreateServiceLocation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (location: { name: string; address?: string }) => {
      const { data, error } = await supabase
        .from("service_locations")
        .insert(location)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["service_locations"] }),
  });
};

export const useUpdateServiceLocation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; name?: string; address?: string; is_active?: boolean }) => {
      const { data, error } = await supabase
        .from("service_locations")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["service_locations"] }),
  });
};

export const useDeleteServiceLocation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("service_locations").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["service_locations"] }),
  });
};
