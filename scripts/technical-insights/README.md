# Technical Insights (news module) - build and automation interface

The news module of the Elexnova site is a static **Technical Insights** content
center. There is no CMS: articles are plain HTML files and one JSON metadata
file drives the hub, the feeds and the SEO blocks.

## URLs

| Purpose | URL | File |
| --- | --- | --- |
| Hub (canonical) | `https://elexnova.com/news.html` | `news.html` |
| Hub mirror for the folder path | `https://elexnova.com/news/` | `news/index.html` |
| Article | `https://elexnova.com/news/<slug>.html` | `news/<slug>.html` |
| RSS | `https://elexnova.com/news/feed.xml` | `news/feed.xml` |
| Machine readable index | `https://elexnova.com/news/articles.json` | `news/articles.json` |

`news/index.html` is a full copy of the hub that declares
`<link rel="canonical" href="https://elexnova.com/news.html">`. Nothing is
redirected, no article URL is rewritten and the canonical of `news.html` stays
`https://elexnova.com/news.html`.

## Files

| File | Role |
| --- | --- |
| `assets/data/technical-insights.json` | Single source of truth: hub copy, categories, article metadata |
| `scripts/build-technical-insights.js` | Idempotent builder: article SEO blocks, both hub pages, feed, articles.json |
| `scripts/generate-sitemap.js` | Sitemap generator (hub + published articles only) |
| `scripts/technical-insights/add-article.js` | Publishing endpoint used by n8n / CI |
| `scripts/technical-insights/payload.schema.json` | Payload contract (JSON Schema draft-07) |
| `scripts/technical-insights/article-template.html` | Base HTML shell used when a new article is created |
| `assets/css/technical-insights.css` | Styles for the hub, meta bar, TOC, takeaways, related blocks and CTA |

## Editing an article manually

1. Edit `assets/data/technical-insights.json` (metadata: title, summary, date,
   category, keywords, related, products).
2. Edit the matching `news/<slug>.html` body if needed.
3. Run `node scripts/build-technical-insights.js` and `node scripts/generate-sitemap.js`.

The builder never touches article bodies, headings, `<title>` tags or existing
canonicals; it only refreshes the generated blocks marked with
`<!-- technical-insights:*:start --> ... <!-- technical-insights:*:end -->`.

Titles follow the whole site's convention: the `<h1>` carries the editorial
title and the `<title>` tag ends with `| MiDEN Electronics`. Because existing
`<title>` tags are respected as they are, no older article title is renamed.

## Publishing from n8n

n8n runs on the deployment server, next to the site checkout, so the publishing
workflow calls the script directly on that host. Nothing has to be installed
beyond Node.js itself (Node 18 or newer; tested on Node 24).

`add-article.js` is the reserved interface. It validates the payload, writes the
article page, registers the metadata, then rebuilds the hub, the RSS feed,
`articles.json` and the sitemap.

```bash
# run from the site root on the server, for example /srv/elexnova/website/google-site
node scripts/technical-insights/add-article.js scripts/technical-insights/incoming/<slug>.json --json
```

Recommended n8n setup on the deployment server:

1. **Execute Command** node with *Working Directory* set to the site root (the
   folder that holds `news.html`), so the relative paths above work as written.
   Absolute paths work as well, for example
   `node /srv/elexnova/website/google-site/scripts/technical-insights/add-article.js ...
   /srv/elexnova/website/google-site/scripts/technical-insights/incoming/<slug>.json --json`.
2. Write the generated payload to
   `scripts/technical-insights/incoming/<slug>.json` (Write Binary File node, or
   a Code node that writes the file with `fs`).
3. Run the command from step 1.
4. Read the JSON object printed on stdout and branch on `ok`:

   ```json
   {
     "ok": true,
     "slug": "inductor-thermal-margin-verification",
     "status": "published",
     "url": "https://elexnova.com/news/inductor-thermal-margin-verification.html",
     "file": "news/inductor-thermal-margin-verification.html",
     "hub": "https://elexnova.com/news.html",
     "mirror": "https://elexnova.com/news/",
     "rebuilt": true,
     "warnings": []
   }
   ```

   The JSON is pretty printed, so parse `stdout` with a JSON node or
   `JSON.parse` in a Code node.
5. Commit and deploy the changed files with the normal pipeline. The script
   writes files only and never runs git.

Alternative when the n8n instance runs on a different host, using an SSH node:

```bash
ssh deploy@elexnova.com 'cd /srv/elexnova/website/google-site && node scripts/technical-insights/add-article.js scripts/technical-insights/incoming/<slug>.json --json'
```

The payload can also be piped through stdin instead of a file:

```bash
cat payload.json | node scripts/technical-insights/add-article.js - --json
```

Exit codes: `0` on success, `1` when the payload is rejected or a file cannot be
written. On failure stdout carries `{"ok": false, "errors": [...]}`.

Useful flags: `--draft` (noindex page, hidden from every listing), `--dry-run`
(validate only), `--force` (replace an existing slug), `--no-build` (write files
without regenerating), `--json` (machine readable output, exit code 1 on error).

### Payload example

```json
{
  "slug": "inductor-thermal-margin-verification",
  "shortTitle": "Inductor Thermal Margin",
  "title": "Verifying Inductor Thermal Margin Before Mass Production",
  "summary": "How to verify inductor thermal margin with a structured test plan covering temperature rise, saturation headroom and batch consistency.",
  "lead": "Thermal margin is a common cause of late-stage inductor problems.",
  "date": "2026-09-28",
  "category": "Technical Articles",
  "keywords": ["inductor thermal margin", "temperature rise test", "inductor validation"],
  "takeaways": [
    "Verify thermal margin at worst-case ambient and load, not at nominal conditions.",
    "Saturation headroom and temperature rise must be measured separately.",
    "Batch sampling catches variation a single sample cannot reveal."
  ],
  "products": [["Power Inductor Series", "../products/power-inductor.html"]],
  "internal": [["Factory Capability", "../factory.html"]],
  "related": ["understanding-saturation-current-power-inductors"],
  "status": "published",
  "body": "<h2>Why Thermal Margin Matters</h2><p>...</p><h2>Test Plan Structure</h2><p>...</p>"
}
```

Field rules (also enforced by `add-article.js`):

- `slug`: lowercase letters, numbers and hyphens, 3-80 characters. Becomes the
  file name and the article URL.
- `title`: 10-120 characters, used as the H1 and the Article headline.
- `shortTitle`: optional, kept short when the editorial title is too long for a
  `<title>` tag. The title tag becomes `<shortTitle|title> | MiDEN Electronics`,
  while the `<h1>` always keeps the full `title`.
- `summary`: 40-320 characters, shown on the hub card, in the RSS item and in
  `articles.json`.
- `body`: HTML fragment, minimum 600 characters, at least two `<h2>` sections
  (used for the anchor ids and the table of contents). Do not paste a full HTML
  document and do not include `technical-insights:` marker comments.
- `category`: one of `Technical Articles`, `Applications`, `Industry Trends`,
  `Company Updates`.
- `keywords`: 3-12 strings, written to the keywords meta tag, the Article schema
  and the on-page keyword list.
- `takeaways`: optional 3-6 bullets rendered above the table of contents.
- `products` / `internal`: optional `[label, href]` link pairs. Hrefs are
  relative to `/news/`, for example `../products/power-inductor.html`.
- `related`: optional slugs of existing articles for the "Continue reading" block.
- `status`: `published` (default) or `draft`.

## What a build regenerates

For every article: keywords meta, robots meta, Open Graph and Twitter tags,
TechArticle + BreadcrumbList JSON-LD, category/date/reading-time meta bar,
table of contents, key takeaways, related-article block, related product and page
links, keyword chips and the Contact Us / Request Quote / WhatsApp CTA.

For the module: `news.html`, `news/index.html`, `news/feed.xml`,
`news/articles.json` and (via `generate-sitemap.js`) `sitemap.xml`.

Drafts get `<meta name="robots" content="noindex,follow">` and are excluded from
the hub, feed, `articles.json` and the sitemap.

## Fixed constraints

Do not change in this module:

- article URLs or the `/news/<slug>.html` structure,
- the canonical tag of any existing page,
- redirects (no 301 and no meta-refresh pages).

## Deferred to the later SEO phase

- Two near-duplicate articles describe similar topics:
  `news/toroidal-inductors-vs-drum-core-inductors.html` and
  `news/toroidal-vs-drum-core-inductors.html`. Consolidation or canonical
  handling is intentionally postponed.
- Existing article `<title>` tags are never rewritten. They keep their current
  wording and the site-wide `| MiDEN Electronics` suffix, so the module does not
  unify or rename older titles.

## Verification

```bash
node scripts/build-technical-insights.js      # idempotent, run twice and compare
node scripts/generate-sitemap.js
node scripts/technical-insights/add-article.js payload.json --dry-run --json
```