
CREATE POLICY "training_img_read_auth" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'training-images');
CREATE POLICY "training_img_insert_auth" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'training-images');
CREATE POLICY "training_img_update_auth" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'training-images');
CREATE POLICY "training_img_delete_auth" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'training-images');
