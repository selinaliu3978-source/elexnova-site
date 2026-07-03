const fs = require('fs');
const path = require('path');

const siteRoot = path.resolve(__dirname, '..');
const productsRoot = path.join(siteRoot, 'products');
const baseUrl = 'https://elexnova.com';
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

const productPages = fs.existsSync(productsRoot)
  ? fs.readdirSync(productsRoot)
      .filter((file) => file.endsWith('.html'))
      .sort()
      .filter((file) => isIndexableHtml(path.join(productsRoot, file)))
      .map((file) => `products/${file}`)
  : [];

const today = new Date().toISOString().slice(0, 10);
const urls = [...new Set([...staticPages, ...productPages])];
const sitemapItems = urls.map((url) => `  <url>
    <loc>${baseUrl}/${url}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>${url === 'index.html' ? '1.00' : '0.80'}</priority>
  </url>`).join('\n');

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${sitemapItems}
</urlset>
`;

fs.writeFileSync(path.join(siteRoot, 'sitemap.xml'), sitemap, 'utf8');
console.log(`Generated sitemap.xml with ${urls.length} URLs, including ${productPages.length} product pages.`);
