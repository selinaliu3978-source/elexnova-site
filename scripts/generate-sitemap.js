const fs = require('fs');
const path = require('path');

const siteRoot = path.resolve(__dirname, '..');
const productsRoot = path.join(siteRoot, 'products');
const newsRoot = path.join(siteRoot, 'news');
const baseUrl = 'https://elexnova.com';

// news.html is the canonical Technical Insights hub (URL unchanged).
// The /news/ mirror and draft articles are intentionally not listed.
const staticPages = [
  'index.html',
  'products.html',
  'about.html',
  'applications.html',
  'contact.html',
  'factory.html',
  'news.html',
  'certificates.html',
  'downloads.html',
];

const isIndexableHtml = (filePath) => {
  const html = fs.readFileSync(filePath, 'utf8');
  return !/<meta\s+name=["']robots["'][^>]*noindex/i.test(html);
};

const htmlPages = (root, prefix) => (fs.existsSync(root)
  ? fs.readdirSync(root)
      .filter((file) => file.endsWith('.html'))
      .sort()
      .filter((file) => (prefix === 'news/' ? file !== 'index.html' : true))
      .filter((file) => isIndexableHtml(path.join(root, file)))
      .map((file) => `${prefix}${file}`)
  : []);

const productPages = htmlPages(productsRoot, 'products/');
const newsPages = htmlPages(newsRoot, 'news/');

const toLoc = (url) => `${baseUrl}/${url.replace(/index\.html$/, '')}`;
const priorityFor = (url) => {
  if (url === 'index.html') return '1.00';
  if (url === 'news/index.html') return '0.90';
  if (url.startsWith('news/')) return '0.70';
  return '0.80';
};
const changefreqFor = (url) => (url.startsWith('news/') && url !== 'news/index.html' ? 'monthly' : 'weekly');

const today = new Date().toISOString().slice(0, 10);
const urls = [...new Set([...staticPages, ...productPages, ...newsPages])];
const sitemapItems = urls.map((url) => `  <url>
    <loc>${toLoc(url)}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${changefreqFor(url)}</changefreq>
    <priority>${priorityFor(url)}</priority>
  </url>`).join('\n');

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${sitemapItems}
</urlset>
`;

fs.writeFileSync(path.join(siteRoot, 'sitemap.xml'), sitemap, 'utf8');
console.log(`Generated sitemap.xml with ${urls.length} URLs, including ${productPages.length} product pages and ${newsPages.length} Technical Insights articles.`);