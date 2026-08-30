import { Link } from "react-router-dom";
import { STATUS_LABELS, STATUS_VALUES } from "../utils/studyStatus.js";

// Dumb presentational card. Takes all data/state via props so its visual
// styling can be swapped later (V2) without touching data-fetching,
// routing, or state-management logic elsewhere in the app.
export default function PromotionCard({
  data,
  studyStatus,
  onStudyStatusChange,
  compareSelected,
  onToggleCompare,
  compareDisabled,
}) {
  return (
    <div className="promo-card">
      <div className="promo-card-top">
        <span className="promo-card-id">{data.id}</span>
        <span className={`badge status-badge ${studyStatus}`}>
          {STATUS_LABELS[studyStatus]}
        </span>
      </div>

      <Link to={`/library/${encodeURIComponent(data.id)}`} className="promo-card-title">
        {data.title || "(untitled)"}
      </Link>

      <div className="promo-card-meta">
        {data.source_collection && <span>{data.source_collection}</span>}
        {data.market && <span>Market: {data.market}</span>}
      </div>

      <div className="promo-card-footer">
        <label className="compare-checkbox-label">
          <input
            type="checkbox"
            checked={compareSelected}
            disabled={!compareSelected && compareDisabled}
            onChange={() => onToggleCompare(data.id)}
          />
          Compare
        </label>

        <select
          className="status-select"
          value={studyStatus}
          onChange={(e) => onStudyStatusChange(data.id, e.target.value)}
        >
          {STATUS_VALUES.map((v) => (
            <option key={v} value={v}>
              {STATUS_LABELS[v]}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
