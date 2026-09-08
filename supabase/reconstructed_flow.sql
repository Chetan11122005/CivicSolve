-- =========================================================================
-- Reconstructed CivicSolve Problem-Solving Lifecycle Migration
-- =========================================================================

-- 1. Enhance teams table with proposal blueprint & technical details
ALTER TABLE teams ADD COLUMN IF NOT EXISTS proposal_summary TEXT;
ALTER TABLE teams ADD COLUMN IF NOT EXISTS tech_stack TEXT[] DEFAULT '{}';
ALTER TABLE teams ADD COLUMN IF NOT EXISTS estimated_timeline TEXT;
ALTER TABLE teams ADD COLUMN IF NOT EXISTS repo_url TEXT;
ALTER TABLE teams ADD COLUMN IF NOT EXISTS demo_video_url TEXT;
ALTER TABLE teams ADD COLUMN IF NOT EXISTS grant_requested NUMERIC DEFAULT 0;
ALTER TABLE teams ADD COLUMN IF NOT EXISTS upvote_count INT DEFAULT 0;

-- 2. Structured Milestones Table for Sprint-Based Tracking
CREATE TABLE IF NOT EXISTS milestones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
  challenge_id UUID REFERENCES challenges(id) ON DELETE CASCADE,
  milestone_number INT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  deliverable_url TEXT,
  proof_image_url TEXT,
  status TEXT DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed', 'verified')),
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Citizen Ground Verification Table
CREATE TABLE IF NOT EXISTS verification_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id UUID REFERENCES challenges(id) ON DELETE CASCADE,
  solution_id UUID REFERENCES solutions(id) ON DELETE CASCADE,
  verified_by UUID REFERENCES profiles(id),
  rating INT CHECK (rating BETWEEN 1 AND 5),
  feedback_notes TEXT,
  after_photo_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Enable Row Level Security
ALTER TABLE milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE verification_feedback ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies
CREATE POLICY "Milestones viewable by everyone" ON milestones FOR SELECT USING (true);
CREATE POLICY "Team creator can manage milestones" ON milestones FOR ALL 
  USING (EXISTS (SELECT 1 FROM teams WHERE teams.id = milestones.team_id AND teams.created_by = auth.uid()));

CREATE POLICY "Feedback viewable by everyone" ON verification_feedback FOR SELECT USING (true);
CREATE POLICY "Authenticated users can submit verification feedback" ON verification_feedback FOR INSERT 
  WITH CHECK (auth.uid() = verified_by);

-- 6. Helper to ensure initial default milestones upon team creation
CREATE OR REPLACE FUNCTION public.create_default_milestones()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.milestones (team_id, challenge_id, milestone_number, title, description, status)
  VALUES
    (NEW.id, NEW.challenge_id, 1, 'Problem Definition & Field Survey', 'Conduct site inspection, gather local requirements, and outline technical architecture.', 'in_progress'),
    (NEW.id, NEW.challenge_id, 2, 'Prototype & Proof of Concept', 'Develop working prototype (hardware/software), schematics, and simulation tests.', 'in_progress'),
    (NEW.id, NEW.challenge_id, 3, 'Field Testing & Citizen Trial', 'Deploy beta prototype on the ground, collect citizen validation metrics and feedback.', 'in_progress');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS tr_create_default_milestones ON teams;
CREATE TRIGGER tr_create_default_milestones
  AFTER INSERT ON teams
  FOR EACH ROW EXECUTE FUNCTION public.create_default_milestones();
