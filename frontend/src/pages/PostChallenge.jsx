import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { UploadCloud, CheckCircle, AlertCircle, Sparkles, Loader2, MapPin, Navigation, X, Image as ImageIcon } from 'lucide-react';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { useTranslation } from 'react-i18next';

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
  };

  const handleRemoveFile = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setFile(null);
    setPreviewUrl(null);
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
          
          // Call free OpenStreetMap reverse geocoding API
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
          
          // Construct clean human-readable address
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

  const handleAiAssist = async () => {
    if (!description) {
      setError("Please write a brief description first so the AI can analyze it.");
      return;
    }

    const geminiKey = (import.meta.env.VITE_GEMINI_API_KEY || '').trim();
    const openRouterKey = (import.meta.env.VITE_OPENROUTER_API_KEY || '').trim();
    const apiKey = openRouterKey || geminiKey;

    if (!apiKey) {
      setError("Please set VITE_GEMINI_API_KEY or VITE_OPENROUTER_API_KEY in your .env file.");
      return;
    }

    setAiLoading(true);
    setError(null);

    try {
      const prompt = `
        Analyze the following civic issue description: "${description}"
        Also consider the title if provided: "${title}"
        
        Classify this issue. You must respond with ONLY a valid raw JSON object (no markdown formatting, no backticks).
        The JSON must have exactly two keys:
        - "category": Must be strictly one of these exact words: water, health, education, infrastructure, environment, safety, other
        - "severity": Must be strictly one of these exact words based on urgency: high, medium, low
      `;

      let responseText = "";

      const isOpenRouter = !!openRouterKey || apiKey.startsWith('sk-or-') || apiKey.startsWith('sk-');

      if (isOpenRouter) {
        // Use OpenRouter API with supported Gemini models & max_tokens limit
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

        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          console.error("OpenRouter Error Data:", errData);
          throw new Error(`OpenRouter error: ${response.status} ${response.statusText} - ${errData.error?.message || ''}`);
        }

        const data = await response.json();
        responseText = data.choices?.[0]?.message?.content || "";
      } else {
        // Use native Google Gemini SDK
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        const result = await model.generateContent(prompt);
        responseText = result.response.text();
      }
      
      // Robustly extract and parse JSON from the AI response
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error("Could not parse AI classification response. Raw response: " + responseText);
      }
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

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

      const { error: insertError } = await supabase.from('challenges').insert([
        {
          title,
          description,
          category,
          location,
          severity,
          image_url,
          posted_by: user.id
        }
      ]);

      if (insertError) throw insertError;

      setSuccess(true);
      setTimeout(() => navigate('/dashboard'), 2000);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
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
                    {aiLoading ? t('postChallenge.aiAnalyzing') : t('postChallenge.aiAssist')}
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

              {/* Upload Image with Live Preview */}
              <div>
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1.5">
                  {t('postChallenge.upload')}
                </label>

                {previewUrl ? (
                  /* Live Image Preview Container */
                  <div className="mt-1 relative rounded-2xl overflow-hidden border-2 border-blue-500/30 dark:border-blue-500/30 bg-gray-100 dark:bg-gray-800 p-2 group transition-all">
                    <div className="relative h-64 sm:h-72 w-full rounded-xl overflow-hidden bg-gray-900 flex items-center justify-center">
                      <img
                        src={previewUrl}
                        alt="Upload preview"
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                      />
                      
                      {/* Overlay & Controls */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex flex-col justify-between p-4">
                        <div className="flex justify-end">
                          <button
                            type="button"
                            onClick={handleRemoveFile}
                            className="flex items-center gap-1.5 bg-red-600/90 hover:bg-red-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-md cursor-pointer hover:scale-105"
                          >
                            <X className="w-4 h-4" />
                            <span>Remove Image</span>
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
                        {t('postChallenge.fileTypes')}
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
                {loading ? t('postChallenge.submitting') : t('postChallenge.submit')}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
