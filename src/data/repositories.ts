import type { AuditEvent, DocumentRecord, GrievanceCase, MonitoringFinding, PermitRecord, ReferenceLayer, Requirement, ScreeningRecord, SpatialOverlayResult, Subproject } from "../domain/types";

export interface AppDataset {
  subprojects: Subproject[];
  screenings: ScreeningRecord[];
  requirements: Requirement[];
  grievances: GrievanceCase[];
  findings: MonitoringFinding[];
  auditEvents: AuditEvent[];
  documents: DocumentRecord[];
  permits: PermitRecord[];
  referenceLayers: ReferenceLayer[];
  spatialOverlayResults: SpatialOverlayResult[];
}

const STORE_KEY = "ses-track-02-local-dataset";
const SOURCE_KEY = "ses-track-02-source-signature";
const OFFICIAL_SOURCE = "sidlan-region-02";

function asArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? value as T[] : [];
}

function normalizeDataset(dataset: Partial<AppDataset>): AppDataset {
  return {
    subprojects: asArray<Subproject>(dataset.subprojects).map((item) => ({
      ...item,
      component: item.component ?? "IBUILD",
      type: item.type ?? "Unspecified",
      proponent: item.proponent ?? "SIDLAN disclosure record",
      province: item.province ?? "Region II",
      municipality: item.municipality ?? "Unspecified",
      estimatedCostPhp: Number(item.estimatedCostPhp ?? 0),
      stage: item.stage ?? "Under Screening",
      riskLevel: item.riskLevel ?? "Moderate",
      responsibleSes: item.responsibleSes ?? "RPCO 02 SES Unit",
      sensitiveFlags: item.sensitiveFlags ?? [],
      updatedAt: item.updatedAt ?? new Date().toISOString(),
    })) as Subproject[],
    screenings: asArray<ScreeningRecord>(dataset.screenings),
    requirements: asArray<Requirement>(dataset.requirements).map((item) => ({ ...item, dueDate: item.dueDate ?? "", remarks: item.remarks ?? "" })) as Requirement[],
    grievances: asArray<GrievanceCase>(dataset.grievances),
    findings: asArray<MonitoringFinding>(dataset.findings),
    auditEvents: asArray<AuditEvent>(dataset.auditEvents),
    documents: asArray<DocumentRecord>(dataset.documents).map((item) => ({ ...item, remarks: item.remarks ?? "", updatedAt: item.updatedAt ?? new Date().toISOString() })) as DocumentRecord[],
    permits: asArray<PermitRecord>(dataset.permits),
    referenceLayers: asArray<ReferenceLayer>(dataset.referenceLayers),
    spatialOverlayResults: asArray<SpatialOverlayResult>(dataset.spatialOverlayResults),
  };
}

export async function loadJson<T>(path: string): Promise<T> {
  const response = await fetch(path);
  if (!response.ok) throw new Error(`Unable to load ${path}`);
  return response.json() as Promise<T>;
}

async function loadOfficialDataset(): Promise<AppDataset> {
  return normalizeDataset(await loadJson<AppDataset>("./data/sidlan/region-02-app-dataset.json"));
}

export async function loadInitialDataset(): Promise<AppDataset> {
  if (new URLSearchParams(window.location.search).get("reset") === "1") {
    resetLocalDataset();
  }
  const saved = localStorage.getItem(STORE_KEY);
  const sourceSignature = localStorage.getItem(SOURCE_KEY);
  if (saved && sourceSignature === OFFICIAL_SOURCE) {
    try {
      return normalizeDataset(JSON.parse(saved) as Partial<AppDataset>);
    } catch {
      localStorage.removeItem(STORE_KEY);
    }
  }

  const official = await loadOfficialDataset();
  saveDataset(official);
  localStorage.setItem(SOURCE_KEY, OFFICIAL_SOURCE);
  return official;
}

export function saveDataset(dataset: AppDataset): void {
  localStorage.setItem(STORE_KEY, JSON.stringify(normalizeDataset(dataset)));
}

export function exportDataset(dataset: AppDataset): void {
  const blob = new Blob([JSON.stringify(normalizeDataset(dataset), null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `ses-track-02-backup-${new Date().toISOString().slice(0, 10)}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function appendAudit(dataset: AppDataset, event: Omit<AuditEvent, "id" | "timestamp">): AppDataset {
  return normalizeDataset({
    ...dataset,
    auditEvents: [
      {
        ...event,
        id: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
      },
      ...(dataset.auditEvents ?? []),
    ],
  });
}

export function resetLocalDataset(): void {
  localStorage.removeItem(STORE_KEY);
  localStorage.removeItem(SOURCE_KEY);
}

