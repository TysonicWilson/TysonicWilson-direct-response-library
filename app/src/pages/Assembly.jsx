import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { loadElementsIndex } from "../utils/dataLoader.js";

const CATEGORIES = [
  ["headline", "01 Headlines"], ["lead", "02 Leads"], ["subhead", "03 Subheads"],
  ["bullet", "04 Bullets"], ["mechanism", "05 Mechanisms"], ["proof_stack", "06 Proof Stacks"],
  ["objection_handling", "07 Objection Handling"], ["guarantee", "08 Guarantees"], ["offer", "09 Offers"],
  ["cta", "10 CTAs"], ["ps", "11 PS"],
];

const valueList = (items, key) => [...new Set(items.map((item) => item[key]).filter(Boolean))].sort();

export default function Assembly() {
  const [elements, setElements] = useState(null);
  const [error, setError] = useState(null);
  const [type, setType] = useState("lead");
  const [mode, setMode] = useState("menu");
  const [filters, setFilters] = useState({ lead_type: "", awareness: "", market: "", provenance: "" });
  const [scope, setScope] = useState("all_letters");
  const [activeLetterId, setActiveLetterId] = useState("");
  const [letterIds, setLetterIds] = useState([]);
  const [draft, setDraft] = useState([]);

  useEffect(() => { loadElementsIndex().then(setElements).catch((err) => setError(err.message)); }, []);
  const filtered = useMemo(() => {
    if (!elements) return [];
    return elements.filter((item) => item.element_type === type && Object.entries(filters).every(([key, value]) => !value || item[key] === value));
  }, [elements, type, filters]);
  const options = useMemo(() => elements ? {
    lead_type: valueList(elements, "lead_type"), awareness: valueList(elements, "awareness"), market: valueList(elements, "market"), provenance: valueList(elements, "provenance"),
  } : {}, [elements]);
  const availableLetters = useMemo(() => [...new Set(filtered.map((item) => item.letter_id))].sort(), [filtered]);
  const scoped = scope === "this_letter" && activeLetterId ? filtered.filter((item) => item.letter_id === activeLetterId) : filtered;
  const visible = mode === "menu" ? scoped : scoped.filter((item) => letterIds.includes(item.letter_id));

  function toggleLetter(id) {
    setLetterIds((previous) => previous.includes(id) ? previous.filter((entry) => entry !== id) : previous.length < 4 ? [...previous, id] : previous);
  }
  function usePart(item) {
    setDraft((previous) => previous.some((part) => part.element_id === item.element_id) ? previous : [...previous, item]);
  }
  if (error) return <div className="error-state">Failed to load parts library: {error}</div>;
  if (!elements) return <div className="loading">Building the parts library…</div>;

  return <div className="assembly-page">
    <div className="assembly-heading"><div><p className="eyebrow">Chinese menu</p><h1>Parts library</h1><p>Pivot the archive by function, then reassemble only the underlying principle.</p></div><Link to="/library" className="text-action">Back to Library <span>→</span></Link></div>
    <div className="assembly-controls"><div className="mode-switch" role="group" aria-label="Assembly view"><button className={mode === "menu" ? "active" : ""} onClick={() => setMode("menu")}>Menu mode</button><button className={mode === "select" ? "active" : ""} onClick={() => setMode("select")}>Select mode</button></div><div className="element-tabs">{CATEGORIES.map(([value, label]) => <button key={value} className={value === type ? "active" : ""} onClick={() => { setType(value); setLetterIds([]); }}>{label}<small>{elements.filter((item) => item.element_type === value).length}</small></button>)}</div><div className="filters-bar">{Object.entries(options).map(([key, values]) => <select key={key} className="filter-select" value={filters[key]} onChange={(event) => setFilters((previous) => ({ ...previous, [key]: event.target.value }))}><option value="">{key.replaceAll("_", " ")}: All</option>{values.map((value) => <option key={value} value={value}>{value}</option>)}</select>)}<select className="filter-select" value={scope} onChange={(event) => setScope(event.target.value)}><option value="all_letters">Scope: All letters</option><option value="this_letter">Scope: This letter only</option></select>{scope === "this_letter" && <select className="filter-select" value={activeLetterId} onChange={(event) => setActiveLetterId(event.target.value)}><option value="">Choose letter</option>{availableLetters.map((id) => <option key={id} value={id}>{id}</option>)}</select>}</div></div>
    {mode === "select" && <div className="letter-picker"><span>Select 2–4 letters</span><div>{availableLetters.slice(0, 32).map((id) => <button key={id} className={letterIds.includes(id) ? "active" : ""} onClick={() => toggleLetter(id)}>{id}</button>)}</div></div>}
    <div className="assembly-workspace"><section className="element-menu"><p className="results-meta">Showing {visible.length} {CATEGORIES.find(([value]) => value === type)?.[1].replace(/^\d+\s/, "").toLowerCase()}</p>{visible.length ? visible.map((item) => <article className="element-card" key={item.element_id}><div className="element-card-meta"><span>{item.letter_id}</span><span>{item.lead_type || "—"}</span></div><p>{item.text}</p><dl><div><dt>Function</dt><dd>{item.analysis?.function || "—"}</dd></div><div><dt>Market</dt><dd>{item.market || "Unknown"}</dd></div></dl><div className="element-card-actions"><Link to={`/library/${encodeURIComponent(item.letter_id)}`}>Open letter</Link><button className="btn secondary" onClick={() => usePart(item)}>Use this part →</button></div></article>) : <div className="empty-state">No annotated parts match this menu section and its filters yet.</div>}</section><aside className="assembly-canvas"><div><p className="eyebrow">Draft canvas</p><h2>Reassembled promotion</h2><p>Use parts for pattern study. Adapt the principle—never copy the market-specific wording.</p></div>{draft.length ? <ol>{draft.map((part) => <li key={part.element_id}><button onClick={() => setDraft((previous) => previous.filter((item) => item.element_id !== part.element_id))} aria-label={`Remove ${part.analysis?.function || part.element_type}`}>×</button><span>{part.element_type.replaceAll("_", " ")} · {part.letter_id}</span><strong>{part.text}</strong><details><summary>ⓘ Analysis</summary><p>{part.analysis?.function || "—"}{part.analysis?.key_move ? ` — ${part.analysis.key_move}` : ""}{part.analysis?.why_it_matters ? ` — ${part.analysis.why_it_matters}` : ""}</p></details></li>)}</ol> : <div className="assembly-empty">Choose an element from the menu to place it here.</div>}</aside></div>
  </div>;
}
