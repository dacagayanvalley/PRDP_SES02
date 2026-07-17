#!/usr/bin/env python3
"""Fetch PRDP SIDLAN SES disclosure records for Region II.

Outputs static JSON/CSV snapshots suitable for GitHub Pages. The scraper uses
public GET disclosure pages only and keeps source URLs in every record.
"""
from __future__ import annotations

import csv
import html
import json
import math
import re
import sys
import subprocess
import time
import urllib.parse
import urllib.request
from dataclasses import dataclass, asdict
from html.parser import HTMLParser
from pathlib import Path
from typing import Any

BASE = "https://sidlan.da.gov.ph"
REGION = "Cagayan Valley (Region II)"
OUT_DIR = Path("public/data/sidlan")
USER_AGENT = "SES-Track-02 weekly source updater (+local GitHub Pages MVP)"

ENDPOINTS = {
    "infrastructure": "/ses-ib-safeguard-docs/disclosure",
    "enterprise": "/ses-ir-safeguard-docs/disclosure",
}

SEARCH_NAMES = {
    "infrastructure": "SesIbSafeguardDocsSearch",
    "enterprise": "SesIrSafeguardDocsSearch",
}

@dataclass
class DisclosureDocument:
    title: str
    url: str

@dataclass
class DisclosureRecord:
    source_kind: str
    row_no: int
    sp_id: str
    project_title: str
    location: str
    project_type: str
    fund_source: str
    project_cost_php: str
    documents: list[DisclosureDocument]
    source_url: str

class OptionParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self.current_select: str | None = None
        self.current_option: str | None = None
        self.options: dict[str, list[str]] = {}

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        attrs_d = dict(attrs)
        if tag == "select":
            name = attrs_d.get("name") or attrs_d.get("id") or "unknown"
            self.current_select = name
            self.options.setdefault(name, [])
        elif tag == "option" and self.current_select:
            self.current_option = attrs_d.get("value") or ""

    def handle_data(self, data: str) -> None:
        if self.current_select and self.current_option is not None:
            value = clean(self.current_option or data)
            if value and value not in self.options[self.current_select]:
                self.options[self.current_select].append(value)

    def handle_endtag(self, tag: str) -> None:
        if tag == "option":
            self.current_option = None
        elif tag == "select":
            self.current_select = None

class TableParser(HTMLParser):
    def __init__(self, source_kind: str, page_url: str) -> None:
        super().__init__()
        self.source_kind = source_kind
        self.page_url = page_url
        self.in_table = False
        self.in_tr = False
        self.in_td = False
        self.in_strong = False
        self.current_cell: list[str] = []
        self.current_links: list[DisclosureDocument] = []
        self.row_cells: list[dict[str, Any]] = []
        self.records: list[DisclosureRecord] = []
        self.summary_total = 0

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        attrs_d = dict(attrs)
        if tag == "table" and "table" in (attrs_d.get("class") or ""):
            self.in_table = True
        elif self.in_table and tag == "tr":
            self.in_tr = True
            self.row_cells = []
        elif self.in_tr and tag == "td":
            self.in_td = True
            self.current_cell = []
            self.current_links = []
        elif self.in_td and tag == "br":
            self.current_cell.append("\n")
        elif self.in_td and tag == "a":
            href = attrs_d.get("href") or ""
            title = clean(attrs_d.get("title") or "")
            if href:
                self.current_links.append(DisclosureDocument(title=title, url=urllib.parse.urljoin(BASE, href)))

    def handle_data(self, data: str) -> None:
        text = clean(data)
        if self.in_td and text:
            self.current_cell.append(text)

    def handle_endtag(self, tag: str) -> None:
        if tag == "td" and self.in_td:
            raw_text = html.unescape("".join(self.current_cell))
            cell_text = "\n".join(clean(line) for line in raw_text.split("\n") if clean(line))
            self.row_cells.append({"text": cell_text, "links": self.current_links})
            self.in_td = False
        elif tag == "tr" and self.in_tr:
            self.in_tr = False
            self._finish_row()
        elif tag == "table" and self.in_table:
            self.in_table = False

    def _finish_row(self) -> None:
        if len(self.row_cells) < 4:
            return
        row_no_text = self.row_cells[0]["text"]
        if not row_no_text.isdigit():
            return
        detail_lines = [line.strip() for line in self.row_cells[1]["text"].split("\n") if line.strip()]
        if len(detail_lines) < 3:
            return
        type_fund = detail_lines[-1]
        project_type, fund_source = split_type_fund(type_fund)
        self.records.append(DisclosureRecord(
            source_kind=self.source_kind,
            row_no=int(row_no_text),
            sp_id=detail_lines[0],
            project_title=detail_lines[1] if len(detail_lines) > 1 else "",
            location=detail_lines[2] if len(detail_lines) > 2 else "",
            project_type=project_type,
            fund_source=fund_source,
            project_cost_php=self.row_cells[2]["text"],
            documents=self.row_cells[3]["links"],
            source_url=self.page_url,
        ))

def clean(value: str) -> str:
    return re.sub(r"\s+", " ", html.unescape(value or "")).strip()

def split_type_fund(value: str) -> tuple[str, str]:
    parts = [part.strip() for part in value.split("|")]
    return (parts[0] if parts else "", parts[1] if len(parts) > 1 else "")

def cached_fetch(url: str) -> str | None:
    cache_dir = __import__("os").environ.get("SIDLAN_CACHE_DIR")
    if not cache_dir:
        return None
    kind = "infrastructure" if "/ses-ib-" in url else "enterprise" if "/ses-ir-" in url else "unknown"
    parsed = urllib.parse.urlparse(url)
    page = urllib.parse.parse_qs(parsed.query).get("page", ["1"])[0]
    path = Path(cache_dir) / f"{kind}-page-{page}.html"
    if path.exists():
        return path.read_text(encoding="utf-8", errors="replace")
    return None

def fetch(url: str) -> str:
    cached = cached_fetch(url)
    if cached is not None:
        return cached
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    try:
        with urllib.request.urlopen(req, timeout=45) as response:
            return response.read().decode("utf-8", errors="replace")
    except Exception:
        script = "[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; (Invoke-WebRequest -Uri $env:SIDLAN_FETCH_URL -UseBasicParsing -TimeoutSec 45).Content"
        env = dict(__import__("os").environ)
        env["SIDLAN_FETCH_URL"] = url
        completed = subprocess.run(
            ["powershell", "-NoProfile", "-Command", script],
            check=False,
            capture_output=True,
            text=True,
            encoding="utf-8",
            errors="replace",
            env=env,
        )
        if completed.returncode != 0:
            raise RuntimeError((completed.stderr or completed.stdout or "PowerShell fetch failed").strip())
        return completed.stdout
def disclosure_url(kind: str, page: int = 1, extra: dict[str, str] | None = None) -> str:
    params = {f"{SEARCH_NAMES[kind]}[region]": REGION, "page": str(page)}
    if extra:
        params.update(extra)
    return BASE + ENDPOINTS[kind] + "?" + urllib.parse.urlencode(params)

def parse_total(markup: str) -> int:
    match = re.search(r"Showing\s*<strong>\s*\d+\s+of\s+([\d,]+)", markup, re.I)
    return int(match.group(1).replace(",", "")) if match else 0

def parse_options(markup: str) -> dict[str, list[str]]:
    parser = OptionParser()
    parser.feed(markup)
    return parser.options

def parse_records(kind: str, markup: str, url: str) -> list[DisclosureRecord]:
    parser = TableParser(kind, url)
    parser.feed(markup)
    return parser.records

def fetch_kind(kind: str) -> dict[str, Any]:
    first_url = disclosure_url(kind, 1)
    try:
        first = fetch(first_url)
    except Exception as exc:
        return {"sourceKind": kind, "ok": False, "error": str(exc), "records": [], "uniqueSubprojects": [], "filterOptions": {}, "observed": {}, "sourceUrl": first_url}

    total = parse_total(first)
    pages = max(1, math.ceil(total / 20))
    records = parse_records(kind, first, first_url)
    for page in range(2, pages + 1):
        url = disclosure_url(kind, page)
        markup = fetch(url)
        records.extend(parse_records(kind, markup, url))
        time.sleep(0.2)

    unique: dict[str, dict[str, Any]] = {}
    for record in records:
        item = unique.setdefault(record.sp_id, {
            "sourceKind": kind,
            "spId": record.sp_id,
            "projectTitle": record.project_title,
            "location": record.location,
            "projectType": record.project_type,
            "fundSource": record.fund_source,
            "projectCostPhp": record.project_cost_php,
            "documentCount": 0,
            "documents": [],
            "sourceUrl": record.source_url,
        })
        for doc in record.documents:
            key = (doc.title, doc.url)
            if key not in {(d["title"], d["url"]) for d in item["documents"]}:
                item["documents"].append(asdict(doc))
        item["documentCount"] = len(item["documents"])

    options = parse_options(first)
    observed = {
        "fundSources": sorted({r.fund_source for r in records if r.fund_source}),
        "projectTypes": sorted({r.project_type for r in records if r.project_type}),
        "rows": len(records),
        "uniqueSubprojects": len(unique),
    }
    return {
        "sourceKind": kind,
        "ok": True,
        "sourceUrl": first_url,
        "fetchedAt": iso_now(),
        "region": REGION,
        "totalRowsReported": total,
        "pagesFetched": pages,
        "filterOptions": normalize_filter_options(options),
        "observed": observed,
        "records": [record_to_dict(record) for record in records],
        "uniqueSubprojects": list(unique.values()),
    }

def normalize_filter_options(options: dict[str, list[str]]) -> dict[str, list[str]]:
    wanted = {
        "fundSources": "fund_source",
        "stages": "stage",
        "statuses": "status",
        "projectTypes": "project_type",
        "regions": "region",
    }
    output: dict[str, list[str]] = {}
    for label, needle in wanted.items():
        values: list[str] = []
        for name, opts in options.items():
            if needle in name:
                values.extend(opts)
        output[label] = sorted(dict.fromkeys(values))
    return output

def record_to_dict(record: DisclosureRecord) -> dict[str, Any]:
    data = asdict(record)
    data["documents"] = [asdict(doc) if hasattr(doc, "__dataclass_fields__") else doc for doc in record.documents]
    return data

def iso_now() -> str:
    return time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())

def app_stage(_: dict[str, Any]) -> str:
    return "Under Screening"

def risk_for(record: dict[str, Any]) -> str:
    docs = " ".join(doc.get("title", "") for doc in record.get("documents", []))
    if any(token in docs.upper() for token in ["RAP", "CP", "IP", "CNO", "ECC"]):
        return "Substantial"
    return "Moderate"

def to_app_dataset(combined: dict[str, Any]) -> dict[str, Any]:
    subprojects = []
    documents = []
    for section in combined["sources"]:
        for item in section.get("uniqueSubprojects", []):
            sub_id = f"sidlan-{section['sourceKind']}-{slug(item['spId'])}"
            province = province_from_location(item.get("location", ""))
            component = "IBUILD" if section["sourceKind"] == "infrastructure" else "IREAP"
            subprojects.append({
                "id": sub_id,
                "code": item["spId"],
                "title": item["projectTitle"],
                "component": component,
                "type": item["projectType"] or section["sourceKind"].title(),
                "proponent": "SIDLAN disclosure record",
                "province": province,
                "municipality": municipality_from_location(item.get("location", "")),
                "estimatedCostPhp": parse_money(item.get("projectCostPhp", "")),
                "stage": app_stage(item),
                "riskLevel": risk_for(item),
                "responsibleSes": "RPCO 02 SES Unit",
                "sensitiveFlags": [],
                "updatedAt": combined["fetchedAt"],
                "commodity": item.get("fundSource", ""),
            })
            for doc in item.get("documents", []):
                documents.append({
                    "id": f"sidlan-doc-{section['sourceKind']}-{slug(item['spId'])}-{slug(doc.get('title','doc'))}",
                    "subprojectId": sub_id,
                    "title": doc.get("title", "SIDLAN document"),
                    "documentType": doc.get("title", "SIDLAN document"),
                    "version": "SIDLAN disclosure snapshot",
                    "confidentiality": "Public",
                    "status": "Submitted",
                    "remarks": doc.get("url", ""),
                    "updatedAt": combined["fetchedAt"],
                })
    return {
        "subprojects": subprojects,
        "screenings": [],
        "requirements": [],
        "grievances": [],
        "findings": [],
        "auditEvents": [{
            "id": "sidlan-import-audit",
            "entityType": "SourceRefresh",
            "entityId": "SIDLAN-Region-II",
            "action": "Loaded official SIDLAN Region II disclosure snapshot",
            "actor": "SES-Track 02 updater",
            "timestamp": combined["fetchedAt"],
            "reason": combined["sourceUrl"],
        }],
        "documents": documents,
        "permits": [],
        "referenceLayers": [],
        "spatialOverlayResults": [],
    }

def parse_money(value: str) -> int:
    cleaned = re.sub(r"[^0-9.]", "", value or "")
    try:
        return round(float(cleaned))
    except ValueError:
        return 0

def province_from_location(location: str) -> str:
    parts = [p.strip() for p in location.split(",") if p.strip()]
    return parts[-1] if parts else "Region II"

def municipality_from_location(location: str) -> str:
    parts = [p.strip() for p in location.split(",") if p.strip()]
    return parts[-2] if len(parts) >= 2 else "Unspecified"

def slug(value: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", value.lower()).strip("-")[:96]

def write_csv(path: Path, rows: list[dict[str, Any]]) -> None:
    headers = ["sourceKind", "spId", "projectTitle", "location", "projectType", "fundSource", "projectCostPhp", "documentCount", "sourceUrl"]
    with path.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=headers)
        writer.writeheader()
        for row in rows:
            writer.writerow({key: row.get(key, "") for key in headers})

def main() -> int:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    sources = [fetch_kind(kind) for kind in ENDPOINTS]
    combined = {
        "schemaVersion": 1,
        "sourceName": "SIDLAN SES IB/IR Safeguard Documents Disclosure",
        "sourceUrl": BASE + ENDPOINTS["infrastructure"],
        "region": REGION,
        "fetchedAt": iso_now(),
        "sources": sources,
    }
    combined["appDataset"] = to_app_dataset(combined)
    (OUT_DIR / "region-02-sidlan.json").write_text(json.dumps(combined, indent=2, ensure_ascii=False), encoding="utf-8")
    (OUT_DIR / "region-02-app-dataset.json").write_text(json.dumps(combined["appDataset"], indent=2, ensure_ascii=False), encoding="utf-8")
    all_unique = [item for source in sources for item in source.get("uniqueSubprojects", [])]
    write_csv(OUT_DIR / "region-02-subprojects.csv", all_unique)
    print(json.dumps({
        "ok": all(source.get("ok") for source in sources),
        "fetchedAt": combined["fetchedAt"],
        "sources": [{"kind": s["sourceKind"], "ok": s.get("ok"), "rows": len(s.get("records", [])), "uniqueSubprojects": len(s.get("uniqueSubprojects", [])), "error": s.get("error")} for s in sources],
        "output": str(OUT_DIR / "region-02-sidlan.json"),
    }, indent=2))
    return 0

if __name__ == "__main__":
    raise SystemExit(main())















