import type { AppDataset } from "../data/repositories";

interface Props {
  dataset: AppDataset;
}

export function Portfolio({ dataset }: Props) {
  return (
    <section className="panel">
      <div className="section-heading">
        <div>
          <h2>Official Subproject Safeguards Records</h2>
          <p className="source">Records are loaded from the SIDLAN Region II disclosure snapshot. New records must originate from the official source refresh process.</p>
        </div>
      </div>
      {dataset.subprojects.length === 0 ? <p>No official SIDLAN Region II subprojects are available in the current snapshot.</p> : <div className="table-wrap">
        <table>
          <thead><tr><th>Code</th><th>Title</th><th>Component</th><th>Location</th><th>Stage</th><th>Risk</th><th>Fund Source</th></tr></thead>
          <tbody>
            {dataset.subprojects.map((item) => (
              <tr key={item.id}>
                <td>{item.code}</td>
                <td>{item.title}</td>
                <td>{item.component}</td>
                <td>{item.municipality}, {item.province}</td>
                <td><span className="pill">{item.stage}</span></td>
                <td>{item.riskLevel}</td>
                <td>{item.commodity ?? "Not set"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>}
    </section>
  );
}

