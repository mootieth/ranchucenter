import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { Database } from "@/integrations/supabase/types";
import { resolvePermissions, type PermissionKey, type UserPermission } from "@/hooks/useUserPermissions";

type AppRole = Database["public"]["Enums"]["app_role"];

interface Profile {
  id: string;
  user_id: string;
  full_name: string;
  avatar_url: string | null;
  phone: string | null;
  license_number: string | null;
  specialty: string | null;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  roles: AppRole[];
  permissions: Set<PermissionKey>;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  hasRole: (role: AppRole) => boolean;
  hasPermission: (key: PermissionKey) => boolean;
  refreshPermissions: () => Promise<void>;
  isAdmin: boolean;
  isDoctor: boolean;
  isTherapist: boolean;
  isStaff: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [permissionOverrides, setPermissionOverrides] = useState<UserPermission[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchUserData = async (userId: string) => {
    try {
      // Fetch profile
      const { data: profileData } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", userId)
        .single();

      if (profileData) {
        setProfile(profileData);
      }

      // Fetch roles
      const { data: rolesData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId);

      const userRoles = rolesData ? rolesData.map((r) => r.role) : [];
      setRoles(userRoles);

      // Fetch permission overrides
      const { data: permsData } = await supabase
        .from("user_permissions")
        .select("user_id, permission_key, is_allowed")
        .eq("user_id", userId);

      setPermissionOverrides((permsData || []) as UserPermission[]);
    } catch (error) {
      console.error("Error fetching user data:", error);
    }
  };

  const refreshPermissions = async () => {
    if (!user?.id) return;
    const { data: permsData } = await supabase
      .from("user_permissions")
      .select("user_id, permission_key, is_allowed")
      .eq("user_id", user.id);
    setPermissionOverrides((permsData || []) as UserPermission[]);
  };

  useEffect(() => {
    let isMounted = true;

    // Listener for ONGOING auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (!isMounted) return;
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          // Set loading true to prevent flash of "no access" while fetching roles
          setLoading(true);
          setTimeout(async () => {
            await fetchUserData(session.user.id);
            if (isMounted) setLoading(false);
          }, 0);
        } else {
          setProfile(null);
          setRoles([]);
          setPermissionOverrides([]);
        }
      }
    );

    // INITIAL load — await fetchUserData before setting loading false
    const initializeAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!isMounted) return;

        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          await fetchUserData(session.user.id);
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    initializeAuth();

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error as Error | null };
  };

  const signUp = async (email: string, password: string, fullName: string) => {
    const redirectUrl = `${window.location.origin}/`;
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: { full_name: fullName },
      },
    });
    return { error: error as Error | null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setProfile(null);
    setRoles([]);
    setPermissionOverrides([]);
  };

  const hasRole = (role: AppRole) => roles.includes(role);
  const permissions = resolvePermissions(roles, permissionOverrides);
  const hasPermission = (key: PermissionKey) => permissions.has(key);

  const value: AuthContextType = {
    user,
    session,
    profile,
    roles,
    permissions,
    loading,
    signIn,
    signUp,
    signOut,
    hasRole,
    hasPermission,
    refreshPermissions,
    isAdmin: hasRole("admin"),
    isDoctor: hasRole("doctor"),
    isTherapist: hasRole("therapist"),
    isStaff: hasRole("staff"),
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
