import { Routes, Route, Link, NavLink } from "react-router-dom";
import LibraryHome from "./pages/LibraryHome.jsx";
import Reader from "./pages/Reader.jsx";
import Compare from "./pages/Compare.jsx";

export default function App() {
  return (
    <div className="app-shell">
      <header className="app-header">
        <Link to="/library" className="app-title">
          Direct Response Library
        </Link>
        <nav className="app-nav">
          <NavLink to="/library" className={({ isActive }) => (isActive ? "active" : "")}>
            Library
          </NavLink>
          <NavLink to="/compare" className={({ isActive }) => (isActive ? "active" : "")}>
            Compare
          </NavLink>
        </nav>
      </header>

      <Routes>
        <Route path="/" element={<LibraryHome />} />
        <Route path="/library" element={<LibraryHome />} />
        <Route path="/library/:id" element={<Reader />} />
        <Route path="/compare" element={<Compare />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </div>
  );
}

function NotFound() {
  return (
    <div className="empty-state">
      <p>Page not found.</p>
      <Link to="/library" className="btn">
        Back to Library
      </Link>
    </div>
  );
}
