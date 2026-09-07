import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Home from './pages/Home';
import Auth from './pages/Auth';
import PostChallenge from './pages/PostChallenge';
import Discover from './pages/Discover';
import ChallengeDetail from './pages/ChallengeDetail';
import Dashboard from './pages/Dashboard';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/auth" element={<Auth />} />
        <Route path="/post-challenge" element={<PostChallenge />} />
        <Route path="/discover" element={<Discover />} />
        <Route path="/challenge/:id" element={<ChallengeDetail />} />
        <Route path="/dashboard" element={<Dashboard />} />
      </Routes>
    </Router>
  );
}

export default App;
