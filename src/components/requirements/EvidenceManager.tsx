import { appendAudit, type AppDataset } from "../../data/repositories";
import type { DocumentRecord, PermitRecord } from "../../domain/types";

interface Props {
  dataset: AppDataset;
  subprojectId: string;
  actions: { save: (dataset: AppDataset) => void };
}

export function EvidenceManager({ dataset, subprojectId, actions }: Props) {
  const documents = dataset.documents.filter((item) => item.subprojectId === subprojectId);
  const permits = dataset.permits.filter((item) => item.subprojectId === subprojectId);
  const requirements = dataset.requirements.filter((item) => item.subprojectId === subprojectId);

  function addDocument() {
    const doc: DocumentRecord = { id: crypto.randomUUID(), subprojectId, title: "New evidence metadata", documentType: "General Evidence", version: "v1", confidentiality: "Internal", status: "Draft", remarks: "Metadata only; no file stored in static MVP.", updatedAt: new Date().toISOString() };
    actions.save(appendAudit({ ...dataset, documents: [doc, ...dataset.documents] }, { entityType: "Document", entityId: doc.id, action: "Added document metadata", actor: "Static MVP user" }));
  }

  function addPermit() {
    const permit: PermitRecord = { id: crypto.randomUUID(), subprojectId, permitType: "New permit/clearance", issuingAgency: "To be specified", status: "Not Started", updatedAt: new Date().toISOString() };
    actions.save(appendAudit({ ...dataset, permits: [permit, ...dataset.permits] }, { entityType: "Permit", entityId: permit.id, action: "Added permit metadata", actor: "Static MVP user" }));
  }

  function updateDocument(id: string, patch: Partial<DocumentRecord>) {
    const documentsNext = dataset.documents.map((item) => item.id === id ? { ...item, ...patch, updatedAt: new Date().toISOString() } : item);
    actions.save(appendAudit({ ...dataset, documents: documentsNext }, { entityType: "Document", entityId: id, action: "Updated document metadata", actor: "Static MVP user" }));
  }

  function updatePermit(id: string, patch: Partial<PermitRecord>) {
    const permitsNext = dataset.permits.map((item) => item.id === id ? { ...item, ...patch, updatedAt: new Date().toISOString() } : item);
    actions.save(appendAudit({ ...dataset, permits: permitsNext }, { entityType: "Permit", entityId: id, action: "Updated permit metadata", actor: "Static MVP user" }));
  }

  return (
    <div className="page-grid">
      <section className="panel span-2">
        <div className="section-heading"><h2>Document Metadata</h2><button onClick={addDocument}>Add document metadata</button></div>
        <div className="table-wrap"><table className="editable-table"><thead><tr><th>Title</th><th>Type</th><th>Version</th><th>Confidentiality</th><th>Status</th><th>Linked requirement</th><th>Remarks</th></tr></thead><tbody>{documents.map((doc) => <tr key={doc.id}>
          <td><input value={doc.title} onChange={(e) => updateDocument(doc.id, { title: e.target.value })} /></td>
          <td><input value={doc.documentType} onChange={(e) => updateDocument(doc.id, { documentType: e.target.value })} /></td>
          <td><input value={doc.version} onChange={(e) => updateDocument(doc.id, { version: e.target.value })} /></td>
          <td><select value={doc.confidentiality} onChange={(e) => updateDocument(doc.id, { confidentiality: e.target.value as DocumentRecord["confidentiality"] })}>{["Public","Internal","Restricted","Confidential"].map((x) => <option key={x}>{x}</option>)}</select></td>
          <td><select value={doc.status} onChange={(e) => updateDocument(doc.id, { status: e.target.value as DocumentRecord["status"] })}>{["Draft","Submitted","Accepted","Superseded"].map((x) => <option key={x}>{x}</option>)}</select></td>
          <td><select value={doc.requirementId ?? ""} onChange={(e) => updateDocument(doc.id, { requirementId: e.target.value || undefined })}><option value="">Unlinked</option>{requirements.map((req) => <option key={req.id} value={req.id}>{req.label}</option>)}</select></td>
          <td><textarea value={doc.remarks ?? ""} onChange={(e) => updateDocument(doc.id, { remarks: e.target.value })} /></td>
        </tr>)}</tbody></table></div>
      </section>
      <section className="panel span-2">
        <div className="section-heading"><h2>Permit And Clearance Metadata</h2><button onClick={addPermit}>Add permit metadata</button></div>
        <div className="table-wrap"><table className="editable-table"><thead><tr><th>Permit</th><th>Agency</th><th>Reference</th><th>Status</th><th>Application</th><th>Issued</th><th>Expiry</th><th>Linked requirement</th></tr></thead><tbody>{permits.map((permit) => <tr key={permit.id}>
          <td><input value={permit.permitType} onChange={(e) => updatePermit(permit.id, { permitType: e.target.value })} /></td>
          <td><input value={permit.issuingAgency} onChange={(e) => updatePermit(permit.id, { issuingAgency: e.target.value })} /></td>
          <td><input value={permit.referenceNumber ?? ""} onChange={(e) => updatePermit(permit.id, { referenceNumber: e.target.value })} /></td>
          <td><select value={permit.status} onChange={(e) => updatePermit(permit.id, { status: e.target.value as PermitRecord["status"] })}>{["Not Started","Applied","Issued","Expired","Not Applicable"].map((x) => <option key={x}>{x}</option>)}</select></td>
          <td><input type="date" value={permit.applicationDate ?? ""} onChange={(e) => updatePermit(permit.id, { applicationDate: e.target.value })} /></td>
          <td><input type="date" value={permit.issueDate ?? ""} onChange={(e) => updatePermit(permit.id, { issueDate: e.target.value })} /></td>
          <td><input type="date" value={permit.expiryDate ?? ""} onChange={(e) => updatePermit(permit.id, { expiryDate: e.target.value })} /></td>
          <td><select value={permit.requirementId ?? ""} onChange={(e) => updatePermit(permit.id, { requirementId: e.target.value || undefined })}><option value="">Unlinked</option>{requirements.map((req) => <option key={req.id} value={req.id}>{req.label}</option>)}</select></td>
        </tr>)}</tbody></table></div>
      </section>
    </div>
  );
}
