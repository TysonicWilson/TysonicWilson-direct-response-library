// Parses "## " headings out of a breakdown's markdown body and maps each
// heading to a Study Mode reveal-group, generically per-file (never assuming
// a fixed canonical heading list — one corpus file has an extra trailing
// heading, and this must not crash or drop it).

// Ordered keyword -> group-name rules. First match wins. Matching is
// case-insensitive and ignores leading numbering ("1.", "12.", etc.).
const KEYWORD_RULES = [
  { group: "Big Idea", keywords: ["big idea"] },
  { group: "Lead", keywords: ["lead analysis", "lead type", "lead"] },
  { group: "Structure", keywords: ["structural map", "structure"] },
  { group: "Claim → Proof", keywords: ["claim", "proof"] },
  { group: "Mechanism", keywords: ["mechanism"] },
  { group: "Dimensionalization", keywords: ["dimensionalization"] },
  { group: "Offer", keywords: ["offer"] },
  { group: "Reusable Principles", keywords: ["reusable principles"] },
];

// Headings that are always-visible context, never collapsed by Study Mode.
const ALWAYS_VISIBLE = ["source metadata", "executive breakdown"];

export function parseHeadings(markdownBody) {
  // Matches "## Heading text" (not "### " sub-headings) at line start.
  const regex = /^##\s+(.+?)\s*$/gm;
  const headings = [];
  let match;
  while ((match = regex.exec(markdownBody)) !== null) {
    headings.push({
      raw: match[1].trim(),
      index: match.index,
    });
  }
  // Compute slug/anchor + body span (up to the next ## heading or EOF)
  return headings.map((h, i) => {
    const start = h.index;
    const end = i + 1 < headings.length ? headings[i + 1].index : markdownBody.length;
    const slug = slugify(h.raw);
    return { raw: h.raw, slug, start, end };
  });
}

export function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");
}

// Strips a leading "N. " numbering prefix for matching purposes.
function stripNumbering(text) {
  return text.replace(/^\d+\.\s*/, "").trim();
}

export function classifyHeading(rawHeading) {
  const cleaned = stripNumbering(rawHeading).toLowerCase();

  if (ALWAYS_VISIBLE.some((k) => cleaned.includes(k))) {
    return { alwaysVisible: true, group: null };
  }

  for (const rule of KEYWORD_RULES) {
    if (rule.keywords.some((kw) => cleaned.includes(kw))) {
      return { alwaysVisible: false, group: rule.group };
    }
  }

  return { alwaysVisible: false, group: "Additional Analysis" };
}

// Groups parsed headings into Study Mode sections:
// { alwaysVisible: [heading...], groups: { groupName: [heading...] } }
// preserving document order within each bucket.
export function buildStudyGroups(headings) {
  const alwaysVisible = [];
  const groupsMap = new Map();

  for (const h of headings) {
    const { alwaysVisible: isAlways, group } = classifyHeading(h.raw);
    if (isAlways) {
      alwaysVisible.push(h);
    } else {
      if (!groupsMap.has(group)) groupsMap.set(group, []);
      groupsMap.get(group).push(h);
    }
  }

  return { alwaysVisible, groups: groupsMap };
}
