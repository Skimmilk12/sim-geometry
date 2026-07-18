// Page registry: every static page the build renders. Tool pages will register
// themselves here as they are built (B4+). Bodies are authored HTML.
export const PAGES = [
  {
    path: '/',
    title: 'Sim Geometry',
    description:
      'An evidence-linked lab that turns rig dimensions, platform, and budget into correct display settings and compatible hardware choices. Every number cited.',
    body: `
    <h1>The setup numbers, shown with their work.</h1>
    <p class="dek">Sim Geometry is a technical decision platform for sim racing: exact
    field-of-view math, source-linked hardware specifications, and compatibility you can
    verify — not opinions about feel.</p>

    <div class="panel copy">
      <h2 style="margin-top:0">What's being built here</h2>
      <p><strong>The Geometry Lab</strong> — a field-of-view and monitor calculator built
      for trust: every per-game recommendation carries its source and the date it was last
      verified, every result has a shareable URL that reproduces it exactly, and the math
      is published alongside its test vectors.</p>
      <p><strong>The Direct-Drive Value Lab</strong> — wheelbase specifications compiled
      from official manuals and product pages, with a citation on every field and true
      installed cost instead of bare base prices.</p>
      <p><strong>The Console-Safe Upgrade Planner</strong> — valid upgrade paths for your
      platform with the official compatibility source shown beside every claim.</p>
      <p>The first tools are in build now. No reviews, no scores, no invented experience —
      if we state a number, you can click through to where it came from.</p>
    </div>`,
  },
];
