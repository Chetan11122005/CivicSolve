import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { motion } from 'framer-motion';
import { ShieldCheck, Users, Lightbulb, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export default function Auth() {
  const { t } = useTranslation();
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState(null);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState('citizen');
  const [institutionName, setInstitutionName] = useState('');

  const navigate = useNavigate();

  // Redirect if already logged in
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        navigate('/dashboard');
      }
    });
  }, [navigate]);

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    setError(null);

    try {
      if (!isLogin) {
        // Save pending role selection to localStorage so it can be assigned upon OAuth callback
        localStorage.setItem(
          'pending_oauth_profile',
          JSON.stringify({
            role,
            institutionName: ['university', 'industry'].includes(role) ? institutionName : null,
            fullName: fullName.trim() || undefined,
          })
        );
      } else {
        localStorage.removeItem('pending_oauth_profile');
      }

      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/dashboard`,
          queryParams: {
            access_type: 'offline',
            prompt: 'select_account',
          },
        },
      });

      if (oauthError) throw oauthError;
    } catch (err) {
      console.error('Google Sign In Error:', err);
      setError(err.message || 'Failed to sign in with Google');
      setGoogleLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (isLogin) {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (signInError) throw signInError;
        
        navigate('/dashboard');
      } else {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
        });
        if (signUpError) throw signUpError;

        if (data?.user) {
          const { error: profileError } = await supabase
            .from('profiles')
            .upsert([
              {
                id: data.user.id,
                full_name: fullName.trim() || email.split('@')[0],
                role: role,
                institution_name: ['university', 'industry'].includes(role) ? institutionName : null,
              }
            ]);
            
          if (profileError) throw profileError;
        }

        navigate('/dashboard');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-64px)] flex bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100 transition-colors">
      {/* Left side - Graphic/Mission */}
      <div className="hidden lg:flex lg:w-1/2 bg-blue-600 dark:bg-blue-900 p-12 flex-col justify-between relative overflow-hidden text-white">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/30"></div>
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-white/10 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 -right-24 w-64 h-64 bg-blue-400/20 rounded-full blur-2xl"></div>
        
        <div className="relative z-10">
          <Link to="/" className="text-3xl font-extrabold tracking-tight mb-4 inline-block">CivicSolve</Link>
          <p className="text-blue-100 text-lg max-w-md">Bridging the gap between societal challenges and the teams ready to solve them.</p>
        </div>
        
        <div className="relative z-10 space-y-8">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center backdrop-blur-sm">
              <Users className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-lg">{t('auth.collaborateTitle', 'Collaborate')}</h3>
              <p className="text-blue-100 text-sm">{t('auth.collaborateDesc', 'Join forces with citizens, universities, and industry.')}</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center backdrop-blur-sm">
              <Lightbulb className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-lg">{t('auth.innovateTitle', 'Innovate')}</h3>
              <p className="text-blue-100 text-sm">{t('auth.innovateDesc', 'Develop solutions that matter to the real world.')}</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center backdrop-blur-sm">
              <ShieldCheck className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-lg">{t('auth.verifyTitle', 'Verify')}</h3>
              <p className="text-blue-100 text-sm">{t('auth.verifyDesc', 'Deploy and verify solutions directly in the community.')}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Right side - Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 sm:p-12">
        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-md space-y-7"
        >
          <div>
            <h2 className="text-3xl font-extrabold text-gray-900 dark:text-white">
              {isLogin ? t('auth.welcomeBack', 'Welcome back') : t('auth.createAccount', 'Create an account')}
            </h2>
            <p className="mt-2 text-gray-600 dark:text-gray-400">
              {isLogin ? t('auth.signInDesc', 'Please sign in to your account.') : t('auth.signUpDesc', 'Join CivicSolve to start making an impact.')}
            </p>
          </div>

          {/* Google Sign In Button */}
          <div>
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={loading || googleLoading}
              className="w-full flex items-center justify-center gap-3 py-3 px-4 border border-gray-300 dark:border-gray-700 rounded-xl shadow-xs bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-200 font-semibold text-sm hover:bg-gray-50 dark:hover:bg-gray-800/80 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 transition-all cursor-pointer hover:border-gray-400 dark:hover:border-gray-600 hover:shadow-sm"
            >
              {googleLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
                  <span>{t('auth.connectingGoogle', 'Connecting to Google...')}</span>
                </>
              ) : (
                <>
                  <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17Z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24Z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.28 14.27a7.22 7.22 0 0 1 0-4.54V6.58H1.25a11.979 11.979 0 0 0 0 10.84l4.03-3.15Z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98Z"
                    />
                  </svg>
                  <span>
                    {isLogin 
                      ? t('auth.signInWithGoogle', 'Sign in with Google') 
                      : t('auth.signUpWithGoogle', 'Sign up with Google')}
                  </span>
                </>
              )}
            </button>
          </div>

          {/* Divider */}
          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200 dark:border-gray-800"></div>
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white dark:bg-gray-950 px-3 text-gray-500 dark:text-gray-400 font-semibold tracking-wider">
                {t('auth.orContinueWithEmail', 'Or continue with email')}
              </span>
            </div>
          </div>

          <form className="space-y-4" onSubmit={handleSubmit}>
            {!isLogin && (
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  {t('auth.fullName', 'Full Name')}
                </label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="block w-full px-4 py-2.5 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg shadow-2xs focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all dark:text-white"
                  placeholder={t('auth.fullNamePlaceholder', 'Jane Doe')}
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                {t('auth.emailAddress', 'Email address')}
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="block w-full px-4 py-2.5 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg shadow-2xs focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all dark:text-white"
                placeholder={t('auth.emailPlaceholder', 'you@example.com')}
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                {t('auth.password', 'Password')}
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="block w-full px-4 py-2.5 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg shadow-2xs focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all dark:text-white"
                placeholder="••••••••"
              />
            </div>

            {!isLogin && (
              <div className="space-y-4 pt-1">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    {t('auth.role', 'Role')}
                  </label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    className="block w-full px-4 py-2.5 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg shadow-2xs focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all dark:text-white cursor-pointer"
                  >
                    <option value="citizen">{t('auth.citizenRole', 'Citizen (Post Challenges)')}</option>
                    <option value="university">{t('auth.universityRole', 'University (Solve Challenges)')}</option>
                    <option value="industry">{t('auth.industryRole', 'Industry (Sponsor & Solve)')}</option>
                  </select>
                </div>

                {['university', 'industry'].includes(role) && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="overflow-hidden"
                  >
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                      {t('auth.institutionName', 'Institution Name')}
                    </label>
                    <input
                      type="text"
                      required
                      value={institutionName}
                      onChange={(e) => setInstitutionName(e.target.value)}
                      className="block w-full px-4 py-2.5 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg shadow-2xs focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all dark:text-white"
                      placeholder={t('auth.institutionPlaceholder', 'e.g. State University or Tech Corp')}
                    />
                  </motion.div>
                )}
              </div>
            )}

            {error && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 rounded-lg text-sm"
              >
                {error}
              </motion.div>
            )}

            <button
              type="submit"
              disabled={loading || googleLoading}
              className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 focus:outline-hidden focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 transition-colors mt-6 cursor-pointer"
            >
              {loading 
                ? t('auth.processing', 'Processing...') 
                : isLogin 
                  ? t('auth.signInBtn', 'Sign in') 
                  : t('auth.createAccountBtn', 'Create account')}
            </button>
          </form>

          <div className="text-center pt-2">
            <button
              onClick={() => {
                setIsLogin(!isLogin);
                setError(null);
              }}
              className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-500 transition-colors cursor-pointer"
            >
              {isLogin 
                ? t('auth.noAccount', "Don't have an account? Sign up") 
                : t('auth.haveAccount', 'Already have an account? Sign in')}
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
