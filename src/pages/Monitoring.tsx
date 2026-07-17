import { useEffect, useMemo, useState } from "react";
import { appendAudit, loadJson, type AppDataset } from "../data/repositories";
import type { MonitoringFinding } from "../domain/types";

interface AnnexPItem { id: string; text: string; severityOnNo: MonitoringFinding["severity"] }
interface AnnexPChecklist { id: string; label: string; subprojectTypes: string[]; items: AnnexPItem[] }
interface AnnexPSchema { id: string; title: string; version: string; basis: string; checklists: AnnexPChecklist[] }

interface Props { dataset: AppDataset; actions: { save: (dataset: AppDataset) => void } }

export function Monitoring({ dataset, actions }: Props) {
  const [schema, setSchema] = useState<AnnexPSchema | null>(null);
  const [subprojectId, setSubprojectId] = useState(dataset.subprojects[0]?.id ?? "");
  const [answers, setAnswers] = useState<Record<string, "Compliant" | "Non-compliant" | "N/A">>({});
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [responsibleParty, setResponsibleParty] = useState("Proponent/Contractor");
  const [dueDate, setDueDate] = useState(nextMonthDate());
  const selected = dataset.subprojects.find((item) => item.id === subprojectId) ?? dataset.subprojects[0];

  useEffect(() => { loadJson<AnnexPSchema>("./data/forms/annex-p-monitoring.json").then(setSchema).catch(console.error); }, []);
  const checklist = useMemo(() => {
    if (!schema || !selected) return null;
    return schema.checklists.find((item) => item.subprojectTypes.includes(selected.type)) ?? schema.checklists.find((item) => item.id === "p-general") ?? schema.checklists[0];
  }, [schema, selected]);

  function submitMonitoring() {
    if (!checklist || !selected) return;
    const newFindings: MonitoringFinding[] = checklist.items
      .filter((item) => answers[item.id] === "Non-compliant")
      .map((item) => ({ id: crypto.randomUUID(), subprojectId: selected.id, checklist: checklist.label, finding: `${item.text}${notes[item.id] ? ` Notes: ${notes[item.id]}` : ""}`, severity: item.severityOnNo, status: "Action Assigned", dueDate, responsibleParty }));
    const next = appendAudit({ ...dataset, findings: [...newFindings, ...dataset.findings] }, { entityType: "Monitoring", entityId: selected.id, action: `Submitted ${checklist.label}; created ${newFindings.length} finding(s)`, actor: "SES-Track user" });
    actions.save(next);
  }

  function updateFinding(id: string, patch: Partial<MonitoringFinding>) {
    const findings = dataset.findings.map((item) => item.id === id ? { ...item, ...patch } : item);
    actions.save(appendAudit({ ...dataset, findings }, { entityType: "MonitoringFinding", entityId: id, action: "Updated corrective action/finding status", actor: "SES-Track user" }));
  }

  return (
    <div className="page-grid">
      <section className="panel span-2">
        <div className="section-heading"><div><h2>Annex P Monitoring Form</h2><p className="source">{schema?.basis ?? "Loading Annex P schema..."}</p></div><button onClick={submitMonitoring} disabled={!checklist}>Submit monitoring</button></div>
        <div className="form-toolbar">
          <label>Subproject<select value={selected?.id ?? ""} onChange={(event) => setSubprojectId(event.target.value)}>{dataset.subprojects.map((item) => <option key={item.id} value={item.id}>{item.code}</option>)}</select></label>
          <label>Responsible party<input value={responsibleParty} onChange={(event) => setResponsibleParty(event.target.value)} /></label>
          <label>Corrective action due date<input type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} /></label>
        </div>
        {checklist && <><h3>{checklist.label}</h3>{checklist.items.map((item) => <div className="question-card" key={item.id}>
          <div><strong>{item.id}</strong><p>{item.text}</p><small>Non-compliance severity: {item.severityOnNo}</small></div>
          <div className="answer-controls">
            {(["Compliant", "Non-compliant", "N/A"] as const).map((value) => <label key={value}><input type="radio" name={item.id} checked={answers[item.id] === value} onChange={() => setAnswers((current) => ({ ...current, [item.id]: value }))} /> {value}</label>)}
          </div>
          <textarea placeholder="Observation / evidence reference" value={notes[item.id] ?? ""} onChange={(event) => setNotes((current) => ({ ...current, [item.id]: event.target.value }))} />
        </div>)}</>}
      </section>
      <section className="panel span-2">
        <div className="section-heading"><h2>Findings And Corrective Actions</h2><span>{dataset.findings.filter((item) => item.status !== "Verified Closed").length} open</span></div>
        <div className="table-wrap"><table className="editable-table"><thead><tr><th>Subproject</th><th>Finding</th><th>Severity</th><th>Status</th><th>Due</th><th>Responsible</th></tr></thead><tbody>{dataset.findings.map((item) => <tr key={item.id}>
          <td>{dataset.subprojects.find((sp) => sp.id === item.subprojectId)?.code ?? "Unlinked"}</td>
          <td>{item.finding}</td>
          <td>{item.severity}</td>
          <td><select value={item.status} onChange={(event) => updateFinding(item.id, { status: event.target.value as MonitoringFinding["status"] })}>{["Open", "Action Assigned", "Evidence Submitted", "Verified Closed"].map((status) => <option key={status}>{status}</option>)}</select></td>
          <td><input type="date" value={item.dueDate} onChange={(event) => updateFinding(item.id, { dueDate: event.target.value })} /></td>
          <td><input value={item.responsibleParty} onChange={(event) => updateFinding(item.id, { responsibleParty: event.target.value })} /></td>
        </tr>)}</tbody></table></div>
      </section>
    </div>
  );
}

function nextMonthDate() {
  const date = new Date();
  date.setDate(date.getDate() + 30);
  return date.toISOString().slice(0, 10);
}

