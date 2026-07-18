// Standalone embed shell. Deliberately omits the site header, navigation,
// footer, analytics, and every third-party resource.
import { SITE } from '../site.config.mjs';

const esc = (value) => String(value)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;');

export function renderEmbedPage(page) {
  const canonical = SITE.base.replace(/\/$/, '') + page.path;

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(page.title)} — ${esc(SITE.name)}</title>
<meta name="description" content="${esc(page.description)}">
<meta name="robots" content="noindex, nofollow">
<link rel="canonical" href="${canonical}">
<link rel="stylesheet" href="/styles/tokens.css">
<link rel="stylesheet" href="/styles/base.css">
${(page.styles || []).map((style) => `<link rel="stylesheet" href="${style}">`).join('\n')}
</head>
<body>
<main id="main">
${page.body}
</main>
${(page.scripts || []).map((script) => `<script type="module" src="${script}"></script>`).join('\n')}
</body>
</html>
`;
}
