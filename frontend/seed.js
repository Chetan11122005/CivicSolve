import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env from current directory (.env)
dotenv.config({ path: path.join(__dirname, '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in frontend/.env");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function seed() {
  console.log("Starting database seeding...");

  // 1. Create Users
  const usersToCreate = [
    { email: 'citizen@example.com', password: 'password123', name: 'Jane Citizen', role: 'citizen', institution: null },
    { email: 'uni1@example.com', password: 'password123', name: 'Prof. Smith', role: 'university', institution: 'State University' },
    { email: 'uni2@example.com', password: 'password123', name: 'Student Innovators', role: 'university', institution: 'Tech Institute' },
    { email: 'industry@example.com', password: 'password123', name: 'Corp Tech', role: 'industry', institution: 'Global Solutions Inc' },
    { email: 'admin@example.com', password: 'password123', name: 'Super Admin', role: 'admin', institution: null },
  ];

  const createdUsers = {};

  for (const u of usersToCreate) {
    console.log(`Creating user: ${u.email}...`);
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: u.email,
      password: u.password,
    });

    if (authError) {
      console.log(`Error or already exists for ${u.email}:`, authError.message);
      // Attempt login if already exists
      const { data: loginData } = await supabase.auth.signInWithPassword({ email: u.email, password: u.password });
      if (loginData?.user) {
         createdUsers[u.role === 'university' && createdUsers['university'] ? 'university2' : u.role] = loginData.user;
      }
      continue;
    }

    const user = authData.user;
    createdUsers[u.role === 'university' && createdUsers['university'] ? 'university2' : u.role] = user;

    // Update profile
    await supabase.from('profiles').upsert({
      id: user.id,
      full_name: u.name,
      role: u.role,
      institution_name: u.institution
    });
  }

  // Login as citizen to post challenges
  await supabase.auth.signInWithPassword({ email: 'citizen@example.com', password: 'password123' });

  console.log("Inserting challenges...");
  const challenges = [
    {
      title: "Clean Water Access in Rural Valley",
      description: "The local river is heavily polluted with agricultural runoff. We need a low-cost filtration system to ensure safe drinking water for 500 families.",
      category: "water", location: "Rural Valley", severity: "high", status: "open", is_featured: false, posted_by: createdUsers.citizen.id,
      image_url: "https://images.unsplash.com/photo-1542361345-89e58247f2d5?q=80&w=2940&auto=format&fit=crop"
    },
    {
      title: "Smart Traffic Lights for Main Street",
      description: "Traffic congestion during rush hour is causing major delays and increased emissions. We need an AI-based timing system to optimize flow.",
      category: "infrastructure", location: "Downtown", severity: "medium", status: "pending_approval", is_featured: false, posted_by: createdUsers.citizen.id,
      image_url: "https://images.unsplash.com/photo-1449824913935-59a10b8d2000?q=80&w=2940&auto=format&fit=crop"
    },
    {
      title: "Community Solar Power Grid",
      description: "Looking to build a micro-grid for 50 homes using solar panels. Need electrical engineering students to design the distribution system.",
      category: "environment", location: "Sunnyside", severity: "medium", status: "open", is_featured: false, posted_by: createdUsers.citizen.id,
      image_url: "https://images.unsplash.com/photo-1509391366360-1e97d526168e?q=80&w=2944&auto=format&fit=crop"
    },
    {
      title: "Automated Pothole Detection",
      description: "Need a computer vision model that can run on city buses to automatically detect and report potholes to the public works department.",
      category: "infrastructure", location: "Citywide", severity: "high", status: "solved", is_featured: true, posted_by: createdUsers.citizen.id,
      image_url: "https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?q=80&w=2940&auto=format&fit=crop"
    },
    {
      title: "Digital Literacy for Seniors",
      description: "Need an easy-to-use tablet interface designed specifically for elderly citizens to access government services and telemedicine.",
      category: "education", location: "North District", severity: "low", status: "solved", is_featured: true, posted_by: createdUsers.citizen.id,
      image_url: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?q=80&w=2788&auto=format&fit=crop"
    },
    {
      title: "Flood Warning IoT Sensors",
      description: "Low-cost water level sensors connected via LoRaWAN to warn neighborhoods of flash floods in real-time.",
      category: "safety", location: "Riverside", severity: "high", status: "solved", is_featured: true, posted_by: createdUsers.citizen.id,
      image_url: "https://images.unsplash.com/photo-1547683905-f686c993aae5?q=80&w=2940&auto=format&fit=crop"
    },
    {
      title: "Mobile Health Clinic Routing",
      description: "An optimization algorithm to track and schedule mobile health clinics serving remote areas efficiently.",
      category: "health", location: "Western Province", severity: "high", status: "in_progress", is_featured: false, posted_by: createdUsers.citizen.id,
      image_url: "https://images.unsplash.com/photo-1584515933487-779824d29309?q=80&w=2940&auto=format&fit=crop"
    },
    {
      title: "Waste Sorting Robotics",
      description: "A robotic arm system for the local recycling facility to automatically sort plastics from compostable materials.",
      category: "environment", location: "Industrial Park", severity: "medium", status: "solution_submitted", is_featured: false, posted_by: createdUsers.citizen.id,
      image_url: "https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?q=80&w=2940&auto=format&fit=crop"
    }
  ];

  const { data: insertedChallenges, error: challengesError } = await supabase.from('challenges').insert(challenges).select();
  if (challengesError) { console.error("Error inserting challenges:", challengesError); return; }

  // We need to bypass RLS to force update statuses that citizens can't normally set (like solved)
  await supabase.auth.signInWithPassword({ email: 'admin@example.com', password: 'password123' });
  
  // Login as University to create teams
  await supabase.auth.signInWithPassword({ email: 'uni1@example.com', password: 'password123' });
  
  console.log("Creating teams and progress updates...");
  
  const inProgressChallenge = insertedChallenges.find(c => c.status === 'in_progress');
  const solutionSubChallenge = insertedChallenges.find(c => c.status === 'solution_submitted');
  const solvedChallenges = insertedChallenges.filter(c => c.status === 'solved');

  if (inProgressChallenge) {
    const { data: team1 } = await supabase.from('teams').insert({
      challenge_id: inProgressChallenge.id,
      team_name: "HealthTech Innovators",
      institution_name: "State University",
      created_by: createdUsers.university.id,
      members: ["Alice Walker", "Bob Chen"]
    }).select().single();

    if (team1) {
      await supabase.from('progress_updates').insert([
        { team_id: team1.id, challenge_id: inProgressChallenge.id, posted_by: createdUsers.university.id, text: "We have finalized the app wireframes and conducted 5 user interviews." },
        { team_id: team1.id, challenge_id: inProgressChallenge.id, posted_by: createdUsers.university.id, text: "Backend database schema is set up. Moving on to the React Native frontend!" }
      ]);
    }
  }

  if (solutionSubChallenge) {
    const { data: team2 } = await supabase.from('teams').insert({
      challenge_id: solutionSubChallenge.id,
      team_name: "EcoBots",
      institution_name: "Tech Institute",
      created_by: createdUsers.university2?.id || createdUsers.university.id,
      members: ["Charlie Davis", "Dave Smith"]
    }).select().single();

    if (team2) {
      if (createdUsers.university2) {
        await supabase.auth.signInWithPassword({ email: 'uni2@example.com', password: 'password123' });
      }
      
      await supabase.from('solutions').insert({
        challenge_id: solutionSubChallenge.id,
        team_id: team2.id,
        summary: "We built a computer vision model using YOLOv8 to detect 5 types of recyclable plastics with 94% accuracy. The robotic arm code is currently being simulated in ROS.",
        demo_link: "https://github.com/example/ecobots",
        contact_email: "team@ecobots.edu",
        status: "submitted"
      });
    }
  }

  console.log("Creating solutions for solved challenges...");
  for (const sc of solvedChallenges) {
    await supabase.auth.signInWithPassword({ email: 'industry@example.com', password: 'password123' });
    
    const { data: team3 } = await supabase.from('teams').insert({
      challenge_id: sc.id,
      team_name: "Global Solvers",
      institution_name: "Global Solutions Inc",
      created_by: createdUsers.industry.id,
      members: ["Eve Rodriguez", "Frank Lee"],
      is_sponsored: true,
      mentor_name: "Dr. Mentor"
    }).select().single();

    if (team3) {
      const { data: solData, error: solError } = await supabase.from('solutions').insert({
        challenge_id: sc.id,
        team_id: team3.id,
        summary: `We successfully deployed the solution for ${sc.title}. The system is now live, serving the community, and we have open-sourced the entire hardware schematic for other cities to replicate.`,
        demo_link: "https://demo.example.com",
        contact_email: "contact@globalsolutions.com",
        status: "verified"
      }).select();
      if (solError) console.error("Solution error:", solError);
    }
  }

  console.log("✅ Seeding complete! Check your homepage.");
  process.exit(0);
}

seed();
