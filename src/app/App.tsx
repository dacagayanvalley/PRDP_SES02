import { useEffect, useMemo, useState } from "react";
import { AppShell } from "../components/layout/AppShell";
import { loadInitialDataset, saveDataset, exportDataset, resetLocalDataset, type AppDataset } from "../data/repositories";
import { Dashboard } from "../pages/Dashboard";
import { Portfolio } from "../pages/Portfolio";
import { Screening } from "../pages/Screening";
import { GisScreening } from "../pages/GisScreening";
import { NolReadiness } from "../pages/NolReadiness";
import { SubprojectDetail } from "../pages/SubprojectDetail";
import { Monitoring } from "../pages/Monitoring";
import { Grm } from "../pages/Grm";
import { Reports } from "../pages/Reports";

export type PageKey = "dashboard" | "portfolio" | "detail" | "screening" | "gis" | "nol" | "monitoring" | "grm" | "reports";

export default function App() {
  const [dataset, setDataset] = useState<AppDataset | null>(null);
  const [page, setPage] = useState<PageKey>("dashboard");
  const [role, setRole] = useState("RPCO SES Officer");
  const [toast, setToast] = useState("");

  useEffect(() => {
    loadInitialDataset().then(setDataset).catch((error) => console.error(error));
  }, []);

  function notify(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(""), 2600);
  }

  const actions = useMemo(() => ({
    save(next: AppDataset, message = "Saved locally") {
      setDataset(next);
      saveDataset(next);
      notify(message);
    },
    exportData() {
      if (dataset) {
        exportDataset(dataset);
        notify("JSON backup exported");
      }
    },
    reloadOfficial() {
      if (!window.confirm("Reload the official SIDLAN Region II snapshot? This clears browser-local working edits.")) return;
      resetLocalDataset();
      loadInitialDataset().then((next) => {
        setDataset(next);
        notify("Official SIDLAN snapshot reloaded");
      });
    },
  }), [dataset]);

  if (!dataset) return <div className="loading">Loading SES-Track 02...</div>;

  const pages = {
    dashboard: <Dashboard dataset={dataset} role={role} />,
    portfolio: <Portfolio dataset={dataset} />,
    detail: <SubprojectDetail dataset={dataset} actions={actions} />,
    screening: <Screening dataset={dataset} actions={actions} />,
    gis: <GisScreening dataset={dataset} actions={actions} />,
    nol: <NolReadiness dataset={dataset} actions={actions} />,
    monitoring: <Monitoring dataset={dataset} actions={actions} />,
    grm: <Grm dataset={dataset} actions={actions} />,
    reports: <Reports dataset={dataset} />,
  };

  return (
    <AppShell
      page={page}
      setPage={setPage}
      role={role}
      setRole={setRole}
      onExport={actions.exportData}
      onReloadOfficial={actions.reloadOfficial}
      toast={toast}
    >
      {pages[page]}
    </AppShell>
  );
}

