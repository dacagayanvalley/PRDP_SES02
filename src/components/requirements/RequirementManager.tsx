import { appendAudit, type AppDataset } from "../../data/repositories";
import type { Requirement } from "../../domain/types";

const statuses: Requirement["status"][] = ["Missing", "In Progress", "Submitted", "Accepted", "Expired", "Not Applicable"];
const gates = ["NOL1", "NOL2", "Both", "Monitoring", "Procurement"];

interface Props {
  dataset: AppDataset;
  subprojectId: string;
  actions: { save: (dataset: AppDataset) => void };
  title?: string;
}

export function RequirementManager({ dataset, subprojectId, actions, title = "Requirements" }: Props) {
  const requirements = dataset.requirements.filter((item) => item.subprojectId === subprojectId);

  function updateRequirement(id: string, patch: Partial<Requirement>, action: string) {
    const nextRequirements = dataset.requirements.map((item) => item.id === id ? { ...item, ...patch } : item);
    const next = appendAudit(
      { ...dataset, requirements: nextRequirements },
      { entityType: "Requirement", entityId: id, action, actor: "Static MVP user", reason: patch.remarks },
    );
    actions.save(next);
  }

  return (
    <section className="panel span-2">
      <div className="section-heading"><h2>{title}</h2><span>{requirements.length} item(s)</span></div>
      <div className="table-wrap">
        <table className="editable-table">
          <thead><tr><th>Requirement</th><th>Status</th><th>Gate</th><th>Due</th><th>Owner</th><th>Blocking</th><th>Remarks</th></tr></thead>
          <tbody>{requirements.map((item) => (
            <tr key={item.id}>
              <td><strong>{item.label}</strong><small>{item.basis}</small></td>
              <td><select value={item.status} onChange={(event) => updateRequirement(item.id, { status: event.target.value as Requirement["status"] }, `Changed requirement status to ${event.target.value}`)}>{statuses.map((status) => <option key={status}>{status}</option>)}</select></td>
              <td><select value={item.dueStage} onChange={(event) => updateRequirement(item.id, { dueStage: event.target.value }, `Changed due stage to ${event.target.value}`)}>{gates.map((gate) => <option key={gate}>{gate}</option>)}</select></td>
              <td><input type="date" value={item.dueDate ?? ""} onChange={(event) => updateRequirement(item.id, { dueDate: event.target.value }, "Updated requirement due date")} /></td>
              <td><input value={item.owner} onChange={(event) => updateRequirement(item.id, { owner: event.target.value }, "Updated requirement owner")} /></td>
              <td><input type="checkbox" checked={item.blocking} onChange={(event) => updateRequirement(item.id, { blocking: event.target.checked }, event.target.checked ? "Marked requirement blocking" : "Marked requirement non-blocking")} /></td>
              <td><textarea value={item.remarks ?? ""} onChange={(event) => updateRequirement(item.id, { remarks: event.target.value }, "Updated requirement remarks")} /></td>
            </tr>
          ))}</tbody>
        </table>
      </div>
    </section>
  );
}
