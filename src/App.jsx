import { BrowserRouter, Routes, Route, Link } from "react-router-dom";
import "./App.css";
import LeaderboardPage from "./pages/LeaderboardPage";
import UploadPage from "./pages/UploadPage";

export default function App() {
  return (
    <BrowserRouter>
      <div className="app">
        <header className="header">
          <div>
            <h1>Track Rankings Prototype</h1>
            <p>Middle school statewide marks tracker</p>
          </div>

          <nav className="top-nav">
            <Link to="/">Leaderboard</Link>
            <Link to="/upload">Admin Upload</Link>
          </nav>
        </header>

        <Routes>
          <Route path="/" element={<LeaderboardPage />} />
          <Route path="/upload" element={<UploadPage />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}