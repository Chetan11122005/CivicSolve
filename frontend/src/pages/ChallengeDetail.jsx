import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { 
  ThumbsUp, 
  MapPin, 
  AlertCircle, 
  Calendar, 
  Send, 
  CheckCircle, 
  Clock, 
  Check, 
  Users, 
  Gift, 
  Layers, 
  ShieldCheck,
  Activity,
  CheckCircle2,
  FileCode2,
  Rocket
} from 'lucide-react';
import { motion } from 'framer-motion';
import AdoptChallengeModal from '../components/AdoptChallengeModal';
import MilestoneTracker from '../components/MilestoneTracker';
import CitizenVerificationModal from '../components/CitizenVerificationModal';
import BeforeAfterSlider from '../components/BeforeAfterSlider';

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
  const [selectedTeamIndex, setSelectedTeamIndex] = useState(0);
  const [progressUpdates, setProgressUpdates] = useState([]);
  const [solutions, setSolutions] = useState([]);
  const [verificationFeedback, setVerificationFeedback] = useState(null);
  const [newProgressText, setNewProgressText] = useState('');

  // Modals
  const [showAdoptModal, setShowAdoptModal] = useState(false);
  const [showVerifyModal, setShowVerifyModal] = useState(false);
  const [showSolutionModal, setShowSolutionModal] = useState(false);
  const [solutionSummary, setSolutionSummary] = useState('');
  const [demoLink, setDemoLink] = useState('');
  const [contactEmail, setContactEmail] = useState('');

  // Industry Sponsor Modal
  const [showSponsorModal, setShowSponsorModal] = useState(false);
  const [sponsorOrg, setSponsorOrg] = useState('');
  const [sponsorType, setSponsorType] = useState('Financial Grant / Bounty');
  const [grantAmount, setGrantAmount] = useState('');
  const [sponsorMentor, setSponsorMentor] = useState('');
  const [sponsorEmail, setSponsorEmail] = useState('');
  const [sponsorNotes, setSponsorNotes] = useState('');
  const [sponsorLoading, setSponsorLoading] = useState(false);

  // Active Tab for Team Details
  const [activeTeamTab, setActiveTeamTab] = useState('milestones'); // 'milestones' | 'blueprint' | 'feed'

  useEffect(() => {
    fetchData();
  }, [id]);

  const fetchData = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    setUser(user);
    
    if (user) {
      const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle();
      setUserProfile(profile);
      if (profile) {
        setSponsorOrg(profile.institution_name || profile.full_name || '');
        setSponsorMentor(profile.full_name || '');
        setSponsorEmail(user.email || '');
      }
      const { data: upvote } = await supabase.from('upvotes').select('id').eq('challenge_id', id).eq('user_id', user.id).maybeSingle();
      setHasUpvoted(!!upvote);
    }

    const { data: challengeData, error: challengeError } = await supabase.from('challenges').select('*').eq('id', id).single();
    if (challengeError) { console.error(challengeError); setLoading(false); return; }
    setChallenge(challengeData);

    const { data: posterData } = await supabase.from('profiles').select('*').eq('id', challengeData.posted_by).maybeSingle();
    setPosterProfile(posterData);

    const { data: commentsData } = await supabase.from('comments').select('*, profiles(full_name)').eq('challenge_id', id).order('created_at', { ascending: true });
    setComments(commentsData || []);

    const { data: teamsData } = await supabase.from('teams').select('*').eq('challenge_id', id);
    setTeams(teamsData || []);

    const { data: progressData } = await supabase.from('progress_updates').select('*, profiles(full_name)').eq('challenge_id', id).order('created_at', { ascending: false });
    setProgressUpdates(progressData || []);

    const { data: solutionsData } = await supabase.from('solutions').select('*').eq('challenge_id', id);
    setSolutions(solutionsData || []);

    const { data: feedbackData } = await supabase.from('verification_feedback').select('*').eq('challenge_id', id).order('created_at', { ascending: false }).maybeSingle();
    setVerificationFeedback(feedbackData);

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

  const handleSponsorChallenge = async (e) => {
    e.preventDefault();
    setSponsorLoading(true);
    try {
      const orgName = sponsorOrg.trim() || userProfile?.institution_name || userProfile?.full_name || 'Industry Partner';
      const pledgeDetails = grantAmount.trim() ? `${sponsorType} (${grantAmount.trim()})` : sponsorType;
      const notes = [
        pledgeDetails,
        sponsorEmail ? `Contact: ${sponsorEmail}` : '',
        sponsorNotes ? `Guidance: ${sponsorNotes}` : ''
      ].filter(Boolean);

      const newSponsoredEntry = {
        challenge_id: id,
        team_name: `${orgName} (Sponsor & Mentor)`,
        institution_name: orgName,
        created_by: user.id,
        members: notes,
        mentor_name: sponsorMentor || orgName,
        is_sponsored: true
      };

      const { data, error } = await supabase.from('teams').insert([newSponsoredEntry]).select('*').single();
      if (error) throw error;

      await supabase.from('comments').insert([{
        challenge_id: id,
        user_id: user.id,
        text: `🏆 [Official Sponsorship] ${orgName} has sponsored this challenge with ${pledgeDetails}! Mentor: ${sponsorMentor || 'Industry Partner'}`
      }]);

      setTeams([...teams, data]);
      setShowSponsorModal(false);
      fetchData();
    } catch (err) {
      console.error('Error sponsoring challenge:', err);
      alert(err.message || 'Could not sponsor challenge.');
    } finally {
      setSponsorLoading(false);
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
    const { error } = await supabase.from('solutions').insert([{ 
      challenge_id: id, 
      team_id: teamId, 
      summary: solutionSummary, 
      demo_link: demoLink || null, 
      contact_email: contactEmail || null,
      status: 'submitted'
    }]);
    if (error) return alert(error.message);
    await supabase.from('challenges').update({ status: 'solution_submitted' }).eq('id', id);
    setShowSolutionModal(false);
    fetchData();
  };

  if (loading) return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
    </div>
  );
  if (!challenge) return <div className="text-center py-20 text-red-500 font-medium">Challenge not found.</div>;

  const canAdopt = userProfile && ['university', 'industry', 'citizen'].includes(userProfile.role) && challenge.status !== 'solved';
  const myTeam = teams.find(t => t.created_by === user?.id);
  const canVerify = user && (challenge.posted_by === user.id || userProfile?.role === 'admin') && challenge.status === 'solution_submitted';
  
  const verifiedSolution = solutions.find(s => s.status === 'verified');
  const activeTeam = teams[selectedTeamIndex] || teams[0];

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
            className="bg-white dark:bg-gray-900 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden"
          >
            {challenge.image_url && (
              <div className="h-72 w-full bg-gray-200 dark:bg-gray-800 relative">
                <img src={challenge.image_url} alt={challenge.title} className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent"></div>
              </div>
            )}
            
            <div className={`p-8 ${challenge.image_url ? '-mt-16 relative z-10' : ''}`}>
              <div className="flex justify-between items-start mb-4">
                <span className="inline-flex items-center px-3.5 py-1.5 rounded-xl text-xs font-extrabold bg-blue-600 text-white capitalize shadow-md">
                  {challenge.category}
                </span>
                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold capitalize ${
                  challenge.status === 'solved'
                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                    : challenge.status === 'in_progress'
                    ? 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300'
                    : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                }`}>
                  <span className="w-2 h-2 rounded-full bg-current"></span>
                  {challenge.status.replace('_', ' ')}
                </span>
              </div>
              
              <h1 className={`text-3xl sm:text-4xl font-extrabold mb-4 leading-tight ${challenge.image_url ? 'text-white' : 'text-gray-900 dark:text-white'}`}>
                {challenge.title}
              </h1>
              
              <div className="flex flex-wrap gap-3 text-xs font-semibold text-gray-600 dark:text-gray-300 mb-8 pb-6 border-b border-gray-100 dark:border-gray-800">
                <span className="flex items-center bg-gray-100 dark:bg-gray-800 px-3 py-1.5 rounded-lg"><MapPin className="w-4 h-4 mr-1.5 text-blue-500"/> {challenge.location}</span>
                <span className="flex items-center capitalize bg-gray-100 dark:bg-gray-800 px-3 py-1.5 rounded-lg">
                  <AlertCircle className={`w-4 h-4 mr-1.5 ${challenge.severity === 'high' ? 'text-red-500' : challenge.severity === 'medium' ? 'text-amber-500' : 'text-green-500'}`}/> 
                  {challenge.severity} Severity
                </span>
                <span className="flex items-center bg-gray-100 dark:bg-gray-800 px-3 py-1.5 rounded-lg"><Calendar className="w-4 h-4 mr-1.5 text-gray-400"/> {new Date(challenge.created_at).toLocaleDateString()}</span>
                <span className="flex items-center bg-gray-100 dark:bg-gray-800 px-3 py-1.5 rounded-lg">Reported by {posterProfile?.full_name || 'Citizen'}</span>
              </div>

              <div className="prose dark:prose-invert max-w-none mb-8">
                <h3 className="text-xl font-bold mb-3 text-gray-900 dark:text-white">Community Problem Description</h3>
                <p className="whitespace-pre-wrap text-gray-700 dark:text-gray-300 leading-relaxed text-base">{challenge.description}</p>
              </div>

              {/* Action Buttons: Upvote & Adopt / Sponsor */}
              <div className="pt-6 border-t border-gray-100 dark:border-gray-800 flex flex-wrap items-center justify-between gap-4">
                <button 
                  onClick={handleUpvote}
                  disabled={hasUpvoted}
                  className={`flex items-center px-5 py-2.5 rounded-xl font-bold text-sm transition-all shadow-xs ${
                    hasUpvoted 
                      ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800/50' 
                      : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'
                  }`}
                >
                  <ThumbsUp className={`w-4 h-4 mr-2 ${hasUpvoted ? 'fill-current' : ''}`} />
                  {challenge.upvote_count} Upvotes
                </button>

                <div className="flex flex-wrap items-center gap-3">
                  {userProfile?.role === 'industry' && (
                    <button 
                      onClick={() => setShowSponsorModal(true)} 
                      className="px-5 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-xl text-sm font-bold shadow-md shadow-purple-600/20 transition-all flex items-center gap-2 cursor-pointer"
                    >
                      <Gift className="w-4 h-4" /> Sponsor Challenge / Pledge Grant
                    </button>
                  )}

                  {canAdopt && (
                    <button 
                      onClick={() => setShowAdoptModal(true)} 
                      className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl text-sm font-bold shadow-lg shadow-blue-600/25 transition-all flex items-center gap-2 cursor-pointer hover:scale-[1.02]"
                    >
                      <Rocket className="w-4 h-4" /> Adopt Challenge & Submit Blueprint
                    </button>
                  )}
                </div>
              </div>
            </div>
          </motion.div>

          {/* VERIFIED BEFORE / AFTER SHOWCASE (If challenge is solved) */}
          {challenge.status === 'solved' && (
            <BeforeAfterSlider
              beforeImage={challenge.image_url}
              afterImage={verificationFeedback?.after_photo_url || verifiedSolution?.demo_link}
              feedback={verificationFeedback}
            />
          )}

          {/* CITIZEN GROUND VERIFICATION GATE (When solution is submitted) */}
          {canVerify && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/40 dark:to-teal-950/40 rounded-3xl p-6 sm:p-8 border border-emerald-200 dark:border-emerald-800/60 shadow-lg shadow-emerald-600/5 space-y-4"
            >
              <div className="flex items-center gap-3">
                <div className="p-3 bg-emerald-600 text-white rounded-2xl shadow-sm">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-xl font-extrabold text-gray-900 dark:text-white">Solution Submitted — Awaiting Ground Check</h3>
                  <p className="text-xs text-gray-600 dark:text-gray-300 mt-0.5">
                    As the citizen who posted this issue, please conduct a ground check and verify the solution.
                  </p>
                </div>
              </div>

              {solutions.filter(s => s.status === 'submitted').map(sol => (
                <div key={sol.id} className="bg-white dark:bg-gray-900 p-5 rounded-2xl border border-emerald-100 dark:border-emerald-800/50 shadow-xs space-y-3">
                  <p className="text-sm font-bold text-gray-900 dark:text-white">
                    Deliverable Summary: <span className="font-normal text-gray-700 dark:text-gray-300 block mt-1">{sol.summary}</span>
                  </p>
                  {sol.demo_link && (
                    <p className="text-xs font-bold text-gray-900 dark:text-white">
                      Live Demo / Video: <a href={sol.demo_link} target="_blank" rel="noreferrer" className="text-blue-600 dark:text-blue-400 font-semibold hover:underline">{sol.demo_link}</a>
                    </p>
                  )}
                  <div className="pt-2 flex gap-3">
                    <button
                      onClick={() => setShowVerifyModal(true)}
                      className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs shadow-md shadow-emerald-600/20 transition-all flex items-center gap-2 cursor-pointer"
                    >
                      <CheckCircle2 className="w-4 h-4" /> Conduct Ground Check & Verify
                    </button>
                  </div>
                </div>
              ))}
            </motion.div>
          )}

          {/* SOLVER TEAMS & MILESTONE ROADMAP WORKSPACE */}
          {teams.length > 0 && (
            <div className="bg-white dark:bg-gray-900 rounded-3xl p-6 sm:p-8 shadow-sm border border-gray-100 dark:border-gray-800 space-y-6">
              
              {/* Workspace Header with Team Selector (if multiple teams) */}
              <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 pb-4 border-b border-gray-100 dark:border-gray-800">
                <div>
                  <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 text-xs font-bold uppercase tracking-wider mb-1">
                    <Activity className="w-4 h-4" /> Innovation Workspace
                  </div>
                  <h3 className="text-2xl font-extrabold text-gray-900 dark:text-white">
                    {teams.length > 1 ? `Participating Teams (${teams.length})` : 'Active Solver Team'}
                  </h3>
                </div>

                {/* Team Switcher Tabs */}
                {teams.length > 1 && (
                  <div className="flex gap-2 overflow-x-auto pb-1">
                    {teams.map((t, idx) => (
                      <button
                        key={t.id}
                        onClick={() => setSelectedTeamIndex(idx)}
                        className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                          selectedTeamIndex === idx
                            ? 'bg-blue-600 text-white shadow-xs'
                            : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200'
                        }`}
                      >
                        {t.team_name}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Selected Team Profile Card */}
              {activeTeam && (
                <div className="bg-gray-50 dark:bg-gray-800/40 rounded-2xl p-5 border border-gray-200 dark:border-gray-700/60 space-y-4">
                  <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2">
                    <div>
                      <h4 className="text-lg font-extrabold text-gray-900 dark:text-white flex items-center gap-2">
                        {activeTeam.team_name}
                        <span className="text-xs font-semibold px-2.5 py-0.5 rounded-md bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300">
                          {activeTeam.institution_name}
                        </span>
                        {activeTeam.is_sponsored && (
                          <span className="text-xs font-bold bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300 px-2.5 py-0.5 rounded-md">
                            Industry Sponsor
                          </span>
                        )}
                      </h4>
                      {activeTeam.mentor_name && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          Faculty / Mentor: <span className="font-semibold text-gray-700 dark:text-gray-300">{activeTeam.mentor_name}</span>
                        </p>
                      )}
                    </div>

                    {/* Team Leader Solution Submission CTA */}
                    {activeTeam.created_by === user?.id && challenge.status !== 'solved' && !solutions.some(s => s.team_id === activeTeam.id) && (
                      <button
                        onClick={() => setShowSolutionModal(true)}
                        className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold rounded-xl shadow-md shadow-emerald-600/20 transition-all cursor-pointer"
                      >
                        Submit Final Solution
                      </button>
                    )}
                  </div>

                  {/* Tech Stack Badges */}
                  {activeTeam.tech_stack && activeTeam.tech_stack.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 items-center">
                      <span className="text-[11px] font-bold text-gray-400 uppercase mr-1">Tech Stack:</span>
                      {activeTeam.tech_stack.map(tech => (
                        <span key={tech} className="px-2.5 py-1 bg-white dark:bg-gray-800 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800/60 rounded-lg text-xs font-semibold shadow-2xs">
                          {tech}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Navigation Tabs inside Team Workspace */}
                  <div className="flex gap-2 pt-2 border-t border-gray-200 dark:border-gray-700/60">
                    <button
                      onClick={() => setActiveTeamTab('milestones')}
                      className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        activeTeamTab === 'milestones'
                          ? 'bg-blue-600 text-white shadow-xs'
                          : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-100'
                      }`}
                    >
                      <Layers className="w-3.5 h-3.5 inline mr-1.5" /> Milestones & Sprints
                    </button>
                    <button
                      onClick={() => setActiveTeamTab('blueprint')}
                      className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        activeTeamTab === 'blueprint'
                          ? 'bg-blue-600 text-white shadow-xs'
                          : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-100'
                      }`}
                    >
                      <FileCode2 className="w-3.5 h-3.5 inline mr-1.5" /> Technical Blueprint
                    </button>
                    <button
                      onClick={() => setActiveTeamTab('feed')}
                      className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        activeTeamTab === 'feed'
                          ? 'bg-blue-600 text-white shadow-xs'
                          : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-100'
                      }`}
                    >
                      <Activity className="w-3.5 h-3.5 inline mr-1.5" /> Updates Feed ({progressUpdates.filter(pu => pu.team_id === activeTeam.id).length})
                    </button>
                  </div>

                  {/* TAB 1: SPRINT MILESTONE TRACKER */}
                  {activeTeamTab === 'milestones' && (
                    <div className="pt-2">
                      <MilestoneTracker
                        challengeId={id}
                        team={activeTeam}
                        user={user}
                        isTeamLeader={activeTeam.created_by === user?.id}
                        onMilestonesUpdated={fetchData}
                      />
                    </div>
                  )}

                  {/* TAB 2: TECHNICAL BLUEPRINT */}
                  {activeTeamTab === 'blueprint' && (
                    <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-200 dark:border-gray-700/60 space-y-4">
                      <div>
                        <h5 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Proposed Solution Architecture</h5>
                        <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                          {activeTeam.proposal_summary || 'No detailed blueprint submitted yet.'}
                        </p>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-gray-100 dark:border-gray-800">
                        <div>
                          <h5 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Target Timeline</h5>
                          <p className="text-xs font-bold text-gray-800 dark:text-gray-200">{activeTeam.estimated_timeline || 'Standard Timeline'}</p>
                        </div>

                        {activeTeam.grant_requested > 0 && (
                          <div>
                            <h5 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Grant Requested</h5>
                            <p className="text-xs font-extrabold text-emerald-600 dark:text-emerald-400">₹ {activeTeam.grant_requested.toLocaleString()}</p>
                          </div>
                        )}

                        {activeTeam.repo_url && (
                          <div className="sm:col-span-2">
                            <h5 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Repository / Design</h5>
                            <a href={activeTeam.repo_url} target="_blank" rel="noreferrer" className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-1">
                              <ExternalLink className="w-3.5 h-3.5" /> {activeTeam.repo_url}
                            </a>
                          </div>
                        )}
                      </div>

                      {/* Team Members List */}
                      <div className="pt-2 border-t border-gray-100 dark:border-gray-800">
                        <h5 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Roster & Assigned Roles</h5>
                        <div className="flex flex-wrap gap-2">
                          {activeTeam.members?.map((m, i) => (
                            <span key={i} className="px-3 py-1 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-xs font-semibold text-gray-700 dark:text-gray-300">
                              👤 {m}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* TAB 3: PROTOTYPE PROGRESS FEED */}
                  {activeTeamTab === 'feed' && (
                    <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-200 dark:border-gray-700/60 space-y-4">
                      <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                        {progressUpdates.filter(pu => pu.team_id === activeTeam.id).length === 0 ? (
                          <p className="text-xs text-gray-400 italic py-4 text-center">No updates posted yet.</p>
                        ) : (
                          progressUpdates.filter(pu => pu.team_id === activeTeam.id).map(pu => (
                            <div key={pu.id} className="p-3.5 bg-gray-50 dark:bg-gray-800 rounded-xl text-xs border border-gray-100 dark:border-gray-700">
                              <div className="flex items-center justify-between mb-1">
                                <span className="font-bold text-gray-900 dark:text-white">{pu.profiles?.full_name || 'Team Member'}</span>
                                <span className="text-[10px] text-gray-400">{new Date(pu.created_at).toLocaleDateString()}</span>
                              </div>
                              <p className="text-gray-700 dark:text-gray-300 leading-relaxed">{pu.text}</p>
                            </div>
                          ))
                        )}
                      </div>

                      {activeTeam.created_by === user?.id && challenge.status !== 'solved' && (
                        <div className="flex gap-2 pt-2 border-t border-gray-100 dark:border-gray-800">
                          <input
                            type="text"
                            value={newProgressText}
                            onChange={(e) => setNewProgressText(e.target.value)}
                            placeholder="Share an update on prototype tests..."
                            className="flex-1 px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-xs text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
                          />
                          <button
                            onClick={() => handlePostProgress(activeTeam.id)}
                            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold"
                          >
                            Post
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="w-full lg:w-80 flex-shrink-0 flex flex-col gap-6 lg:sticky lg:top-24 lg:h-[calc(100vh-8rem)]">
          
          {/* Status Tracker */}
          <div className="bg-white dark:bg-gray-900 p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800">
            <h3 className="text-base font-bold text-gray-900 dark:text-white mb-5">Lifecycle Tracker</h3>
            <div className="space-y-5 relative">
              <div className="absolute left-3.5 top-2 bottom-4 w-0.5 bg-gray-200 dark:bg-gray-800"></div>
              {statusSteps.map((step, idx) => {
                const Icon = step.icon;
                const isCompleted = idx <= currentStatusIndex;
                const isCurrent = idx === currentStatusIndex;
                
                return (
                  <div key={step.id} className="relative flex items-center gap-3.5 z-10">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center border-2 shadow-xs transition-colors ${
                      isCompleted ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-700 text-gray-400'
                    }`}>
                      {isCompleted ? <Check className="w-3.5 h-3.5" /> : <Icon className="w-3.5 h-3.5" />}
                    </div>
                    <span className={`font-bold text-xs ${isCurrent ? 'text-blue-600 dark:text-blue-400' : isCompleted ? 'text-gray-900 dark:text-gray-300' : 'text-gray-400 dark:text-gray-600'}`}>
                      {step.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Discussion */}
          <div className="bg-white dark:bg-gray-900 flex flex-col flex-1 min-h-0 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800">
            <div className="p-4 border-b border-gray-100 dark:border-gray-800">
              <h3 className="font-bold text-sm text-gray-900 dark:text-white">Community Discussion</h3>
            </div>
            
            <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-gray-50/50 dark:bg-gray-900/50 custom-scrollbar">
              {comments.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-gray-400 dark:text-gray-500 py-6">
                  <Send className="w-7 h-7 mb-1.5 opacity-50" />
                  <p className="text-xs font-medium">Start the conversation</p>
                </div>
              ) : (
                comments.map(c => {
                  const isMe = user && c.user_id === user.id;
                  return (
                    <div key={c.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                      <div className="flex items-center gap-1.5 mb-1">
                        <span className="text-[11px] font-bold text-gray-500 dark:text-gray-400">{c.profiles?.full_name || 'User'}</span>
                        <span className="text-[9px] text-gray-400">{new Date(c.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                      <div className={`p-3 rounded-2xl max-w-[90%] text-xs shadow-2xs ${
                        isMe ? 'bg-blue-600 text-white rounded-tr-xs' : 'bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 border border-gray-100 dark:border-gray-700/80 rounded-tl-xs'
                      }`}>
                        {c.text}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <form onSubmit={handlePostComment} className="p-3 border-t border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newCommentText}
                  onChange={(e) => setNewCommentText(e.target.value)}
                  placeholder={user ? "Write a message..." : "Log in to join discussion"}
                  disabled={!user}
                  className="flex-1 px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-xs text-gray-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                />
                <button
                  type="submit"
                  disabled={!user || !newCommentText.trim()}
                  className="p-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 transition-colors shadow-2xs cursor-pointer"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* ADOPT CHALLENGE MULTI-STEP WIZARD */}
      <AdoptChallengeModal
        isOpen={showAdoptModal}
        onClose={() => setShowAdoptModal(false)}
        challenge={challenge}
        user={user}
        userProfile={userProfile}
        onTeamCreated={(newTeam) => {
          setTeams([...teams, newTeam]);
          fetchData();
        }}
      />

      {/* CITIZEN GROUND VERIFICATION MODAL */}
      <CitizenVerificationModal
        isOpen={showVerifyModal}
        onClose={() => setShowVerifyModal(false)}
        challenge={challenge}
        solution={solutions.find(s => s.status === 'submitted') || solutions[0]}
        user={user}
        onVerified={() => {
          fetchData();
        }}
      />

      {/* SUBMIT FINAL SOLUTION MODAL */}
      {showSolutionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-white dark:bg-gray-900 w-full max-w-lg rounded-3xl p-6 sm:p-8 shadow-2xl border border-gray-100 dark:border-gray-800 space-y-5">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white">Submit Final Solution</h3>
            <form onSubmit={(e) => handleSubmitSolution(e, activeTeam?.id || myTeam?.id)} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1">Solution Summary *</label>
                <textarea
                  required
                  rows={4}
                  value={solutionSummary}
                  onChange={(e) => setSolutionSummary(e.target.value)}
                  placeholder="Describe your working solution, architecture, and impact..."
                  className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-xs text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1">Live Demo / Video / Repository Link</label>
                <input
                  type="url"
                  value={demoLink}
                  onChange={(e) => setDemoLink(e.target.value)}
                  placeholder="https://..."
                  className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-xs text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1">Contact Email for Municipal & Industry Grants</label>
                <input
                  type="email"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  placeholder="team@university.edu"
                  className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-xs text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-gray-100 dark:border-gray-800">
                <button type="button" onClick={() => setShowSolutionModal(false)} className="px-4 py-2 text-xs font-bold text-gray-500 hover:text-gray-700">Cancel</button>
                <button type="submit" className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-600/20">Submit Solution</button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* INDUSTRY SPONSOR MODAL */}
      {showSponsorModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-white dark:bg-gray-900 w-full max-w-lg rounded-3xl p-6 sm:p-8 shadow-2xl border border-gray-100 dark:border-gray-800 space-y-5">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white">Pledge Grant / Sponsor Challenge</h3>
            <form onSubmit={handleSponsorChallenge} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1">Company / Organization *</label>
                <input
                  type="text"
                  required
                  value={sponsorOrg}
                  onChange={(e) => setSponsorOrg(e.target.value)}
                  placeholder="e.g. Tata Motors / Infosys Foundation"
                  className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-xs text-gray-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1">Grant / Sponsorship Amount (₹ INR)</label>
                <input
                  type="text"
                  value={grantAmount}
                  onChange={(e) => setGrantAmount(e.target.value)}
                  placeholder="e.g. ₹ 50,000"
                  className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-xs text-gray-900 dark:text-white"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-gray-100 dark:border-gray-800">
                <button type="button" onClick={() => setShowSponsorModal(false)} className="px-4 py-2 text-xs font-bold text-gray-500 hover:text-gray-700">Cancel</button>
                <button type="submit" disabled={sponsorLoading} className="px-6 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold shadow-md shadow-purple-600/20">{sponsorLoading ? 'Pledging...' : 'Confirm Sponsorship'}</button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}
