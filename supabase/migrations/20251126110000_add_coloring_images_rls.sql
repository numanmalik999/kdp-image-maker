-- Ensure the bucket is public
INSERT INTO storage.buckets (id, name, public)
VALUES ('coloring_images', 'coloring_images', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Enable RLS on storage objects (if not already enabled)
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Policy 1: Allow authenticated users to insert/upload files
DROP POLICY IF EXISTS "Allow authenticated upload to coloring_images" ON storage.objects;
CREATE POLICY "Allow authenticated upload to coloring_images"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'coloring_images');

-- Policy 2: Allow public read access to files in the coloring_images bucket
DROP POLICY IF EXISTS "Allow public read access to coloring_images" ON storage.objects;
CREATE POLICY "Allow public read access to coloring_images"
ON storage.objects FOR SELECT
USING (bucket_id = 'coloring_images');