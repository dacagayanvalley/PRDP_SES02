import { useMemo, useState } from "react";
import type { AppDataset } from "../data/repositories";
import type { GrievanceCase, Subproject } from "../domain/types";
import { evaluateNolReadiness } from "../rules/evaluateNolReadiness";

type ReportType = "dossier" | "monthly" | "exports";

export function Reports({ dataset }: { dataset: AppDataset }) {
  const [reportType, setReportType] = useState<ReportType>("dossier");
  const [subprojectId, setSubprojectId] = useState(dataset.subprojects[0]?.id ?? "");
  const selected = dataset.subprojects.find((item) => item.id === subprojectId) ?? dataset.subprojects[0];
  const generatedAt = new Date();

  return (
    <div className="report-workspace">
      <section className="panel no-print">
        <div className="section-heading">
          <div>
            <h2>Reports And Export Package</h2>
            <p className="source">Static MVP outputs use the current local browser dataset and apply built-in redaction rules.</p>
          </div>
          <div className="template-actions"><button onClick={() => window.print()}>Print current report</button><button className="ghost" onClick={downloadReportHtml}>Download report HTML</button></div>
        </div>
        <div className="form-toolbar">
          <label>Report type
            <select value={reportType} onChange={(event) => setReportType(event.target.value as ReportType)}>
              <option value="dossier">Subproject Compliance Dossier</option>
              <option value="monthly">RPCO Monthly Monitoring Report</option>
              <option value="exports">CSV Export Package</option>
            </select>
          </label>
          {reportType === "dossier" && <label>Subproject
            <select value={selected?.id ?? ""} onChange={(event) => setSubprojectId(event.target.value)}>
              {dataset.subprojects.map((item) => <option key={item.id} value={item.id}>{item.code}</option>)}
            </select>
          </label>}
        </div>
      </section>

      {reportType === "dossier" && selected && <ComplianceDossier dataset={dataset} subproject={selected} generatedAt={generatedAt} />}
      {reportType === "monthly" && <MonthlyReport dataset={dataset} generatedAt={generatedAt} />}
      {reportType === "exports" && <ExportPackage dataset={dataset} />}
    </div>
  );
}

function downloadReportHtml() {
  const report = document.querySelector(".print-report") as HTMLElement | null;
  if (!report) return;
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>SES-Track 02 Report</title><style>body{font-family:Arial,sans-serif;margin:24px;color:#172033}table{width:100%;border-collapse:collapse}th,td{border-bottom:1px solid #d9e1e5;padding:6px;text-align:left;vertical-align:top}.panel{margin-bottom:16px}.status{font-weight:700}.report-meta{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}.report-meta div{border:1px solid #d9e1e5;padding:8px}</style></head><body>${report.outerHTML}</body></html>`;
  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `ses-track-02-report-${new Date().toISOString().slice(0, 10)}.html`;
  anchor.click();
  URL.revokeObjectURL(url);
}
function ReportMeta({ title, generatedAt, sourceRecords, filters }: { title: string; generatedAt: Date; sourceRecords: string; filters: string }) {
  return (
    <section className="panel report-header">
      <div>
        <p className="eyebrow">SES-Track 02 Static MVP</p>
        <h2>{title}</h2>
        <p className="source">This report is generated from local browser data. It is for UAT/demo/local tracking unless a production backend is approved.</p>
      </div>
      <dl className="report-meta">
        <div><dt>Generated</dt><dd>{generatedAt.toLocaleString()}</dd></div>
        <div><dt>Data cutoff</dt><dd>{generatedAt.toLocaleDateString()}</dd></div>
        <div><dt>Filters</dt><dd>{filters}</dd></div>
        <div><dt>Source records</dt><dd>{sourceRecords}</dd></div>
        <div><dt>Prepared by</dt><dd>____________________</dd></div>
        <div><dt>Reviewed by</dt><dd>____________________</dd></div>
        <div><dt>Version</dt><dd>Static MVP report v0.1</dd></div>
        <div><dt>Redaction</dt><dd>Restricted GRM, GBV/SEA/SH, sensitive land/IP details redacted.</dd></div>
      </dl>
      <div className="report-signatures">
        <div><span>Prepared by</span><strong>Signature / Date</strong></div>
        <div><span>Reviewed by</span><strong>Signature / Date</strong></div>
        <div><span>Approved by</span><strong>Signature / Date</strong></div>
      </div>    </section>
  );
}

function ComplianceDossier({ dataset, subproject, generatedAt }: { dataset: AppDataset; subproject: Subproject; generatedAt: Date }) {
  const requirements = dataset.requirements.filter((item) => item.subprojectId === subproject.id);
  const screenings = dataset.screenings.filter((item) => item.subprojectId === subproject.id);
  const documents = dataset.documents.filter((item) => item.subprojectId === subproject.id);
  const permits = dataset.permits.filter((item) => item.subprojectId === subproject.id);
  const findings = dataset.findings.filter((item) => item.subprojectId === subproject.id);
  const grievances = dataset.grievances.filter((item) => item.subprojectId === subproject.id).map(redactGrievance);
  const overlays = dataset.spatialOverlayResults.filter((item) => item.subprojectId === subproject.id);
  const audit = dataset.auditEvents.filter((event) => event.entityId === subproject.id || requirements.some((req) => req.id === event.entityId) || documents.some((doc) => doc.id === event.entityId) || permits.some((permit) => permit.id === event.entityId));
  const nol1 = evaluateNolReadiness(requirements, "NOL1");
  const nol2 = evaluateNolReadiness(requirements, "NOL2");

  return (
    <div className="print-report">
      <ReportMeta title={`Subproject Compliance Dossier: ${subproject.code}`} generatedAt={generatedAt} filters={subproject.code} sourceRecords={`${requirements.length} requirements, ${documents.length} documents, ${permits.length} permits, ${findings.length} findings`} />
      <section className="panel"><h3>Subproject Profile</h3><div className="detail-grid">
        <Info label="Title" value={subproject.title} /><Info label="Component" value={subproject.component} /><Info label="Type" value={subproject.type} /><Info label="Proponent" value={subproject.proponent} /><Info label="Location" value={`${subproject.barangay ? `${subproject.barangay}, ` : ""}${subproject.municipality}, ${subproject.province}`} /><Info label="Commodity" value={subproject.commodity ?? "Not set"} /><Info label="Stage" value={subproject.stage} /><Info label="Risk" value={subproject.riskLevel} /><Info label="Sensitive flags" value={subproject.sensitiveFlags.join(", ") || "None"} />
      </div></section>
      <section className="panel"><h3>Screening Summary</h3>{screenings.length === 0 ? <p>No saved screening records.</p> : screenings.map((item) => <div className="compact-card" key={item.id}><strong>Annex {item.annex} - {item.status}</strong><span>{item.version}</span><small>{item.answers.length} answer(s), updated {new Date(item.updatedAt).toLocaleString()}</small></div>)}</section>
      <section className="panel"><h3>NOL Readiness</h3><div className="metric-grid two"><Metric label="NOL 1" value={nol1.ready ? "Ready" : `${nol1.blockers.length} blocker(s)`} tone={nol1.ready ? "good" : "danger"} /><Metric label="NOL 2" value={nol2.ready ? "Ready" : `${nol2.blockers.length} blocker(s)`} tone={nol2.ready ? "good" : "danger"} /></div></section>
      <TableSection title="Triggered Requirements" columns={["Requirement", "Gate", "Status", "Owner", "Due", "Basis"]} rows={requirements.map((item) => [item.label, item.dueStage, item.status, item.owner, item.dueDate || "", item.basis])} />
      <TableSection title="Documents And Evidence Metadata" columns={["Title", "Type", "Version", "Confidentiality", "Status", "Remarks"]} rows={documents.map((item) => [item.title, item.documentType, item.version, item.confidentiality, item.status, item.confidentiality === "Confidential" ? "Redacted" : item.remarks ?? ""])} />
      <TableSection title="Permits And Clearances" columns={["Permit", "Agency", "Reference", "Status", "Application", "Issued", "Expiry"]} rows={permits.map((item) => [item.permitType, item.issuingAgency, item.referenceNumber ?? "", item.status, item.applicationDate ?? "", item.issueDate ?? "", item.expiryDate ?? ""])} />
      <TableSection title="Monitoring Findings" columns={["Checklist", "Finding", "Severity", "Status", "Due", "Responsible"]} rows={findings.map((item) => [item.checklist, item.finding, item.severity, item.status, item.dueDate, item.responsibleParty])} />
      <TableSection title="GRM Summary Redacted" columns={["Reference", "Category", "Channel", "Status", "Anonymous", "Next due"]} rows={grievances.map((item) => [item.reference, item.category, item.channel, item.status, item.isAnonymous ? "Yes" : "No", new Date(item.nextDueAt).toLocaleDateString()])} />
      <TableSection title="GIS Overlay Results" columns={["Layer", "Category", "Result", "Distance", "Confirmed", "Uncertainty"]} rows={overlays.map((item) => [item.layerName, item.category, item.result, `${item.distanceKm} km`, item.reviewerConfirmed ? "Yes" : "No", item.uncertainty])} />
      <TableSection title="Audit Trail" columns={["Timestamp", "Actor", "Action", "Reason"]} rows={audit.map((item) => [new Date(item.timestamp).toLocaleString(), item.actor, item.action, item.reason ?? ""])} />
    </div>
  );
}

function MonthlyReport({ dataset, generatedAt }: { dataset: AppDataset; generatedAt: Date }) {
  const blockers = dataset.requirements.filter((item) => item.blocking && !["Accepted", "Not Applicable"].includes(item.status));
  const openFindings = dataset.findings.filter((item) => item.status !== "Verified Closed");
  const overdueFindings = openFindings.filter((item) => new Date(item.dueDate) < generatedAt);
  const permitExpiries = dataset.permits.filter((item) => item.expiryDate && daysUntil(item.expiryDate, generatedAt) <= 90);
  const grmAggregate = aggregate(dataset.grievances.map((item) => item.isRestricted ? "Restricted/redacted" : item.category));

  return (
    <div className="print-report">
      <ReportMeta title="RPCO 02 Monthly Safeguards Monitoring Report" generatedAt={generatedAt} filters="All local records" sourceRecords={`${dataset.subprojects.length} subprojects, ${dataset.findings.length} findings, ${dataset.grievances.length} GRM cases`} />
      <section className="panel"><h3>Portfolio Summary</h3><div className="metric-grid"><Metric label="Subprojects" value={dataset.subprojects.length} /><Metric label="NOL blockers" value={blockers.length} tone={blockers.length ? "danger" : "good"} /><Metric label="Open findings" value={openFindings.length} /><Metric label="Overdue findings" value={overdueFindings.length} tone={overdueFindings.length ? "danger" : "good"} /><Metric label="Permit alerts" value={permitExpiries.length} tone={permitExpiries.length ? "caution" : "good"} /></div></section>
      <TableSection title="Portfolio By Component" columns={["Component", "Count"]} rows={Object.entries(aggregate(dataset.subprojects.map((item) => item.component)))} />
      <TableSection title="NOL Blockers" columns={["Subproject", "Requirement", "Gate", "Status", "Owner", "Due"]} rows={blockers.map((item) => [codeFor(dataset, item.subprojectId), item.label, item.dueStage, item.status, item.owner, item.dueDate ?? ""])} />
      <TableSection title="Open Findings" columns={["Subproject", "Finding", "Severity", "Status", "Due", "Responsible"]} rows={openFindings.map((item) => [codeFor(dataset, item.subprojectId), item.finding, item.severity, item.status, item.dueDate, item.responsibleParty])} />
      <TableSection title="Permit Expiry Alerts" columns={["Subproject", "Permit", "Agency", "Status", "Expiry"]} rows={permitExpiries.map((item) => [codeFor(dataset, item.subprojectId), item.permitType, item.issuingAgency, item.status, item.expiryDate ?? ""])} />
      <TableSection title="GRM Aggregate Redacted" columns={["Category", "Count"]} rows={Object.entries(grmAggregate)} />
    </div>
  );
}

function ExportPackage({ dataset }: { dataset: AppDataset }) {
  const exports = [
    { label: "Subprojects", file: "subprojects", rows: dataset.subprojects.map((item) => ({ code: item.code, title: item.title, component: item.component, type: item.type, proponent: item.proponent, province: item.province, municipality: item.municipality, stage: item.stage, riskLevel: item.riskLevel, sensitiveFlags: item.sensitiveFlags.join(";") })) },
    { label: "Requirements", file: "requirements", rows: dataset.requirements.map((item) => ({ subproject: codeFor(dataset, item.subprojectId), label: item.label, gate: item.dueStage, status: item.status, blocking: item.blocking, owner: item.owner, dueDate: item.dueDate ?? "", basis: item.basis })) },
    { label: "Permits", file: "permits", rows: dataset.permits.map((item) => ({ subproject: codeFor(dataset, item.subprojectId), permitType: item.permitType, agency: item.issuingAgency, reference: item.referenceNumber ?? "", status: item.status, applicationDate: item.applicationDate ?? "", issueDate: item.issueDate ?? "", expiryDate: item.expiryDate ?? "" })) },
    { label: "Monitoring findings", file: "monitoring-findings", rows: dataset.findings.map((item) => ({ subproject: codeFor(dataset, item.subprojectId), checklist: item.checklist, finding: item.finding, severity: item.severity, status: item.status, dueDate: item.dueDate, responsibleParty: item.responsibleParty })) },
    { label: "GRM redacted registry", file: "grm-redacted", rows: dataset.grievances.map(redactGrievance).map((item) => ({ reference: item.reference, subproject: item.subprojectId ? codeFor(dataset, item.subprojectId) : "", category: item.category, channel: item.channel, status: item.status, anonymous: item.isAnonymous, restricted: item.isRestricted, nextDue: item.nextDueAt })) },
    { label: "GIS overlay results", file: "gis-overlays", rows: dataset.spatialOverlayResults.map((item) => ({ subproject: codeFor(dataset, item.subprojectId), layer: item.layerName, category: item.category, result: item.result, distanceKm: item.distanceKm, reviewerConfirmed: item.reviewerConfirmed, uncertainty: item.uncertainty, checkedAt: item.checkedAt })) },
  ];

  return (
    <section className="panel">
      <h2>CSV Export Package</h2>
      <p className="source">Exports apply redaction for GRM confidential categories. Browser downloads are generated locally.</p>
      <div className="export-grid">
        {exports.map((item) => <button key={item.file} onClick={() => downloadCsv(item.file, item.rows)}>{item.label} CSV</button>)}
      </div>
    </section>
  );
}

function TableSection({ title, columns, rows }: { title: string; columns: string[]; rows: Array<Array<string | number | boolean>> }) {
  return <section className="panel"><h3>{title}</h3>{rows.length === 0 ? <p>No records.</p> : <div className="table-wrap"><table><thead><tr>{columns.map((column) => <th key={column}>{column}</th>)}</tr></thead><tbody>{rows.map((row, index) => <tr key={index}>{row.map((cell, cellIndex) => <td key={cellIndex}>{String(cell)}</td>)}</tr>)}</tbody></table></div>}</section>;
}

function Metric({ label, value, tone }: { label: string; value: string | number; tone?: "good" | "danger" | "caution" }) {
  return <div className={`metric ${tone === "danger" ? "danger" : tone === "caution" ? "caution" : ""}`}><span>{label}</span><strong>{value}</strong></div>;
}

function Info({ label, value }: { label: string; value: string }) {
  return <div className="info-box"><span>{label}</span><strong>{value}</strong></div>;
}

function redactGrievance(item: GrievanceCase): GrievanceCase {
  return item.isRestricted ? { ...item, category: "Restricted/redacted", channel: "Redacted" } : item;
}

function codeFor(dataset: AppDataset, subprojectId?: string) {
  return dataset.subprojects.find((item) => item.id === subprojectId)?.code ?? "Unlinked";
}

function aggregate(items: string[]) {
  return items.reduce<Record<string, number>>((acc, item) => {
    acc[item] = (acc[item] ?? 0) + 1;
    return acc;
  }, {});
}

function daysUntil(dateText: string, from: Date) {
  return Math.ceil((new Date(dateText).getTime() - from.getTime()) / 86400000);
}

function downloadCsv(filename: string, rows: Array<Record<string, unknown>>) {
  const headers = [...new Set(rows.flatMap((row) => Object.keys(row)))];
  const csv = [headers.join(","), ...rows.map((row) => headers.map((header) => csvCell(row[header])).join(","))].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `ses-track-02-${filename}-${new Date().toISOString().slice(0, 10)}.csv`;
  anchor.click();
  URL.revokeObjectURL(url);
}

function csvCell(value: unknown) {
  const text = String(value ?? "");
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}


