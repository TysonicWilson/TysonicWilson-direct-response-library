const TEMPLATE_COUNT = 6;
const COVER_ASSETS = [
  "covers/piano-featured-v1.png",
  "covers/key-archive-v1.png",
  "covers/pen-letter-v1.png",
  "covers/balance-authority-v1.png",
  "covers/typewriter-research-v1.png",
  "covers/road-story-v1.png",
];

export default function PromotionPoster({ item, featured = false, status }) {
  const template = posterTemplate(item.id);
  const coverAsset = featured ? COVER_ASSETS[0] : COVER_ASSETS[template];
  const coverUrl = `${import.meta.env.BASE_URL}${coverAsset}`;

  return <article
    className={`promotion-poster poster-template-${template} ${featured ? "poster-featured" : ""}`}
    style={{ "--cover-image": `url(${coverUrl})` }}
  ><div className="poster-content"><span className="poster-ornament" aria-hidden="true">✦</span><h3>{item.title || "Untitled promotion"}</h3>{item.market && <p>{item.market}</p>}</div><div className="poster-footer"><span>{item.leadTypeNormalized || "Promotion study"}</span>{status && <span className={`poster-status ${status}`} />}</div></article>;
}

function posterTemplate(value) {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  return hash % TEMPLATE_COUNT;
}
