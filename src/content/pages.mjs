// Page registry: every static page the build renders. Bodies are authored HTML.
import { GUIDES, GUIDE_HUB_PAGE, GUIDE_PAGES } from './guides.mjs';
import { SITE } from '../site.config.mjs';
// The production calculator is generated here once, then shared by the homepage,
// the canonical tool route, and (with its share-card action omitted) the embed.
function fovCalculatorBody({ embed = false } = {}) {
  const shareCardAction = embed ? '' : `
          <button class="btn btn-quiet" type="button" id="copy-share-card">Copy share card</button>`;

  return `
    <article class="instrument" aria-label="Field of view calculator">
      <header class="instrument-head">
        <span>FOV result / your measurements</span>
        <span class="instrument-live"><i aria-hidden="true"></i> Private in your browser</span>
      </header>
      <div class="tool-grid">
        <form id="fov-form" class="panel setup-panel instrument-module" aria-label="Rig dimensions">
          <header class="module-header">
            <span class="module-title"><b>01</b> Rig setup</span>
            <span>Measured input</span>
          </header>
          <div class="module-body">
            <div class="field-row">
              <div class="field">
                <label for="layout">Layout</label>
                <select id="layout">
                  <option value="single">Single / ultrawide</option>
                  <option value="triple">Triple (identical)</option>
                </select>
              </div>
              <div class="field">
                <label for="units">Your units</label>
                <select id="units">
                  <option value="in" selected>inches</option>
                  <option value="cm">centimetres</option>
                  <option value="mm">millimetres</option>
                </select>
              </div>
            </div>

            <div id="game-field" class="field" hidden>
              <label for="game">Game <span class="note">(optional)</span></label>
              <select id="game">
                <option value="">No game selected</option>
              </select>
            </div>
            <p id="game-data-note" class="note" role="status" hidden></p>

            <div class="field">
              <label for="size-mode">Screen size from</label>
              <select id="size-mode">
                <option value="diagonal">marketed diagonal + aspect ratio</option>
                <option value="measured">measured visible width &amp; height (more accurate)</option>
              </select>
            </div>
            <div id="diagonal-fields">
              <div class="field-row">
                <div class="field">
                  <label for="diagonal">Diagonal (inches)</label>
                  <input id="diagonal" type="number" inputmode="decimal" step="any" min="10" max="100" value="27" required>
                </div>
                <div class="field">
                  <label for="aspect">Aspect ratio</label>
                  <select id="aspect">
                    <option value="16:9">16:9</option>
                    <option value="21:9">21:9</option>
                    <option value="32:9">32:9</option>
                    <option value="16:10">16:10</option>
                  </select>
                </div>
              </div>
            </div>
            <div id="measured-fields" hidden>
              <div class="field-row">
                <div class="field">
                  <label for="width">Visible width<span data-unit-echo></span></label>
                  <input id="width" type="number" inputmode="decimal" step="any" min="1">
                </div>
                <div class="field">
                  <label for="height">Visible height<span data-unit-echo></span></label>
                  <input id="height" type="number" inputmode="decimal" step="any" min="1">
                </div>
              </div>
            </div>

            <div class="field">
              <label for="distance">Eye-to-screen-center distance<span data-unit-echo></span></label>
              <input id="distance" type="number" inputmode="decimal" step="any" min="1" value="24" required>
            </div>

            <div class="field-check">
              <input id="curved" type="checkbox">
              <label for="curved">Curved panel</label>
            </div>
            <div id="radius-field" class="field" hidden>
              <label for="radius">Curvature radius in mm (an "1800R" panel = 1800)</label>
              <input id="radius" type="number" inputmode="numeric" step="1" min="100" value="1800">
            </div>

            <div class="field-row">
              <div class="field">
                <label for="res-h">Horizontal resolution <span class="note">(optional)</span></label>
                <input id="res-h" type="number" inputmode="numeric" step="1" min="1" placeholder="2560">
              </div>
              <div class="field">
                <label for="res-v">Vertical resolution</label>
                <input id="res-v" type="number" inputmode="numeric" step="1" min="1" placeholder="1440">
              </div>
            </div>

            <div id="triple-fields" hidden>
              <div class="field">
                <label for="bezel">Bezel per side, visible image to cabinet edge<span data-unit-echo></span></label>
                <input id="bezel" type="number" inputmode="decimal" step="any" min="0" value="0.3">
              </div>
              <div class="field-row">
                <div class="field">
                  <label for="yaw-mode">Side monitor angle</label>
                  <select id="yaw-mode">
                    <option value="recommended">suggest one for me</option>
                    <option value="manual">I know my angle</option>
                  </select>
                </div>
                <div class="field" hidden>
                  <label for="yaw">Angle from straight (degrees)</label>
                  <input id="yaw" type="number" inputmode="decimal" step="0.01" min="0" max="90">
                </div>
              </div>
            </div>

            <button class="btn" type="submit">Calculate geometry</button>
          </div>
        </form>

        <section class="panel results-panel instrument-module" aria-label="Results" aria-live="polite">
          <header class="module-header">
            <span class="module-title"><b>02</b> Instrument readout</span>
            <span>Physical angles</span>
          </header>
          <div class="module-body">
            <div id="results" class="results-output">
              <div class="readout-grid readout-grid--idle" aria-hidden="true">
                <div class="degree-readout"><span>Horizontal span</span><strong>--.-<small>deg</small></strong></div>
                <div class="degree-readout"><span>Vertical span</span><strong>--.-<small>deg</small></strong></div>
              </div>
              <p class="note empty-note">Enter the dimensions you can measure to get physical spans and a distance-sensitivity band.</p>
            </div>
            <section id="game-record" class="game-record" aria-label="Selected game FOV guidance" aria-live="polite">
              <header class="game-record__header">
                <div><p class="game-record__eyebrow">Game setting guidance</p><h2>iRacing</h2></div>
                <span class="confidence-badge confidence-badge--medium">MEDIUM CONFIDENCE</span>
              </header>
              <div class="game-record__pending"><strong>Game source pending</strong><span>Calculate the current rig to map this dataset record.</span></div>
            </section>
            <div id="actions" class="tool-actions" hidden>
              <button class="btn btn-quiet" type="button" id="copy-link">Copy share link</button>
              <button class="btn btn-quiet" type="button" id="copy-summary">Copy summary</button>
              <button class="btn btn-quiet" type="button" id="copy-json">Copy JSON</button>${shareCardAction}
            </div>
          </div>
        </section>
      </div>

      <section id="method-panel" class="method-panel" aria-labelledby="method-panel-title">
        <header class="method-heading">
          <span>03 / Check your result</span>
          <h2 id="method-panel-title">Your measurement chain</h2>
        </header>
        <div class="calc-sheet">
          <div class="dimension-chain" aria-label="Calculation dimensions">
            <div class="dimension-callout"><span>Input</span><strong id="method-input">27 in diagonal / 24 in distance</strong></div>
            <div class="dimension-callout"><span>Panel width</span><strong id="method-panel-width">597.7 mm active</strong></div>
            <div class="dimension-callout"><span>Angles</span><strong id="method-angles">H --.- / V --.-</strong></div>
          </div>
          <code id="method-equation">H = 2 × atan(W ÷ (2 × D))</code>
          <p id="method-note">Submit the rig to see how your measured dimensions produce the reported angles.</p>
        </div>
      </section>
    </article>
    <noscript><div class="alert alert-warn">The calculator needs JavaScript — it runs entirely
    in your browser; no data leaves the page.</div></noscript>`;
}

const FOV_CALCULATOR_BODY = fovCalculatorBody();

const FOV_TOOL_BODY = `
    <section class="page-intro">
      <p class="eyebrow">FOV calculator / flat, curved &amp; triples</p>
      <h1>Get the FOV your rig actually covers.</h1>
      <p class="dek">Enter your screen and seating measurements to get physical horizontal and vertical spans, a ±10 mm distance band, and the matching game convention when verified.</p>
    </section>
${FOV_CALCULATOR_BODY}`;

const FOV_EMBED_BODY = `
  <div id="embed-root" class="embed-root theme-auto">
    <header class="embed-header">
      <p class="eyebrow">FOV / flat, curved &amp; triples</p>
      <h1>FOV calculator</h1>
      <p>Flat, curved, and triple-screen geometry.</p>
    </header>
${fovCalculatorBody({ embed: true })}
    <footer class="embed-attribution">
      <a id="embed-attribution" href="https://simgeometry.com/tools/fov/" target="_blank" rel="noopener">Calculated by Sim Geometry</a>
    </footer>
  </div>`;

const EMBED_DOCS_BODY = `
    <section class="page-intro">
      <p class="eyebrow">FOV calculator / embed</p>
      <h1>Embed the FOV calculator</h1>
      <p class="dek">Add the Sim Geometry field-of-view calculator to a guide, community site,
      or rig-planning page with one iframe.</p>
    </section>

    <div class="panel copy prose-panel">
      <h2>What visitors can calculate</h2>
      <p>Visitors can enter flat, curved, or triple-screen measurements in a compact,
      single-column calculator and open their result on the full tool page.</p>

      <h2>Privacy</h2>
      <p>no analytics, no cookies, no external requests - audit the network tab</p>
      <p>The calculator runs in the visitor's browser. Its only network request is an optional,
      same-origin game-conventions dataset; if that dataset is unavailable, the physical
      geometry calculator keeps working.</p>

      <h2>Copy-paste iframe</h2>
      <pre><code>&lt;iframe id='sim-geometry-fov'
  src='https://simgeometry.com/embed/fov/?theme=auto&amp;amp;units=in'
  title='Sim Geometry FOV calculator'
  loading='lazy'
  sandbox='allow-scripts allow-popups allow-popups-to-escape-sandbox'
  width='100%'
  height='900'&gt;&lt;/iframe&gt;</code></pre>

      <h2>Parameters</h2>
      <dl>
        <dt><code>theme=light|dark|auto</code></dt>
        <dd>Forces the light palette, the dark palette, or the dark-first site default.</dd>
        <dt><code>units=in|cm|mm</code></dt>
        <dd>Sets the form's initial measurement units. A valid share fragment takes precedence.</dd>
      </dl>

      <h2>Automatic height</h2>
      <p>The embed reports its rendered height. Add this script on the parent page after the iframe:</p>
      <pre><code>&lt;script&gt;
const frame = document.querySelector('#sim-geometry-fov');

window.addEventListener('message', (event) =&gt; {
  const message = event.data;
  if (event.source !== frame.contentWindow ||
      message?.type !== 'sim-geometry-embed-height' ||
      !Number.isFinite(message.px)) return;

  frame.height = String(Math.max(320, Math.ceil(message.px)));
});
&lt;/script&gt;</code></pre>
    </div>`;

const ABOUT_BODY = `
    <section class="page-intro">
      <p class="eyebrow">About</p>
      <h1>Numbers you can trace, without invented experience.</h1>
      <p class="dek">${SITE.credo}</p>
    </section>
    <div class="panel copy prose-panel">
      <h2>Who publishes this</h2>
      <p>Sim Geometry is published by the <strong>${SITE.org}</strong>.</p>
      <h2>Honesty stance</h2>
      <p>There are no product reviews and no claims of hands-on use, ownership, feel, or driving experience. Every published number is tied to a source; unknowns remain unknown instead of being guessed.</p>
    </div>`;

const METHODOLOGY_BODY = `
    <section class="page-intro">
      <p class="eyebrow">Data &amp; Method</p>
      <h1>Check what your result means.</h1>
      <p class="dek">Use the formulas, input definitions, and evidence grades below to decide whether a number fits your rig and your game.</p>
    </section>
    <div class="panel copy prose-panel methodology-copy">
      <h2>Formulas</h2>
      <p>For a flat panel, horizontal and vertical spans use <code>span = 2 × atan(size ÷ (2 × D))</code>, where <code>size</code> is the visible width or height and <code>D</code> is the eye-to-screen-center distance.</p>
      <p>For a curved panel, visible width is a straight chord. Chord and radius produce sagitta with <code>s = R − √(R² − (W ÷ 2)²)</code>; the nearer edge depth is then used to calculate the physical horizontal span.</p>
      <p>For identical triples, a top-down ray trace places the center panel and both yawed side panels. Results keep the full visible envelope, active image coverage, bezel seam occlusion, center-panel span, and requested yaw separate.</p>

      <h2>Assumptions</h2>
      <ul>
        <li>Width and height mean the visible image, not the cabinet.</li>
        <li>Distance runs from the midpoint between the eyes to the center of the visible screen surface.</li>
        <li>Curved screens are concave toward the viewer, and width is their visible chord rather than arc length.</li>
        <li>Triple screens are identical, symmetrically placed, and use one measured or suggested yaw value.</li>
      </ul>
      <p>The ±10 mm band recalculates the same rig at a nearer and farther eye point. It shows sensitivity to distance; it is not a confidence interval.</p>

      <h2>Evidence confidence</h2>
      <p>Confidence grades the evidence behind a game convention, never the physical geometry calculation.</p>
      <dl>
        <dt><strong>High</strong></dt>
        <dd>Current first-party material directly supports the relevant convention and guidance.</dd>
        <dt><strong>Medium</strong></dt>
        <dd>The core mapping is supported, but one or more details rely on converging specialist sources or remain unresolved.</dd>
        <dt><strong>Low</strong></dt>
        <dd>The evidence is not strong enough for a verified scalar conversion; only cautious physical-geometry guidance is shown.</dd>
      </dl>

      <h2>Source hierarchy</h2>
      <ol>
        <li>Official manuals, support documents, and compatibility matrices.</li>
        <li>Official product pages.</li>
        <li>Authorized affiliate or merchant feeds for price and availability.</li>
        <li>Authorized reseller evidence when a manufacturer is silent, labeled accordingly.</li>
        <li>Independent instrumentation only when its method and source are published; it is not converted into a sensory score.</li>
      </ol>

      <h2>No-scrape stance</h2>
      <p>A publicly reachable page is not permission to extract it. There is no catalog crawling, Shopify <code>/products.json</code> collection, or automated MOZA fetching. Automated sources must be explicitly allowed; unknown endpoints fail closed. Facts are stored as concise, sourced records rather than copied page text or raw feed dumps.</p>
    </div>`;

const PRIVACY_BODY = `
    <section class="page-intro">
      <p class="eyebrow">Privacy</p>
      <h1>What loads, and where your inputs go.</h1>
    </section>
    <div class="panel copy prose-panel">
      <p>Standard site pages load Google Analytics 4 (GA4, measurement ID <code>${SITE.ga4}</code>). GA4 can send page, device, and usage information to Google and may use analytics cookies or similar identifiers.</p>
      <p>Calculator inputs are processed in your browser and are not submitted to Sim Geometry.</p>
      <p>The calculator at <code>/embed/fov/</code> does not load GA4, set cookies, or make third-party requests. It may request the same-origin game-conventions dataset; the physical calculator still works if that dataset is unavailable.</p>
    </div>`;

const HOME_BODY = `
    <section class="home-hero">
      <div class="home-intro">
        <div>
          <p class="eyebrow">FOV calculator / your rig</p>
          <h1>Get the right view for your rig.</h1>
        </div>
        <p>Enter your screen, eye distance, and layout to calculate the physical span—and, where verified, the setting your game expects.</p>
      </div>
${FOV_CALCULATOR_BODY}
    </section>

    <section class="home-guides" aria-labelledby="home-guides-title">
      <header class="section-intro">
        <p class="eyebrow">Setup guides</p>
        <h2 id="home-guides-title">Measure better. Enter the right number.</h2>
      </header>
      <div class="home-guides-grid">
${GUIDES.map((guide) => `        <a class="home-guide-link" href="/guides/${guide.slug}/">${guide.homeTitle}</a>`).join('\n')}
      </div>
    </section>`;

export const PAGES = [
  GUIDE_HUB_PAGE,
  ...GUIDE_PAGES,
  {
    path: '/tools/fov/',
    title: 'FOV Calculator — flat, curved & triple screens',
    description:
      'A dedicated sim-racing FOV geometry lab with canonical share state, annotated calculations, game-convention evidence, and flat, curved, or triple-screen results.',
    styles: ['/styles/tool.css'],
    scripts: ['/js/tools/fov-ui.mjs'],
    body: FOV_TOOL_BODY,
  },
  {
    path: '/embed/fov/',
    title: 'Embeddable FOV calculator',
    description: 'Compact, privacy-first Sim Geometry FOV calculator for iframe embeds.',
    robots: 'noindex, nofollow',
    embed: true,
    styles: ['/styles/tool.css', '/styles/embed.css'],
    scripts: ['/js/tools/fov-ui.mjs'],
    body: FOV_EMBED_BODY,
  },
  {
    path: '/embed/',
    title: 'Embed the FOV calculator',
    description: 'How to embed the privacy-first Sim Geometry FOV calculator, including theme, units, and automatic height options.',
    body: EMBED_DOCS_BODY,
  },
  {
    path: '/about/',
    title: 'About',
    description: 'Who publishes Sim Geometry and the honesty rules behind its sourced numbers, research, and product coverage.',
    body: ABOUT_BODY,
  },
  {
    path: '/methodology/',
    title: 'Methodology',
    description: 'FOV formulas, geometry assumptions, evidence-confidence grades, source hierarchy, and the Sim Geometry no-scrape stance.',
    body: METHODOLOGY_BODY,
  },
  {
    path: '/privacy/',
    title: 'Privacy',
    description: 'A concise disclosure for Google Analytics on standard pages, local calculator inputs, and the tracking-free FOV embed.',
    body: PRIVACY_BODY,
  },
  {
    path: '/',
    title: 'Sim Geometry',
    description:
      'Calculate the physical field of view for flat, curved, or triple-screen sim-racing rigs, then use sourced guides to match the right game convention.',
    styles: ['/styles/tool.css'],
    scripts: ['/js/tools/fov-ui.mjs'],
    body: HOME_BODY,
  },
];
