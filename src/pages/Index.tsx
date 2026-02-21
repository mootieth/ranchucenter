import { Users, Calendar, Receipt, Clock, AlertTriangle, Loader2 } from "lucide-react";
import { Link } from "react-router-dom";
import MainLayout from "@/components/layout/MainLayout";
import StatCard from "@/components/dashboard/StatCard";
import AppointmentList from "@/components/dashboard/AppointmentList";
import UpcomingAppointments from "@/components/dashboard/UpcomingAppointments";
import RecentPatients from "@/components/dashboard/RecentPatients";
import { useAuth } from "@/contexts/AuthContext";
import { useDashboardStats } from "@/hooks/useDashboardStats";

const Index = () => {
  const { profile, hasPermission } = useAuth();
  const { data: stats, isLoading } = useDashboardStats();

  const greeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "สวัสดีตอนเช้า";
    if (hour < 18) return "สวัสดีตอนบ่าย";
    return "สวัสดีตอนเย็น";
  };

  return (
    <MainLayout title="แดชบอร์ด">
      {/* Welcome Section */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-foreground">
          {greeting()}, {profile?.full_name || "ผู้ใช้"} 👋
        </h2>
        <p className="text-muted-foreground mt-1">
          ยินดีต้อนรับกลับ! นี่คือภาพรวมกิจกรรมของคลินิกวันนี้
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {isLoading ? (
          <>
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-card rounded-2xl shadow-soft p-6 animate-pulse">
                <div className="h-4 bg-muted rounded w-24 mb-4" />
                <div className="h-8 bg-muted rounded w-16" />
              </div>
            ))}
          </>
        ) : (
          <>
            {hasPermission("patients") && (
              <StatCard
                title="ผู้ป่วยทั้งหมด"
                value={stats?.totalPatients.toLocaleString() || "0"}
                subtitle="รายที่รักษาอยู่"
                icon={Users}
                variant="primary"
                linkTo="/patients"
              />
            )}
            {hasPermission("appointments") && (
              <StatCard
                title="นัดหมายวันนี้"
                value={stats?.todayAppointments || 0}
                subtitle="นัดหมาย"
                icon={Calendar}
                variant="success"
                linkTo="/appointments"
              />
            )}
            {hasPermission("billing") && (
              <>
                <StatCard
                  title="รอชำระเงิน"
                  value={stats?.pendingBillings || 0}
                  subtitle="รายการ"
                  icon={Receipt}
                  variant="warning"
                  linkTo="/billing"
                />
                <StatCard
                  title="รายได้วันนี้"
                  value={`฿${(stats?.todayRevenue || 0).toLocaleString()}`}
                  subtitle="บาท"
                  icon={Clock}
                  variant="accent"
                  linkTo="/billing"
                />
              </>
            )}
          </>
        )}
      </div>

      {/* Alert Banner */}
      {hasPermission("billing") && stats?.pendingBillings && stats.pendingBillings > 0 && (
        <div className="flex items-center gap-4 p-4 mb-8 rounded-xl bg-warning/10 border border-warning/20">
          <div className="flex items-center justify-center w-10 h-10 rounded-full bg-warning/20">
            <AlertTriangle className="w-5 h-5 text-warning" />
          </div>
          <div className="flex-1">
            <p className="font-medium text-sm">มี {stats.pendingBillings} รายการรอชำระเงิน</p>
            <p className="text-sm text-muted-foreground">กรุณาตรวจสอบรายการค้างชำระ</p>
          </div>
          <Link to="/billing" className="text-sm font-medium text-warning hover:underline">
            ดูรายละเอียด
          </Link>
        </div>
      )}

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Appointments Today */}
        <div className="lg:col-span-1">
          <AppointmentList />
        </div>

        {/* Recent Patients */}
        <div className="lg:col-span-2">
          <RecentPatients />
        </div>
      </div>

      {/* Upcoming Appointments */}
      <div>
        <UpcomingAppointments />
      </div>
    </MainLayout>
  );
};

export default Index;
