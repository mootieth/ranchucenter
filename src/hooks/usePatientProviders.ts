import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface PatientProviderInfo {
  patient_id: string;
  provider_id: string;
  full_name: string;
}

export const usePatientProvidersMap = (patientIds: string[]) => {
  return useQuery({
    queryKey: ["patient-providers-map", patientIds],
    queryFn: async (): Promise<Record<string, PatientProviderInfo[]>> => {
      if (patientIds.length === 0) return {};

      const { data, error } = await supabase
        .from("patient_providers")
        .select("patient_id, provider_id")
        .in("patient_id", patientIds);

      if (error) throw error;
      if (!data || data.length === 0) return {};

      const providerIds = [...new Set(data.map((d) => d.provider_id))];

      const { data: profiles, error: profileError } = await supabase
        .from("profiles")
        .select("user_id, full_name")
        .in("user_id", providerIds);

      if (profileError) throw profileError;

      const profileMap = Object.fromEntries(
        (profiles || []).map((p) => [p.user_id, p.full_name])
      );

      const result: Record<string, PatientProviderInfo[]> = {};
      for (const row of data) {
        if (!result[row.patient_id]) result[row.patient_id] = [];
        result[row.patient_id].push({
          patient_id: row.patient_id,
          provider_id: row.provider_id,
          full_name: profileMap[row.provider_id] || "ไม่ทราบชื่อ",
        });
      }
      return result;
    },
    enabled: patientIds.length > 0,
  });
};
