import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { LayoutDashboard, UserPlus, Users, Calendar, Receipt, Pill, AlertTriangle, FileText, Settings, Shield, ShieldCheck, Package, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import logoImg from "@/assets/logo.png";
import { ROUTE_PERMISSION_MAP, type PermissionKey } from "@/hooks/useUserPermissions";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useIsMobile } from "@/hooks/use-mobile";

interface MenuItem {
  icon: React.ElementType;
  label: string;
  path: string;
  permissionKey?: PermissionKey;
}

const mainMenuItems: MenuItem[] = [
  { icon: LayoutDashboard, label: "แดชบอร์ด", path: "/", permissionKey: "dashboard" },
  { icon: Calendar, label: "ตารางนัดหมาย", path: "/appointments", permissionKey: "appointments" },
  { icon: FileText, label: "บันทึกการรักษา", path: "/treatments", permissionKey: "treatments" },
  { icon: UserPlus, label: "ลงทะเบียนผู้ป่วย", path: "/register", permissionKey: "register" },
  { icon: Users, label: "ทะเบียนผู้ป่วย", path: "/patients", permissionKey: "patients" },
  { icon: Pill, label: "การจ่ายยา", path: "/prescriptions", permissionKey: "prescriptions" },
  { icon: AlertTriangle, label: "ประวัติแพ้ยา", path: "/allergies", permissionKey: "allergies" },
  { icon: Receipt, label: "ออกใบเสร็จ", path: "/billing", permissionKey: "billing" },
];

const settingsMenuItems: MenuItem[] = [
  { icon: Package, label: "จัดการคลังยา", path: "/inventory", permissionKey: "inventory" },
  { icon: Shield, label: "จัดการผู้ใช้", path: "/users", permissionKey: "users" },
  { icon: ShieldCheck, label: "กำหนดสิทธิ์", path: "/permissions", permissionKey: "permissions" },
  { icon: Settings, label: "ตั้งค่าบริการ", path: "/settings", permissionKey: "settings" },
];

interface SidebarProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const SidebarNavItem = ({ item, collapsed, onNavigate }: { item: MenuItem; collapsed: boolean; onNavigate?: () => void }) => {
  const location = useLocation();
  const isActive = location.pathname === item.path;

  const link = (
    <Link
      to={item.path}
      onClick={onNavigate}
      className={cn(
        "sidebar-link",
        collapsed && "justify-center px-0",
        isActive && "sidebar-link-active"
      )}
    >
      <item.icon className="w-5 h-5 shrink-0" />
      {!collapsed && <span className="font-medium">{item.label}</span>}
    </Link>
  );

  if (collapsed) {
    return (
      <Tooltip delayDuration={0}>
        <TooltipTrigger asChild>{link}</TooltipTrigger>
        <TooltipContent side="right" className="font-medium">
          {item.label}
        </TooltipContent>
      </Tooltip>
    );
  }

  return link;
};

const SidebarNav = ({ collapsed = false, onNavigate }: { collapsed?: boolean; onNavigate?: () => void }) => {
  const { hasPermission } = useAuth();
  const location = useLocation();
  const [settingsOpen, setSettingsOpen] = useState(() => {
    return settingsMenuItems.some(item => location.pathname === item.path);
  });

  const filterItems = (items: MenuItem[]) =>
    items.filter((item) => {
      if (!item.permissionKey) return true;
      return hasPermission(item.permissionKey);
    });

  const menuItems = filterItems(mainMenuItems);
  const settingsItems = filterItems(settingsMenuItems);

  const isSettingsActive = settingsItems.some(item => location.pathname === item.path);

  return (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className={cn(
        "flex items-center border-b border-sidebar-border",
        collapsed ? "justify-center px-2 py-6" : "gap-3 px-6 py-6"
      )}>
        <img src={logoImg} alt="Ranchu Center" className="w-10 h-10 rounded-full object-cover shrink-0" />
        {!collapsed && (
          <div>
            <h1 className="text-lg font-bold text-sidebar-foreground">Ranchu Center</h1>
            <p className="text-xs text-sidebar-foreground/60">คลินิกสุขภาพจิต</p>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className={cn("flex-1 space-y-1 overflow-y-auto scrollbar-thin", collapsed ? "p-2" : "p-4")}>
        {menuItems.map((item) => (
          <SidebarNavItem key={item.path} item={item} collapsed={collapsed} onNavigate={onNavigate} />
        ))}
      </nav>

      {/* Settings group - collapsible */}
      {settingsItems.length > 0 && (
        <div className={cn("border-t border-sidebar-border", collapsed ? "p-2" : "p-4")}>
          {collapsed ? (
            <Tooltip delayDuration={0}>
              <TooltipTrigger asChild>
                <button
                  onClick={() => setSettingsOpen(!settingsOpen)}
                  className={cn(
                    "sidebar-link justify-center px-0 w-full",
                    isSettingsActive && "sidebar-link-active"
                  )}
                >
                  <Settings className="w-5 h-5 shrink-0" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right" className="font-medium p-0">
                <div className="py-1">
                  {settingsItems.map((item) => (
                    <Link
                      key={item.path}
                      to={item.path}
                      onClick={onNavigate}
                      className={cn(
                        "flex items-center gap-2 px-3 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground transition-colors",
                        location.pathname === item.path && "text-primary font-medium"
                      )}
                    >
                      <item.icon className="w-4 h-4" />
                      {item.label}
                    </Link>
                  ))}
                </div>
              </TooltipContent>
            </Tooltip>
          ) : (
            <>
              <button
                onClick={() => setSettingsOpen(!settingsOpen)}
                className={cn(
                  "sidebar-link w-full justify-between",
                  isSettingsActive && "text-sidebar-foreground"
                )}
              >
                <span className="flex items-center gap-3">
                  <Settings className="w-5 h-5 shrink-0" />
                  <span className="font-medium">ตั้งค่า</span>
                </span>
                <ChevronDown className={cn(
                  "w-4 h-4 transition-transform duration-200",
                  settingsOpen && "rotate-180"
                )} />
              </button>
              {settingsOpen && (
                <div className="ml-4 mt-1 space-y-1">
                  {settingsItems.map((item) => (
                    <SidebarNavItem key={item.path} item={item} collapsed={collapsed} onNavigate={onNavigate} />
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
};

const SIDEBAR_EXPANDED = 256; // w-64
const SIDEBAR_COLLAPSED = 64; // w-16

const Sidebar = ({ open, onOpenChange }: SidebarProps) => {
  const isMobile = useIsMobile();

  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="left" className="p-0 w-72 bg-sidebar text-sidebar-foreground border-sidebar-border">
          <SidebarNav onNavigate={() => onOpenChange(false)} />
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <aside
      className="fixed left-0 top-0 z-40 h-screen bg-sidebar text-sidebar-foreground transition-all duration-300"
      style={{ width: open ? SIDEBAR_EXPANDED : SIDEBAR_COLLAPSED }}
    >
      <SidebarNav collapsed={!open} />
    </aside>
  );
};

export { SIDEBAR_EXPANDED, SIDEBAR_COLLAPSED };
export default Sidebar;
