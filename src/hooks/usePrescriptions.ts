import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Tables, TablesInsert } from "@/integrations/supabase/types";

export type PrescriptionItem = Tables<"prescription_items">;

export type Prescription = Tables<"prescriptions"> & {
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
  prescription_items?: PrescriptionItem[];
  billing_status?: string | null;
};

export const usePrescriptions = (searchQuery?: string, statusFilter?: string) => {
  return useQuery({
    queryKey: ["prescriptions", searchQuery, statusFilter],
    queryFn: async () => {
      let query = supabase
        .from("prescriptions")
        .select(`
          *,
          patients (id, first_name, last_name, hn, prefix, phone, id_card),
          prescription_items (*)
        `)
        .order("prescription_date", { ascending: false })
        .order("created_at", { ascending: false });

      if (statusFilter && statusFilter !== "all") {
        query = query.eq("status", statusFilter);
      }

      const { data: prescriptionsData, error } = await query;

      if (error) throw error;

      // Get all provider IDs to fetch profiles
      const providerIds = prescriptionsData
        .map(rx => rx.provider_id)
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

      // Fetch billing statuses linked via treatment_id
      const treatmentIds = prescriptionsData
        .map(rx => rx.treatment_id)
        .filter((id): id is string => id !== null);

      let billingMap: Record<string, string> = {};
      if (treatmentIds.length > 0) {
        const { data: billingsData } = await supabase
          .from("billings")
          .select("treatment_id, payment_status")
          .in("treatment_id", treatmentIds);

        if (billingsData) {
          billingMap = billingsData.reduce((acc, b) => {
            if (b.treatment_id) acc[b.treatment_id] = b.payment_status || "pending";
            return acc;
          }, {} as Record<string, string>);
        }
      }

      // Map prescriptions with provider profiles and billing status
      let filtered: Prescription[] = prescriptionsData.map(rx => ({
        ...rx,
        provider_profile: rx.provider_id ? profilesMap[rx.provider_id] || null : null,
        billing_status: rx.treatment_id ? billingMap[rx.treatment_id] || null : null,
      }));

      // Client-side filtering for search
      if (searchQuery) {
        const search = searchQuery.toLowerCase();
        filtered = filtered.filter((rx) => {
          const patientName = `${rx.patients?.first_name || ""} ${rx.patients?.last_name || ""}`.toLowerCase();
          const hn = rx.patients?.hn?.toLowerCase() || "";
          const phone = rx.patients?.phone || "";
          const idCard = rx.patients?.id_card?.toLowerCase() || "";
          const hasMedication = rx.prescription_items?.some((item) =>
            item.medication_name.toLowerCase().includes(search)
          );
          return patientName.includes(search) || hn.includes(search) || phone.includes(search) || idCard.includes(search) || hasMedication;
        });
      }

      return filtered;
    },
  });
};

export const usePrescription = (id: string | undefined) => {
  return useQuery({
    queryKey: ["prescription", id],
    queryFn: async () => {
      if (!id) return null;

      const { data, error } = await supabase
        .from("prescriptions")
        .select(`
          *,
          patients (id, first_name, last_name, hn, prefix),
          prescription_items (*)
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
      } as Prescription;
    },
    enabled: !!id,
  });
};

export const useCreatePrescription = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      prescription,
      items,
    }: {
      prescription: TablesInsert<"prescriptions">;
      items: Omit<TablesInsert<"prescription_items">, "prescription_id">[];
    }) => {
      // Create prescription first
      const { data: prescriptionData, error: prescriptionError } = await supabase
        .from("prescriptions")
        .insert(prescription)
        .select()
        .single();

      if (prescriptionError) throw prescriptionError;

      // Create prescription items
      if (items.length > 0) {
        const itemsWithPrescriptionId = items.map((item) => ({
          ...item,
          prescription_id: prescriptionData.id,
        }));

        const { error: itemsError } = await supabase
          .from("prescription_items")
          .insert(itemsWithPrescriptionId);

        if (itemsError) throw itemsError;
      }

      return prescriptionData;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["prescriptions"] });
    },
  });
};

export const useUpdatePrescriptionStatus = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      // Update prescription status
      const { data, error } = await supabase
        .from("prescriptions")
        .update({ status })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;

      // If dispensed, deduct stock for each prescription item
      if (status === "dispensed") {
        const { data: items, error: itemsError } = await supabase
          .from("prescription_items")
          .select("medication_id, medication_name, quantity")
          .eq("prescription_id", id);

        if (itemsError) throw itemsError;

        const { data: { user } } = await supabase.auth.getUser();

        for (const item of items || []) {
          if (!item.medication_id) continue;

          // Get current stock
          const { data: med, error: medError } = await supabase
            .from("medications")
            .select("stock_quantity")
            .eq("id", item.medication_id)
            .single();

          if (medError) throw medError;

          const previousStock = med.stock_quantity || 0;
          const newStock = Math.max(previousStock - item.quantity, 0);

          const { error: updateError } = await supabase
            .from("medications")
            .update({ stock_quantity: newStock })
            .eq("id", item.medication_id);

          if (updateError) throw updateError;

          // Log stock movement
          await supabase.from("stock_movements").insert({
            medication_id: item.medication_id,
            movement_type: "out",
            quantity: item.quantity,
            previous_stock: previousStock,
            new_stock: newStock,
            reference_type: "prescription",
            reference_id: id,
            notes: `จ่ายยา ${item.medication_name} จำนวน ${item.quantity}`,
            created_by: user?.id || null,
          } as any);
        }
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["prescriptions"] });
      queryClient.invalidateQueries({ queryKey: ["prescription-by-treatment"] });
      queryClient.invalidateQueries({ queryKey: ["medications"] });
      queryClient.invalidateQueries({ queryKey: ["medication-stats"] });
      queryClient.invalidateQueries({ queryKey: ["stock-movements"] });
    },
  });
};

export const useMedications = () => {
  return useQuery({
    queryKey: ["medications"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("medications")
        .select("*")
        .eq("is_active", true)
        .order("name");

      if (error) throw error;
      return data;
    },
  });
};
