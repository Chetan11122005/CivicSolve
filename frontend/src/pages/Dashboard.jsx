import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Link } from 'react-router-dom';
import { LayoutDashboard, Target, Users, CheckCircle, Clock, ShieldCheck, ChevronRight, Activity, Star } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  
  // Data
  const [myChallenges, setMyChallenges] = useState([]);
  const [myTeams, setMyTeams] = useState([]);
  
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
    if (!user) return;

    const { data: profileData } = await supabase.from('profiles').select('*').eq('id', user.id).single();
    setProfile(profileData);

    if (profileData.role === 'citizen') {
      const { data } = await supabase.from('challenges').select('*').eq('posted_by', user.id).order('created_at', { ascending: false });
      setMyChallenges(data || []);
      setActiveTab('my_challenges');
    } else if (profileData.role === 'admin') {
      const { data: pending } = await supabase.from('challenges').select('*').eq('status', 'pending_approval');
      setPendingApprovals(pending || []);
      const { data: all } = await supabase.from('challenges').select('*').order('created_at', { ascending: false });
      setAllChallenges(all || []);
      setActiveTab('pending');
    } else {
      // University / Industry
      const { data } = await supabase.from('teams').select('*, challenges(*)').eq('created_by', user.id);
      setMyTeams(data || []);
      setActiveTab('my_teams');
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

  return (
    <div className="min-h-[calc(100vh-64px)] bg-gray-50 dark:bg-gray-950 flex flex-col md:flex-row transition-colors">
      
      {/* Sidebar */}
      <div className="w-full md:w-72 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 flex flex-col flex-shrink-0">
        <div className="p-6 border-b border-gray-200 dark:border-gray-800">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white text-xl font-bold shadow-sm">
              {profile.full_name.charAt(0)}
            </div>
            <div>
              <h2 className="font-bold text-gray-900 dark:text-white truncate">{profile.full_name}</h2>
              <span className="inline-block px-2.5 py-0.5 rounded-md text-xs font-bold bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border border-blue-100 dark:border-blue-800/50 capitalize mt-1">
                {profile.role}
              </span>
            </div>
          </div>
        </div>
        
        <div className="p-4 space-y-2 flex-1 overflow-y-auto">
          {profile.role === 'citizen' && (
            <>
              <SidebarItem id="my_challenges" label="My Challenges" icon={Target} count={myChallenges.length} />
            </>
          )}

          {['university', 'industry'].includes(profile.role) && (
            <>
              <SidebarItem id="my_teams" label="My Teams" icon={Users} count={myTeams.length} />
            </>
          )}

          {profile.role === 'admin' && (
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
                                <div className="font-bold text-gray-900 dark:text-white">{c.title}</div>
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

            {/* UNI / INDUSTRY VIEWS */}
            {activeTab === 'my_teams' && (
              <div>
                <div className="mb-6">
                  <h2 className="text-2xl font-extrabold text-gray-900 dark:text-white">Active Projects</h2>
                  <p className="text-gray-500 dark:text-gray-400 mt-1">Challenges your teams have adopted.</p>
                </div>
                
                {myTeams.length === 0 ? (
                  <div className="text-center py-20 bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm">
                    <Activity className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">No active projects</h3>
                    <p className="text-gray-500 dark:text-gray-400 mb-6">Head to the Discover page to adopt a challenge.</p>
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
                            <Users className="w-4 h-4 mr-2" /> {t.members.join(', ')}
                          </p>
                          <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-100 dark:border-gray-700/50">
                            <p className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2">Target Challenge</p>
                            <p className="font-bold text-gray-900 dark:text-white line-clamp-2">{t.challenges?.title}</p>
                          </div>
                        </div>
                        <div className="px-6 py-4 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-200 dark:border-gray-800 text-right">
                          <Link to={`/challenge/${t.challenge_id}`} className="text-sm font-bold text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300">
                            Manage Project &rarr;
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
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
