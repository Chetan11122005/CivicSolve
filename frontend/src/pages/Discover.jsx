import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { Search, MapPin, AlertCircle, ThumbsUp, Filter } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const CATEGORIES = ['water', 'health', 'education', 'infrastructure', 'environment', 'safety', 'other'];

export default function Discover() {
  const [challenges, setChallenges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showMobileFilters, setShowMobileFilters] = useState(false);

  // Filters
  const [search, setSearch] = useState('');
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [statusFilter, setStatusFilter] = useState('All');
  const [severityFilter, setSeverityFilter] = useState('All');
  const [sortBy, setSortBy] = useState('newest');
  
  // Pagination
  const [page, setPage] = useState(1);
  const itemsPerPage = 9;

  const navigate = useNavigate();

  useEffect(() => {
    fetchChallenges();
  }, []);

  const fetchChallenges = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('challenges')
        .select('*')
        .neq('status', 'pending_approval');
        
      if (error) throw error;
      setChallenges(data || []);
    } catch (err) {
      console.error("Error fetching challenges:", err);
    } finally {
      setLoading(false);
    }
  };

  const toggleCategory = (cat) => {
    if (selectedCategories.includes(cat)) {
      setSelectedCategories(selectedCategories.filter(c => c !== cat));
    } else {
      setSelectedCategories([...selectedCategories, cat]);
    }
    setPage(1);
  };

  // Process data: Filter and Sort
  let processed = [...challenges];

  if (search) {
    const s = search.toLowerCase();
    processed = processed.filter(c => 
      c.title.toLowerCase().includes(s) || 
      c.description.toLowerCase().includes(s) ||
      c.location.toLowerCase().includes(s)
    );
  }

  if (selectedCategories.length > 0) {
    processed = processed.filter(c => selectedCategories.includes(c.category));
  }

  if (statusFilter !== 'All') {
    processed = processed.filter(c => c.status === statusFilter);
  }

  if (severityFilter !== 'All') {
    processed = processed.filter(c => c.severity === severityFilter);
  }

  processed.sort((a, b) => {
    if (sortBy === 'newest') {
      return new Date(b.created_at) - new Date(a.created_at);
    }
    if (sortBy === 'upvoted') {
      return (b.upvote_count || 0) - (a.upvote_count || 0);
    }
    if (sortBy === 'urgent') {
      const severityScore = { high: 3, medium: 2, low: 1 };
      return severityScore[b.severity] - severityScore[a.severity];
    }
    return 0;
  });

  const totalPages = Math.ceil(processed.length / itemsPerPage) || 1;
  const paginatedChallenges = processed.slice((page - 1) * itemsPerPage, page * itemsPerPage);

  const getStatusColor = (status) => {
    switch (status) {
      case 'open': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-200';
      case 'in_progress': return 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-200';
      case 'solution_submitted': return 'bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-200';
      case 'solved': return 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200';
    }
  };

  const getSeverityIcon = (severity) => {
    switch (severity) {
      case 'high': return <AlertCircle className="w-4 h-4 text-red-500 inline mr-1" />;
      case 'medium': return <AlertCircle className="w-4 h-4 text-amber-500 inline mr-1" />;
      case 'low': return <AlertCircle className="w-4 h-4 text-green-500 inline mr-1" />;
      default: return null;
    }
  };

  const FiltersContent = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-3">Sort By</h3>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          className="w-full pl-3 pr-10 py-2.5 text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white appearance-none"
        >
          <option value="newest">Newest</option>
          <option value="upvoted">Most Upvoted</option>
          <option value="urgent">Most Urgent</option>
        </select>
      </div>

      <div>
        <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-3">Status</h3>
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="w-full pl-3 pr-10 py-2.5 text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white appearance-none"
        >
          <option value="All">All Statuses</option>
          <option value="open">Open</option>
          <option value="in_progress">In Progress</option>
          <option value="solution_submitted">Solution Submitted</option>
          <option value="solved">Solved</option>
        </select>
      </div>

      <div>
        <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-3">Severity</h3>
        <select
          value={severityFilter}
          onChange={(e) => { setSeverityFilter(e.target.value); setPage(1); }}
          className="w-full pl-3 pr-10 py-2.5 text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white appearance-none"
        >
          <option value="All">All Severities</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
      </div>

      <div>
        <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-3">Categories</h3>
        <div className="space-y-3">
          {CATEGORIES.map(cat => (
            <label key={cat} className="flex items-center group cursor-pointer">
              <div className="relative flex items-center justify-center">
                <input
                  type="checkbox"
                  checked={selectedCategories.includes(cat)}
                  onChange={() => toggleCategory(cat)}
                  className="peer appearance-none w-5 h-5 border-2 border-gray-300 dark:border-gray-600 rounded-md checked:bg-blue-600 checked:border-blue-600 transition-colors"
                />
                <svg className="absolute w-3 h-3 text-white pointer-events-none opacity-0 peer-checked:opacity-100" viewBox="0 0 14 10" fill="none">
                  <path d="M1 5L4.5 8.5L13 1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <span className="ml-3 text-sm text-gray-700 dark:text-gray-300 capitalize group-hover:text-gray-900 dark:group-hover:text-white transition-colors">
                {cat}
              </span>
            </label>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-[calc(100vh-64px)] bg-gray-50 dark:bg-gray-950 py-8 px-4 sm:px-6 lg:px-8 transition-colors">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white">Discover Challenges</h1>
          
          <div className="flex gap-2 w-full md:w-auto">
            <div className="relative flex-1 md:w-96">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Search challenges..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                className="block w-full pl-10 pr-3 py-2.5 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-shadow shadow-sm"
              />
            </div>
            <button 
              onClick={() => setShowMobileFilters(!showMobileFilters)}
              className="md:hidden p-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-700 dark:text-gray-300 shadow-sm"
            >
              <Filter className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="flex flex-col md:flex-row gap-8">
          {/* Filters Sidebar (Desktop) */}
          <div className="hidden md:block w-64 flex-shrink-0">
            <div className="sticky top-24 bg-white dark:bg-gray-900 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800">
              <FiltersContent />
            </div>
          </div>

          {/* Filters (Mobile) */}
          <AnimatePresence>
            {showMobileFilters && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="md:hidden overflow-hidden"
              >
                <div className="bg-white dark:bg-gray-900 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800 mb-6">
                  <FiltersContent />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Grid */}
          <div className="flex-1">
            {loading ? (
              <div className="grid grid-cols-1 xl:grid-cols-2 2xl:grid-cols-3 gap-6">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800 h-96 animate-pulse">
                    <div className="h-48 bg-gray-200 dark:bg-gray-800 rounded-t-xl"></div>
                    <div className="p-5 space-y-4">
                      <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-1/4"></div>
                      <div className="h-6 bg-gray-200 dark:bg-gray-800 rounded w-3/4"></div>
                      <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-1/2"></div>
                      <div className="pt-4 mt-auto border-t border-gray-100 dark:border-gray-800 flex justify-between">
                        <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-1/3"></div>
                        <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-1/4"></div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : processed.length === 0 ? (
              <motion.div 
                initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="text-center py-20 bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800"
              >
                <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Search className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">No challenges found</h3>
                <p className="text-gray-500 dark:text-gray-400">Try adjusting your filters or search terms.</p>
              </motion.div>
            ) : (
              <>
                <motion.div 
                  layout
                  className="grid grid-cols-1 xl:grid-cols-2 2xl:grid-cols-3 gap-6"
                >
                  <AnimatePresence>
                    {paginatedChallenges.map((challenge) => (
                      <motion.div 
                        layout
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        transition={{ duration: 0.2 }}
                        key={challenge.id} 
                        className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden flex flex-col hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
                      >
                        {challenge.image_url ? (
                          <div className="h-48 w-full bg-gray-200 dark:bg-gray-800 relative group">
                            <img src={challenge.image_url} alt={challenge.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                            <div className="absolute inset-0 bg-black/10 group-hover:bg-transparent transition-colors"></div>
                          </div>
                        ) : (
                          <div className="h-48 w-full bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-700 flex items-center justify-center text-gray-400 dark:text-gray-500">
                            No Image Provided
                          </div>
                        )}
                        
                        <div className="p-5 flex-1 flex flex-col relative bg-white dark:bg-gray-900">
                          <div className="flex justify-between items-start mb-3 gap-2">
                            <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200 capitalize">
                              {challenge.category}
                            </span>
                            <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold capitalize ${getStatusColor(challenge.status)}`}>
                              {challenge.status.replace('_', ' ')}
                            </span>
                          </div>
                          
                          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2 line-clamp-2" title={challenge.title}>
                            {challenge.title}
                          </h3>
                          
                          <div className="flex items-center text-sm text-gray-500 dark:text-gray-400 mb-6">
                            <MapPin className="w-4 h-4 mr-1.5 flex-shrink-0" />
                            <span className="truncate">{challenge.location}</span>
                          </div>

                          <div className="mt-auto pt-4 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between">
                            <div className="flex items-center gap-4">
                              <span className="flex items-center text-sm font-medium text-gray-600 dark:text-gray-400 capitalize bg-gray-50 dark:bg-gray-800 px-2 py-1 rounded-md">
                                {getSeverityIcon(challenge.severity)}
                                {challenge.severity}
                              </span>
                              <span className="flex items-center text-sm font-medium text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 px-2 py-1 rounded-md">
                                <ThumbsUp className="w-3.5 h-3.5 mr-1.5 text-gray-400" />
                                {challenge.upvote_count}
                              </span>
                            </div>
                            
                            <button 
                              onClick={() => navigate(`/challenge/${challenge.id}`)}
                              className="text-sm font-bold text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition-colors"
                            >
                              View &rarr;
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </motion.div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="mt-10 flex justify-center items-center space-x-4">
                    <button
                      disabled={page === 1}
                      onClick={() => setPage(p => p - 1)}
                      className="px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm font-bold text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 transition-colors shadow-sm"
                    >
                      Previous
                    </button>
                    <span className="px-4 py-2 text-sm font-medium text-gray-500 dark:text-gray-400">
                      Page {page} of {totalPages}
                    </span>
                    <button
                      disabled={page === totalPages}
                      onClick={() => setPage(p => p + 1)}
                      className="px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm font-bold text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 transition-colors shadow-sm"
                    >
                      Next
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
