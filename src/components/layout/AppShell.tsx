import type { ReactNode } from "react";
import type { PageKey } from "../../app/App";

const nav: { key: PageKey; label: string }[] = [
  { key: "dashboard", label: "Dashboard" },
  { key: "sources", label: "Source Data" },
  { key: "portfolio", label: "Portfolio" },
  { key: "detail", label: "Subproject Detail" },
  { key: "screening", label: "Screening" },
  { key: "gis", label: "GIS Screening" },
  { key: "nol", label: "NOL Readiness" },
  { key: "monitoring", label: "Monitoring" },
  { key: "grm", label: "GRM" },
  { key: "reports", label: "Reports" },
];

const roles = ["RPCO SES Officer", "RPCO SES Unit Head", "RPCO GGU/GIS User", "PMIU SES Focal", "Auditor/Read-only"];

interface Props {
  children: ReactNode;
  page: PageKey;
  setPage: (page: PageKey) => void;
  role: string;
  setRole: (role: string) => void;
  onExport: () => void;
  onReloadOfficial: () => void;
  toast?: string;
}

export function AppShell({ children, page, setPage, role, setRole, onExport, onReloadOfficial, toast }: Props) {
  return (
    <div className="app-shell">
      <aside className="sidebar" aria-label="Primary navigation">
        <div className="brand">
          <span className="brand-mark">SES</span>
          <div>
            <strong>SES-Track 02</strong>
            <small>SIDLAN Region II</small>
          </div>
        </div>
        <nav>
          {nav.map((item) => (
            <button key={item.key} className={page === item.key ? "active" : ""} onClick={() => setPage(item.key)}>
              {item.label}
            </button>
          ))}
        </nav>
      </aside>
      <main>
        <header className="topbar">
          <div>
            <p className="eyebrow">PRDP Scale-Up RPCO 02</p>
            <h1>Social and Environmental Safeguards Tracker</h1>
          </div>
          <div className="topbar-actions">
            <label>
              Role simulation
              <select value={role} onChange={(event) => setRole(event.target.value)}>
                {roles.map((item) => <option key={item}>{item}</option>)}
              </select>
            </label>
            <button onClick={onExport}>Export JSON</button>
            <button className="ghost" onClick={onReloadOfficial}>Reload official source</button>
          </div>
        </header>
        <section className="warning" role="note">
          Production public site uses the SIDLAN Region II disclosure snapshot as its official source record. Browser-local edits are working copies and should be reconciled against official records before use.
        </section>
        {toast && <div className="toast" role="status">{toast}</div>}
        {children}
      </main>
    </div>
  );
}

