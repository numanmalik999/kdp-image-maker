/*
  # Add Storage for Book Images

  1. Storage
    - Create `book-images` bucket for storing generated images
    - Enable public access for reading images
    - Add RLS policies for authenticated users to upload

  2. Security
    - Allow authenticated users to upload images
    - Allow public read access to images
*/

INSERT INTO storage.buckets (id, name, public)
VALUES ('book-images', 'book-images', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Authenticated users can upload images"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'book-images');

CREATE POLICY "Public can view images"
  ON storage.objects
  FOR SELECT
  TO public
  USING (bucket_id = 'book-images');