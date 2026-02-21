import { Navigate, useLocation, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { ROUTE_PERMISSION_MAP } from "@/hooks/useUserPermissions";
import { Database } from "@/integrations/supabase/types";
import { Loader2, ShieldX, Home } from "lucide-react";
import { Button } from "@/components/ui/button";

type AppRole = Database["public"]["Enums"]["app_role"];

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: AppRole[];
}

const ProtectedRoute = ({ children, allowedRoles }: ProtectedRouteProps) => {
  const { user, roles, loading, hasPermission } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">กำลังตรวจสอบสิทธิ์...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  // Check permission-based access (takes precedence)
  const permKey = ROUTE_PERMISSION_MAP[location.pathname];
  if (permKey && !hasPermission(permKey)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <div className="flex justify-center">
            <div className="p-4 rounded-full bg-destructive/10">
              <ShieldX className="w-12 h-12 text-destructive" />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-destructive">ไม่มีสิทธิ์เข้าถึง</h1>
          <p className="text-muted-foreground">คุณไม่มีสิทธิ์เข้าถึงหน้านี้</p>
          <Button asChild variant="default" className="mt-4">
            <Link to="/">
              <Home className="w-4 h-4 mr-2" />
              กลับหน้าหลัก
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  // Fallback: legacy role-based check for routes not in ROUTE_PERMISSION_MAP
  if (!permKey && allowedRoles && allowedRoles.length > 0) {
    const hasAccess = allowedRoles.some((role) => roles.includes(role));
    if (!hasAccess) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background">
          <div className="text-center space-y-4">
            <div className="flex justify-center">
              <div className="p-4 rounded-full bg-destructive/10">
                <ShieldX className="w-12 h-12 text-destructive" />
              </div>
            </div>
            <h1 className="text-2xl font-bold text-destructive">ไม่มีสิทธิ์เข้าถึง</h1>
            <p className="text-muted-foreground">คุณไม่มีสิทธิ์เข้าถึงหน้านี้</p>
            <Button asChild variant="default" className="mt-4">
              <Link to="/">
                <Home className="w-4 h-4 mr-2" />
                กลับหน้าหลัก
              </Link>
            </Button>
          </div>
        </div>
      );
    }
  }

  return <>{children}</>;
};

export default ProtectedRoute;
