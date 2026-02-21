import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

export interface PatientAllergy {
  id: string;
  patient_id: string;
  allergen: string;
  allergen_type: string | null;
  severity: string | null;
  reaction: string | null;
  first_occurrence: string | null;
  notes: string | null;
  created_at: string;
  patients?: {
    id: string;
    hn: string;
    first_name: string;
    last_name: string;
  };
}

export interface AllergyInput {
  patient_id: string;
  allergen: string;
  allergen_type?: string;
  severity?: string;
  reaction?: string | null;
  first_occurrence?: string | null;
  notes?: string | null;
}

export const useAllergies = () => {
  return useQuery({
    queryKey: ["allergies"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("patient_allergies")
        .select(`
          *,
          patients (id, hn, first_name, last_name)
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as PatientAllergy[];
    },
  });
};

export const usePatientAllergies = (patientId: string) => {
  return useQuery({
    queryKey: ["allergies", "patient", patientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("patient_allergies")
        .select("*")
        .eq("patient_id", patientId)
        .order("severity", { ascending: false });

      if (error) throw error;
      return data as PatientAllergy[];
    },
    enabled: !!patientId,
  });
};

export const useCreateAllergy = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (input: AllergyInput) => {
      const { data, error } = await supabase
        .from("patient_allergies")
        .insert({
          ...input,
          reported_by: user?.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data as PatientAllergy;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["allergies"] });
      toast({
        title: "บันทึกสำเร็จ",
        description: "เพิ่มข้อมูลการแพ้ยาเรียบร้อยแล้ว",
      });
    },
    onError: (error) => {
      console.error("Error creating allergy:", error);
      toast({
        variant: "destructive",
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถเพิ่มข้อมูลการแพ้ยาได้",
      });
    },
  });
};

export const useDeleteAllergy = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("patient_allergies")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["allergies"] });
      toast({
        title: "ลบสำเร็จ",
        description: "ลบข้อมูลการแพ้ยาเรียบร้อยแล้ว",
      });
    },
    onError: (error) => {
      console.error("Error deleting allergy:", error);
      toast({
        variant: "destructive",
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถลบข้อมูลการแพ้ยาได้",
      });
    },
  });
};
