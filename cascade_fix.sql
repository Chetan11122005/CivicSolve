-- Fix challenges table
ALTER TABLE challenges DROP CONSTRAINT IF EXISTS challenges_posted_by_fkey;
ALTER TABLE challenges ADD CONSTRAINT challenges_posted_by_fkey FOREIGN KEY (posted_by) REFERENCES profiles(id) ON DELETE CASCADE;

-- Fix comments table
ALTER TABLE comments DROP CONSTRAINT IF EXISTS comments_user_id_fkey;
ALTER TABLE comments ADD CONSTRAINT comments_user_id_fkey FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;

-- Fix teams table
ALTER TABLE teams DROP CONSTRAINT IF EXISTS teams_created_by_fkey;
ALTER TABLE teams ADD CONSTRAINT teams_created_by_fkey FOREIGN KEY (created_by) REFERENCES profiles(id) ON DELETE CASCADE;

-- Fix progress_updates table
ALTER TABLE progress_updates DROP CONSTRAINT IF EXISTS progress_updates_posted_by_fkey;
ALTER TABLE progress_updates ADD CONSTRAINT progress_updates_posted_by_fkey FOREIGN KEY (posted_by) REFERENCES profiles(id) ON DELETE CASCADE;
