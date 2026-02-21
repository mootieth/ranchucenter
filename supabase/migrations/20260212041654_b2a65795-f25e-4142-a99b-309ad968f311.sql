-- Add salary column to profiles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS salary numeric DEFAULT 0;

-- Create storage bucket for staff photos
INSERT INTO storage.buckets (id, name, public)
VALUES ('staff-photos', 'staff-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload staff photos
CREATE POLICY "Authenticated users can upload staff photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'staff-photos');

-- Allow public read access to staff photos
CREATE POLICY "Staff photos are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'staff-photos');

-- Allow authenticated users to update staff photos
CREATE POLICY "Authenticated users can update staff photos"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'staff-photos');

-- Allow authenticated users to delete staff photos
CREATE POLICY "Authenticated users can delete staff photos"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'staff-photos');