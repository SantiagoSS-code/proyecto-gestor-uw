-- Drop existing insert policy if it exists
DROP POLICY IF EXISTS "Users can insert their own admin profile" ON center_admins;

-- Create a more permissive insert policy that allows authenticated users to insert
-- The check ensures users can only insert rows where they are the owner
CREATE POLICY "Users can insert their own admin profile" 
ON center_admins FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Also ensure the select policy exists
DROP POLICY IF EXISTS "Users can view their own admin profile" ON center_admins;
CREATE POLICY "Users can view their own admin profile" 
ON center_admins FOR SELECT 
TO authenticated
USING (auth.uid() = user_id);

-- Ensure update policy exists
DROP POLICY IF EXISTS "Users can update their own admin profile" ON center_admins;
CREATE POLICY "Users can update their own admin profile" 
ON center_admins FOR UPDATE 
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);
