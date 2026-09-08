import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { 
  UploadCloud, 
  CheckCircle, 
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
  ExternalLink
} from 'lucide-react';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { useTranslation } from 'react-i18next';
import { validateCivicImageAndContent, checkDuplicateChallenge } from '../lib/aiValidation';

const CATEGORIES = ['water', 'health', 'education', 'infrastructure', 'environment', 'safety', 'other'];

export default function PostChallenge() {
  const { t } = useTranslation();
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

  // AI Assist: Suggest Category & Severity and refine
  const handleAiAssist = async () => {
    if (!description && !file) {
      setError("Please write a brief description or upload a photo first so the AI can analyze it.");
      return;
    }

    setAiLoading(true);
    setError(null);

    try {
      // If we have an image, run the full multimodal validation
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
          throw new Error(`AI Moderation Gate: The uploaded image was detected as out-of-context or invalid for civic reporting. (${aiScanResult.feedback}) Please remove or replace it with a valid photo of the problem.`);
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
        // Fallback for core schema
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
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-8 sm:p-12">
          
          <div className="mb-8 text-center">
            <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white">{t('postChallenge.heading')}</h1>
            <p className="mt-2 text-gray-600 dark:text-gray-400">{t('postChallenge.subheading')}</p>
          </div>

          {success ? (
            <div className="flex flex-col items-center justify-center py-12">
              <CheckCircle className="w-16 h-16 text-green-500 mb-4" />
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">{t('postChallenge.successTitle')}</h2>
              <p className="text-gray-500 dark:text-gray-400">{t('postChallenge.successDesc')}</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              
              <div>
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1.5">{t('postChallenge.title')}</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="block w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 dark:text-white transition-all"
                  placeholder={t('postChallenge.titlePlaceholder')}
                />
              </div>

              <div>
                <div className="flex justify-between items-end mb-1.5">
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-300">{t('postChallenge.description')}</label>
                  <button 
                    type="button" 
                    onClick={handleAiAssist}
                    disabled={aiLoading}
                    className="flex items-center text-xs font-bold bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 border border-indigo-200 dark:border-indigo-800 px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
                  >
                    {aiLoading ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5 mr-1.5" />}
                    {aiLoading ? t('postChallenge.aiAnalyzing') : "AI Auto-Assist & Validate"}
                  </button>
                </div>
                <textarea
                  required
                  rows={5}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="block w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 dark:text-white transition-all resize-none"
                  placeholder={t('postChallenge.descPlaceholder')}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1.5">{t('postChallenge.category')}</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="block w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 dark:text-white transition-all appearance-none capitalize"
                  >
                    {CATEGORIES.map(cat => (
                      <option key={cat} value={cat}>{t(`categories.${cat}`)}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1.5">{t('postChallenge.severity')}</label>
                  <select
                    value={severity}
                    onChange={(e) => setSeverity(e.target.value)}
                    className="block w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 dark:text-white transition-all appearance-none capitalize"
                  >
                    <option value="high">{t('discover.high')}</option>
                    <option value="medium">{t('discover.medium')}</option>
                    <option value="low">{t('discover.low')}</option>
                  </select>
                </div>
              </div>

              <div>
                <div className="flex justify-between items-end mb-1.5">
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-300">{t('postChallenge.location')}</label>
                  <button 
                    type="button" 
                    onClick={handleAutoDetectLocation}
                    disabled={locLoading}
                    className="flex items-center text-xs font-bold bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 border border-emerald-200 dark:border-emerald-800 px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
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
                    className="block w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 dark:text-white transition-all"
                    placeholder={t('postChallenge.locationPlaceholder')}
                  />
                  <MapPin className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                </div>
              </div>

              {/* Upload Image with Live AI Multimodal Inspector */}
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-300">
                    {t('postChallenge.upload')}
                  </label>
                  <span className="text-xs font-semibold text-gray-400 flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5 text-blue-500" /> AI Vision Verified
                  </span>
                </div>

                {previewUrl ? (
                  /* Live Image Preview & AI Inspector */
                  <div className="space-y-3">
                    <div className="relative rounded-2xl overflow-hidden border-2 border-blue-500/30 dark:border-blue-500/30 bg-gray-100 dark:bg-gray-800 p-2 group transition-all">
                      <div className="relative h-64 sm:h-72 w-full rounded-xl overflow-hidden bg-gray-900 flex items-center justify-center">
                        <img
                          src={previewUrl}
                          alt="Upload preview"
                          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                        />
                        
                        {/* Overlay & Controls */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex flex-col justify-between p-4">
                          <div className="flex justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => runAiValidation(file, title, description, category, location)}
                              disabled={isScanningImage}
                              className="flex items-center gap-1.5 bg-indigo-600/90 hover:bg-indigo-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-md cursor-pointer"
                              title="Re-scan with AI"
                            >
                              <RefreshCw className={`w-3.5 h-3.5 ${isScanningImage ? 'animate-spin' : ''}`} />
                              <span>Re-scan</span>
                            </button>
                            <button
                              type="button"
                              onClick={handleRemoveFile}
                              className="flex items-center gap-1.5 bg-red-600/90 hover:bg-red-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-md cursor-pointer hover:scale-105"
                            >
                              <X className="w-4 h-4" />
                              <span>Remove</span>
                            </button>
                          </div>

                          <div className="flex items-center justify-between text-white">
                            <div className="flex items-center gap-2 truncate max-w-[80%]">
                              <ImageIcon className="w-4 h-4 text-blue-400 flex-shrink-0" />
                              <span className="text-xs font-bold truncate">
                                {file?.name}
                              </span>
                            </div>
                            <span className="text-xs font-semibold text-gray-300 bg-white/20 backdrop-blur-md px-2 py-0.5 rounded-md flex-shrink-0">
                              {(file?.size / (1024 * 1024)).toFixed(2)} MB
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* AI Vision Validation Status Card */}
                    {isScanningImage ? (
                      <div className="p-4 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/60 rounded-xl flex items-center gap-3 animate-pulse">
                        <Loader2 className="w-5 h-5 text-blue-600 dark:text-blue-400 animate-spin shrink-0" />
                        <div>
                          <p className="text-xs font-bold text-blue-900 dark:text-blue-300">Gemini Multimodal Vision Inspector</p>
                          <p className="text-xs text-blue-700 dark:text-blue-400">Analyzing image quality, clarity, and civic context...</p>
                        </div>
                      </div>
                    ) : aiScanResult && (
                      <div className={`p-4 rounded-xl border transition-all ${
                        aiScanResult.isOutOfContext || (aiScanResult.isValidCivic === false && aiScanResult.relevanceScore < 40)
                          ? 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-900/60'
                          : aiScanResult.quality === 'blurry' || aiScanResult.quality === 'dark' || aiScanResult.quality === 'obstructed'
                          ? 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900/60'
                          : 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-900/60'
                      }`}>
                        <div className="flex items-start justify-between gap-3 mb-2">
                          <div className="flex items-center gap-2">
                            {aiScanResult.isOutOfContext || (aiScanResult.isValidCivic === false && aiScanResult.relevanceScore < 40) ? (
                              <ShieldAlert className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0" />
                            ) : aiScanResult.quality === 'blurry' || aiScanResult.quality === 'dark' || aiScanResult.quality === 'obstructed' ? (
                              <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0" />
                            ) : (
                              <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                            )}
                            <h4 className={`text-xs font-extrabold uppercase tracking-wider ${
                              aiScanResult.isOutOfContext || (aiScanResult.isValidCivic === false && aiScanResult.relevanceScore < 40)
                                ? 'text-red-900 dark:text-red-300'
                                : aiScanResult.quality === 'blurry' || aiScanResult.quality === 'dark' || aiScanResult.quality === 'obstructed'
                                ? 'text-amber-900 dark:text-amber-300'
                                : 'text-emerald-900 dark:text-emerald-300'
                            }`}>
                              {aiScanResult.isOutOfContext || (aiScanResult.isValidCivic === false && aiScanResult.relevanceScore < 40)
                                ? 'AI Alert: Out-of-Context Image'
                                : aiScanResult.quality === 'blurry' || aiScanResult.quality === 'dark' || aiScanResult.quality === 'obstructed'
                                ? `AI Notice: Quality is ${aiScanResult.quality}`
                                : 'AI Verified Civic Image'}
                            </h4>
                          </div>

                          <span className={`px-2 py-0.5 rounded-full text-[11px] font-extrabold ${
                            aiScanResult.relevanceScore >= 75
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300'
                              : aiScanResult.relevanceScore >= 50
                              ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300'
                              : 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300'
                          }`}>
                            Clarity: {aiScanResult.relevanceScore}%
                          </span>
                        </div>

                        <p className={`text-xs mb-3 leading-relaxed ${
                          aiScanResult.isOutOfContext || (aiScanResult.isValidCivic === false && aiScanResult.relevanceScore < 40)
                            ? 'text-red-700 dark:text-red-400'
                            : aiScanResult.quality === 'blurry' || aiScanResult.quality === 'dark' || aiScanResult.quality === 'obstructed'
                            ? 'text-amber-800 dark:text-amber-400'
                            : 'text-emerald-800 dark:text-emerald-300'
                        }`}>
                          {aiScanResult.feedback}
                        </p>

                        {/* Detected Elements Tags */}
                        {aiScanResult.detectedElements?.length > 0 && (
                          <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-black/5 dark:border-white/5">
                            <span className="text-[10px] font-bold text-gray-500 dark:text-gray-400 mr-1">Detected Objects:</span>
                            {aiScanResult.detectedElements.map((elem, idx) => (
                              <span key={idx} className="px-2 py-0.5 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 text-[10px] font-semibold rounded-md border border-gray-200 dark:border-gray-700 shadow-2xs">
                                {elem}
                              </span>
                            ))}
                          </div>
                        )}

                        {/* Recommendation Quick-Apply Button */}
                        {aiScanResult.suggestedCategory && aiScanResult.suggestedCategory !== category && (
                          <div className="mt-3 pt-2 border-t border-black/5 dark:border-white/5 flex items-center justify-between">
                            <span className="text-[11px] text-gray-600 dark:text-gray-400">
                              AI suggests: <strong className="capitalize">{aiScanResult.suggestedCategory}</strong> ({aiScanResult.suggestedSeverity})
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                setCategory(aiScanResult.suggestedCategory.toLowerCase());
                                if (aiScanResult.suggestedSeverity) setSeverity(aiScanResult.suggestedSeverity.toLowerCase());
                              }}
                              className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-[10px] font-bold transition-colors cursor-pointer"
                            >
                              Apply Category
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
                    className={`mt-1 flex justify-center px-6 pt-6 pb-6 border-2 border-dashed rounded-2xl transition-all ${
                      isDragging
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 scale-[1.01]'
                        : 'border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800'
                    }`}
                  >
                    <div className="space-y-2 text-center">
                      <div className="w-12 h-12 rounded-full bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 flex items-center justify-center mx-auto">
                        <UploadCloud className="h-6 w-6" />
                      </div>
                      <div className="flex text-sm text-gray-600 dark:text-gray-400 justify-center">
                        <label className="relative cursor-pointer bg-transparent rounded-md font-bold text-blue-600 dark:text-blue-400 hover:text-blue-500 focus-within:outline-none">
                          <span>{t('postChallenge.uploadPrompt')}</span>
                          <input
                            type="file"
                            className="sr-only"
                            accept="image/*"
                            onChange={(e) => handleFileSelect(e.target.files[0])}
                          />
                        </label>
                        <p className="pl-1">{t('postChallenge.orDrag')}</p>
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-500">
                        PNG, JPG, WebP up to 5MB (AI will check clarity and context)
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {error && (
                <div className="p-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                  <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-3.5 px-4 border border-transparent rounded-lg shadow-sm shadow-blue-600/20 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 transition-colors mt-6 cursor-pointer"
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Checking for duplicates & publishing...
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-gray-900 rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-gray-100 dark:border-gray-800 relative">
            
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-2xl bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                <CopyCheck className="w-6 h-6" />
              </div>
              <button 
                onClick={() => setDuplicateModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <h3 className="text-xl font-extrabold text-gray-900 dark:text-white mb-1">
              Similar Issue Already Reported!
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
              Our AI detected a <strong className="text-amber-600 dark:text-amber-400">{duplicateData.similarityScore}% match</strong> with an existing civic issue nearby.
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
              <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2 mb-2">
                {duplicateData.matchedChallenge?.description}
              </p>
              
              <div className="flex items-center text-[11px] text-gray-500 dark:text-gray-400 pt-2 border-t border-gray-200 dark:border-gray-700">
                <MapPin className="w-3.5 h-3.5 mr-1 text-red-500 shrink-0" />
                <span className="truncate">{duplicateData.matchedChallenge?.location}</span>
              </div>
            </div>

            <p className="text-xs text-gray-600 dark:text-gray-400 mb-6 leading-relaxed bg-amber-50 dark:bg-amber-950/30 p-3 rounded-xl border border-amber-200 dark:border-amber-900/40">
              💡 <strong>Why upvote?</strong> Upvoting the existing issue consolidates community votes, boosting its rank so university solvers and municipal teams solve it faster!
            </p>

            {/* Modal Actions */}
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                type="button"
                onClick={() => handleUpvoteExisting(duplicateData.matchedChallenge.id)}
                disabled={isUpvotingExisting}
                className="flex-1 py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-emerald-600/20 flex items-center justify-center gap-1.5 cursor-pointer"
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
                className="py-3 px-4 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200 text-xs font-bold rounded-xl transition-all cursor-pointer"
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
