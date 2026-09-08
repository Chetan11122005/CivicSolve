import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Link, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Target, 
  Users, 
  CheckCircle, 
  Clock, 
  ShieldCheck, 
  ChevronRight, 
  Activity, 
  Star,
  Building2,
  Briefcase,
  Sparkles,
  Compass,
  Award,
  ExternalLink,
  Mail,
  ArrowUpRight,
  ThumbsUp,
  MapPin,
  TrendingUp,
  Gift
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const navigate = useNavigate();
  
  // Citizen Data
  const [myChallenges, setMyChallenges] = useState([]);

  // University Data
  const [myTeams, setMyTeams] = useState([]);
  
  // Industry Data
  const [mySponsoredTeams, setMySponsoredTeams] = useState([]);
  const [solutionsMarketplace, setSolutionsMarketplace] = useState([]);
  const [openChallengesToSponsor, setOpenChallengesToSponsor] = useState([]);
  const [solutionCategoryFilter, setSolutionCategoryFilter] = useState('all');

  // Admin Data
  const [pendingApprovals, setPendingApprovals] = useState([]);
  const [allChallenges, setAllChallenges] = useState([]); // for showcase manager
  
  // Navigation State
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate('/auth');
      return;
    }
    setUser(user);

    let { data: profileData } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle();

    // If profile is missing (e.g. first-time Google OAuth login), auto-provision it
    if (!profileData) {
      let pendingRole = 'citizen';
      let pendingInstitution = null;
      let pendingFullName = user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0] || 'Civic Solver';

      const pendingProfileStr = localStorage.getItem('pending_oauth_profile');
      if (pendingProfileStr) {
        try {
          const parsed = JSON.parse(pendingProfileStr);
          if (parsed.role) pendingRole = parsed.role;
          if (parsed.institutionName) pendingInstitution = parsed.institutionName;
          if (parsed.fullName) pendingFullName = parsed.fullName;
        } catch (e) {
          console.error('Error parsing pending oauth profile:', e);
        }
        localStorage.removeItem('pending_oauth_profile');
      }

      const { data: newProfile, error: insertError } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          full_name: pendingFullName,
          role: pendingRole,
          institution_name: ['university', 'industry'].includes(pendingRole) ? pendingInstitution : null,
        })
        .select()
        .maybeSingle();

      if (!insertError && newProfile) {
        profileData = newProfile;
      }
    }

    // Safety fallback
    if (!profileData) {
      profileData = {
        id: user.id,
        full_name: user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0] || 'User',
        role: 'citizen',
        institution_name: null,
      };
    }

    setProfile(profileData);

    if (profileData.role === 'citizen') {
      const { data } = await supabase.from('challenges').select('*').eq('posted_by', user.id).order('created_at', { ascending: false });
      setMyChallenges(data || []);
      setActiveTab('my_challenges');
    } else if (profileData.role === 'university') {
      const { data } = await supabase.from('teams').select('*, challenges(*)').eq('created_by', user.id);
      setMyTeams(data || []);
      setActiveTab('my_teams');
    } else if (profileData.role === 'industry') {
      // Industry user: fetch sponsorships, solutions marketplace, and open challenges
      const [sponsoredRes, solutionsRes, openRes] = await Promise.all([
        supabase.from('teams').select('*, challenges(*)').eq('created_by', user.id),
        supabase.from('solutions').select('*, challenges(*), teams(*)').order('created_at', { ascending: false }),
        supabase.from('challenges').select('*').eq('status', 'open').order('upvote_count', { ascending: false }).limit(10)
      ]);

      setMySponsoredTeams(sponsoredRes.data || []);
      setSolutionsMarketplace(solutionsRes.data || []);
      setOpenChallengesToSponsor(openRes.data || []);
      setActiveTab('industry_overview');
    } else if (profileData.role === 'admin') {
      const { data: pending } = await supabase.from('challenges').select('*').eq('status', 'pending_approval');
      setPendingApprovals(pending || []);
      const { data: all } = await supabase.from('challenges').select('*').order('created_at', { ascending: false });
      setAllChallenges(all || []);
      setActiveTab('pending');
    }
    
    setLoading(false);
  };

  const handleApproveChallenge = async (id) => {
    await supabase.from('challenges').update({ status: 'open' }).eq('id', id);
    fetchDashboardData();
  };

  const handleToggleFeatured = async (id, currentStatus) => {
    await supabase.from('challenges').update({ is_featured: !currentStatus }).eq('id', id);
    fetchDashboardData();
  };

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-64px)] bg-gray-50 dark:bg-gray-950 flex items-center justify-center transition-colors">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const SidebarItem = ({ id, label, icon: Icon, count = null }) => (
    <button
      onClick={() => setActiveTab(id)}
      className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all font-medium ${activeTab === id ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white'}`}
    >
      <div className="flex items-center gap-3">
        <Icon className="w-5 h-5" />
        {label}
      </div>
      {count !== null && count > 0 && (
        <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${activeTab === id ? 'bg-white/20 text-white' : 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300'}`}>
          {count}
        </span>
      )}
    </button>
  );

  // Industry metrics calculation
  const verifiedSolutions = solutionsMarketplace.filter(s => s.status === 'verified');
  const uniqueImpactCategories = Array.from(new Set(mySponsoredTeams.map(t => t.challenges?.category).filter(Boolean)));

  const filteredSolutions = solutionCategoryFilter === 'all' 
    ? verifiedSolutions 
    : verifiedSolutions.filter(s => s.challenges?.category === solutionCategoryFilter);

  return (
    <div className="min-h-[calc(100vh-64px)] bg-gray-50 dark:bg-gray-950 flex flex-col md:flex-row transition-colors">
      
      {/* Sidebar */}
      <div className="w-full md:w-72 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 flex flex-col flex-shrink-0">
        <div className="p-6 border-b border-gray-200 dark:border-gray-800">
          <div className="flex items-center gap-4 mb-2">
            {user?.user_metadata?.avatar_url ? (
              <img
                src={user.user_metadata.avatar_url}
                alt={profile?.full_name || 'User'}
                className="w-12 h-12 rounded-full object-cover shadow-xs border border-gray-200 dark:border-gray-700"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white text-xl font-bold shadow-xs flex-shrink-0">
                {(profile?.full_name || 'U').charAt(0).toUpperCase()}
              </div>
            )}
            <div className="overflow-hidden">
              <h2 className="font-bold text-gray-900 dark:text-white truncate">{profile?.full_name || 'User'}</h2>
              {profile?.institution_name && (
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{profile.institution_name}</p>
              )}
              <span className={`inline-block px-2.5 py-0.5 rounded-md text-xs font-bold capitalize mt-1.5 ${
                profile?.role === 'industry'
                  ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300 border border-purple-200 dark:border-purple-800/60'
                  : profile?.role === 'university'
                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60'
                  : 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border border-blue-100 dark:border-blue-800/50'
              }`}>
                {profile?.role === 'industry' ? 'Industry Partner' : profile?.role === 'university' ? 'University Solver' : profile?.role || 'Citizen'}
              </span>
            </div>
          </div>
        </div>
        
        <div className="p-4 space-y-2 flex-1 overflow-y-auto">
          {/* Citizen Sidebar */}
          {profile?.role === 'citizen' && (
            <>
              <SidebarItem id="my_challenges" label="My Challenges" icon={Target} count={myChallenges.length} />
            </>
          )}

          {/* University Sidebar */}
          {profile?.role === 'university' && (
            <>
              <SidebarItem id="my_teams" label="My Projects & Teams" icon={Users} count={myTeams.length} />
            </>
          )}

          {/* Industry Sidebar */}
          {profile?.role === 'industry' && (
            <>
              <div className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2 mt-2 px-4">Partner Hub</div>
              <SidebarItem id="industry_overview" label="Impact Overview" icon={Briefcase} />
              <SidebarItem id="industry_sponsored" label="Sponsored Initiatives" icon={Building2} count={mySponsoredTeams.length} />
              <SidebarItem id="industry_solutions" label="Solutions Marketplace" icon={Sparkles} count={verifiedSolutions.length} />
              <SidebarItem id="industry_explore" label="Explore to Sponsor" icon={Compass} count={openChallengesToSponsor.length} />
            </>
          )}

          {/* Admin Sidebar */}
          {profile?.role === 'admin' && (
            <>
              <div className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2 mt-4 px-4">Admin Tasks</div>
              <SidebarItem id="pending" label="Pending Approvals" icon={ShieldCheck} count={pendingApprovals.length} />
              <SidebarItem id="showcase" label="Showcase Manager" icon={Star} />
            </>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 p-6 md:p-10 overflow-y-auto">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="max-w-5xl mx-auto space-y-8"
          >
            {/* CITIZEN VIEWS */}
            {activeTab === 'my_challenges' && (
              <div>
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <h2 className="text-2xl font-extrabold text-gray-900 dark:text-white">My Challenges</h2>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">Track the progress of the problems you've posted.</p>
                  </div>
                  <Link to="/post-challenge" className="px-5 py-2.5 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 transition-colors shadow-sm">
                    Post New
                  </Link>
                </div>
                
                {myChallenges.length === 0 ? (
                  <div className="text-center py-20 bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm">
                    <Target className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">You haven't posted any challenges</h3>
                    <p className="text-gray-500 dark:text-gray-400 mb-6">Start making an impact in your community.</p>
                  </div>
                ) : (
                  <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-800">
                            <th className="px-6 py-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Challenge</th>
                            <th className="px-6 py-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                            <th className="px-6 py-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Date Posted</th>
                            <th className="px-6 py-4 text-right text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                          {myChallenges.map(c => (
                            <tr key={c.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors">
                              <td className="px-6 py-4">
                                <div className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                  <span>{c.title}</span>
                                  {(c.ai_quality_status === 'clear' || (c.ai_validation_score && c.ai_validation_score >= 60)) && (
                                    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold bg-indigo-50 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300">
                                      <Sparkles className="w-2.5 h-2.5 text-indigo-500" /> AI Verified
                                    </span>
                                  )}
                                </div>
                                <div className="text-sm text-gray-500 dark:text-gray-400 mt-1 flex items-center gap-2">
                                  <span className="capitalize">{c.category}</span>
                                  <span>•</span>
                                  <span>{c.upvote_count} upvotes</span>
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold capitalize ${
                                  c.status === 'open' ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border border-blue-200 dark:border-blue-800/50' : 
                                  c.status === 'pending_approval' ? 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 border border-gray-300 dark:border-gray-700' :
                                  'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400 border border-green-200 dark:border-green-800/50'
                                }`}>
                                  {c.status.replace('_', ' ')}
                                </span>
                              </td>
                              <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400 whitespace-nowrap">
                                {new Date(c.created_at).toLocaleDateString()}
                              </td>
                              <td className="px-6 py-4 text-right">
                                <Link to={`/challenge/${c.id}`} className="inline-flex items-center text-sm font-bold text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300">
                                  View <ChevronRight className="w-4 h-4 ml-1" />
                                </Link>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* UNIVERSITY VIEWS */}
            {activeTab === 'my_teams' && (
              <div>
                <div className="mb-6">
                  <h2 className="text-2xl font-extrabold text-gray-900 dark:text-white">Active Projects & Teams</h2>
                  <p className="text-gray-500 dark:text-gray-400 mt-1">Challenges your university teams have adopted to build solutions.</p>
                </div>
                
                {myTeams.length === 0 ? (
                  <div className="text-center py-20 bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm">
                    <Activity className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">No active projects</h3>
                    <p className="text-gray-500 dark:text-gray-400 mb-6">Explore the discover feed to adopt an open challenge with your team.</p>
                    <Link to="/discover" className="px-6 py-2.5 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 shadow-sm">Explore Challenges</Link>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {myTeams.map(t => (
                      <div key={t.id} className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden flex flex-col hover:border-blue-300 dark:hover:border-blue-700 transition-colors">
                        <div className="p-6 flex-1">
                          <div className="flex justify-between items-start mb-4">
                            <h3 className="font-bold text-lg text-gray-900 dark:text-white">{t.team_name}</h3>
                            <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border border-blue-200 dark:border-blue-800/50 capitalize">
                              {t.challenges?.status.replace('_', ' ')}
                            </span>
                          </div>
                          <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-4 flex items-center">
                            <Users className="w-4 h-4 mr-2 text-blue-600 dark:text-blue-400" /> {t.members.join(', ')}
                          </p>
                          <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-100 dark:border-gray-700/50">
                            <p className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2">Target Challenge</p>
                            <p className="font-bold text-gray-900 dark:text-white line-clamp-2">{t.challenges?.title}</p>
                          </div>
                        </div>
                        <div className="px-6 py-4 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-200 dark:border-gray-800 text-right">
                          <Link to={`/challenge/${t.challenge_id}`} className="text-sm font-bold text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300">
                            Manage Project & Post Updates &rarr;
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* INDUSTRY VIEWS: 1. OVERVIEW */}
            {activeTab === 'industry_overview' && (
              <div className="space-y-8">
                {/* Welcome Banner */}
                <div className="bg-gradient-to-br from-purple-900 via-indigo-900 to-blue-900 rounded-3xl p-8 text-white shadow-xl relative overflow-hidden">
                  <div className="relative z-10 max-w-2xl">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold bg-white/20 backdrop-blur-md border border-white/20 text-purple-200 uppercase tracking-wider mb-3">
                      <Building2 className="w-3.5 h-3.5" /> Industry & CSR Partner Portal
                    </span>
                    <h2 className="text-3xl font-extrabold tracking-tight mb-2">
                      {profile?.institution_name || profile?.full_name}
                    </h2>
                    <p className="text-purple-100 text-sm leading-relaxed mb-6">
                      Sponsor impactful civic challenges, mentor student teams, and fund or deploy verified solutions in the community.
                    </p>
                    <div className="flex flex-wrap gap-3">
                      <button 
                        onClick={() => setActiveTab('industry_explore')}
                        className="px-5 py-2.5 bg-white text-purple-950 font-bold text-sm rounded-xl hover:bg-purple-50 transition-colors shadow-sm flex items-center gap-2"
                      >
                        <Compass className="w-4 h-4" /> Sponsor Open Challenges
                      </button>
                      <button 
                        onClick={() => setActiveTab('industry_solutions')}
                        className="px-5 py-2.5 bg-white/10 hover:bg-white/20 text-white font-bold text-sm rounded-xl border border-white/20 backdrop-blur-md transition-colors flex items-center gap-2"
                      >
                        <Sparkles className="w-4 h-4" /> View Verified Solutions
                      </button>
                    </div>
                  </div>
                  <div className="absolute right-0 bottom-0 top-0 w-1/3 opacity-10 flex items-center justify-center pointer-events-none">
                    <Award className="w-72 h-72 text-white" />
                  </div>
                </div>

                {/* Impact Metrics Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                  <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm">
                    <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 flex items-center justify-center mb-3">
                      <Gift className="w-5 h-5" />
                    </div>
                    <div className="text-3xl font-extrabold text-gray-900 dark:text-white mb-1">
                      {mySponsoredTeams.length}
                    </div>
                    <div className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                      Sponsored Initiatives
                    </div>
                  </div>

                  <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm">
                    <div className="w-10 h-10 rounded-xl bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400 flex items-center justify-center mb-3">
                      <CheckCircle className="w-5 h-5" />
                    </div>
                    <div className="text-3xl font-extrabold text-gray-900 dark:text-white mb-1">
                      {verifiedSolutions.length}
                    </div>
                    <div className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                      Solutions for Deployment
                    </div>
                  </div>

                  <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-3">
                      <Target className="w-5 h-5" />
                    </div>
                    <div className="text-3xl font-extrabold text-gray-900 dark:text-white mb-1">
                      {uniqueImpactCategories.length}
                    </div>
                    <div className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                      Focus Domains Supported
                    </div>
                  </div>

                  <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm">
                    <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 flex items-center justify-center mb-3">
                      <TrendingUp className="w-5 h-5" />
                    </div>
                    <div className="text-3xl font-extrabold text-gray-900 dark:text-white mb-1">
                      {openChallengesToSponsor.length}
                    </div>
                    <div className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                      High-Priority Solvers Seeking Backing
                    </div>
                  </div>
                </div>

                {/* Quick Shortcuts / Next Actions */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Recent Sponsored Initiatives */}
                  <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6 shadow-sm">
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="font-extrabold text-lg text-gray-900 dark:text-white flex items-center gap-2">
                        <Building2 className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                        Your Sponsored Initiatives
                      </h3>
                      <button 
                        onClick={() => setActiveTab('industry_sponsored')}
                        className="text-xs font-bold text-purple-600 dark:text-purple-400 hover:underline"
                      >
                        View All ({mySponsoredTeams.length})
                      </button>
                    </div>

                    {mySponsoredTeams.length === 0 ? (
                      <div className="text-center py-8 bg-gray-50 dark:bg-gray-800/40 rounded-xl border border-dashed border-gray-200 dark:border-gray-700">
                        <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3">You have not sponsored any challenges yet.</p>
                        <button 
                          onClick={() => setActiveTab('industry_explore')}
                          className="px-4 py-2 bg-purple-600 text-white font-bold text-xs rounded-lg hover:bg-purple-700 transition-colors"
                        >
                          Find Open Challenges to Sponsor
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {mySponsoredTeams.slice(0, 3).map(t => (
                          <div key={t.id} className="p-3.5 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-100 dark:border-gray-700/50 flex justify-between items-center">
                            <div className="overflow-hidden pr-3">
                              <p className="font-bold text-sm text-gray-900 dark:text-white truncate">{t.challenges?.title}</p>
                              <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">{t.challenges?.category} • {t.mentor_name ? `Mentor: ${t.mentor_name}` : 'Sponsored Partner'}</p>
                            </div>
                            <Link to={`/challenge/${t.challenge_id}`} className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline flex-shrink-0">
                              View &rarr;
                            </Link>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Ready to Deploy Solutions */}
                  <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6 shadow-sm">
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="font-extrabold text-lg text-gray-900 dark:text-white flex items-center gap-2">
                        <Sparkles className="w-5 h-5 text-green-600 dark:text-green-400" />
                        Solutions Ready for Deployment
                      </h3>
                      <button 
                        onClick={() => setActiveTab('industry_solutions')}
                        className="text-xs font-bold text-green-600 dark:text-green-400 hover:underline"
                      >
                        Marketplace ({verifiedSolutions.length})
                      </button>
                    </div>

                    {verifiedSolutions.length === 0 ? (
                      <div className="text-center py-8 bg-gray-50 dark:bg-gray-800/40 rounded-xl border border-dashed border-gray-200 dark:border-gray-700">
                        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">No verified solutions yet. Check back soon!</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {verifiedSolutions.slice(0, 3).map(s => (
                          <div key={s.id} className="p-3.5 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-100 dark:border-gray-700/50 flex justify-between items-center">
                            <div className="overflow-hidden pr-3">
                              <p className="font-bold text-sm text-gray-900 dark:text-white truncate">{s.challenges?.title}</p>
                              <p className="text-xs text-gray-500 dark:text-gray-400 truncate">By {s.teams?.team_name} ({s.teams?.institution_name})</p>
                            </div>
                            <Link to={`/challenge/${s.challenge_id}`} className="text-xs font-bold text-green-600 dark:text-green-400 hover:underline flex-shrink-0">
                              Review &rarr;
                            </Link>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* INDUSTRY VIEWS: 2. SPONSORED INITIATIVES */}
            {activeTab === 'industry_sponsored' && (
              <div>
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                  <div>
                    <h2 className="text-2xl font-extrabold text-gray-900 dark:text-white flex items-center gap-2.5">
                      <Building2 className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                      Sponsored Challenges & Grants
                    </h2>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">
                      Civic challenges your organization is funding, sponsoring with bounties, or mentoring.
                    </p>
                  </div>
                  <button 
                    onClick={() => setActiveTab('industry_explore')}
                    className="px-5 py-2.5 bg-purple-600 text-white rounded-xl font-bold text-sm hover:bg-purple-700 transition-colors shadow-sm"
                  >
                    + Sponsor Another Challenge
                  </button>
                </div>

                {mySponsoredTeams.length === 0 ? (
                  <div className="text-center py-20 bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm">
                    <Gift className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">No Sponsored Challenges Yet</h3>
                    <p className="text-gray-500 dark:text-gray-400 mb-6 max-w-md mx-auto text-sm">
                      Pledge grants, provide mentorship, or attach CSR sponsorship to student solving teams working on urgent civic issues.
                    </p>
                    <button 
                      onClick={() => setActiveTab('industry_explore')}
                      className="px-6 py-2.5 bg-purple-600 text-white rounded-lg font-bold hover:bg-purple-700 shadow-sm text-sm"
                    >
                      Browse Open Challenges
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {mySponsoredTeams.map(t => (
                      <div key={t.id} className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden flex flex-col hover:border-purple-300 dark:hover:border-purple-700 transition-colors">
                        <div className="p-6 flex-1">
                          <div className="flex justify-between items-start mb-3">
                            <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 border border-purple-200 dark:border-purple-800/50">
                              🏆 Sponsored Initiative
                            </span>
                            <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border border-blue-200 dark:border-blue-800/50 capitalize">
                              {t.challenges?.status?.replace('_', ' ')}
                            </span>
                          </div>

                          <h3 className="font-bold text-lg text-gray-900 dark:text-white mb-2">
                            {t.challenges?.title || t.team_name}
                          </h3>

                          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-4 flex items-center gap-2">
                            <span className="capitalize">{t.challenges?.category}</span>
                            <span>•</span>
                            <span><MapPin className="w-3.5 h-3.5 inline mr-1" />{t.challenges?.location}</span>
                          </p>

                          <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-100 dark:border-gray-700/50 space-y-2">
                            {t.mentor_name && (
                              <p className="text-xs text-gray-700 dark:text-gray-300">
                                <span className="font-bold text-gray-900 dark:text-white">Assigned Mentor:</span> {t.mentor_name}
                              </p>
                            )}
                            {t.members?.length > 0 && (
                              <p className="text-xs text-gray-700 dark:text-gray-300">
                                <span className="font-bold text-gray-900 dark:text-white">Grant / Partner Notes:</span> {t.members.join(', ')}
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="px-6 py-4 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-200 dark:border-gray-800 flex justify-between items-center">
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            {new Date(t.created_at).toLocaleDateString()}
                          </span>
                          <Link to={`/challenge/${t.challenge_id}`} className="text-sm font-bold text-purple-600 dark:text-purple-400 hover:text-purple-800 dark:hover:text-purple-300 flex items-center">
                            View Progress Feed &rarr;
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* INDUSTRY VIEWS: 3. SOLUTIONS MARKETPLACE */}
            {activeTab === 'industry_solutions' && (
              <div>
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                  <div>
                    <h2 className="text-2xl font-extrabold text-gray-900 dark:text-white flex items-center gap-2.5">
                      <Sparkles className="w-6 h-6 text-green-600 dark:text-green-400" />
                      Verified Solutions Marketplace
                    </h2>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">
                      Ready-to-deploy prototypes and verified solutions from university solvers seeking grants, corporate pilots, and CSR rollouts.
                    </p>
                  </div>

                  {/* Category Filter */}
                  <select
                    value={solutionCategoryFilter}
                    onChange={(e) => setSolutionCategoryFilter(e.target.value)}
                    className="px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm font-bold text-gray-700 dark:text-gray-200 outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="all">All Domains</option>
                    <option value="water">Water</option>
                    <option value="infrastructure">Infrastructure</option>
                    <option value="health">Health</option>
                    <option value="safety">Safety</option>
                    <option value="education">Education</option>
                    <option value="environment">Environment</option>
                  </select>
                </div>

                {filteredSolutions.length === 0 ? (
                  <div className="text-center py-20 bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm">
                    <Sparkles className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">No Verified Solutions in this Category</h3>
                    <p className="text-gray-500 dark:text-gray-400 mb-6 text-sm">Check back as student teams submit their verified final prototypes.</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {filteredSolutions.map(s => (
                      <div key={s.id} className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6 sm:p-8 shadow-sm hover:border-green-300 dark:hover:border-green-700 transition-colors">
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4 pb-4 border-b border-gray-100 dark:border-gray-800">
                          <div>
                            <div className="flex items-center gap-2.5 mb-1.5">
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300">
                                <CheckCircle className="w-3.5 h-3.5" /> Verified Winner
                              </span>
                              <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                                {s.challenges?.category}
                              </span>
                            </div>
                            <h3 className="text-xl font-extrabold text-gray-900 dark:text-white">
                              {s.challenges?.title}
                            </h3>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                              Developed by <span className="font-bold text-gray-700 dark:text-gray-300">{s.teams?.team_name}</span> ({s.teams?.institution_name})
                            </p>
                          </div>

                          <div className="flex flex-wrap gap-2.5 w-full md:w-auto">
                            {s.demo_link && (
                              <a
                                href={s.demo_link}
                                target="_blank"
                                rel="noreferrer"
                                className="px-4 py-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-colors"
                              >
                                <ExternalLink className="w-3.5 h-3.5" /> Live Demo
                              </a>
                            )}
                            <a
                              href={`mailto:${s.contact_email || ''}?subject=Partnership%20Inquiry%20regarding%20${encodeURIComponent(s.challenges?.title || 'Civic Solution')}&body=Hello%20${encodeURIComponent(s.teams?.team_name || 'Team')},%0A%0AWe%20saw%20your%20verified%20solution%20on%20CivicSolve%20and%20would%20like%20to%20discuss%20funding%20/%20deploying%20it.`}
                              className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 transition-colors shadow-sm"
                            >
                              <Mail className="w-3.5 h-3.5" /> Contact for Grant / Pilot
                            </a>
                          </div>
                        </div>

                        <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-5 text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                          <p className="font-bold text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Solution Summary</p>
                          <p className="whitespace-pre-wrap">{s.summary}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* INDUSTRY VIEWS: 4. EXPLORE CHALLENGES TO SPONSOR */}
            {activeTab === 'industry_explore' && (
              <div>
                <div className="mb-6">
                  <h2 className="text-2xl font-extrabold text-gray-900 dark:text-white flex items-center gap-2.5">
                    <Compass className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                    High-Priority Challenges Seeking Sponsors
                  </h2>
                  <p className="text-gray-500 dark:text-gray-400 mt-1">
                    Select a community problem to attach a corporate grant, bounty, or mentorship initiative.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {openChallengesToSponsor.map(c => (
                    <div key={c.id} className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6 shadow-sm flex flex-col justify-between hover:border-purple-300 dark:hover:border-purple-700 transition-colors">
                      <div>
                        <div className="flex justify-between items-start mb-3">
                          <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 capitalize">
                            {c.category}
                          </span>
                          <span className="flex items-center text-xs font-bold text-gray-500 dark:text-gray-400">
                            <ThumbsUp className="w-3.5 h-3.5 mr-1 text-blue-600" /> {c.upvote_count} Upvotes
                          </span>
                        </div>

                        <h3 className="font-bold text-lg text-gray-900 dark:text-white mb-2 line-clamp-1">
                          {c.title}
                        </h3>

                        <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-3 mb-4 leading-relaxed">
                          {c.description}
                        </p>
                      </div>

                      <div className="pt-4 border-t border-gray-100 dark:border-gray-800 flex justify-between items-center">
                        <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center">
                          <MapPin className="w-3.5 h-3.5 mr-1" /> {c.location}
                        </span>
                        <Link 
                          to={`/challenge/${c.id}`}
                          className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-1 shadow-sm"
                        >
                          <Gift className="w-3.5 h-3.5" /> Sponsor This Challenge
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ADMIN VIEWS */}
            {activeTab === 'pending' && (
              <div>
                <div className="mb-6">
                  <h2 className="text-2xl font-extrabold text-gray-900 dark:text-white">Review Submissions</h2>
                  <p className="text-gray-500 dark:text-gray-400 mt-1">Approve newly posted challenges so they appear on the public feed.</p>
                </div>
                
                {pendingApprovals.length === 0 ? (
                  <div className="text-center py-20 bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm flex flex-col items-center">
                    <CheckCircle className="w-12 h-12 text-green-500 mb-4" />
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">All caught up!</h3>
                    <p className="text-gray-500 dark:text-gray-400">There are no pending challenges to review.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {pendingApprovals.map(c => (
                      <div key={c.id} className="bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border border-amber-200 dark:border-amber-800/50 uppercase">Needs Review</span>
                            <span className="text-xs font-medium text-gray-500 dark:text-gray-400">{new Date(c.created_at).toLocaleDateString()}</span>
                          </div>
                          <h3 className="text-lg font-bold text-gray-900 dark:text-white">{c.title}</h3>
                          <p className="text-gray-600 dark:text-gray-400 mt-2 text-sm line-clamp-2">{c.description}</p>
                        </div>
                        <div className="flex gap-3 w-full md:w-auto">
                          <button onClick={() => handleApproveChallenge(c.id)} className="flex-1 md:flex-none px-6 py-2.5 bg-green-600 text-white font-bold rounded-lg hover:bg-green-700 shadow-sm transition-colors">Approve</button>
                          <Link to={`/challenge/${c.id}`} className="flex-1 md:flex-none text-center px-6 py-2.5 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-bold rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">View Details</Link>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'showcase' && (
              <div>
                <div className="mb-6">
                  <h2 className="text-2xl font-extrabold text-gray-900 dark:text-white">Showcase Manager</h2>
                  <p className="text-gray-500 dark:text-gray-400 mt-1">Select which solved challenges appear on the homepage success stories.</p>
                </div>
                
                <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-800">
                          <th className="px-6 py-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Challenge</th>
                          <th className="px-6 py-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                          <th className="px-6 py-4 text-right text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Featured</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                        {allChallenges.map(c => (
                          <tr key={c.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors">
                            <td className="px-6 py-4">
                              <div className="font-bold text-gray-900 dark:text-white">{c.title}</div>
                            </td>
                            <td className="px-6 py-4">
                              <span className="text-sm text-gray-500 dark:text-gray-400 capitalize">{c.status.replace('_', ' ')}</span>
                            </td>
                            <td className="px-6 py-4 text-right">
                              <button
                                onClick={() => handleToggleFeatured(c.id, c.is_featured)}
                                className={`px-4 py-1.5 rounded-lg text-sm font-bold transition-colors ${
                                  c.is_featured 
                                    ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border border-amber-200 dark:border-amber-800/50' 
                                    : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 border border-gray-200 dark:border-gray-700 hover:bg-gray-200 dark:hover:bg-gray-700'
                                }`}
                              >
                                {c.is_featured ? '★ Featured' : '☆ Feature'}
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

