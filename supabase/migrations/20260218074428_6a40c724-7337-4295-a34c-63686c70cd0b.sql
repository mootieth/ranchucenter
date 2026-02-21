
-- Create treatment_files table
CREATE TABLE public.treatment_files (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  treatment_id UUID NOT NULL REFERENCES public.treatments(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_type TEXT,
  file_size BIGINT,
  description TEXT,
  uploaded_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.treatment_files ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Authenticated users can view treatment files"
ON public.treatment_files FOR SELECT USING (true);

CREATE POLICY "Staff can manage treatment files"
ON public.treatment_files FOR ALL
USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'doctor') OR has_role(auth.uid(), 'therapist') OR has_role(auth.uid(), 'staff'))
WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'doctor') OR has_role(auth.uid(), 'therapist') OR has_role(auth.uid(), 'staff'));

-- Create storage bucket for treatment files
INSERT INTO storage.buckets (id, name, public) VALUES ('treatment-files', 'treatment-files', true);

-- Storage policies
CREATE POLICY "Anyone can view treatment files"
ON storage.objects FOR SELECT
USING (bucket_id = 'treatment-files');

CREATE POLICY "Authenticated users can upload treatment files"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'treatment-files' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete treatment files"
ON storage.objects FOR DELETE
USING (bucket_id = 'treatment-files' AND auth.role() = 'authenticated');
