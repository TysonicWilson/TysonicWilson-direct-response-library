import { useEffect, useMemo, useState } from "react";
import { loadLibraryIndex } from "../utils/dataLoader.js";
import PromotionCard from "../components/PromotionCard.jsx";
import { getAllStudyStatuses, setStudyStatus, STATUS_LABELS, STATUS_VALUES } from "../utils/studyStatus.js";
import {
  getCompareSelection,
  toggleCompareSelection,
  MAX_COMPARE,
} from "../utils/compareSelection.js";
import { Link, useSearchParams } from "react-router-dom";

const FILTER_DEFS = [
  { key: "source_collection", label: "Collection" },
  { key: "awareness", label: "Awareness" },
  { key: "leadTypeNormalized", label: "Lead Type" },
  { key: "formatNormalized", label: "Format" },
  { key: "confidence", label: "Confidence" },
];

function uniqueSorted(items, key) {
  const set = new Set();
  for (const item of items) {
    const v = item[key];
    if (v) set.add(v);
  }
  return [...set].sort();
}

function matchesSearch(item, query) {
  if (!query) return true;
  const q = query.toLowerCase();
  const fields = [
    item.title,
    item.id,
    item.brand,
    item.market,
    item.big_idea,
    item.mechanism_type,
    item.source_collection,
  ];
  if (fields.some((f) => f && f.toLowerCase().includes(q))) return true;
  if (item.searchText && item.searchText.includes(q)) return true;
  return false;
}

export default function LibraryHome() {
  const [searchParams] = useSearchParams();
  const [items, setItems] = useState(null);
  const [error, setError] = useState(null);
  const [query, setQuery] = useState(() => searchParams.get("q") || "");
  const [filters, setFilters] = useState({});
  const [statusFilter, setStatusFilter] = useState("all");
  const [statuses, setStatuses] = useState({});
  const [compareIds, setCompareIds] = useState([]);

  useEffect(() => {
    loadLibraryIndex()
      .then(setItems)
      .catch((err) => setError(err.message));
    setStatuses(getAllStudyStatuses());
    setCompareIds(getCompareSelection());
  }, []);

  useEffect(() => {
    setQuery(searchParams.get("q") || "");
  }, [searchParams]);

  const filterOptions = useMemo(() => {
    if (!items) return {};
    const opts = {};
    for (const def of FILTER_DEFS) {
      opts[def.key] = uniqueSorted(items, def.key);
    }
    return opts;
  }, [items]);

  const filtered = useMemo(() => {
    if (!items) return [];
    return items.filter((item) => {
      if (!matchesSearch(item, query)) return false;
      for (const def of FILTER_DEFS) {
        const want = filters[def.key];
        if (want && item[def.key] !== want) return false;
      }
      if (statusFilter !== "all") {
        const s = statuses[item.id] || "not-studied";
        if (s !== statusFilter) return false;
      }
      return true;
    });
  }, [items, query, filters, statusFilter, statuses]);

  function handleStatusChange(id, status) {
    setStudyStatus(id, status);
    setStatuses((prev) => ({ ...prev, [id]: status }));
  }

  function handleToggleCompare(id) {
    const updated = toggleCompareSelection(id);
    setCompareIds([...updated]);
  }

  function clearFilters() {
    setFilters({});
    setQuery("");
    setStatusFilter("all");
  }

  const hasActiveFilters =
    query || statusFilter !== "all" || Object.values(filters).some(Boolean);

  if (error) {
    return <div className="error-state">Failed to load library index: {error}</div>;
  }

  if (!items) {
    return <div className="loading">Loading library…</div>;
  }

  return (
    <div className="library-page">
      <div className="library-heading">
        <div>
          <p className="eyebrow">The complete archive</p>
          <h1>Library</h1>
        </div>
        <p className="corpus-count"><strong>{items.length}</strong> promotions in the corpus</p>
      </div>

      <input
        className="search-bar"
        type="search"
        placeholder="Search title, brand, market, big idea, mechanism, collection, or full text…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />

      <div className="filters-bar">
        {FILTER_DEFS.map((def) => (
          <select
            key={def.key}
            className="filter-select"
            value={filters[def.key] || ""}
            onChange={(e) =>
              setFilters((prev) => ({ ...prev, [def.key]: e.target.value || undefined }))
            }
          >
            <option value="">{def.label}: All</option>
            {(filterOptions[def.key] || []).map((val) => (
              <option key={val} value={val}>
                {val}
              </option>
            ))}
          </select>
        ))}

        <select
          className="filter-select"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="all">Study Status: All</option>
          {STATUS_VALUES.map((v) => (
            <option key={v} value={v}>
              {STATUS_LABELS[v]}
            </option>
          ))}
        </select>
      </div>

      <div className="results-meta">
        <span>
          Showing {filtered.length} of {items.length}
        </span>
        {hasActiveFilters && (
          <button className="clear-filters-btn" onClick={clearFilters}>
            Clear filters
          </button>
        )}
      </div>

      {filtered.length === 0 ? (
        <div className="empty-state">No promotions match your search/filters.</div>
      ) : (
        <div className="card-grid">
          {filtered.map((item) => (
            <PromotionCard
              key={item.id}
              data={item}
              studyStatus={statuses[item.id] || "not-studied"}
              onStudyStatusChange={handleStatusChange}
              compareSelected={compareIds.includes(item.id)}
              onToggleCompare={handleToggleCompare}
              compareDisabled={compareIds.length >= MAX_COMPARE}
            />
          ))}
        </div>
      )}

      {compareIds.length > 0 && (
        <div className="compare-bar">
          <span>
            {compareIds.length} selected for comparison (max {MAX_COMPARE})
          </span>
          <Link
            to="/compare"
            className="btn"
            style={{ pointerEvents: compareIds.length < 2 ? "none" : "auto", opacity: compareIds.length < 2 ? 0.5 : 1 }}
          >
            Compare selected
          </Link>
        </div>
      )}
    </div>
  );
}
