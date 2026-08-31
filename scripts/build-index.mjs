#!/usr/bin/env node
/**
 * build-index.mjs
 *
 * Reads every .md file in corpus/breakdowns/, parses YAML frontmatter,
 * extracts a flat metadata record per promotion, validates the corpus,
 * writes corpus/library-index.json, and mirrors corpus/breakdowns/*.md
 * plus corpus/library-index.json into app/public/corpus/ so Vite can
 * serve them as static assets fetched at runtime by the React app.
 *
 * Run with: node scripts/build-index.mjs   (from the repo root)
 * or:       node ../scripts/build-index.mjs (from app/, via npm scripts)
 *
 * Normalization notes (documented per the project spec):
 *
 * - lead_type raw values collapse into these normalized buckets:
 *     "story"                                  -> Story
 *     "proclamation"                            -> Proclamation
 *     "direct-offer" / "direct offer / invitation" -> Direct Offer
 *     "problem-solution"                        -> Problem-Solution
 *     "secret"                                   -> Secret
 *     "benefit-promise" / "benefit / promise" / "benefit" -> Benefit / Promise
 *     "mixed"                                    -> Mixed
 *   Quoted vs unquoted YAML values are just YAML syntax, not content
 *   differences (e.g. lead_type: "story" === lead_type: story), so the
 *   YAML parser already collapses those; the normalization above only
 *   needs to handle genuine wording variants.
 *
 * - format raw values collapse into these normalized buckets:
 *     "sales-letter" / "sales letter" / any "sales letter (...)" variant,
 *     and the sales-letter/advertisement combo                -> Sales Letter
 *     "ad"                                                     -> Ad
 *     anything containing "web promotion" / "landing page"     -> Web Promotion
 *     anything containing "direct mail" (self-mailer, snap pack, etc.)
 *                                                                -> Direct Mail Package
 *   The original raw string is preserved as `formatRaw`.
 *
 * - source_collection is derived from the ID prefix:
 *     GSL100-DR-*  -> "100 Greatest Sales Letters"
 *     HOF-DR-*     -> "AWAI Direct Response Hall of Fame"
 *     WGDM-DR-*    -> "World's Greatest Direct Mail Sales Letters"
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import yaml from "js-yaml";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const BREAKDOWNS_DIR = path.join(ROOT, "corpus", "breakdowns");
const INDEX_OUT = path.join(ROOT, "corpus", "library-index.json");
const ELEMENTS_OUT = path.join(ROOT, "corpus", "elements-index.json");
const MIRROR_DIR = path.join(ROOT, "app", "public", "corpus");
const MIRROR_BREAKDOWNS_DIR = path.join(MIRROR_DIR, "breakdowns");
const MIRROR_INDEX_OUT = path.join(MIRROR_DIR, "library-index.json");
const MIRROR_ELEMENTS_OUT = path.join(MIRROR_DIR, "elements-index.json");

const SOURCE_COLLECTION_MAP = {
  GSL100: "100 Greatest Sales Letters",
  HOF: "AWAI Direct Response Hall of Fame",
  WGDM: "World's Greatest Direct Mail Sales Letters",
};

function deriveSourceCollection(id) {
  if (!id) return null;
  const prefix = id.split("-DR-")[0];
  return SOURCE_COLLECTION_MAP[prefix] || null;
}

function normalizeLeadType(raw) {
  if (!raw) return null;
  const s = raw.trim().toLowerCase();
  if (s === "story") return "Story";
  if (s === "proclamation") return "Proclamation";
  if (s === "direct-offer" || s === "direct offer / invitation") return "Direct Offer";
  if (s === "problem-solution") return "Problem-Solution";
  if (s === "secret") return "Secret";
  if (s === "benefit-promise" || s === "benefit / promise" || s === "benefit")
    return "Benefit / Promise";
  if (s === "mixed") return "Mixed";
  // Fallback: title-case whatever it is so nothing silently disappears.
  return raw.trim().replace(/\b\w/g, (c) => c.toUpperCase());
}

function normalizeFormat(raw) {
  if (!raw) return null;
  const s = raw.trim().toLowerCase();
  if (s.includes("web promotion") || s.includes("landing page")) return "Web Promotion";
  if (s.includes("direct mail")) return "Direct Mail Package";
  if (s.startsWith("sales letter") || s.startsWith("sales-letter")) return "Sales Letter";
  if (s === "ad") return "Ad";
  return raw.trim().replace(/\b\w/g, (c) => c.toUpperCase());
}

function stripMarkdown(body) {
  return body
    .replace(/```[\s\S]*?```/g, " ") // fenced code blocks
    .replace(/`[^`]*`/g, " ") // inline code
    .replace(/^#{1,6}\s+/gm, "") // heading markers
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1") // links -> text
    .replace(/[*_~>#|-]/g, " ") // markdown punctuation
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function splitFrontmatter(raw) {
  // Expect: ---\n<yaml>\n---\n<body>
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!match) return null;
  return { frontmatterRaw: match[1], body: match[2] };
}

function asStringArray(val) {
  if (val == null) return [];
  if (Array.isArray(val)) return val.map((v) => String(v));
  return [String(val)];
}

const ELEMENT_HEADINGS = [
  ["lead", /lead analysis|lead type/i],
  ["subhead", /subhead/i],
  ["mechanism", /mechanism analysis|mechanism/i],
  ["proof_stack", /claim.*proof|credibility architecture/i],
  ["objection_handling", /objections addressed/i],
  ["guarantee", /guarantee/i],
  ["offer", /offer architecture/i],
  ["cta", /close.*cta|close\/cta/i],
  ["ps", /\bps\b|postscript/i],
  ["bullet", /dimensionalization/i],
];

function cleanElementText(markdown) {
  return markdown
    .replace(/^##\s+.*$/m, "")
    .replace(/^###\s+/gm, "")
    .replace(/\*\*/g, "")
    .replace(/`/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function splitElementTextAndAnalysis(markdown, fallbackFunction) {
  let text = cleanElementText(markdown);
  const read = (label, nextLabels) => {
    const boundary = nextLabels.length ? `(?=${nextLabels.map((next) => `\\*?${next}:`).join("|")}|$)` : "$";
    const match = text.match(new RegExp(`\\*?${label}:\\*?\\s*([\\s\\S]*?)${boundary}`, "i"));
    return match?.[1]?.trim() || null;
  };
  const analysis = {
    function: read("Function", ["Key Move", "Why It Matters"]) || fallbackFunction,
    key_move: read("Key Move", ["Why It Matters"]),
    why_it_matters: read("Why It Matters", []),
  };
  text = text
    .replace(/\*?Function:\*?\s*[\s\S]*?(?=\*?(?:Key Move|Why It Matters):|$)/i, "")
    .replace(/\*?Key Move:\*?\s*[\s\S]*?(?=\*?Why It Matters:|$)/i, "")
    .replace(/\*?Why It Matters:\*?\s*[\s\S]*$/i, "")
    .trim();
  return { text, analysis };
}

function sectionBlocks(body) {
  const matches = [...body.matchAll(/^##\s+(.+?)\s*$/gm)];
  return matches.map((match, index) => ({
    heading: match[1].trim(),
    text: body.slice(match.index, index + 1 < matches.length ? matches[index + 1].index : body.length),
  }));
}

function classifyElementHeading(heading) {
  return ELEMENT_HEADINGS.find(([, pattern]) => pattern.test(heading))?.[0] || null;
}

function provenanceFor(record) {
  return record.id?.startsWith("HOF-") ? "Known control" : "Unknown";
}

function structuralElementType(label) {
  const value = label.toLowerCase();
  if (/headline|hook|qualifying question|big idea statement/.test(value)) return "lead";
  if (/subhead/.test(value)) return "subhead";
  if (/bullet|cascade|content preview/.test(value)) return "bullet";
  if (/mechanism|objectivity|convenience/.test(value)) return "mechanism";
  if (/proof|credibility|value framing/.test(value)) return "proof_stack";
  if (/objection|reframe/.test(value)) return "objection_handling";
  if (/guarantee|risk reversal/.test(value)) return "guarantee";
  if (/offer|price/.test(value)) return "offer";
  if (/close|cta|action/.test(value)) return "cta";
  if (/\bps\b|postscript/.test(value)) return "ps";
  return null;
}

function extractStructuralElements(record, body, counters) {
  const block = sectionBlocks(body).find(({ heading }) => /structural map/i.test(heading));
  if (!block) return [];
  const pattern = /^\d+\.\s+\*\*(.+?)\*\*\s+—\s+([\s\S]*?)(?=\n\d+\.\s+\*\*|\n\n\*\*Compressed|$)/gm;
  return [...block.text.matchAll(pattern)].flatMap((match) => {
    const label = match[1].trim();
    const elementType = structuralElementType(label);
    if (!elementType) return [];
    const count = (counters.get(elementType) || 0) + 1;
    counters.set(elementType, count);
    const split = splitElementTextAndAnalysis(match[2], label);
    return split.text ? [{
      element_id: `${record.id}__${elementType}-${count}`,
      letter_id: record.id,
      element_type: elementType,
      text: split.text,
      analysis: split.analysis,
      lead_type: record.leadTypeNormalized,
      awareness: record.awareness,
      market: record.market,
      mechanism: record.mechanism_type,
      provenance: provenanceFor(record),
      annotated: true,
    }] : [];
  });
}

function extractHeadline(record, body) {
  const candidate = sectionBlocks(body).find(({ heading }) => /headline/i.test(heading));
  if (!candidate) return null;
  const quoted = candidate.text.match(/[“"]([^”"]{12,})[”"]/);
  if (!quoted) return null;
  const split = splitElementTextAndAnalysis(quoted[1], candidate.heading);
  return split.text ? {
    element_id: `${record.id}__headline`, letter_id: record.id, element_type: "headline", text: split.text, analysis: split.analysis,
    lead_type: record.leadTypeNormalized, awareness: record.awareness, market: record.market, mechanism: record.mechanism_type,
    provenance: provenanceFor(record), annotated: true,
  } : null;
}

function extractElements(record, body) {
  const counters = new Map();
  const headline = extractHeadline(record, body);
  if (headline) counters.set("headline", 1);
  return [...(headline ? [headline] : []), ...extractStructuralElements(record, body, counters), ...sectionBlocks(body).flatMap(({ heading, text }) => {
    const elementType = classifyElementHeading(heading);
    if (!elementType || !cleanElementText(text)) return [];
    const count = (counters.get(elementType) || 0) + 1;
    counters.set(elementType, count);
    const split = splitElementTextAndAnalysis(text, heading);
    return split.text ? [{
      element_id: `${record.id}__${elementType}${count > 1 ? `-${count}` : ""}`,
      letter_id: record.id,
      element_type: elementType,
      text: split.text,
      analysis: split.analysis,
      lead_type: record.leadTypeNormalized,
      awareness: record.awareness,
      market: record.market,
      mechanism: record.mechanism_type,
      provenance: provenanceFor(record),
      annotated: true,
    }] : [];
  })];
}

function main() {
  const warnings = [];
  const failed = [];
  const missingTitles = [];
  const idCounts = new Map();
  const records = [];
  const elements = [];

  if (!fs.existsSync(BREAKDOWNS_DIR)) {
    console.error(`Breakdowns directory not found: ${BREAKDOWNS_DIR}`);
    process.exit(1);
  }

  const files = fs
    .readdirSync(BREAKDOWNS_DIR)
    .filter((f) => f.toLowerCase().endsWith(".md"))
    .sort();

  for (const file of files) {
    const filePath = path.join(BREAKDOWNS_DIR, file);
    const relFilePath = path.join("corpus", "breakdowns", file);
    let raw;
    try {
      raw = fs.readFileSync(filePath, "utf8");
    } catch (err) {
      failed.push(`${file}: read error - ${err.message}`);
      continue;
    }

    const split = splitFrontmatter(raw);
    if (!split) {
      failed.push(`${file}: no valid frontmatter block found`);
      continue;
    }

    let fm;
    try {
      fm = yaml.load(split.frontmatterRaw) || {};
    } catch (err) {
      failed.push(`${file}: YAML parse error - ${err.message}`);
      continue;
    }

    const headingMatches = [...split.body.matchAll(/^##\s+(.+)$/gm)];
    if (headingMatches.length === 0) {
      failed.push(`${file}: no "## " headings found (structural sanity check failed)`);
      continue;
    }

    const id = fm.id ? String(fm.id).trim() : null;
    const title = fm.title ? String(fm.title).trim() : null;

    if (!id || !title) {
      missingTitles.push(`${file} (id=${id || "MISSING"}, title=${title || "MISSING"})`);
    }

    if (id) {
      idCounts.set(id, (idCounts.get(id) || 0) + 1);
    }

    const formatRaw = fm.format != null ? String(fm.format) : null;
    const leadTypeRaw = fm.lead_type != null ? String(fm.lead_type) : null;

    const record = {
      id,
      title,
      brand: fm.brand != null ? String(fm.brand) : null,
      market: fm.market != null ? String(fm.market) : null,
      format: formatRaw,
      formatNormalized: normalizeFormat(formatRaw),
      copywriter: fm.copywriter != null ? String(fm.copywriter) : null,
      source: fm.source != null ? String(fm.source) : null,
      source_pages: fm.source_pages != null ? String(fm.source_pages) : null,
      lead_type: leadTypeRaw,
      leadTypeNormalized: normalizeLeadType(leadTypeRaw),
      awareness: fm.awareness != null ? String(fm.awareness) : null,
      mechanism_type: fm.mechanism_type != null ? String(fm.mechanism_type) : null,
      proof_types: asStringArray(fm.proof_types),
      dimensionalization: asStringArray(fm.dimensionalization),
      offer_type: fm.offer_type != null ? String(fm.offer_type) : null,
      big_idea: fm.big_idea != null ? String(fm.big_idea) : null,
      confidence: fm.confidence != null ? String(fm.confidence) : null,
      mode: fm.mode != null ? String(fm.mode) : null,
      source_collection: deriveSourceCollection(id),
      filepath: relFilePath.split(path.sep).join("/"),
      searchText: stripMarkdown(split.body),
    };

    records.push(record);
    elements.push(...extractElements(record, split.body));
  }

  const duplicateIds = [...idCounts.entries()]
    .filter(([, count]) => count > 1)
    .map(([id, count]) => `${id} (x${count})`);

  // Metadata coverage warnings
  const total = records.length;
  const fieldsToCheck = [
    "brand",
    "proof_types",
    "dimensionalization",
    "offer_type",
    "copywriter",
  ];
  for (const field of fieldsToCheck) {
    const missing = records.filter((r) => {
      const v = r[field];
      if (Array.isArray(v)) return v.length === 0;
      return v == null || v === "" || v.toLowerCase?.() === "unknown";
    }).length;
    if (missing > 0) {
      warnings.push(`${missing} files missing/unknown ${field}`);
    }
  }

  records.sort((a, b) => (a.id || "").localeCompare(b.id || ""));

  fs.mkdirSync(path.dirname(INDEX_OUT), { recursive: true });
  fs.writeFileSync(INDEX_OUT, JSON.stringify(records, null, 2), "utf8");
  fs.writeFileSync(ELEMENTS_OUT, JSON.stringify(elements, null, 2), "utf8");

  // Mirror into app/public/corpus (idempotent: clear and recopy breakdowns dir)
  fs.mkdirSync(MIRROR_BREAKDOWNS_DIR, { recursive: true });
  // Remove stale files in the mirror that no longer exist in source
  const existingMirrorFiles = fs.existsSync(MIRROR_BREAKDOWNS_DIR)
    ? fs.readdirSync(MIRROR_BREAKDOWNS_DIR)
    : [];
  const sourceFileSet = new Set(files);
  for (const f of existingMirrorFiles) {
    if (!sourceFileSet.has(f)) {
      fs.unlinkSync(path.join(MIRROR_BREAKDOWNS_DIR, f));
    }
  }
  for (const file of files) {
    fs.copyFileSync(path.join(BREAKDOWNS_DIR, file), path.join(MIRROR_BREAKDOWNS_DIR, file));
  }
  fs.writeFileSync(MIRROR_INDEX_OUT, JSON.stringify(records, null, 2), "utf8");
  fs.writeFileSync(MIRROR_ELEMENTS_OUT, JSON.stringify(elements, null, 2), "utf8");

  // Report
  console.log(`Total breakdown files found: ${files.length}`);
  console.log(`Total successfully indexed: ${records.length}`);
  console.log(`Failed/unindexed files: ${failed.length ? failed.join("; ") : "none"}`);
  console.log(`Duplicate IDs: ${duplicateIds.length ? duplicateIds.join(", ") : "none"}`);
  console.log(`Missing titles: ${missingTitles.length ? missingTitles.join("; ") : "none"}`);
  console.log(`Metadata warnings: ${warnings.length ? warnings.join("; ") : "none"}`);
  console.log(`Atomic elements extracted: ${elements.length}`);

  if (failed.length > 0 || duplicateIds.length > 0 || missingTitles.length > 0) {
    process.exitCode = 0; // still write output, but signal issues via non-empty report
  }
}

main();
