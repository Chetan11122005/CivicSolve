import { useState } from 'react';
import { motion } from 'framer-motion';
import { X, Star, UploadCloud, CheckCircle2, ShieldCheck, AlertCircle, Image as ImageIcon } from 'lucide-react';
import { supabase } from '../lib/supabase';

export default function CitizenVerificationModal({ isOpen, onClose, challenge, solution, user, onVerified }) {
  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [feedbackNotes, setFeedbackNotes] = useState('');
  const [afterFile, setAfterFile] = useState(null);
  const [afterPreview, setAfterPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  if (!isOpen) return null;

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setError('Photo size must be less than 5MB.');
        return;
      }
      setAfterFile(file);
      setAfterPreview(URL.createObjectURL(file));
      setError(null);
    }
  };

  const handleVerify = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      let after_photo_url = null;

      if (afterFile) {
        const fileExt = afterFile.name.split('.').pop();
        const fileName = `verification_${challenge.id}_${Date.now()}.${fileExt}`;
        const filePath = `verifications/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('challenge-images')
          .upload(filePath, afterFile);

        if (!uploadError) {
          const { data } = supabase.storage.from('challenge-images').getPublicUrl(filePath);
          after_photo_url = data.publicUrl;
        }
      }

      // Record verification feedback
      await supabase.from('verification_feedback').insert([{
        challenge_id: challenge.id,
        solution_id: solution?.id || null,
        verified_by: user.id,
        rating,
        feedback_notes: feedbackNotes.trim() || null,
        after_photo_url
      }]);

      // Update Solution status to verified
      if (solution?.id) {
        await supabase.from('solutions').update({ status: 'verified' }).eq('id', solution.id);
      }

      // Update Challenge status to solved
      await supabase.from('challenges').update({ status: 'solved' }).eq('id', challenge.id);

      // Post an official community verification event to the comment stream
      await supabase.from('comments').insert([{
        challenge_id: challenge.id,
        user_id: user.id,
        text: `✅ [Citizen Verified] Solution has been tested on ground and rated ${rating}/5 Stars! "${feedbackNotes.trim() || 'Community issue resolved successfully.'}"`
      }]);

      if (onVerified) onVerified();
      onClose();
    } catch (err) {
      console.error('Verification error:', err);
      setError(err.message || 'Failed to submit verification');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white dark:bg-gray-900 w-full max-w-xl rounded-3xl shadow-2xl border border-gray-100 dark:border-gray-800 overflow-hidden my-8"
      >
        <div className="bg-gradient-to-r from-emerald-600 to-teal-600 p-6 text-white relative">
          <button
            onClick={onClose}
            className="absolute top-6 right-6 text-white/80 hover:text-white p-1 rounded-full hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2 text-emerald-200 text-xs font-bold uppercase tracking-wider mb-2">
            <ShieldCheck className="w-4 h-4" /> Ground Verification Gate
          </div>
          <h2 className="text-2xl font-extrabold">Validate Ground Solution</h2>
          <p className="text-emerald-100 text-xs mt-1">
            Verify that the prototype or repair successfully resolved the community challenge.
          </p>
        </div>

        <form onSubmit={handleVerify} className="p-6 sm:p-8 space-y-6">
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 text-red-600 text-xs font-semibold rounded-xl flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" /> {error}
            </div>
          )}

          {/* Star Rating */}
          <div className="text-center">
            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
              Solution Effectiveness Rating
            </label>
            <div className="flex justify-center items-center gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(0)}
                  onClick={() => setRating(star)}
                  className="p-1 text-2xl transition-transform hover:scale-125 focus:outline-none"
                >
                  <Star
                    className={`w-8 h-8 ${
                      (hoverRating || rating) >= star
                        ? 'fill-amber-400 text-amber-400'
                        : 'text-gray-300 dark:text-gray-700'
                    }`}
                  />
                </button>
              ))}
            </div>
            <span className="text-xs font-bold text-gray-600 dark:text-gray-400 mt-1 inline-block">
              {rating === 5 ? '🌟 Outstanding Impact' : rating >= 4 ? '👍 Highly Effective' : rating >= 3 ? '👌 Satisfactory' : '⚠️ Needs Improvements'}
            </span>
          </div>

          {/* Feedback Notes */}
          <div>
            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1">
              Field Feedback & Ground Observations *
            </label>
            <textarea
              required
              rows={3}
              value={feedbackNotes}
              onChange={(e) => setFeedbackNotes(e.target.value)}
              placeholder="Describe the solution's on-ground performance (e.g. The solar sensor was installed on the community tank and water readings are now live for all residents)..."
              className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none text-sm text-gray-900 dark:text-white resize-none"
            />
          </div>

          {/* Upload "After / Fixed" Photo */}
          <div>
            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1">
              Upload "After / Resolved" Photo Proof (Optional)
            </label>
            {afterPreview ? (
              <div className="relative rounded-2xl overflow-hidden border border-emerald-500/50 bg-gray-100 dark:bg-gray-800 h-40">
                <img src={afterPreview} alt="After solution" className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => { setAfterFile(null); setAfterPreview(null); }}
                  className="absolute top-2 right-2 bg-red-600 text-white p-1 rounded-lg text-xs font-bold shadow-sm"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-2xl cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                <UploadCloud className="w-8 h-8 text-emerald-500 mb-1" />
                <span className="text-xs font-bold text-gray-700 dark:text-gray-300">Click to upload After-fix photo</span>
                <span className="text-[10px] text-gray-500">JPG, PNG up to 5MB</span>
                <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
              </label>
            )}
          </div>

          <div className="flex justify-between items-center pt-4 border-t border-gray-100 dark:border-gray-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-bold text-gray-600 dark:text-gray-400 hover:text-gray-900"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-bold shadow-lg shadow-emerald-600/20 transition-all disabled:opacity-50 flex items-center gap-2 cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              {loading ? 'Verifying...' : 'Confirm Solution Verified'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
