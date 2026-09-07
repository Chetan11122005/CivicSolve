import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { Search, MapPin, AlertCircle, ThumbsUp } from 'lucide-react';

const CATEGORIES = ['water', 'health', 'education', 'infrastructure', 'environment', 'safety', 'other'];

export default function Discover() {
  const [challenges, setChallenges] = useState([]);
  const [loading, setLoading] = useState(true);

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
    setPage(1); // Reset page on filter change
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

  const totalPages = Math.ceil(processed.length / itemsPerPage);
  const paginatedChallenges = processed.slice((page - 1) * itemsPerPage, page * itemsPerPage);

  const getStatusColor = (status) => {
    switch (status) {
      case 'open': return 'bg-blue-100 text-blue-800';
      case 'in_progress': return 'bg-amber-100 text-amber-800';
      case 'solution_submitted': return 'bg-purple-100 text-purple-800';
      case 'solved': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
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

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <h1 className="text-3xl font-extrabold text-gray-900">Discover Challenges</h1>
          
          <div className="relative w-full md:w-96">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Search challenges..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            />
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-8">
          {/* Filters Sidebar */}
          <div className="w-full lg:w-64 flex-shrink-0 space-y-6 bg-white p-6 rounded-lg shadow-sm border border-gray-100 h-fit">
            <div>
              <h3 className="text-sm font-medium text-gray-900 mb-3">Sort By</h3>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md border"
              >
                <option value="newest">Newest</option>
                <option value="upvoted">Most Upvoted</option>
                <option value="urgent">Most Urgent</option>
              </select>
            </div>

            <div>
              <h3 className="text-sm font-medium text-gray-900 mb-3">Status</h3>
              <select
                value={statusFilter}
                onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
                className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md border"
              >
                <option value="All">All</option>
                <option value="open">Open</option>
                <option value="in_progress">In Progress</option>
                <option value="solution_submitted">Solution Submitted</option>
                <option value="solved">Solved</option>
              </select>
            </div>

            <div>
              <h3 className="text-sm font-medium text-gray-900 mb-3">Severity</h3>
              <select
                value={severityFilter}
                onChange={(e) => { setSeverityFilter(e.target.value); setPage(1); }}
                className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md border"
              >
                <option value="All">All</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>

            <div>
              <h3 className="text-sm font-medium text-gray-900 mb-3">Categories</h3>
              <div className="space-y-2">
                {CATEGORIES.map(cat => (
                  <label key={cat} className="flex items-center">
                    <input
                      type="checkbox"
                      checked={selectedCategories.includes(cat)}
                      onChange={() => toggleCategory(cat)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <span className="ml-2 text-sm text-gray-700 capitalize">{cat}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* Grid */}
          <div className="flex-1">
            {loading ? (
              <div className="text-center py-12 text-gray-500">Loading challenges...</div>
            ) : processed.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-lg shadow-sm border border-gray-100">
                <p className="text-gray-500">No challenges found matching your criteria.</p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                  {paginatedChallenges.map((challenge) => (
                    <div key={challenge.id} className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden flex flex-col hover:shadow-md transition-shadow">
                      {challenge.image_url ? (
                        <div className="h-48 w-full bg-gray-200">
                          <img src={challenge.image_url} alt={challenge.title} className="w-full h-full object-cover" />
                        </div>
                      ) : (
                        <div className="h-48 w-full bg-gradient-to-br from-blue-50 to-gray-100 flex items-center justify-center text-gray-400">
                          No Image Provided
                        </div>
                      )}
                      
                      <div className="p-5 flex-1 flex flex-col">
                        <div className="flex justify-between items-start mb-2">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 capitalize">
                            {challenge.category}
                          </span>
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(challenge.status)} capitalize`}>
                            {challenge.status.replace('_', ' ')}
                          </span>
                        </div>
                        
                        <h3 className="text-lg font-bold text-gray-900 mb-2 line-clamp-2" title={challenge.title}>
                          {challenge.title}
                        </h3>
                        
                        <div className="flex items-center text-sm text-gray-500 mb-4">
                          <MapPin className="w-4 h-4 mr-1 flex-shrink-0" />
                          <span className="truncate">{challenge.location}</span>
                        </div>

                        <div className="mt-auto pt-4 border-t border-gray-100 flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <span className="flex items-center text-sm text-gray-600 capitalize">
                              {getSeverityIcon(challenge.severity)}
                              {challenge.severity}
                            </span>
                            <span className="flex items-center text-sm text-gray-600">
                              <ThumbsUp className="w-4 h-4 mr-1 text-gray-400" />
                              {challenge.upvote_count}
                            </span>
                          </div>
                          
                          <button 
                            onClick={() => navigate(`/challenge/${challenge.id}`)}
                            className="text-sm font-medium text-blue-600 hover:text-blue-500"
                          >
                            View Details &rarr;
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="mt-8 flex justify-center space-x-2">
                    <button
                      disabled={page === 1}
                      onClick={() => setPage(p => p - 1)}
                      className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                    >
                      Previous
                    </button>
                    <span className="px-4 py-2 text-sm font-medium text-gray-700">
                      Page {page} of {totalPages}
                    </span>
                    <button
                      disabled={page === totalPages}
                      onClick={() => setPage(p => p + 1)}
                      className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
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
