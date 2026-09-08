import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, Clock, ExternalLink, Sparkles, UploadCloud, ChevronRight, Check } from 'lucide-react';
import { supabase } from '../lib/supabase';

export default function MilestoneTracker({ challengeId, team, user, isTeamLeader, onMilestonesUpdated }) {
  const [milestones, setMilestones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [completingId, setCompletingId] = useState(null);
  const [deliverableUrl, setDeliverableUrl] = useState('');
  const [completionNotes, setCompletionNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (team?.id) {
      fetchMilestones();
    }
  }, [team?.id]);

  const fetchMilestones = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('milestones')
        .select('*')
        .eq('team_id', team.id)
        .order('milestone_number', { ascending: true });

      if (error) throw error;
      setMilestones(data || []);
    } catch (err) {
      console.error('Error loading milestones:', err);
    } finally {
      setLoading(false);
    }
  };

  const completedCount = milestones.filter(m => m.status === 'completed' || m.status === 'verified').length;
  const totalCount = milestones.length || 3;
  const progressPercent = Math.round((completedCount / totalCount) * 100);

  const handleCompleteMilestone = async (e, milestoneId) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const { data, error } = await supabase
        .from('milestones')
        .update({
          status: 'completed',
          deliverable_url: deliverableUrl.trim() || null,
          description: completionNotes.trim() ? completionNotes.trim() : undefined,
          completed_at: new Date().toISOString()
        })
        .eq('id', milestoneId)
        .select()
        .single();

      if (error) throw error;

      // Also post a progress update in the team feed
      const targetMilestone = milestones.find(m => m.id === milestoneId);
      await supabase.from('progress_updates').insert([{
        team_id: team.id,
        challenge_id: challengeId,
        posted_by: user.id,
        text: `🎯 [Milestone ${targetMilestone?.milestone_number} Completed] ${targetMilestone?.title}: ${completionNotes.trim() || 'Deliverable submitted.'}`
      }]);

      setCompletingId(null);
      setDeliverableUrl('');
      setCompletionNotes('');
      fetchMilestones();
      if (onMilestonesUpdated) onMilestonesUpdated();
    } catch (err) {
      console.error('Error completing milestone:', err);
      alert(err.message || 'Failed to update milestone');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="py-6 flex justify-center">
        <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Visual Sprint Progress Bar */}
      <div className="bg-gray-50 dark:bg-gray-800/60 p-5 rounded-2xl border border-gray-200 dark:border-gray-700/60">
        <div className="flex justify-between items-center mb-2.5">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">Sprint Progress</span>
            <span className="px-2 py-0.5 rounded-full text-xs font-extrabold bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300">
              {completedCount} of {totalCount} Milestones
            </span>
          </div>
          <span className="text-sm font-extrabold text-blue-600 dark:text-blue-400">{progressPercent}%</span>
        </div>

        <div className="w-full h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden p-0.5">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${progressPercent}%` }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            className={`h-full rounded-full ${
              progressPercent === 100
                ? 'bg-gradient-to-r from-emerald-500 to-green-500'
                : 'bg-gradient-to-r from-blue-600 to-indigo-600'
            }`}
          />
        </div>
      </div>

      {/* Step-by-Step Deliverables List */}
      <div className="space-y-4">
        {milestones.map((m, index) => {
          const isDone = m.status === 'completed' || m.status === 'verified';
          const isCurrent = !isDone && (index === 0 || milestones[index - 1]?.status === 'completed');

          return (
            <div
              key={m.id}
              className={`p-5 rounded-2xl border transition-all ${
                isDone
                  ? 'bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/50'
                  : isCurrent
                  ? 'bg-white dark:bg-gray-900 border-blue-400 dark:border-blue-600 shadow-md shadow-blue-600/5'
                  : 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 opacity-70'
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3.5">
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm shrink-0 mt-0.5 ${
                      isDone
                        ? 'bg-emerald-500 text-white shadow-sm'
                        : isCurrent
                        ? 'bg-blue-600 text-white shadow-sm ring-4 ring-blue-100 dark:ring-blue-900/40'
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-400'
                    }`}
                  >
                    {isDone ? <Check className="w-5 h-5" /> : m.milestone_number}
                  </div>

                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-bold text-gray-900 dark:text-white text-base">{m.title}</h4>
                      {isDone ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300">
                          Completed
                        </span>
                      ) : isCurrent ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 animate-pulse">
                          In Progress
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-gray-100 dark:bg-gray-800 text-gray-500">
                          Upcoming
                        </span>
                      )}
                    </div>

                    <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">{m.description}</p>

                    {/* Deliverable Link if available */}
                    {m.deliverable_url && (
                      <div className="mt-3 flex items-center gap-2">
                        <a
                          href={m.deliverable_url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors shadow-2xs"
                        >
                          <ExternalLink className="w-3.5 h-3.5" /> View Deliverable Artifact
                        </a>
                        {m.completed_at && (
                          <span className="text-xs text-gray-400">
                            Submitted on {new Date(m.completed_at).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Team Leader Action to Complete */}
                {isTeamLeader && !isDone && (
                  <button
                    onClick={() => setCompletingId(completingId === m.id ? null : m.id)}
                    className="shrink-0 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-xs transition-colors cursor-pointer"
                  >
                    {completingId === m.id ? 'Cancel' : 'Submit Proof'}
                  </button>
                )}
              </div>

              {/* Expandable Submission Form */}
              <AnimatePresence>
                {completingId === m.id && (
                  <motion.form
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    onSubmit={(e) => handleCompleteMilestone(e, m.id)}
                    className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 space-y-3"
                  >
                    <div>
                      <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                        Artifact / Video / GitHub Demo Link *
                      </label>
                      <input
                        type="url"
                        required
                        value={deliverableUrl}
                        onChange={(e) => setDeliverableUrl(e.target.value)}
                        placeholder="https://github.com/... or https://loom.com/share/..."
                        className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-xs text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                        Summary of What Was Built / Tested
                      </label>
                      <textarea
                        rows={2}
                        value={completionNotes}
                        onChange={(e) => setCompletionNotes(e.target.value)}
                        placeholder="e.g. Assembled optical turbidity sensor with 3D printed waterproof casing. Bench tested accuracy to 98%..."
                        className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-xs text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                      />
                    </div>

                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setCompletingId(null)}
                        className="px-3 py-1.5 text-xs text-gray-500 font-bold hover:text-gray-700"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={submitting}
                        className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-xs transition-colors disabled:opacity-50 cursor-pointer"
                      >
                        {submitting ? 'Submitting...' : '✓ Confirm Milestone Completed'}
                      </button>
                    </div>
                  </motion.form>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    </div>
  );
}
