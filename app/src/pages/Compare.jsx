import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { loadLibraryIndex } from "../utils/dataLoader.js";
import { getCompareSelection, toggleCompareSelection, clearCompareSelection } from "../utils/compareSelection.js";

const ROWS = [
  ["Title", "title"],
  ["Source Collection", "source_collection"],
  ["Lead Type", "leadTypeNormalized"],
  ["Awareness", "awareness"],
  ["Big Idea", "big_idea"],
  ["Mechanism Type", "mechanism_type"],
  ["Proof Types", "proof_types"],
  ["Dimensionalization", "dimensionalization"],
  ["Offer Type", "offer_type"],
  ["Confidence", "confidence"],
];

export default function Compare() {
  const [items, setItems] = useState(null);
  const [error, setError] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);

  useEffect(() => {
    loadLibraryIndex()
      .then(setItems)
      .catch((err) => setError(err.message));
    setSelectedIds(getCompareSelection());
  }, []);

  const selected = useMemo(() => {
    if (!items) return [];
    return selectedIds
      .map((id) => items.find((it) => it.id === id))
      .filter(Boolean);
  }, [items, selectedIds]);

  function remove(id) {
    const updated = toggleCompareSelection(id);
    setSelectedIds([...updated]);
  }

  if (error) return <div className="error-state">Failed to load: {error}</div>;
  if (!items) return <div className="loading">Loading…</div>;

  if (selected.length === 0) {
    return (
      <div className="empty-state">
        <p>No promotions selected for comparison.</p>
        <p>Pick 2–4 promotions using the "Compare" checkbox on their cards in the Library.</p>
        <Link to="/library" className="btn">
          Go to Library
        </Link>
      </div>
    );
  }

  return (
    <div>
      <div className="results-meta">
        <span>Comparing {selected.length} promotion(s)</span>
        <button
          className="clear-filters-btn"
          onClick={() => {
            clearCompareSelection();
            setSelectedIds([]);
          }}
        >
          Clear selection
        </button>
      </div>

      <div className="compare-table-wrap">
        <table className="compare-table">
          <thead>
            <tr>
              <th>Field</th>
              {selected.map((item) => (
                <th key={item.id}>
                  <Link to={`/library/${encodeURIComponent(item.id)}`}>{item.id}</Link>
                  <br />
                  <button
                    className="clear-filters-btn"
                    style={{ marginTop: 4 }}
                    onClick={() => remove(item.id)}
                  >
                    Remove
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ROWS.map(([label, key]) => (
              <tr key={key}>
                <td className="row-label">{label}</td>
                {selected.map((item) => {
                  const v = item[key];
                  const display = Array.isArray(v) ? (v.length ? v.join(", ") : "—") : v || "—";
                  return <td key={item.id}>{display}</td>;
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
