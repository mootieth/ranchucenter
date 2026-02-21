import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Tables, TablesInsert } from "@/integrations/supabase/types";

export type Treatment = Tables<"treatments"> & {
  patients?: {
    id: string;
    first_name: string;
    last_name: string;
    hn: string;
    prefix?: string | null;
    phone?: string | null;
    id_card?: string | null;
  } | null;
  provider_profile?: {
    full_name: string;
  } | null;
};

export const useTreatments = (searchQuery?: string, typeFilter?: string) => {
  return useQuery({
    queryKey: ["treatments"],
    queryFn: async () => {
      // First get treatments with patients
      const { data: treatmentsData, error: treatmentsError } = await supabase
        .from("treatments")
        .select(`
          *,
          patients (id, first_name, last_name, hn, prefix, phone, id_card)
        `)
        .order("treatment_date", { ascending: false })
        .order("created_at", { ascending: false });

      if (treatmentsError) throw treatmentsError;

      // Get all provider IDs to fetch profiles
      const providerIds = treatmentsData
        .map(t => t.provider_id)
        .filter((id): id is string => id !== null);

      // Fetch profiles for providers
      let profilesMap: Record<string, { full_name: string }> = {};
      if (providerIds.length > 0) {
        const { data: profilesData } = await supabase
          .from("profiles")
          .select("user_id, full_name")
          .in("user_id", providerIds);

        if (profilesData) {
          profilesMap = profilesData.reduce((acc, p) => {
            acc[p.user_id] = { full_name: p.full_name };
            return acc;
          }, {} as Record<string, { full_name: string }>);
        }
      }

      // Map treatments with provider profiles
      return treatmentsData.map(t => ({
        ...t,
        provider_profile: t.provider_id ? profilesMap[t.provider_id] || null : null,
      })) as Treatment[];
    },
    select: (data) => {
      let filtered = data;

      if (searchQuery) {
        const search = searchQuery.toLowerCase();
        filtered = filtered.filter((t) => {
          const patientName = `${t.patients?.prefix || ""}${t.patients?.first_name || ""} ${t.patients?.last_name || ""}`.toLowerCase();
          const hn = t.patients?.hn?.toLowerCase() || "";
          const phone = t.patients?.phone?.toLowerCase() || "";
          const idCard = t.patients?.id_card?.toLowerCase() || "";
          const diagnosis = t.diagnosis?.toLowerCase() || "";
          return patientName.includes(search) || hn.includes(search) || phone.includes(search) || idCard.includes(search) || diagnosis.includes(search);
        });
      }

      return filtered;
    },
  });
};

export const useTreatment = (id: string | undefined) => {
  return useQuery({
    queryKey: ["treatment", id],
    queryFn: async () => {
      if (!id) return null;

      const { data, error } = await supabase
        .from("treatments")
        .select(`
          *,
          patients (id, first_name, last_name, hn, prefix, phone, id_card)
        `)
        .eq("id", id)
        .maybeSingle();

      if (error) throw error;
      if (!data) return null;

      // Fetch provider profile if exists
      let providerProfile = null;
      if (data.provider_id) {
        const { data: profileData } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("user_id", data.provider_id)
          .maybeSingle();
        providerProfile = profileData;
      }

      return {
        ...data,
        provider_profile: providerProfile,
      } as Treatment;
    },
    enabled: !!id,
  });
};

export const useCreateTreatment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (treatment: TablesInsert<"treatments">) => {
      const { data, error } = await supabase
        .from("treatments")
        .insert(treatment)
        .select()
        .single();

      if (error) throw error;

      // Auto-update appointment status to completed when treatment is linked
      if (data.appointment_id) {
        await supabase
          .from("appointments")
          .update({ status: "completed" })
          .eq("id", data.appointment_id);
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["treatments"] });
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
    },
  });
};

export const useUpdateTreatment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string } & Partial<TablesInsert<"treatments">>) => {
      const { data, error } = await supabase
        .from("treatments")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["treatments"] });
    },
  });
};

export const useDeleteTreatmentCascade = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (treatmentId: string) => {
      const { error } = await supabase.rpc("delete_treatment_cascade", {
        _treatment_id: treatmentId,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["treatments"] });
      queryClient.invalidateQueries({ queryKey: ["prescriptions"] });
      queryClient.invalidateQueries({ queryKey: ["billings"] });
    },
  });
};
