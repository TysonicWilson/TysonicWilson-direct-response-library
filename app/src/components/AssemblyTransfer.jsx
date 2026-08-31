import { useEffect, useState } from "react";

const FIELDS = [
  ["sourceElement", "Source element", "Which part of this letter: headline, lead, mechanism, proof stack, offer, CTA, or PS?"],
  ["transferablePrinciple", "Transferable principle", "The framework that moves—in your words, not the wording."],
  ["worthSwiping", "Worth swiping", "yes / no / conditional"],
  ["doNotCopy", "What not to copy", "Context-bound phrasing, claims, or proof that will not transfer."],
  ["newMarket", "New market / offer", "Where you would apply the principle."],
  ["whyTransfers", "Why it transfers", "The structural reason it works in the new context."],
  ["adaptedHeadline", "Adapted headline", ""],
  ["adaptedLead", "Adapted lead", ""],
  ["adaptedBullets", "Adapted bullets (3–5)", ""],
  ["adaptedProof", "Adapted proof", ""],
  ["adaptedCta", "Adapted CTA", ""],
  ["changeNotes", "What you changed and why", "Articulate the adaptation logic."],
];

export default function AssemblyTransfer({ letterId }) {
  const storageKey = `dr-library:assembly-transfer:${letterId}`;
  const [values, setValues] = useState({});
  const [open, setOpen] = useState(false);
  useEffect(() => { try { setValues(JSON.parse(localStorage.getItem(storageKey) || "{}")); } catch { setValues({}); } }, [storageKey]);
  function update(key, value) { const next = { ...values, [key]: value }; setValues(next); try { localStorage.setItem(storageKey, JSON.stringify(next)); } catch { /* local storage is optional */ } }
  return <section className="assembly-transfer study-group"><button className="study-group-header" onClick={() => setOpen((value) => !value)}><span>Assembly / Transfer Output</span><span className="reveal-hint">{open ? "Hide workbench" : "Open workbench"}</span></button>{open && <div className="study-group-body"><p className="assembly-transfer-intro">Classification tells you whether an element transfers. This is the production rep: adapt the principle, then explain the change.</p><h3>Transfer decision</h3>{FIELDS.slice(0, 4).map(([key, label, hint]) => <Field key={key} label={label} hint={hint} value={values[key] || ""} onChange={(value) => update(key, value)} />)}<h3>Target application</h3>{FIELDS.slice(4, 6).map(([key, label, hint]) => <Field key={key} label={label} hint={hint} value={values[key] || ""} onChange={(value) => update(key, value)} />)}<h3>Reassembled draft</h3>{FIELDS.slice(6).map(([key, label, hint]) => <Field key={key} label={label} hint={hint} value={values[key] || ""} onChange={(value) => update(key, value)} />)}</div>}</section>;
}

function Field({ label, hint, value, onChange }) { return <label className="assembly-field"><span>{label}</span>{hint && <small>{hint}</small>}<textarea value={value} onChange={(event) => onChange(event.target.value)} rows={label.includes("bullets") || label.includes("changed") ? 4 : 2} /></label>; }
