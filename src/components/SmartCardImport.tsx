import { useState } from "react";
import { CreditCard, Loader2, Settings, Wifi, WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  readSmartCard,
  checkMiddlewareStatus,
  getMiddlewareUrl,
  setMiddlewareUrl,
  type SmartCardData,
} from "@/services/smartCardReader";
import { useToast } from "@/hooks/use-toast";

interface SmartCardImportProps {
  onImport: (data: SmartCardData) => void;
}

const SmartCardImport = ({ onImport }: SmartCardImportProps) => {
  const [isReading, setIsReading] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [middlewareUrl, setMiddlewareUrlState] = useState(getMiddlewareUrl());
  const [isConnected, setIsConnected] = useState<boolean | null>(null);
  const { toast } = useToast();

  const handleRead = async () => {
    setIsReading(true);
    try {
      const data = await readSmartCard();
      onImport(data);
      toast({
        title: "อ่านบัตรสำเร็จ",
        description: `${data.prefix}${data.firstName} ${data.lastName}`,
      });
    } catch (error: any) {
      toast({
        title: "ไม่สามารถอ่านบัตรได้",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsReading(false);
    }
  };

  const handleCheckStatus = async () => {
    const connected = await checkMiddlewareStatus();
    setIsConnected(connected);
    toast({
      title: connected ? "เชื่อมต่อสำเร็จ" : "ไม่สามารถเชื่อมต่อได้",
      description: connected
        ? "โปรแกรมอ่านบัตรพร้อมใช้งาน"
        : "กรุณาตรวจสอบว่าโปรแกรมอ่านบัตรกำลังทำงานอยู่",
      variant: connected ? "default" : "destructive",
    });
  };

  const handleSaveSettings = () => {
    setMiddlewareUrl(middlewareUrl);
    setShowSettings(false);
    setIsConnected(null);
    toast({ title: "บันทึกการตั้งค่าสำเร็จ" });
  };

  return (
    <>
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={handleRead}
          disabled={isReading}
          className="border-primary/30 hover:bg-primary/5"
        >
          {isReading ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <CreditCard className="w-4 h-4 mr-2" />
          )}
          {isReading ? "กำลังอ่านบัตร..." : "อ่านบัตรประชาชน"}
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => setShowSettings(true)}
          className="h-9 w-9"
        >
          <Settings className="w-4 h-4" />
        </Button>
      </div>

      <Dialog open={showSettings} onOpenChange={setShowSettings}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="mr-20">ตั้งค่าเครื่องอ่านบัตร</DialogTitle>
          </DialogHeader>
        </div>

        <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleCheckStatus}
                  className="h-12 w-40 text-xl flex items-center justify-center"
                >
                  {isConnected === null ? (
                    <Wifi className="w-7 h-7 mr-2" />
                  ) : isConnected ? (
                    <Check className="w-7 h-7 mr-2 text-success" />
                  ) : (
                    <X className="w-7 h-7 mr-2 text-destructive" />
                  )}
                  ตรวจสอบการเชื่อมต่อ
                </Button>
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Button type="button" variant="outline" size="sm" onClick={handleCheckStatus}>
                {isConnected === null ? (
                  <Wifi className="w-4 h-4 mr-2" />
                ) : isConnected ? (
                  <Wifi className="w-4 h-4 mr-2 text-success" />
                ) : (
                  <WifiOff className="w-4 h-4 mr-2 text-destructive" />
                )}
                ทดสอบการเชื่อมต่อ
              </Button>
              {isConnected !== null && (
                <span className={`text-sm ${isConnected ? "text-success" : "text-destructive"}`}>
                  {isConnected ? "เชื่อมต่อแล้ว" : "ไม่พบการเชื่อมต่อ"}
                </span>
              )}
            </div>

            <div className="bg-muted/50 rounded-lg p-3 text-xs text-muted-foreground space-y-1">
              <p className="font-medium text-foreground">ข้อกำหนด:</p>
              <p>• ต้องติดตั้งโปรแกรมอ่านบัตร (Middleware) บนเครื่องคอมพิวเตอร์</p>
              <p>• เสียบเครื่องอ่านบัตร Smart Card Reader เข้ากับ USB</p>
              <p>• เปิดโปรแกรม Middleware ก่อนใช้งาน</p>
              <p>• Middleware ต้องให้บริการ API ที่ GET /read</p>
            </div>

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setShowSettings(false)}>
                ยกเลิก
              </Button>
              <Button type="button" onClick={handleSaveSettings}>
                บันทึก
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default SmartCardImport;
