import { useEffect, useState } from "react";
import type { AppDataset } from "../data/repositories";
import { loadSidlanSummary, type SidlanSnapshotSummary } from "../data/sidlan";

interface Props { dataset: AppDataset; role: string }

export function Dashboard({ dataset, role }: Props) {
  const [sidlan, setSidlan] = useState<SidlanSnapshotSummary | null>(null);
  const blockers = dataset.requirements.filter((item) => item.blocking && !["Accepted", "Not Applicable"].includes(item.status));
  const restrictedGrm = dataset.grievances.filter((item) => item.isRestricted).length;
  const overdueFindings = dataset.findings.filter((item) => item.status !== "Verified Closed" && new Date(item.dueDate) < new Date()).length;

  useEffect(() => {
    loadSidlanSummary().then(setSidlan);
  }, []);

  return (
    <div className="page-grid">
      <section className="panel span-2">
        <div className="section-heading">
          <h2>Operating View</h2>
          <span>{role}</span>
        </div>
        <div className="metric-grid">
          <Metric label="Subprojects" value={dataset.subprojects.length} />
          <Metric label="NOL blockers" value={blockers.length} tone="danger" />
          <Metric label="Open findings" value={dataset.findings.filter((item) => item.status !== "Verified Closed").length} />
          <Metric label="Restricted GRM" value={restrictedGrm} tone="caution" />
          <Metric label="Overdue actions" value={overdueFindings} tone={overdueFindings ? "danger" : undefined} />
        </div>
      </section>
      {sidlan && <section className="panel span-2 source-panel">
        <div className="section-heading">
          <div>
            <h2>Official Source Snapshot</h2>
            <p className="source"><a href={sidlan.sourceUrl} target="_blank" rel="noreferrer">{sidlan.sourceName}</a> | {sidlan.region} | fetched {new Date(sidlan.fetchedAt).toLocaleString()}</p>
          </div>
        </div>
        <div className="source-grid">
          {sidlan.sources.map((source) => (
            <div className="compact-card" key={source.sourceKind}>
              <strong>{source.sourceKind === "infrastructure" ? "Infrastructure Subprojects" : "Enterprise Subprojects"}</strong>
              <span className={source.ok ? "status good" : "status bad"}>{source.ok ? "Fetched" : "Source error"}</span>
              <small>{source.ok ? `${source.observed?.rows ?? 0} disclosure row(s), ${source.observed?.uniqueSubprojects ?? 0} unique subproject(s)` : "SIDLAN endpoint returned an error during the last refresh."}</small>
            </div>
          ))}
        </div>
      </section>}
      <section className="panel">
        <h2>Portfolio By Component</h2>
        {Object.entries(groupBy(dataset.subprojects.map((item) => item.component))).map(([key, count]) => (
          <div className="list-row" key={key}><span>{key}</span><strong>{count}</strong></div>
        ))}
      </section>
      <section className="panel">
        <h2>Priority Blockers</h2>
        {blockers.length === 0 ? <p>No blocking requirements.</p> : blockers.map((item) => (
          <div className="compact-card" key={item.id}>
            <strong>{item.label}</strong>
            <small>{item.basis}</small>
          </div>
        ))}
      </section>
    </div>
  );
}

function Metric({ label, value, tone }: { label: string; value: number; tone?: "danger" | "caution" }) {
  return <div className={`metric ${tone ?? ""}`}><span>{label}</span><strong>{value}</strong></div>;
}

function groupBy(items: string[]) {
  return items.reduce<Record<string, number>>((acc, item) => {
    acc[item] = (acc[item] ?? 0) + 1;
    return acc;
  }, {});
}
