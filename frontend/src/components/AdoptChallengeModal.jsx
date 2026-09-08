import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Users, Cpu, Rocket, ChevronRight, ChevronLeft, Plus, Trash2, CheckCircle2, Sparkles, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';

const POPULAR_TECH_STACKS = [
  'IoT & Microcontrollers (ESP32/Arduino)',
  'Google Gemini AI / ML',
  'Mobile App (React Native/Flutter)',
  'Computer Vision & Camera',
  'Solar & Clean Energy',
  'Cloud Analytics & Dashboard',
  'Low-cost Hardware / Sensors',
  'GIS & Mapping'
];

const MEMBER_ROLE_OPTIONS = [
  'Team Lead',
  'Hardware & IoT Specialist',
  'AI / Software Engineer',
  'Mobile App Developer',
  'Field Researcher & Survey',
  'Civil / Mechanical Designer'
];

const TIMELINE_OPTIONS = [
  '⚡ Rapid Sprint (1–2 Weeks)',
  '🛠️ Standard Capstone (1 Month)',
  '🔬 Deep-Tech Prototype (2–3 Months)',
  '🏛️ Semester Project (4+ Months)'
];

export default function AdoptChallengeModal({ isOpen, onClose, challenge, user, userProfile, onTeamCreated }) {
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  // Step 1: Team & Roster
  const [teamName, setTeamName] = useState('');
  const [institutionName, setInstitutionName] = useState(userProfile?.institution_name || '');
  const [mentorName, setMentorName] = useState('');
  const [members, setMembers] = useState([
    { name: userProfile?.full_name || '', role: 'Team Lead' }
  ]);

  // Step 2: Tech Blueprint & Solution Proposal
  const [proposalSummary, setProposalSummary] = useState('');
  const [selectedTech, setSelectedTech] = useState([]);
  const [customTech, setCustomTech] = useState('');
  const [estimatedTimeline, setEstimatedTimeline] = useState(TIMELINE_OPTIONS[1]);

  // Step 3: Resources & Links
  const [repoUrl, setRepoUrl] = useState('');
  const [grantRequested, setGrantRequested] = useState('');
  const [permissionNotes, setPermissionNotes] = useState('');

  if (!isOpen) return null;

  const handleAddMember = () => {
    if (members.length < 8) {
      setMembers([...members, { name: '', role: 'AI / Software Engineer' }]);
    }
  };

  const handleRemoveMember = (index) => {
    if (members.length > 1) {
      setMembers(members.filter((_, i) => i !== index));
    }
  };

  const handleMemberChange = (index, field, value) => {
    const updated = [...members];
    updated[index][field] = value;
    setMembers(updated);
  };

  const toggleTech = (tech) => {
    if (selectedTech.includes(tech)) {
      setSelectedTech(selectedTech.filter(t => t !== tech));
    } else {
      setSelectedTech([...selectedTech, tech]);
    }
  };

  const handleAddCustomTech = (e) => {
    e.preventDefault();
    if (customTech.trim() && !selectedTech.includes(customTech.trim())) {
      setSelectedTech([...selectedTech, customTech.trim()]);
      setCustomTech('');
    }
  };

  const handleNextStep = (e) => {
    e.preventDefault();
    setError(null);

    if (step === 1) {
      if (!teamName.trim()) {
        setError('Please provide a Team Name.');
        return;
      }
      if (members.some(m => !m.name.trim())) {
        setError('Please fill in the names for all team members.');
        return;
      }
      setStep(2);
    } else if (step === 2) {
      if (!proposalSummary.trim() || proposalSummary.trim().length < 20) {
        setError('Please provide a brief technical proposal summary (at least 20 characters).');
        return;
      }
      if (selectedTech.length === 0) {
        setError('Please select at least one tech stack component.');
        return;
      }
      setStep(3);
    }
  };

  const handleSubmitProposal = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const formattedMembers = members.map(m => `${m.name.trim()} (${m.role})`);
      const orgName = institutionName.trim() || userProfile?.institution_name || 'University Solver';

      const newTeamPayload = {
        challenge_id: challenge.id,
        team_name: teamName.trim(),
        institution_name: orgName,
        created_by: user.id,
        members: formattedMembers,
        mentor_name: mentorName.trim() || null,
        proposal_summary: proposalSummary.trim(),
        tech_stack: selectedTech,
        estimated_timeline: estimatedTimeline,
        repo_url: repoUrl.trim() || null,
        grant_requested: grantRequested ? parseFloat(grantRequested) : 0
      };

      let newTeam = null;
      const { data: fullTeam, error: teamError } = await supabase
        .from('teams')
        .insert([newTeamPayload])
        .select('*')
        .maybeSingle();

      if (teamError) {
        console.warn('Extended columns failed, falling back to core teams schema:', teamError);
        // Fallback for core schema
        const corePayload = {
          challenge_id: challenge.id,
          team_name: teamName.trim(),
          institution_name: orgName,
          created_by: user.id,
          members: formattedMembers,
          mentor_name: mentorName.trim() || null,
          is_sponsored: false
        };
        const { data: coreTeam, error: coreError } = await supabase
          .from('teams')
          .insert([corePayload])
          .select('*')
          .single();

        if (coreError) throw coreError;
        newTeam = {
          ...coreTeam,
          proposal_summary: proposalSummary.trim(),
          tech_stack: selectedTech,
          estimated_timeline: estimatedTimeline,
          repo_url: repoUrl.trim() || null,
          grant_requested: grantRequested ? parseFloat(grantRequested) : 0
        };
      } else {
        newTeam = fullTeam;
      }

      // Try ensuring default milestones (swallow error if milestones table does not exist)
      try {
        const { data: existingMilestones } = await supabase
          .from('milestones')
          .select('id')
          .eq('team_id', newTeam.id);

        if (!existingMilestones || existingMilestones.length === 0) {
          await supabase.from('milestones').insert([
            {
              team_id: newTeam.id,
              challenge_id: challenge.id,
              milestone_number: 1,
              title: '1. Ground Survey & Problem Analysis',
              description: 'Inspect physical site, assess root causes, and finalize design schematics.',
              status: 'in_progress'
            },
            {
              team_id: newTeam.id,
              challenge_id: challenge.id,
              milestone_number: 2,
              title: '2. Working Prototype & POC',
              description: 'Build functional prototype (hardware/software), run bench tests, and record demo video.',
              status: 'in_progress'
            },
            {
              team_id: newTeam.id,
              challenge_id: challenge.id,
              milestone_number: 3,
              title: '3. Community Field Testing & Deployment',
              description: 'Deploy on ground for citizen testing, measure impact, and prepare handover report.',
              status: 'in_progress'
            }
          ]);
        }
      } catch (mErr) {
        console.warn('Milestones table not yet migrated, skipping table insert:', mErr);
      }

      // Update challenge status to in_progress if still open
      if (challenge.status === 'open') {
        await supabase.from('challenges').update({ status: 'in_progress' }).eq('id', challenge.id);
      }

      // Post an official team adoption announcement in the comments timeline
      await supabase.from('comments').insert([{
        challenge_id: challenge.id,
        user_id: user.id,
        text: `🚀 [Team Adopted] **${teamName.trim()}** from *${orgName}* has adopted this challenge! Proposed Tech: ${selectedTech.join(', ')}.`
      }]);

      onTeamCreated(newTeam);
      onClose();
    } catch (err) {
      console.error('Error adopting challenge:', err);
      setError(err.message || 'Failed to adopt challenge.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white dark:bg-gray-900 w-full max-w-2xl rounded-3xl shadow-2xl border border-gray-100 dark:border-gray-800 overflow-hidden my-8"
      >
        {/* Header with Progress Steps */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-6 text-white relative">
          <button
            onClick={onClose}
            className="absolute top-6 right-6 text-white/80 hover:text-white p-1 rounded-full hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2 text-blue-200 text-xs font-bold uppercase tracking-wider mb-2">
            <Sparkles className="w-4 h-4" /> Civic Solution Proposal
          </div>
          <h2 className="text-2xl font-extrabold truncate">Adopt & Solve: {challenge.title}</h2>

          {/* Stepper Indicator */}
          <div className="flex items-center justify-between mt-6 pt-4 border-t border-white/20">
            {[
              { num: 1, label: 'Team & Roster', icon: Users },
              { num: 2, label: 'Tech Blueprint', icon: Cpu },
              { num: 3, label: 'Deliverables & Grant', icon: Rocket }
            ].map((s) => (
              <div key={s.num} className="flex items-center gap-2">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                    step === s.num
                      ? 'bg-white text-blue-600 shadow-md scale-110'
                      : step > s.num
                      ? 'bg-blue-400 text-white'
                      : 'bg-white/20 text-white/70'
                  }`}
                >
                  {step > s.num ? <CheckCircle2 className="w-4 h-4" /> : s.num}
                </div>
                <span className={`text-xs font-semibold hidden sm:inline ${step === s.num ? 'text-white font-bold' : 'text-blue-200'}`}>
                  {s.label}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 sm:p-8">
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-4 mb-6 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-xl flex items-start gap-3 text-red-600 dark:text-red-400 text-sm font-medium"
            >
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <span>{error}</span>
            </motion.div>
          )}

          {/* STEP 1: Team & Solver Roster */}
          {step === 1 && (
            <form onSubmit={handleNextStep} className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1">
                    Team Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={teamName}
                    onChange={(e) => setTeamName(e.target.value)}
                    placeholder="e.g. AquaGuard Innovators"
                    className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm text-gray-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1">
                    Institution / University
                  </label>
                  <input
                    type="text"
                    value={institutionName}
                    onChange={(e) => setInstitutionName(e.target.value)}
                    placeholder="e.g. IIT Bombay / State Engg College"
                    className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm text-gray-900 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1">
                  Faculty Advisor / Mentor Name (Optional)
                </label>
                <input
                  type="text"
                  value={mentorName}
                  onChange={(e) => setMentorName(e.target.value)}
                  placeholder="e.g. Dr. A. Sharma (Dept of Electrical Engg)"
                  className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm text-gray-900 dark:text-white"
                />
              </div>

              {/* Dynamic Members List */}
              <div className="pt-2">
                <div className="flex justify-between items-center mb-2">
                  <label className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                    Team Members & Roles ({members.length}/8)
                  </label>
                  {members.length < 8 && (
                    <button
                      type="button"
                      onClick={handleAddMember}
                      className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" /> Add Member
                    </button>
                  )}
                </div>

                <div className="space-y-3 max-h-48 overflow-y-auto pr-1">
                  {members.map((member, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <input
                        type="text"
                        required
                        value={member.name}
                        onChange={(e) => handleMemberChange(idx, 'name', e.target.value)}
                        placeholder={`Member ${idx + 1} Name`}
                        className="flex-1 px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white"
                      />
                      <select
                        value={member.role}
                        onChange={(e) => handleMemberChange(idx, 'role', e.target.value)}
                        className="w-48 px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-xs font-semibold text-gray-700 dark:text-gray-300"
                      >
                        {MEMBER_ROLE_OPTIONS.map((opt) => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                      </select>
                      {members.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveMember(idx)}
                          className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/50 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end pt-4 border-t border-gray-100 dark:border-gray-800">
                <button
                  type="submit"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold shadow-md shadow-blue-600/20 transition-all cursor-pointer"
                >
                  Next: Tech Blueprint <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </form>
          )}

          {/* STEP 2: Technical Blueprint & Solution Proposal */}
          {step === 2 && (
            <form onSubmit={handleNextStep} className="space-y-5">
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1">
                  Proposed Solution Architecture & Methodology *
                </label>
                <textarea
                  required
                  rows={4}
                  value={proposalSummary}
                  onChange={(e) => setProposalSummary(e.target.value)}
                  placeholder="Describe your team's proposed technical approach (e.g. Installing IoT optical turbidity sensors calibrated via ESP32 with automated telemetry to municipal alerts)..."
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm text-gray-900 dark:text-white resize-none"
                />
              </div>

              {/* Tech Stack Chips */}
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-2">
                  Planned Technologies & Hardware Components *
                </label>
                <div className="flex flex-wrap gap-2 mb-3">
                  {POPULAR_TECH_STACKS.map((tech) => {
                    const isSelected = selectedTech.includes(tech);
                    return (
                      <button
                        key={tech}
                        type="button"
                        onClick={() => toggleTech(tech)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-blue-600 text-white shadow-xs scale-105'
                            : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                        }`}
                      >
                        {isSelected ? '✓ ' : '+ '} {tech}
                      </button>
                    );
                  })}
                </div>

                <div className="flex gap-2">
                  <input
                    type="text"
                    value={customTech}
                    onChange={(e) => setCustomTech(e.target.value)}
                    placeholder="Add custom technology / framework (e.g. PyTorch, LoRaWAN)"
                    className="flex-1 px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-xs text-gray-900 dark:text-white"
                  />
                  <button
                    type="button"
                    onClick={handleAddCustomTech}
                    className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 text-xs font-bold rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600"
                  >
                    Add
                  </button>
                </div>
              </div>

              {/* Timeline Selection */}
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1.5">
                  Target Prototype Delivery Timeline
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {TIMELINE_OPTIONS.map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setEstimatedTimeline(t)}
                      className={`p-3 rounded-xl text-left text-xs font-bold border transition-all cursor-pointer ${
                        estimatedTimeline === t
                          ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 shadow-xs'
                          : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex justify-between items-center pt-4 border-t border-gray-100 dark:border-gray-800">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white font-bold text-sm"
                >
                  <ChevronLeft className="w-4 h-4" /> Back
                </button>
                <button
                  type="submit"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold shadow-md shadow-blue-600/20 transition-all cursor-pointer"
                >
                  Next: Resources & Grant <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </form>
          )}

          {/* STEP 3: Resources, GitHub Link & Grant Request */}
          {step === 3 && (
            <form onSubmit={handleSubmitProposal} className="space-y-5">
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1">
                  Project Repository / Figma / Architecture Link (Optional)
                </label>
                <input
                  type="url"
                  value={repoUrl}
                  onChange={(e) => setRepoUrl(e.target.value)}
                  placeholder="https://github.com/your-org/civic-solution or https://figma.com/..."
                  className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm text-gray-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1">
                  Estimated Hardware/Prototype Grant Requested (₹ INR, Optional)
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-sm">₹</span>
                  <input
                    type="number"
                    min="0"
                    step="500"
                    value={grantRequested}
                    onChange={(e) => setGrantRequested(e.target.value)}
                    placeholder="e.g. 15000 (for sensors, 3D printing & PCB fabrication)"
                    className="w-full pl-8 pr-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm text-gray-900 dark:text-white"
                  />
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Industry partners and municipal bodies can sponsor this amount directly through CivicSolve.
                </p>
              </div>

              {/* Proposal Review Summary Card */}
              <div className="p-4 bg-blue-50/50 dark:bg-blue-900/20 rounded-2xl border border-blue-100 dark:border-blue-800/40 space-y-2 text-xs">
                <div className="flex justify-between items-center text-blue-800 dark:text-blue-300 font-bold">
                  <span>Team: {teamName}</span>
                  <span className="capitalize">{estimatedTimeline.split(' ')[1] || '1 Month'}</span>
                </div>
                <p className="text-gray-600 dark:text-gray-300 line-clamp-2">{proposalSummary}</p>
                <div className="flex flex-wrap gap-1 pt-1">
                  {selectedTech.map(t => (
                    <span key={t} className="px-2 py-0.5 bg-blue-100 dark:bg-blue-800/50 text-blue-700 dark:text-blue-300 rounded font-semibold text-[10px]">
                      {t}
                    </span>
                  ))}
                </div>
              </div>

              <div className="flex justify-between items-center pt-4 border-t border-gray-100 dark:border-gray-800">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white font-bold text-sm"
                >
                  <ChevronLeft className="w-4 h-4" /> Back
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center gap-2 px-8 py-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl text-sm font-bold shadow-lg shadow-blue-600/30 transition-all disabled:opacity-50 cursor-pointer"
                >
                  {submitting ? 'Adopting Challenge...' : '🚀 Submit Proposal & Adopt'}
                </button>
              </div>
            </form>
          )}
        </div>
      </motion.div>
    </div>
  );
}
