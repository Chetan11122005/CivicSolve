import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate, Link } from 'react-router-dom';
import { CheckCircle, XCircle, Star, LogOut } from 'lucide-react';

export default function Dashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);

  // Data states
  const [myChallenges, setMyChallenges] = useState([]);
  const [myTeams, setMyTeams] = useState([]);
  
  // Admin states
  const [pendingChallenges, setPendingChallenges] = useState([]);
  const [pendingSolutions, setPendingSolutions] = useState([]);
  const [solvedChallenges, setSolvedChallenges] = useState([]);

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
    const { data: profileData } = await supabase.from('profiles').select('*').eq('id', user.id).single();
    setProfile(profileData);

    if (profileData.role === 'citizen') {
      const { data } = await supabase.from('challenges').select('*').eq('posted_by', user.id).order('created_at', { ascending: false });
      setMyChallenges(data || []);
    } 
    else if (['university', 'industry'].includes(profileData.role)) {
      const { data } = await supabase.from('teams').select('*, challenges(id, title, status)').eq('created_by', user.id).order('created_at', { ascending: false });
      setMyTeams(data || []);
    }
    else if (profileData.role === 'admin') {
      const { data: pc } = await supabase.from('challenges').select('*, profiles!challenges_posted_by_fkey(full_name)').eq('status', 'pending_approval').order('created_at', { ascending: false });
      setPendingChallenges(pc || []);

      const { data: ps } = await supabase.from('solutions').select('*, challenges(id, title), teams(team_name)').eq('status', 'submitted');
      setPendingSolutions(ps || []);

      const { data: sc } = await supabase.from('challenges').select('*').eq('status', 'solved').order('created_at', { ascending: false });
      setSolvedChallenges(sc || []);
    }

    setLoading(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/auth');
  };

  // Admin Actions
  const handleApproveChallenge = async (id, approve) => {
    const status = approve ? 'open' : 'rejected';
    await supabase.from('challenges').update({ status }).eq('id', id);
    fetchDashboardData();
  };

  const handleVerifySolution = async (solutionId, challengeId, approve) => {
    if (approve) {
      await supabase.from('solutions').update({ status: 'verified' }).eq('id', solutionId);
      await supabase.from('challenges').update({ status: 'solved' }).eq('id', challengeId);
    } else {
      await supabase.from('solutions').update({ status: 'rejected' }).eq('id', solutionId);
      await supabase.from('challenges').update({ status: 'in_progress' }).eq('id', challengeId);
    }
    fetchDashboardData();
  };

  const handleToggleFeatured = async (id, currentStatus) => {
    await supabase.from('challenges').update({ is_featured: !currentStatus }).eq('id', id);
    fetchDashboardData();
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center text-gray-500">Loading dashboard...</div>;
  if (!profile) return null;

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Dashboard Header */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Welcome, {profile.full_name}</h1>
            <p className="text-sm text-gray-500 capitalize mt-1">Role: {profile.role} {profile.institution_name ? `- ${profile.institution_name}` : ''}</p>
          </div>
          <div className="flex gap-4">
            <Link to="/discover" className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md font-medium hover:bg-gray-200">Explore</Link>
            {profile.role === 'citizen' && (
              <Link to="/post-challenge" className="px-4 py-2 bg-blue-600 text-white rounded-md font-medium hover:bg-blue-700">Post Challenge</Link>
            )}
            <button onClick={handleLogout} className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md font-medium hover:bg-gray-50 flex items-center">
              <LogOut className="w-4 h-4 mr-2" /> Logout
            </button>
          </div>
        </div>

        {/* CITIZEN VIEW */}
        {profile.role === 'citizen' && (
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <h2 className="text-xl font-bold text-gray-900 mb-6">My Posted Challenges</h2>
            {myChallenges.length === 0 ? (
              <p className="text-gray-500">You haven't posted any challenges yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Title</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {myChallenges.map((c) => (
                      <tr key={c.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{c.title}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                            ${c.status === 'pending_approval' ? 'bg-gray-100 text-gray-800' : ''}
                            ${c.status === 'open' ? 'bg-blue-100 text-blue-800' : ''}
                            ${c.status === 'in_progress' ? 'bg-amber-100 text-amber-800' : ''}
                            ${c.status === 'solution_submitted' ? 'bg-purple-100 text-purple-800' : ''}
                            ${c.status === 'solved' ? 'bg-green-100 text-green-800' : ''}
                          `}>
                            {c.status.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(c.created_at).toLocaleDateString()}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <Link to={`/challenge/${c.id}`} className="text-blue-600 hover:text-blue-900">
                            {c.status === 'solution_submitted' ? 'Review Solution' : 'View'}
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* UNIVERSITY / INDUSTRY VIEW */}
        {['university', 'industry'].includes(profile.role) && (
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <h2 className="text-xl font-bold text-gray-900 mb-6">Challenges My Team Adopted</h2>
            {myTeams.length === 0 ? (
              <p className="text-gray-500">You haven't adopted any challenges yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Challenge</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Team Name</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {myTeams.map((t) => (
                      <tr key={t.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{t.challenges?.title}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{t.team_name}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                           <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800 capitalize">
                            {t.challenges?.status?.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <Link to={`/challenge/${t.challenges?.id}`} className="text-blue-600 hover:text-blue-900">
                            View & Update
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ADMIN VIEW */}
        {profile.role === 'admin' && (
          <div className="space-y-8">
            
            {/* Pending Approvals */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
              <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center">Challenges Pending Approval <span className="ml-3 bg-red-100 text-red-800 py-0.5 px-2.5 rounded-full text-sm">{pendingChallenges.length}</span></h2>
              {pendingChallenges.length === 0 ? <p className="text-gray-500">All caught up.</p> : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Title</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Posted By</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Action</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {pendingChallenges.map(c => (
                        <tr key={c.id}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900"><Link to={`/challenge/${c.id}`} className="hover:underline">{c.title}</Link></td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{c.profiles?.full_name}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <button onClick={() => handleApproveChallenge(c.id, true)} className="text-green-600 hover:text-green-900 mr-4"><CheckCircle className="inline w-5 h-5"/></button>
                            <button onClick={() => handleApproveChallenge(c.id, false)} className="text-red-600 hover:text-red-900"><XCircle className="inline w-5 h-5"/></button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Solutions Pending Verification */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
              <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center">Solutions Pending Verification <span className="ml-3 bg-purple-100 text-purple-800 py-0.5 px-2.5 rounded-full text-sm">{pendingSolutions.length}</span></h2>
              {pendingSolutions.length === 0 ? <p className="text-gray-500">No solutions waiting.</p> : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Challenge</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Team</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Summary</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Action</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {pendingSolutions.map(s => (
                        <tr key={s.id}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900"><Link to={`/challenge/${s.challenges?.id}`} className="hover:underline">{s.challenges?.title}</Link></td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{s.teams?.team_name}</td>
                          <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">{s.summary}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <button onClick={() => handleVerifySolution(s.id, s.challenges?.id, true)} className="text-green-600 hover:text-green-900 mr-4"><CheckCircle className="inline w-5 h-5"/></button>
                            <button onClick={() => handleVerifySolution(s.id, s.challenges?.id, false)} className="text-red-600 hover:text-red-900"><XCircle className="inline w-5 h-5"/></button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Solved Challenges (Toggle Feature) */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
              <h2 className="text-xl font-bold text-gray-900 mb-6">Showcase Manager</h2>
              {solvedChallenges.length === 0 ? <p className="text-gray-500">No solved challenges to showcase yet.</p> : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Title</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date Solved</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Featured</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {solvedChallenges.map(c => (
                        <tr key={c.id}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900"><Link to={`/challenge/${c.id}`} className="hover:underline">{c.title}</Link></td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(c.created_at).toLocaleDateString()}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <button onClick={() => handleToggleFeatured(c.id, c.is_featured)} className={`px-3 py-1 rounded-full text-xs font-bold ${c.is_featured ? 'bg-yellow-100 text-yellow-800 border border-yellow-300' : 'bg-gray-100 text-gray-600 border border-gray-200'}`}>
                              <Star className={`inline w-4 h-4 mr-1 ${c.is_featured ? 'fill-current' : ''}`} />
                              {c.is_featured ? 'Featured' : 'Not Featured'}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

          </div>
        )}

      </div>
    </div>
  );
}
