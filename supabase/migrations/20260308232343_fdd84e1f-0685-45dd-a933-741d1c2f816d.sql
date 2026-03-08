-- Create storage bucket for player photos
INSERT INTO storage.buckets (id, name, public)
VALUES ('player-photos', 'player-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload to their own folder
CREATE POLICY "Users can upload player photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'player-photos' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Allow authenticated users to update their own files
CREATE POLICY "Users can update own player photos"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'player-photos' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Allow authenticated users to delete their own files
CREATE POLICY "Users can delete own player photos"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'player-photos' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Allow public read access
CREATE POLICY "Public read access for player photos"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'player-photos');