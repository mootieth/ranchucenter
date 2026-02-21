import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Database } from "@/integrations/supabase/types";
import { toast } from "@/hooks/use-toast";

type AppRole = Database["public"]["Enums"]["app_role"];

export interface UserWithRoles {
  id: string;
  user_id: string;
  full_name: string;
  nickname: string | null;
  avatar_url: string | null;
  phone: string | null;
  license_number: string | null;
  specialty: string | null;
  salary: number | null;
  is_active: boolean;
  resignation_date: string | null;
  deactivation_reason: string | null;
  house_number: string | null;
  moo: string | null;
  street: string | null;
  subdistrict: string | null;
  district: string | null;
  province: string | null;
  postal_code: string | null;
  id_card: string | null;
  date_of_birth: string | null;
  created_at: string;
  roles: AppRole[];
  email?: string;
}

export const useUsers = () => {
  return useQuery({
    queryKey: ["users-with-roles"],
    queryFn: async (): Promise<UserWithRoles[]> => {
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });

      if (profilesError) throw profilesError;

      const { data: userRoles, error: rolesError } = await supabase
        .from("user_roles")
        .select("user_id, role");

      if (rolesError) throw rolesError;

      const rolesMap = new Map<string, AppRole[]>();
      userRoles?.forEach((ur) => {
        const existing = rolesMap.get(ur.user_id) || [];
        existing.push(ur.role);
        rolesMap.set(ur.user_id, existing);
      });

      return (profiles || []).map((profile) => ({
        ...profile,
        nickname: (profile as any).nickname ?? null,
        salary: (profile as any).salary ?? 0,
        is_active: (profile as any).is_active ?? true,
        resignation_date: (profile as any).resignation_date ?? null,
        deactivation_reason: (profile as any).deactivation_reason ?? null,
        house_number: (profile as any).house_number ?? null,
        moo: (profile as any).moo ?? null,
        street: (profile as any).street ?? null,
        subdistrict: (profile as any).subdistrict ?? null,
        district: (profile as any).district ?? null,
        province: (profile as any).province ?? null,
        postal_code: (profile as any).postal_code ?? null,
        id_card: (profile as any).id_card ?? null,
        date_of_birth: (profile as any).date_of_birth ?? null,
        roles: rolesMap.get(profile.user_id) || [],
      }));
    },
  });
};

export const useAddUserRole = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: AppRole }) => {
      const { error } = await supabase
        .from("user_roles")
        .insert({ user_id: userId, role });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users-with-roles"] });
      toast({
        title: "สำเร็จ",
        description: "เพิ่มสิทธิ์ผู้ใช้เรียบร้อยแล้ว",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "เกิดข้อผิดพลาด",
        description: error.message.includes("duplicate")
          ? "ผู้ใช้มีสิทธิ์นี้อยู่แล้ว"
          : error.message,
        variant: "destructive",
      });
    },
  });
};

export const useRemoveUserRole = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: AppRole }) => {
      const { error } = await supabase
        .from("user_roles")
        .delete()
        .eq("user_id", userId)
        .eq("role", role);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users-with-roles"] });
      toast({
        title: "สำเร็จ",
        description: "ลบสิทธิ์ผู้ใช้เรียบร้อยแล้ว",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "เกิดข้อผิดพลาด",
        description: error.message,
        variant: "destructive",
      });
    },
  });
};

export const useUpdateUserRoles = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ userId, roles }: { userId: string; roles: AppRole[] }) => {
      const { data: currentRoles, error: fetchError } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId);

      if (fetchError) throw fetchError;

      const currentRoleSet = new Set(currentRoles?.map((r) => r.role) || []);
      const newRoleSet = new Set(roles);

      const rolesToAdd = roles.filter((role) => !currentRoleSet.has(role));
      const rolesToRemove = (currentRoles?.map((r) => r.role) || []).filter(
        (role) => !newRoleSet.has(role)
      );

      if (rolesToAdd.length > 0) {
        const { error: insertError } = await supabase
          .from("user_roles")
          .insert(rolesToAdd.map((role) => ({ user_id: userId, role })));

        if (insertError) throw insertError;
      }

      if (rolesToRemove.length > 0) {
        for (const role of rolesToRemove) {
          const { error: deleteError } = await supabase
            .from("user_roles")
            .delete()
            .eq("user_id", userId)
            .eq("role", role);

          if (deleteError) throw deleteError;
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users-with-roles"] });
      toast({
        title: "สำเร็จ",
        description: "อัปเดตสิทธิ์ผู้ใช้เรียบร้อยแล้ว",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "เกิดข้อผิดพลาด",
        description: error.message,
        variant: "destructive",
      });
    },
  });
};

export const useRegisterUser = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      email: string;
      password: string;
      full_name: string;
      phone?: string;
      specialty?: string;
      license_number?: string;
      role: AppRole;
      salary?: number;
    }) => {
      const { data: result, error } = await supabase.functions.invoke("register-user", {
        body: data,
      });

      if (error) throw error;
      if (result?.error) throw new Error(result.error);

      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users-with-roles"] });
      toast({
        title: "สำเร็จ",
        description: "ลงทะเบียนผู้ใช้ใหม่เรียบร้อยแล้ว",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "เกิดข้อผิดพลาด",
        description: error.message,
        variant: "destructive",
      });
    },
  });
};

export const useDeleteUser = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (userId: string) => {
      const { data, error } = await supabase.functions.invoke("delete-user", {
        body: { user_id: userId },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users-with-roles"] });
      toast({ title: "สำเร็จ", description: "ลบผู้ใช้เรียบร้อยแล้ว" });
    },
    onError: (error: Error) => {
      toast({ title: "เกิดข้อผิดพลาด", description: error.message, variant: "destructive" });
    },
  });
};

export const useUpdateUserProfile = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      userId,
      data,
    }: {
      userId: string;
      data: {
        full_name?: string;
        nickname?: string | null;
        phone?: string;
        specialty?: string;
        license_number?: string;
        avatar_url?: string;
        salary?: number;
        is_active?: boolean;
        resignation_date?: string | null;
        deactivation_reason?: string | null;
        house_number?: string | null;
        moo?: string | null;
        street?: string | null;
        subdistrict?: string | null;
        district?: string | null;
        province?: string | null;
        postal_code?: string | null;
        id_card?: string | null;
        date_of_birth?: string | null;
      };
    }) => {
      const { error } = await supabase
        .from("profiles")
        .update(data as any)
        .eq("user_id", userId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users-with-roles"] });
      toast({
        title: "สำเร็จ",
        description: "อัปเดตข้อมูลผู้ใช้เรียบร้อยแล้ว",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "เกิดข้อผิดพลาด",
        description: error.message,
        variant: "destructive",
      });
    },
  });
};