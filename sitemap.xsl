<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="1.0"
  xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
  xmlns:sitemap="http://www.sitemaps.org/schemas/sitemap/0.9">
  <xsl:output method="html" encoding="UTF-8" indent="yes"/>
  <xsl:template match="/">
    <html lang="en">
      <head>
        <meta charset="UTF-8"/>
        <meta name="viewport" content="width=device-width, initial-scale=1"/>
        <title>MiDEN XML Sitemap</title>
        <style>
          body {
            margin: 0;
            font-family: Arial, Helvetica, sans-serif;
            color: #1d252d;
            background: #f4f7fa;
          }
          header {
            padding: 42px max(22px, calc((100vw - 1100px) / 2));
            color: #fff;
            background: #073763;
          }
          h1 {
            margin: 0 0 8px;
            font-size: 34px;
          }
          p {
            margin: 0;
            color: #dbeaf5;
          }
          main {
            padding: 36px max(22px, calc((100vw - 1100px) / 2));
          }
          table {
            width: 100%;
            border-collapse: collapse;
            background: #fff;
            border: 1px solid #d9e2ea;
          }
          th,
          td {
            padding: 14px;
            text-align: left;
            border-bottom: 1px solid #d9e2ea;
          }
          th {
            color: #073763;
            background: #eef4f8;
          }
          a {
            color: #005a9c;
            font-weight: 700;
            text-decoration: none;
          }
          a:hover {
            text-decoration: underline;
          }
          @media (max-width: 700px) {
            table,
            thead,
            tbody,
            tr,
            th,
            td {
              display: block;
            }
            thead {
              display: none;
            }
            td {
              padding: 10px 14px;
            }
            td::before {
              display: block;
              margin-bottom: 4px;
              color: #5c6975;
              font-size: 12px;
              font-weight: 700;
              text-transform: uppercase;
            }
            td:nth-child(1)::before { content: "URL"; }
            td:nth-child(2)::before { content: "Change Frequency"; }
            td:nth-child(3)::before { content: "Priority"; }
          }
        </style>
      </head>
      <body>
        <header>
          <h1>MiDEN XML Sitemap</h1>
          <p>
            <xsl:value-of select="count(sitemap:urlset/sitemap:url)"/>
            pages available for search engines.
          </p>
        </header>
        <main>
          <table>
            <thead>
              <tr>
                <th>URL</th>
                <th>Change Frequency</th>
                <th>Priority</th>
              </tr>
            </thead>
            <tbody>
              <xsl:for-each select="sitemap:urlset/sitemap:url">
                <tr>
                  <td><a href="{sitemap:loc}"><xsl:value-of select="sitemap:loc"/></a></td>
                  <td><xsl:value-of select="sitemap:changefreq"/></td>
                  <td><xsl:value-of select="sitemap:priority"/></td>
                </tr>
              </xsl:for-each>
            </tbody>
          </table>
        </main>
      </body>
    </html>
  </xsl:template>
</xsl:stylesheet>
