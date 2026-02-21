
-- Create patient_files table for general patient documents (not linked to treatments)
CREATE TABLE public.patient_files (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
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
ALTER TABLE public.patient_files ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Authenticated users can view patient files"
  ON public.patient_files FOR SELECT
  USING (true);

CREATE POLICY "Staff can manage patient files"
  ON public.patient_files FOR ALL
  USING (
    has_role(auth.uid(), 'admin'::app_role) OR
    has_role(auth.uid(), 'doctor'::app_role) OR
    has_role(auth.uid(), 'therapist'::app_role) OR
    has_role(auth.uid(), 'staff'::app_role)
  )
  WITH CHECK (
    has_role(auth.uid(), 'admin'::app_role) OR
    has_role(auth.uid(), 'doctor'::app_role) OR
    has_role(auth.uid(), 'therapist'::app_role) OR
    has_role(auth.uid(), 'staff'::app_role)
  );
