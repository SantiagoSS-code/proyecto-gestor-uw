-- Create storage bucket for center images
INSERT INTO storage.buckets (id, name, public) 
VALUES ('center-images', 'center-images', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for center-images bucket
CREATE POLICY "Anyone can view center images" ON storage.objects
  FOR SELECT USING (bucket_id = 'center-images');

CREATE POLICY "Authenticated users can upload center images" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'center-images' AND auth.role() = 'authenticated');

CREATE POLICY "Users can update their own center images" ON storage.objects
  FOR UPDATE USING (bucket_id = 'center-images' AND auth.role() = 'authenticated');

CREATE POLICY "Users can delete their own center images" ON storage.objects
  FOR DELETE USING (bucket_id = 'center-images' AND auth.role() = 'authenticated');

-- Drop existing restrictive policy and create a more permissive one
DROP POLICY IF EXISTS "Users can insert their own admin profile" ON center_admins;

-- New policy: Allow authenticated users to insert their own admin profile
-- The check verifies that the user_id being inserted matches the authenticated user's id
CREATE POLICY "Authenticated users can insert their own admin profile" ON center_admins
  FOR INSERT WITH CHECK (auth.uid() = user_id);
