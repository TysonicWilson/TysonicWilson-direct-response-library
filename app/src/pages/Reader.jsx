import { useEffect, useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { loadLibraryIndex, loadBreakdownMarkdown, splitFrontmatter } from "../utils/dataLoader.js";
import { parseHeadings, buildStudyGroups, slugify } from "../utils/headingGroups.js";
import { getStudyStatus, setStudyStatus, STATUS_LABELS, STATUS_VALUES } from "../utils/studyStatus.js";

const META_FIELDS = [
  ["Brand", "brand"],
  ["Market", "market"],
  ["Format", "format"],
  ["Copywriter", "copywriter"],
  ["Source", "source"],
  ["Source Pages", "source_pages"],
  ["Confidence", "confidence"],
  ["Collection", "source_collection"],
];

export default function Reader() {
  const { id } = useParams();
  const [allItems, setAllItems] = useState(null);
  const [rawMd, setRawMd] = useState(null);
  const [error, setError] = useState(null);
  const [studyMode, setStudyMode] = useState(false);
  const [revealed, setRevealed] = useState({}); // groupName -> bool
  const [status, setStatus] = useState("not-studied");

  useEffect(() => {
    loadLibraryIndex()
      .then(setAllItems)
      .catch((err) => setError(err.message));
  }, []);

  const item = useMemo(() => {
    if (!allItems) return null;
    return allItems.find((it) => it.id === id) || null;
  }, [allItems, id]);

  useEffect(() => {
    if (!item) return;
    setRawMd(null);
    setRevealed({});
    setStudyMode(false);
    setStatus(getStudyStatus(item.id));
    loadBreakdownMarkdown(item.filepath)
      .then(setRawMd)
      .catch((err) => setError(err.message));
    window.scrollTo(0, 0);
  }, [item]);

  const { body, h1Title } = useMemo(() => {
    if (!rawMd) return { body: "", h1Title: null };
    const { body: b } = splitFrontmatter(rawMd);
    const h1Match = b.match(/^#\s+(.+)$/m);
    return { body: b, h1Title: h1Match ? h1Match[1].trim() : null };
  }, [rawMd]);

  const headings = useMemo(() => (body ? parseHeadings(body) : []), [body]);
  const studyGroups = useMemo(() => buildStudyGroups(headings), [headings]);

  const { prevItem, nextItem } = useMemo(() => {
    if (!allItems || !item) return { prevItem: null, nextItem: null };
    const idx = allItems.findIndex((it) => it.id === item.id);
    return {
      prevItem: idx > 0 ? allItems[idx - 1] : null,
      nextItem: idx >= 0 && idx < allItems.length - 1 ? allItems[idx + 1] : null,
    };
  }, [allItems, item]);

  function handleStatusChange(newStatus) {
    if (!item) return;
    setStudyStatus(item.id, newStatus);
    setStatus(newStatus);
  }

  function toggleReveal(groupName) {
    setRevealed((prev) => ({ ...prev, [groupName]: !prev[groupName] }));
  }

  if (error) {
    return <div className="error-state">Failed to load: {error}</div>;
  }
  if (!allItems) {
    return <div className="loading">Loading…</div>;
  }
  if (!item) {
    return (
      <div className="error-state">
        <p>No promotion found with id "{id}".</p>
        <Link to="/library" className="btn">
          Back to Library
        </Link>
      </div>
    );
  }
  if (!rawMd) {
    return <div className="loading">Loading breakdown…</div>;
  }

  // Build a lookup of heading.raw -> which study group it belongs to, for
  // rendering. Sections are rendered by slicing the markdown body at each
  // heading boundary and rendering that slice as its own ReactMarkdown block,
  // wrapped in a reveal group when Study Mode is active.
  const sections = headings.map((h) => ({
    ...h,
    markdown: body.slice(h.start, h.end),
  }));

  // Reverse map heading.raw -> group name (or null if always-visible)
  const headingToGroup = new Map();
  for (const h of studyGroups.alwaysVisible) headingToGroup.set(h.raw, null);
  for (const [groupName, list] of studyGroups.groups) {
    for (const h of list) headingToGroup.set(h.raw, groupName);
  }

  return (
    <div>
      <div className="reader-layout">
        <aside className="reader-sidebar">
          <table className="reader-meta-table">
            <tbody>
              <tr>
                <td>ID</td>
                <td>{item.id}</td>
              </tr>
              {META_FIELDS.map(([label, key]) =>
                item[key] ? (
                  <tr key={key}>
                    <td>{label}</td>
                    <td>{item[key]}</td>
                  </tr>
                ) : null
              )}
            </tbody>
          </table>

          <div style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 12, color: "var(--text-faint)" }}>Study status</label>
            <br />
            <select
              className="status-select"
              value={status}
              onChange={(e) => handleStatusChange(e.target.value)}
              style={{ marginTop: 4, width: "100%" }}
            >
              {STATUS_VALUES.map((v) => (
                <option key={v} value={v}>
                  {STATUS_LABELS[v]}
                </option>
              ))}
            </select>
          </div>

          <div style={{ fontSize: 12, color: "var(--text-faint)", marginBottom: 6 }}>
            Contents
          </div>
          <ul className="toc-list">
            {headings.map((h) => (
              <li key={h.slug}>
                <a href={`#${h.slug}`}>{h.raw}</a>
              </li>
            ))}
          </ul>
        </aside>

        <main className="reader-main">
          <div className="reader-toolbar">
            <label className="study-toggle">
              <input
                type="checkbox"
                checked={studyMode}
                onChange={(e) => setStudyMode(e.target.checked)}
              />
              Study Mode (hide analytical sections until revealed)
            </label>
          </div>

          <h1 className="reader-title">{h1Title || item.title}</h1>
          <div className="reader-subtitle">
            {item.id}
            {item.source_collection ? ` · ${item.source_collection}` : ""}
          </div>

          <div className="markdown-body">
            {renderSections(sections, headingToGroup, studyMode, revealed, toggleReveal)}
          </div>

          <div className="prevnext-bar">
            {prevItem ? (
              <Link className="prevnext-link" to={`/library/${encodeURIComponent(prevItem.id)}`}>
                ← {prevItem.id}: {prevItem.title}
              </Link>
            ) : (
              <span />
            )}
            {nextItem ? (
              <Link className="prevnext-link" to={`/library/${encodeURIComponent(nextItem.id)}`}>
                {nextItem.id}: {nextItem.title} →
              </Link>
            ) : (
              <span />
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

function renderSections(sections, headingToGroup, studyMode, revealed, toggleReveal) {
  if (!studyMode) {
    // Render the whole body normally, single ReactMarkdown pass keeps
    // cross-section markdown (e.g. reference-style links) intact.
    const full = sections.map((s) => s.markdown).join("");
    return (
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={mdComponents}>
        {full}
      </ReactMarkdown>
    );
  }

  // Study Mode: group consecutive sections by their study group, rendering
  // always-visible sections inline and grouped sections behind a reveal toggle.
  const blocks = [];
  let i = 0;
  while (i < sections.length) {
    const groupName = headingToGroup.get(sections[i].raw);
    if (groupName === null) {
      // always-visible: render this single section inline
      blocks.push({ type: "visible", sections: [sections[i]] });
      i += 1;
      continue;
    }
    // collect the run of consecutive sections sharing... actually group by
    // groupName label directly (not necessarily consecutive), so just bucket.
    let j = i;
    const run = [];
    while (j < sections.length && headingToGroup.get(sections[j].raw) === groupName) {
      run.push(sections[j]);
      j += 1;
    }
    blocks.push({ type: "group", name: groupName, sections: run });
    i = j;
  }

  return blocks.map((block, idx) => {
    if (block.type === "visible") {
      const md = block.sections.map((s) => s.markdown).join("");
      return (
        <ReactMarkdown key={idx} remarkPlugins={[remarkGfm]} components={mdComponents}>
          {md}
        </ReactMarkdown>
      );
    }
    const isOpen = !!revealed[`${block.name}-${idx}`];
    const md = block.sections.map((s) => s.markdown).join("");
    return (
      <div className="study-group" key={idx}>
        <div className="study-group-header" onClick={() => toggleReveal(`${block.name}-${idx}`)}>
          <span>{block.name}</span>
          <span className="reveal-hint">{isOpen ? "Hide" : "Reveal"}</span>
        </div>
        {isOpen && (
          <div className="study-group-body">
            <ReactMarkdown remarkPlugins={[remarkGfm]} components={mdComponents}>
              {md}
            </ReactMarkdown>
          </div>
        )}
      </div>
    );
  });
}

const mdComponents = {
  h2: ({ node, children, ...props }) => {
    const text = String(children[0] || "");
    const slug = slugify(text);
    return (
      <h2 id={slug} {...props}>
        {children}
      </h2>
    );
  },
};
