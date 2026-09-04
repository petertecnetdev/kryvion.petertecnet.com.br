import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { blogArticles } from '../src/content/blogArticles.js';

const DIST = new URL('../dist/', import.meta.url);
const SITE_URL = 'https://kryvion.petertecnet.com.br';
const baseHtml = await readFile(new URL('index.html', DIST), 'utf8');

const escapeAttr = (value = '') => String(value)
  .replaceAll('&', '&amp;')
  .replaceAll('"', '&quot;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;');

const jsonLdScript = (schema) => schema
  ? `<script type="application/ld+json">${JSON.stringify(schema).replaceAll('<', '\\u003c')}</script>`
  : '';

function withSeo(html, { title, description, canonical, robots = 'index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1', type = 'website', schema = null }) {
  const replacements = [
    [/<title>[\s\S]*?<\/title>/, `<title>${escapeAttr(title)}</title>`],
    [/<meta name="description" content="[^"]*" \/>/, `<meta name="description" content="${escapeAttr(description)}" />`],
    [/<meta name="robots" content="[^"]*" \/>/, `<meta name="robots" content="${escapeAttr(robots)}" />`],
    [/<meta property="og:type" content="[^"]*" \/>/, `<meta property="og:type" content="${escapeAttr(type)}" />`],
    [/<meta property="og:title" content="[^"]*" \/>/, `<meta property="og:title" content="${escapeAttr(title)}" />`],
    [/<meta property="og:description" content="[^"]*" \/>/, `<meta property="og:description" content="${escapeAttr(description)}" />`],
    [/<meta property="og:url" content="[^"]*" \/>/, `<meta property="og:url" content="${escapeAttr(canonical)}" />`],
    [/<meta name="twitter:title" content="[^"]*" \/>/, `<meta name="twitter:title" content="${escapeAttr(title)}" />`],
    [/<meta name="twitter:description" content="[^"]*" \/>/, `<meta name="twitter:description" content="${escapeAttr(description)}" />`],
    [/<link rel="canonical" href="[^"]*" \/>/, `<link rel="canonical" href="${escapeAttr(canonical)}" />`],
  ];

  let output = html;
  for (const [pattern, replacement] of replacements) output = output.replace(pattern, replacement);
  output = output.replace(/\s*<script type="application\/ld\+json">[\s\S]*?<\/script>/, schema ? `\n    ${jsonLdScript(schema)}` : '');
  return output;
}

async function writeRoute(route, html) {
  const target = join(DIST.pathname, `${route.replace(/^\//, '')}.html`);
  await mkdir(dirname(target), { recursive: true });
  await writeFile(target, html, 'utf8');
  console.log(`[seo] ${route} -> ${target.replace(DIST.pathname, 'dist/')}`);
}

const blogDescription = 'Kryvion Lab: artigos sobre Bitcoin, criptomoedas, análise técnica, RSI, dominância do BTC, portfólio e gestão de risco no mercado cripto.';
await writeRoute('/blog', withSeo(baseHtml, {
  title: 'Kryvion Lab | Bitcoin, Criptomoedas, Análise e Gestão de Risco',
  description: blogDescription,
  canonical: `${SITE_URL}/blog`,
  schema: {
    '@context': 'https://schema.org',
    '@type': 'Blog',
    name: 'Kryvion Lab',
    url: `${SITE_URL}/blog`,
    description: blogDescription,
    inLanguage: 'pt-BR',
    publisher: { '@type': 'Organization', name: 'Peter Tecnet', url: 'https://petertecnet.com.br' },
    blogPost: blogArticles.map((article) => ({
      '@type': 'BlogPosting',
      headline: article.title,
      url: `${SITE_URL}/blog/${article.slug}`,
      datePublished: article.datePublished,
      dateModified: article.dateModified,
    })),
  },
}));

for (const article of blogArticles) {
  const canonical = `${SITE_URL}/blog/${article.slug}`;
  await writeRoute(`/blog/${article.slug}`, withSeo(baseHtml, {
    title: `${article.title} | Kryvion`,
    description: article.description,
    canonical,
    type: 'article',
    schema: {
      '@context': 'https://schema.org',
      '@graph': [
        {
          '@type': 'BlogPosting',
          headline: article.title,
          description: article.description,
          datePublished: article.datePublished,
          dateModified: article.dateModified,
          mainEntityOfPage: canonical,
          inLanguage: 'pt-BR',
          articleSection: article.category,
          keywords: article.keywords.join(', '),
          author: { '@type': 'Organization', name: 'Kryvion Lab', url: `${SITE_URL}/blog` },
          publisher: { '@type': 'Organization', name: 'Peter Tecnet', url: 'https://petertecnet.com.br' },
        },
        {
          '@type': 'BreadcrumbList',
          itemListElement: [
            { '@type': 'ListItem', position: 1, name: 'Kryvion', item: SITE_URL },
            { '@type': 'ListItem', position: 2, name: 'Blog', item: `${SITE_URL}/blog` },
            { '@type': 'ListItem', position: 3, name: article.title, item: canonical },
          ],
        },
      ],
    },
  }));
}

await writeRoute('/entrar', withSeo(baseHtml, {
  title: 'Entrar ou criar conta grátis | Kryvion',
  description: 'Acesse sua conta Kryvion ou continue com Google para criar uma conta gratuita no ecossistema Peter Tecnet.',
  canonical: `${SITE_URL}/entrar`,
  robots: 'noindex,follow',
  schema: null,
}));
