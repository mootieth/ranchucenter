import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface UserPermission {
  user_id: string;
  permission_key: string;
  is_allowed: boolean;
}

// All available permission keys mapped to menu labels
export const PERMISSION_KEYS = {
  dashboard: "แดชบอร์ด",
  appointments: "ตารางนัดหมาย",
  treatments: "บันทึกการรักษา",
  register: "ลงทะเบียนผู้ป่วย",
  patients: "ทะเบียนผู้ป่วย",
  prescriptions: "การจ่ายยา",
  allergies: "ประวัติแพ้ยา",
  billing: "ออกใบเสร็จ",
  inventory: "จัดการคลังยา",
  users: "จัดการผู้ใช้",
  permissions: "กำหนดสิทธิ์",
  settings: "ตั้งค่าบริการ",
} as const;

export type PermissionKey = keyof typeof PERMISSION_KEYS;

// Map route paths to permission keys
export const ROUTE_PERMISSION_MAP: Record<string, PermissionKey> = {
  "/": "dashboard",
  "/appointments": "appointments",
  "/treatments": "treatments",
  "/register": "register",
  "/patients": "patients",
  "/prescriptions": "prescriptions",
  "/allergies": "allergies",
  "/billing": "billing",
  "/inventory": "inventory",
  "/medications": "inventory",
  "/users": "users",
  "/permissions": "permissions",
  "/settings": "settings",
};

// Default permissions per role
type AppRole = "admin" | "doctor" | "therapist" | "staff";

const ROLE_DEFAULTS: Record<AppRole, PermissionKey[]> = {
  admin: Object.keys(PERMISSION_KEYS) as PermissionKey[],

  doctor: ["dashboard", "appointments", "treatments", "register", "patients", "prescriptions", "allergies", "inventory"],
  therapist: ["dashboard", "appointments", "treatments", "register", "patients", "allergies"],
  staff: ["dashboard", "appointments", "register", "patients", "allergies", "billing"],
};

/**
 * Get default permissions based on roles (union of all role defaults)
 */
export const getDefaultPermissions = (roles: AppRole[]): Set<PermissionKey> => {
  const perms = new Set<PermissionKey>();
  for (const role of roles) {
    const defaults = ROLE_DEFAULTS[role];
    if (defaults) defaults.forEach((p) => perms.add(p));
  }
  return perms;
};

/**
 * Resolve effective permissions: role defaults + per-user overrides
 */
export const resolvePermissions = (
  roles: AppRole[],
  overrides: UserPermission[]
): Set<PermissionKey> => {
  const defaults = getDefaultPermissions(roles);
  const overrideMap = new Map(overrides.map((o) => [o.permission_key, o.is_allowed]));

  const effective = new Set<PermissionKey>();

  // All possible keys
  for (const key of Object.keys(PERMISSION_KEYS) as PermissionKey[]) {
    if (overrideMap.has(key)) {
      if (overrideMap.get(key)) effective.add(key);
    } else if (defaults.has(key)) {
      effective.add(key);
    }
  }

  return effective;
};

/**
 * Fetch current user's own permissions (for sidebar/route guard)
 */
export const useMyPermissions = (userId: string | undefined) => {
  return useQuery({
    queryKey: ["user-permissions", "my", userId],
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from("user_permissions")
        .select("user_id, permission_key, is_allowed")
        .eq("user_id", userId);
      if (error) throw error;
      return (data || []) as UserPermission[];
    },
    enabled: !!userId,
  });
};

/**
 * Fetch permissions for a specific user (admin use)
 */
export const useUserPermissions = (userId: string | undefined) => {
  return useQuery({
    queryKey: ["user-permissions", userId],
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from("user_permissions")
        .select("user_id, permission_key, is_allowed")
        .eq("user_id", userId);
      if (error) throw error;
      return (data || []) as UserPermission[];
    },
    enabled: !!userId,
  });
};

/**
 * Save permission overrides for a user (admin use)
 */
export const useSaveUserPermissions = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      userId,
      permissions,
    }: {
      userId: string;
      permissions: { permission_key: string; is_allowed: boolean }[];
    }) => {
      // Delete existing permissions for this user
      const { error: deleteError } = await supabase
        .from("user_permissions")
        .delete()
        .eq("user_id", userId);
      if (deleteError) throw deleteError;

      // Insert new permissions (only overrides - skip ones matching defaults)
      if (permissions.length > 0) {
        const { error: insertError } = await supabase
          .from("user_permissions")
          .insert(
            permissions.map((p) => ({
              user_id: userId,
              permission_key: p.permission_key,
              is_allowed: p.is_allowed,
            }))
          );
        if (insertError) throw insertError;
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["user-permissions", variables.userId] });
      queryClient.invalidateQueries({ queryKey: ["user-permissions", "my", variables.userId] });
      queryClient.invalidateQueries({ queryKey: ["all-user-permissions"] });
    },
  });
};
