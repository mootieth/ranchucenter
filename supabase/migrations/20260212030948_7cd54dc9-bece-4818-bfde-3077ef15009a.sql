-- Create storage bucket for patient photos
INSERT INTO storage.buckets (id, name, public) VALUES ('patient-photos', 'patient-photos', true);

-- Allow authenticated users to upload patient photos
CREATE POLICY "Authenticated users can upload patient photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'patient-photos');

-- Allow public read access to patient photos
CREATE POLICY "Anyone can view patient photos"
ON storage.objects FOR SELECT
USING (bucket_id = 'patient-photos');

-- Allow authenticated users to update patient photos
CREATE POLICY "Authenticated users can update patient photos"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'patient-photos');

-- Allow authenticated users to delete patient photos
CREATE POLICY "Authenticated users can delete patient photos"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'patient-photos');