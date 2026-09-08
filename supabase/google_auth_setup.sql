-- =========================================================================
-- Google OAuth & Auto-Profile Provisioning Setup for CivicSolve
-- =========================================================================

-- 1. Automatic Profile Trigger on User Signup / OAuth Login
-- This function automatically creates a profile row in public.profiles
-- whenever a new user signs in via Google OAuth or Supabase Auth.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, role, institution_name)
  VALUES (
    new.id,
    COALESCE(
      new.raw_user_meta_data->>'full_name',
      new.raw_user_meta_data->>'name',
      split_part(new.email, '@', 1),
      'Civic Solver'
    ),
    COALESCE(new.raw_user_meta_data->>'role', 'citizen'),
    new.raw_user_meta_data->>'institution_name'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop trigger if it already exists to allow idempotent execution
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Attach the trigger to auth.users
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- =========================================================================
-- Supabase Dashboard Configuration Guide for Google OAuth:
-- =========================================================================
--
-- Step 1: Google Cloud Console Setup
-- 1. Go to Google Cloud Console (https://console.cloud.google.com/)
-- 2. Create a project or select your existing project.
-- 3. Go to "APIs & Services" > "OAuth consent screen":
--    - Choose "External"
--    - Fill in App Name ("CivicSolve"), Support Email, and Developer Contact Email.
-- 4. Go to "APIs & Services" > "Credentials":
--    - Click "+ CREATE CREDENTIALS" > "OAuth client ID"
--    - Application type: "Web application"
--    - Name: "CivicSolve Web Client"
--    - Authorized JavaScript origins:
--        http://localhost:5173
--        http://localhost:3000
--        https://your-production-domain.com
--    - Authorized redirect URIs:
--        https://<YOUR_SUPABASE_PROJECT_REF>.supabase.co/auth/v1/callback
--        (Find your Supabase project URL in Supabase Dashboard -> Project Settings -> API)
-- 5. Copy the generated "Client ID" and "Client Secret".
--
-- Step 2: Supabase Dashboard Setup
-- 1. Go to your Supabase Dashboard: https://supabase.com/dashboard/project/<YOUR_PROJECT_REF>/auth/providers
-- 2. Expand "Google" provider.
-- 3. Toggle "Enable Google provider" to ON.
-- 4. Paste your Google "Client ID" and "Client Secret".
-- 5. Click "Save".
--
-- Step 3: Redirect URLs Configuration in Supabase
-- 1. Go to Authentication > URL Configuration in Supabase Dashboard.
-- 2. Set Site URL: http://localhost:5173 (or your production URL).
-- 3. In "Redirect URLs", add:
--    - http://localhost:5173/**
--    - http://localhost:5173/dashboard
--    - https://your-production-domain.com/**
--
-- =========================================================================
