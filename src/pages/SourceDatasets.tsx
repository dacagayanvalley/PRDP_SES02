import { useEffect, useMemo, useState } from "react";
import { loadSourceDatasets, type SourceDataset, type SourceDatasetRecord, type SourceDatasetSnapshot } from "../data/sourceDatasets";

export function SourceDatasets() {
  const [snapshot, setSnapshot] = useState<SourceDatasetSnapshot | null>(null);
  const [selectedSource, setSelectedSource] = useState("all");
  const [selectedProvince, setSelectedProvince] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [query, setQuery] = useState("");

  useEffect(() => {
    loadSourceDatasets().then(setSnapshot);
  }, []);

  const allRecords = useMemo(() => snapshot?.sources.flatMap((source) => source.records) ?? [], [snapshot]);
  const provinces = useMemo(() => unique(allRecords.map((item) => item.province)), [allRecords]);
  const statuses = useMemo(() => unique(allRecords.map((item) => item.status)), [allRecords]);
  const filteredRecords = useMemo(() => allRecords.filter((item) => {
    const text = `${item.code} ${item.title} ${item.proponent} ${item.province} ${item.municipality} ${item.commodity}`.toLowerCase();
    return (selectedSource === "all" || item.sourceId === selectedSource)
      && (selectedProvince === "all" || item.province === selectedProvince)
      && (selectedStatus === "all" || item.status === selectedStatus)
      && (!query.trim() || text.includes(query.trim().toLowerCase()));
  }), [allRecords, query, selectedProvince, selectedSource, selectedStatus]);

  if (!snapshot) {
    return <section className="panel"><h2>SIDLAN API Source Datasets</h2><p>Loading source dataset snapshot...</p></section>;
  }

  const totalRows = snapshot.sources.reduce((sum, source) => sum + source.summary.rows, 0);
  const failedSources = snapshot.sources.filter((source) => !source.ok).length;

  return (
    <div className="source-workspace">
      <section className="panel span-2">
        <div className="section-heading source-title-row">
          <div>
            <p className="eyebrow">Official API Source Registry</p>
            <h2>SIDLAN PRDP Source Datasets</h2>
            <p className="source">{snapshot.region} | refreshed {new Date(snapshot.fetchedAt).toLocaleString()} | API keys are redacted from public output.</p>
          </div>
        </div>
        <div className="metric-grid four">
          <Metric label="Datasets" value={snapshot.sources.length} />
          <Metric label="Region II records" value={totalRows} />
          <Metric label="Available sources" value={snapshot.sources.length - failedSources} />
          <Metric label="Source alerts" value={failedSources} tone={failedSources ? "danger" : undefined} />
        </div>
      </section>

      <section className="source-card-grid span-2">
        {snapshot.sources.map((source) => <SourceCard key={source.id} source={source} />)}
      </section>

      <section className="panel span-2">
        <div className="section-heading">
          <div>
            <h2>Region II Source Records</h2>
            <p className="source">Filtered from the official SIDLAN API snapshots and published as static records for GitHub Pages.</p>
          </div>
          <span className="pill">{filteredRecords.length} shown</span>
        </div>
        <div className="source-filters">
          <label>Dataset
            <select value={selectedSource} onChange={(event) => setSelectedSource(event.target.value)}>
              <option value="all">All datasets</option>
              {snapshot.sources.map((source) => <option key={source.id} value={source.id}>{source.name}</option>)}
            </select>
          </label>
          <label>Province
            <select value={selectedProvince} onChange={(event) => setSelectedProvince(event.target.value)}>
              <option value="all">All provinces</option>
              {provinces.map((province) => <option key={province}>{province}</option>)}
            </select>
          </label>
          <label>Status
            <select value={selectedStatus} onChange={(event) => setSelectedStatus(event.target.value)}>
              <option value="all">All statuses</option>
              {statuses.map((status) => <option key={status}>{status}</option>)}
            </select>
          </label>
          <label>Search
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Code, title, proponent, commodity" />
          </label>
        </div>
        <RecordTable records={filteredRecords} sources={snapshot.sources} />
      </section>
    </div>
  );
}

function SourceCard({ source }: { source: SourceDataset }) {
  return (
    <article className="panel source-dataset-card">
      <div className="source-card-top">
        <div>
          <strong>{source.name}</strong>
          <small>{source.component} | {source.format.toUpperCase()} | {source.regionFilter}</small>
        </div>
        <span className={source.ok ? "status good" : "status bad"}>{source.ok ? "Available" : "Needs attention"}</span>
      </div>
      <div className="source-stat-row">
        <span><b>{source.summary.rows}</b> records</span>
        <span><b>{source.summary.fundSources.length}</b> fund source(s)</span>
        <span><b>{source.summary.stages.length}</b> stage(s)</span>
        <span><b>{source.summary.statuses.length}</b> status value(s)</span>
      </div>
      {source.ok ? <div className="source-chip-list">
        {source.summary.provinces.slice(0, 6).map((item) => <span className="pill" key={item}>{item}</span>)}
        {source.summary.provinces.length > 6 && <span className="pill">+{source.summary.provinces.length - 6}</span>}
      </div> : <p className="inline-alert">{source.error ?? "Source refresh failed."}</p>}
      <a href={source.sourceUrl} target="_blank" rel="noreferrer">Open redacted API URL</a>
    </article>
  );
}

function RecordTable({ records, sources }: { records: SourceDatasetRecord[]; sources: SourceDataset[] }) {
  const sourceNames = Object.fromEntries(sources.map((source) => [source.id, source.name]));
  if (records.length === 0) return <p>No Region II records match the current filters.</p>;
  return <div className="table-wrap source-table"><table>
    <thead><tr><th>Dataset</th><th>Code</th><th>Project / Record</th><th>Location</th><th>Status</th><th>Fund / Commodity</th><th>Cost</th></tr></thead>
    <tbody>
      {records.slice(0, 500).map((item, index) => (
        <tr key={`${item.sourceId}-${item.code}-${index}`}>
          <td><span className="pill">{sourceNames[item.sourceId] ?? item.sourceId}</span></td>
          <td>{item.code || "Not provided"}</td>
          <td><strong>{item.title || "Untitled record"}</strong><small>{item.proponent || "No proponent listed"}</small></td>
          <td>{[item.municipality, item.province].filter(Boolean).join(", ") || item.region}</td>
          <td><span className="status caution">{item.stage || "No stage"}</span><small>{item.status || "No status"}</small></td>
          <td>{item.fundSource || "Not provided"}<small>{item.commodity || "No commodity"}</small></td>
          <td>{formatMoney(item.cost)}</td>
        </tr>
      ))}
    </tbody>
  </table>{records.length > 500 && <p className="source">Showing first 500 matching records. Narrow the filters to inspect more precisely.</p>}</div>;
}

function Metric({ label, value, tone }: { label: string; value: number; tone?: "danger" }) {
  return <div className={`metric ${tone ?? ""}`}><span>{label}</span><strong>{value.toLocaleString()}</strong></div>;
}

function unique(values: string[]) {
  return Array.from(new Set(values.filter((item) => item && item.trim()))).sort((a, b) => a.localeCompare(b));
}

function formatMoney(value: string) {
  const numberValue = Number(String(value ?? "").replace(/[^0-9.-]/g, ""));
  if (!Number.isFinite(numberValue) || numberValue === 0) return value || "Not provided";
  return `PHP ${numberValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}