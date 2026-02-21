import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Upload, Trash2, Download, Loader2, Image, File, ChevronLeft, ChevronRight, X } from "lucide-react";
import { format } from "date-fns";
import { th } from "date-fns/locale";

interface TreatmentFilesProps {
  patientId: string;
  treatmentId?: string;
  compact?: boolean;
}

interface TreatmentFile {
  id: string;
  treatment_id: string;
  patient_id: string;
  file_name: string;
  file_url: string;
  file_type: string | null;
  file_size: number | null;
  description: string | null;
  uploaded_by: string | null;
  created_at: string;
}

const TreatmentFiles = ({ patientId, treatmentId, compact = false }: TreatmentFilesProps) => {
  const { toast } = useToast();
  const { isAdmin } = useAuth();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [previewIndex, setPreviewIndex] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const { data: files = [], isLoading } = useQuery({
    queryKey: ["treatment-files", patientId, treatmentId],
    queryFn: async () => {
      let query = supabase
        .from("treatment_files")
        .select("*")
        .eq("patient_id", patientId)
        .order("created_at", { ascending: false });

      if (treatmentId) {
        query = query.eq("treatment_id", treatmentId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as TreatmentFile[];
    },
  });

  // Previewable files (images + PDFs)
  const previewableFiles = files.filter(f => isImage(f.file_type) || isPdf(f.file_type));
  const currentPreviewFile = previewIndex !== null ? previewableFiles[previewIndex] : null;

  const deleteMutation = useMutation({
    mutationFn: async (file: TreatmentFile) => {
      const urlParts = file.file_url.split("/treatment-files/");
      if (urlParts[1]) {
        await supabase.storage.from("treatment-files").remove([urlParts[1]]);
      }
      const { error } = await supabase.from("treatment_files").delete().eq("id", file.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["treatment-files"] });
      toast({ title: "ลบไฟล์สำเร็จ" });
      setPreviewIndex(null);
    },
    onError: () => {
      toast({ title: "ไม่สามารถลบไฟล์ได้", variant: "destructive" });
    },
  });

  const processFiles = async (fileList: FileList | File[]) => {
    const selectedFiles = Array.from(fileList);
    if (selectedFiles.length === 0) return;
    if (!treatmentId) {
      toast({ title: "กรุณาเลือกบันทึกการรักษาก่อนอัปโหลด", variant: "destructive" });
      return;
    }

    setUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();

      for (const file of selectedFiles) {
        const fileExt = file.name.split(".").pop();
        const fileName = `${patientId}/${treatmentId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

        const { data: uploadData, error: uploadError } = await supabase.storage
          .from("treatment-files")
          .upload(fileName, file);

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from("treatment-files")
          .getPublicUrl(uploadData.path);

        const { error: dbError } = await supabase.from("treatment_files").insert({
          treatment_id: treatmentId,
          patient_id: patientId,
          file_name: file.name,
          file_url: urlData.publicUrl,
          file_type: file.type,
          file_size: file.size,
          uploaded_by: user?.id || null,
        });

        if (dbError) throw dbError;
      }

      queryClient.invalidateQueries({ queryKey: ["treatment-files"] });
      toast({ title: `อัปโหลด ${selectedFiles.length} ไฟล์สำเร็จ` });
    } catch (error) {
      console.error("Upload error:", error);
      toast({ title: "ไม่สามารถอัปโหลดไฟล์ได้", variant: "destructive" });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) processFiles(e.target.files);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files) processFiles(e.dataTransfer.files);
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return "-";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const openPreview = (file: TreatmentFile) => {
    const idx = previewableFiles.findIndex(f => f.id === file.id);
    if (idx !== -1) setPreviewIndex(idx);
  };

  const goNext = () => {
    if (previewIndex !== null && previewIndex < previewableFiles.length - 1) {
      setPreviewIndex(previewIndex + 1);
    }
  };

  const goPrev = () => {
    if (previewIndex !== null && previewIndex > 0) {
      setPreviewIndex(previewIndex - 1);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-5 h-5 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Drag & Drop upload zone */}
      {treatmentId && (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`
            border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors
            ${isDragging
              ? "border-primary bg-primary/5"
              : "border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/30"
            }
            ${uploading ? "pointer-events-none opacity-60" : ""}
          `}
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            onChange={handleUpload}
            accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"
          />
          {uploading ? (
            <div className="flex flex-col items-center gap-1.5">
              <Loader2 className="w-5 h-5 animate-spin text-primary" />
              <p className="text-xs text-muted-foreground">กำลังอัปโหลด...</p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-1.5">
              <Upload className="w-5 h-5 text-muted-foreground" />
              <p className="text-xs text-muted-foreground">
                ลากไฟล์มาวางที่นี่ หรือ <span className="text-primary font-medium">คลิกเลือกไฟล์</span>
              </p>
              <p className="text-[10px] text-muted-foreground/60">รองรับ รูปภาพ, PDF, Word, Excel</p>
            </div>
          )}
        </div>
      )}

      {/* File list */}
      {files.length > 0 ? (
        <div className="space-y-2">
          {files.map((file) => (
            <div
              key={file.id}
              className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg group cursor-pointer hover:bg-muted/50 transition-colors"
              onClick={() => {
                if (isImage(file.file_type) || isPdf(file.file_type)) {
                  openPreview(file);
                } else {
                  window.open(file.file_url, "_blank");
                }
              }}
            >
              {/* Thumbnail or icon */}
              {isImage(file.file_type) ? (
                <img
                  src={file.file_url}
                  alt={file.file_name}
                  className="w-10 h-10 rounded object-cover border shrink-0"
                />
              ) : (
                <div className="w-10 h-10 rounded bg-muted flex items-center justify-center shrink-0">
                  {isPdf(file.file_type) ? (
                    <File className="w-4 h-4 text-destructive" />
                  ) : (
                    <File className="w-4 h-4 text-muted-foreground" />
                  )}
                </div>
              )}

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{file.file_name}</p>
                <p className="text-xs text-muted-foreground">
                  {formatFileSize(file.file_size)} • {format(new Date(file.created_at), "d MMM yyyy", { locale: th })}
                </p>
              </div>

              {isAdmin && (
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
                  <Button variant="ghost" size="icon" className="h-7 w-7" asChild>
                    <a href={file.file_url} target="_blank" rel="noopener noreferrer">
                      <Download className="w-3.5 h-3.5" />
                    </a>
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-destructive"
                    onClick={() => deleteMutation.mutate(file)}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground text-center py-4">
          {treatmentId ? "ยังไม่มีไฟล์ที่เกี่ยวข้อง" : "ยังไม่มีไฟล์เอกสาร"}
        </p>
      )}

      {/* Preview Modal */}
      <Dialog open={previewIndex !== null} onOpenChange={(open) => !open && setPreviewIndex(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] p-0 gap-0 overflow-hidden">
          <DialogHeader className="p-4 pb-2 flex flex-row items-center justify-between">
            <DialogTitle className="text-sm font-medium truncate pr-4">
              {currentPreviewFile?.file_name}
              {previewableFiles.length > 1 && (
                <span className="text-muted-foreground ml-2">
                  ({(previewIndex ?? 0) + 1}/{previewableFiles.length})
                </span>
              )}
            </DialogTitle>
          </DialogHeader>

          {/* Preview content - scrollable */}
          <div className="flex-1 overflow-auto px-4 pb-4" style={{ maxHeight: "calc(90vh - 120px)" }}>
            {currentPreviewFile && isImage(currentPreviewFile.file_type) && (
              <img
                src={currentPreviewFile.file_url}
                alt={currentPreviewFile.file_name}
                className="w-full h-auto rounded-lg"
              />
            )}
            {currentPreviewFile && isPdf(currentPreviewFile.file_type) && (
              <iframe
                src={`https://docs.google.com/gview?url=${encodeURIComponent(currentPreviewFile.file_url)}&embedded=true`}
                className="w-full rounded-lg border"
                style={{ height: "calc(90vh - 140px)" }}
                title={currentPreviewFile.file_name}
              />
            )}
          </div>

          {/* Navigation bar */}
          <div className="flex items-center justify-between p-3 border-t bg-muted/30">
            <Button
              variant="outline"
              size="sm"
              onClick={goPrev}
              disabled={previewIndex === 0}
            >
              <ChevronLeft className="w-4 h-4 mr-1" />
              ก่อนหน้า
            </Button>

            <div className="flex items-center gap-2">
              {isAdmin && (
                <>
                  <Button variant="outline" size="sm" asChild>
                    <a href={currentPreviewFile?.file_url} target="_blank" rel="noopener noreferrer">
                      <Download className="w-3.5 h-3.5 mr-1" />
                      ดาวน์โหลด
                    </a>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-destructive hover:text-destructive"
                    onClick={() => currentPreviewFile && deleteMutation.mutate(currentPreviewFile)}
                  >
                    <Trash2 className="w-3.5 h-3.5 mr-1" />
                    ลบ
                  </Button>
                </>
              )}
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={goNext}
              disabled={previewIndex === previewableFiles.length - 1}
            >
              ถัดไป
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

function isImage(type: string | null) {
  return type?.startsWith("image/");
}

function isPdf(type: string | null) {
  return type === "application/pdf";
}

export default TreatmentFiles;
