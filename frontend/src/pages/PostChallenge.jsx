import { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { 
  UploadCloud, 
  CheckCircle, 
  CheckCircle2,
  AlertCircle, 
  Sparkles, 
  Loader2, 
  MapPin, 
  Navigation, 
  X, 
  Image as ImageIcon,
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  CopyCheck,
  ThumbsUp,
  ArrowRight,
  RefreshCw,
  Zap,
  Check,
  Tag,
  Info
} from 'lucide-react';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { useTranslation } from 'react-i18next';
import { validateCivicImageAndContent, checkDuplicateChallenge } from '../lib/aiValidation';

const CATEGORIES = ['water', 'health', 'education', 'infrastructure', 'environment', 'safety', 'other'];

export default function PostChallenge() {
  const { t } = useTranslation();
  const fileInputRef = useRef(null);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('infrastructure');
  const [location, setLocation] = useState('');
  const [severity, setSeverity] = useState('medium');
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  
  // AI Image Validation State
  const [isScanningImage, setIsScanningImage] = useState(false);
  const [aiScanResult, setAiScanResult] = useState(null);
  const [appliedAiRecommendation, setAppliedAiRecommendation] = useState(false);

  // Duplicate Check Modal State
  const [duplicateModalOpen, setDuplicateModalOpen] = useState(false);
  const [duplicateData, setDuplicateData] = useState(null);
  const [isUpvotingExisting, setIsUpvotingExisting] = useState(false);

  const [loading, setLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [locLoading, setLocLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const navigate = useNavigate();

  // Clean up Object URL to avoid memory leaks
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  // Run AI Vision Validation on Image Selection
  const runAiValidation = async (imageFile, currentTitle, currentDesc, currentCat, currentLoc) => {
    if (!imageFile) return;
    setIsScanningImage(true);
    setAppliedAiRecommendation(false);
    try {
      const result = await validateCivicImageAndContent({
        file: imageFile,
        title: currentTitle || title,
        description: currentDesc || description,
        category: currentCat || category,
        location: currentLoc || location
      });
      setAiScanResult(result);
    } catch (err) {
      console.error("AI Scan Error:", err);
    } finally {
      setIsScanningImage(false);
    }
  };

  const handleFileSelect = (selectedFile) => {
    if (!selectedFile) return;
    if (!selectedFile.type.startsWith('image/')) {
      setError("Please upload a valid image file (PNG, JPG, WebP).");
      return;
    }
    if (selectedFile.size > 5 * 1024 * 1024) {
      setError("Image size must be less than 5MB.");
      return;
    }
    setError(null);
    setFile(selectedFile);
    setPreviewUrl(URL.createObjectURL(selectedFile));
    setAiScanResult(null);

    // Trigger AI Vision scan immediately
    runAiValidation(selectedFile, title, description, category, location);
  };

  const handleRemoveFile = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setFile(null);
    setPreviewUrl(null);
    setAiScanResult(null);
    setAppliedAiRecommendation(false);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  // GPS Location Auto-Detection
  const handleAutoDetectLocation = () => {
    if (!navigator.geolocation) {
      setError("Geolocation is not supported by your browser.");
      return;
    }

    setLocLoading(true);
    setError(null);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords;
          
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=14&addressdetails=1`,
            {
              headers: {
                'Accept-Language': 'en'
              }
            }
          );

          if (!response.ok) {
            throw new Error("Unable to fetch address from coordinates.");
          }

          const data = await response.json();
          const addr = data.address || {};
          
          const locality = addr.suburb || addr.neighbourhood || addr.residential || addr.road || '';
          const city = addr.city || addr.town || addr.village || addr.county || addr.state_district || '';
          const state = addr.state || '';
          
          const parts = [locality, city, state].filter(Boolean);
          const formattedLocation = parts.length > 0 ? parts.join(', ') : data.display_name.split(',').slice(0, 3).join(',');

          setLocation(formattedLocation || `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`);
        } catch (err) {
          console.error("Geocoding error:", err);
          setError("Location detected, but address lookup failed. Please type city name.");
        } finally {
          setLocLoading(false);
        }
      },
      (geoErr) => {
        console.error("GPS Error:", geoErr);
        setLocLoading(false);
        setError("GPS permission denied or unavailable. Please enter location manually.");
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  // AI Assist: Auto-Fill & Classify
  const handleAiAssist = async () => {
    if (!description && !file) {
      setError("Please write a brief description or upload a photo first so the AI can analyze it.");
      return;
    }

    setAiLoading(true);
    setError(null);

    try {
      if (file) {
        const result = await validateCivicImageAndContent({
          file,
          title,
          description,
          category,
          location
        });
        setAiScanResult(result);
        if (result.suggestedCategory && CATEGORIES.includes(result.suggestedCategory.toLowerCase())) {
          setCategory(result.suggestedCategory.toLowerCase());
        }
        if (result.suggestedSeverity && ['high', 'medium', 'low'].includes(result.suggestedSeverity.toLowerCase())) {
          setSeverity(result.suggestedSeverity.toLowerCase());
        }
        setAppliedAiRecommendation(true);
        return;
      }

      // Text-only classification fallback
      const geminiKey = (import.meta.env.VITE_GEMINI_API_KEY || '').trim();
      const openRouterKey = (import.meta.env.VITE_OPENROUTER_API_KEY || '').trim();
      const apiKey = openRouterKey || geminiKey;

      if (!apiKey) {
        setError("Please set VITE_GEMINI_API_KEY or VITE_OPENROUTER_API_KEY in your .env file.");
        return;
      }

      const prompt = `
        Analyze the following civic issue description: "${description}"
        Also consider the title if provided: "${title}"
        
        Classify this issue. Respond with ONLY a valid raw JSON object:
        {
          "category": strictly one of ["water", "health", "education", "infrastructure", "environment", "safety", "other"],
          "severity": strictly one of ["high", "medium", "low"]
        }
      `;

      let responseText = "";
      const isOpenRouter = !!openRouterKey || apiKey.startsWith('sk-or-') || apiKey.startsWith('sk-');

      if (isOpenRouter) {
        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${apiKey}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            models: ["google/gemini-2.5-flash-lite", "google/gemini-2.5-flash"],
            max_tokens: 300,
            temperature: 0.1,
            messages: [{ role: "user", content: prompt }]
          })
        });

        if (!response.ok) throw new Error("AI request failed");
        const data = await response.json();
        responseText = data.choices?.[0]?.message?.content || "";
      } else {
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        const result = await model.generateContent(prompt);
        responseText = result.response.text();
      }

      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error("Invalid AI response");
      const parsed = JSON.parse(jsonMatch[0]);

      if (parsed.category && CATEGORIES.includes(parsed.category.toLowerCase())) {
        setCategory(parsed.category.toLowerCase());
      }
      if (parsed.severity && ['high', 'medium', 'low'].includes(parsed.severity.toLowerCase())) {
        setSeverity(parsed.severity.toLowerCase());
      }
    } catch (err) {
      console.error("AI Error:", err);
      setError(`AI Error: ${err.message}`);
    } finally {
      setAiLoading(false);
    }
  };

  // Submit Challenge Handler with AI Quality Gate & Duplicate Check
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('You must be logged in to post a challenge.');

      // 1. AI Image Quality / Context Gate
      if (file && aiScanResult) {
        if (aiScanResult.isOutOfContext || (aiScanResult.isValidCivic === false && aiScanResult.relevanceScore < 40)) {
          throw new Error(`Quality Moderation: The uploaded image was flagged as out-of-context or unrelated to civic infrastructure. Please upload a clear photo of the physical problem.`);
        }
      }

      // 2. Duplicate Detection Check against active database challenges
      const { data: existingChallenges } = await supabase
        .from('challenges')
        .select('id, title, description, category, location, upvote_count, image_url, status, created_at')
        .neq('status', 'rejected')
        .order('created_at', { ascending: false })
        .limit(25);

      const duplicateCheck = await checkDuplicateChallenge({
        title,
        description,
        category,
        location,
        existingChallenges: existingChallenges || []
      });

      if (duplicateCheck.isDuplicate && duplicateCheck.matchedChallenge) {
        setDuplicateData(duplicateCheck);
        setDuplicateModalOpen(true);
        setLoading(false);
        return; // Pause submission and prompt citizen
      }

      // Proceed with standard submission if unique
      await executeChallengeSubmission(false);
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  // Actual Database Insertion
  const executeChallengeSubmission = async (bypassDuplicate = false) => {
    setLoading(true);
    setError(null);
    if (bypassDuplicate) {
      setDuplicateModalOpen(false);
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('You must be logged in to post a challenge.');

      let image_url = null;
      if (file) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Math.random()}.${fileExt}`;
        const filePath = `${user.id}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('challenge-images')
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from('challenge-images')
          .getPublicUrl(filePath);
          
        image_url = urlData.publicUrl;
      }

      const challengePayload = {
        title,
        description,
        category,
        location,
        severity,
        image_url,
        posted_by: user.id,
        ai_validation_score: aiScanResult?.relevanceScore || 85,
        ai_detected_tags: aiScanResult?.detectedElements || [],
        ai_quality_status: aiScanResult?.quality || 'clear'
      };

      const { error: insertError } = await supabase
        .from('challenges')
        .insert([challengePayload]);

      if (insertError) {
        console.warn("Extended AI columns insert failed, falling back to core schema:", insertError);
        const corePayload = {
          title,
          description,
          category,
          location,
          severity,
          image_url,
          posted_by: user.id
        };
        const { error: coreError } = await supabase.from('challenges').insert([corePayload]);
        if (coreError) throw coreError;
      }

      setSuccess(true);
      setTimeout(() => navigate('/dashboard'), 2000);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Upvote Existing Challenge when duplicate is found
  const handleUpvoteExisting = async (existingChallengeId) => {
    setIsUpvotingExisting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase
          .from('upvotes')
          .insert([{ challenge_id: existingChallengeId, user_id: user.id }])
          .maybeSingle();

        const { data: current } = await supabase
          .from('challenges')
          .select('upvote_count')
          .eq('id', existingChallengeId)
          .single();

        if (current) {
          await supabase
            .from('challenges')
            .update({ upvote_count: (current.upvote_count || 0) + 1 })
            .eq('id', existingChallengeId);
        }
      }
      setDuplicateModalOpen(false);
      navigate(`/challenge/${existingChallengeId}`);
    } catch (err) {
      console.error("Error upvoting existing challenge:", err);
      navigate(`/challenge/${existingChallengeId}`);
    } finally {
      setIsUpvotingExisting(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-64px)] bg-gray-50 dark:bg-gray-950 py-12 px-4 sm:px-6 lg:px-8 transition-colors">
      <div className="max-w-3xl mx-auto">
        <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800 p-8 sm:p-12">
          
          <div className="mb-8 text-center">
            <h1 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight">{t('postChallenge.heading')}</h1>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">{t('postChallenge.subheading')}</p>
          </div>

          {success ? (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-4">
                <CheckCircle className="w-10 h-10" />
              </div>
              <h2 className="text-2xl font-black text-gray-900 dark:text-white mb-2">{t('postChallenge.successTitle')}</h2>
              <p className="text-gray-500 dark:text-gray-400 text-sm">{t('postChallenge.successDesc')}</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              
              <div>
                <label className="block text-xs font-extrabold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-1.5">{t('postChallenge.title')}</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="block w-full px-4 py-3 bg-gray-50 dark:bg-gray-800/70 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 dark:text-white transition-all text-sm font-medium"
                  placeholder={t('postChallenge.titlePlaceholder')}
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="block text-xs font-extrabold uppercase tracking-wider text-gray-700 dark:text-gray-300">{t('postChallenge.description')}</label>
                  <button 
                    type="button" 
                    onClick={handleAiAssist}
                    disabled={aiLoading}
                    className="inline-flex items-center gap-1.5 text-xs font-extrabold bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-700 hover:to-indigo-700 px-3 py-1.5 rounded-lg transition-all shadow-xs cursor-pointer disabled:opacity-50"
                  >
                    {aiLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                    {aiLoading ? "Auditing Issue..." : "Smart Auto-Fill & Classify"}
                  </button>
                </div>
                <textarea
                  required
                  rows={4}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="block w-full px-4 py-3 bg-gray-50 dark:bg-gray-800/70 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 dark:text-white transition-all resize-none text-sm leading-relaxed"
                  placeholder={t('postChallenge.descPlaceholder')}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-extrabold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-1.5">{t('postChallenge.category')}</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="block w-full px-4 py-3 bg-gray-50 dark:bg-gray-800/70 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 dark:text-white transition-all appearance-none capitalize text-sm font-medium"
                  >
                    {CATEGORIES.map(cat => (
                      <option key={cat} value={cat}>{t(`categories.${cat}`)}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-extrabold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-1.5">{t('postChallenge.severity')}</label>
                  <select
                    value={severity}
                    onChange={(e) => setSeverity(e.target.value)}
                    className="block w-full px-4 py-3 bg-gray-50 dark:bg-gray-800/70 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 dark:text-white transition-all appearance-none capitalize text-sm font-medium"
                  >
                    <option value="high">{t('discover.high')}</option>
                    <option value="medium">{t('discover.medium')}</option>
                    <option value="low">{t('discover.low')}</option>
                  </select>
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="block text-xs font-extrabold uppercase tracking-wider text-gray-700 dark:text-gray-300">{t('postChallenge.location')}</label>
                  <button 
                    type="button" 
                    onClick={handleAutoDetectLocation}
                    disabled={locLoading}
                    className="flex items-center text-xs font-bold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 border border-emerald-200 dark:border-emerald-800 px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
                  >
                    {locLoading ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Navigation className="w-3.5 h-3.5 mr-1.5" />}
                    {locLoading ? t('postChallenge.detecting') : t('postChallenge.autoDetect')}
                  </button>
                </div>
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className="block w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-gray-800/70 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 dark:text-white transition-all text-sm font-medium"
                    placeholder={t('postChallenge.locationPlaceholder')}
                  />
                  <MapPin className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                </div>
              </div>

              {/* Upload Image with Live Smart Vision Quality Audit */}
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="block text-xs font-extrabold uppercase tracking-wider text-gray-700 dark:text-gray-300">
                    {t('postChallenge.upload')}
                  </label>
                  <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5 text-blue-500" /> Automated Quality Check
                  </span>
                </div>

                <input
                  type="file"
                  ref={fileInputRef}
                  className="hidden"
                  accept="image/*"
                  onChange={(e) => handleFileSelect(e.target.files[0])}
                />

                {previewUrl ? (
                  /* Live Image Preview & Refined Vision Result */
                  <div className="space-y-3.5">
                    <div className="relative rounded-2xl overflow-hidden border border-gray-200 dark:border-gray-700 bg-gray-950 p-1.5 group transition-all shadow-sm">
                      <div className="relative h-64 sm:h-72 w-full rounded-xl overflow-hidden bg-gray-950 flex items-center justify-center">
                        <img
                          src={previewUrl}
                          alt="Upload preview"
                          className={`w-full h-full object-cover transition-transform duration-500 ${isScanningImage ? 'scale-105 filter brightness-75' : 'group-hover:scale-[1.01]'}`}
                        />
                        
                        {/* Scanning HUD overlay if active */}
                        {isScanningImage && (
                          <div className="absolute inset-0 bg-gradient-to-b from-blue-950/70 via-indigo-950/60 to-black/80 flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-300">
                            <div className="relative mb-3">
                              <div className="w-14 h-14 rounded-2xl bg-blue-500/20 border border-blue-400/40 text-blue-400 flex items-center justify-center backdrop-blur-md">
                                <Sparkles className="w-7 h-7 animate-pulse text-blue-300" />
                              </div>
                              <div className="absolute -inset-1 rounded-2xl bg-blue-500/20 blur-md -z-10 animate-ping"></div>
                            </div>
                            <h4 className="text-sm font-extrabold text-white tracking-wide mb-1">Civic Quality Audit</h4>
                            <p className="text-xs text-blue-200/90 max-w-xs leading-relaxed">
                              Validating image sharpness, authentic scene, and municipal category...
                            </p>
                          </div>
                        )}

                        {/* Top Controls Overlay */}
                        {!isScanningImage && (
                          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/40 flex flex-col justify-between p-3.5">
                            <div className="flex justify-end gap-2">
                              <button
                                type="button"
                                onClick={() => runAiValidation(file, title, description, category, location)}
                                className="flex items-center gap-1.5 bg-gray-900/80 hover:bg-gray-900 text-white backdrop-blur-md px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-sm cursor-pointer hover:scale-105"
                                title="Re-audit image"
                              >
                                <RefreshCw className="w-3.5 h-3.5 text-blue-400" />
                                <span>Re-Audit</span>
                              </button>
                              <button
                                type="button"
                                onClick={handleRemoveFile}
                                className="flex items-center gap-1.5 bg-red-600/90 hover:bg-red-600 text-white backdrop-blur-md px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-sm cursor-pointer hover:scale-105"
                              >
                                <X className="w-3.5 h-3.5" />
                                <span>Remove</span>
                              </button>
                            </div>

                            <div className="flex items-center justify-between text-white">
                              <div className="flex items-center gap-2 truncate max-w-[75%]">
                                <ImageIcon className="w-4 h-4 text-blue-400 shrink-0" />
                                <span className="text-xs font-semibold truncate">{file?.name}</span>
                              </div>
                              <span className="text-[11px] font-bold text-gray-300 bg-white/20 backdrop-blur-md px-2 py-0.5 rounded-md shrink-0">
                                {(file?.size / (1024 * 1024)).toFixed(2)} MB
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* REFINED AI AUDIT RESULT CARDS */}
                    {aiScanResult && !isScanningImage && (
                      <div className={`p-5 rounded-2xl border transition-all ${
                        aiScanResult.isOutOfContext || (aiScanResult.isValidCivic === false && aiScanResult.relevanceScore < 40)
                          ? 'bg-gradient-to-br from-red-500/10 via-red-500/5 to-transparent border-red-500/30 dark:border-red-500/20'
                          : aiScanResult.quality === 'blurry' || aiScanResult.quality === 'dark' || aiScanResult.quality === 'obstructed'
                          ? 'bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-transparent border-amber-500/30 dark:border-amber-500/20'
                          : 'bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-transparent border-emerald-500/30 dark:border-emerald-500/20'
                      }`}>
                        
                        {/* Header: Status and Score */}
                        <div className="flex flex-wrap items-center justify-between gap-3 mb-3 pb-3 border-b border-black/5 dark:border-white/5">
                          <div className="flex items-center gap-2.5">
                            {aiScanResult.isOutOfContext || (aiScanResult.isValidCivic === false && aiScanResult.relevanceScore < 40) ? (
                              <div className="w-8 h-8 rounded-xl bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400 flex items-center justify-center shrink-0">
                                <ShieldAlert className="w-4 h-4" />
                              </div>
                            ) : aiScanResult.quality === 'blurry' || aiScanResult.quality === 'dark' || aiScanResult.quality === 'obstructed' ? (
                              <div className="w-8 h-8 rounded-xl bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                                <AlertTriangle className="w-4 h-4" />
                              </div>
                            ) : (
                              <div className="w-8 h-8 rounded-xl bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                                <CheckCircle2 className="w-4 h-4" />
                              </div>
                            )}

                            <div>
                              <h4 className={`text-xs font-black uppercase tracking-wider ${
                                aiScanResult.isOutOfContext || (aiScanResult.isValidCivic === false && aiScanResult.relevanceScore < 40)
                                  ? 'text-red-900 dark:text-red-300'
                                  : aiScanResult.quality === 'blurry' || aiScanResult.quality === 'dark' || aiScanResult.quality === 'obstructed'
                                  ? 'text-amber-900 dark:text-amber-300'
                                  : 'text-emerald-900 dark:text-emerald-300'
                              }`}>
                                {aiScanResult.isOutOfContext || (aiScanResult.isValidCivic === false && aiScanResult.relevanceScore < 40)
                                  ? 'Non-Civic Content Flagged'
                                  : aiScanResult.quality === 'blurry' || aiScanResult.quality === 'dark' || aiScanResult.quality === 'obstructed'
                                  ? `Clarity Advisory: ${aiScanResult.quality}`
                                  : 'Verified Civic Issue'}
                              </h4>
                              <p className="text-[11px] text-gray-500 dark:text-gray-400 font-medium">
                                {aiScanResult.isOutOfContext
                                  ? 'Photo does not appear to show a municipal problem'
                                  : aiScanResult.quality !== 'clear'
                                  ? 'Lighting or focus could be improved'
                                  : 'Authentic community problem recognized'}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <span className={`px-2.5 py-1 rounded-full text-xs font-black tracking-tight ${
                              aiScanResult.relevanceScore >= 75
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300'
                                : aiScanResult.relevanceScore >= 50
                                ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300'
                                : 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300'
                            }`}>
                              Clarity: {aiScanResult.relevanceScore}%
                            </span>
                          </div>
                        </div>

                        {/* Summary & Actionable Feedback */}
                        <p className={`text-xs font-medium mb-3 leading-relaxed ${
                          aiScanResult.isOutOfContext || (aiScanResult.isValidCivic === false && aiScanResult.relevanceScore < 40)
                            ? 'text-red-700 dark:text-red-400'
                            : aiScanResult.quality === 'blurry' || aiScanResult.quality === 'dark' || aiScanResult.quality === 'obstructed'
                            ? 'text-amber-800 dark:text-amber-400'
                            : 'text-emerald-800 dark:text-emerald-300'
                        }`}>
                          {aiScanResult.feedback}
                        </p>

                        {/* Detected Physical Objects Tags */}
                        {aiScanResult.detectedElements?.length > 0 && (
                          <div className="flex flex-wrap items-center gap-1.5 pt-2">
                            <span className="text-[11px] font-bold text-gray-500 dark:text-gray-400 mr-1 flex items-center gap-1">
                              <Tag className="w-3 h-3" /> Recognized Features:
                            </span>
                            {aiScanResult.detectedElements.map((elem, idx) => (
                              <span key={idx} className="px-2.5 py-1 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 text-[11px] font-bold rounded-lg border border-gray-200/80 dark:border-gray-700/80 shadow-2xs">
                                {elem}
                              </span>
                            ))}
                          </div>
                        )}

                        {/* Quick-Apply Recommendation */}
                        {aiScanResult.suggestedCategory && (
                          <div className="mt-3 pt-3 border-t border-black/5 dark:border-white/5 flex flex-wrap items-center justify-between gap-2">
                            <div className="flex items-center gap-1.5 text-xs text-gray-700 dark:text-gray-300">
                              <Info className="w-3.5 h-3.5 text-blue-500" />
                              <span>
                                Recommended: <strong className="capitalize">{aiScanResult.suggestedCategory}</strong> • <strong className="capitalize">{aiScanResult.suggestedSeverity}</strong>
                              </span>
                            </div>

                            <button
                              type="button"
                              onClick={() => {
                                setCategory(aiScanResult.suggestedCategory.toLowerCase());
                                if (aiScanResult.suggestedSeverity) setSeverity(aiScanResult.suggestedSeverity.toLowerCase());
                                setAppliedAiRecommendation(true);
                              }}
                              disabled={appliedAiRecommendation}
                              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
                                appliedAiRecommendation
                                  ? 'bg-emerald-600 text-white'
                                  : 'bg-blue-600 hover:bg-blue-700 text-white shadow-xs'
                              }`}
                            >
                              {appliedAiRecommendation ? (
                                <>
                                  <Check className="w-3.5 h-3.5" /> Applied to Form
                                </>
                              ) : (
                                "Apply to Form"
                              )}
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  /* Drag & Drop Upload Zone */
                  <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    className={`mt-1 flex justify-center px-6 pt-8 pb-8 border-2 border-dashed rounded-3xl transition-all ${
                      isDragging
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 scale-[1.01]'
                        : 'border-gray-300 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/40 hover:bg-gray-100/70 dark:hover:bg-gray-800/70'
                    }`}
                  >
                    <div className="space-y-3 text-center">
                      <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 flex items-center justify-center mx-auto shadow-xs">
                        <UploadCloud className="h-6 w-6" />
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        <label className="relative cursor-pointer bg-transparent rounded-md font-bold text-blue-600 dark:text-blue-400 hover:text-blue-500 focus-within:outline-none">
                          <span>Upload Problem Photo</span>
                          <input
                            type="file"
                            className="sr-only"
                            accept="image/*"
                            onChange={(e) => handleFileSelect(e.target.files[0])}
                          />
                        </label>
                        <span className="px-1 text-gray-400">or drag & drop</span>
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        PNG, JPG, WebP up to 5MB • Automated clarity and municipal audit
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {error && (
                <div className="p-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-2xl flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                  <p className="text-xs font-bold text-red-700 dark:text-red-400 leading-relaxed">{error}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-4 px-4 border border-transparent rounded-2xl shadow-md shadow-blue-600/20 text-sm font-black text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 transition-all mt-6 cursor-pointer"
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Checking for duplicate reports & submitting...
                  </span>
                ) : (
                  t('postChallenge.submit')
                )}
              </button>
            </form>
          )}
        </div>
      </div>

      {/* DUPLICATE CHALLENGE INTERCEPTOR MODAL */}
      {duplicateModalOpen && duplicateData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-white dark:bg-gray-900 rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-gray-100 dark:border-gray-800 relative">
            
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-2xl bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400 flex items-center justify-center shadow-xs">
                <CopyCheck className="w-6 h-6" />
              </div>
              <button 
                onClick={() => setDuplicateModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <h3 className="text-xl font-black text-gray-900 dark:text-white mb-1">
              Similar Issue Already Reported!
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
              A <strong className="text-amber-600 dark:text-amber-400">{duplicateData.similarityScore}% match</strong> was detected with an active report in your area.
            </p>

            {/* Existing Matched Issue Card */}
            <div className="bg-gray-50 dark:bg-gray-800/60 rounded-2xl p-4 border border-gray-200 dark:border-gray-700/60 mb-5">
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="px-2.5 py-0.5 bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 text-[10px] font-bold rounded-full capitalize">
                  {duplicateData.matchedChallenge?.category}
                </span>
                <span className="flex items-center text-xs font-bold text-gray-600 dark:text-gray-300">
                  <ThumbsUp className="w-3.5 h-3.5 mr-1 text-blue-600" />
                  {duplicateData.matchedChallenge?.upvote_count || 0} Upvotes
                </span>
              </div>

              <h4 className="text-sm font-bold text-gray-900 dark:text-white mb-1">
                {duplicateData.matchedChallenge?.title}
              </h4>
              <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2 mb-2 leading-relaxed">
                {duplicateData.matchedChallenge?.description}
              </p>
              
              <div className="flex items-center text-[11px] text-gray-500 dark:text-gray-400 pt-2 border-t border-gray-200 dark:border-gray-700">
                <MapPin className="w-3.5 h-3.5 mr-1 text-red-500 shrink-0" />
                <span className="truncate">{duplicateData.matchedChallenge?.location}</span>
              </div>
            </div>

            <p className="text-xs text-gray-600 dark:text-gray-400 mb-6 leading-relaxed bg-amber-50 dark:bg-amber-950/30 p-3.5 rounded-2xl border border-amber-200 dark:border-amber-900/40">
              💡 <strong>Why upvote?</strong> Upvoting the existing issue consolidates community votes, boosting its priority rank so municipal teams and student solvers resolve it faster!
            </p>

            {/* Modal Actions */}
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                type="button"
                onClick={() => handleUpvoteExisting(duplicateData.matchedChallenge.id)}
                disabled={isUpvotingExisting}
                className="flex-1 py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold rounded-xl transition-all shadow-md shadow-emerald-600/20 flex items-center justify-center gap-1.5 cursor-pointer"
              >
                {isUpvotingExisting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <ThumbsUp className="w-4 h-4" />
                    Upvote Existing Issue (+1)
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => executeChallengeSubmission(true)}
                disabled={loading}
                className="py-3 px-4 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200 text-xs font-extrabold rounded-xl transition-all cursor-pointer"
              >
                Post as Distinct Issue
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
