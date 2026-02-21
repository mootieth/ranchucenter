import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface Provider {
  user_id: string;
  full_name: string;
  specialty: string | null;
  license_number: string | null;
}

export const useProviders = () => {
  return useQuery({
    queryKey: ["providers"],
    queryFn: async (): Promise<Provider[]> => {
      // Fetch user_ids that have doctor, therapist, or admin roles
      const { data: roleData, error: roleError } = await supabase
        .from("user_roles")
        .select("user_id, role")
        .in("role", ["doctor", "therapist"]);

      if (roleError) throw roleError;
      if (!roleData || roleData.length === 0) return [];

      const uniqueUserIds = [...new Set(roleData.map(r => r.user_id))];

      // Fetch profiles for those users
      const { data: profiles, error: profileError } = await supabase
        .from("profiles")
        .select("user_id, full_name, specialty, license_number")
        .in("user_id", uniqueUserIds);

      if (profileError) throw profileError;

      return (profiles || []) as Provider[];
    },
  });
};
