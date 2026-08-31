import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { loadLibraryIndex } from "../utils/dataLoader.js";

const descriptions = { "100 Greatest Sales Letters": "Foundational controls and enduring direct-response structures.", "AWAI Direct Response Hall of Fame": "Recognized promotions worth revisiting for their craft and commercial force.", "World's Greatest Direct Mail Sales Letters": "Direct-mail packages built around specificity, proof, and offer architecture." };
export default function Collections() {
  const [items, setItems] = useState(null);
  useEffect(() => { loadLibraryIndex().then(setItems).catch(() => setItems([])); }, []);
  const collections = useMemo(() => { if (!items) return []; const counts = new Map(); items.forEach((item) => { const name = item.source_collection || "Uncategorized"; counts.set(name, (counts.get(name) || 0) + 1); }); return [...counts.entries()].map(([name, count], index) => ({ name, count, index })); }, [items]);
  return <section className="destination-page collections-page"><p className="eyebrow">Source archives</p><h1>Collections</h1><p className="page-intro">Choose a body of work, then study it with the context it deserves.</p><div className="collection-list">{collections.map((collection) => <Link key={collection.name} className={`collection-row collection-tone-${collection.index % 3}`} to={`/library?q=${encodeURIComponent(collection.name)}`}><span className="collection-number">0{collection.index + 1}</span><div><h2>{collection.name}</h2><p>{descriptions[collection.name] || "A grouped source archive for focused study."}</p></div><span className="collection-count">{collection.count} promotions <b>→</b></span></Link>)}{!items && <div className="loading">Loading collections…</div>}</div></section>;
}
