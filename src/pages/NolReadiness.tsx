import { useState } from "react";
import type { AppDataset } from "../data/repositories";
import { RequirementManager } from "../components/requirements/RequirementManager";
import { evaluateNolReadiness } from "../rules/evaluateNolReadiness";

interface Props {
  dataset: AppDataset;
  actions: { save: (dataset: AppDataset) => void };
}

export function NolReadiness({ dataset, actions }: Props) {
  const [subprojectId, setSubprojectId] = useState(dataset.subprojects[0]?.id ?? "");
  const selected = dataset.subprojects.find((item) => item.id === subprojectId) ?? dataset.subprojects[0];
  if (!selected) return <section className="panel"><h2>No subprojects available</h2></section>;
  const requirements = dataset.requirements.filter((item) => item.subprojectId === selected.id);
  const nol1 = evaluateNolReadiness(requirements, "NOL1");
  const nol2 = evaluateNolReadiness(requirements, "NOL2");

  return (
    <div className="page-grid">
      <section className="panel span-2">
        <div className="section-heading">
          <div><h2>NOL Readiness Workspace</h2><p className="source">Readiness is advisory until confirmed by authorized SES reviewer.</p></div>
          <label className="inline-field">Subproject
            <select value={selected.id} onChange={(event) => setSubprojectId(event.target.value)}>
              {dataset.subprojects.map((item) => <option key={item.id} value={item.id}>{item.code}</option>)}
            </select>
          </label>
        </div>
      </section>
      {[nol1, nol2].map((gate) => (
        <section className="panel" key={gate.gate}>
          <div className="section-heading">
            <h2>{gate.gate} Readiness</h2>
            <span className={gate.ready ? "status good" : "status bad"}>{gate.ready ? "Ready for review" : "Blocked"}</span>
          </div>
          <p>{gate.explanation}</p>
          {gate.blockers.map((item) => (
            <div className="compact-card danger" key={item.id}>
              <strong>{item.label}</strong>
              <span>{item.status} | Owner: {item.owner} | Due: {item.dueDate || "Not set"}</span>
              <small>{item.basis}</small>
            </div>
          ))}
        </section>
      ))}
      <RequirementManager dataset={dataset} subprojectId={selected.id} actions={actions} title={`Requirement Matrix: ${selected.code}`} />
    </div>
  );
}

