import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { UploadCloud, CheckCircle, AlertCircle, Sparkles, Loader2 } from 'lucide-react';
import { GoogleGenerativeAI } from '@google/generative-ai';

const CATEGORIES = ['water', 'health', 'education', 'infrastructure', 'environment', 'safety', 'other'];

export default function PostChallenge() {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('infrastructure');
  const [location, setLocation] = useState('');
  const [severity, setSeverity] = useState('medium');
  const [file, setFile] = useState(null);
  
  const [loading, setLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const navigate = useNavigate();

  const handleAiAssist = async () => {
    if (!description) {
      setError("Please write a brief description first so the AI can analyze it.");
      return;
    }

    const geminiKey = import.meta.env.VITE_GEMINI_API_KEY;
    const openRouterKey = import.meta.env.VITE_OPENROUTER_API_KEY;
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

      if (apiKey.startsWith('sk-or-')) {
        // Use OpenRouter API
        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${apiKey}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            model: "google/gemini-flash-1.5",
            messages: [{ role: "user", content: prompt }]
          })
        });

        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          console.error("OpenRouter Error Data:", errData);
          throw new Error(`OpenRouter error: ${response.status} ${response.statusText} - ${errData.error?.message || ''}`);
        }

        const data = await response.json();
        responseText = data.choices[0].message.content;
      } else {
        // Use native Google Gemini SDK
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        const result = await model.generateContent(prompt);
        responseText = result.response.text();
      }
      
      // Clean up markdown if the AI mistakenly includes it
      const cleanJson = responseText.replace(/```json/gi, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(cleanJson);

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
            <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white">Post a Civic Challenge</h1>
            <p className="mt-2 text-gray-600 dark:text-gray-400">Describe the problem in your community so solvers can help.</p>
          </div>

          {success ? (
            <div className="flex flex-col items-center justify-center py-12">
              <CheckCircle className="w-16 h-16 text-green-500 mb-4" />
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Challenge Posted!</h2>
              <p className="text-gray-500 dark:text-gray-400">It is now pending admin approval. Redirecting...</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              
              <div>
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1.5">Title</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="block w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 dark:text-white transition-all"
                  placeholder="e.g., Potholes on Main Street"
                />
              </div>

              <div>
                <div className="flex justify-between items-end mb-1.5">
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-300">Description</label>
                  <button 
                    type="button" 
                    onClick={handleAiAssist}
                    disabled={aiLoading}
                    className="flex items-center text-xs font-bold bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 border border-indigo-200 dark:border-indigo-800 px-3 py-1.5 rounded-lg transition-colors"
                  >
                    {aiLoading ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5 mr-1.5" />}
                    {aiLoading ? 'Analyzing...' : 'Auto-Categorize with AI'}
                  </button>
                </div>
                <textarea
                  required
                  rows={5}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="block w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 dark:text-white transition-all resize-none"
                  placeholder="Describe the issue, its impact, and what kind of solution you're looking for..."
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1.5">Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="block w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 dark:text-white transition-all appearance-none capitalize"
                  >
                    {CATEGORIES.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1.5">Severity</label>
                  <select
                    value={severity}
                    onChange={(e) => setSeverity(e.target.value)}
                    className="block w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 dark:text-white transition-all appearance-none capitalize"
                  >
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1.5">Location</label>
                <input
                  type="text"
                  required
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="block w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 dark:text-white transition-all"
                  placeholder="e.g., Downtown District, City Name"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1.5">Upload Image (Optional)</label>
                <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 dark:border-gray-700 border-dashed rounded-lg bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                  <div className="space-y-1 text-center">
                    <UploadCloud className="mx-auto h-12 w-12 text-gray-400" />
                    <div className="flex text-sm text-gray-600 dark:text-gray-400 justify-center">
                      <label className="relative cursor-pointer bg-transparent rounded-md font-bold text-blue-600 dark:text-blue-400 hover:text-blue-500 focus-within:outline-none">
                        <span>Upload a file</span>
                        <input type="file" className="sr-only" accept="image/*" onChange={(e) => setFile(e.target.files[0])} />
                      </label>
                      <p className="pl-1">or drag and drop</p>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-500">
                      {file ? file.name : "PNG, JPG, GIF up to 5MB"}
                    </p>
                  </div>
                </div>
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
                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm shadow-blue-600/20 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 transition-colors mt-6"
              >
                {loading ? 'Posting...' : 'Submit Challenge'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
