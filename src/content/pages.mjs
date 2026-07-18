// Page registry: every static page the build renders. Bodies are authored HTML.
// The production calculator is generated here once, then shared by the homepage,
// the canonical tool route, and (with its share-card action omitted) the embed.
function fovCalculatorBody({ embed = false } = {}) {
  const shareCardAction = embed ? '' : `
          <button class="btn btn-quiet" type="button" id="copy-share-card">Copy share card</button>`;

  return `
    <article class="instrument" aria-label="Field of view calculator">
      <header class="instrument-head">
        <span>SG-FOV / browser-native geometry</span>
        <span class="instrument-live"><i aria-hidden="true"></i> Local calculation</span>
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
              <p class="note empty-note">Enter the dimensions you can measure. The instrument calculates locally and exposes every assumption it uses.</p>
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
          <span>03 / Visible method</span>
          <h2 id="method-panel-title">Annotated calculation sheet</h2>
        </header>
        <div class="calc-sheet">
          <div class="dimension-chain" aria-label="Calculation dimensions">
            <div class="dimension-callout"><span>Input</span><strong id="method-input">27 in diagonal / 24 in distance</strong></div>
            <div class="dimension-callout"><span>Panel width</span><strong id="method-panel-width">597.7 mm active</strong></div>
            <div class="dimension-callout"><span>Angles</span><strong id="method-angles">H --.- / V --.-</strong></div>
          </div>
          <code id="method-equation">H = 2 × atan(W ÷ (2 × D))</code>
          <p id="method-note">The flat-panel baseline uses visible width and eye distance. Submit the rig to substitute your measured dimensions.</p>
        </div>
      </section>
    </article>
    <noscript><div class="alert alert-warn">The calculator needs JavaScript — it runs entirely
    in your browser; no data leaves the page.</div></noscript>`;
}

const FOV_CALCULATOR_BODY = fovCalculatorBody();

const FOV_TOOL_BODY = `
    <section class="page-intro">
      <p class="eyebrow">Instrument 01 / field of view</p>
      <h1>Field-of-view geometry, exposed.</h1>
      <p class="dek">Build a reproducible physical baseline for flat, curved, or identical triple screens. This lab prioritizes calculation detail, game-convention evidence, and canonical share state.</p>
    </section>
${FOV_CALCULATOR_BODY}`;

const FOV_EMBED_BODY = `
  <div id="embed-root" class="embed-root theme-auto">
    <header class="embed-header">
      <p class="eyebrow">SG-FOV / instrument 01</p>
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
      <p class="eyebrow">Instrument interface / embed</p>
      <h1>Embed the FOV calculator</h1>
      <p class="dek">Add the Sim Geometry field-of-view calculator to a guide, community site,
      or rig-planning page with one iframe.</p>
    </section>

    <div class="panel copy prose-panel">
      <h2>What it is</h2>
      <p>The embed is the same flat, curved, and triple-screen calculator as the full Geometry
      Lab. It uses the same calculation engine and share-fragment format in a compact,
      single-column layout.</p>

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

const HOME_BODY = `
    <section class="home-hero">
      <div class="home-intro">
        <div>
          <p class="eyebrow">Instrument 01 / field of view</p>
          <h1>Own your view.<br><span>Start with the rig.</span></h1>
        </div>
        <p>A measurement-first instrument for turning screen geometry into a defensible sim-racing view. Your rig stays in your browser; the method stays visible.</p>
      </div>
${FOV_CALCULATOR_BODY}
    </section>

    <section class="research-section" aria-labelledby="research-title">
      <header class="section-intro">
        <p class="eyebrow">Research desk / next instruments</p>
        <h2 id="research-title">Three evidence-led workstreams.</h2>
      </header>
      <div class="research-grid">
        <article class="research-card">
          <span>01 / Value</span>
          <h3>Direct-Drive Value Lab</h3>
          <p>Official specifications and true installed cost, field by field. Research Desk comparison; we have not driven these products.</p>
        </article>
        <article class="research-card">
          <span>02 / Compatibility</span>
          <h3>Console-Safe Upgrade Planner</h3>
          <p>Platform-valid upgrade paths with the official compatibility source beside each claim.</p>
        </article>
        <article class="research-card">
          <span>03 / Data</span>
          <h3>Open CC BY Dataset</h3>
          <p>Versioned game-convention records licensed CC BY 4.0, with retrieval dates, nulls, and source-level provenance preserved.</p>
        </article>
      </div>
    </section>

    <section class="data-method" aria-labelledby="data-method-title">
      <header>
        <p class="eyebrow">Data &amp; Method</p>
        <h2 id="data-method-title">Numbers with their limits attached.</h2>
      </header>
      <div class="method-facts">
        <article>
          <span>01 / Formulas</span>
          <p>Flat spans use <code>2 × atan(size ÷ 2D)</code>. Curved panels use chord, radius, and sagitta. Triple results ray-trace the panel envelope, active image, bezel seams, and requested yaw.</p>
        </article>
        <article>
          <span>02 / Assumptions</span>
          <p>Measurements describe visible panel dimensions and eye-to-screen-center distance. Triple panels are identical; a curvature value describes a concave panel facing the viewer.</p>
        </article>
        <article>
          <span>03 / Confidence</span>
          <p>High, medium, and low grade the game-convention evidence — never the physical calculation. The dataset merges two research passes and keeps unresolved fields null instead of guessed.</p>
        </article>
      </div>
    </section>`;

export const PAGES = [
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
    path: '/',
    title: 'Sim Geometry',
    description:
      'A product-led sim-racing geometry instrument for measurable field of view, followed by source-conscious research on hardware value, compatibility, and open data.',
    styles: ['/styles/tool.css'],
    scripts: ['/js/tools/fov-ui.mjs'],
    body: HOME_BODY,
  },
];
