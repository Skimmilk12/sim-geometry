// Page registry: every static page the build renders. Bodies are authored HTML.
const FOV_TOOL_BODY = `
    <h1>The Geometry Lab</h1>
    <p class="dek">Field-of-view math for flat, curved, and triple-screen rigs — with the
    formulas, assumptions, and measurement sensitivity shown alongside every result.
    Results get a share URL that reproduces them exactly.</p>

    <div class="tool-grid">
      <form id="fov-form" class="panel" aria-label="Rig dimensions">
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
              <input id="diagonal" type="number" step="any" min="10" max="100" value="27" required>
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
              <input id="width" type="number" step="any" min="1">
            </div>
            <div class="field">
              <label for="height">Visible height<span data-unit-echo></span></label>
              <input id="height" type="number" step="any" min="1">
            </div>
          </div>
        </div>

        <div class="field">
          <label for="distance">Eye-to-screen-center distance<span data-unit-echo></span></label>
          <input id="distance" type="number" step="any" min="1" value="24" required>
        </div>

        <div class="field-check">
          <input id="curved" type="checkbox">
          <label for="curved">Curved panel</label>
        </div>
        <div id="radius-field" class="field" hidden>
          <label for="radius">Curvature radius in mm (an "1800R" panel = 1800)</label>
          <input id="radius" type="number" step="1" min="100" value="1800">
        </div>

        <div class="field-row">
          <div class="field">
            <label for="res-h">Horizontal resolution <span class="note">(optional)</span></label>
            <input id="res-h" type="number" step="1" min="1" placeholder="2560">
          </div>
          <div class="field">
            <label for="res-v">Vertical resolution</label>
            <input id="res-v" type="number" step="1" min="1" placeholder="1440">
          </div>
        </div>

        <div id="triple-fields" hidden>
          <div class="field">
            <label for="bezel">Bezel per side, visible image to cabinet edge<span data-unit-echo></span></label>
            <input id="bezel" type="number" step="any" min="0" value="0.3">
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
              <input id="yaw" type="number" step="0.01" min="0" max="90">
            </div>
          </div>
        </div>

        <button class="btn" type="submit">Calculate</button>
      </form>

      <section class="panel" aria-label="Results" aria-live="polite">
        <div id="results">
          <p class="note">Enter your rig on the left and calculate. Every output is a
          physical measurement with its assumptions listed — nothing is a guess, and
          nothing here requires an account or sends your numbers anywhere.</p>
        </div>
        <section id="game-record" class="game-record" aria-label="Selected game FOV guidance" aria-live="polite" hidden></section>
        <div id="actions" class="tool-actions" hidden>
          <button class="btn btn-quiet" type="button" id="copy-link">Copy share link</button>
          <button class="btn btn-quiet" type="button" id="copy-summary">Copy summary</button>
          <button class="btn btn-quiet" type="button" id="copy-json">Copy JSON</button>
        </div>
      </section>
    </div>
    <noscript><div class="alert alert-warn">The calculator needs JavaScript — it runs entirely
    in your browser; no data leaves the page.</div></noscript>`;

export const PAGES = [
  {
    path: '/tools/fov/',
    title: 'FOV Calculator — flat, curved & triple screens',
    description:
      'Sim racing FOV calculator with shareable results: flat, curved, and triple-screen physical spans with bezel correction, published formulas, and measurement sensitivity.',
    styles: ['/styles/tool.css'],
    scripts: ['/js/tools/fov-ui.mjs'],
    body: FOV_TOOL_BODY,
  },
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
      <h2>What's being built here</h2>
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
