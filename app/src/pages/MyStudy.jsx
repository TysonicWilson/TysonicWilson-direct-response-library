import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { loadLibraryIndex } from "../utils/dataLoader.js";
import { getAllStudyStatuses, STATUS_LABELS } from "../utils/studyStatus.js";

export default function MyStudy() {
  const [items, setItems] = useState(null); const [statuses, setStatuses] = useState({});
  useEffect(() => { loadLibraryIndex().then(setItems).catch(() => setItems([])); setStatuses(getAllStudyStatuses()); }, []);
  const groups = useMemo(() => { const source = items || []; return [{ key: "studying", title: "Continue studying", items: source.filter((item) => statuses[item.id] === "studying") }, { key: "completed", title: "Completed", items: source.filter((item) => statuses[item.id] === "completed") }]; }, [items, statuses]);
  const studied = Object.keys(statuses).length; const completed = groups.find((group) => group.key === "completed")?.items.length || 0;
  return <section className="destination-page study-page"><p className="eyebrow">Your working archive</p><h1>My Study</h1><div className="study-summary"><div><strong>{studied}</strong><span>promotions in progress</span></div><div><strong>{completed}</strong><span>completed</span></div></div>{groups.map((group) => <section className="study-section" key={group.key}><div className="section-heading"><h2>{group.title}</h2><span>{group.items.length}</span></div>{group.items.length ? <div className="study-list">{group.items.map((item) => <Link key={item.id} to={`/library/${encodeURIComponent(item.id)}`}><span className="study-item-id">{item.id}</span><span>{item.title}</span><small>{STATUS_LABELS[statuses[item.id]]}</small></Link>)}</div> : <div className="study-empty">Nothing here yet. Start with a promotion in the <Link to="/library">library</Link>.</div>}</section>)}</section>;
}
