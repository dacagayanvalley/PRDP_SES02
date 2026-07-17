import { useMemo, useState } from "react";
import L from "leaflet";
import { MapContainer, Circle, Marker, Popup, TileLayer, useMap } from "react-leaflet";
import type { AppDataset } from "../data/repositories";
import { appendAudit } from "../data/repositories";
import type { SpatialOverlayResult, Subproject } from "../domain/types";
import { requirementFromOverlay, runSpatialOverlay } from "../rules/spatialOverlay";
import "leaflet/dist/leaflet.css";

interface Props {
  dataset: AppDataset;
  actions: { save: (dataset: AppDataset, message?: string) => void };
}

const markerIcon = new L.Icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

export function GisScreening({ dataset, actions }: Props) {
  const [subprojectId, setSubprojectId] = useState(dataset.subprojects[0]?.id ?? "");
  const selected = dataset.subprojects.find((item) => item.id === subprojectId) ?? dataset.subprojects[0];
  const [lat, setLat] = useState(String(selected?.coordinates?.lat ?? ""));
  const [lng, setLng] = useState(String(selected?.coordinates?.lng ?? ""));
  const [visibleLayers, setVisibleLayers] = useState<Record<string, boolean>>({});
  const [message, setMessage] = useState("");
  const overlays = dataset.spatialOverlayResults.filter((item) => item.subprojectId === selected?.id);
  const center: [number, number] = selected?.coordinates ? [selected.coordinates.lat, selected.coordinates.lng] : [16.975, 121.81];
  const activeLayers = dataset.referenceLayers.filter((layer) => visibleLayers[layer.id] ?? true);

  const generatedRequirements = useMemo(() => overlays.map(requirementFromOverlay).filter(Boolean), [overlays]);

  if (!selected) return <section className="panel"><h2>No subprojects available</h2></section>;

  function selectSubproject(id: string) {
    const sp = dataset.subprojects.find((item) => item.id === id);
    setSubprojectId(id);
    setLat(String(sp?.coordinates?.lat ?? ""));
    setLng(String(sp?.coordinates?.lng ?? ""));
    setMessage("");
  }

  function validCoordinates(nextLat: number, nextLng: number) {
    return Number.isFinite(nextLat) && Number.isFinite(nextLng) && nextLat >= 4 && nextLat <= 22 && nextLng >= 116 && nextLng <= 127;
  }

  function saveCoordinates() {
    const nextLat = Number(lat);
    const nextLng = Number(lng);
    if (!validCoordinates(nextLat, nextLng)) {
      setMessage("Enter valid Philippine coordinates before saving. Latitude should be 4-22 and longitude 116-127.");
      return;
    }
    const subprojects = dataset.subprojects.map((item) => item.id === selected.id ? { ...item, coordinates: { lat: nextLat, lng: nextLng }, updatedAt: new Date().toISOString() } : item);
    actions.save(appendAudit({ ...dataset, subprojects }, { entityType: "Subproject", entityId: selected.id, action: "Updated GIS coordinates", actor: "Static MVP user" }), "Coordinates saved");
    setMessage("");
  }

  function runOverlay() {
    const nextLat = Number(lat);
    const nextLng = Number(lng);
    if (!validCoordinates(nextLat, nextLng)) {
      setMessage("Save valid coordinates before running overlay checks.");
      return;
    }
    const subproject = { ...(dataset.subprojects.find((item) => item.id === selected.id) as Subproject), coordinates: { lat: nextLat, lng: nextLng } };
    const results = runSpatialOverlay(subproject, activeLayers);
    const others = dataset.spatialOverlayResults.filter((item) => item.subprojectId !== selected.id || activeLayers.every((layer) => layer.id !== item.layerId));
    actions.save(appendAudit({ ...dataset, spatialOverlayResults: [...results, ...others] }, { entityType: "Subproject", entityId: selected.id, action: "Ran advisory GIS overlay screening", actor: "Static MVP user" }), `Overlay checked against ${activeLayers.length} visible layer(s)`);
    setMessage("");
  }

  function toggleLayer(layerId: string) {
    setVisibleLayers((current) => ({ ...current, [layerId]: !(current[layerId] ?? true) }));
  }

  function toggleConfirm(result: SpatialOverlayResult) {
    const spatialOverlayResults = dataset.spatialOverlayResults.map((item) => item.id === result.id ? { ...item, reviewerConfirmed: !item.reviewerConfirmed } : item);
    const candidate = requirementFromOverlay({ ...result, reviewerConfirmed: !result.reviewerConfirmed });
    let requirements = dataset.requirements.filter((item) => item.id !== `geo-req-${result.subprojectId}-${result.layerId}`);
    if (candidate) requirements = [candidate, ...requirements];
    actions.save(appendAudit({ ...dataset, spatialOverlayResults, requirements }, { entityType: "SpatialOverlayResult", entityId: result.id, action: !result.reviewerConfirmed ? "Confirmed advisory overlay result and synced requirement" : "Unconfirmed advisory overlay result and removed generated requirement", actor: "Static MVP user" }), !result.reviewerConfirmed ? "Spatial requirement synced" : "Spatial requirement removed");
  }

  return (
    <div className="page-grid">
      <section className="panel span-2">
        <div className="section-heading">
          <div><h2>GIS And Spatial Risk Screening</h2><p className="source">Advisory only. Synthetic layers are not legal certification and must be confirmed by competent agencies.</p></div>
          <button onClick={runOverlay}>Run overlay checks</button>
        </div>
        <div className="form-toolbar">
          <label>Subproject
            <select value={selected.id} onChange={(event) => selectSubproject(event.target.value)}>{dataset.subprojects.map((item) => <option key={item.id} value={item.id}>{item.code}</option>)}</select>
          </label>
          <label>Latitude<input value={lat} onChange={(event) => setLat(event.target.value)} /></label>
          <label>Longitude<input value={lng} onChange={(event) => setLng(event.target.value)} /></label>
          <button onClick={saveCoordinates}>Save coordinates</button>
        </div>
        {message && <div className="inline-alert">{message}</div>}
        <div className="map-frame">
          <MapContainer center={center} zoom={8} scrollWheelZoom={false} className="leaflet-map">
            <TileLayer attribution="&copy; OpenStreetMap contributors" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
            <Recenter center={center} />
            {activeLayers.map((layer) => (
              <Circle key={layer.id} center={[layer.geometry.center.lat, layer.geometry.center.lng]} radius={layer.geometry.radiusKm * 1000} pathOptions={{ color: colorFor(layer.category), fillOpacity: 0.08 }} />
            ))}
            {dataset.subprojects.filter((item) => item.coordinates).map((item) => (
              <Marker key={item.id} position={[item.coordinates!.lat, item.coordinates!.lng]} icon={markerIcon}>
                <Popup><strong>{item.code}</strong><br />{item.title}<br />{item.riskLevel}</Popup>
              </Marker>
            ))}
          </MapContainer>
        </div>
      </section>

      <section className="panel">
        <h2>Reference Layers</h2>
        <div className="layer-list">
          {dataset.referenceLayers.map((layer) => (
            <label className="layer-toggle" key={layer.id}>
              <input type="checkbox" checked={visibleLayers[layer.id] ?? true} onChange={() => toggleLayer(layer.id)} />
              <span className="layer-swatch" style={{ background: colorFor(layer.category) }} />
              <span><strong>{layer.name}</strong><small>{layer.category} | {layer.sensitivity} | {layer.version}</small></span>
            </label>
          ))}
        </div>
        <div className="map-legend">
          <strong>Legend</strong>
          {[...new Set(dataset.referenceLayers.map((layer) => layer.category))].map((category) => <span key={category}><i style={{ background: colorFor(category) }} />{category}</span>)}
        </div>
      </section>

      <section className="panel">
        <h2>Generated Requirement Preview</h2>
        {generatedRequirements.length === 0 ? <p>No confirmed spatial requirements yet.</p> : generatedRequirements.map((item) => item && <div className="compact-card" key={item.id}><strong>{item.label}</strong><span>{item.dueStage} | {item.owner}</span><small>{item.basis}</small></div>)}
      </section>

      <section className="panel span-2">
        <h2>Overlay Results: {selected.code}</h2>
        <div className="table-wrap"><table><thead><tr><th>Layer</th><th>Category</th><th>Result</th><th>Distance</th><th>Uncertainty</th><th>Reviewer confirmation</th></tr></thead><tbody>{overlays.map((result) => <tr key={result.id}>
          <td>{result.layerName}</td><td>{result.category}</td><td><span className={result.result === "Outside" ? "status good" : "status bad"}>{result.result}</span></td><td>{result.distanceKm} km</td><td>{result.uncertainty}</td><td><label><input type="checkbox" checked={result.reviewerConfirmed} onChange={() => toggleConfirm(result)} /> Confirm</label></td>
        </tr>)}</tbody></table></div>
      </section>
    </div>
  );
}

function Recenter({ center }: { center: [number, number] }) {
  const map = useMap();
  map.setView(center, map.getZoom());
  return null;
}

function colorFor(category: string) {
  if (category === "Protected Area") return "#2f6f60";
  if (category === "Hazard") return "#b84040";
  if (category === "Ancestral Domain") return "#6b5bbd";
  if (category === "Forest/Public Land") return "#6c8f35";
  return "#60727b";
}
