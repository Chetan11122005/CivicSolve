import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { ThumbsUp, MapPin, AlertCircle, Calendar, Send, CheckCircle, Clock, Check, Users, Mail, ExternalLink, Trophy } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

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
  const [contactEmail, setContactEmail] = useState('');

  useEffect(() => {
    fetchData();
  }, [id]);

  const fetchData = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    setUser(user);
    
    if (user) {
      const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
      setUserProfile(profile);
      const { data: upvote } = await supabase.from('upvotes').select('id').eq('challenge_id', id).eq('user_id', user.id).single();
      setHasUpvoted(!!upvote);
    }

    const { data: challengeData, error: challengeError } = await supabase.from('challenges').select('*').eq('id', id).single();
    if (challengeError) { console.error(challengeError); setLoading(false); return; }
    setChallenge(challengeData);

    const { data: posterData } = await supabase.from('profiles').select('*').eq('id', challengeData.posted_by).single();
    setPosterProfile(posterData);

    const { data: commentsData } = await supabase.from('comments').select('*, profiles(full_name)').eq('challenge_id', id).order('created_at', { ascending: true });
    setComments(commentsData || []);

    const { data: teamsData } = await supabase.from('teams').select('*').eq('challenge_id', id);
    setTeams(teamsData || []);

    const { data: progressData } = await supabase.from('progress_updates').select('*, profiles(full_name)').eq('challenge_id', id).order('created_at', { ascending: false });
    setProgressUpdates(progressData || []);

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
    const { data, error } = await supabase.from('comments').insert([{ challenge_id: id, user_id: user.id, text: newCommentText }]).select('*, profiles(full_name)').single();
    if (!error && data) {
      setComments([...comments, data]);
      setNewCommentText('');
    }
  };

  const handleAdoptChallenge = async (e) => {
    e.preventDefault();
    const membersArray = membersStr.split(',').map(s => s.trim()).filter(s => s);
    const newTeam = { challenge_id: id, team_name: teamName, institution_name: userProfile?.institution_name || 'Independent', created_by: user.id, members: membersArray, mentor_name: mentorName || null, is_sponsored: isSponsored };
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
    const { data, error } = await supabase.from('progress_updates').insert([{ team_id: teamId, challenge_id: id, posted_by: user.id, text: newProgressText }]).select('*, profiles(full_name)').single();
    if (!error && data) {
      setProgressUpdates([data, ...progressUpdates]);
      setNewProgressText('');
    }
  };

  const handleSubmitSolution = async (e, teamId) => {
    e.preventDefault();
    const { error } = await supabase.from('solutions').insert([{ challenge_id: id, team_id: teamId, summary: solutionSummary, demo_link: demoLink || null, contact_email: contactEmail || null }]);
    if (error) return alert(error.message);
    await supabase.from('challenges').update({ status: 'solution_submitted' }).eq('id', id);
    setShowSolutionModal(false);
    fetchData();
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

  if (loading) return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
    </div>
  );
  if (!challenge) return <div className="text-center py-20 text-red-500 font-medium">Challenge not found.</div>;

  const canAdopt = userProfile && ['university', 'industry'].includes(userProfile.role) && challenge.status === 'open';
  const myTeam = teams.find(t => t.created_by === user?.id);
  const canVerify = user && (challenge.posted_by === user.id || userProfile?.role === 'admin') && challenge.status === 'solution_submitted';
  
  const verifiedSolution = solutions.find(s => s.status === 'verified');

  const statusSteps = [
    { id: 'open', label: 'Open', icon: Clock },
    { id: 'in_progress', label: 'In Progress', icon: Users },
    { id: 'solution_submitted', label: 'Solution Submitted', icon: Send },
    { id: 'solved', label: 'Solved', icon: CheckCircle }
  ];
  
  const currentStatusIndex = statusSteps.findIndex(s => s.id === challenge.status);

  return (
    <div className="min-h-[calc(100vh-64px)] bg-gray-50 dark:bg-gray-950 py-8 px-4 sm:px-6 lg:px-8 pb-20 transition-colors">
      <div className="max-w-6xl mx-auto flex flex-col lg:flex-row gap-8">
        
        {/* Main Content */}
        <div className="flex-1 space-y-6">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden"
          >
            {challenge.image_url && (
              <div className="h-72 w-full bg-gray-200 dark:bg-gray-800 relative">
                <img src={challenge.image_url} alt={challenge.title} className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
              </div>
            )}
            
            <div className={`p-8 ${challenge.image_url ? '-mt-16 relative z-10' : ''}`}>
              {challenge.image_url && (
                 <div className="flex justify-between items-end mb-6">
                    <span className="inline-flex items-center px-3 py-1 rounded-lg text-sm font-bold bg-blue-600 text-white capitalize shadow-sm">
                      {challenge.category}
                    </span>
                 </div>
              )}

              {!challenge.image_url && (
                <div className="flex justify-between items-start mb-6">
                  <span className="inline-flex items-center px-3 py-1 rounded-lg text-sm font-bold bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-200 capitalize">
                    {challenge.category}
                  </span>
                </div>
              )}
              
              <h1 className={`text-3xl sm:text-4xl font-extrabold mb-4 ${challenge.image_url ? 'text-white' : 'text-gray-900 dark:text-white'}`}>
                {challenge.title}
              </h1>
              
              <div className="flex flex-wrap gap-4 text-sm font-medium text-gray-600 dark:text-gray-300 mb-8 pb-6 border-b border-gray-100 dark:border-gray-800">
                <span className="flex items-center bg-gray-100 dark:bg-gray-800 px-3 py-1.5 rounded-lg"><MapPin className="w-4 h-4 mr-2"/> {challenge.location}</span>
                <span className="flex items-center capitalize bg-gray-100 dark:bg-gray-800 px-3 py-1.5 rounded-lg">
                  <AlertCircle className={`w-4 h-4 mr-2 ${challenge.severity === 'high' ? 'text-red-500' : challenge.severity === 'medium' ? 'text-amber-500' : 'text-green-500'}`}/> 
                  {challenge.severity} Severity
                </span>
                <span className="flex items-center bg-gray-100 dark:bg-gray-800 px-3 py-1.5 rounded-lg"><Calendar className="w-4 h-4 mr-2"/> {new Date(challenge.created_at).toLocaleDateString()}</span>
                <span className="flex items-center bg-gray-100 dark:bg-gray-800 px-3 py-1.5 rounded-lg">By {posterProfile?.full_name} {posterProfile?.institution_name ? `(${posterProfile.institution_name})` : ''}</span>
              </div>

              <div className="prose dark:prose-invert max-w-none mb-8">
                <h3 className="text-xl font-bold mb-3 text-gray-900 dark:text-white">Description</h3>
                <p className="whitespace-pre-wrap text-gray-700 dark:text-gray-300 leading-relaxed text-lg">{challenge.description}</p>
              </div>

              {/* Show Winning Solution if it exists */}
              {verifiedSolution && (
                <div className="mt-8 mb-4 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border border-green-200 dark:border-green-800/50 rounded-2xl p-6 shadow-sm">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="bg-green-100 dark:bg-green-800 text-green-700 dark:text-green-300 p-2 rounded-xl">
                      <Trophy className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-xl font-extrabold text-green-900 dark:text-green-400">Winning Solution</h3>
                      <p className="text-sm font-bold text-green-700 dark:text-green-500">
                        By {teams.find(t => t.id === verifiedSolution.team_id)?.team_name || 'A team'}
                      </p>
                    </div>
                  </div>
                  
                  <div className="bg-white/60 dark:bg-gray-900/60 p-5 rounded-xl text-gray-800 dark:text-gray-200 mb-6 leading-relaxed">
                    {verifiedSolution.summary}
                  </div>
                  
                  <div className="flex flex-wrap gap-4">
                    {verifiedSolution.demo_link && (
                      <a href={verifiedSolution.demo_link} target="_blank" rel="noreferrer" className="inline-flex items-center px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-lg font-bold hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors shadow-sm">
                        <ExternalLink className="w-4 h-4 mr-2" /> View Demo
                      </a>
                    )}
                    {verifiedSolution.contact_email && (
                      <a href={`mailto:${verifiedSolution.contact_email}`} className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 transition-colors shadow-sm">
                        <Mail className="w-4 h-4 mr-2" /> Contact Team
                      </a>
                    )}
                  </div>
                </div>
              )}

              <div className="mt-8 pt-6 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between">
                <button 
                  onClick={handleUpvote}
                  disabled={hasUpvoted}
                  className={`flex items-center px-5 py-2.5 rounded-xl font-bold transition-all shadow-sm ${hasUpvoted ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800/50' : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'}`}
                >
                  <ThumbsUp className={`w-5 h-5 mr-2 ${hasUpvoted ? 'fill-current' : ''}`} />
                  {challenge.upvote_count} Upvotes
                </button>

                {canAdopt && (
                  <button onClick={() => setShowAdoptModal(true)} className="px-6 py-2.5 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 shadow-md shadow-blue-600/20 transition-all">
                    Adopt Challenge
                  </button>
                )}
              </div>
            </div>
          </motion.div>

          {/* Verification Panel */}
          <AnimatePresence>
            {canVerify && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                className="bg-purple-50 dark:bg-purple-900/20 rounded-2xl p-6 border border-purple-100 dark:border-purple-800/50 shadow-sm overflow-hidden"
              >
                <h3 className="text-lg font-bold text-purple-900 dark:text-purple-300 mb-2 flex items-center">
                  <CheckCircle className="w-5 h-5 mr-2" /> Solution Pending Verification
                </h3>
                <p className="text-sm text-purple-700 dark:text-purple-400 mb-4">A team has submitted a solution. Review it and mark as solved if it resolves the issue.</p>
                {solutions.filter(s => s.status === 'submitted').map(sol => (
                  <div key={sol.id} className="bg-white dark:bg-gray-900 p-5 rounded-xl shadow-sm border border-purple-100 dark:border-purple-800/50 mb-4">
                    <p className="font-bold text-gray-900 dark:text-white mb-2">Summary: <span className="font-normal text-gray-700 dark:text-gray-300 block mt-1">{sol.summary}</span></p>
                    {sol.demo_link && <p className="font-bold text-gray-900 dark:text-white mt-4">Demo Link: <a href={sol.demo_link} target="_blank" rel="noreferrer" className="text-blue-600 dark:text-blue-400 font-normal hover:underline">{sol.demo_link}</a></p>}
                    {sol.contact_email && <p className="font-bold text-gray-900 dark:text-white mt-4">Contact Email: <a href={`mailto:${sol.contact_email}`} className="text-blue-600 dark:text-blue-400 font-normal hover:underline">{sol.contact_email}</a></p>}
                    <div className="mt-5 flex gap-3">
                      <button onClick={() => handleVerifySolution(sol.id, true)} className="px-5 py-2.5 bg-green-600 text-white rounded-lg font-bold hover:bg-green-700 transition-colors flex items-center"><Check className="w-4 h-4 mr-2"/> Verify & Solved</button>
                      <button onClick={() => handleVerifySolution(sol.id, false)} className="px-5 py-2.5 bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-lg font-bold hover:bg-red-100 dark:hover:bg-red-900/50 transition-colors">Reject</button>
                    </div>
                  </div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Teams & Progress */}
          {teams.length > 0 && (
            <div className="bg-white dark:bg-gray-900 p-8 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6">Teams Working On This</h3>
              <div className="space-y-6">
                {teams.map(team => {
                  const tUpdates = progressUpdates.filter(pu => pu.team_id === team.id);
                  const isMyTeam = team.created_by === user?.id;
                  const hasSubmitted = solutions.some(s => s.team_id === team.id);

                  return (
                    <div key={team.id} className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
                      <div className="bg-gray-50 dark:bg-gray-800/50 p-5 flex justify-between items-start border-b border-gray-200 dark:border-gray-700">
                        <div>
                          <h4 className="text-lg font-bold text-gray-900 dark:text-white flex items-center flex-wrap gap-2">
                            {team.team_name} 
                            <span className="text-xs font-bold bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 px-2.5 py-1 rounded-md text-gray-600 dark:text-gray-300 shadow-sm">{team.institution_name}</span>
                            {team.is_sponsored && <span className="text-xs font-bold bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-400 border border-amber-200 dark:border-amber-800/50 px-2.5 py-1 rounded-md shadow-sm">Sponsored</span>}
                          </h4>
                          <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mt-2 flex items-center"><Users className="w-4 h-4 mr-1.5"/> {team.members.join(', ')}</p>
                        </div>
                        {isMyTeam && challenge.status !== 'solved' && !hasSubmitted && (
                          <button onClick={() => setShowSolutionModal(true)} className="px-4 py-2 bg-green-600 text-white text-sm font-bold rounded-lg hover:bg-green-700 shadow-sm transition-colors">
                            Submit Solution
                          </button>
                        )}
                      </div>

                      <div className="p-5 bg-white dark:bg-gray-900">
                        <h5 className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-4">Progress Feed</h5>
                        
                        <div className="space-y-4 mb-5 max-h-80 overflow-y-auto pr-2 custom-scrollbar">
                          {tUpdates.length === 0 ? <p className="text-sm text-gray-400 dark:text-gray-500 italic">No updates posted yet.</p> : tUpdates.map(pu => (
                            <div key={pu.id} className="bg-gray-50 dark:bg-gray-800 p-4 rounded-xl text-sm border border-gray-100 dark:border-gray-700/50 relative">
                              <div className="flex items-center gap-2 mb-1">
                                <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 flex items-center justify-center font-bold text-xs">
                                  {pu.profiles?.full_name?.charAt(0)}
                                </div>
                                <span className="font-bold text-gray-900 dark:text-white">{pu.profiles?.full_name}</span>
                                <span className="text-xs text-gray-400 dark:text-gray-500 ml-auto">{new Date(pu.created_at).toLocaleDateString()}</span>
                              </div>
                              <p className="text-gray-700 dark:text-gray-300 mt-2 leading-relaxed ml-8">{pu.text}</p>
                            </div>
                          ))}
                        </div>

                        {isMyTeam && challenge.status !== 'solved' && !hasSubmitted && (
                          <div className="flex gap-3">
                            <input
                              type="text"
                              value={newProgressText}
                              onChange={(e) => setNewProgressText(e.target.value)}
                              placeholder="Share a quick update with everyone..."
                              className="flex-1 px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white transition-all"
                            />
                            <button onClick={() => handlePostProgress(team.id)} className="px-5 py-2.5 bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-sm font-bold rounded-lg hover:bg-gray-800 dark:hover:bg-gray-100 shadow-sm transition-colors">
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
          )}
        </div>

        {/* Sidebar */}
        <div className="w-full lg:w-80 flex-shrink-0 space-y-6">
          
          {/* Vertical Status Timeline */}
          <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 sticky top-24">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-6">Status Tracker</h3>
            <div className="space-y-6 relative">
              <div className="absolute left-3.5 top-2 bottom-4 w-0.5 bg-gray-200 dark:bg-gray-800"></div>
              {statusSteps.map((step, idx) => {
                const Icon = step.icon;
                const isCompleted = idx <= currentStatusIndex;
                const isCurrent = idx === currentStatusIndex;
                
                return (
                  <div key={step.id} className="relative flex items-center gap-4 z-10">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center border-2 shadow-sm transition-colors ${isCompleted ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-700 text-gray-400'}`}>
                      {isCompleted ? <Check className="w-3.5 h-3.5" /> : <Icon className="w-3.5 h-3.5" />}
                    </div>
                    <span className={`font-bold text-sm ${isCurrent ? 'text-blue-600 dark:text-blue-400' : isCompleted ? 'text-gray-900 dark:text-gray-300' : 'text-gray-400 dark:text-gray-600'}`}>
                      {step.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Chat-like Comments */}
          <div className="bg-white dark:bg-gray-900 flex flex-col h-[500px] rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800">
            <div className="p-4 border-b border-gray-100 dark:border-gray-800">
              <h3 className="font-bold text-gray-900 dark:text-white">Discussion</h3>
            </div>
            
            <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-gray-50 dark:bg-gray-900/50 custom-scrollbar">
              {comments.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-gray-400 dark:text-gray-500">
                  <Send className="w-8 h-8 mb-2 opacity-50" />
                  <p className="text-sm font-medium">Start the conversation</p>
                </div>
              ) : (
                comments.map(c => {
                  const isMe = user && c.user_id === user.id;
                  return (
                    <div key={c.id} className={`flex flex-col max-w-[85%] ${isMe ? 'ml-auto items-end' : 'mr-auto items-start'}`}>
                      <span className="text-[10px] font-bold text-gray-500 dark:text-gray-400 mb-1 px-1">{isMe ? 'You' : c.profiles?.full_name}</span>
                      <div className={`px-4 py-2.5 rounded-2xl text-sm shadow-sm ${isMe ? 'bg-blue-600 text-white rounded-br-sm' : 'bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 text-gray-800 dark:text-gray-200 rounded-bl-sm'}`}>
                        {c.text}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="p-4 bg-white dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800">
              {user ? (
                <form onSubmit={handlePostComment} className="flex items-center gap-2 relative">
                  <input
                    type="text"
                    value={newCommentText}
                    onChange={(e) => setNewCommentText(e.target.value)}
                    placeholder="Type a message..."
                    className="flex-1 pl-4 pr-10 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white transition-all"
                  />
                  <button type="submit" disabled={!newCommentText.trim()} className="absolute right-1.5 p-1.5 bg-blue-600 text-white rounded-full hover:bg-blue-700 disabled:opacity-50 transition-colors">
                    <Send className="w-4 h-4 translate-x-px -translate-y-px" />
                  </button>
                </form>
              ) : (
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400 text-center py-2">Log in to join discussion.</p>
              )}
            </div>
          </div>
        </div>

      </div>

      {/* Animated Modals */}
      <AnimatePresence>
        {showAdoptModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowAdoptModal(false)} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="relative bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-md w-full p-8 border border-gray-100 dark:border-gray-800">
              <h2 className="text-2xl font-extrabold mb-6 text-gray-900 dark:text-white">Adopt Challenge</h2>
              <form onSubmit={handleAdoptChallenge} className="space-y-5">
                <div>
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1.5">Team Name</label>
                  <input required type="text" value={teamName} onChange={e => setTeamName(e.target.value)} className="block w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 dark:text-white transition-all" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1.5">Members (comma separated)</label>
                  <input required type="text" value={membersStr} onChange={e => setMembersStr(e.target.value)} placeholder="Alice, Bob..." className="block w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 dark:text-white transition-all" />
                </div>
                {userProfile?.role === 'industry' && (
                  <>
                    <label className="flex items-center p-4 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg cursor-pointer">
                      <input type="checkbox" checked={isSponsored} onChange={e => setIsSponsored(e.target.checked)} className="h-4 w-4 text-blue-600 rounded focus:ring-blue-500 bg-white border-gray-300" />
                      <span className="ml-3 font-bold text-sm text-gray-900 dark:text-white">Mark as Sponsored</span>
                    </label>
                    <AnimatePresence>
                      {isSponsored && (
                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                          <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1.5 mt-2">Mentor Name</label>
                          <input type="text" value={mentorName} onChange={e => setMentorName(e.target.value)} className="block w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 dark:text-white transition-all" />
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </>
                )}
                <div className="mt-8 flex gap-3 justify-end">
                  <button type="button" onClick={() => setShowAdoptModal(false)} className="px-5 py-2.5 font-bold rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">Cancel</button>
                  <button type="submit" className="px-5 py-2.5 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 transition-colors shadow-md shadow-blue-600/20">Create Team</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}

        {showSolutionModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowSolutionModal(false)} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="relative bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-lg w-full p-8 border border-gray-100 dark:border-gray-800">
              <h2 className="text-2xl font-extrabold mb-6 text-gray-900 dark:text-white">Submit Final Solution</h2>
              <form onSubmit={(e) => handleSubmitSolution(e, myTeam.id)} className="space-y-5">
                <div>
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1.5">Solution Summary</label>
                  <textarea required rows={5} value={solutionSummary} onChange={e => setSolutionSummary(e.target.value)} placeholder="Describe your solution in detail..." className="block w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 dark:text-white transition-all resize-none"></textarea>
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1.5">Demo Link (Optional)</label>
                  <input type="url" value={demoLink} onChange={e => setDemoLink(e.target.value)} placeholder="https://github.com/..." className="block w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 dark:text-white transition-all" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1.5 flex justify-between">
                    <span>Contact Email</span>
                    <span className="text-blue-500 font-normal text-xs">For investors / partners</span>
                  </label>
                  <input required type="email" value={contactEmail} onChange={e => setContactEmail(e.target.value)} placeholder="team@example.com" className="block w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 dark:text-white transition-all" />
                </div>
                <div className="mt-8 flex gap-3 justify-end">
                  <button type="button" onClick={() => setShowSolutionModal(false)} className="px-5 py-2.5 font-bold rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">Cancel</button>
                  <button type="submit" className="px-5 py-2.5 bg-green-600 text-white rounded-lg font-bold hover:bg-green-700 transition-colors shadow-md shadow-green-600/20">Submit Solution</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
