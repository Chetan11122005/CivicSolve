-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- 1. Profiles table, extends Supabase auth.users
create table profiles (
  id uuid references auth.users primary key,
  full_name text not null,
  role text not null check (role in ('citizen', 'university', 'industry', 'admin')),
  institution_name text, -- nullable, relevant for university/industry
  created_at timestamp with time zone default now()
);

-- 2. Challenges
create table challenges (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null,
  category text not null check (category in ('water','health','education','infrastructure','environment','safety','other')),
  location text not null,
  severity text not null check (severity in ('low','medium','high')),
  status text not null default 'pending_approval'
    check (status in ('pending_approval','open','in_progress','solution_submitted','solved','rejected')),
  posted_by uuid references profiles(id) not null,
  image_url text,
  upvote_count int default 0,
  is_featured boolean default false,
  created_at timestamp with time zone default now()
);

-- 3. Upvotes (to prevent duplicate upvotes per user)
create table upvotes (
  id uuid primary key default gen_random_uuid(),
  challenge_id uuid references challenges(id) on delete cascade,
  user_id uuid references profiles(id) on delete cascade,
  created_at timestamp with time zone default now(),
  unique (challenge_id, user_id)
);

-- 4. Comments
create table comments (
  id uuid primary key default gen_random_uuid(),
  challenge_id uuid references challenges(id) on delete cascade,
  user_id uuid references profiles(id) not null,
  text text not null,
  created_at timestamp with time zone default now()
);

-- 5. Teams (a team "adopts" a challenge)
create table teams (
  id uuid primary key default gen_random_uuid(),
  challenge_id uuid references challenges(id) on delete cascade,
  team_name text not null,
  institution_name text not null,
  created_by uuid references profiles(id) not null,
  members text[] not null default '{}', -- simple array of names/emails, no invite system needed
  mentor_name text, -- optional, for industry involvement
  is_sponsored boolean default false,
  created_at timestamp with time zone default now()
);

-- 6. Progress updates (team's collaboration feed on a challenge)
create table progress_updates (
  id uuid primary key default gen_random_uuid(),
  team_id uuid references teams(id) on delete cascade,
  challenge_id uuid references challenges(id) on delete cascade,
  posted_by uuid references profiles(id) not null,
  text text not null,
  attachment_url text,
  created_at timestamp with time zone default now()
);

-- 7. Solutions
create table solutions (
  id uuid primary key default gen_random_uuid(),
  challenge_id uuid references challenges(id) on delete cascade,
  team_id uuid references teams(id) on delete cascade,
  summary text not null,
  demo_link text,
  status text not null default 'submitted' check (status in ('submitted','verified','rejected')),
  created_at timestamp with time zone default now()
);


-- ENABLE ROW LEVEL SECURITY
alter table profiles enable row level security;
alter table challenges enable row level security;
alter table upvotes enable row level security;
alter table comments enable row level security;
alter table teams enable row level security;
alter table progress_updates enable row level security;
alter table solutions enable row level security;

-- RLS POLICIES

-- Helper function to check if user is admin
create or replace function is_admin() returns boolean as $$
  select exists (
    select 1 from profiles where id = auth.uid() and role = 'admin'
  );
$$ language sql security definer;

-- 1. Profiles
create policy "Public profiles are viewable by everyone." on profiles for select using (true);
create policy "Users can insert their own profile." on profiles for insert with check (auth.uid() = id);
create policy "Users can update own profile." on profiles for update using (auth.uid() = id);

-- 2. Challenges
create policy "Challenges viewable by admin, owner, or if not pending." on challenges for select 
  using (status != 'pending_approval' or posted_by = auth.uid() or is_admin());
create policy "Authenticated users can insert challenges." on challenges for insert 
  with check (auth.uid() = posted_by);
create policy "Admin can update any challenge, owner can update own challenge." on challenges for update 
  using (is_admin() or posted_by = auth.uid());

-- 3. Upvotes
create policy "Upvotes viewable by everyone." on upvotes for select using (true);
create policy "Authenticated users can insert upvotes." on upvotes for insert with check (auth.uid() = user_id);

-- 4. Comments
create policy "Comments viewable by everyone." on comments for select using (true);
create policy "Authenticated users can insert comments." on comments for insert with check (auth.uid() = user_id);

-- 5. Teams
create policy "Teams viewable by everyone." on teams for select using (true);
create policy "University/Industry can insert teams." on teams for insert 
  with check (
    auth.uid() = created_by and 
    exists (select 1 from profiles where id = auth.uid() and role in ('university', 'industry'))
  );

-- 6. Progress Updates
create policy "Progress updates viewable by everyone." on progress_updates for select using (true);
create policy "Team members, challenge owner, or admin can insert updates." on progress_updates for insert 
  with check (
    auth.uid() = posted_by and (
      is_admin() or 
      exists (select 1 from challenges where id = challenge_id and posted_by = auth.uid()) or
      exists (select 1 from teams where id = team_id and created_by = auth.uid())
    )
  );

-- 7. Solutions
create policy "Solutions viewable by everyone." on solutions for select using (true);
create policy "Team creators can submit solutions." on solutions for insert 
  with check (exists (select 1 from teams where id = team_id and created_by = auth.uid()));
create policy "Admin or challenge owner can update solution status." on solutions for update 
  using (
    is_admin() or 
    exists (select 1 from challenges where id = challenge_id and posted_by = auth.uid())
  );

-- STORAGE SETUP
-- (You may need to enable Storage in your Supabase dashboard and create these manually if this fails)
insert into storage.buckets (id, name, public) values ('challenge-images', 'challenge-images', true) on conflict do nothing;
insert into storage.buckets (id, name, public) values ('attachments', 'attachments', true) on conflict do nothing;

create policy "Public Access" on storage.objects for select using (bucket_id in ('challenge-images', 'attachments'));
create policy "Authenticated Insert" on storage.objects for insert with check (auth.role() = 'authenticated');
