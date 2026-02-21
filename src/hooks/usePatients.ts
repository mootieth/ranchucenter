import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

export interface Patient {
  id: string;
  hn: string;
  id_card: string | null;
  prefix: string | null;
  first_name: string;
  last_name: string;
  nickname: string | null;
  gender: string | null;
  date_of_birth: string | null;
  blood_type: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  house_number: string | null;
  moo: string | null;
  street: string | null;
  subdistrict: string | null;
  district: string | null;
  province: string | null;
  postal_code: string | null;
  emergency_contact: string | null;
  emergency_phone: string | null;
  occupation: string | null;
  marital_status: string | null;
  photo_url: string | null;
  notes: string | null;
  status: string | null;
  created_at: string;
  updated_at: string;
}

export interface PatientInput {
  id_card?: string | null;
  prefix?: string | null;
  first_name: string;
  last_name: string;
  nickname?: string | null;
  gender?: string | null;
  date_of_birth?: string | null;
  blood_type?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  house_number?: string | null;
  moo?: string | null;
  street?: string | null;
  subdistrict?: string | null;
  district?: string | null;
  province?: string | null;
  postal_code?: string | null;
  emergency_contact?: string | null;
  emergency_phone?: string | null;
  occupation?: string | null;
  marital_status?: string | null;
  notes?: string | null;
  current_address?: string | null;
  photo_url?: string | null;
}

export const usePatients = () => {
  return useQuery({
    queryKey: ["patients"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("patients")
        .select("*")
        .eq("status", "active")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as Patient[];
    },
  });
};

export const usePatient = (id: string) => {
  return useQuery({
    queryKey: ["patient", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("patients")
        .select("*")
        .eq("id", id)
        .maybeSingle();

      if (error) throw error;
      return data as Patient | null;
    },
    enabled: !!id,
  });
};

export const useCreatePatient = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (input: PatientInput) => {
      // Generate HN
      const { data: hn, error: hnError } = await supabase.rpc("generate_hn");
      if (hnError) throw hnError;

      const { data, error } = await supabase
        .from("patients")
        .insert({
          ...input,
          hn,
          created_by: user?.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data as Patient;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["patients"] });
      toast({
        title: "ลงทะเบียนสำเร็จ",
        description: "เพิ่มข้อมูลผู้ป่วยใหม่เรียบร้อยแล้ว",
      });
    },
    onError: (error) => {
      console.error("Error creating patient:", error);
      toast({
        variant: "destructive",
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถลงทะเบียนผู้ป่วยได้",
      });
    },
  });
};

export const useUpdatePatient = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, input }: { id: string; input: Partial<PatientInput> }) => {
      const { data, error } = await supabase
        .from("patients")
        .update(input)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data as Patient;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["patients"] });
      queryClient.invalidateQueries({ queryKey: ["patient", data.id] });
      toast({
        title: "อัปเดตสำเร็จ",
        description: "แก้ไขข้อมูลผู้ป่วยเรียบร้อยแล้ว",
      });
    },
    onError: (error) => {
      console.error("Error updating patient:", error);
      toast({
        variant: "destructive",
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถแก้ไขข้อมูลผู้ป่วยได้",
      });
    },
  });
};

export const useDeletePatient = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (patientId: string) => {
      const { error } = await supabase.rpc("delete_patient_cascade", {
        _patient_id: patientId,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["patients"] });
      toast({
        title: "ลบสำเร็จ",
        description: "ลบข้อมูลผู้ป่วยและข้อมูลที่เกี่ยวข้องเรียบร้อยแล้ว",
      });
    },
    onError: (error) => {
      console.error("Error deleting patient:", error);
      toast({
        variant: "destructive",
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถลบข้อมูลผู้ป่วยได้",
      });
    },
  });
};

export const useSearchPatients = (searchTerm: string) => {
  return useQuery({
    queryKey: ["patients", "search", searchTerm],
    queryFn: async () => {
      if (!searchTerm.trim()) {
        const { data, error } = await supabase
          .from("patients")
          .select("*")
          .eq("status", "active")
          .order("created_at", { ascending: false })
          .limit(50);

        if (error) throw error;
        return data as Patient[];
      }

      const { data, error } = await supabase
        .from("patients")
        .select("*")
        .eq("status", "active")
      .or(
          `hn.ilike.%${searchTerm}%,first_name.ilike.%${searchTerm}%,last_name.ilike.%${searchTerm}%,phone.ilike.%${searchTerm}%,id_card.ilike.%${searchTerm}%`
        )
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;
      return data as Patient[];
    },
  });
};
