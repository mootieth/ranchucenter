import { Bell, Search, User, LogOut, Shield, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";

interface HeaderProps {
  title: string;
  sidebarOpen: boolean;
  onToggleSidebar: () => void;
}

const roleLabels: Record<string, string> = {
  admin: "ผู้ดูแลระบบ",
  doctor: "แพทย์",
  therapist: "นักบำบัด",
  staff: "เจ้าหน้าที่",
};

const roleColors: Record<string, string> = {
  admin: "bg-destructive text-destructive-foreground",
  doctor: "bg-primary text-primary-foreground",
  therapist: "bg-secondary text-secondary-foreground",
  staff: "bg-muted text-muted-foreground",
};

const Header = ({ title, sidebarOpen, onToggleSidebar }: HeaderProps) => {
  const { profile, roles, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth");
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .slice(0, 2);
  };

  const primaryRole = roles[0] || "staff";

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between h-16 px-4 md:px-6 bg-background/80 backdrop-blur-lg border-b border-border">
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggleSidebar}
          className="shrink-0"
        >
          <Menu className="w-5 h-5" />
        </Button>
        <h1 className="text-lg md:text-xl font-semibold text-foreground truncate">
          {title}
        </h1>
      </div>

      <div className="flex items-center gap-2 md:gap-4">
        {/* Search * / }
        <div className="relative hidden lg:block">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="ค้นหาผู้ป่วย, นัดหมาย..."
            className="w-64 pl-10 bg-muted/50 border-0 focus-visible:ring-primary/20"
          />
        </div>
        */}

        {/* Notifications */}
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="w-5 h-5 text-muted-foreground" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-accent rounded-full" />
        </Button>

        {/* User Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="flex items-center gap-2 px-2 hover:bg-accent/50"
            >
              <Avatar className="w-10 h-10 border-2 border-primary/20">
                <AvatarImage
                  src={profile?.avatar_url || ""}
                  alt={profile?.full_name}
                />
                <AvatarFallback className="bg-primary text-primary-foreground font-semibold">
                  {profile?.full_name ? getInitials(profile.full_name) : "?"}
                </AvatarFallback>
              </Avatar>
              <div className="text-left hidden sm:block">
                <p className="text-sm font-medium leading-tight">
                  {profile?.full_name || "ผู้ใช้"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {roleLabels[primaryRole] || primaryRole}
                </p>
              </div>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <div className="flex flex-col">
                <span>{profile?.full_name || "ผู้ใช้"}</span>
                <span className="text-xs text-muted-foreground font-normal">
                  {profile?.specialty || "ยังไม่ระบุตำแหน่ง"}
                </span>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => navigate("/my-profile")}>
              <User className="w-4 h-4 mr-2" />
              โปรไฟล์ของฉัน
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Shield className="w-4 h-4 mr-2" />
              สิทธิ์การเข้าถึง
              <div className="ml-auto flex gap-1">
                {roles.map((role) => (
                  <Badge key={role} variant="outline" className="text-xs">
                    {roleLabels[role] || role}
                  </Badge>
                ))}
              </div>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={handleSignOut}
              className="text-destructive focus:text-destructive"
            >
              <LogOut className="w-4 h-4 mr-2" />
              ออกจากระบบ
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
};

export default Header;
