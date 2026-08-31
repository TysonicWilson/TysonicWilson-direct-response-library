import { useEffect, useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import PromotionPoster from "../components/PromotionPoster.jsx";
import AssemblyTransfer from "../components/AssemblyTransfer.jsx";
import { loadLibraryIndex, loadBreakdownMarkdown, splitFrontmatter } from "../utils/dataLoader.js";
import { parseHeadings, buildStudyGroups, slugify } from "../utils/headingGroups.js";
import { getStudyStatus, setStudyStatus, STATUS_LABELS, STATUS_VALUES } from "../utils/studyStatus.js";
import { getCompareSelection, toggleCompareSelection, MAX_COMPARE } from "../utils/compareSelection.js";

const META_FIELDS = [["Market", "market"], ["Format", "format"], ["Copywriter", "copywriter"], ["Confidence", "confidence"]];

export default function Reader() {
  const { id } = useParams();
  const [allItems, setAllItems] = useState(null); const [rawMd, setRawMd] = useState(null); const [error, setError] = useState(null);
  const [studyMode, setStudyMode] = useState(false); const [revealed, setRevealed] = useState({}); const [status, setStatus] = useState("not-studied");
  const [tocOpen, setTocOpen] = useState(true); const [compareIds, setCompareIds] = useState([]);
  useEffect(() => { loadLibraryIndex().then(setAllItems).catch((err) => setError(err.message)); setCompareIds(getCompareSelection()); }, []);
  const item = useMemo(() => allItems?.find((it) => it.id === id) || null, [allItems, id]);
  useEffect(() => { if (!item) return; setRawMd(null); setRevealed({}); setStudyMode(false); setStatus(getStudyStatus(item.id)); setCompareIds(getCompareSelection()); loadBreakdownMarkdown(item.filepath).then(setRawMd).catch((err) => setError(err.message)); window.scrollTo(0, 0); }, [item]);
  const { body, h1Title } = useMemo(() => { if (!rawMd) return { body: "", h1Title: null }; const { body: content } = splitFrontmatter(rawMd); const h1Match = content.match(/^#\s+(.+)$/m); return { body: content, h1Title: h1Match ? h1Match[1].trim() : null }; }, [rawMd]);
  const headings = useMemo(() => body ? parseHeadings(body) : [], [body]); const studyGroups = useMemo(() => buildStudyGroups(headings), [headings]);
  const { prevItem, nextItem } = useMemo(() => { if (!allItems || !item) return {}; const index = allItems.findIndex((it) => it.id === item.id); return { prevItem: index > 0 ? allItems[index - 1] : null, nextItem: index >= 0 && index < allItems.length - 1 ? allItems[index + 1] : null }; }, [allItems, item]);
  function handleStatusChange(nextStatus) { setStudyStatus(item.id, nextStatus); setStatus(nextStatus); }
  function handleCompare() { setCompareIds([...toggleCompareSelection(item.id)]); }
  function scrollToSection(slug) {
    document.getElementById(slug)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }
  if (error) return <div className="error-state">Failed to load: {error}</div>;
  if (!allItems) return <div className="loading">Loading promotion…</div>;
  if (!item) return <div className="error-state"><p>No promotion found with id “{id}”.</p><Link to="/library" className="btn">Back to Library</Link></div>;
  if (!rawMd) return <div className="loading">Loading promotion…</div>;
  const sections = headings.map((heading) => ({ ...heading, markdown: body.slice(heading.start, heading.end) }));
  const headingToGroup = new Map(); for (const heading of studyGroups.alwaysVisible) headingToGroup.set(heading.raw, null); for (const [name, list] of studyGroups.groups) for (const heading of list) headingToGroup.set(heading.raw, name);
  const tocGroups = groupTocHeadings(headings);
  return <div className="reader-page">
    <section className="promotion-identity"><div className="identity-copy"><p className="eyebrow">Promotion study</p><span className="identity-id">{item.id}</span><h1>{h1Title || item.title}</h1><div className="identity-meta"><span>{item.source_collection}</span>{item.leadTypeNormalized && <span>{item.leadTypeNormalized} lead</span>}{item.awareness && <span>{item.awareness}</span>}</div><div className="identity-actions"><label><span>Study status</span><select className="status-select" value={status} onChange={(event) => handleStatusChange(event.target.value)}>{STATUS_VALUES.map((value) => <option key={value} value={value}>{STATUS_LABELS[value]}</option>)}</select></label><button className="btn secondary" onClick={handleCompare} disabled={!compareIds.includes(item.id) && compareIds.length >= MAX_COMPARE}>{compareIds.includes(item.id) ? "Added to compare" : "Compare"}</button></div></div><PromotionPoster item={item} featured status={status} /></section>
    <section className="reader-preface"><div><span>Big idea</span><p>{item.big_idea || "Open this promotion to examine its central argument."}</p></div><div><span>Mechanism</span><p>{item.mechanism_type || "Study the full analysis for the operating mechanism."}</p></div></section>
    <div className={`reader-layout reader-layout-v2 ${tocOpen ? "toc-open" : "toc-closed"}`}><aside className="reader-sidebar"><button className="toc-toggle" onClick={() => setTocOpen((value) => !value)}>{tocOpen ? "Hide contents" : "Show contents"}</button>{tocOpen && <nav aria-label="Promotion contents">{tocGroups.map((group) => <div className="toc-group" key={group.label}><span>{group.label}</span><ul className="toc-list">{group.items.map((heading) => <li key={heading.slug}><button type="button" onClick={() => scrollToSection(heading.slug)}>{heading.raw}</button></li>)}</ul></div>)}</nav>}</aside><main className="reader-main"><div className="reader-toolbar"><div className="mode-switch" role="group" aria-label="Reading mode"><button className={!studyMode ? "active" : ""} onClick={() => setStudyMode(false)}>Read mode</button><button className={studyMode ? "active" : ""} onClick={() => setStudyMode(true)}>Study mode</button></div></div><div className="markdown-body">{renderSections(sections, headingToGroup, studyMode, revealed, (key) => setRevealed((previous) => ({ ...previous, [key]: !previous[key] })))}</div>{studyMode && <AssemblyTransfer letterId={item.id} />}<div className="prevnext-bar">{prevItem ? <Link className="prevnext-link" to={`/library/${encodeURIComponent(prevItem.id)}`}>← {prevItem.id}: {prevItem.title}</Link> : <span />}{nextItem ? <Link className="prevnext-link" to={`/library/${encodeURIComponent(nextItem.id)}`}>{nextItem.id}: {nextItem.title} →</Link> : <span />}</div></main></div>
  </div>;
}

function groupTocHeadings(headings) { const definitions = [["Strategy", /big idea|underlying reality|audience|lead/i], ["Persuasion", /structural|pivot|claim|proof|mechanism|dimensional|credibility|objection/i], ["Offer", /offer|close|cta|guarantee/i], ["Study", /principle|swipe|question|self-test|confidence|unknown/i]]; const groups = definitions.map(([label]) => ({ label, items: [] })); const other = { label: "Analysis", items: [] }; headings.forEach((heading) => { const match = definitions.findIndex(([, pattern]) => pattern.test(heading.raw)); (match >= 0 ? groups[match] : other).items.push(heading); }); return [...groups.filter((group) => group.items.length), ...(other.items.length ? [other] : [])]; }

function renderSections(sections, headingToGroup, studyMode, revealed, toggleReveal) { if (!studyMode) return <ReactMarkdown remarkPlugins={[remarkGfm]} components={mdComponents}>{sections.map((section) => section.markdown).join("")}</ReactMarkdown>; const blocks = []; let index = 0; while (index < sections.length) { const name = headingToGroup.get(sections[index].raw); if (name === null) { blocks.push({ type: "visible", sections: [sections[index]] }); index += 1; continue; } const run = []; let cursor = index; while (cursor < sections.length && headingToGroup.get(sections[cursor].raw) === name) { run.push(sections[cursor]); cursor += 1; } blocks.push({ type: "group", name, sections: run }); index = cursor; } return blocks.map((block, index) => { const markdown = block.sections.map((section) => section.markdown).join(""); if (block.type === "visible") return <ReactMarkdown key={index} remarkPlugins={[remarkGfm]} components={mdComponents}>{markdown}</ReactMarkdown>; const key = `${block.name}-${index}`; const open = Boolean(revealed[key]); return <section className="study-group" key={key}><button className="study-group-header" onClick={() => toggleReveal(key)}><span>{block.name}</span><span className="reveal-hint">{open ? "Hide analysis" : "Reveal analysis"}</span></button>{open && <div className="study-group-body"><ReactMarkdown remarkPlugins={[remarkGfm]} components={mdComponents}>{markdown}</ReactMarkdown></div>}</section>; }); }

const mdComponents = { h2: ({ children, ...props }) => <h2 id={slugify(String(children[0] || ""))} {...props}>{children}</h2> };
