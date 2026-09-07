import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { ThumbsUp, MapPin, AlertCircle, Calendar, Send, CheckCircle } from 'lucide-react';

export default function ChallengeDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  
  const [challenge, setChallenge] = useState(null);
  const [posterProfile, setPosterProfile] = useState(null);
  const [hasUpvoted, setHasUpvoted] = useState(false);
  
  const [comments, setComments] = useState([]);
  const [newCommentText, setNewCommentText] = useState('');
  
  const [teams, setTeams] = useState([]);
  const [progressUpdates, setProgressUpdates] = useState([]);
  const [solutions, setSolutions] = useState([]);
  const [newProgressText, setNewProgressText] = useState('');

  // Modals
  const [showAdoptModal, setShowAdoptModal] = useState(false);
  const [teamName, setTeamName] = useState('');
  const [membersStr, setMembersStr] = useState('');
  const [mentorName, setMentorName] = useState('');
  const [isSponsored, setIsSponsored] = useState(false);

  const [showSolutionModal, setShowSolutionModal] = useState(false);
  const [solutionSummary, setSolutionSummary] = useState('');
  const [demoLink, setDemoLink] = useState('');

  useEffect(() => {
    fetchData();
  }, [id]);

  const fetchData = async () => {
    setLoading(true);
    
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    setUser(user);
    
    if (user) {
      const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
      setUserProfile(profile);
      
      const { data: upvote } = await supabase.from('upvotes').select('id').eq('challenge_id', id).eq('user_id', user.id).single();
      setHasUpvoted(!!upvote);
    }

    // Fetch Challenge
    const { data: challengeData, error: challengeError } = await supabase.from('challenges').select('*').eq('id', id).single();
    if (challengeError) { console.error(challengeError); setLoading(false); return; }
    setChallenge(challengeData);

    // Fetch Poster
    const { data: posterData } = await supabase.from('profiles').select('*').eq('id', challengeData.posted_by).single();
    setPosterProfile(posterData);

    // Fetch Comments
    const { data: commentsData } = await supabase.from('comments').select('*, profiles(full_name)').eq('challenge_id', id).order('created_at', { ascending: true });
    setComments(commentsData || []);

    // Fetch Teams
    const { data: teamsData } = await supabase.from('teams').select('*').eq('challenge_id', id);
    setTeams(teamsData || []);

    // Fetch Progress Updates
    const { data: progressData } = await supabase.from('progress_updates').select('*, profiles(full_name)').eq('challenge_id', id).order('created_at', { ascending: false });
    setProgressUpdates(progressData || []);

    // Fetch Solutions
    const { data: solutionsData } = await supabase.from('solutions').select('*').eq('challenge_id', id);
    setSolutions(solutionsData || []);

    setLoading(false);
  };

  const handleUpvote = async () => {
    if (!user) return alert("Please log in to upvote.");
    if (hasUpvoted) return;

    await supabase.from('upvotes').insert([{ challenge_id: id, user_id: user.id }]);
    await supabase.from('challenges').update({ upvote_count: challenge.upvote_count + 1 }).eq('id', id);
    
    setHasUpvoted(true);
    setChallenge({ ...challenge, upvote_count: challenge.upvote_count + 1 });
  };

  const handlePostComment = async (e) => {
    e.preventDefault();
    if (!newCommentText.trim() || !user) return;

    const newComment = { challenge_id: id, user_id: user.id, text: newCommentText };
    const { data, error } = await supabase.from('comments').insert([newComment]).select('*, profiles(full_name)').single();
    
    if (!error && data) {
      setComments([...comments, data]);
      setNewCommentText('');
    }
  };

  const handleAdoptChallenge = async (e) => {
    e.preventDefault();
    const membersArray = membersStr.split(',').map(s => s.trim()).filter(s => s);
    
    const newTeam = {
      challenge_id: id,
      team_name: teamName,
      institution_name: userProfile?.institution_name || 'Independent',
      created_by: user.id,
      members: membersArray,
      mentor_name: mentorName || null,
      is_sponsored: isSponsored
    };

    const { data, error } = await supabase.from('teams').insert([newTeam]).select('*').single();
    if (error) return alert(error.message);

    setTeams([...teams, data]);
    setShowAdoptModal(false);

    if (challenge.status === 'open') {
      await supabase.from('challenges').update({ status: 'in_progress' }).eq('id', id);
      setChallenge({ ...challenge, status: 'in_progress' });
    }
  };

  const handlePostProgress = async (teamId) => {
    if (!newProgressText.trim() || !user) return;
    
    const { data, error } = await supabase.from('progress_updates').insert([
      { team_id: teamId, challenge_id: id, posted_by: user.id, text: newProgressText }
    ]).select('*, profiles(full_name)').single();

    if (!error && data) {
      setProgressUpdates([data, ...progressUpdates]);
      setNewProgressText('');
    }
  };

  const handleSubmitSolution = async (e, teamId) => {
    e.preventDefault();
    
    const newSolution = {
      challenge_id: id,
      team_id: teamId,
      summary: solutionSummary,
      demo_link: demoLink || null
    };

    const { error } = await supabase.from('solutions').insert([newSolution]);
    if (error) return alert(error.message);

    await supabase.from('challenges').update({ status: 'solution_submitted' }).eq('id', id);
    
    setShowSolutionModal(false);
    fetchData(); // reload all to get updated status and solutions
  };

  const handleVerifySolution = async (solutionId, markSolved) => {
    if (markSolved) {
      await supabase.from('solutions').update({ status: 'verified' }).eq('id', solutionId);
      await supabase.from('challenges').update({ status: 'solved' }).eq('id', id);
    } else {
      await supabase.from('solutions').update({ status: 'rejected' }).eq('id', solutionId);
      await supabase.from('challenges').update({ status: 'in_progress' }).eq('id', id);
    }
    fetchData();
  };

  if (loading) return <div className="text-center py-20 text-gray-500">Loading...</div>;
  if (!challenge) return <div className="text-center py-20 text-red-500">Challenge not found.</div>;

  const canAdopt = userProfile && ['university', 'industry'].includes(userProfile.role) && challenge.status === 'open';
  const myTeam = teams.find(t => t.created_by === user?.id);
  const canVerify = user && (challenge.posted_by === user.id || userProfile?.role === 'admin') && challenge.status === 'solution_submitted';

  const statuses = ['open', 'in_progress', 'solution_submitted', 'solved'];
  const currentStatusIndex = statuses.indexOf(challenge.status);

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8 pb-20">
      <div className="max-w-5xl mx-auto space-y-6">
        
        {/* Header Card */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          {challenge.image_url && (
            <div className="h-64 w-full bg-gray-200">
              <img src={challenge.image_url} alt={challenge.title} className="w-full h-full object-cover" />
            </div>
          )}
          <div className="p-8">
            <div className="flex justify-between items-start mb-4">
              <div className="flex gap-2">
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800 capitalize">
                  {challenge.category}
                </span>
              </div>
              <button 
                onClick={handleUpvote}
                disabled={hasUpvoted}
                className={`flex items-center px-4 py-2 rounded-md font-medium ${hasUpvoted ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
              >
                <ThumbsUp className={`w-5 h-5 mr-2 ${hasUpvoted ? 'fill-current' : ''}`} />
                {challenge.upvote_count} Upvotes
              </button>
            </div>
            
            <h1 className="text-4xl font-extrabold text-gray-900 mb-4">{challenge.title}</h1>
            
            <div className="flex flex-wrap gap-6 text-sm text-gray-600 mb-8 border-b border-gray-100 pb-6">
              <span className="flex items-center"><MapPin className="w-4 h-4 mr-1"/> {challenge.location}</span>
              <span className="flex items-center capitalize"><AlertCircle className="w-4 h-4 mr-1"/> {challenge.severity} Severity</span>
              <span className="flex items-center"><Calendar className="w-4 h-4 mr-1"/> Posted {new Date(challenge.created_at).toLocaleDateString()}</span>
              <span className="flex items-center font-medium">By {posterProfile?.full_name} {posterProfile?.institution_name ? `(${posterProfile.institution_name})` : ''}</span>
            </div>

            {/* Status Timeline */}
            <div className="mb-8">
              <div className="flex items-center justify-between relative">
                <div className="absolute left-0 top-1/2 w-full h-1 bg-gray-200 -z-10"></div>
                <div className="absolute left-0 top-1/2 h-1 bg-blue-600 -z-10 transition-all" style={{ width: `${(Math.max(0, currentStatusIndex) / 3) * 100}%` }}></div>
                
                {['Open', 'In Progress', 'Solution Submitted', 'Solved'].map((step, idx) => (
                  <div key={step} className="flex flex-col items-center">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm border-4 border-white ${idx <= currentStatusIndex ? 'bg-blue-600 text-white' : 'bg-gray-300 text-gray-500'}`}>
                      {idx + 1}
                    </div>
                    <span className="text-xs font-medium mt-2 text-gray-500">{step}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="prose max-w-none text-gray-800">
              <h3 className="text-xl font-bold mb-2">Description</h3>
              <p className="whitespace-pre-wrap">{challenge.description}</p>
            </div>

            {canAdopt && (
              <div className="mt-8 pt-6 border-t border-gray-100 text-center">
                <button onClick={() => setShowAdoptModal(true)} className="px-6 py-3 bg-blue-600 text-white rounded-md font-bold hover:bg-blue-700 shadow-md">
                  Adopt This Challenge
                </button>
              </div>
            )}
            
            {canVerify && (
              <div className="mt-8 pt-6 border-t border-gray-100 bg-purple-50 p-6 rounded-lg border border-purple-100">
                <h3 className="text-lg font-bold text-purple-900 mb-2">Solution Pending Verification</h3>
                <p className="text-sm text-purple-700 mb-4">A team has submitted a solution to your challenge. Please review it and mark as solved if it resolves the issue.</p>
                {solutions.filter(s => s.status === 'submitted').map(sol => (
                  <div key={sol.id} className="bg-white p-4 rounded shadow-sm border border-purple-100 mb-4">
                    <p className="font-bold">Summary: <span className="font-normal">{sol.summary}</span></p>
                    {sol.demo_link && <p className="font-bold mt-2">Demo Link: <a href={sol.demo_link} target="_blank" rel="noreferrer" className="text-blue-600 font-normal">{sol.demo_link}</a></p>}
                    <div className="mt-4 flex gap-3">
                      <button onClick={() => handleVerifySolution(sol.id, true)} className="px-4 py-2 bg-green-600 text-white rounded font-medium hover:bg-green-700"><CheckCircle className="w-4 h-4 inline mr-1"/> Verify & Mark Solved</button>
                      <button onClick={() => handleVerifySolution(sol.id, false)} className="px-4 py-2 bg-red-100 text-red-700 rounded font-medium hover:bg-red-200">Reject</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Two Column Layout for the rest */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Left Column: Comments */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Comments</h3>
              
              <div className="space-y-4 max-h-96 overflow-y-auto mb-4">
                {comments.length === 0 ? (
                  <p className="text-sm text-gray-500 italic">No comments yet. Be the first!</p>
                ) : (
                  comments.map(c => (
                    <div key={c.id} className="bg-gray-50 p-3 rounded-lg text-sm">
                      <div className="font-semibold text-gray-800 mb-1">{c.profiles?.full_name}</div>
                      <div className="text-gray-700">{c.text}</div>
                    </div>
                  ))
                )}
              </div>

              {user ? (
                <form onSubmit={handlePostComment} className="flex gap-2">
                  <input
                    type="text"
                    value={newCommentText}
                    onChange={(e) => setNewCommentText(e.target.value)}
                    placeholder="Add a comment..."
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:border-blue-500"
                  />
                  <button type="submit" className="p-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
                    <Send className="w-4 h-4" />
                  </button>
                </form>
              ) : (
                <p className="text-sm text-gray-500 text-center">Log in to comment.</p>
              )}
            </div>
          </div>

          {/* Right Column: Teams & Progress */}
          <div className="lg:col-span-2 space-y-6">
            {teams.length > 0 ? (
              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <h3 className="text-lg font-bold text-gray-900 mb-4">Teams Working On This</h3>
                <div className="space-y-6">
                  {teams.map(team => {
                    const tUpdates = progressUpdates.filter(pu => pu.team_id === team.id);
                    const isMyTeam = team.created_by === user?.id;
                    const hasSubmitted = solutions.some(s => s.team_id === team.id);

                    return (
                      <div key={team.id} className="border border-gray-200 rounded-lg p-5">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <h4 className="text-md font-bold text-gray-900 flex items-center">
                              {team.team_name} 
                              <span className="ml-2 text-xs font-normal bg-gray-100 px-2 py-0.5 rounded text-gray-600">{team.institution_name}</span>
                              {team.is_sponsored && <span className="ml-2 text-xs font-medium bg-amber-100 text-amber-800 px-2 py-0.5 rounded">Sponsored</span>}
                            </h4>
                            <p className="text-xs text-gray-500 mt-1">Members: {team.members.join(', ')}</p>
                          </div>
                          {isMyTeam && challenge.status !== 'solved' && !hasSubmitted && (
                            <button onClick={() => setShowSolutionModal(true)} className="px-3 py-1.5 bg-green-600 text-white text-xs font-bold rounded hover:bg-green-700">
                              Submit Final Solution
                            </button>
                          )}
                        </div>

                        {/* Progress Feed for this team */}
                        <div className="mt-4 bg-gray-50 rounded-lg p-4 border border-gray-100">
                          <h5 className="text-xs font-bold text-gray-500 uppercase mb-3">Progress Updates</h5>
                          
                          <div className="space-y-3 mb-4 max-h-64 overflow-y-auto pr-2">
                            {tUpdates.length === 0 ? <p className="text-sm text-gray-400 italic">No updates yet.</p> : tUpdates.map(pu => (
                              <div key={pu.id} className="bg-white p-3 rounded shadow-sm border border-gray-100 text-sm">
                                <span className="font-semibold text-gray-700 mr-2">{pu.profiles?.full_name}:</span>
                                <span className="text-gray-600">{pu.text}</span>
                              </div>
                            ))}
                          </div>

                          {isMyTeam && challenge.status !== 'solved' && !hasSubmitted && (
                            <div className="flex gap-2">
                              <input
                                type="text"
                                value={newProgressText}
                                onChange={(e) => setNewProgressText(e.target.value)}
                                placeholder="Share an update..."
                                className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:border-blue-500"
                              />
                              <button onClick={() => handlePostProgress(team.id)} className="px-4 py-2 bg-gray-800 text-white text-sm font-medium rounded-md hover:bg-gray-900">
                                Post
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="bg-white p-10 rounded-xl shadow-sm border border-gray-100 text-center">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <AlertCircle className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">No teams yet</h3>
                <p className="text-gray-500 mb-6">This challenge is waiting to be adopted.</p>
                {canAdopt && (
                  <button onClick={() => setShowAdoptModal(true)} className="px-6 py-2 bg-blue-600 text-white rounded-md font-bold hover:bg-blue-700 shadow-sm">
                    Adopt It First
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Adopt Modal */}
      {showAdoptModal && (
        <div className="fixed inset-0 bg-black/50 bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <h2 className="text-2xl font-bold mb-4">Adopt Challenge</h2>
            <form onSubmit={handleAdoptChallenge} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Team Name</label>
                <input required type="text" value={teamName} onChange={e => setTeamName(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Team Members (comma separated names)</label>
                <input required type="text" value={membersStr} onChange={e => setMembersStr(e.target.value)} placeholder="Alice, Bob, Charlie" className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md" />
              </div>
              {userProfile?.role === 'industry' && (
                <>
                  <div className="flex items-center mt-4">
                    <input type="checkbox" id="sponsored" checked={isSponsored} onChange={e => setIsSponsored(e.target.checked)} className="h-4 w-4 text-blue-600 rounded" />
                    <label htmlFor="sponsored" className="ml-2 block text-sm text-gray-900">Mark as Sponsored</label>
                  </div>
                  {isSponsored && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Mentor Name</label>
                      <input type="text" value={mentorName} onChange={e => setMentorName(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md" />
                    </div>
                  )}
                </>
              )}
              <div className="mt-6 flex gap-3 justify-end">
                <button type="button" onClick={() => setShowAdoptModal(false)} className="px-4 py-2 border border-gray-300 rounded-md text-gray-700">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">Create Team</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Submit Solution Modal */}
      {showSolutionModal && (
        <div className="fixed inset-0 bg-black/50 bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6">
            <h2 className="text-2xl font-bold mb-4">Submit Final Solution</h2>
            <form onSubmit={(e) => handleSubmitSolution(e, myTeam.id)} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Solution Summary</label>
                <textarea required rows={4} value={solutionSummary} onChange={e => setSolutionSummary(e.target.value)} placeholder="Describe how your team solved this challenge..." className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"></textarea>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Demo Link (Optional)</label>
                <input type="url" value={demoLink} onChange={e => setDemoLink(e.target.value)} placeholder="https://..." className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md" />
              </div>
              <div className="mt-6 flex gap-3 justify-end">
                <button type="button" onClick={() => setShowSolutionModal(false)} className="px-4 py-2 border border-gray-300 rounded-md text-gray-700">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700">Submit Solution</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
