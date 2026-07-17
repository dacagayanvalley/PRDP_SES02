import { useState } from "react";
import { appendAudit, type AppDataset } from "../data/repositories";
import type { GrievanceCase } from "../domain/types";
import { addWorkingDays } from "../rules/sla";

interface Props { dataset: AppDataset; actions: { save: (dataset: AppDataset) => void } }

const categories = ["Right-of-way concern", "Consultation concern", "Infrastructure quality", "Enterprise operation", "Worker concern", "GBV/SEA/SH", "Fraud/Corruption", "Other feedback"];
const channels = ["Walk-in", "Phone", "SMS", "Email", "Social media", "Consultation", "Barangay/FCA", "Letter"];

export function Grm({ dataset, actions }: Props) {
  const [subprojectId, setSubprojectId] = useState("");
  const [category, setCategory] = useState(categories[0]);
  const [channel, setChannel] = useState(channels[0]);
  const [anonymous, setAnonymous] = useState(true);

  function createCase() {
    const restricted = category === "GBV/SEA/SH" || category === "Fraud/Corruption";
    const receivedAt = new Date().toISOString();
    const record: GrievanceCase = {
      id: crypto.randomUUID(),
      reference: `GRM-R02-${new Date().getFullYear()}-${String(dataset.grievances.length + 1).padStart(4, "0")}`,
      subprojectId: subprojectId || undefined,
      category,
      channel,
      status: restricted ? "Restricted Referral" : "Received",
      isAnonymous: anonymous,
      isRestricted: restricted,
      receivedAt,
      nextDueAt: restricted ? receivedAt : addWorkingDays(receivedAt, 2),
    };
    actions.save(appendAudit({ ...dataset, grievances: [record, ...dataset.grievances] }, { entityType: "Grievance", entityId: record.id, action: restricted ? "Created restricted GRM referral case" : "Created GRM intake case", actor: "Static MVP user" }));
  }

  function transitionCase(id: string, status: GrievanceCase["status"], days: number, action: string) {
    const grievances = dataset.grievances.map((item) => item.id === id ? { ...item, status, nextDueAt: addWorkingDays(new Date().toISOString(), days) } : item);
    actions.save(appendAudit({ ...dataset, grievances }, { entityType: "Grievance", entityId: id, action, actor: "Static MVP user" }));
  }

  return (
    <div className="page-grid">
      <section className="panel span-2">
        <div className="section-heading"><div><h2>GRM Intake And Workflow</h2><p className="source">Local/synthetic only. Restricted cases are redacted from ordinary views and reports.</p></div><button onClick={createCase}>Create case</button></div>
        <div className="form-toolbar">
          <label>Related subproject<select value={subprojectId} onChange={(event) => setSubprojectId(event.target.value)}><option value="">Unlinked / public intake</option>{dataset.subprojects.map((item) => <option key={item.id} value={item.id}>{item.code}</option>)}</select></label>
          <label>Category<select value={category} onChange={(event) => setCategory(event.target.value)}>{categories.map((item) => <option key={item}>{item}</option>)}</select></label>
          <label>Channel<select value={channel} onChange={(event) => setChannel(event.target.value)}>{channels.map((item) => <option key={item}>{item}</option>)}</select></label>
          <label className="checkbox-field"><input type="checkbox" checked={anonymous} onChange={(event) => setAnonymous(event.target.checked)} /> Anonymous</label>
        </div>
      </section>
      <section className="panel span-2">
        <h2>GRM Registry</h2>
        <div className="table-wrap"><table><thead><tr><th>Reference</th><th>Subproject</th><th>Category</th><th>Channel</th><th>Status</th><th>Anonymous</th><th>Next due</th><th>Actions</th></tr></thead><tbody>{dataset.grievances.map((item) => (
          <tr key={item.id} className={item.isRestricted ? "restricted-row" : ""}>
            <td>{item.reference}</td>
            <td>{item.subprojectId ? dataset.subprojects.find((sp) => sp.id === item.subprojectId)?.code : "Unlinked"}</td>
            <td>{item.isRestricted ? "Restricted confidential category" : item.category}</td>
            <td>{item.isRestricted ? "Redacted" : item.channel}</td>
            <td>{item.status}</td>
            <td>{item.isAnonymous ? "Yes" : "No"}</td>
            <td>{new Date(item.nextDueAt).toLocaleDateString()}</td>
            <td className="action-cell">
              {!item.isRestricted && <>
                <button className="small" onClick={() => transitionCase(item.id, "Screened", 3, "Screened GRM case")}>Screen</button>
                <button className="small" onClick={() => transitionCase(item.id, "Assigned", 10, "Assigned GRM case")}>Assign</button>
                <button className="small" onClick={() => transitionCase(item.id, "Escalated", 30, "Escalated GRM case")}>Escalate</button>
              </>}
              <button className="small ghost" onClick={() => transitionCase(item.id, item.isRestricted ? "Restricted Referral" : "Closed", 0, item.isRestricted ? "Recorded restricted referral follow-up" : "Closed GRM case")}>{item.isRestricted ? "Referral" : "Close"}</button>
            </td>
          </tr>
        ))}</tbody></table></div>
      </section>
    </div>
  );
}
