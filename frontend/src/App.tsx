import { BrowserRouter as Router, Routes, Route, NavLink } from 'react-router-dom';
import FuzzyPage from './pages/FuzzyPage';
import GoogleLensPage from './pages/GoogleLensPage';
import './App.css';

function App() {
  return (
    <Router>
      <div className="app-container">
        <nav className="nav-tabs">
          <NavLink
            to="/fuzzy"
            className={({ isActive }) => `nav-tab ${isActive ? 'active' : ''}`}
          >
            Fuzzy Matching
          </NavLink>
          <NavLink
            to="/google-lens"
            className={({ isActive }) => `nav-tab ${isActive ? 'active' : ''}`}
          >
            Google Lens
          </NavLink>
        </nav>

        <main className="main-content">
          <Routes>
            <Route path="/" element={<FuzzyPage />} />
            <Route path="/fuzzy" element={<FuzzyPage />} />
            <Route path="/google-lens" element={<GoogleLensPage />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
