import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import Auth from './pages/Auth';
import PostChallenge from './pages/PostChallenge';
import Discover from './pages/Discover';
import ChallengeDetail from './pages/ChallengeDetail';
import Dashboard from './pages/Dashboard';

function App() {
  return (
    <Router>
      <div className="flex flex-col min-h-screen bg-white dark:bg-gray-950 transition-colors duration-200">
        <Navbar />
        <main className="flex-1">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/post-challenge" element={<PostChallenge />} />
            <Route path="/discover" element={<Discover />} />
            <Route path="/challenge/:id" element={<ChallengeDetail />} />
            <Route path="/dashboard" element={<Dashboard />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
