-- Drop the existing overly restrictive policy
DROP POLICY IF EXISTS "Admin can update any challenge, owner can update own challenge." ON challenges;

-- Create a new policy that allows updates from:
-- 1. Admins
-- 2. The Citizen who posted it
-- 3. University/Industry users who have created a team for this challenge (allowing them to update status)
CREATE POLICY "Challenge update policy" ON challenges FOR UPDATE
USING (
  is_admin() 
  OR posted_by = auth.uid()
  OR exists (
    SELECT 1 FROM teams 
    WHERE teams.challenge_id = id 
    AND teams.created_by = auth.uid()
  )
  -- Also allow adopting a challenge (changing from open to in_progress)
  OR (
    status = 'open' 
    AND exists (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('university', 'industry')
    )
  )
);
