import { useState } from 'react';
import { Sparkles, ShieldCheck, Star } from 'lucide-react';

export default function BeforeAfterSlider({ beforeImage, afterImage, feedback }) {
  const [sliderPosition, setSliderPosition] = useState(50);
  const [isHovered, setIsHovered] = useState(false);

  if (!beforeImage && !afterImage) return null;

  // If only one image is available, render single comparison card
  if (!afterImage || !beforeImage) {
    const singleImg = afterImage || beforeImage;
    return (
      <div className="rounded-2xl overflow-hidden border border-emerald-200 dark:border-emerald-800/50 bg-emerald-50/20 dark:bg-emerald-950/20 p-5 space-y-4">
        <div className="flex items-center justify-between">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300">
            <ShieldCheck className="w-4 h-4" /> Verified Solution
          </span>
          {feedback?.rating && (
            <div className="flex items-center gap-1 text-amber-500 font-bold text-xs">
              <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
              <span>{feedback.rating}/5 Ground Rating</span>
            </div>
          )}
        </div>
        <div className="h-64 sm:h-80 w-full rounded-xl overflow-hidden relative">
          <img src={singleImg} alt="Solution preview" className="w-full h-full object-cover" />
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-3xl overflow-hidden border border-emerald-200 dark:border-emerald-800/60 bg-white dark:bg-gray-900 shadow-lg shadow-emerald-600/5 p-6 space-y-5">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold bg-emerald-500 text-white shadow-xs">
            <ShieldCheck className="w-4 h-4" /> Verified Ground Impact
          </span>
          <span className="text-xs font-bold text-gray-500 dark:text-gray-400">
            Slide to compare Before & After
          </span>
        </div>

        {feedback?.rating && (
          <div className="flex items-center gap-1 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/50 px-3 py-1 rounded-full text-xs font-bold text-amber-700 dark:text-amber-300">
            <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
            <span>{feedback.rating}.0 / 5.0 Community Score</span>
          </div>
        )}
      </div>

      {/* Interactive Dual Comparison Container */}
      <div
        className="relative h-72 sm:h-96 w-full rounded-2xl overflow-hidden select-none cursor-ew-resize bg-gray-900"
        onMouseMove={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
          setSliderPosition((x / rect.width) * 100);
        }}
        onTouchMove={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          const touch = e.touches[0];
          const x = Math.max(0, Math.min(touch.clientX - rect.left, rect.width));
          setSliderPosition((x / rect.width) * 100);
        }}
      >
        {/* "After" Image (Full background) */}
        <img
          src={afterImage}
          alt="After Resolved"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute top-4 right-4 bg-emerald-600/90 backdrop-blur-sm text-white px-3 py-1 rounded-lg text-xs font-extrabold shadow-md pointer-events-none">
          AFTER (Resolved)
        </div>

        {/* "Before" Image (Clipped overlay) */}
        <div
          className="absolute inset-0 overflow-hidden"
          style={{ width: `${sliderPosition}%` }}
        >
          <img
            src={beforeImage}
            alt="Before Issue"
            className="absolute inset-0 w-full h-full object-cover max-w-none"
            style={{ width: '100%', height: '100%' }}
          />
          <div className="absolute top-4 left-4 bg-red-600/90 backdrop-blur-sm text-white px-3 py-1 rounded-lg text-xs font-extrabold shadow-md pointer-events-none">
            BEFORE (Reported)
          </div>
        </div>

        {/* Vertical Divider Bar */}
        <div
          className="absolute top-0 bottom-0 w-1 bg-white shadow-2xl pointer-events-none"
          style={{ left: `${sliderPosition}%` }}
        >
          <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-8 h-8 bg-white text-gray-800 rounded-full shadow-lg flex items-center justify-center text-xs font-bold border border-gray-200">
            ⇄
          </div>
        </div>
      </div>

      {feedback?.feedback_notes && (
        <div className="p-4 bg-emerald-50/50 dark:bg-emerald-950/20 rounded-2xl border border-emerald-100 dark:border-emerald-800/40 text-xs text-gray-700 dark:text-gray-300">
          <span className="font-bold text-emerald-800 dark:text-emerald-300 block mb-1">Citizen Ground Observation:</span>
          "{feedback.feedback_notes}"
        </div>
      )}
    </div>
  );
}
