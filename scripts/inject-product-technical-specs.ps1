$ErrorActionPreference = 'Stop'

$siteRoot = Resolve-Path (Join-Path $PSScriptRoot '..')
$specPath = Join-Path $siteRoot 'data/product-technical-specifications.json'
$productsRoot = Join-Path $siteRoot 'products'
$utf8 = New-Object System.Text.UTF8Encoding($false)

if (-not (Test-Path -LiteralPath $specPath)) {
  throw "Technical specification data not found: $specPath"
}

$specs = Get-Content -LiteralPath $specPath -Raw -Encoding UTF8 | ConvertFrom-Json
$pageMap = [ordered]@{
  'power-inductor.html' = 'power-inductor'
  'smd-inductors.html' = 'smd-inductors'
  'drum-core-inductors.html' = 'drum-core-inductors'
  'toroidal-inductors.html' = 'toroidal-inductors'
  'magnet-ring-inductor.html' = 'magnet-ring-inductor'
  'common-mode-choke.html' = 'common-mode-choke'
  'common-mode-chokes.html' = 'common-mode-choke'
  'planar-transformer.html' = 'planar-transformer'
  'high-frequency-transformers.html' = 'high-frequency-transformers'
  'transformers.html' = 'transformers'
  'custom-magnetic-components.html' = 'custom-magnetic-components'
}

function Encode([string]$value) {
  return [System.Net.WebUtility]::HtmlEncode($value)
}

function ListItems($items) {
  return (($items | ForEach-Object { '<li>' + (Encode ([string]$_)) + '</li>' }) -join '')
}

function BuildTechnicalModule([string]$key, $spec) {
  $id = Encode "$key-technical-specifications"
  $catalogPages = Encode ([string]$spec.catalogPages)
  $series = ListItems $spec.series
  $parameters = ListItems $spec.parameters
  $applications = ListItems $spec.applications
  $customOptions = ListItems $spec.customOptions
  $notes = Encode ([string]$spec.notes)
  return @"
<section class="section product-technical-module" aria-labelledby="$id"><div class="section-head"><p class="eyebrow">Catalog-Verified Technical Information</p><h2 id="$id">Technical Specifications and Selection Guidance</h2><p>Specification scope referenced from $catalogPages. Electrical values and dimensions are confirmed by series and part number.</p></div><div class="technical-spec-grid"><article class="technical-spec-card"><h3>Available Series</h3><ul>$series</ul></article><article class="technical-spec-card"><h3>Parameters for Selection</h3><ul>$parameters</ul></article><article class="technical-spec-card"><h3>Typical Applications</h3><ul>$applications</ul></article><article class="technical-spec-card"><h3>Custom Engineering Options</h3><ul>$customOptions</ul></article></div><div class="technical-spec-note"><h3>Specification Note</h3><p>$notes</p><p>Send the target application, electrical conditions, drawing or sample photo to receive a series recommendation and confirmed specification.</p><a class="btn" href="../contact.html">Request Technical Review / RFQ</a></div></section>
"@
}

$updatedCount = 0
foreach ($entry in $pageMap.GetEnumerator()) {
  $pagePath = Join-Path $productsRoot $entry.Key
  if (-not (Test-Path -LiteralPath $pagePath)) { continue }
  $spec = $specs.($entry.Value)
  if (-not $spec) { throw "No technical specification mapping for $($entry.Value)" }
  $html = [System.IO.File]::ReadAllText($pagePath)
  $html = [regex]::Replace($html, '<section class="section product-technical-module"[\s\S]*?</section>', '', 1)
  $marker = '<section class="section product-catalog">'
  if (-not $html.Contains($marker)) { throw "Product catalog marker not found in $pagePath" }
  $module = BuildTechnicalModule $entry.Value $spec
  $html = $html.Replace($marker, $module + $marker)
  [System.IO.File]::WriteAllText($pagePath, $html, $utf8)
  $updatedCount++
}

Write-Output "Added catalog-verified technical modules to $updatedCount product category pages."
