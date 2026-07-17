import { useMemo, useState } from "react";
import type { AppDataset } from "../data/repositories";
import { RequirementManager } from "../components/requirements/RequirementManager";
import { EvidenceManager } from "../components/requirements/EvidenceManager";

interface Props {
  dataset: AppDataset;
  actions: { save: (dataset: AppDataset) => void };
}

type Tab = "overview" | "screening" | "requirements" | "evidence" | "monitoring" | "audit";

export function SubprojectDetail({ dataset, actions }: Props) {
  const [subprojectId, setSubprojectId] = useState(dataset.subprojects[0]?.id ?? "");
  const [tab, setTab] = useState<Tab>("overview");
  const subproject = useMemo(() => dataset.subprojects.find((item) => item.id === subprojectId) ?? dataset.subprojects[0], [dataset.subprojects, subprojectId]);
  if (!subproject) return <section className="panel"><h2>No subprojects available</h2></section>;

  const screenings = dataset.screenings.filter((item) => item.subprojectId === subproject.id);
  const findings = dataset.findings.filter((item) => item.subprojectId === subproject.id);
  const audit = dataset.auditEvents.filter((item) => item.entityId === subproject.id || screenings.some((screening) => screening.id === item.entityId) || dataset.requirements.some((req) => req.subprojectId === subproject.id && req.id === item.entityId));

  return (
    <div className="detail-page">
      <section className="panel">
        <div className="section-heading">
          <div>
            <h2>{subproject.code}</h2>
            <p className="source">{subproject.title}</p>
          </div>
          <label className="inline-field">Subproject
            <select value={subproject.id} onChange={(event) => setSubprojectId(event.target.value)}>
              {dataset.subprojects.map((item) => <option key={item.id} value={item.id}>{item.code}</option>)}
            </select>
          </label>
        </div>
        <div className="tabbar" role="tablist">
          {(["overview", "screening", "requirements", "evidence", "monitoring", "audit"] as Tab[]).map((item) => <button key={item} className={tab === item ? "active" : "ghost"} onClick={() => setTab(item)}>{item}</button>)}
        </div>
      </section>

      {tab === "overview" && <section className="panel"><h2>Overview</h2><div className="detail-grid">
        <Info label="Component" value={subproject.component} /><Info label="Type" value={subproject.type} /><Info label="Proponent" value={subproject.proponent} /><Info label="Location" value={`${subproject.municipality}, ${subproject.province}`} /><Info label="Commodity" value={subproject.commodity ?? "Not set"} /><Info label="Stage" value={subproject.stage} /><Info label="Risk" value={subproject.riskLevel} /><Info label="Responsible SES" value={subproject.responsibleSes} /><Info label="Sensitive flags" value={subproject.sensitiveFlags.join(", ") || "None"} />
      </div></section>}

      {tab === "screening" && <section className="panel"><h2>Screening History</h2>{screenings.length === 0 ? <p>No screenings saved for this subproject yet.</p> : screenings.map((item) => <div className="compact-card" key={item.id}><strong>Annex {item.annex} - {item.status}</strong><span>{item.version}</span><small>{item.answers.length} answer(s), updated {new Date(item.updatedAt).toLocaleString()}</small></div>)}</section>}

      {tab === "requirements" && <RequirementManager dataset={dataset} subprojectId={subproject.id} actions={actions} title="Actionable Requirements" />}
      {tab === "evidence" && <EvidenceManager dataset={dataset} subprojectId={subproject.id} actions={actions} />}
      {tab === "monitoring" && <section className="panel"><h2>Monitoring Findings</h2>{findings.length === 0 ? <p>No monitoring findings for this subproject.</p> : findings.map((item) => <div className="compact-card" key={item.id}><strong>{item.finding}</strong><span>{item.severity} | {item.status} | Due {item.dueDate}</span><small>{item.checklist} - {item.responsibleParty}</small></div>)}</section>}
      {tab === "audit" && <section className="panel"><h2>Audit History</h2>{audit.length === 0 ? <p>No audit events for this subproject yet.</p> : audit.map((item) => <div className="compact-card" key={item.id}><strong>{item.action}</strong><span>{item.actor}</span><small>{new Date(item.timestamp).toLocaleString()}</small></div>)}</section>}
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return <div className="info-box"><span>{label}</span><strong>{value}</strong></div>;
}
