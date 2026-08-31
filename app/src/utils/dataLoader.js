// Loads the pre-built library index and individual breakdown markdown files.
// The index and breakdown .md files are served as static assets from
// app/public/corpus/ (mirrored there by scripts/build-index.mjs).

const BASE = import.meta.env.BASE_URL; // respects vite base:'./' setting

let indexPromise = null;
let elementsPromise = null;

export function loadLibraryIndex() {
  if (!indexPromise) {
    indexPromise = fetch(`${BASE}corpus/library-index.json`).then((res) => {
      if (!res.ok) throw new Error(`Failed to load library index: ${res.status}`);
      return res.json();
    });
  }
  return indexPromise;
}

export function loadElementsIndex() {
  if (!elementsPromise) {
    elementsPromise = fetch(`${BASE}corpus/elements-index.json`).then((res) => {
      if (!res.ok) throw new Error(`Failed to load element index: ${res.status}`);
      return res.json();
    });
  }
  return elementsPromise;
}

const mdCache = new Map();

export function loadBreakdownMarkdown(filepath) {
  // filepath looks like "corpus/breakdowns/HOF-DR-011-....md"
  // The mirrored copy lives at app/public/corpus/breakdowns/<file>
  const filename = filepath.split("/").pop();
  const url = `${BASE}corpus/breakdowns/${filename}`;
  if (mdCache.has(url)) return mdCache.get(url);
  const p = fetch(url).then((res) => {
    if (!res.ok) throw new Error(`Failed to load breakdown: ${res.status}`);
    return res.text();
  });
  mdCache.set(url, p);
  return p;
}

// Strips the YAML frontmatter block from a raw markdown file, returning
// { frontmatterRaw, body }.
export function splitFrontmatter(raw) {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!match) return { frontmatterRaw: "", body: raw };
  return { frontmatterRaw: match[1], body: match[2] };
}
