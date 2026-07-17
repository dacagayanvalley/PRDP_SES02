param(
  [int]$MaxPages = 20
)

$ErrorActionPreference = "Continue"
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
$region = "Cagayan Valley (Region II)"
$encodedRegion = [uri]::EscapeDataString($region)
$outDir = Join-Path (Get-Location) "data\raw\sidlan"
New-Item -ItemType Directory -Force -Path $outDir | Out-Null

$sources = @(
  @{ Kind = "infrastructure"; Path = "/ses-ib-safeguard-docs/disclosure"; Search = "SesIbSafeguardDocsSearch" },
  @{ Kind = "enterprise"; Path = "/ses-ir-safeguard-docs/disclosure"; Search = "SesIrSafeguardDocsSearch" }
)

foreach ($source in $sources) {
  for ($page = 1; $page -le $MaxPages; $page++) {
    $url = "https://sidlan.da.gov.ph$($source.Path)?$($source.Search)%5Bregion%5D=$encodedRegion&page=$page"
    $dest = Join-Path $outDir "$($source.Kind)-page-$page.html"
    try {
      $response = Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 60
      $response.Content | Set-Content -LiteralPath $dest -Encoding utf8
      if ($response.Content -notmatch "font-weight-bold") { break }
    } catch {
      "FETCH_FAILED $($source.Kind) page $page :: $($_.Exception.Message)" | Write-Warning
      if ($page -eq 1) { break }
    }
    Start-Sleep -Milliseconds 300
  }
}

$env:SIDLAN_CACHE_DIR = $outDir
python scripts\fetch_sidlan_region2.py

