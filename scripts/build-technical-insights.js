#!/usr/bin/env node
/**
 * Technical Insights builder (Elexnova / MiDEN news module).
 *
 * Source of truth: assets/data/technical-insights.json
 *
 * The builder is idempotent. It:
 *   1. upgrades every published /news/*.html article with SEO head tags,
 *      TechArticle + BreadcrumbList schema, a category/date meta bar, a
 *      table of contents, key takeaways, internal related-article links,
 *      related product links and the Contact Us / Request Quote / WhatsApp CTA;
 *   2. renders the Technical Insights hub twice - news.html (canonical hub,
 *      unchanged URL) and news/index.html (the /news/ mirror that points its
 *      canonical at news.html, so no redirect is needed);
 *   3. renders the RSS feed (news/feed.xml) and the machine readable content
 *      index (news/articles.json) used by automation such as n8n.
 *
 * Article URLs, canonicals of existing pages and the folder structure are
 * never rewritten. Drafts (status: "draft") are generated as noindex pages
 * and are excluded from the hub, sitemap, feed and articles.json.
 *
 * Usage: node scripts/build-technical-insights.js
 */

const fs = require('fs');
const path = require('path');

const siteRoot = path.resolve(__dirname, '..');
const newsRoot = path.join(siteRoot, 'news');
const dataPath = path.join(siteRoot, 'assets', 'data', 'technical-insights.json');
const baseUrl = 'https://elexnova.com';
const hubCanonical = `${baseUrl}/news.html`;
const brandName = 'MiDEN Technical Insights';
const websiteName = 'MiDEN Electronics';
const whatsappUrl = 'https://wa.me/8619808253978';
const emailUrl = 'https://mail.google.com/mail/?view=cm&fs=1&to=selinaliu3978%40gmail.com&su=RFQ%20from%20Website&body=Hi%2C%20I%20am%20interested%20in%20your%20magnetic%20components.';

const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));

const MARKERS = {
  head: ['<!-- technical-insights:head:start -->', '<!-- technical-insights:head:end -->'],
  meta: ['<!-- technical-insights:meta:start -->', '<!-- technical-insights:meta:end -->'],
  toc: ['<!-- technical-insights:toc:start -->', '<!-- technical-insights:toc:end -->'],
  takeaways: ['<!-- technical-insights:takeaways:start -->', '<!-- technical-insights:takeaways:end -->'],
  tail: ['<!-- technical-insights:tail:start -->', '<!-- technical-insights:tail:end -->']
};

const categorySlugs = new Map(data.categories.map((category) => [category.name, category.slug]));
const isDraft = (article) => article.status === 'draft';

const articles = data.articles
  .map((article) => ({
    ...article,
    status: article.status === 'draft' ? 'draft' : 'published',
    categorySlug: categorySlugs.get(article.category),
    file: `${article.slug}.html`
  }))
  .sort((a, b) => (a.date === b.date ? a.title.localeCompare(b.title) : b.date.localeCompare(a.date)));

const articleBySlug = new Map(articles.map((article) => [article.slug, article]));
const liveArticles = articles.filter((article) => !isDraft(article));
const draftArticles = articles.filter(isDraft);

if (articles.some((article) => !article.categorySlug)) {
  throw new Error('Every article must use one of the defined categories.');
}

const escapeHtml = (value) => String(value)
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;');

const stripTags = (value) => String(value).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

const formatDate = (iso) => new Date(`${iso}T00:00:00Z`)
  .toLocaleDateString('en-US', { timeZone: 'UTC', year: 'numeric', month: 'long', day: 'numeric' });

const readingTime = (html) => {
  const text = html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ');
  const words = text.split(/\s+/).filter(Boolean).length;
  return Math.max(4, Math.round(words / 200));
};

// Generated fragments are wrapped in marker comments. Removal also absorbs one
// newline on each side so repeated builds are byte-for-byte identical.
const removeSegments = (html, [start, end]) => {
  let output = html;
  for (;;) {
    const match = output.indexOf(start);
    if (match === -1) return output;
    const to = output.indexOf(end, match);
    if (to === -1) return output.slice(0, match);
    let from = match;
    let stop = to + end.length;
    if (output[from - 1] === '\n') from -= 1;
    if (output[stop] === '\n') stop += 1;
    output = output.slice(0, from) + output.slice(stop);
  }
};

const stripGeneratedBlocks = (html) => {
  let output = html;
  Object.values(MARKERS).forEach((marker) => {
    output = removeSegments(output, marker);
  });
  return output;
};

const writeFile = (filePath, content) => {
  fs.writeFileSync(filePath, content, 'utf8');
  return path.relative(siteRoot, filePath).split(path.sep).join('/');
};

// Reading time is measured on the article body only, so the generated SEO
// blocks never change the value between builds.
articles.forEach((article) => {
  const articlePath = path.join(newsRoot, article.file);
  if (!fs.existsSync(articlePath)) {
    throw new Error(`Missing article file for slug "${article.slug}"`);
  }
  article.minutes = readingTime(stripGeneratedBlocks(fs.readFileSync(articlePath, 'utf8')));
});

// Every page on the site ends its title tag with the "| MiDEN Electronics"
// suffix. Existing article pages keep the title tag they already have and are
// never rewritten, so this is only a fallback for pages without a title tag.
const defaultSeoTitle = (article) => article.seoTitle || `${article.shortTitle || article.title} | MiDEN Electronics`;
const articleUrl = (article) => `${baseUrl}/news/${article.file}`;
const hubArticleHref = (article, articlePrefix) => `${articlePrefix}${article.file}`;

/* ------------------------------------------------------------------ */
/* Article page fragments                                              */
/* ------------------------------------------------------------------ */

const buildArticleHead = (article, description, seoTitle) => {
  const robots = isDraft(article) ? 'noindex,follow' : 'index,follow,max-image-preview:large';
  return `
${MARKERS.head[0]}
<meta name="keywords" content="${escapeHtml(article.keywords.join(', '))}">
<meta name="robots" content="${robots}">
<meta property="og:type" content="article">
<meta property="og:site_name" content="${escapeHtml(websiteName)}">
<meta property="og:title" content="${escapeHtml(seoTitle)}">
<meta property="og:description" content="${escapeHtml(description)}">
<meta property="og:url" content="${articleUrl(article)}">
<meta property="og:locale" content="en_US">
<meta property="article:section" content="${escapeHtml(article.category)}">
<meta property="article:published_time" content="${article.date}">
<meta property="article:modified_time" content="${article.updated || article.date}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${escapeHtml(seoTitle)}">
<meta name="twitter:description" content="${escapeHtml(description)}">
${isDraft(article) ? '' : `<link rel="alternate" type="application/rss+xml" title="${escapeHtml(brandName)} RSS" href="feed.xml">\n`}<link rel="stylesheet" href="../assets/css/technical-insights.css">
${MARKERS.head[1]}`;
};

const buildArticleSchema = (article, description) => {
  const url = articleUrl(article);
  const schema = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'TechArticle',
        '@id': `${url}#article`,
        headline: article.title,
        description,
        keywords: article.keywords.join(', '),
        articleSection: article.category,
        inLanguage: 'en',
        datePublished: article.date,
        dateModified: article.updated || article.date,
        url,
        author: { '@type': 'Organization', name: article.author || 'MiDEN Engineering Team', url: `${baseUrl}/about.html` },
        publisher: { '@type': 'Organization', name: 'Guangzhou Miden Electronics Co., Ltd', url: `${baseUrl}/` },
        mainEntityOfPage: { '@type': 'WebPage', '@id': url },
        isPartOf: { '@type': 'Blog', '@id': `${baseUrl}/news.html#blog`, name: brandName, url: hubCanonical }
      },
      {
        '@type': 'BreadcrumbList',
        '@id': `${url}#breadcrumb`,
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: `${baseUrl}/index.html` },
          { '@type': 'ListItem', position: 2, name: 'Technical Insights', item: hubCanonical },
          { '@type': 'ListItem', position: 3, name: article.title, item: url }
        ]
      }
    ]
  };
  return `<script type="application/ld+json">${JSON.stringify(schema)}</script>`;
};

const buildArticleMetaBar = (article) => `
${MARKERS.meta[0]}
<div class="ti-article-meta">
<a class="ti-badge" data-category="${article.categorySlug}" href="../news.html#${article.categorySlug}">${escapeHtml(article.category)}</a>
<time datetime="${article.date}">Published ${formatDate(article.date)}</time>
<span>${article.minutes} min read</span>
${isDraft(article) ? '<span class="ti-draft">Draft - not published</span>\n' : ''}</div>
${MARKERS.meta[1]}`;

const buildArticleTakeaways = (article) => {
  if (!article.takeaways || !article.takeaways.length) return '';
  return `
${MARKERS.takeaways[0]}
<section class="ti-takeaways" aria-label="Key takeaways">
<p class="eyebrow">Key Takeaways</p>
<h2>What this article covers</h2>
<ul>
${article.takeaways.map((item) => `<li>${escapeHtml(item)}</li>`).join('\n')}
</ul>
</section>
${MARKERS.takeaways[1]}`;
};

const buildTableOfContents = (headings) => {
  if (headings.length < 3) return '';
  return `
${MARKERS.toc[0]}
<nav class="ti-toc" aria-label="On this page">
<p class="eyebrow">On This Page</p>
<ol>
${headings.map((heading) => `<li><a href="#${heading.id}">${escapeHtml(heading.text)}</a></li>`).join('\n')}
</ol>
</nav>
${MARKERS.toc[1]}`;
};

const buildArticleTail = (article) => {
  const related = (article.related || [])
    .map((slug) => articleBySlug.get(slug))
    .filter((item) => item && !isDraft(item))
    .map((item) => `<a href="${item.file}">
<strong>${escapeHtml(item.title)}</strong>
<span class="ti-card-summary">${escapeHtml(item.summary)}</span>
<span class="ti-badge" data-category="${item.categorySlug}">${escapeHtml(item.category)}</span>
</a>`)
    .join('\n');

  const productLinks = (article.products || [])
    .map(([label, href]) => `<a href="${href}">${escapeHtml(label)}</a>`)
    .concat((article.internal || []).map(([label, href]) => `<a href="${href}">${escapeHtml(label)}</a>`))
    .concat(['<a href="../contact.html">Contact Us</a>', '<a href="../applications.html">Applications</a>'])
    .join('\n');

  return `
${MARKERS.tail[0]}
<section class="ti-related">
<p class="eyebrow">Related Technical Insights</p>
<h2>Continue reading</h2>
<div class="ti-related-grid">
${related}
</div>
</section>
<section class="ti-links">
<p class="eyebrow">Related MiDEN Resources</p>
<h2>Products and pages related to this article</h2>
<div class="ti-product-links">
${productLinks}
</div>
<div class="case-keywords ti-keywords">
${article.keywords.map((keyword) => `<span>${escapeHtml(keyword)}</span>`).join('')}
</div>
</section>
<section class="ti-cta">
<p class="eyebrow">Request engineering support</p>
<h2>Talk to a magnetic component engineer</h2>
<p>Send your drawing, target inductance, current, frequency, size limit and application details. MiDEN reviews selection, samples and quotation for standard and custom magnetic components.</p>
<div class="case-conversion-actions">
<a class="btn" href="../contact.html">Contact Us</a>
<a class="btn secondary" href="../contact.html#inquiry-form">Request Quote</a>
<a class="btn secondary" href="${whatsappUrl}" target="_blank" rel="noopener">WhatsApp</a>
</div>
</section>
${MARKERS.tail[1]}`;
};

const slugify = (value) => stripTags(value)
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '')
  .slice(0, 60) || 'section';

const addHeadingAnchors = (html) => {
  const used = new Set();
  return html.replace(/<h2(\s[^>]*)?>([\s\S]*?)<\/h2>/g, (match, attrs = '', text) => {
    const existing = /id="([^"]+)"/.exec(attrs || '');
    if (existing) {
      used.add(existing[1]);
      return match;
    }
    let id = slugify(text);
    let candidate = id;
    let counter = 2;
    while (used.has(candidate)) {
      candidate = `${id}-${counter}`;
      counter += 1;
    }
    used.add(candidate);
    return `<h2${attrs || ''} id="${candidate}">${text}</h2>`;
  });
};

const collectHeadings = (html) => {
  const headings = [];
  html.replace(/<h2[^>]*\bid="([^"]+)"[^>]*>([\s\S]*?)<\/h2>/g, (match, id, text) => {
    headings.push({ id, text: stripTags(text) });
    return match;
  });
  return headings;
};

/* ------------------------------------------------------------------ */
/* Article page build                                                  */
/* ------------------------------------------------------------------ */

const upgradeArticle = (article) => {
  const filePath = path.join(newsRoot, article.file);
  let html = stripGeneratedBlocks(fs.readFileSync(filePath, 'utf8'));

  html = html
    .replace(/<section class="case-seo-system growth-lead-system">[\s\S]*?<\/section>/g, '')
    .replace(/<section class="case-seo-system">[\s\S]*?<\/section>/g, '')
    .replace(/<div class="article-cta">[\s\S]*?<\/div><\/div>/g, '')
    .replace(/<meta name="keywords"[^>]*>/g, '')
    .replace(/<link rel="stylesheet" href="\.\.\/assets\/css\/technical-insights\.css">/g, '');

  const descriptionMatch = html.match(/<meta name="description" content="([^"]*)">/);
  const titleMatch = html.match(/<title>([\s\S]*?)<\/title>/);
  if (!descriptionMatch) throw new Error(`Missing meta description in ${article.file}`);
  if (!titleMatch) throw new Error(`Missing title tag in ${article.file}`);

  const description = descriptionMatch[1];
  // The title tag of the page itself is authoritative: it keeps its existing
  // wording and suffix (for example "| MiDEN Electronics"). Only the Open Graph
  // and Twitter titles are derived from it.
  const seoTitle = stripTags(titleMatch[1]) || defaultSeoTitle(article);

  // Article stylesheet is added at the very end of <head> so the module rules
  // always load after the global stylesheet.
  html = html.replace('</head>', `${buildArticleHead(article, description, seoTitle)}\n</head>`);
  html = html.replace(/<script type="application\/ld\+json">[\s\S]*?<\/script>/, buildArticleSchema(article, description));

  // Internal links keep pointing at the canonical hub URL (news.html). Articles
  // built at different times use a linked or a plain breadcrumb, so both forms
  // are normalised to one linked "Technical Insights" crumb.
  html = html.replace(/(<nav class="breadcrumbs">[\s\S]*?<\/nav>)/, (block) => block
    .replace(/<span>News<\/span>/, '<a href="../news.html">Technical Insights</a>')
    .replace(/<a href="\.\/">Technical Insights<\/a>/, '<a href="../news.html">Technical Insights</a>')
    .replace(/<a href="\.\.\/news\.html">News<\/a>/, '<a href="../news.html">Technical Insights</a>'));
  html = html.replace(/<h3>News<\/h3>\s*<a href="\.\.\/news\.html">News Center<\/a>/, '<h3>Technical Insights</h3><a href="../news.html">All Articles</a><a href="feed.xml">RSS Feed</a>');
  html = html.replace(/<p class="eyebrow">MiDEN Engineering Guide<\/p>/, '<p class="eyebrow">MiDEN Technical Insights</p>');

  const breadcrumbs = html.match(/<nav class="breadcrumbs">[\s\S]*?<\/nav>/);
  if (!breadcrumbs) throw new Error(`Missing breadcrumbs in ${article.file}`);

  const articleClose = html.lastIndexOf('</article>');
  if (articleClose === -1) throw new Error(`Missing article container in ${article.file}`);

  // Anchor ids and the table of contents only cover the article body, so the
  // footer headings are never listed.
  const breadcrumbEnd = html.indexOf(breadcrumbs[0]) + breadcrumbs[0].length;
  const leading = html.slice(0, breadcrumbEnd);
  const body = addHeadingAnchors(html.slice(breadcrumbEnd, articleClose));
  const trailing = html.slice(articleClose);

  const toc = buildTableOfContents(collectHeadings(body));
  const blocks = [buildArticleMetaBar(article), buildArticleTakeaways(article), toc]
    .filter(Boolean)
    .join('\n');

  html = `${leading}${blocks}\n${body}${buildArticleTail(article)}${trailing}`;

  return writeFile(filePath, html);
};

/* ------------------------------------------------------------------ */
/* Hub page                                                            */
/* ------------------------------------------------------------------ */

const navScriptSource = (() => {
  const samplePath = path.join(
    newsRoot,
    `${(liveArticles.find((article) => article.slug !== 'miden-factory-capability-update') || liveArticles[0]).slug}.html`
  );
  const sampleHtml = fs.readFileSync(samplePath, 'utf8');
  const match = sampleHtml.match(/<script>\s*\(\(\) => \{[\s\S]*?\}\)\(\);\s*<\/script>/);
  if (!match) {
    throw new Error('Could not locate the shared navigation include script in the sample article.');
  }
  return match[0];
})();

const buildHubCard = (article, articlePrefix) => `<article class="news-card ti-card" data-category="${article.categorySlug}">
<a href="${hubArticleHref(article, articlePrefix)}">
<p class="ti-card-meta"><span class="ti-badge" data-category="${article.categorySlug}">${escapeHtml(article.category)}</span><time datetime="${article.date}">${formatDate(article.date)}</time></p>
<h3>${escapeHtml(article.title)}</h3>
<p class="ti-card-summary">${escapeHtml(article.summary)}</p>
<div class="ti-card-footer"><span>${article.minutes} min read</span><span class="ti-readmore">Read more &rarr;</span></div>
</a>
</article>`;

const buildHubSchema = () => {
  const schema = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Blog',
        '@id': `${baseUrl}/news.html#blog`,
        name: brandName,
        description: data.hub.description,
        url: hubCanonical,
        inLanguage: 'en',
        keywords: data.hub.keywords.join(', '),
        publisher: { '@type': 'Organization', name: 'Guangzhou Miden Electronics Co., Ltd', url: `${baseUrl}/` },
        blogPost: liveArticles.map((article) => ({
          '@type': 'BlogPosting',
          headline: article.title,
          description: article.summary,
          url: articleUrl(article),
          datePublished: article.date,
          articleSection: article.category
        }))
      },
      {
        '@type': 'CollectionPage',
        '@id': `${baseUrl}/news.html#webpage`,
        url: hubCanonical,
        name: data.hub.seoTitle,
        description: data.hub.description,
        isPartOf: { '@id': `${baseUrl}/news.html#blog` }
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: `${baseUrl}/index.html` },
          { '@type': 'ListItem', position: 2, name: 'Technical Insights', item: hubCanonical }
        ]
      }
    ]
  };
  return `<script type="application/ld+json">${JSON.stringify(schema)}</script>`;
};

const renderHub = ({ prefix, articlePrefix, canonical, filePath, mirrorNote }) => {
  const filterButtons = data.categories
    .map((category) => {
      const count = liveArticles.filter((article) => article.categorySlug === category.slug).length;
      return `<button class="ti-filter" type="button" data-filter="${category.slug}" aria-pressed="false">${escapeHtml(category.name)} (${count})</button>`;
    })
    .join('\n');

  const categoryCards = data.categories
    .map((category) => {
      const count = liveArticles.filter((article) => article.categorySlug === category.slug).length;
      return `<a class="ti-category-card" href="#${category.slug}" data-filter="${category.slug}">
<h3>${escapeHtml(category.name)}</h3>
<p>${escapeHtml(category.description)}</p>
<span>${count} article${count === 1 ? '' : 's'} &rarr;</span>
</a>`;
    })
    .join('\n');

  const hub = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(data.hub.seoTitle)}</title>
<meta name="description" content="${escapeHtml(data.hub.description)}">
<meta name="keywords" content="${escapeHtml(data.hub.keywords.join(', '))}">
<meta name="robots" content="index,follow,max-image-preview:large">
<link rel="canonical" href="${canonical}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="${escapeHtml(websiteName)}">
<meta property="og:title" content="${escapeHtml(data.hub.seoTitle)}">
<meta property="og:description" content="${escapeHtml(data.hub.description)}">
<meta property="og:url" content="${canonical}">
<meta property="og:locale" content="en_US">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${escapeHtml(data.hub.seoTitle)}">
<meta name="twitter:description" content="${escapeHtml(data.hub.description)}">
<link rel="alternate" type="application/rss+xml" title="${escapeHtml(brandName)} RSS" href="${prefix}news/feed.xml">
<link rel="stylesheet" href="${prefix}assets/css/styles.css">
<link rel="stylesheet" href="${prefix}assets/css/technical-insights.css">
${buildHubSchema()}
</head>
<body>
<!-- NAVIGATION INCLUDE -->
<div id="site-navbar"></div>
${navScriptSource}
<main>
<section class="page-hero">
<p class="eyebrow">${escapeHtml(data.hub.eyebrow)}</p>
<h1>${escapeHtml(data.hub.h1)}</h1>
<p>${escapeHtml(data.hub.intro)}</p>
<div class="ti-hero-actions">
<a class="btn" href="${prefix}contact.html#inquiry-form">Request Quote</a>
<a class="btn secondary" href="${whatsappUrl}" target="_blank" rel="noopener">WhatsApp</a>
<a class="btn secondary" href="${prefix}products.html">Browse Magnetic Components</a>
</div>
</section>
<section class="section">
<div class="ti-section-head">
<p class="eyebrow">Content Center</p>
<h2>Latest technical insights</h2>
<p>Inductor technology, high frequency transformer design, EMI solutions, power supply design knowledge and application analysis. Filter by category or browse the full library.</p>
</div>
<div class="ti-toolbar" role="group" aria-label="Filter technical insights by category">
<span class="ti-toolbar-label">Filter</span>
<button class="ti-filter" type="button" data-filter="all" aria-pressed="true">All (${liveArticles.length})</button>
${filterButtons}
<span class="ti-count" id="tiCount">${liveArticles.length} articles</span>
</div>
<p class="ti-empty" id="tiEmpty">No articles have been published in this category yet. Browse all technical insights or contact us with your question.</p>
<div class="news-grid" id="tiGrid">
${liveArticles.map((article) => buildHubCard(article, articlePrefix)).join('\n')}
</div>
</section>
<section class="section muted">
<div class="ti-section-head">
<p class="eyebrow">Categories</p>
<h2>Explore by category</h2>
<p>Four editorial tracks keep the content center organized for engineers, buyers and returning readers.</p>
</div>
<div class="ti-category-grid">
${categoryCards}
</div>
</section>
<section class="section">
<div class="ti-hub-cta">
<div>
<p class="eyebrow">Get Technical Support</p>
<h2>Need help choosing the right magnetic component?</h2>
<p>Send drawings, target inductance, current, frequency, size limits and application details. Our engineers reply with selection advice and quotation support.</p>
</div>
<div class="case-conversion-actions">
<a class="btn" href="${prefix}contact.html">Contact Us</a>
<a class="btn secondary" href="${prefix}contact.html#inquiry-form">Request Quote</a>
<a class="btn secondary" href="${whatsappUrl}" target="_blank" rel="noopener">WhatsApp</a>
</div>
</div>
</section>
</main>
<footer class="site-footer">
<div class="footer-grid">
<div><h2>MiDEN</h2><p>Manufacturer of inductors, coils and high frequency transformers.</p></div>
<div><h3>Technical Insights</h3><a href="${prefix}news.html">All Articles</a><a href="${prefix}news/feed.xml">RSS Feed</a><a href="${prefix}products.html">Products</a><a href="${prefix}applications.html">Applications</a><a href="${prefix}factory.html">Factory</a></div>
<div><h3>Contact</h3><p>Ruby Liu</p><p>Email: <a href="${emailUrl}" target="_blank" rel="noopener" title="Send Email">selinaliu3978@gmail.com</a></p></div>
</div>
<div class="footer-contact-actions">
<a href="${prefix}contact.html">Contact Us</a>
<a href="${prefix}contact.html#inquiry-form">Request Quote</a>
<a href="${whatsappUrl}" target="_blank" rel="noopener">WhatsApp</a>
</div>
</footer>
<div class="floating-contact"><a href="${whatsappUrl}" target="_blank" rel="noopener">WhatsApp</a></div>
<script src="${prefix}assets/js/miden-interaction-engine.js"></script><script src="${prefix}assets/js/miden-ai-quotation.js"></script><script src="${prefix}assets/js/miden-ai-engine.js"></script><script src="${prefix}assets/js/main.js"></script><script src="/assets/js/rfq-engine.js"></script>
<script>
(() => {
  const cards = Array.from(document.querySelectorAll('#tiGrid .ti-card'));
  const buttons = Array.from(document.querySelectorAll('.ti-filter'));
  const count = document.getElementById('tiCount');
  const empty = document.getElementById('tiEmpty');
  const apply = (value, pushHash) => {
    let visible = 0;
    cards.forEach((card) => {
      const match = value === 'all' || card.dataset.category === value;
      card.hidden = !match;
      if (match) visible += 1;
    });
    buttons.forEach((button) => button.setAttribute('aria-pressed', String(button.dataset.filter === value)));
    count.textContent = visible === 1 ? '1 article' : visible + ' articles';
    empty.classList.toggle('is-visible', visible === 0);
    if (pushHash) {
      history.replaceState(null, '', value === 'all' ? window.location.pathname : '#' + value);
    }
  };
  document.querySelectorAll('[data-filter]').forEach((element) => {
    element.addEventListener('click', (event) => {
      event.preventDefault();
      apply(element.dataset.filter, true);
    });
  });
  const initial = window.location.hash.replace('#', '');
  apply(buttons.some((button) => button.dataset.filter === initial) ? initial : 'all', false);
})();
</script>
</body>
</html>
`;

  return writeFile(filePath, hub);
};

/* ------------------------------------------------------------------ */
/* Machine readable outputs                                            */
/* ------------------------------------------------------------------ */

const buildFeed = () => {
  const items = liveArticles.map((article) => `    <item>
      <title>${escapeHtml(article.title)}</title>
      <link>${articleUrl(article)}</link>
      <guid isPermaLink="true">${articleUrl(article)}</guid>
      <category>${escapeHtml(article.category)}</category>
      <pubDate>${new Date(`${article.date}T00:00:00Z`).toUTCString()}</pubDate>
      <description>${escapeHtml(article.summary)}</description>
    </item>`).join('\n');

  const feed = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapeHtml(brandName)}</title>
    <link>${hubCanonical}</link>
    <atom:link href="${baseUrl}/news/feed.xml" rel="self" type="application/rss+xml"/>
    <description>${escapeHtml(data.hub.description)}</description>
    <language>en</language>
    <lastBuildDate>${new Date(`${liveArticles[0].date}T00:00:00Z`).toUTCString()}</lastBuildDate>
${items}
  </channel>
</rss>
`;

  return writeFile(path.join(newsRoot, 'feed.xml'), feed);
};

const buildArticlesJson = () => {
  const payload = {
    generated: new Date().toISOString().slice(0, 10),
    hub: { url: hubCanonical, mirror: `${baseUrl}/news/`, title: data.hub.seoTitle, h1: data.hub.h1 },
    categories: data.categories.map((category) => ({
      name: category.name,
      slug: category.slug,
      description: category.description,
      count: liveArticles.filter((article) => article.categorySlug === category.slug).length
    })),
    count: liveArticles.length,
    articles: liveArticles.map((article) => ({
      slug: article.slug,
      url: articleUrl(article),
      title: article.title,
      summary: article.summary,
      date: article.date,
      updated: article.updated || article.date,
      category: article.category,
      categorySlug: article.categorySlug,
      keywords: article.keywords,
      readingMinutes: article.minutes
    }))
  };
  return writeFile(path.join(newsRoot, 'articles.json'), `${JSON.stringify(payload, null, 2)}\n`);
};

/* ------------------------------------------------------------------ */

const changed = [
  ...articles.map(upgradeArticle),
  renderHub({
    prefix: '',
    articlePrefix: 'news/',
    canonical: hubCanonical,
    filePath: path.join(siteRoot, 'news.html')
  }),
  renderHub({
    prefix: '../',
    articlePrefix: '',
    canonical: hubCanonical,
    filePath: path.join(newsRoot, 'index.html')
  }),
  buildFeed(),
  buildArticlesJson()
];

console.log(`Technical Insights build complete: ${liveArticles.length} published, ${draftArticles.length} draft.`);
console.log(changed.map((file) => ` - ${file}`).join('\n'));