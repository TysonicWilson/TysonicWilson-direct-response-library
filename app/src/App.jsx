import { Link, NavLink, Route, Routes, useNavigate } from "react-router-dom";
import { useState } from "react";
import Home from "./pages/Home.jsx";
import LibraryHome from "./pages/LibraryHome.jsx";
import Collections from "./pages/Collections.jsx";
import MyStudy from "./pages/MyStudy.jsx";
import Reader from "./pages/Reader.jsx";
import Compare from "./pages/Compare.jsx";

const navigation = [
  { to: "/", label: "Home", end: true },
  { to: "/library", label: "Library" },
  { to: "/collections", label: "Collections" },
  { to: "/study", label: "My Study" },
];

export default function App() {
  return (
    <div className="app-shell">
      <TopNavigation />
      <main className="app-main">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/library" element={<LibraryHome />} />
          <Route path="/library/:id" element={<Reader />} />
          <Route path="/collections" element={<Collections />} />
          <Route path="/study" element={<MyStudy />} />
          <Route path="/compare" element={<Compare />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
      <MobileBottomNavigation />
    </div>
  );
}

function TopNavigation() {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  function submitSearch(event) {
    event.preventDefault();
    const value = query.trim();
    navigate(value ? `/library?q=${encodeURIComponent(value)}` : "/library");
  }
  return (
    <header className="top-navigation">
      <div className="top-navigation-inner">
        <Link to="/" className="brand-lockup" aria-label="Direct Response Library home">
          <span className="brand-mark" aria-hidden="true" />
          <span><strong>Direct Response Library</strong><small>Creative Intelligence</small></span>
        </Link>
        <nav className="desktop-navigation" aria-label="Main navigation">
          {navigation.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.end} className={({ isActive }) => (isActive ? "active" : "")}>{item.label}</NavLink>
          ))}
        </nav>
        <form className="global-search" role="search" onSubmit={submitSearch}>
          <label className="sr-only" htmlFor="global-search-input">Search the library</label>
          <input id="global-search-input" type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search the library" />
          <button type="submit" aria-label="Search the library"><SearchIcon /></button>
        </form>
        <Link to="/study" className="study-link"><span className="study-link-dot" aria-hidden="true" /><span>My Study</span></Link>
      </div>
    </header>
  );
}

function MobileBottomNavigation() {
  return <nav className="mobile-navigation" aria-label="Mobile navigation">{navigation.map((item) => <NavLink key={item.to} to={item.to} end={item.end}><span>{item.label}</span></NavLink>)}</nav>;
}

function SearchIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><circle cx="11" cy="11" r="6.5" /><path d="m16 16 4.2 4.2" /></svg>;
}

function NotFound() {
  return <div className="empty-state"><p>That page is not part of this archive.</p><Link to="/" className="btn">Back to Home</Link></div>;
}
