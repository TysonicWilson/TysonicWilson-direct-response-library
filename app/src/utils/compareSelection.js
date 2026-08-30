// Compare-mode selection, persisted in localStorage so it survives navigation
// between Library Home and the Compare view.

const STORAGE_KEY = "dr-library:compare-selection";
export const MAX_COMPARE = 4;

function readAll() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function writeAll(list) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch {
    // ignore
  }
}

export function getCompareSelection() {
  return readAll();
}

export function toggleCompareSelection(id) {
  const list = readAll();
  const idx = list.indexOf(id);
  if (idx >= 0) {
    list.splice(idx, 1);
  } else {
    if (list.length >= MAX_COMPARE) return list; // no-op if already full
    list.push(id);
  }
  writeAll(list);
  return list;
}

export function clearCompareSelection() {
  writeAll([]);
}
