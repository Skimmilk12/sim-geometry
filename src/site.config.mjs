// Single source of site-wide constants. Everything site-specific lives here —
// generators must import from this file, never hardcode (the site-#1 lesson).
export const SITE = {
  name: 'Sim Geometry',
  brand: 'SIM GEOMETRY',
  tagline: 'measurements · compatibility · cost',
  credo: 'Measurements, compatibility, and cost — without invented experience.',
  org: 'Sim Geometry Research Desk',
  // Custom-domain canonical is intentional during prelaunch; at launch,
  // configure DNS/CNAME and set prelaunch: false. base itself doesn't change.
  base: 'https://simgeometry.com',
  // While true: every page carries noindex and no sitemap is generated,
  // so the interim github.io deployment never gets indexed as a duplicate.
  prelaunch: true,
  nav: [
    { label: 'Geometry', href: '/tools/fov/', built: false },
    { label: 'Wheelbases', href: '/wheelbases/', built: false },
    { label: 'Upgrade Planner', href: '/tools/upgrade-planner/', built: false },
    { label: 'Guides', href: '/guides/', built: false },
    { label: 'Data & Method', href: '/methodology/', built: false },
  ],
  footNav: [
    { label: 'About', href: '/about/', built: false },
    { label: 'Methodology', href: '/methodology/', built: false },
    { label: 'Changelog', href: '/changelog/', built: false },
    { label: 'Disclosure', href: '/disclosure/', built: false },
    { label: 'Privacy', href: '/privacy/', built: false },
  ],
};
