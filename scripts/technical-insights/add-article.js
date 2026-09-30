#!/usr/bin/env node
/**
 * Technical Insights publishing endpoint for automation (n8n, CI, manual use).
 *
 * Reads one article payload (see payload.schema.json), validates it, writes the
 * article page from article-template.html, registers the article in
 * assets/data/technical-insights.json and then rebuilds the hub, the RSS feed,
 * the machine readable index and the sitemap.
 *
 * Usage:
 *   node scripts/technical-insights/add-article.js payload.json
 *   node scripts/technical-insights/add-article.js payload.json --draft
 *   node scripts/technical-insights/add-article.js - < payload.json
 *   node scripts/technical-insights/add-article.js payload.json --dry-run
 *   node scripts/technical-insights/add-article.js payload.json --force
 *   node scripts/technical-insights/add-article.js payload.json --no-build
 *
 * Flags:
 *   --draft      force status=draft (noindex page, hidden from all listings)
 *   --dry-run    validate and report only, write nothing
 *   --force      replace an existing article with the same slug
 *   --no-build   skip hub / feed / index / sitemap regeneration
 *   --json       print a single machine readable JSON result (for n8n)
 *
 * Exit codes: 0 success, 1 validation or write error.
 */

const fs = require('fs');
const path = require('path');

const siteRoot = path.resolve(__dirname, '..', '..');
const newsRoot = path.join(siteRoot, 'news');
const dataPath = path.join(siteRoot, 'assets', 'data', 'technical-insights.json');
const templatePath = path.join(__dirname, 'article-template.html');
const schemaPath = path.join(__dirname, 'payload.schema.json');
const baseUrl = 'https://elexnova.com';

const argv = process.argv.slice(2);
const flags = new Set(argv.filter((arg) => arg.startsWith('--')));
const inputs = argv.filter((arg) => !arg.startsWith('--'));
const input = inputs[0];
const jsonOutput = flags.has('--json');
const dryRun = flags.has('--dry-run');
const force = flags.has('--force');
const skipBuild = flags.has('--no-build');

const log = (message) => {
  if (!jsonOutput) console.log(message);
};

const fail = (messages) => {
  const list = Array.isArray(messages) ? messages : [messages];
  if (jsonOutput) {
    console.log(JSON.stringify({ ok: false, errors: list }, null, 2));
  } else {
    console.error('Payload rejected:');
    list.forEach((message) => console.error(` - ${message}`));
  }
  process.exit(1);
};

if (!input) {
  fail('Usage: node scripts/technical-insights/add-article.js <payload.json|-> [--draft] [--dry-run] [--force] [--no-build] [--json]');
}

const readPayload = () => {
  try {
    const raw = input === '-' ? fs.readFileSync(0, 'utf8') : fs.readFileSync(path.resolve(input), 'utf8');
    return JSON.parse(raw);
  } catch (error) {
    return fail(`Could not read or parse the payload JSON: ${error.message}`);
  }
};

const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf8'));
const database = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
const allowedCategories = database.categories.map((category) => category.name);
const knownSlugs = new Set(database.articles.map((article) => article.slug));

const payload = readPayload();
const errors = [];
const warnings = [];

const isFilledString = (value) => typeof value === 'string' && value.trim().length > 0;

if (!isFilledString(payload.slug) || !schema.properties.slug.pattern.replace(/^\^|\$$/g, '') || !new RegExp(schema.properties.slug.pattern).test(payload.slug || '')) {
  errors.push('slug must use lowercase letters, numbers and hyphens only, for example "inductor-thermal-testing".');
}
if (typeof payload.slug === 'string' && (payload.slug.length < 3 || payload.slug.length > 80)) {
  errors.push('slug must be between 3 and 80 characters.');
}
if (!isFilledString(payload.title) || payload.title.length < 10 || payload.title.length > 120) {
  errors.push('title is required and must be 10 to 120 characters.');
}
if (!isFilledString(payload.summary) || payload.summary.length < 40 || payload.summary.length > 320) {
  errors.push('summary is required and must be 40 to 320 characters.');
}
if (!isFilledString(payload.body) || payload.body.length < 600) {
  errors.push('body is required and must contain at least 600 characters of HTML.');
}
if (isFilledString(payload.body)) {
  if ((payload.body.match(/<h2[\s>]/g) || []).length < 2) {
    errors.push('body must contain at least two <h2> sections so the table of contents can be generated.');
  }
  if (/<(html|head|body)\b/i.test(payload.body)) {
    errors.push('body must be a fragment (h2/p/ul/table markup), not a complete HTML document.');
  }
  if (payload.body.includes('technical-insights:')) {
    errors.push('body must not contain technical-insights marker comments, they are managed by the builder.');
  }
}
if (!isFilledString(payload.date) || !/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(payload.date)) {
  errors.push('date is required in YYYY-MM-DD format.');
}
if (payload.updated && !/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(payload.updated)) {
  errors.push('updated must use YYYY-MM-DD format when provided.');
}
if (!allowedCategories.includes(payload.category)) {
  errors.push(`category must be one of: ${allowedCategories.join(', ')}.`);
}
if (!Array.isArray(payload.keywords) || payload.keywords.length < 3 || payload.keywords.length > 12) {
  errors.push('keywords must be an array with 3 to 12 entries.');
} else if (payload.keywords.some((keyword) => !isFilledString(keyword) || keyword.length > 60)) {
  errors.push('every keyword must be a non-empty string of 60 characters or less.');
}
if (payload.takeaways && (!Array.isArray(payload.takeaways) || payload.takeaways.length < 3 || payload.takeaways.length > 6)) {
  errors.push('takeaways must contain 3 to 6 bullet strings when provided.');
}
if (payload.shortTitle && payload.shortTitle.length > 60) {
  errors.push('shortTitle must be 60 characters or less.');
}
if (payload.status && !['published', 'draft'].includes(payload.status)) {
  errors.push('status must be either "published" or "draft".');
}
['products', 'internal'].forEach((field) => {
  if (!payload[field]) return;
  if (!Array.isArray(payload[field]) || payload[field].some((pair) => !Array.isArray(pair) || pair.length !== 2 || !isFilledString(pair[0]) || !isFilledString(pair[1]))) {
    errors.push(`${field} must be an array of [label, href] pairs.`);
  }
});
if (payload.related) {
  if (!Array.isArray(payload.related)) {
    errors.push('related must be an array of article slugs.');
  } else {
    payload.related.forEach((slug) => {
      if (!knownSlugs.has(slug) && slug !== payload.slug) warnings.push(`related slug "${slug}" is not published yet and will be skipped.`);
    });
  }
}
if (knownSlugs.has(payload.slug)) {
  if (force) warnings.push(`slug "${payload.slug}" already exists and will be replaced (--force).`);
  else errors.push(`slug "${payload.slug}" already exists. Use --force to replace it.`);
}
if (errors.length) fail(errors);

const status = flags.has('--draft') ? 'draft' : (payload.status || 'published');
const canonical = `${baseUrl}/news/${payload.slug}.html`;
const lead = isFilledString(payload.lead) ? (payload.lead.trim().startsWith('<') ? payload.lead.trim() : `<p>${payload.lead.trim()}</p>`) : '';

const entry = {
  slug: payload.slug,
  ...(payload.shortTitle ? { shortTitle: payload.shortTitle } : {}),
  title: payload.title,
  summary: payload.summary,
  date: payload.date,
  ...(payload.updated ? { updated: payload.updated } : {}),
  ...(payload.author ? { author: payload.author } : {}),
  category: payload.category,
  keywords: payload.keywords,
  ...(payload.takeaways ? { takeaways: payload.takeaways } : {}),
  ...(payload.products ? { products: payload.products } : {}),
  ...(payload.internal ? { internal: payload.internal } : {}),
  ...(payload.related ? { related: payload.related.filter((slug) => knownSlugs.has(slug)) } : {}),
  ...(status === 'draft' ? { status: 'draft' } : {})
};

const articleFile = path.join(newsRoot, `${payload.slug}.html`);
const template = fs.readFileSync(templatePath, 'utf8');
// The <h1> keeps the full editorial title, the <title> tag uses the short
// stem when one is supplied and always keeps the site brand suffix.
const titleTag = `${payload.shortTitle || payload.title} | MiDEN Electronics`;
const page = template
  .replace(/\{\{TITLE_TAG\}\}/g, titleTag)
  .replace(/\{\{H1\}\}/g, payload.title)
  .replace(/\{\{DESCRIPTION\}\}/g, payload.summary)
  .replace(/\{\{CANONICAL\}\}/g, canonical)
  .replace(/\{\{DATE\}\}/g, payload.date)
  .replace('{{LEAD}}', lead)
  .replace('{{BODY}}', payload.body.trim());

if (dryRun) {
  const result = { ok: true, dryRun: true, slug: entry.slug, status, url: canonical, file: `news/${payload.slug}.html`, warnings };
  if (jsonOutput) console.log(JSON.stringify(result, null, 2));
  else {
    log(`Validation passed for "${payload.title}".`);
    warnings.forEach((warning) => log(` warning: ${warning}`));
    log('Dry run: nothing was written.');
  }
  process.exit(0);
}

fs.mkdirSync(newsRoot, { recursive: true });
fs.writeFileSync(articleFile, page, 'utf8');

const existingIndex = database.articles.findIndex((article) => article.slug === entry.slug);
if (existingIndex === -1) database.articles.push(entry);
else database.articles[existingIndex] = entry;

const ordered = {
  hub: database.hub,
  categories: database.categories,
  articles: database.articles
};
fs.writeFileSync(dataPath, `${JSON.stringify(ordered, null, 2)}\n`, 'utf8');

let built = false;
if (!skipBuild) {
  require(path.join(siteRoot, 'scripts', 'build-technical-insights.js'));
  require(path.join(siteRoot, 'scripts', 'generate-sitemap.js'));
  built = true;
}

const result = {
  ok: true,
  slug: entry.slug,
  status,
  url: canonical,
  file: `news/${entry.slug}.html`,
  hub: `${baseUrl}/news.html`,
  mirror: `${baseUrl}/news/`,
  rebuilt: built,
  warnings
};

if (jsonOutput) {
  console.log(JSON.stringify(result, null, 2));
} else {
  log(`Article written: news/${entry.slug}.html`);
  log(`Registered in assets/data/technical-insights.json as "${status}".`);
  warnings.forEach((warning) => log(` warning: ${warning}`));
  if (built) log('Hub, RSS feed, articles.json and sitemap regenerated.');
  else log('Build skipped (--no-build). Run node scripts/build-technical-insights.js to publish.');
}