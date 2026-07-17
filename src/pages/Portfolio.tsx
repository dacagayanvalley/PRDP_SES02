import type { AppDataset } from "../data/repositories";
import { appendAudit } from "../data/repositories";
import type { Subproject } from "../domain/types";

interface Props {
  dataset: AppDataset;
  actions: { save: (dataset: AppDataset, message?: string) => void };
}

export function Portfolio({ dataset, actions }: Props) {
  function addSyntheticRecord() {
    const existingCodes = new Set(dataset.subprojects.map((item) => item.code));
    let sequence = dataset.subprojects.length + 1;
    let code = `R02-IBUILD-DEM-2026-${String(sequence).padStart(4, "0")}`;
    while (existingCodes.has(code)) {
      sequence += 1;
      code = `R02-IBUILD-DEM-2026-${String(sequence).padStart(4, "0")}`;
    }
    const record: Subproject = {
      id: crypto.randomUUID(),
      code,
      title: "New synthetic safeguards record",
      component: "IBUILD",
      type: "Farm-to-Market Road",
      proponent: "Synthetic LGU",
      province: "Cagayan",
      municipality: "Demo Municipality",
      estimatedCostPhp: 0,
      stage: "Draft",
      riskLevel: "Moderate",
      responsibleSes: "Unassigned",
      sensitiveFlags: [],
      updatedAt: new Date().toISOString(),
    };
    const withRecord = { ...dataset, subprojects: [record, ...dataset.subprojects] };
    actions.save(appendAudit(withRecord, { entityType: "Subproject", entityId: record.id, action: "Created local synthetic record", actor: "Static MVP user" }), `Created ${record.code}`);
  }

  return (
    <section className="panel">
      <div className="section-heading">
        <div><h2>Subproject Safeguards Records</h2><p className="source">Duplicate codes are prevented for generated local records.</p></div>
        <button onClick={addSyntheticRecord}>Add synthetic record</button>
      </div>
      {dataset.subprojects.length === 0 ? <p>No subprojects yet. Add a synthetic record or import a CSV.</p> : <div className="table-wrap">
        <table>
          <thead><tr><th>Code</th><th>Title</th><th>Component</th><th>Location</th><th>Stage</th><th>Risk</th><th>Sensitive</th></tr></thead>
          <tbody>
            {dataset.subprojects.map((item) => (
              <tr key={item.id}>
                <td>{item.code}</td>
                <td>{item.title}</td>
                <td>{item.component}</td>
                <td>{item.municipality}, {item.province}</td>
                <td><span className="pill">{item.stage}</span></td>
                <td>{item.riskLevel}</td>
                <td>{item.sensitiveFlags.length ? item.sensitiveFlags.join(", ") : "None"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>}
    </section>
  );
}
