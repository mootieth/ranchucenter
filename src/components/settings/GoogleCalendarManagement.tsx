import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useProviders, Provider } from "@/hooks/useProviders";
import { useGoogleCalendar } from "@/hooks/useGoogleCalendar";
import {
  CalendarIcon,
  Loader2,
  Trash2,
  RefreshCw,
  Mail,
  Link,
  Send,
  Copy,
  Video,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";

interface GoogleTokenRecord {
  id: string;
  user_id: string;
  google_email: string | null;
  calendar_id: string | null;
  created_at: string;
  updated_at: string;
  token_expires_at: string;
}

export default function GoogleCalendarManagement() {
  const { data: providers = [] } = useProviders();
  const googleCalendar = useGoogleCalendar();
  const [tokens, setTokens] = useState<GoogleTokenRecord[]>([]);
  const [clinicMeetToken, setClinicMeetToken] =
    useState<GoogleTokenRecord | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<GoogleTokenRecord | null>(
    null,
  );
  const [connectingUserId, setConnectingUserId] = useState<string | null>(null);

  const CLINIC_MEET_USER_ID = "00000000-0000-0000-0000-000000000001";

  const refreshExpiredTokens = async () => {
    try {
      const { data, error } = await supabase.functions.invoke(
        "google-calendar-sync",
        {
          body: { action: "refresh_tokens" },
        },
      );
      if (error) console.error("Token refresh error:", error);
      else if (data?.refreshed?.length > 0) {
        console.log("Refreshed tokens for:", data.refreshed);
      }
      if (data?.failed?.length > 0) {
        console.warn("Failed to refresh tokens for:", data.failed);
      }
    } catch (err) {
      console.error("Token refresh error:", err);
    }
  };

  const fetchTokens = async () => {
    setIsLoading(true);
    try {
      // Auto-refresh expired tokens first
      await refreshExpiredTokens();

      const { data, error } = await supabase
        .from("provider_google_tokens")
        .select(
          "id, user_id, google_email, calendar_id, created_at, updated_at, token_expires_at",
        )
        .order("created_at", { ascending: false });

      if (error) throw error;
      const allTokens = data || [];
      const clinic = allTokens.find((t) => t.user_id === CLINIC_MEET_USER_ID);
      setClinicMeetToken(clinic || null);
      setTokens(allTokens.filter((t) => t.user_id !== CLINIC_MEET_USER_ID));
    } catch (err) {
      console.error("Failed to fetch tokens:", err);
      toast.error("ไม่สามารถโหลดข้อมูล Google Calendar ได้");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTokens();
  }, []);

  const getProviderName = (userId: string): string => {
    const provider = providers.find((p) => p.user_id === userId);
    return provider?.full_name || "ไม่ทราบชื่อ";
  };

  const getProviderSpecialty = (userId: string): string | null => {
    const provider = providers.find((p) => p.user_id === userId);
    return provider?.specialty || null;
  };

  const isTokenExpired = (expiresAt: string): boolean => {
    return new Date(expiresAt) < new Date();
  };

  const handleDisconnect = async () => {
    if (!deleteTarget) return;
    try {
      const { error } = await supabase
        .from("provider_google_tokens")
        .delete()
        .eq("id", deleteTarget.id);

      if (error) throw error;
      toast.success("ยกเลิกการเชื่อมต่อ Google Calendar สำเร็จ");
      setDeleteTarget(null);
      fetchTokens();
    } catch (err) {
      console.error("Failed to disconnect:", err);
      toast.error("ไม่สามารถยกเลิกการเชื่อมต่อได้");
    }
  };

  // Connect Google Calendar on behalf of a provider
  const handleConnectForProvider = async (targetUserId: string) => {
    setConnectingUserId(targetUserId);
    try {
      const { data, error } = await supabase.functions.invoke(
        "google-calendar-auth",
        {
          body: {
            origin: window.location.origin,
            target_user_id: targetUserId,
          },
        },
      );

      if (error) throw error;
      if (data?.url) {
        window.location.href = data.url;
      }
    } catch (err) {
      console.error("Google Calendar connect error:", err);
      toast.error("ไม่สามารถเชื่อมต่อ Google Calendar ได้");
    } finally {
      setConnectingUserId(null);
    }
  };

  // Providers without Google Calendar connection
  const connectedUserIds = new Set(tokens.map((t) => t.user_id));
  const unconnectedProviders = providers.filter(
    (p) => !connectedUserIds.has(p.user_id),
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">
            จัดการการเชื่อมต่อ Google Calendar ของผู้ให้บริการแต่ละท่าน
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={fetchTokens}
          className="gap-2"
        >
          <RefreshCw className="w-4 h-4" />
          รีเฟรช
        </Button>
      </div>

      {/* Clinic Meet Account */}
      <div className="p-4 border rounded-lg bg-muted/30 space-y-3">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <Video className="w-4 h-4 text-primary" />
          บัญชี Google Meet สำหรับนัดหมายออนไลน์
        </h3>
        <p className="text-xs text-muted-foreground">
          บัญชีนี้ใช้สำหรับสร้างห้อง Google Meet อัตโนมัติเมื่อมีนัดหมายออนไลน์
          (ranchucenter@gmail.com)
        </p>
        {clinicMeetToken ? (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Badge variant="default" className="text-xs gap-1">
                <Mail className="w-3 h-3" />
                {clinicMeetToken.google_email || "เชื่อมต่อแล้ว"}
              </Badge>
              <Badge
                variant={
                  isTokenExpired(clinicMeetToken.token_expires_at)
                    ? "destructive"
                    : "outline"
                }
                className="text-xs"
              >
                {isTokenExpired(clinicMeetToken.token_expires_at)
                  ? "Token หมดอายุ"
                  : "ใช้งานได้"}
              </Badge>
            </div>
            <div className="flex gap-1">
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5"
                onClick={googleCalendar.connectClinicMeet}
              >
                <RefreshCw className="w-3.5 h-3.5" />
                เชื่อมต่อใหม่
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={async () => {
                  await supabase
                    .from("provider_google_tokens")
                    .delete()
                    .eq("user_id", CLINIC_MEET_USER_ID);
                  setClinicMeetToken(null);
                  toast.success("ยกเลิกการเชื่อมต่อบัญชี Meet แล้ว");
                }}
              >
                <Trash2 className="w-4 h-4 text-destructive" />
              </Button>
            </div>
          </div>
        ) : (
          <Button
            variant="default"
            size="sm"
            className="gap-2"
            onClick={googleCalendar.connectClinicMeet}
          >
            <Video className="w-4 h-4" />
            เชื่อมต่อบัญชี Google Meet
          </Button>
        )}
      </div>

      <div>
        <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
          <CalendarIcon className="w-4 h-4 text-primary" />
          เชื่อมต่อแล้ว ({tokens.length})
        </h3>
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ผู้ให้บริการ</TableHead>
                <TableHead>Google Email</TableHead>
                <TableHead>Calendar ID</TableHead>
                <TableHead className="text-center">สถานะ Token</TableHead>
                <TableHead>เชื่อมต่อเมื่อ</TableHead>
                <TableHead className="text-center">จัดการ</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto text-muted-foreground" />
                  </TableCell>
                </TableRow>
              ) : tokens.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="text-center py-8 text-muted-foreground"
                  >
                    <CalendarIcon className="w-8 h-8 mx-auto text-muted-foreground/40 mb-2" />
                    ยังไม่มีผู้ให้บริการเชื่อมต่อ Google Calendar
                  </TableCell>
                </TableRow>
              ) : (
                tokens.map((token) => {
                  const expired = isTokenExpired(token.token_expires_at);
                  const specialty = getProviderSpecialty(token.user_id);
                  return (
                    <TableRow key={token.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">
                            {getProviderName(token.user_id)}
                          </p>
                          {specialty && (
                            <p className="text-xs text-muted-foreground">
                              {specialty}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          <Mail className="w-3.5 h-3.5 text-muted-foreground" />
                          <span className="text-sm">
                            {token.google_email || "-"}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground font-mono text-xs">
                        {token.calendar_id || "primary"}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge
                          variant={expired ? "destructive" : "default"}
                          className="text-xs"
                        >
                          {expired ? "หมดอายุ" : "ใช้งานได้"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(token.created_at).toLocaleDateString(
                          "th-TH",
                          {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          },
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          {expired && (
                            <Button
                              variant="ghost"
                              size="icon"
                              disabled={connectingUserId === token.user_id}
                              onClick={() =>
                                handleConnectForProvider(token.user_id)
                              }
                              title="เชื่อมต่อใหม่"
                            >
                              {connectingUserId === token.user_id ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <RefreshCw className="w-4 h-4 text-primary" />
                              )}
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setDeleteTarget(token)}
                            title="ยกเลิกการเชื่อมต่อ"
                          >
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Unconnected providers */}
      {unconnectedProviders.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold mb-3 text-muted-foreground">
            ยังไม่เชื่อมต่อ ({unconnectedProviders.length})
          </h3>
          <div className="border rounded-lg divide-y">
            {unconnectedProviders.map((provider) => (
              <div
                key={provider.user_id}
                className="flex items-center justify-between px-4 py-3"
              >
                <div>
                  <p className="text-sm font-medium">{provider.full_name}</p>
                  {provider.specialty && (
                    <p className="text-xs text-muted-foreground">
                      {provider.specialty}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="gap-1.5 text-muted-foreground"
                    onClick={() => {
                      const inviteUrl = `${window.location.origin}/appointments?connect_google=true`;
                      const message = `สวัสดีค่ะ คุณ${provider.full_name}\n\nขอเชิญเชื่อมต่อ Google Calendar กับระบบ Ranchu Center เพื่อซิงค์ตารางนัดหมายอัตโนมัติ\n\n1. เข้าสู่ระบบที่: ${window.location.origin}\n2. ไปที่หน้า "ตารางนัดหมาย"\n3. กดปุ่ม "เชื่อมต่อ Google Calendar"\n\nหรือคลิกลิงก์นี้หลังล็อกอิน:\n${inviteUrl}`;
                      navigator.clipboard.writeText(message);
                      toast.success(
                        "คัดลอกข้อความเชิญแล้ว สามารถส่งให้ผู้ให้บริการผ่าน LINE หรืออีเมลได้",
                      );
                    }}
                    title="คัดลอกข้อความเชิญ"
                  >
                    <Send className="w-4 h-4" />
                    ส่งคำเชิญ
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2"
                    disabled={connectingUserId === provider.user_id}
                    onClick={() => handleConnectForProvider(provider.user_id)}
                  >
                    {connectingUserId === provider.user_id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Link className="w-4 h-4" />
                    )}
                    เชื่อมต่อแทน
                  </Button>
                </div>
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            <strong>ส่งคำเชิญ</strong> -
            คัดลอกข้อความเชิญให้ผู้ให้บริการเชื่อมต่อด้วยตนเอง |{" "}
            <strong>เชื่อมต่อแทน</strong> - Admin ลงชื่อเข้าใช้ Google
            แทนผู้ให้บริการ
          </p>
        </div>
      )}

      {/* Disconnect confirmation */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              ยกเลิกการเชื่อมต่อ Google Calendar
            </AlertDialogTitle>
            <AlertDialogDescription>
              ต้องการยกเลิกการเชื่อมต่อ Google Calendar ของ{" "}
              {deleteTarget ? getProviderName(deleteTarget.user_id) : ""} (
              {deleteTarget?.google_email}) หรือไม่?
              <br />
              <br />
              การยกเลิกจะทำให้ระบบไม่สามารถซิงค์นัดหมายกับ Google Calendar
              ของผู้ให้บริการท่านนี้ได้อีก
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="h-12 w-12 text-xl ml-4 flex items-center justify-center">
              ยกเลิก
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDisconnect}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 h-12 w-40 text-xl flex items-center justify-center ml-4"
            >
              ยกเลิกการเชื่อมต่อ
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
