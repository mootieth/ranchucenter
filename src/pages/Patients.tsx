import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { 
  Search, 
  Plus, 
  Filter, 
  MoreHorizontal, 
  Eye, 
  FileText, 
  Calendar,
  Phone,
  Mail,
  Loader2,
  Trash2,
  AlertTriangle
} from "lucide-react";
import MainLayout from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { useSearchPatients, useDeletePatient } from "@/hooks/usePatients";
import { usePatientAllergies } from "@/hooks/useAllergies";
import { usePatientProvidersMap } from "@/hooks/usePatientProviders";
import { useNextAppointments } from "@/hooks/useNextAppointments";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { format, differenceInYears } from "date-fns";
import { th } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";

const statusStyles: Record<string, string> = {
  active: "bg-success/10 text-success border-success/20",
  inactive: "bg-warning/10 text-warning border-warning/20",
  deceased: "bg-muted text-muted-foreground",
};

const statusLabels: Record<string, string> = {
  active: "กำลังรักษา",
  inactive: "หยุดรักษา",
  deceased: "เสียชีวิต",
};

const genderLabels: Record<string, string> = {
  male: "ชาย",
  female: "หญิง",
  other: "อื่นๆ",
};

const Patients = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [deletingPatient, setDeletingPatient] = useState<{ id: string; name: string } | null>(null);
  const [deleteConfirmPassword, setDeleteConfirmPassword] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const { data: patients, isLoading } = useSearchPatients(searchQuery);
  const patientIds = patients?.map((p) => p.id) || [];
  const { data: providersMap } = usePatientProvidersMap(patientIds);
  const { data: nextAppointments } = useNextAppointments(patientIds);
  const deletePatient = useDeletePatient();
  const { user, roles, hasPermission } = useAuth();
  const { toast } = useToast();
  const isAdmin = roles.includes("admin");

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName[0] || ""}${lastName[0] || ""}`;
  };

  const calculateAge = (birthDate: string | null) => {
    if (!birthDate) return null;
    try {
      return differenceInYears(new Date(), new Date(birthDate));
    } catch {
      return null;
    }
  };

  const filteredPatients = patients?.filter((patient) => {
    if (statusFilter === "all") return true;
    return patient.status === statusFilter;
  }) || [];

  const handleDeleteConfirm = async () => {
    if (!deletingPatient || !user?.email) return;
    setIsDeleting(true);
    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: deleteConfirmPassword,
      });
      if (signInError) throw new Error("รหัสผ่านไม่ถูกต้อง");
      await deletePatient.mutateAsync(deletingPatient.id);
      setDeletingPatient(null);
      setDeleteConfirmPassword("");
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "เกิดข้อผิดพลาด",
        description: error.message || "ไม่สามารถลบข้อมูลผู้ป่วยได้",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <MainLayout title="ทะเบียนผู้ป่วย">
      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="ค้นหาชื่อ, HN, เบอร์โทร, เลขบัตรประชาชน..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 input-focus"
          />
        </div>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-48">
            <Filter className="w-4 h-4 mr-2" />
            <SelectValue placeholder="สถานะ" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">ทั้งหมด</SelectItem>
            <SelectItem value="active">กำลังรักษา</SelectItem>
            <SelectItem value="inactive">หยุดรักษา</SelectItem>
          </SelectContent>
        </Select>

        {hasPermission("register") && (
          <Button asChild className="bg-gradient-primary hover:opacity-90">
            <Link to="/register">
              <Plus className="w-4 h-4 mr-2" />
              ลงทะเบียนใหม่
            </Link>
          </Button>
        )}
      </div>

      {/* Patient Count */}
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-muted-foreground">
          พบ {filteredPatients.length} รายการ
        </p>
      </div>

      {/* Patients Table */}
      <div className="bg-card rounded-2xl shadow-soft overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : filteredPatients.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-muted-foreground mb-4">
              {searchQuery ? "ไม่พบผู้ป่วยที่ตรงกับคำค้นหา" : "ยังไม่มีข้อมูลผู้ป่วย"}
            </p>
            {!searchQuery && hasPermission("register") && (
              <Button asChild>
                <Link to="/register">ลงทะเบียนผู้ป่วยใหม่</Link>
              </Button>
            )}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30 hover:bg-muted/30">
                <TableHead className="font-semibold">ผู้ป่วย</TableHead>
                <TableHead className="font-semibold">HN</TableHead>
                <TableHead className="font-semibold">ติดต่อ</TableHead>
                <TableHead className="font-semibold">นัดหมายถัดไป</TableHead>
                <TableHead className="font-semibold">แพทย์/นักจิตประจำ</TableHead>
                <TableHead className="font-semibold">สถานะ</TableHead>
                <TableHead className="font-semibold w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPatients.map((patient) => {
                const age = calculateAge(patient.date_of_birth);
                return (
                  <TableRow key={patient.id} className="table-row-hover cursor-pointer" onClick={() => navigate(`/patients/${patient.id}`)}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          <Avatar className="w-10 h-10">
                            <AvatarFallback className="bg-secondary text-secondary-foreground text-sm">
                              {getInitials(patient.first_name, patient.last_name)}
                            </AvatarFallback>
                          </Avatar>
                        </div>
                        <div>
                          <p className="font-medium">
                            {patient.prefix || ""} {patient.first_name} {patient.last_name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {patient.gender ? genderLabels[patient.gender] : "-"}
                            {age !== null && ` • ${age} ปี`}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="font-mono text-sm">{patient.hn}</span>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        {patient.phone && (
                          <div className="flex items-center gap-1.5 text-sm">
                            <Phone className="w-3.5 h-3.5 text-muted-foreground" />
                            {patient.phone}
                          </div>
                        )}
                        {patient.email && (
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <Mail className="w-3 h-3" />
                            {patient.email}
                          </div>
                        )}
                        {!patient.phone && !patient.email && (
                          <span className="text-sm text-muted-foreground">-</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {nextAppointments?.[patient.id] ? (
                        <div className="text-sm">
                          <p className="font-medium">
                            {format(new Date(nextAppointments[patient.id].appointment_date), "d MMM yyyy", { locale: th })}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {nextAppointments[patient.id].start_time.slice(0, 5)} น.
                          </p>
                        </div>
                      ) : (
                        <span className="text-sm text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {providersMap?.[patient.id]?.length ? (
                        <div className="flex flex-wrap gap-1">
                          {providersMap[patient.id].map((pv) => (
                            <Badge key={pv.provider_id} variant="secondary" className="text-xs font-normal">
                              {pv.full_name}
                            </Badge>
                          ))}
                        </div>
                      ) : (
                        <span className="text-sm text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge 
                        variant="outline" 
                        className={statusStyles[patient.status || "active"]}
                      >
                        {statusLabels[patient.status || "active"]}
                      </Badge>
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem asChild>
                            <Link to={`/patients/${patient.id}`}>
                              <Eye className="w-4 h-4 mr-2" />
                              ดูโปรไฟล์
                            </Link>
                          </DropdownMenuItem>
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
                          {isAdmin && (
                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive"
                              onClick={() => setDeletingPatient({
                                id: patient.id,
                                name: `${patient.prefix || ""} ${patient.first_name} ${patient.last_name}`.trim(),
                              })}
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              ลบผู้ป่วย
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deletingPatient} onOpenChange={(open) => {
        if (!open) {
          setDeletingPatient(null);
          setDeleteConfirmPassword("");
        }
      }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="w-5 h-5" />
              ยืนยันการลบข้อมูลผู้ป่วย
            </AlertDialogTitle>
            <AlertDialogDescription className="text-left space-y-2">
              <p>คุณต้องการลบข้อมูลผู้ป่วย <strong>{deletingPatient?.name}</strong> ใช่หรือไม่?</p>
              <p className="text-destructive font-medium">
                ⚠️ การดำเนินการนี้จะลบข้อมูลทั้งหมดที่เกี่ยวข้อง ได้แก่ ประวัติการรักษา, ใบสั่งยา, ใบแจ้งหนี้, นัดหมาย และข้อมูลการแพ้ยา อย่างถาวรและไม่สามารถกู้คืนได้
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2 py-2">
            <Label htmlFor="delete-password">กรอกรหัสผ่านของคุณเพื่อยืนยัน</Label>
            <Input
              id="delete-password"
              type="password"
              placeholder="รหัสผ่าน"
              value={deleteConfirmPassword}
              onChange={(e) => setDeleteConfirmPassword(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && deleteConfirmPassword) handleDeleteConfirm();
              }}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
            <Button
              variant="destructive"
              onClick={handleDeleteConfirm}
              disabled={!deleteConfirmPassword || isDeleting}
            >
              {isDeleting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  กำลังลบ...
                </>
              ) : (
                "ยืนยันลบ"
              )}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </MainLayout>
  );
};

export default Patients;
