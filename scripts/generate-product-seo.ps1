$ErrorActionPreference = 'Stop'

$siteRoot = Resolve-Path (Join-Path $PSScriptRoot '..')
$imageRoot = Join-Path $siteRoot 'assets/images/products'
$dataRoot = Join-Path $siteRoot 'assets/data'
$configRoot = Join-Path $siteRoot 'data'
$productSystemPath = Join-Path $configRoot 'product-system.json'
$categoryConfigPath = Join-Path $configRoot 'product-categories.json'
$productsRoot = Join-Path $siteRoot 'products'
$baseUrl = 'https://www.gzmiden.com'

New-Item -ItemType Directory -Force -Path $dataRoot | Out-Null
New-Item -ItemType Directory -Force -Path $configRoot | Out-Null
New-Item -ItemType Directory -Force -Path $productsRoot | Out-Null

$productSystem = $null
if (Test-Path -LiteralPath $productSystemPath) {
  $productSystem = Get-Content -LiteralPath $productSystemPath -Raw | ConvertFrom-Json
  if ($productSystem.system.baseUrl) { $baseUrl = [string]$productSystem.system.baseUrl }
}

$categoryConfig = if ($productSystem -and $productSystem.categories) {
  $productSystem.categories
} elseif (Test-Path -LiteralPath $categoryConfigPath) {
  Get-Content -LiteralPath $categoryConfigPath -Raw | ConvertFrom-Json
} else {
  $null
}

$seoMap = @{
  'DSC05059.JPG' = 'Miden Electronics Power Inductor Series high current power supply application'
  'catalog-p07-img06.jpeg' = 'Miden Electronics SMD Inductor Series compact PCB EMI filter application'
}

$categoryMergeMap = @{}
if ($productSystem -and $productSystem.aliases) {
  foreach ($alias in $productSystem.aliases.PSObject.Properties) {
    $categoryMergeMap[$alias.Name] = [string]$alias.Value
  }
} else {
  $categoryMergeMap['power-inductors'] = 'power-inductor'
}

$canonicalAliasMap = @{}
foreach ($alias in $categoryMergeMap.GetEnumerator()) {
  if (-not $canonicalAliasMap.ContainsKey($alias.Value)) {
    $canonicalAliasMap[$alias.Value] = @($alias.Value)
  }
  $canonicalAliasMap[$alias.Value] = @($canonicalAliasMap[$alias.Value] + $alias.Key) | Select-Object -Unique
}

function HtmlEncode([string]$value) {
  return [System.Net.WebUtility]::HtmlEncode($value)
}

function Get-CategoryConfig([string]$slug) {
  if ($categoryConfig -and $categoryConfig.PSObject.Properties.Name -contains $slug) {
    return $categoryConfig.$slug
  }
  return $null
}

function To-Title([string]$slug) {
  $config = Get-CategoryConfig $slug
  if ($config -and $config.title) { return [string]$config.title }
  $cleanSlug = $slug -replace '[-_]+\d+$', ''
  $text = (($cleanSlug -replace '[-_]+', ' ') -replace '\s+', ' ').Trim()
  $culture = [System.Globalization.CultureInfo]::GetCultureInfo('en-US')
  return $culture.TextInfo.ToTitleCase($text.ToLowerInvariant())
}

function Get-Keywords([string]$slug, [string]$title) {
  $config = Get-CategoryConfig $slug
  if ($config -and $config.keywords) { return @($config.keywords | ForEach-Object { [string]$_ }) }
  return @($title.ToLowerInvariant(), 'magnetic components supplier', 'industrial magnetic component')
}

function Get-KeywordPhrase([string[]]$keywords) {
  return ($keywords | Select-Object -First 4) -join ' '
}

function Get-Description([string]$slug, [string]$title, [string[]]$keywords) {
  $config = Get-CategoryConfig $slug
  if ($config -and $config.description) { return [string]$config.description }
  $keyword = Get-KeywordPhrase $keywords
  if ($productSystem -and $productSystem.system.defaultDescription) {
    return "$title - $($productSystem.system.defaultDescription)"
  }
  return "$title from Guangzhou Miden Electronics are magnetic components for industrial electronics, power conversion, EMI control and custom engineering projects. Buyers can review the full image gallery and use the RFQ entry to request inductance, current, frequency, size, sample or drawing support. Keyword focus: $keyword."
}

function Get-SeoIntro([string]$slug, [string]$title, [string[]]$keywords) {
  $summary = Get-Description $slug $title $keywords
  $keywordPhrase = Get-KeywordPhrase $keywords
  return "$summary $title products are designed for B2B engineers, purchasing teams and product development managers who need reliable magnetic components for power supplies, EV charging equipment, renewable energy converters, industrial control systems, communication devices, LED drivers and custom electronic assemblies. This category page is generated automatically from the product image folder, so every qualified product photo inside assets/images/products is displayed without manual HTML editing. The structure helps buyers review physical construction, mounting format, winding style, core type and application fit before sending an RFQ. MiDEN Electronics can support discussion around inductance value, rated current, saturation current, frequency range, temperature rise, insulation requirement, mechanical size, sample matching and drawing review. For SEO and sourcing clarity, the page connects $keywordPhrase with practical industrial applications instead of using file names or internal asset labels. Each image is presented as part of a clean gallery with lazy loading, schema-friendly product cards, readable ALT text and a direct quotation path. The layout is intended for industrial sourcing behavior: large product images, clear technical category naming, fast contact actions, stable URLs and related product navigation. Buyers can use the gallery to compare product proportions, lead style, winding density, core geometry and assembly format before asking for samples or drawings. If a standard product does not match the target requirement, the same RFQ flow can be used for customized magnetic component discussion, including alternative materials, winding changes, insulation class, mounting method and production quantity planning. Buyers can compare this category with related product families using the internal links below, then contact the sales team through RFQ, email or WhatsApp. ElexNova presents these magnetic component galleries for global sourcing teams that need consistent terminology, stable static pages and a scalable folder-driven product library manufactured by MiDEN Electronics."
}

function Get-SeoAlt([string]$src, [string]$productTitle, [string[]]$keywords) {
  $relative = $src -replace '^assets/images/products/', ''
  $fileName = [System.IO.Path]::GetFileName($relative)
  $extension = [System.IO.Path]::GetExtension($fileName)
  $baseName = [System.IO.Path]::GetFileNameWithoutExtension($fileName)
  $dimensionlessName = ($baseName -replace '-\d+x\d+$', '') + $extension
  foreach ($candidate in @($relative, $fileName, $dimensionlessName)) {
    if ($seoMap.ContainsKey($candidate)) { return $seoMap[$candidate] }
  }
  return "Miden Electronics $productTitle $(Get-KeywordPhrase $keywords)"
}

function Get-ImagePaths([string[]]$folders) {
  $items = New-Object System.Collections.Generic.List[string]
  foreach ($folder in $folders) {
    $folderPath = Join-Path $imageRoot $folder
    if (-not (Test-Path -LiteralPath $folderPath)) { continue }
    Get-ChildItem -LiteralPath $folderPath -Recurse -File |
      Where-Object { $_.Extension -match '^\.(jpg|jpeg|png|webp|gif)$' } |
      Sort-Object FullName |
      ForEach-Object {
        $relative = $_.FullName.Substring((Resolve-Path $folderPath).Path.Length + 1).Replace('\', '/')
        $items.Add("assets/images/products/$folder/$relative")
      }
  }
  return $items
}

function Get-InternalLinkSlugs($category) {
  $configured = Get-CategoryConfig $category.slug
  $links = @()
  if ($configured -and $configured.internalLinks) {
    $links += @($configured.internalLinks | ForEach-Object { [string]$_ })
  }
  $links += @($folderCategories | Where-Object { $_.slug -ne $category.slug } | Select-Object -ExpandProperty slug)
  return @($links | Where-Object { $_ -and $_ -ne $category.slug } | Select-Object -Unique)
}

function Get-RelatedCategoryLinks($category, [string]$prefix) {
  $links = Get-InternalLinkSlugs $category
  (($links | ForEach-Object {
    $targetSlug = $_
    $target = $folderCategories | Where-Object { $_.slug -eq $targetSlug } | Select-Object -First 1
    if (-not $target) { return }
    '<a href="' + $prefix + $target.url + '">' + (HtmlEncode $target.title) + '</a>'
  }) -join '')
}

function Get-GlobalInternalLinks([string]$prefix) {
  if (-not ($productSystem -and $productSystem.system.globalInternalLinks)) { return '' }
  (($productSystem.system.globalInternalLinks | ForEach-Object {
    $url = [string]$_.url
    if ($url.StartsWith('../')) { $url = $prefix + $url.Substring(3) }
    '<a href="' + (HtmlEncode $url) + '">' + (HtmlEncode ([string]$_.label)) + '</a>'
  }) -join '')
}

$sourceFolders = Get-ChildItem -LiteralPath $imageRoot -Directory | Sort-Object Name | Select-Object -ExpandProperty Name
$canonicalSlugs = $sourceFolders | ForEach-Object {
  if ($categoryMergeMap.ContainsKey($_)) { $categoryMergeMap[$_] } else { $_ }
} | Select-Object -Unique

$folderCategories = $canonicalSlugs |
  Sort-Object |
  ForEach-Object {
    $slug = $_
    $folders = if ($canonicalAliasMap.ContainsKey($slug)) { $canonicalAliasMap[$slug] } else { @($slug) }
    $title = To-Title $slug
    $keywords = @(Get-Keywords $slug $title)
    [pscustomobject]@{
      category = $slug
      slug = $slug
      title = $title
      folders = $folders
      keywords = $keywords
      description = Get-Description $slug $title $keywords
      seoIntro = Get-SeoIntro $slug $title $keywords
      url = "products/$slug.html"
      images = @(Get-ImagePaths $folders)
    }
  }

$manifest = [ordered]@{}
foreach ($category in $folderCategories) {
  $manifest[$category.slug] = [ordered]@{
    category = $category.category
    title = $category.title
    slug = $category.slug
    description = $category.description
    seoIntro = $category.seoIntro
    images = $category.images
    keywords = $category.keywords
    url = $category.url
  }
}
($manifest | ConvertTo-Json -Depth 10) | Set-Content -LiteralPath (Join-Path $dataRoot 'product-manifest.json') -Encoding UTF8

function Header([string]$prefix, $categories) {
  $links = ($categories | ForEach-Object {
    '<a href="' + $prefix + $_.url + '">' + (HtmlEncode $_.title) + '</a>'
  }) -join ''
@"
<header class="site-header"><div class="header-main"><a class="logo" href="${prefix}index.html">MiDEN<small>Electronics</small></a><button class="nav-toggle" aria-controls="site-nav" aria-expanded="false">Menu</button><div class="header-right"><nav class="site-nav" id="site-nav"><a href="${prefix}index.html">Home</a><a href="${prefix}about.html">About Us</a><div class="dropdown"><button class="dropdown-toggle" type="button">Products</button><div class="dropdown-menu">$links</div></div><a href="${prefix}applications.html">Applications</a><a href="${prefix}factory.html">Factory</a><a href="${prefix}news.html">News</a><a href="${prefix}certificates.html">Certificates</a><a href="${prefix}downloads.html">Downloads</a><a href="${prefix}contact.html">Contact Us</a></nav></div></div></header>
"@
}

function Footer([string]$prefix) {
@"
<section class="cta-band"><div><p class="eyebrow">Product RFQ</p><h2>Need a product recommendation?</h2><p>Send current, inductance, frequency, size and application details.</p></div><a class="btn" href="${prefix}contact.html">Request RFQ / Get Quote</a></section><footer class="site-footer"><div class="footer-grid"><div><h2>MiDEN</h2><p>ElexNova provides high-quality magnetic components manufactured by MiDEN Electronics.</p></div><div><h3>Resources</h3><a href="${prefix}products.html">Products</a><a href="${prefix}downloads.html">Downloads</a><a href="${prefix}factory.html">Factory</a><a href="${prefix}certificates.html">Certificates</a></div><div><h3>Contact</h3><p>Ruby Liu</p><p>WhatsApp: +86 19808253978</p><p>Email: <a href="https://mail.google.com/mail/?view=cm&amp;fs=1&amp;to=selinaliu3978%40gmail.com&amp;su=RFQ%20from%20Website&amp;body=Hi%2C%20I%20am%20interested%20in%20your%20magnetic%20components." target="_blank" rel="noopener" title="Send Email">selinaliu3978@gmail.com</a></p></div></div><div class="footer-contact-actions"><a href="${prefix}contact.html">Request RFQ / Get Quote</a><a href="https://wa.me/8619808253978" target="_blank" rel="noopener">WhatsApp</a><a href="https://mail.google.com/mail/?view=cm&amp;fs=1&amp;to=selinaliu3978%40gmail.com&amp;su=RFQ%20from%20Website&amp;body=Hi%2C%20I%20am%20interested%20in%20your%20magnetic%20components." target="_blank" rel="noopener" title="Send Email">Email</a></div></footer><div class="floating-contact"><a href="https://wa.me/8619808253978" target="_blank" rel="noopener">WhatsApp</a></div>
"@
}

$productsScript = @'
<script>
const keywordLabels = ['inductor manufacturer', 'magnetic components supplier', 'power inductor factory', 'transformer supplier China'];
const keywordHtml = () => `<div class="product-keyword-labels">${keywordLabels.map((label) => `<span>${label}</span>`).join('')}</div>`;
const escapeHtml = (value) => String(value || '').replace(/[&<>"']/g, (char) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const imageExists = (src) => new Promise((resolve) => {
  const image = new Image();
  image.onload = () => resolve(true);
  image.onerror = () => resolve(false);
  image.src = src;
});
const getAltText = (imageSrc, category) => {
  const keywords = Array.isArray(category.keywords) ? category.keywords.join(' ') : '';
  return `Miden Electronics ${category.title} ${keywords}`;
};
const productCard = (imageSrc, category) => {
  const productTitle = category.title;
  const altText = getAltText(imageSrc, category);
  return `<article class="product-card product-library-card" itemscope itemtype="https://schema.org/Product"><a class="product-library-card__link" href="${escapeHtml(imageSrc)}" data-lightbox-image><img itemprop="image" src="${escapeHtml(imageSrc)}" alt="${escapeHtml(altText)}" loading="lazy"></a><div class="product-library-card__body"><span class="product-category-label">${escapeHtml(category.title)}</span><h3 itemprop="name">${escapeHtml(productTitle)}</h3><p itemprop="description">High quality magnetic component</p>${keywordHtml()}<a class="btn product-library-card__rfq" href="contact.html">Request RFQ</a></div></article>`;
};
fetch('assets/data/product-manifest.json')
  .then((response) => response.json())
  .then(async (manifest) => {
    const container = document.getElementById('product-catalog-sections');
    if (!container) return;
    const sections = await Promise.all(Object.entries(manifest).map(async ([slug, category]) => {
      const checkedImages = await Promise.all((category.images || []).map(async (imageSrc) => ({
        imageSrc,
        exists: await imageExists(imageSrc),
      })));
      const images = checkedImages.filter((item) => item.exists).map((item) => item.imageSrc);
      const cards = images.map((imageSrc) => productCard(imageSrc, category)).join('');
      const keywordList = Array.isArray(category.keywords) ? category.keywords.map((keyword) => `<span>${escapeHtml(keyword)}</span>`).join('') : '';
      return `<section class="product-category-section" id="${escapeHtml(slug)}" aria-labelledby="${escapeHtml(slug)}-title"><h2 id="${escapeHtml(slug)}-title">${escapeHtml(category.title)}</h2><p class="product-category-description">${escapeHtml(category.description)}</p><div class="product-keyword-labels">${keywordList}</div><div class="product-catalog-grid">${cards || '<p class="product-category-description">Product images will be added after catalog upload.</p>'}</div><div class="actions section-actions"><a class="btn" href="contact.html">Request RFQ</a></div></section>`;
    }));
    container.innerHTML = sections.join('');
  });
</script>
'@

$productsHtml = @"
<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Products | ElexNova Magnetic Components by MiDEN Electronics</title><meta name="description" content="Folder-driven ElexNova product galleries from Guangzhou Miden Electronics. All images from all product folders render as SEO product cards."><link rel="canonical" href="$baseUrl/products.html"><link rel="stylesheet" href="assets/css/styles.css"></head>
<body>
$(Header '' $folderCategories)
<main><section class="page-hero"><p class="eyebrow">Products</p><h1>Folder-driven magnetic component product galleries</h1><p>Each product folder under <code>assets/images/products</code> becomes one product category section. The page reads the product manifest and loops through every folder and every image, with no first-image-only logic.</p></section><section class="section product-catalog" aria-labelledby="product-catalog-title"><div class="section-head"><p class="eyebrow">Product Image Library</p><h2 id="product-catalog-title">All product images by folder</h2><p>Every product card includes schema-friendly Product markup, clean mapped product titles, SEO ALT text and an RFQ entry.</p></div><div id="product-catalog-sections" class="product-catalog-sections"></div></section></main>
$(Footer '')
$productsScript
<script src="assets/js/main.js"></script>
</body></html>
"@
Set-Content -LiteralPath (Join-Path $siteRoot 'products.html') -Value $productsHtml -NoNewline -Encoding UTF8

function Get-Cards($category, [string]$prefix) {
  if (-not $category.images -or $category.images.Count -eq 0) {
    return '<p class="product-category-description">Product images will be added after catalog upload.</p>'
  }
  (($category.images | ForEach-Object {
    $imageSrc = [string]$_
    $productTitle = HtmlEncode $category.title
    $src = HtmlEncode ($prefix + $imageSrc)
    $alt = HtmlEncode (Get-SeoAlt $imageSrc $category.title $category.keywords)
    $catTitle = HtmlEncode $category.title
@"
<article class="product-card product-library-card" itemscope itemtype="https://schema.org/Product"><a class="product-library-card__link" href="$src" data-lightbox-image><img itemprop="image" src="$src" alt="$alt" loading="lazy"></a><div class="product-library-card__body"><span class="product-category-label">$catTitle</span><h3 itemprop="name">$productTitle</h3><p itemprop="description">High quality magnetic component</p><div class="product-keyword-labels"><span>inductor manufacturer</span><span>magnetic components supplier</span><span>power inductor factory</span><span>transformer supplier China</span></div><a class="btn product-library-card__rfq" href="../contact.html">Request RFQ</a></div></article>
"@
  }) -join "`n")
}

foreach ($category in $folderCategories) {
  $title = HtmlEncode $category.title
  $desc = HtmlEncode $category.description
  $seoIntro = HtmlEncode $category.seoIntro
  $keywordsText = HtmlEncode (($category.keywords | Select-Object -First 8) -join ', ')
  $keywordTags = (($category.keywords | ForEach-Object { '<span>' + (HtmlEncode $_) + '</span>' }) -join '')
  $relatedCategoryLinks = Get-RelatedCategoryLinks $category '../'
  $globalLinks = Get-GlobalInternalLinks '../'
  $cards = Get-Cards $category '../'
  $html = @"
<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>$title | Guangzhou Miden Electronics Magnetic Components</title><meta name="description" content="$title product gallery from Guangzhou Miden Electronics with RFQ support for magnetic components."><meta name="keywords" content="$keywordsText"><link rel="canonical" href="$baseUrl/$($category.url)"><link rel="stylesheet" href="../assets/css/styles.css"><script type="application/ld+json">{"@context":"https://schema.org","@graph":[{"@type":"CollectionPage","name":"$title","url":"$baseUrl/$($category.url)","about":"$title magnetic components","keywords":"$keywordsText"},{"@type":"BreadcrumbList","itemListElement":[{"@type":"ListItem","position":1,"name":"Home","item":"$baseUrl/index.html"},{"@type":"ListItem","position":2,"name":"Products","item":"$baseUrl/products.html"},{"@type":"ListItem","position":3,"name":"$title","item":"$baseUrl/$($category.url)"}]}]}</script></head>
<body data-product="$title" data-category="$title">
$(Header '../' $folderCategories)
<main><section class="page-hero"><nav class="breadcrumbs" aria-label="Breadcrumb"><a href="../index.html">Home</a><a href="../products.html">Products</a><span>$title</span></nav><p class="eyebrow">Product Category</p><h1>$title</h1><p>$seoIntro</p><div class="product-keyword-labels">$keywordTags</div><div class="actions"><a class="btn" href="../contact.html">Request RFQ / Get Quote</a><a class="btn secondary" href="https://wa.me/8619808253978" target="_blank" rel="noopener">WhatsApp</a></div><p class="rfq-note">Manufactured by MiDEN Electronics. Send drawings, samples or target specifications for quotation support.</p></section><section class="section product-catalog"><div class="section-head"><p class="eyebrow">Product Gallery</p><h2>$title product images</h2><p>All images in this product folder are rendered below. Every product image is included in the gallery.</p></div><div class="product-catalog-grid">$cards</div></section><section class="section product-case-links"><div class="section-head"><p class="eyebrow">Internal Product Links</p><h2>Related Magnetic Component Categories</h2><p>Browse other MiDEN Electronics product categories for comparison, sourcing and RFQ preparation.</p></div><div class="related-case-links">$relatedCategoryLinks$globalLinks</div></section></main>
$(Footer '../')
<script src="../assets/js/main.js"></script>
</body></html>
"@
  Set-Content -LiteralPath (Join-Path $productsRoot "$($category.slug).html") -Value $html -NoNewline -Encoding UTF8
}

$powerRedirectHtml = @"
<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Power Inductor Series | Redirect</title><meta name="robots" content="noindex,follow"><meta http-equiv="refresh" content="0; url=power-inductor.html"><link rel="canonical" href="$baseUrl/products/power-inductor.html"><link rel="stylesheet" href="../assets/css/styles.css"></head>
<body>
$(Header '../' $folderCategories)
<main><section class="page-hero"><p class="eyebrow">Redirect</p><h1>Power Inductor Series</h1><p>This page has moved to the canonical Power Inductor Series page.</p><div class="actions"><a class="btn" href="power-inductor.html">Open Power Inductor Series</a></div></section></main>
$(Footer '../')
<script>window.location.replace('power-inductor.html');</script><script src="../assets/js/main.js"></script>
</body></html>
"@
Set-Content -LiteralPath (Join-Path $productsRoot 'power-inductors.html') -Value $powerRedirectHtml -NoNewline -Encoding UTF8

$generatedProductFiles = @($folderCategories | ForEach-Object { "$($_.slug).html" }) + @('power-inductors.html')
$legacyProductFiles = Get-ChildItem -LiteralPath $productsRoot -File -Filter '*.html' |
  Where-Object { $generatedProductFiles -notcontains $_.Name }

foreach ($legacyFile in $legacyProductFiles) {
  $legacyTitle = HtmlEncode ((To-Title ([System.IO.Path]::GetFileNameWithoutExtension($legacyFile.Name))) + ' Redirect')
  $legacyRedirectHtml = @"
<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>$legacyTitle</title><meta name="robots" content="noindex,follow"><meta http-equiv="refresh" content="0; url=../products.html"><link rel="canonical" href="$baseUrl/products.html"><link rel="stylesheet" href="../assets/css/styles.css"></head>
<body>
$(Header '../' $folderCategories)
<main><section class="page-hero"><nav class="breadcrumbs" aria-label="Breadcrumb"><a href="../index.html">Home</a><span>Products</span></nav><p class="eyebrow">Redirect</p><h1>Products</h1><p>This legacy product page has been replaced by the automatic folder-driven product system.</p><div class="actions"><a class="btn" href="../products.html">Open Product Catalog</a></div></section></main>
$(Footer '../')
<script>window.location.replace('../products.html');</script><script src="../assets/js/main.js"></script>
</body></html>
"@
  Set-Content -LiteralPath $legacyFile.FullName -Value $legacyRedirectHtml -NoNewline -Encoding UTF8
}

$staticPages = @('index.html','products.html','about.html','applications.html','contact.html','factory.html','news.html','certificates.html','downloads.html')
$categoryPages = $folderCategories | ForEach-Object { $_.url }
$urls = @($staticPages + $categoryPages) | Select-Object -Unique
$today = Get-Date -Format 'yyyy-MM-dd'
$sitemapItems = (($urls | ForEach-Object {
@"
  <url>
    <loc>$baseUrl/$_</loc>
    <lastmod>$today</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.80</priority>
  </url>
"@
}) -join "`n")
$sitemap = @"
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
$sitemapItems
</urlset>
"@
Set-Content -LiteralPath (Join-Path $siteRoot 'sitemap.xml') -Value $sitemap -NoNewline -Encoding UTF8

Write-Output "Generated folder-driven manifest, products.html, category pages, and sitemap.xml for $($folderCategories.Count) product folders."
