const TEMPLATE_COUNT = 6;

export default function PromotionPoster({ item, featured = false, status }) {
  const template = posterTemplate(item.id);
  return <article className={`promotion-poster poster-template-${template} ${featured ? "poster-featured" : ""}`}><div className="poster-topline"><span>{item.source_collection}</span><span>{item.id}</span></div><div className="poster-content"><h3>{item.title || "Untitled promotion"}</h3>{item.market && <p>{item.market}</p>}</div><div className="poster-footer"><span>{item.leadTypeNormalized || "Promotion study"}</span>{status && <span className={`poster-status ${status}`} />}</div></article>;
}

function posterTemplate(value) {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  return hash % TEMPLATE_COUNT;
}
