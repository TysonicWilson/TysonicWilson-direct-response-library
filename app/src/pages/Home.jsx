import { Link } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import PromotionPoster from "../components/PromotionPoster.jsx";
import { loadLibraryIndex } from "../utils/dataLoader.js";
import { getAllStudyStatuses, STATUS_LABELS } from "../utils/studyStatus.js";

const railDefinitions = [
  { title: "Start with the classics", filter: (item) => item.source_collection === "100 Greatest Sales Letters" },
  { title: "Story leads", filter: (item) => item.leadTypeNormalized === "Story" },
  { title: "Hall of Fame controls", filter: (item) => item.source_collection === "AWAI Direct Response Hall of Fame" },
];

export default function Home() {
  const [items, setItems] = useState(null);
  const [statuses, setStatuses] = useState({});
  useEffect(() => { loadLibraryIndex().then(setItems).catch(() => setItems([])); setStatuses(getAllStudyStatuses()); }, []);
  const featured = useMemo(() => !items?.length ? null : items.find((item) => item.id === "GSL100-DR-001") || items[0], [items]);
  const rails = useMemo(() => !items ? [] : railDefinitions.map((rail) => ({ ...rail, items: items.filter(rail.filter).slice(0, 9) })), [items]);
  if (!items) return <div className="loading">Loading the archive…</div>;
  return <section className="home-page">{featured && <FeaturedPromotion item={featured} status={statuses[featured.id] || "not-studied"} />}<div className="home-rails">{rails.map((rail) => <ContentRail key={rail.title} title={rail.title} items={rail.items} statuses={statuses} />)}</div></section>;
}

function FeaturedPromotion({ item, status }) {
  return <section className="featured-promotion"><div className="featured-copy"><p className="eyebrow">Featured promotion</p><h1>{item.title}</h1><div className="featured-detail"><span>Big idea</span><p>{item.big_idea}</p></div><div className="featured-detail"><span>Collection / source</span><p>{item.source_collection}</p></div><div className="featured-status"><span className={`status-orb ${status}`} /><span>{STATUS_LABELS[status]}</span></div><Link className="btn featured-action" to={`/library/${encodeURIComponent(item.id)}`}>Study this letter <span>→</span></Link></div><Link className="featured-cover" to={`/library/${encodeURIComponent(item.id)}`} aria-label={`Open ${item.title}`}><PromotionPoster item={item} featured /></Link></section>;
}

function ContentRail({ title, items, statuses }) {
  return <section className="content-rail"><div className="rail-heading"><h2>{title}</h2><Link to="/library">View all <span>→</span></Link></div><div className="rail-scroll">{items.map((item) => <Link key={item.id} className="rail-poster-link" to={`/library/${encodeURIComponent(item.id)}`} aria-label={`Open ${item.title}`}><PromotionPoster item={item} status={statuses[item.id] || "not-studied"} /></Link>)}</div></section>;
}
