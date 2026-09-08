import { Link, useNavigate } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';
import { Moon, Sun, LogOut, Globe } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

export default function Navbar() {
  const { theme, toggleTheme } = useTheme();
  const [user, setUser] = useState(null);
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => setUser(user));
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  const changeLanguage = (e) => {
    const lang = e.target.value;
    i18n.changeLanguage(lang);
    localStorage.setItem('i18nextLng', lang);
  };

  return (
    <nav className="sticky top-0 z-50 w-full backdrop-blur-lg bg-white/85 dark:bg-gray-950/85 border-b border-gray-200 dark:border-gray-800 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          
          <div className="flex items-center gap-6">
            <Link to="/" className="text-2xl font-extrabold text-blue-600 dark:text-blue-500 tracking-tight flex items-center gap-2">
              <span>CivicSolve</span>
            </Link>

            <Link to="/discover" className="hidden sm:inline-flex text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 font-semibold px-2 py-1 transition-colors">
              {t('navbar.discover')}
            </Link>
          </div>
          
          <div className="flex items-center gap-3 sm:gap-4">
            
            {/* Language Switcher */}
            <div className="flex items-center gap-1.5 bg-gray-100 dark:bg-gray-800/80 px-2.5 py-1.5 rounded-lg border border-gray-200/80 dark:border-gray-700/80 text-xs font-semibold text-gray-700 dark:text-gray-200">
              <Globe className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
              <select
                value={i18n.resolvedLanguage || 'en'}
                onChange={changeLanguage}
                className="bg-transparent border-none outline-none cursor-pointer text-xs font-bold text-gray-800 dark:text-gray-200"
              >
                <option value="en" className="bg-white dark:bg-gray-900">EN (English)</option>
                <option value="hi" className="bg-white dark:bg-gray-900">हिं (हिंदी)</option>
                <option value="ta" className="bg-white dark:bg-gray-900">தம (தமிழ்)</option>
              </select>
            </div>

            {/* Dark Mode Toggle */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800 transition-colors"
              aria-label="Toggle theme"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-gray-600" />}
            </button>

            {user ? (
              <>
                <Link to="/dashboard" className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white font-semibold text-sm px-2 py-1 transition-colors">
                  {t('navbar.dashboard')}
                </Link>
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/50 rounded-lg text-sm font-semibold transition-colors"
                >
                  <LogOut className="w-4 h-4" /> <span className="hidden sm:inline">{t('navbar.logout')}</span>
                </button>
              </>
            ) : (
              <>
                <Link to="/auth" className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white font-semibold text-sm px-2 py-1 transition-colors">
                  {t('navbar.login')}
                </Link>
                <Link to="/auth" className="bg-blue-600 text-white px-3.5 py-1.5 rounded-lg text-sm font-bold hover:bg-blue-700 transition-colors shadow-sm shadow-blue-600/20">
                  {t('navbar.signup')}
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
