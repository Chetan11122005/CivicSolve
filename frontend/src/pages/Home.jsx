import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { ArrowRight, Globe, CheckCircle, Building2, Briefcase, MapPin } from 'lucide-react';
import { motion } from 'framer-motion';

export default function Home() {
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
        supabase.from('challenges').select('*, solutions(summary, status)').eq('is_featured', true).eq('status', 'solved').limit(3)
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

  return (
    <div className="flex flex-col bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100 transition-colors">
      
      {/* Hero Section */}
      <main className="flex-grow">
        <div className="relative overflow-hidden max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
          {/* Subtle gradient mesh background */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] opacity-30 dark:opacity-20 pointer-events-none">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-400 to-purple-500 blur-[100px] rounded-full"></div>
          </div>
          
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="relative z-10 text-5xl md:text-6xl font-extrabold tracking-tight text-gray-900 dark:text-white mb-6"
          >
            Where real problems <br className="hidden md:block" /> meet real solvers.
          </motion.h1>
          <p className="relative z-10 mt-4 max-w-2xl text-xl text-gray-500 dark:text-gray-400 mx-auto mb-10">
            A collaborative platform bridging the gap between citizens facing societal challenges and the university teams and industry experts ready to solve them.
          </p>
          <div className="relative z-10 flex flex-col sm:flex-row justify-center gap-4">
            <Link to="/post-challenge" className="inline-flex justify-center items-center px-8 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 md:text-lg shadow-lg shadow-blue-600/30 transition-transform hover:scale-105">
              Post a Challenge
            </Link>
            <Link to="/discover" className="inline-flex justify-center items-center px-8 py-3 border border-gray-300 dark:border-gray-700 text-base font-medium rounded-md text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 md:text-lg transition-transform hover:scale-105">
              Explore Challenges
            </Link>
          </div>
        </div>

        {/* Live Stats Bar */}
        <div className="bg-blue-600 dark:bg-blue-900 py-12 relative overflow-hidden">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
            <div className="grid grid-cols-2 gap-8 md:grid-cols-4 text-center">
              <div>
                <div className="flex items-center justify-center text-blue-200 mb-2"><Globe className="w-8 h-8" /></div>
                <div className="text-4xl font-extrabold text-white">{stats.total}</div>
                <div className="mt-2 text-sm font-medium text-blue-100 uppercase tracking-wide">Challenges Posted</div>
              </div>
              <div>
                <div className="flex items-center justify-center text-blue-200 mb-2"><CheckCircle className="w-8 h-8" /></div>
                <div className="text-4xl font-extrabold text-white">{stats.solved}</div>
                <div className="mt-2 text-sm font-medium text-blue-100 uppercase tracking-wide">Challenges Solved</div>
              </div>
              <div>
                <div className="flex items-center justify-center text-blue-200 mb-2"><Building2 className="w-8 h-8" /></div>
                <div className="text-4xl font-extrabold text-white">{stats.universities}</div>
                <div className="mt-2 text-sm font-medium text-blue-100 uppercase tracking-wide">Institutions Involved</div>
              </div>
              <div>
                <div className="flex items-center justify-center text-blue-200 mb-2"><Briefcase className="w-8 h-8" /></div>
                <div className="text-4xl font-extrabold text-white">{stats.industry}</div>
                <div className="mt-2 text-sm font-medium text-blue-100 uppercase tracking-wide">Industry Partners</div>
              </div>
            </div>
          </div>
        </div>

        {/* Success Stories Section */}
        <div className="py-20 bg-gray-50 dark:bg-gray-950">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight sm:text-4xl">Success Stories</h2>
              <p className="mt-4 max-w-2xl text-xl text-gray-500 dark:text-gray-400 mx-auto">Real-world impact created by collaborative teams across the nation.</p>
            </div>

            {loading ? (
              <div className="text-center text-gray-500 dark:text-gray-400">Loading success stories...</div>
            ) : featuredChallenges.length === 0 ? (
              <div className="text-center text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-900 p-10 rounded-lg border border-gray-200 dark:border-gray-800">
                Check back soon for featured success stories!
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {featuredChallenges.map((challenge) => {
                  const verifiedSolution = challenge.solutions?.find(s => s.status === 'verified');
                  const summaryText = verifiedSolution ? verifiedSolution.summary : 'Solved successfully by the community.';

                  return (
                    <div key={challenge.id} className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden flex flex-col hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
                      {challenge.image_url ? (
                         <div className="h-48 w-full bg-gray-200 dark:bg-gray-800">
                           <img src={challenge.image_url} alt={challenge.title} className="w-full h-full object-cover" />
                         </div>
                      ) : (
                        <div className="h-48 w-full bg-gradient-to-br from-green-400 to-blue-500"></div>
                      )}
                      
                      <div className="p-6 flex-1 flex flex-col">
                        <div className="flex items-center text-xs text-gray-500 dark:text-gray-400 mb-2">
                          <MapPin className="w-3 h-3 mr-1" /> {challenge.location}
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">{challenge.title}</h3>
                        <p className="text-gray-600 dark:text-gray-300 text-sm mb-4 flex-1 line-clamp-3">
                          <span className="font-semibold text-gray-900 dark:text-white">The Solution: </span>
                          {summaryText}
                        </p>
                        <Link to={`/challenge/${challenge.id}`} className="inline-flex items-center text-blue-600 dark:text-blue-400 font-medium hover:text-blue-500">
                          Read full case study <ArrowRight className="ml-2 w-4 h-4" />
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-gray-900 dark:bg-black py-12 text-center text-gray-400">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-2xl font-bold text-white mb-6">CivicSolve</div>
          <div className="flex flex-col sm:flex-row justify-center items-center gap-6 mb-8 text-sm">
            <Link to="/auth" className="hover:text-white transition-colors">Sign up as a Citizen</Link>
            <span className="hidden sm:inline">•</span>
            <Link to="/auth" className="hover:text-white transition-colors">Join as a University</Link>
            <span className="hidden sm:inline">•</span>
            <Link to="/auth" className="hover:text-white transition-colors">Partner as Industry</Link>
          </div>
          <p className="text-sm">Built for Smart India Hackathon.</p>
        </div>
      </footer>

    </div>
  );
}
