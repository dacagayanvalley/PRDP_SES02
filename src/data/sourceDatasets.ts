export interface SourceDatasetRecord {
  sourceId: string;
  component: string;
  code: string;
  title: string;
  proponent: string;
  region: string;
  province: string;
  municipality: string;
  stage: string;
  status: string;
  projectType: string;
  fundSource: string;
  commodity: string;
  cost: string;
  latitude: string;
  longitude: string;
}

export interface SourceDatasetSummary {
  rows: number;
  fundSources: string[];
  stages: string[];
  statuses: string[];
  projectTypes: string[];
  provinces: string[];
}

export interface SourceDataset {
  id: string;
  name: string;
  component: string;
  format: string;
  sourceUrl: string;
  regionFilter: string;
  ok: boolean;
  error?: string;
  summary: SourceDatasetSummary;
  columns?: string[];
  records: SourceDatasetRecord[];
}

export interface SourceDatasetSnapshot {
  schemaVersion: number;
  sourceName: string;
  region: string;
  fetchedAt: string;
  sources: SourceDataset[];
}

export async function loadSourceDatasets(): Promise<SourceDatasetSnapshot | null> {
  try {
    const response = await fetch("./data/sidlan/source-datasets.json");
    if (!response.ok) return null;
    return await response.json() as SourceDatasetSnapshot;
  } catch {
    return null;
  }
}