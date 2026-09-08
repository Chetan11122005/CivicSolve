import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { ArrowRight, Globe, CheckCircle, Building2, Briefcase, MapPin, Sparkles, ShieldCheck, Zap, Activity, Users, Lightbulb, Map } from 'lucide-react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';

export default function Home() {
  const { t } = useTranslation();
  const [stats, setStats] = useState({
    total: 0,
    solved: 0,
    universities: 0,
    industry: 0
  });
  const [featuredChallenges, setFeaturedChallenges] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchHomepageData();
  }, []);

  const fetchHomepageData = async () => {
    try {
      const [
        { count: totalChallenges }, 
        { count: solvedChallenges }, 
        { count: universityCount }, 
        { count: industryCount }, 
        { data: featured }
      ] = await Promise.all([
        supabase.from('challenges').select('*', { count: 'exact', head: true }),
        supabase.from('challenges').select('*', { count: 'exact', head: true }).eq('status', 'solved'),
        supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'university'),
        supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'industry'),
        supabase.from('challenges').select('*, solutions(*)').eq('is_featured', true).limit(3)
      ]);

      setStats({
        total: totalChallenges || 0,
        solved: solvedChallenges || 0,
        universities: universityCount || 0,
        industry: industryCount || 0
      });
      setFeaturedChallenges(featured || []);
    } catch (error) {
      console.error("Error fetching homepage data:", error);
    } finally {
      setLoading(false);
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.2 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } }
  };

  return (
    <div className="flex flex-col bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100 transition-colors overflow-hidden">
      
      {/* Hero Section */}
      <main className="flex-grow">
        <div className="relative overflow-hidden w-full pt-20 pb-24 lg:pt-32 lg:pb-40">
          {/* Animated Glowing Orbs */}
          <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-blue-500/30 dark:bg-blue-600/20 rounded-full blur-[100px] animate-pulse pointer-events-none -translate-x-1/2 -translate-y-1/2"></div>
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/20 dark:bg-purple-600/20 rounded-full blur-[120px] animate-pulse pointer-events-none translate-x-1/2 translate-y-1/2" style={{ animationDelay: '2s' }}></div>
          
          <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            
            <motion.div variants={containerVariants} initial="hidden" animate="visible">
              <motion.h1 variants={itemVariants} className="text-5xl md:text-7xl font-extrabold tracking-tight text-gray-900 dark:text-white mb-6 leading-tight">
                {t('hero.titleLine1')} <br className="hidden md:block" /> 
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-400 dark:to-purple-400">
                  {t('hero.titleLine2')}
                </span>
              </motion.h1>
              
              <motion.p variants={itemVariants} className="max-w-2xl text-xl text-gray-600 dark:text-gray-400 mx-auto mb-10 leading-relaxed">
                {t('hero.subtitle')}
              </motion.p>
              
              <motion.div variants={itemVariants} className="flex flex-col sm:flex-row justify-center gap-4">
                <Link to="/post-challenge" className="inline-flex justify-center items-center px-8 py-3.5 border border-transparent text-base font-bold rounded-xl text-white bg-blue-600 hover:bg-blue-700 md:text-lg shadow-lg shadow-blue-600/30 transition-all hover:scale-105 hover:-translate-y-1">
                  {t('hero.postChallengeBtn')}
                </Link>
                <Link to="/discover" className="inline-flex justify-center items-center px-8 py-3.5 border border-gray-200 dark:border-gray-800 text-base font-bold rounded-xl text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800 md:text-lg shadow-sm transition-all hover:scale-105 hover:-translate-y-1">
                  {t('hero.exploreBtn')}
                </Link>
              </motion.div>
            </motion.div>
          </div>
        </div>

        {/* Live Stats Bar */}
        <div className="bg-gray-900 dark:bg-black py-16 border-y border-gray-800">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-2 gap-8 md:grid-cols-4 text-center">
              <div>
                <div className="flex items-center justify-center text-blue-500 mb-3"><Globe className="w-8 h-8" /></div>
                <div className="text-4xl md:text-5xl font-extrabold text-white mb-2">{stats.total}</div>
                <div className="text-sm font-bold text-gray-400 uppercase tracking-widest">{t('stats.posted')}</div>
              </div>
              <div>
                <div className="flex items-center justify-center text-green-500 mb-3"><CheckCircle className="w-8 h-8" /></div>
                <div className="text-4xl md:text-5xl font-extrabold text-white mb-2">{stats.solved}</div>
                <div className="text-sm font-bold text-gray-400 uppercase tracking-widest">{t('stats.solved')}</div>
              </div>
              <div>
                <div className="flex items-center justify-center text-purple-500 mb-3"><Building2 className="w-8 h-8" /></div>
                <div className="text-4xl md:text-5xl font-extrabold text-white mb-2">{stats.universities}</div>
                <div className="text-sm font-bold text-gray-400 uppercase tracking-widest">{t('stats.institutions')}</div>
              </div>
              <div>
                <div className="flex items-center justify-center text-amber-500 mb-3"><Briefcase className="w-8 h-8" /></div>
                <div className="text-4xl md:text-5xl font-extrabold text-white mb-2">{stats.industry}</div>
                <div className="text-sm font-bold text-gray-400 uppercase tracking-widest">{t('stats.industry')}</div>
              </div>
            </div>
          </div>
        </div>

        {/* How It Works Pipeline */}
        <div className="py-24 bg-gray-50 dark:bg-gray-950 relative">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900 dark:text-white mb-4">{t('howItWorks.title')}</h2>
              <p className="text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">{t('howItWorks.subtitle')}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-12 relative">
              {/* Connector line for desktop */}
              <div className="hidden md:block absolute top-12 left-1/6 right-1/6 h-0.5 bg-gradient-to-r from-blue-200 via-blue-500 to-green-500 dark:from-gray-800 dark:via-blue-600 dark:to-green-600 z-0"></div>

              <div className="relative z-10 flex flex-col items-center text-center">
                <div className="w-24 h-24 bg-white dark:bg-gray-900 rounded-full flex items-center justify-center shadow-xl border border-gray-100 dark:border-gray-800 mb-6 group transition-transform hover:scale-110">
                  <Lightbulb className="w-10 h-10 text-blue-600 dark:text-blue-400 group-hover:text-blue-500" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">{t('howItWorks.step1Title')}</h3>
                <p className="text-gray-600 dark:text-gray-400 leading-relaxed">{t('howItWorks.step1Desc')}</p>
              </div>

              <div className="relative z-10 flex flex-col items-center text-center">
                <div className="w-24 h-24 bg-white dark:bg-gray-900 rounded-full flex items-center justify-center shadow-xl border border-gray-100 dark:border-gray-800 mb-6 group transition-transform hover:scale-110">
                  <Users className="w-10 h-10 text-purple-600 dark:text-purple-400 group-hover:text-purple-500" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">{t('howItWorks.step2Title')}</h3>
                <p className="text-gray-600 dark:text-gray-400 leading-relaxed">{t('howItWorks.step2Desc')}</p>
              </div>

              <div className="relative z-10 flex flex-col items-center text-center">
                <div className="w-24 h-24 bg-white dark:bg-gray-900 rounded-full flex items-center justify-center shadow-xl border border-gray-100 dark:border-gray-800 mb-6 group transition-transform hover:scale-110">
                  <ShieldCheck className="w-10 h-10 text-green-600 dark:text-green-400 group-hover:text-green-500" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">{t('howItWorks.step3Title')}</h3>
                <p className="text-gray-600 dark:text-gray-400 leading-relaxed">{t('howItWorks.step3Desc')}</p>
              </div>
            </div>
          </div>
        </div>

        {/* AI & Features Bento Box */}
        <div className="py-24 bg-white dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900 dark:text-white mb-4">{t('bento.title')}</h2>
              <p className="text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">{t('bento.subtitle')}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 auto-rows-[250px]">
              
              {/* Feature 1 (Large) */}
              <div className="md:col-span-2 bg-gradient-to-br from-indigo-50 to-blue-50 dark:from-indigo-900/20 dark:to-blue-900/20 rounded-3xl p-8 border border-indigo-100 dark:border-indigo-800/50 flex flex-col justify-end relative overflow-hidden group">
                <div className="absolute top-6 right-6 w-16 h-16 bg-white dark:bg-gray-900 rounded-2xl flex items-center justify-center shadow-sm">
                  <Sparkles className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />
                </div>
                <div className="relative z-10">
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">{t('bento.aiTitle')}</h3>
                  <p className="text-gray-600 dark:text-gray-300 max-w-md">{t('bento.aiDesc')}</p>
                </div>
                <div className="absolute -bottom-10 -right-10 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl group-hover:bg-blue-500/20 transition-colors"></div>
              </div>

              {/* Feature 2 (Small) */}
              <div className="bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 rounded-3xl p-8 border border-emerald-100 dark:border-emerald-800/50 flex flex-col justify-end relative overflow-hidden group">
                <div className="absolute top-6 right-6 w-12 h-12 bg-white dark:bg-gray-900 rounded-xl flex items-center justify-center shadow-sm">
                  <Activity className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div className="relative z-10">
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">{t('bento.liveTitle')}</h3>
                  <p className="text-gray-600 dark:text-gray-300 text-sm">{t('bento.liveDesc')}</p>
                </div>
              </div>

              {/* Feature 3 (Small) */}
              <div className="bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-900/20 dark:to-amber-900/20 rounded-3xl p-8 border border-orange-100 dark:border-orange-800/50 flex flex-col justify-end relative overflow-hidden group">
                <div className="absolute top-6 right-6 w-12 h-12 bg-white dark:bg-gray-900 rounded-xl flex items-center justify-center shadow-sm">
                  <Map className="w-6 h-6 text-orange-600 dark:text-orange-400" />
                </div>
                <div className="relative z-10">
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">{t('bento.geoTitle')}</h3>
                  <p className="text-gray-600 dark:text-gray-300 text-sm">{t('bento.geoDesc')}</p>
                </div>
              </div>

              {/* Feature 4 (Large) */}
              <div className="md:col-span-2 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-3xl p-8 border border-purple-100 dark:border-purple-800/50 flex flex-col justify-end relative overflow-hidden group">
                <div className="absolute top-6 right-6 w-16 h-16 bg-white dark:bg-gray-900 rounded-2xl flex items-center justify-center shadow-sm">
                  <Zap className="w-8 h-8 text-purple-600 dark:text-purple-400" />
                </div>
                <div className="relative z-10">
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">{t('bento.verifyTitle')}</h3>
                  <p className="text-gray-600 dark:text-gray-300 max-w-md">{t('bento.verifyDesc')}</p>
                </div>
                <div className="absolute -bottom-10 -left-10 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl group-hover:bg-purple-500/20 transition-colors"></div>
              </div>

            </div>
          </div>
        </div>

        {/* Success Stories Section */}
        <div className="py-24 bg-gray-50 dark:bg-gray-950 border-t border-gray-100 dark:border-gray-800">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900 dark:text-white mb-4">{t('successStories.title')}</h2>
              <p className="text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">{t('successStories.subtitle')}</p>
            </div>

            {loading ? (
              <div className="text-center text-gray-500 dark:text-gray-400 py-12">{t('successStories.loading')}</div>
            ) : featuredChallenges.length === 0 ? (
              <div className="text-center text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-900 p-12 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm">
                {t('successStories.empty')}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {featuredChallenges.map((challenge) => {
                  const verifiedSolution = challenge.solutions?.find(s => s.status === 'verified');
                  const summaryText = verifiedSolution ? verifiedSolution.summary : 'Solved successfully by the community.';

                  return (
                    <Link to={`/challenge/${challenge.id}`} key={challenge.id} className="group block h-full">
                      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 overflow-hidden flex flex-col h-full group-hover:shadow-2xl group-hover:border-blue-500/50 group-hover:-translate-y-2 transition-all duration-300 relative">
                        
                        <div className="absolute top-4 right-4 z-10 bg-green-500/90 backdrop-blur-sm text-white px-3 py-1 rounded-full text-xs font-bold shadow-sm flex items-center">
                          <ShieldCheck className="w-3.5 h-3.5 mr-1" /> {t('successStories.verified')}
                        </div>

                        {challenge.image_url ? (
                           <div className="h-52 w-full bg-gray-200 dark:bg-gray-800 overflow-hidden relative">
                             <img src={challenge.image_url} alt={challenge.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                             <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent"></div>
                           </div>
                        ) : (
                          <div className="h-52 w-full bg-gradient-to-br from-green-400 to-blue-500"></div>
                        )}
                        
                        <div className="p-6 flex-1 flex flex-col">
                          <div className="flex items-center text-xs font-bold text-blue-600 dark:text-blue-400 mb-3 uppercase tracking-wider">
                            <MapPin className="w-3.5 h-3.5 mr-1" /> {challenge.location}
                          </div>
                          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3 line-clamp-2">{challenge.title}</h3>
                          <p className="text-gray-600 dark:text-gray-400 text-sm mb-6 flex-1 line-clamp-3">
                            <span className="font-semibold text-gray-900 dark:text-white block mb-1">{t('successStories.theSolution')}</span>
                            {summaryText}
                          </p>
                          <div className="flex items-center text-blue-600 dark:text-blue-400 font-bold text-sm group-hover:text-blue-700 dark:group-hover:text-blue-300">
                            {t('successStories.readCaseStudy')} <ArrowRight className="ml-1.5 w-4 h-4 group-hover:translate-x-1 transition-transform" />
                          </div>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Call to Action */}
        <div className="bg-blue-600 dark:bg-blue-900 py-20 relative overflow-hidden">
          <div className="absolute top-0 right-0 -translate-y-12 translate-x-1/3 w-96 h-96 bg-white/10 rounded-full blur-3xl pointer-events-none"></div>
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
            <h2 className="text-3xl md:text-5xl font-extrabold text-white mb-6">{t('cta.title')}</h2>
            <p className="text-xl text-blue-100 mb-10">{t('cta.subtitle')}</p>
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <Link to="/auth" className="inline-flex justify-center items-center px-8 py-4 border border-transparent text-lg font-bold rounded-xl text-blue-600 bg-white hover:bg-gray-50 shadow-xl transition-transform hover:scale-105">
                {t('cta.joinBtn')}
              </Link>
            </div>
          </div>
        </div>

      </main>

      {/* Footer */}
      <footer className="bg-gray-900 dark:bg-black py-12 text-center text-gray-400">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-center gap-2 mb-6">
            <Globe className="w-6 h-6 text-white" />
            <div className="text-2xl font-bold text-white tracking-tight">CivicSolve</div>
          </div>
          <div className="flex flex-col sm:flex-row justify-center items-center gap-6 mb-8 text-sm font-medium">
            <Link to="/auth" className="hover:text-white transition-colors">{t('footer.citizen')}</Link>
            <span className="hidden sm:inline opacity-30">•</span>
            <Link to="/auth" className="hover:text-white transition-colors">{t('footer.university')}</Link>
            <span className="hidden sm:inline opacity-30">•</span>
            <Link to="/auth" className="hover:text-white transition-colors">{t('footer.industry')}</Link>
          </div>
          <p className="text-sm opacity-60">{t('footer.rights')}</p>
        </div>
      </footer>

    </div>
  );
}
