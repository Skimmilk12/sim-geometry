// Page shell. Whole-page rendering only — there is no in-place injection in this
// repo; dist/ is always regenerated from src/.
import { SITE } from '../site.config.mjs';

const esc = (s) => String(s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;');

function navItem(item, currentPath) {
  if (!item.built) {
    return `<li><span class="soon" aria-disabled="true">${esc(item.label)}<span class="sr-only"> (coming soon)</span></span></li>`;
  }
  const current = currentPath === item.href ? ' aria-current="page"' : '';
  return `<li><a href="${item.href}"${current}>${esc(item.label)}</a></li>`;
}

// Prelaunch can be forced off for production-fixture tests: SG_PRELAUNCH=0
function isPrelaunch() {
  if (process.env.SG_PRELAUNCH === '0') return false;
  if (process.env.SG_PRELAUNCH === '1') return true;
  return SITE.prelaunch;
}

/**
 * Render a full page.
 * page: { path, title, description, body, robots? }
 *  - path: canonical path with trailing slash ('/' for home)
 *  - body: main-content HTML (already escaped/authored)
 */
export function renderPage(page) {
  const title = page.path === '/'
    ? `${SITE.name} — ${SITE.tagline.replaceAll(' · ', ', ')}`
    : `${page.title} — ${SITE.name}`;
  const robots = isPrelaunch() ? 'noindex, nofollow' : (page.robots || 'index, follow');
  const canonical = SITE.base.replace(/\/$/, '') + page.path;

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(page.description)}">
<meta name="robots" content="${robots}">
<link rel="canonical" href="${canonical}">
<link rel="stylesheet" href="/styles/tokens.css">
<link rel="stylesheet" href="/styles/base.css">
${(page.styles || []).map((s) => `<link rel="stylesheet" href="${s}">`).join('\n')}
<script async src="https://www.googletagmanager.com/gtag/js?id=${SITE.ga4}"></script>
<script>
window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', '${SITE.ga4}');
</script>
</head>
<body>
<a class="skip-link" href="#main">Skip to main content</a>
<header class="sg-top">
  <div class="wrap">
    <a class="sg-brand" href="/">${esc(SITE.brand)}</a>
    <span class="sg-tag">${esc(SITE.tagline)}</span>
  </div>
</header>
<nav class="sg-nav" aria-label="Primary">
  <div class="wrap">
    <ul>
${SITE.nav.map((i) => '      ' + navItem(i, page.path)).join('\n')}
    </ul>
  </div>
</nav>
<main id="main">
  <div class="wrap">
${page.body}
  </div>
</main>
${(page.scripts || []).map((s) => `<script type="module" src="${s}"></script>`).join('\n')}
<footer class="sg-foot">
  <div class="wrap">
    <nav aria-label="Footer">
${SITE.footNav.map((i) => '      ' + (i.built ? `<a href="${i.href}">${esc(i.label)}</a>` : `<span class="soon">${esc(i.label)}</span>`)).join('\n')}
    </nav>
    <p class="credo">${esc(SITE.org)} — ${esc(SITE.credo)}</p>
    <p>Every number on this site links to its source. We do not review hardware and we have not driven the products we document.</p>
  </div>
</footer>
</body>
</html>
`;
}
