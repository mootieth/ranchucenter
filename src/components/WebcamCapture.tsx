import { useState, useRef, useCallback, useEffect } from "react";
import { Camera, RotateCcw, X, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface WebcamCaptureProps {
  currentPhotoUrl?: string | null;
  onCapture: (blob: Blob) => void;
  initials?: string;
}

const WebcamCapture = ({
  currentPhotoUrl,
  onCapture,
  initials = "?",
}: WebcamCaptureProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, facingMode: "user" },
      });
      streamRef.current = stream;
      setCapturedImage(null);
      setIsStreaming(true);
    } catch (err) {
      console.error("Cannot access webcam:", err);
    }
  }, []);

  // Attach stream to video element after it mounts
  useEffect(() => {
    if (isStreaming && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
      videoRef.current.onloadedmetadata = () => {
        videoRef.current?.play();
      };
    }
  }, [isStreaming]);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setIsStreaming(false);
  }, []);

  const capture = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const vw = video.videoWidth;
    const vh = video.videoHeight;
    if (!vw || !vh) {
      console.warn("Video not ready yet");
      return;
    }
    canvas.width = vw;
    canvas.height = vh;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, vw, vh);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
    setCapturedImage(dataUrl);
    stopCamera();

    canvas.toBlob(
      (blob) => {
        if (blob) onCapture(blob);
      },
      "image/jpeg",
      0.85,
    );
  }, [onCapture, stopCamera]);

  const retake = useCallback(() => {
    setCapturedImage(null);
    startCamera();
  }, [startCamera]);

  const cancel = useCallback(() => {
    stopCamera();
    setCapturedImage(null);
  }, [stopCamera]);

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = () => {
        setCapturedImage(reader.result as string);
      };
      reader.readAsDataURL(file);
      onCapture(file);

      // Reset input so the same file can be selected again
      e.target.value = "";
    },
    [onCapture],
  );

  const displayUrl = capturedImage || currentPhotoUrl;

  return (
    <div className="flex flex-col items-center gap-3">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileSelect}
      />

      {!isStreaming && !capturedImage && (
        <>
          <Avatar className="w-28 h-28">
            {displayUrl ? (
              <AvatarImage
                src={displayUrl}
                alt="Patient photo"
                className="object-cover"
              />
            ) : null}
            <AvatarFallback className="bg-primary text-primary-foreground text-3xl">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={startCamera}
            >
              <Camera className="w-4 h-4 mr-2" />
              {displayUrl ? "ถ่ายภาพใหม่" : "ถ่ายภาพ"}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="w-4 h-4 mr-2" />
              อัปโหลดรูป
            </Button>
          </div>
        </>
      )}

      {isStreaming && (
        <div className="flex flex-col items-center gap-2">
          <div className="relative rounded-xl overflow-hidden border-2 border-primary/30">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-64 h-48 object-cover"
            />
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              onClick={capture}
              className="h-12 w-12 text-xl flex items-center justify-center bg-gradient-primary"
              aria-label="ถ่ายภาพ"
            >
              <Camera className="w-7 h-7" />
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={cancel}
              className="h-12 w-12 text-xl ml-4 flex items-center justify-center"
              aria-label="ปิดกล้อง"
            >
              <X className="w-7 h-7" />
            </Button>
          </div>
        </div>
      )}

      {capturedImage && !isStreaming && (
        <div className="flex flex-col items-center gap-2">
          <div className="rounded-xl overflow-hidden border-2 border-success/30">
            <img
              src={capturedImage}
              alt="Captured"
              className="w-28 h-28 object-cover"
            />
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="outline" size="sm" onClick={retake}>
              <RotateCcw className="w-4 h-4 mr-2" />
              ถ่ายใหม่
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="w-4 h-4 mr-2" />
              เลือกรูปอื่น
            </Button>
          </div>
        </div>
      )}

      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
};

export default WebcamCapture;
