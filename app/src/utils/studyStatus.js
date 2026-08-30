// Study status tracking, persisted in localStorage. No backend/accounts.

const STORAGE_KEY = "dr-library:study-status";

export const STATUS_VALUES = ["not-studied", "studying", "completed"];
export const STATUS_LABELS = {
  "not-studied": "Not Studied",
  studying: "Studying",
  completed: "Completed",
};

function readAll() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function writeAll(map) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  } catch {
    // localStorage unavailable (private mode, quota, etc.) — fail silently.
  }
}

export function getStudyStatus(id) {
  const all = readAll();
  return all[id] || "not-studied";
}

export function getAllStudyStatuses() {
  return readAll();
}

export function setStudyStatus(id, status) {
  const all = readAll();
  if (status === "not-studied") {
    delete all[id];
  } else {
    all[id] = status;
  }
  writeAll(all);
}
