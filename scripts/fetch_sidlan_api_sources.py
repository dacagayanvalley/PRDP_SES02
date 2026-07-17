#!/usr/bin/env python3
"""Fetch SIDLAN API source datasets into static, redacted JSON snapshots.

API keys are read from environment variables so the public GitHub Pages app can
show official records without publishing credentials in browser code.
"""
from __future__ import annotations

import csv
import io
import json
import os
import re
import time
import urllib.parse
import urllib.request
from typing import Any

OUT_PATH = "public/data/sidlan/source-datasets.json"
REGION_PATTERNS = (re.compile(r"\bregion\s+ii\b(?!i)", re.I), re.compile(r"cagayan\s+valley", re.I))
USER_AGENT = "SES-Track-02 SIDLAN API source updater"


SOURCES = [
    {
        "id": "fmr-watch",
        "name": "PRDP SU - Farm to Market Road Subprojects for FMR Watch",
        "component": "IBUILD",
        "format": "json",
        "url": "https://sidlan.da.gov.ph/api/fmr-projects?return_values=json&api_key={api_key}",
        "env": "SIDLAN_FMR_API_KEY",
        "default_key": "",
    },
    {
        "id": "ibuild-subprojects",
        "name": "Infrastructure Subprojects Dataset",
        "component": "IBUILD",
        "format": "csv",
        "url": "https://sidlan.da.gov.ph/api/ibuild?dataset_id=ib-01-001&return_values=csv&cluster=all&region=all&province=all&group_status=approved&api_key={api_key}",
        "env": "SIDLAN_IBUILD_API_KEY",
        "default_key": "",
    },
    {
        "id": "iplan-vca",
        "name": "IPLAN VCA Dataset",
        "component": "IPLAN",
        "format": "csv",
        "url": "https://sidlan.da.gov.ph/api/iplan?dataset_id=ip-vca-001&return_values=csv&cluster=all&region=all&province=all&group_status=approved&api_key={api_key}",
        "env": "SIDLAN_IPLAN_API_KEY",
        "default_key": "",
    },
    {
        "id": "ireap-enterprise",
        "name": "Enterprise Subprojects Dataset",
        "component": "IREAP",
        "format": "csv",
        "url": "https://sidlan.da.gov.ph/api/ireap?dataset_id=ir-01-001&return_values=csv&cluster=all&region=all&province=all&group_status=approved&api_key={api_key}",
        "env": "SIDLAN_IREAP_API_KEY",
        "default_key": "",
    },
    {
        "id": "lgu",
        "name": "LGU Dataset",
        "component": "LGU",
        "format": "csv",
        "url": "https://sidlan.da.gov.ph/api/lgu?dataset_id=lgu-01-001&return_values=csv&cluster=all&region=all&province=all&group_status=approved&api_key={api_key}",
        "env": "SIDLAN_LGU_API_KEY",
        "default_key": "",
    },
]


def iso_now() -> str:
    return time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())


def redact_url(url: str) -> str:
    parsed = urllib.parse.urlparse(url)
    query = urllib.parse.parse_qsl(parsed.query, keep_blank_values=True)
    redacted = [(key, "***" if key == "api_key" else value) for key, value in query]
    return urllib.parse.urlunparse(parsed._replace(query=urllib.parse.urlencode(redacted)))


def fetch_text(url: str) -> str:
    request = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    with urllib.request.urlopen(request, timeout=90) as response:
        return response.read().decode("utf-8-sig", errors="replace")


def parse_payload(text: str, source_format: str) -> list[dict[str, Any]]:
    stripped = text.lstrip()
    if stripped.startswith("{") or stripped.startswith("["):
        payload = json.loads(text)
        if isinstance(payload, dict) and str(payload.get("status", "")).lower() == "error":
            raise RuntimeError(str(payload.get("message", "SIDLAN API returned an error.")))
        if source_format == "csv":
            return [row for row in payload if isinstance(row, dict)] if isinstance(payload, list) else []
    if source_format == "json":
        payload = json.loads(text)
        if isinstance(payload, dict):
            for key in ("data", "records", "results", "projects"):
                if isinstance(payload.get(key), list):
                    payload = payload[key]
                    break
        return [row for row in payload if isinstance(row, dict)] if isinstance(payload, list) else []
    reader = csv.DictReader(io.StringIO(text))
    return [dict(row) for row in reader]


def row_value(row: dict[str, Any], keys: tuple[str, ...]) -> str:
    lowered = {key.lower(): value for key, value in row.items()}
    for key in keys:
        value = lowered.get(key.lower())
        if value not in (None, ""):
            if isinstance(value, list):
                return ", ".join(str(item) for item in value)
            return str(value)
    return ""


def is_region_ii(row: dict[str, Any]) -> bool:
    region = row_value(row, ("region", "Region", "reg_name")).lower()
    location = row_value(row, ("location", "project_location")).lower()
    return any(pattern.search(region) or pattern.search(location) for pattern in REGION_PATTERNS)


def normalize_record(row: dict[str, Any], source: dict[str, str]) -> dict[str, Any]:
    title = row_value(row, ("sp_name", "name", "project_title", "title", "project_name", "vca_name"))
    province = row_value(row, ("province", "Province"))
    municipality = row_value(row, ("city/municipality", "municipality", "city", "lgu"))
    return {
        "sourceId": source["id"],
        "component": source["component"],
        "code": row_value(row, ("sp_id", "spid", "subproject_id", "project_id", "psgc_code")),
        "title": title,
        "proponent": row_value(row, ("proponent", "operating_unit", "lgu_name")),
        "region": row_value(row, ("region",)),
        "province": province,
        "municipality": municipality,
        "stage": row_value(row, ("stage",)),
        "status": row_value(row, ("status", "group_status")),
        "projectType": row_value(row, ("sp_type", "project_type", "road_type", "sp_category")),
        "fundSource": row_value(row, ("fund_source",)),
        "commodity": row_value(row, ("commodity", "commodities")),
        "cost": row_value(row, ("estimated_project_cost", "rpab_approved_cost", "budget", "sp_indicative_cost")),
        "latitude": row_value(row, ("latitude", "lat")),
        "longitude": row_value(row, ("longitude", "lng", "long")),
    }


def summarize(records: list[dict[str, Any]]) -> dict[str, Any]:
    def values(key: str) -> list[str]:
        return sorted({str(row.get(key, "")).strip() for row in records if str(row.get(key, "")).strip()})

    return {
        "rows": len(records),
        "fundSources": values("fundSource"),
        "stages": values("stage"),
        "statuses": values("status"),
        "projectTypes": values("projectType"),
        "provinces": values("province"),
    }


def fetch_source(source: dict[str, str]) -> dict[str, Any]:
    api_key = os.environ.get(source["env"], source.get("default_key", "")).strip()
    source_url = source["url"].format(api_key=api_key)
    base = {
        "id": source["id"],
        "name": source["name"],
        "component": source["component"],
        "format": source["format"],
        "sourceUrl": redact_url(source_url),
        "regionFilter": "Cagayan Valley (Region II)",
    }
    if not api_key:
        return {**base, "ok": False, "error": f"Missing {source['env']} environment variable.", "records": [], "summary": summarize([])}
    try:
        raw_rows = parse_payload(fetch_text(source_url), source["format"])
        if len(raw_rows) == 1 and str(raw_rows[0].get("status", "")).lower() == "error":
            raise RuntimeError(str(raw_rows[0].get("message", "SIDLAN API returned an error.")))
        records = [normalize_record(row, source) for row in raw_rows if is_region_ii(row)]
        return {**base, "ok": True, "records": records, "summary": summarize(records), "columns": list(raw_rows[0].keys()) if raw_rows else []}
    except Exception as exc:
        return {**base, "ok": False, "error": str(exc), "records": [], "summary": summarize([])}


def main() -> int:
    snapshot = {
        "schemaVersion": 1,
        "sourceName": "SIDLAN PRDP API Source Datasets",
        "region": "Cagayan Valley (Region II)",
        "fetchedAt": iso_now(),
        "sources": [fetch_source(source) for source in SOURCES],
    }
    os.makedirs(os.path.dirname(OUT_PATH), exist_ok=True)
    with open(OUT_PATH, "w", encoding="utf-8") as handle:
        json.dump(snapshot, handle, indent=2, ensure_ascii=False)
    print(json.dumps({
        "fetchedAt": snapshot["fetchedAt"],
        "sources": [{"id": item["id"], "ok": item["ok"], "rows": item["summary"]["rows"], "error": item.get("error")} for item in snapshot["sources"]],
    }, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
