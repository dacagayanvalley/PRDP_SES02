import type { ReferenceLayer, Requirement, SpatialOverlayResult, Subproject } from "../domain/types";

const nearBufferKm = 3;

export function distanceKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const radius = 6371;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * radius * Math.asin(Math.sqrt(h));
}

function toRad(value: number) {
  return value * Math.PI / 180;
}

export function runSpatialOverlay(subproject: Subproject, layers: ReferenceLayer[]): SpatialOverlayResult[] {
  if (!subproject.coordinates) return [];
  return layers.map((layer) => {
    const centerDistance = distanceKm(subproject.coordinates!, layer.geometry.center);
    const edgeDistance = Math.max(0, centerDistance - layer.geometry.radiusKm);
    const result = centerDistance <= layer.geometry.radiusKm ? "Inside" : edgeDistance <= nearBufferKm ? "Near" : "Outside";
    return {
      id: `overlay-${subproject.id}-${layer.id}`,
      subprojectId: subproject.id,
      layerId: layer.id,
      layerName: layer.name,
      category: layer.category,
      result,
      distanceKm: Number(edgeDistance.toFixed(2)),
      uncertainty: "Advisory GIS screen; competent agency confirmation may still be required.",
      reviewerConfirmed: false,
      checkedAt: new Date().toISOString(),
    } satisfies SpatialOverlayResult;
  });
}

export function requirementFromOverlay(result: SpatialOverlayResult): Requirement | null {
  if (result.result === "Outside" || !result.reviewerConfirmed) return null;
  const base = {
    id: `geo-req-${result.subprojectId}-${result.layerId}`,
    subprojectId: result.subprojectId,
    status: "Missing" as const,
    blocking: true,
    dueDate: "",
    remarks: `Generated from ${result.result.toLowerCase()} advisory GIS overlay. ${result.uncertainty}`,
  };

  if (result.category === "Protected Area") {
    return { ...base, label: "PAMB/SAPA or protected-area clearance confirmation", basis: `${result.layerName}; ESMF Annex C Q52; Annex S`, dueStage: "NOL1", owner: "Proponent/DENR/PAMB" };
  }
  if (result.category === "Hazard") {
    return { ...base, label: "Hazard assessment/clearance and resilient design confirmation", basis: `${result.layerName}; ESMF Annex C Q20-Q23`, dueStage: "NOL1", owner: "Proponent/GGU/RPCO SES" };
  }
  if (result.category === "Ancestral Domain") {
    return { ...base, label: "NCIP CNO/CP/FPIC or IP consultation confirmation", basis: `${result.layerName}; ESMF Annex C Q54-Q55; IPPF`, dueStage: "NOL1", owner: "Proponent/NCIP/RPCO SES" };
  }
  if (result.category === "Forest/Public Land") {
    return { ...base, label: "DENR tenure/forest land confirmation", basis: `${result.layerName}; ESMF Annex C Q44/Q47`, dueStage: "NOL1", owner: "Proponent/DENR" };
  }
  return null;
}


