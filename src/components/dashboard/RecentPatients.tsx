import { MoreHorizontal, Eye, FileText, Calendar, Loader2 } from "lucide-react";
import { Link } from "react-router-dom";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useRecentPatients } from "@/hooks/useDashboardStats";
import { useAuth } from "@/contexts/AuthContext";
import { format } from "date-fns";
import { th } from "date-fns/locale";

const RecentPatients = () => {
  const { data: patients, isLoading } = useRecentPatients(5);
  const { hasPermission } = useAuth();

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName[0] || ""}${lastName[0] || ""}`;
  };

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), "d MMM yyyy", { locale: th });
    } catch {
      return dateString;
    }
  };

  if (isLoading) {
    return (
      <div className="bg-card rounded-2xl shadow-soft p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">ผู้ป่วยล่าสุด</h3>
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
        <h3 className="text-lg font-semibold">ผู้ป่วยล่าสุด</h3>
        {hasPermission("patients") && (
          <Button variant="ghost" size="sm" className="text-primary" asChild>
            <Link to="/patients">ดูทั้งหมด</Link>
          </Button>
        )}
      </div>

      {!patients || patients.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-muted-foreground text-sm">ยังไม่มีข้อมูลผู้ป่วย</p>
          {hasPermission("register") && (
            <Button asChild className="mt-4" size="sm">
              <Link to="/register">ลงทะเบียนผู้ป่วยใหม่</Link>
            </Button>
          )}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left text-xs text-muted-foreground border-b">
                <th className="pb-3 font-medium">ผู้ป่วย</th>
                <th className="pb-3 font-medium">HN</th>
                <th className="pb-3 font-medium">เบอร์โทร</th>
                <th className="pb-3 font-medium">ลงทะเบียน</th>
                <th className="pb-3 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {patients.map((patient) => (
                <tr key={patient.id} className="border-b border-border/50 table-row-hover">
                  <td className="py-3">
                    <div className="flex items-center gap-3">
                      <Avatar className="w-8 h-8">
                        <AvatarFallback className="bg-secondary text-secondary-foreground text-xs">
                          {getInitials(patient.first_name, patient.last_name)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="font-medium text-sm">
                        {patient.first_name} {patient.last_name}
                      </span>
                    </div>
                  </td>
                  <td className="py-3">
                    <span className="text-sm text-muted-foreground font-mono">
                      {patient.hn}
                    </span>
                  </td>
                  <td className="py-3">
                    <span className="text-sm">{patient.phone || "-"}</span>
                  </td>
                  <td className="py-3">
                    <span className="text-sm text-muted-foreground">
                      {formatDate(patient.created_at)}
                    </span>
                  </td>
                  <td className="py-3">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {hasPermission("patients") && (
                          <DropdownMenuItem asChild>
                            <Link to={`/patients/${patient.id}`}>
                              <Eye className="w-4 h-4 mr-2" />
                              ดูโปรไฟล์
                            </Link>
                          </DropdownMenuItem>
                        )}
                        {hasPermission("treatments") && (
                          <DropdownMenuItem asChild>
                            <Link to={`/treatments?patient_id=${patient.id}&action=new`}>
                              <FileText className="w-4 h-4 mr-2" />
                              บันทึกการรักษา
                            </Link>
                          </DropdownMenuItem>
                        )}
                        {hasPermission("appointments") && (
                          <DropdownMenuItem asChild>
                            <Link to={`/appointments?patient_id=${patient.id}&action=new`}>
                              <Calendar className="w-4 h-4 mr-2" />
                              สร้างนัดหมาย
                            </Link>
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default RecentPatients;
