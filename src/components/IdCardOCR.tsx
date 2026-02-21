import { useState, useRef, useCallback } from "react";
import { Camera, ImagePlus, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import type { SmartCardData } from "@/services/smartCardReader";

interface IdCardOCRProps {
  onImport: (data: SmartCardData) => void;
}

const IdCardOCR = ({ onImport }: IdCardOCRProps) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const { toast } = useToast();

  const processImage = async (base64Image: string) => {
    setIsProcessing(true);
    try {
      const { data, error } = await supabase.functions.invoke("ocr-id-card", {
        body: { image: base64Image },
      });

      if (error) throw new Error(error.message || "OCR failed");
      if (data?.error) throw new Error(data.error);

      const ocrData = data.data;
      const cardData: SmartCardData = {
        prefix: ocrData.prefix || "",
        firstName: ocrData.firstName || "",
        lastName: ocrData.lastName || "",
        cid: ocrData.cid || "",
        birthDate: ocrData.birthDate || "",
        gender: ocrData.gender || "",
        houseNumber: ocrData.houseNumber || "",
        moo: ocrData.moo || "",
        street: ocrData.street || "",
        subdistrict: ocrData.subdistrict || "",
        district: ocrData.district || "",
        province: ocrData.province || "",
        postalCode: "",
      };

      onImport(cardData);
      toast({
        title: "อ่านข้อมูลบัตรสำเร็จ",
        description: `${cardData.prefix}${cardData.firstName} ${cardData.lastName}`,
      });
    } catch (error: any) {
      toast({
        title: "ไม่สามารถอ่านข้อมูลจากภาพได้",
        description: error.message || "กรุณาลองถ่ายภาพใหม่ให้ชัดเจน",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast({ title: "กรุณาเลือกไฟล์รูปภาพ", variant: "destructive" });
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: "ไฟล์ขนาดใหญ่เกินไป (สูงสุด 10MB)",
        variant: "destructive",
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = () => processImage(reader.result as string);
    reader.readAsDataURL(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const startCamera = useCallback(async () => {
    setCameraReady(false);
    setShowCamera(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "environment",
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => setCameraReady(true);
      }
    } catch {
      toast({
        title: "ไม่สามารถเปิดกล้องได้",
        description: "กรุณาอนุญาตการเข้าถึงกล้องในเบราว์เซอร์",
        variant: "destructive",
      });
      setShowCamera(false);
    }
  }, [toast]);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setCameraReady(false);
    setShowCamera(false);
  }, []);

  const capturePhoto = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;

    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.drawImage(video, 0, 0);
    const base64 = canvas.toDataURL("image/jpeg", 0.9);

    stopCamera();
    processImage(base64);
  }, [stopCamera]);

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileSelect}
      />

      <div className="flex items-center gap-1">
        <Button
          type="button"
          variant="outline"
          onClick={() => fileInputRef.current?.click()}
          disabled={isProcessing}
          className="border-primary/30 hover:bg-primary/5 mr-20"
        >
          {isProcessing ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <ImagePlus className="w-4 h-4 mr-2" />
          )}
          {isProcessing ? "กำลังอ่าน..." : "OCR ภาพบัตร"}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={startCamera}
          disabled={isProcessing}
          className="border-primary/30 hover:bg-primary/5 h-9 w-9"
          title="ถ่ายรูปบัตรประชาชน"
        >
          <Camera className="w-4 h-4" />
        </Button>
      </div>

      <Dialog
        open={showCamera}
        onOpenChange={(open) => {
          if (!open) stopCamera();
        }}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>ถ่ายรูปบัตรประชาชน</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />
              {!cameraReady && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <Loader2 className="w-8 h-8 animate-spin text-white" />
                </div>
              )}
              {/* Guide overlay */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="border-2 border-dashed border-white/60 rounded-lg w-[85%] h-[65%]" />
              </div>
            </div>
            <p className="text-sm text-muted-foreground text-center">
              วางบัตรประชาชนให้อยู่ในกรอบ แล้วกดถ่ายภาพ
            </p>
            <div className="flex justify-center gap-3">
              <Button
                variant="outline"
                onClick={stopCamera}
                className="h-12 w-12 text-xl ml-4 flex items-center justify-center"
                aria-label="ปิดกล้อง"
              >
                <X className="w-7 h-7" />
              </Button>
              <Button
                onClick={capturePhoto}
                disabled={!cameraReady}
                className="h-12 w-12 text-xl flex items-center justify-center"
                aria-label="ถ่ายภาพ"
              >
                <Camera className="w-7 h-7" />
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default IdCardOCR;
