import { Clock, Calendar, Loader2 } from "lucide-react";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { useWeekAppointments } from "@/hooks/useAppointments";
import { useAuth } from "@/contexts/AuthContext";
import { format, addDays, startOfDay } from "date-fns";
import { th } from "date-fns/locale";

const typeLabels: Record<string, string> = {
  consultation: "ปรึกษา/บำบัด",
  assessment: "ตรวจประเมิน",
  follow_up: "ติดตามอาการ",
  diagnosis: "ตรวจวินิจฉัย",
};

const statusStyles: Record<string, string> = {
  scheduled: "bg-info/10 text-info border-info/20",
  confirmed: "bg-info/10 text-info border-info/20",
  cancelled: "bg-destructive/10 text-destructive border-destructive/20",
};

const statusLabels: Record<string, string> = {
  scheduled: "ทำนัดหมาย",
  confirmed: "ยืนยันนัดหมาย",
  no_show: "ไม่มา",
  cancelled: "ยกเลิก",
};

const UpcomingAppointments = () => {
  const tomorrow = addDays(startOfDay(new Date()), 1);
  const nextWeekEnd = addDays(tomorrow, 6);
  const startDate = format(tomorrow, "yyyy-MM-dd");
  const endDate = format(nextWeekEnd, "yyyy-MM-dd");

  const { data: appointments, isLoading } = useWeekAppointments(startDate, endDate);
  const { hasPermission, user, isAdmin, isStaff } = useAuth();

  const upcomingAppointments = appointments?.filter((apt) => {
    if (apt.status === "cancelled" || apt.status === "completed") return false;
    // Doctor/Therapist: show only their own cases
    if (!isAdmin && !isStaff && user) {
      return apt.provider_id === user.id;
    }
    return true;
  }) || [];

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName[0] || ""}${lastName[0] || ""}`;
  };

  const formatTime = (time: string) => time.slice(0, 5);

  const formatDateLabel = (dateStr: string) => {
    try {
      return format(new Date(dateStr), "EEE d MMM", { locale: th });
    } catch {
      return dateStr;
    }
  };

  if (isLoading) {
    return (
      <div className="bg-card rounded-2xl shadow-soft p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">นัดหมายสัปดาห์หน้า</h3>
        </div>
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-2xl shadow-soft p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">นัดหมายที่กำลังจะมาถึง</h3>
        {hasPermission("appointments") && (
          <Button variant="ghost" size="sm" className="text-primary" asChild>
            <Link to="/appointments">ดูทั้งหมด</Link>
          </Button>
        )}
      </div>

      {upcomingAppointments.length === 0 ? (
        <div className="text-center py-8">
          <Calendar className="w-10 h-10 mx-auto text-muted-foreground/40 mb-2" />
          <p className="text-muted-foreground text-sm">ไม่มีนัดหมายในสัปดาห์หน้า</p>
        </div>
      ) : (
        <div className="space-y-2 max-h-[400px] overflow-y-auto">
          {upcomingAppointments.slice(0, 10).map((apt) => (
            <Link
              key={apt.id}
              to={`/patients/${apt.patient_id}`}
              className="flex items-center gap-3 p-3 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors block"
            >
              <Avatar className="w-9 h-9">
                <AvatarFallback className="bg-primary/10 text-primary text-xs font-medium">
                  {apt.patients ? getInitials(apt.patients.first_name, apt.patients.last_name) : "?"}
                </AvatarFallback>
              </Avatar>

              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">
                  {apt.patients ? `${apt.patients.first_name} ${apt.patients.last_name}` : "ไม่ระบุ"}
                </p>
                <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {formatDateLabel(apt.appointment_date)}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {formatTime(apt.start_time)}
                  </span>
                </div>
              </div>

              <div className="flex flex-col items-end gap-1">
                <Badge variant="outline" className="text-xs font-normal">
                  {typeLabels[apt.appointment_type || "consultation"] || apt.appointment_type}
                </Badge>
                <Badge
                  variant="outline"
                  className={cn("text-xs", statusStyles[apt.status || "scheduled"])}
                >
                  {statusLabels[apt.status || "scheduled"] || apt.status}
                </Badge>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};

export default UpcomingAppointments;
