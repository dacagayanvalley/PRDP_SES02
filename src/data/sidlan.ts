export interface SidlanSnapshotSummary {
  sourceName: string;
  sourceUrl: string;
  region: string;
  fetchedAt: string;
  sources: Array<{
    sourceKind: string;
    ok: boolean;
    totalRowsReported?: number;
    pagesFetched?: number;
    observed?: { rows?: number; uniqueSubprojects?: number; fundSources?: string[]; projectTypes?: string[] };
    filterOptions?: { fundSources?: string[]; stages?: string[]; statuses?: string[]; projectTypes?: string[] };
    error?: string;
  }>;
}

export async function loadSidlanSummary(): Promise<SidlanSnapshotSummary | null> {
  try {
    const response = await fetch("./data/sidlan/region-02-sidlan.json");
    if (!response.ok) return null;
    const snapshot = await response.json() as SidlanSnapshotSummary;
    return {
      sourceName: snapshot.sourceName,
      sourceUrl: snapshot.sourceUrl,
      region: snapshot.region,
      fetchedAt: snapshot.fetchedAt,
      sources: snapshot.sources,
    };
  } catch {
    return null;
  }
}

