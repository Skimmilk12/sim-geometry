// Long-form guide registry. Game-specific citations are resolved from the
// versioned conventions dataset so guide claims cannot silently acquire an
// unreviewed source outside that evidence record.
import fs from 'node:fs';

const gameData = JSON.parse(fs.readFileSync(
  new URL('../data/game-fov-conventions.v1.json', import.meta.url),
  'utf8',
));

function datasetSource(game, urlPart) {
  const record = gameData.records.find((entry) => entry.game === game);
  const source = record?.sources.find((entry) => entry.url.includes(urlPart));
  if (!source) throw new Error(`missing guide source for ${game}: ${urlPart}`);
  return source.url;
}

const SOURCES = Object.freeze({
  iracingTriples: datasetSource('iRacing', 'setting-up-three-monitors'),
  iracingRelease: datasetSource('iRacing', '2020-season-4-release-notes'),
  iracingCamera: datasetSource('iRacing', 'iracing-camera-tool'),
  iracingMonitorIni: datasetSource('iRacing', 'rendererDX11Monitor.ini'),
  accRelease18: datasetSource('Assetto Corsa Competizione', 'pc-update-v-1-8'),
  accHistorical505: datasetSource('Assetto Corsa Competizione', '150000147358'),
  accConvention: datasetSource('Assetto Corsa Competizione', 'driver61.com'),
});
const DATASET_HREF = '/data/game-fov-conventions.v1.json';

const toolLink = (fragment, label) => `<a class="guide-tool-link" href="/tools/fov/#${fragment}">${label}</a>`;
const cite = (url, label) => `<a href="${url}" rel="external">${label}</a>`;

const LINKS = Object.freeze({
  measured27: toolLink(
    'v=1&amp;l=s&amp;u=mm&amp;w=597.7&amp;h=336.2&amp;e=600&amp;rx=2560&amp;ry=1440',
    'Open the measured 27-inch-class example',
  ),
  iracingTriple: toolLink(
    'v=1&amp;l=t&amp;u=mm&amp;g=iracing&amp;w=597.7&amp;h=336.2&amp;e=600&amp;rx=2560&amp;ry=1440&amp;b=7&amp;y=a',
    'Open the prefilled iRacing triple-screen example',
  ),
  accSingle: toolLink(
    'v=1&amp;l=s&amp;u=mm&amp;g=assetto-corsa-competizione&amp;w=597.7&amp;h=336.2&amp;e=600&amp;rx=2560&amp;ry=1440',
    'Open the prefilled ACC vertical-FOV example',
  ),
  tripleAngle: toolLink(
    'v=1&amp;l=t&amp;u=mm&amp;w=708.5&amp;h=398.5&amp;e=650&amp;r=1000&amp;rx=2560&amp;ry=1440&amp;b=7&amp;y=a',
    'Open the prefilled wrapped-triples example',
  ),
  ultrawide49: toolLink(
    'v=1&amp;l=s&amp;u=mm&amp;w=1198.1&amp;h=336.9&amp;e=800&amp;r=1800&amp;rx=5120&amp;ry=1440',
    'Open the prefilled 49-inch 32:9, 1800R example',
  ),
  audit: toolLink(
    'v=1&amp;l=t&amp;u=mm&amp;g=iracing&amp;w=597.7&amp;h=336.2&amp;e=600&amp;rx=2560&amp;ry=1440&amp;b=7&amp;y=54.01',
    'Open one reproducible state for a calculator audit',
  ),
});

function sourceList(items) {
  return `<section class="guide-sources" aria-labelledby="guide-sources-title">
      <h2 id="guide-sources-title">External sources</h2>
      <ul>
${items.map(({ url, label, note }) => `        <li>${cite(url, label)} — ${note}</li>`).join('\n')}
      </ul>
    </section>`;
}

function guideBody({ number, title, dek, content, sources }) {
  return `<article class="guide">
    <header class="guide-header">
      <p class="eyebrow">Guide ${number} / field geometry</p>
      <h1>${title}</h1>
      <p class="dek">${dek}</p>
    </header>
    <div class="guide-prose">
${content}
${sourceList(sources)}
    </div>
  </article>`;
}

export const GUIDES = [
  {
    slug: 'how-to-measure-eye-to-screen-distance',
    title: 'How to measure eye-to-screen distance',
    homeTitle: 'Measure eye-to-screen distance accurately',
    description: 'Measure eye-to-screen distance repeatably, avoid the errors that skew FOV, and read the ±10 mm sensitivity band before entering a game setting for your rig.',
    dek: 'A ten-millimetre change can move a typical result by about 1.5 degrees from the near edge of the band to the far edge. Make the distance defensible first.',
    content: `      <p>The distance number dominates field-of-view accuracy because it describes the viewer’s position relative to every visible screen edge. In a representative flat-panel state with a 597.7 mm visible width and a nominal 600 mm eye distance, the horizontal span is about 52.9°. Move the eye point 10 mm nearer and it becomes about 53.7°; move it 10 mm farther and it becomes about 52.2°. The complete near-to-far band is roughly 1.5°. That is not a tolerance added by the calculator. It is the geometric consequence of uncertainty in one input.</p>

      <p>The flat-panel relationship is <code>span = 2 × atan(visible width ÷ (2 × eye distance))</code>. Width stays fixed while distance sits in the denominator, so a shorter distance makes the screen occupy a larger angle and a longer distance makes it occupy a smaller one. The <a href="/methodology/">methodology page</a> lists that baseline and the additional assumptions for curved and triple screens. The calculator also evaluates the same rig at distance minus 10 mm and distance plus 10 mm; those endpoints are a sensitivity band, not a promise that every person holds their head inside it.</p>

      <h2>Define the two endpoints before measuring</h2>

      <p>“Eye to screen” sounds obvious until the tape is in your hand. The eye endpoint is the midpoint between your pupils in your normal driving posture. It is not the bridge of your nose, the front of a headset, the seat headrest, or the place your face happens to be while leaning forward to read the ruler. The screen endpoint is the center of the visible image surface. It is not the front edge of the monitor stand, the bezel face, the rear shell, or a side edge.</p>

      <p>Use the visible image center because the geometry is centered on the viewing axis. For a flat screen, the shortest perpendicular line from the eye point to the panel plane reaches that center. For a curved screen, measure to the center of the panel surface, not to an edge that wraps closer to you. The curved calculation separately derives edge depth from the chord width and radius. Substituting the nearer edge distance would count the curve twice and enlarge the result incorrectly.</p>

      <h2>A repeatable measuring procedure</h2>

      <ol>
        <li><strong>Finish the seating position first.</strong> Put the seat, pedals, wheel, recline, and normal cushion arrangement where they will be used. Sit with the back and shoulders in the posture you can reproduce, looking straight ahead.</li>
        <li><strong>Mark the visible screen center.</strong> Find halfway across the lit image width and halfway up its lit image height. A small removable tape marker on the bezel aligned to each centerline is enough; do not put adhesive on the display surface.</li>
        <li><strong>Establish the eye point.</strong> A helper can sight the midpoint between the pupils from the side. Working alone, place a light straightedge beside the head at eye height without changing posture, then measure from that reference.</li>
        <li><strong>Measure along the viewing axis.</strong> Run the tape or rigid rule straight to the visible center, perpendicular to the center-panel plane. Keep it level in both the side and top views. A diagonal route to a corner is a longer hypotenuse and is not the required distance.</li>
        <li><strong>Repeat after resetting posture.</strong> Leave the seat, settle back again, and take at least two more readings. Record the individual values. If they differ materially, find the unstable reference rather than choosing the most convenient number.</li>
      </ol>

      <p>A rigid folding rule or a tape held under light tension is easier to keep straight than a slack cloth tape. A helper reduces the chance that you lean forward while reading. Precision should match repeatability: recording 603.27 mm is not useful if posture changes the endpoint by 15 mm. Millimetres are convenient for the calculation, but the interface accepts inches and centimetres and normalizes the shared state.</p>

      <h2>Common errors and what they do</h2>

      <p><strong>Measuring from the seat instead of the eyes</strong> replaces a live viewing position with a furniture dimension. Two drivers in the same seat can have different eye points, and one driver can change it with recline or a cushion. <strong>Measuring to the bezel or cabinet</strong> introduces a depth offset unrelated to the visible plane. <strong>Following the curve to an edge</strong> measures a slanted or arc path, while the tool needs center distance and visible chord width as separate inputs.</p>

      <p><strong>Leaning toward the tape</strong> usually shortens the recorded value and therefore inflates the calculated span. <strong>Using a diagonal line</strong> lengthens it and reduces the span. <strong>Measuring before the rig is loaded</strong> can miss seat compression or movement in an adjustable mount. <strong>Copying someone else’s distance</strong> discards the very dimension that locates your eyes. None of these errors can be repaired by adding decimal places later.</p>

      <p>On triples, always measure to the center screen’s visible center. The side panels are located from that center reference, their cabinet width, bezel extension, and yaw. Do not average three eye-to-panel measurements. The renderer may expose several geometry fields, but the physical origin remains the centered eye point. For example, iRacing’s documented triple-monitor workflow asks for monitor width, bezel width, viewing distance, and screen angle in its calculator (${cite(SOURCES.iracingTriples, 'official iRacing setup guide')}). Its camera documentation treats driving-camera FOV controls as a separate adjustment surface (${cite(SOURCES.iracingCamera, 'official iRacing Camera Tool guide')}). That distinction is exactly why the physical measurement should be settled before a game value is interpreted.</p>

      <h2>Use the sensitivity band as a measurement check</h2>

      <p>Enter the measured visible dimensions and the average repeatable distance, then read the ±10 mm band beside the central result. If the two endpoints are close enough for the decision you are making, the measurement is adequately stable for that purpose. If the band crosses a rounding boundary in a game control, retain the unrounded physical result in your notes and document which displayed value you entered. If the band is wide, improve the posture and endpoint references before adjusting the screen.</p>

      <p>The prefilled state below uses 597.7 × 336.2 mm at 600 mm. Change only the eye distance to each of your repeated readings and watch the physical span move. Because the dimensions live in the fragment, you can keep the exact state with the rig record rather than retyping it from memory.</p>

      <p>${LINKS.measured27}</p>

      <h2>What to record with the result</h2>

      <p>A useful record contains the date, seat position or detent, normal posture, eye-to-visible-center distance, visible width and height, curve radius if present, and the smallest and largest repeated distance. For triples, add bezel per side and side angle from straight. This makes a later change diagnosable: a new seat rail position changes distance, while a new monitor with the same center location changes width. Recalculate when either changes.</p>

      <p>The goal is not to freeze a person to one millimetre. It is to separate known physical geometry from posture variation and then show the effect of that variation. A centered, repeatable measurement plus its sensitivity band is more informative than a single over-precise number with no method behind it.</p>`,
    sources: [
      { url: SOURCES.iracingTriples, label: 'iRacing: Setting up three monitors', note: 'physical inputs used by the built-in monitor calculator' },
      { url: SOURCES.iracingCamera, label: 'iRacing: Camera Tool', note: 'documented camera and driving-FOV adjustment context' },
    ],
  },
  {
    slug: 'iracing-fov-and-triples',
    title: 'iRacing FOV calculator: settings and triple-screen geometry',
    homeTitle: 'Enter the right iRacing FOV',
    description: 'Map measured single and triple-screen geometry into iRacing’s FOV controls, including its built-in calculator and three-projection rendering mode correctly.',
    dek: 'For a single display, map the physical horizontal span. For native triples, map the full visible envelope across all three projections—not the center panel alone.',
    content: `      <p>iRacing is one of the cases where the number in the field and the physical layout can be connected directly, but the connection changes with screen mode. The <a href="${DATASET_HREF}">published conventions record</a> identifies its FOV axis as horizontal and its basis as the full rendered span. On a single display, that maps to the calculator’s <code>horizontalSpan</code>. With native three-projection rendering, it maps to <code>visibleEnvelope</code>: the angle from the leftmost visible image edge to the rightmost visible image edge across the complete rig. The evidence grade remains medium because the official material establishes the geometry workflow and multi-projection behavior (${cite(SOURCES.iracingTriples, 'official iRacing setup evidence')}), while the explicit horizontal-axis naming rests on converging secondary evidence rather than a first-party sentence.</p>

      <h2>What the iRacing calculator field represents</h2>

      <p>The official triple-monitor instructions direct the driver to select a three-screen display mode, enter screen type and physical measurements, and use the Field of View Calculator under the Monitor section (${cite(SOURCES.iracingTriples, 'official iRacing triple-monitor instructions')}). That makes the control geometry-driven: monitor width, bezel width, viewing distance, and side-screen angle describe the physical arrangement from which the rendered view is derived (${cite(SOURCES.iracingTriples, 'official setup field list')}). The resulting driving FOV is expressed in degrees; the conventions record maps it to horizontal full span, with the evidence qualification above.</p>

      <p>This is not the same operation as choosing a camera position. iRacing’s Camera Tool documentation describes the in-sim bracket controls for driving-camera FOV and separate camera-editing controls (${cite(SOURCES.iracingCamera, 'official Camera Tool documentation')}). Changing projection angle and moving the virtual camera can both alter what appears in the frame, but they do not preserve the same perspective. Establish the physical FOV first. Use camera position for the remaining seating or framing task without treating it as a replacement distance.</p>

      <h2>Why “Render scene using 3 projections” matters</h2>

      <p>The official setup distinguishes ordinary spanning from rendering the scene with three projections and instructs triple users to enable that mode (${cite(SOURCES.iracingTriples, 'official three-projection setup')}). In geometric terms, each monitor receives its own camera frustum aligned to that panel. A straight object crossing a seam can then continue through the change in monitor angle without asking one flat projection to pretend all three panels share a plane.</p>

      <p>iRacing’s release notes document a 270-degree maximum for three-monitor driving-camera FOV, alongside changes associated with triple-screen rendering (${cite(SOURCES.iracingRelease, 'official 2020 Season 4 release notes')}). That is a software limit, not a target and not evidence that a physical rig should wrap 270 degrees. Enter measured geometry; let the layout determine the required envelope. No verified step size or single-screen maximum is available, so do not infer either one.</p>

      <h2>Match the result to iRacing</h2>

      <p>For one flat display, the calculator draws rays from the eye point to the two visible horizontal edges and reports the included angle. That is <code>horizontalSpan</code>, and it is the relevant single-screen output for the iRacing record. A curved single display uses the visible chord, radius, and center distance to locate its nearer edges, then reports the physical horizontal span. It remains a physical baseline: one rectilinear projection cannot align with every point of a curved surface simultaneously.</p>

      <p>For identical triples, the calculator constructs the center panel and both yawed side panels in a top-down ray model. <code>centerSpan</code> is only the middle active image. <code>visibleEnvelope</code> reaches the outer active edge on each side and therefore describes what all three projections collectively cover. The iRacing dataset mapping explicitly chooses that full envelope for triples. Copying the center span into the driving field would discard both side projections and understate the intended view.</p>

      <p>Bezels do not add visible scenery. They create two physical gaps between active images. The calculator reports the angular seam occlusion separately and can estimate hidden pixels when resolution is present. This matches the purpose of iRacing’s documented bezel-width input: geometry has to account for the cabinet interruption while preserving the world behind it (${cite(SOURCES.iracingTriples, 'official bezel-width guidance')}). Measure from the visible image edge to the cabinet edge on one side of one monitor; the seam between two identical cabinets contains two such sides.</p>

      <h2>A measured workflow</h2>

      <ol>
        <li>Set the seat and screen positions, then measure from the midpoint between the eyes to the center of the center panel’s visible surface.</li>
        <li>Measure active image width rather than accepting the marketed diagonal as exact. For triples, measure bezel per side and the side angle from straight.</li>
        <li>Open the prefilled state below and replace its dimensions. Select recommended yaw only if you want to compare against the published chord-tangent convention; otherwise enter the measured angle.</li>
        <li>Read <code>horizontal span</code> for a single display or <code>visible envelope</code> for triples. Keep the ±10 mm sensitivity endpoints with the number.</li>
        <li>In iRacing, use the official monitor setup and geometry calculator, and enable three projections for the native triple workflow (${cite(SOURCES.iracingTriples, 'official configuration procedure')}). Compare the game result with the same physical inputs instead of forcing a value copied from a different rig.</li>
      </ol>

      <p>${LINKS.iracingTriple}</p>

      <h2>Avoid unverified configuration-file claims</h2>

      <p>The <a href="${DATASET_HREF}">evidence record</a> names <code>Documents\\iRacing\\app.ini</code> for view-related configuration and <code>rendererDX11Monitor.ini</code> for monitor geometry, but it leaves the executable FOV key null. The sampled monitor file exposes screen dimensions, angle, bezel, and per-monitor rendering state (${cite(SOURCES.iracingMonitorIni, 'dataset-linked rendererDX11Monitor.ini example')}); it is not evidence for a degrees key. Because community references to another key lack direct support, use the documented UI path and calculator.</p>

      <h2>Reading disagreements responsibly</h2>

      <p>If iRacing and this tool differ, first confirm that both received the same visible width, center distance, bezel definition, and side angle. Then confirm the render mode. A center-panel angle, a full visible envelope, and a bezel-corrected rendered span are different quantities even when each is internally calculated correctly. Round only at the input boundary the game provides, and retain the higher-precision physical record outside the game.</p>

      <p>The practical rule is compact: one screen uses the horizontal physical span; native three-projection triples use the full visible envelope. Everything else—seat framing, horizon, mirrors, and camera translation—is a separate adjustment and should not be used to conceal a geometry mismatch.</p>`,
    sources: [
      { url: SOURCES.iracingTriples, label: 'iRacing: Setting up three monitors', note: 'official calculator inputs and three-projection workflow' },
      { url: SOURCES.iracingRelease, label: 'iRacing: 2020 Season 4 release notes', note: 'official triple-driving-camera limit and rendering context' },
      { url: SOURCES.iracingCamera, label: 'iRacing: Camera Tool', note: 'official driving-camera FOV control context' },
      { url: SOURCES.iracingMonitorIni, label: 'rendererDX11Monitor.ini example', note: 'dataset-linked community monitor-geometry sample' },
    ],
  },
  {
    slug: 'acc-fov-vertical',
    title: 'ACC FOV calculator: the vertical convention and triples',
    homeTitle: 'Choose the right ACC FOV value',
    description: 'Understand ACC’s vertical FOV convention, the historical 505 single-span guidance, current Triple Screen mode, and when Pannini correction applies today.',
    dek: 'ACC’s single-display field is treated as vertical FOV. Its triple story changed: a historical stretched-span answer now sits beside a distinct Triple Screen rendering mode.',
    content: `      <p>Assetto Corsa Competizione is a useful lesson in dating evidence. A still-accessible 505 Games support answer describes triple-monitor support as one image stretched across three screens (${cite(SOURCES.accHistorical505, 'historical 505 Games answer')}). Later official v1.8 release notes refer to a distinct “Triple Screen rendering mode” (${cite(SOURCES.accRelease18, 'official ACC v1.8 notes')}). Both documents can be authentic and still describe different software eras. The <a href="${DATASET_HREF}">published dataset record</a> marks the 505 answer as historical so it does not override the newer rendering path.</p>

      <h2>The single-display field is vertical</h2>

      <p>The conventions record maps ACC’s single-screen FOV control to <code>verticalSpan</code>. The vertical naming, the 10–90 degree range, and the View Settings path come from converging specialist material rather than current first-party documentation, so the record is graded medium confidence (${cite(SOURCES.accConvention, 'dataset-listed ACC FOV convention source')}). A vertical angle describes the rays from the eye to the top and bottom of the visible image. It is independent of aspect ratio as a setting convention, although the horizontal view produced from it depends on the render aspect.</p>

      <p>That distinction explains why an ACC number can look much smaller than the horizontal result from a calculator without being inconsistent. For the prefilled 597.7 × 336.2 mm panel at 600 mm, the physical horizontal span is about 52.9° while the vertical span is about 31.3°. Entering 52.9 into a vertical field would ask for a much wider projection than the measured screen. For a single display, read the tool’s vertical result and preserve the same center distance used to derive it.</p>

      <h2>The 505 answer is historical evidence, not noise</h2>

      <p>The 505 support article says ACC’s triple-monitor support creates a single rendering surface spanning all three monitors and advises configuring the total resolution (${cite(SOURCES.accHistorical505, 'historical 505 Games support article')}). Read on its own, that would imply single-span rendering: one wide projection later bent across angled physical panels. Such a projection cannot provide a separate off-axis frustum for each monitor, so perspective at the side panels differs from native multi-projection geometry.</p>

      <p>The old page captures a prior product state rather than a current setup path. It predates v1.8, whose official announcement explicitly mentions fixes for bezel lines and DLSS/FSR behavior in “Triple Screen rendering mode” (${cite(SOURCES.accRelease18, 'official ACC v1.8 release notes')}). Those details only make sense in the context of a named, current triple rendering path. Use the newer official evidence for present-tense guidance and the older page only as product history.</p>

      <h2>Current triples are physical-geometry inputs</h2>

      <p>For current ACC triples, the dataset classifies the mode as native multi-projection and maps the calculator output to <code>physical-geometry</code>, not to a single degrees value. The official v1.8 notes establish that the distinct rendering mode exists (${cite(SOURCES.accRelease18, 'official Triple Screen mode evidence')}); they do not publish a complete field-by-field setup procedure. Do not rely on unverified JSON keys, exact control names, or configuration recipes.</p>

      <p>Measure the center distance, visible panel width, bezel per side, and actual side angle, calculate the physical layout, and enter those same physical quantities in ACC’s triple-screen controls where the current interface asks for them. The <a href="${DATASET_HREF}">ACC record</a> leaves the exact active-FOV JSON key null because the available community field names lack direct supporting evidence.</p>

      <p>A triple renderer needs more than the single vertical FOV because it must locate three projection planes. The calculator reports the full visible envelope, center-panel span, active image coverage, and seam occlusion. ACC’s mapping remains <code>physical-geometry</code>: use the measured dimensions to configure the native mode rather than translating the entire rig into one vertical or horizontal field.</p>

      <h2>Where Pannini correction fits</h2>

      <p>The dataset also records Pannini projection correction for non-triple wide rendering in ACC (${cite(SOURCES.accConvention, 'dataset-listed ACC projection guidance')}). Pannini is a projection choice, not a new physical FOV convention. It can redistribute distortion across a wide single render, which is relevant to an ultrawide or to a spanned output that is not using the dedicated triple path. It does not turn one projection into three independently aligned frustums, and it should not be mixed into a claim that the physical monitor angle has changed.</p>

      <p>Keep three layers separate: the measured screen geometry, the angular convention used by the game’s FOV field, and any projection correction applied during rendering. A vertical angle can be correct while a wide rectilinear image stretches near its edges. A Pannini-adjusted image can redistribute that appearance while retaining the same physical monitor. Native triples solve a different problem by assigning projections to separately angled panels.</p>

      <h2>Single-screen procedure</h2>

      <ol>
        <li>Measure visible image width and height, plus eye-to-visible-center distance in the driving posture.</li>
        <li>Open the prefilled state and replace those dimensions. If the display is curved, add its radius and keep width as the visible chord.</li>
        <li>Use the vertical physical span as the ACC single-display baseline because the dataset maps ACC single to <code>verticalSpan</code> (${cite(SOURCES.accConvention, 'vertical-convention source')}).</li>
        <li>Read the ±10 mm sensitivity band. If the game control forces rounding, record both the physical result and the entered value.</li>
        <li>Adjust camera position separately from FOV; do not compensate for an incorrect projection angle by moving the virtual eye.</li>
      </ol>

      <p>${LINKS.accSingle}</p>

      <h2>Triple-screen procedure</h2>

      <p>Select the current Triple Screen rendering mode documented by the v1.8-era evidence (${cite(SOURCES.accRelease18, 'official current-mode evidence')}). Enter measured geometry in the current interface, retaining the exact side angle and bezel definition in your rig record. If a guide repeats only the stretched-span answer, check its date: it may be accurately quoting the historical 505 document (${cite(SOURCES.accHistorical505, 'historical single-span evidence')}) while missing the later mode.</p>

      <p>This history is worth preserving because it demonstrates how a citation can be genuine but temporally wrong for present-tense advice. The answer is not to erase old evidence or blindly prefer a newer date. It is to identify what each source actually establishes, attach it to a software era, and leave unsupported details null. That is why the ACC record can tell a richer and more honest story than a timeless settings table.</p>`,
    sources: [
      { url: SOURCES.accRelease18, label: 'ACC PC update v1.8', note: 'official current Triple Screen rendering-mode evidence' },
      { url: SOURCES.accHistorical505, label: '505 Games: Does ACC offer triple-monitor support?', note: 'official historical single-span description' },
      { url: SOURCES.accConvention, label: 'Driver61 ACC FOV guide', note: 'dataset-listed specialist source for the vertical convention and projection context' },
    ],
  },
  {
    slug: 'triple-monitor-angle-and-bezels',
    title: 'Triple-monitor angle and bezels, as geometry',
    homeTitle: 'Set triple-screen angles and bezels',
    description: 'Set triple-monitor angle with the chord-tangent rule, model bezel seam occlusion and hidden pixels, and understand the WRAPS_BEHIND_EYE warning clearly.',
    dek: 'Angle locates the side panels; bezels remove visible continuity at the seams. Treat both as measured geometry, not decorative corrections.',
    content: `      <p>A triple-screen rig is not three copies of one field-of-view number. From the eye point, the center panel and two rotated side panels occupy different rays. The angle decides where the outer edges land; the bezels decide how much of the scene is hidden at each join. A useful model must therefore locate the panels, trace the visible endpoints, and keep the missing seam intervals separate from the active image.</p>

      <h2>The chord-tangent rule</h2>

      <p>The suggested side angle uses the <em>flat-chord-tangent</em> mounting convention: <code>yaw = 2 × atan(cabinet width ÷ (2 × eye distance))</code>. Cabinet width is visible chord width plus one bezel on each side. The result is the angle that one complete flat cabinet subtends at the centered eye. Apply that yaw from straight to each side monitor. Treat it as a repeatable starting convention, not an optimization, universal preference, or exact tangency condition for every curved surface.</p>

      <p>The rule is useful because it connects the hinge geometry to quantities you can measure. A wider cabinet or shorter eye distance produces a larger subtended angle and therefore a more aggressive wrap. A narrower cabinet or longer distance produces a smaller angle. On curved monitors, the calculator still applies the recommendation to the measured chord; curvature changes the traced surface and visible spans, not the name or basis of this mounting convention.</p>

      <p>You do not have to use the recommendation. Choose manual yaw and enter the actual angle from straight if the mount is already fixed, if clearances control the layout, or if you are documenting a different convention. The results then describe that measured rig and show the difference from nominal when a chord-tangent comparison exists. If the cabinet subtends more than 90°, the tool cannot offer a recommendation within its permitted range, but a valid manual layout may still be calculable.</p>

      <h2>Measure the angle consistently</h2>

      <p>“60-degree triples” is ambiguous unless the zero direction is named. In this calculator, zero means coplanar with the center screen; the displayed side angle is the rotation from straight, toward the viewer. Measure the panel chord or cabinet face in a top view. Do not use the interior angle between monitors without conversion: an interior hinge angle and a yaw-from-straight value are supplements under common measuring setups.</p>

      <p>Measure both sides instead of assuming the mount is symmetric. The current model accepts identical panels and symmetric yaw, so record any mismatch before averaging. A large left-right difference is information about the physical rig, not noise to conceal. Align the visible center of the middle panel to the eye point first, because the ray model assumes the eye is centered on that panel.</p>

      <h2>Why bezel width is not cosmetic</h2>

      <p>The bezel input is one side of one monitor: the distance from the active image edge to the cabinet edge. At a seam, the right bezel of one cabinet meets the left bezel of the next, so identical monitors create a physical gap of <code>2 × bezel per side</code>. The ray interval behind that gap is real scenery, but it is occluded by cabinet material. Correct bezel handling preserves the world’s scale across the interruption rather than squeezing all scenery into the visible pixels.</p>

      <p>The calculator reports seam occlusion as an angle. If you provide horizontal resolution, it also estimates hidden pixels from the seam width relative to active width. For a 597.7 mm active panel, 7 mm per-side bezels, and 2560 horizontal pixels per monitor, the 14 mm seam corresponds to about 60 hidden pixels at each join. Those pixels are an equivalent accounting device for a bezel-corrected span; they are not physical pixels under the plastic.</p>

      <p>Native game modes expose geometry for the same underlying reason. iRacing’s official triple setup asks for bezel width, monitor width, viewing distance, and angle and provides a three-projection option (${cite(SOURCES.iracingTriples, 'official iRacing triple setup')}). ACC’s official v1.8 notes refer to bezel-line fixes inside its named Triple Screen rendering mode (${cite(SOURCES.accRelease18, 'official ACC v1.8 notes')}). These game-specific facts come from the conventions dataset; they illustrate why seams and panel orientation belong in rendering geometry rather than in a single multiplied FOV.</p>

      <h2>Visible envelope versus active coverage</h2>

      <p><code>visibleEnvelope</code> is the full angular reach from the outer visible edge of the left panel to the outer visible edge of the right panel. <code>activeImageCoverage</code> subtracts the two angular seam occlusions. The envelope answers “how far around the eye do the displays reach?” Coverage answers “how much of that interval emits image?” The two should not be collapsed, because a larger bezel can reduce coverage without moving the outer edges very much.</p>

      <p><code>centerSpan</code> is a third quantity: the angle of the middle active image alone. Multiplying it by three assumes three angular intervals can be added without regard to rotation or seam location. The ray model instead transforms each side panel around its hinge and measures its endpoints from the eye. This remains valid for manual yaw, where three times the center span can be especially misleading.</p>

      <h2>What WRAPS_BEHIND_EYE means</h2>

      <p>The warning <code>WRAPS_BEHIND_EYE</code> appears when the full visible envelope exceeds 180°. Plainly: at least one outer visible edge lies behind the plane passing left-to-right through the eye. The screen may still be physically in front of your face and the calculation may remain defined; “behind” refers to the direction of the sight ray relative to the eye plane, not to the entire monitor being behind the seat.</p>

      <p>The calculator returns the result with a warning because a wrap slightly beyond 180° is still a meaningful description of a layout. Inspect usability, renderer limits, head clearance, and whether the entered yaw and curve orientation match reality. The warning is not an automatic instruction to reduce the angle. More severe cases—folded geometry, a non-monotonic curved arc that endpoint tracing would under-report, or panel edges reaching the eye plane—do not produce a numeric result.</p>

      <p>The prefilled example uses three 708.5 mm-wide, 1000R panels, 7 mm bezels, 650 mm center distance, and recommended chord-tangent yaw. Its visible envelope is about 183.7°, so it demonstrates the warning without hiding the numeric result.</p>

      <p>${LINKS.tripleAngle}</p>

      <h2>Audit the physical rig</h2>

      <p>Record active width, cabinet width, bezel per side, center distance, left and right yaw, and curve radius. Check that bezel was not entered as the total seam; doing so doubles the occlusion. Check that angle was measured from straight rather than copied as an interior hinge angle. Finally, compare the calculator’s assumptions on the <a href="/methodology/">methodology page</a> with the mount in front of you. The result is only as specific as the geometry you actually supplied.</p>`,
    sources: [
      { url: SOURCES.iracingTriples, label: 'iRacing: Setting up three monitors', note: 'official example of width, bezel, distance, angle, and three projections' },
      { url: SOURCES.accRelease18, label: 'ACC PC update v1.8', note: 'official Triple Screen rendering-mode and bezel-line context' },
    ],
  },
  {
    slug: 'ultrawide-49-fov',
    title: '49-inch ultrawide FOV: chord, curve, and distance',
    homeTitle: 'Calculate curved 49-inch ultrawide FOV',
    description: 'Calculate 49-inch 32:9 ultrawide FOV from visible chord, center distance, and curve radius; see why concave edges widen the physical span and sensitivity.',
    dek: 'A 49-inch label and 32:9 ratio establish a nominal chord. Curvature then moves the edges toward the eye, making the physical span wider than the flat baseline.',
    content: `      <p>A 49-inch 32:9 display is wide enough that the definition of width and the direction of curvature materially affect the result. From the marketed diagonal and aspect ratio, the nominal visible rectangle is about 1198.1 mm wide and 336.9 mm high. At an 800 mm eye-to-center distance, a flat chord of that width spans about 73.6° horizontally. Model the same chord as a concave 1800R panel and the physical span becomes about 81.3°. The curve does not make the chord longer; it brings the visible edges closer to the eye.</p>

      <h2>Start with 32:9 chord math</h2>

      <p>A diagonal alone does not determine width. For aspect ratio <code>a:b</code>, visible width is <code>diagonal × a ÷ √(a² + b²)</code>, and height substitutes <code>b</code>. With 49 inches converted to 1244.6 mm and a 32:9 ratio, those relationships yield the nominal 1198.1 × 336.9 mm rectangle. The actual lit image can differ from the marketed nominal, so a direct visible-width and visible-height measurement is the stronger input.</p>

      <p>For the flat baseline, the published relationship is <code>2 × atan(width ÷ (2 × distance))</code>. The screen is treated as a straight chord centered perpendicular to the viewing axis. That baseline is valuable even for a curved monitor because it isolates what curvature changes. The <a href="/methodology/">methodology page</a> lists the flat formula and the curved chord-radius-sagitta model.</p>

      <h2>What 1800R means in this model</h2>

      <p>An 1800R entry supplies a 1800 mm circle radius. The calculator treats the panel as a concave arc facing the viewer and treats the measured visible width as its chord, not its arc length. Half the chord and the radius locate the curved edge. The sagitta—the depth from the chord plane to the arc at its center—is <code>R − √(R² − (W ÷ 2)²)</code>.</p>

      <p>For the nominal 49-inch 32:9 chord at 1800R, sagitta is about 102.6 mm. Because the eye distance is measured to the center surface, the edges sit at an effective depth of about <code>800 − 102.6 = 697.4 mm</code>. The physical span is then <code>2 × atan2(W ÷ 2, edge depth)</code>, producing the wider 81.3° result.</p>

      <p>This is the concave insight: the center of the panel is farthest from the eye along the viewing axis, while the wrapped edges advance toward it. Using the flat formula with 800 mm sends rays to imaginary edges in the center plane and under-reports the physical angle. Using 697.4 mm as though it were the center distance would make the vertical and other center-plane relationships wrong. The curved model needs both positions, derived from chord and radius.</p>

      <h2>Curved width is not arc length</h2>

      <p>A flexible tape following the glass measures an arc. The calculator’s width field expects the straight visible chord between the left and right image edges. Feeding arc length into a chord formula spreads the endpoints too far apart and can even describe an impossible circle when half-width exceeds radius. If direct chord measurement is awkward, use a straight rule, a taut non-stretch line between aligned edge references, or the nominal diagonal calculation with an explicit note that the dimension was inferred.</p>

      <p>Curve orientation matters just as much. The model assumes a normal concave monitor wrapping toward the viewer. A convex surface would push edges away and requires different geometry. Radius must also be paired with the screen it describes; entering 1000 because a different model is “1000R” is not a sensitivity check—it is a different panel.</p>

      <h2>Distance sensitivity on a wide chord</h2>

      <p>At this width, small changes in center distance remain visible in the angle. In the prefilled 1800R example, the ±10 mm probes move the horizontal result around the central 81.3° value. The near endpoint is larger because every edge ray opens as the eye moves forward; the far endpoint is smaller. Treat the displayed range as the consequence of measurement uncertainty and posture, not as a menu of equally correct settings.</p>

      <p>Measure from the midpoint between the pupils to the center of the visible curved surface while seated normally. Do not measure to an edge, because its roughly 697 mm depth in this example is already derived by the curve model. Measure visible height separately if possible. The vertical span is calculated at the panel’s center plane because a single projection cannot make every curved-surface pixel geometrically exact.</p>

      <h2>Projection convention still comes after geometry</h2>

      <p>The 81.3° figure is a physical horizontal span, not automatically the number for every game. A game may ask for horizontal or vertical FOV, may define a triple span differently, or may provide a projection correction. ACC, for example, maps to a vertical single-screen convention based on the listed specialist source (${cite(SOURCES.accConvention, 'ACC convention source')}). The same record notes Pannini correction for non-triple wide rendering (${cite(SOURCES.accConvention, 'ACC projection guidance')}). That correction changes projection behavior; it does not change the monitor’s measured chord, radius, or physical angle.</p>

      <p>The historical ACC support page described a single image stretched across three monitors (${cite(SOURCES.accHistorical505, 'historical 505 Games span description')}), while current official v1.8 evidence names a dedicated Triple Screen rendering mode (${cite(SOURCES.accRelease18, 'official ACC v1.8 notes')}). The contrast matters to ultrawide owners because “wide rendering” is not one universal projection. Always identify the current game mode before converting the physical span into a setting.</p>

      <h2>Work the prefilled state</h2>

      <p>The link below contains 1198.1 × 336.9 mm, 800 mm center distance, 1800 mm radius, and 5120 × 1440 resolution. First note the curved span and sensitivity. Then uncheck curved while leaving width and distance unchanged to recover the flat-chord baseline. Finally replace 1198.1 with your direct visible chord measurement. That sequence isolates the effect of curvature from the effect of dimensional uncertainty.</p>

      <p>${LINKS.ultrawide49}</p>

      <p>Keep the shared fragment with the measurement record. If screen position changes, update distance; if the monitor changes, update chord, height, and radius. Resolution affects pixels-per-degree, not the physical angle. This separation prevents a familiar category error: treating a larger pixel count as though it made the display occupy more of the driver’s view.</p>`,
    sources: [
      { url: SOURCES.accConvention, label: 'Driver61 ACC FOV guide', note: 'dataset-listed convention and Pannini context for a wide-rendering example' },
      { url: SOURCES.accHistorical505, label: '505 Games historical triple-support answer', note: 'historical single-span rendering context' },
      { url: SOURCES.accRelease18, label: 'ACC PC update v1.8', note: 'official current Triple Screen mode context' },
    ],
  },
  {
    slug: 'why-fov-calculators-disagree',
    title: 'Why FOV calculators disagree',
    homeTitle: 'Find why two FOV results differ',
    description: 'Audit disagreements between FOV calculators by checking axis conventions, span definitions, rounding, curved-chord assumptions, and game mapping methodically.',
    dek: 'Two calculators can use correct trigonometry and return different numbers because they answer different questions. Audit the quantity before judging the arithmetic.',
    content: `      <p>When two FOV calculators disagree, the tempting response is to compare their largest displayed numbers and decide that one formula must be wrong. Often the arithmetic is not the disagreement. One tool reports a horizontal physical span, another reports vertical projection FOV, a third reports only the center screen, and a fourth assumes a curved screen is flat. Until the quantity, geometry, and game convention match, the numbers are not candidates for direct comparison.</p>

      <h2>Axis: horizontal and vertical are different angles</h2>

      <p>For a centered flat rectangle, horizontal span uses visible width and vertical span uses visible height: <code>2 × atan(size ÷ (2 × distance))</code>. On a 16:9 panel, width is larger than height, so the horizontal angle is larger. A result near 53° horizontal and another near 31° vertical can describe the same 597.7 × 336.2 mm screen at the same 600 mm distance.</p>

      <p>Aspect-ratio conversion only works when the projection assumptions are compatible. A vertical setting can generate a horizontal render angle from aspect ratio, but that rendered angle is not automatically the physical span of a curved display or a multi-projection triple rig. Label every copied number <em>horizontal</em> or <em>vertical</em> before comparing it. If a calculator does not label its axis, treat the result as unresolved rather than inferring the axis from its magnitude.</p>

      <p>Game conventions make the distinction operational. The conventions record maps iRacing single displays to horizontal span, with official sources establishing its geometry calculator and rendering workflow while explicit axis naming remains the record’s evidence limitation (${cite(SOURCES.iracingTriples, 'official iRacing setup evidence')}). ACC single displays map to vertical span on the listed specialist evidence (${cite(SOURCES.accConvention, 'ACC vertical-convention source')}). Copying the same numeric field between those games would ignore the documented convention difference.</p>

      <h2>Span: which edges define the number?</h2>

      <p>A single screen has an intuitive left edge and right edge. Triples introduce several defensible spans. <code>centerSpan</code> covers only the middle active image. <code>visibleEnvelope</code> runs from the outer visible edge on the left side panel to the outer visible edge on the right. <code>activeImageCoverage</code> subtracts the two bezel occlusions from that envelope. A renderer may also describe a bezel-corrected virtual pixel span.</p>

      <p>These quantities answer different questions, so multiplying the center span by three is not a neutral shortcut. Side panels rotate around hinges; their endpoints occupy rays determined by yaw and distance. Bezels interrupt the active image without necessarily moving the outer envelope by the same amount. Ask a calculator whether its triple result is per panel, center only, total visible envelope, or a rendered correction.</p>

      <p>Game mode decides which span matters. iRacing’s official instructions distinguish three-projection rendering and gather width, bezel, distance, and angle (${cite(SOURCES.iracingTriples, 'official iRacing triple workflow')}); its native triple mapping uses the full <code>visibleEnvelope</code>. ACC’s current record instead maps triples to physical geometry, supported by official v1.8 evidence for a named Triple Screen rendering mode (${cite(SOURCES.accRelease18, 'official ACC v1.8 mode evidence')}). Do not force either case into an invented total-degrees field.</p>

      <h2>Curvature: chord, arc, and edge depth</h2>

      <p>A flat calculator places both edges in the plane of the screen center. This calculator treats curved-screen visible width as a chord of a concave circle. Radius and chord determine sagitta; the edges then sit closer to the eye than the center, which widens the physical angle. Another tool may treat width as arc length, assume eye distance equals curve radius, approximate the curve as flat, or report the projection angle instead of the physical edge span.</p>

      <p>None of those choices should be hidden behind a generic “curved” checkbox. Record whether width means straight chord or surface-following arc, whether distance ends at the center or edge, whether the panel is concave, and what the returned angle represents. At 49-inch-class 32:9 dimensions, 1800R, and 800 mm center distance, this calculator reports about 81.3° physical horizontal span versus about 73.6° for the same chord treated as flat. The gap comes from a declared geometric assumption.</p>

      <h2>Inputs: marketed dimensions versus visible dimensions</h2>

      <p>Diagonal and aspect ratio infer an ideal visible rectangle. Direct active-image width and height describe the actual endpoints used by the ray calculation. A calculator may include the bezel in screen width, use a manufacturer’s nominal diagonal, or round inch-to-millimetre conversion before applying trigonometry. Eye distance can likewise be measured to the panel center, cabinet, stand, or an edge of a curve. Small input differences become angular differences.</p>

      <p>For a fair audit, give both calculators the same visible width, visible height, and eye-to-visible-center distance in the same unit. On triples, align the definition of bezel—per side or total seam—and the definition of angle—yaw from straight or interior hinge angle. On curves, align radius and chord meaning. If a field cannot be made equivalent, note the mismatch and stop claiming a formula comparison.</p>

      <h2>Rounding and presentation</h2>

      <p>Rounding can occur in the measurements, internal calculation, displayed result, or game control. A tool that shows whole degrees may have computed more precisely; a game slider may accept a step the documentation does not state. Compare unrounded outputs when available, then round once at the final interface boundary. Do not add false precision by converting a whole-degree answer into a decimal.</p>

      <p>Sensitivity can also look like disagreement. This calculator evaluates the same rig at eye distance minus and plus 10 mm. If another result lies within that band, the first question is whether the physical eye point is repeatable—not whether one tool should be tuned to match the other. The band quantifies one input dependency; it does not certify either calculator.</p>

      <h2>A seven-question audit</h2>

      <ol>
        <li><strong>What is the output axis?</strong> Horizontal, vertical, or undisclosed?</li>
        <li><strong>What is the span basis?</strong> One panel, center panel, full envelope, active coverage, or a corrected render span?</li>
        <li><strong>What projection is assumed?</strong> Flat rectilinear, curved physical surface, Pannini-adjusted, or native multi-projection?</li>
        <li><strong>What do width and distance mean?</strong> Visible chord and center surface, or some cabinet and arc alternative?</li>
        <li><strong>How are triples defined?</strong> Per-side bezel versus total seam; yaw from straight versus interior angle?</li>
        <li><strong>Where does rounding happen?</strong> Input, calculation, display, or the game field?</li>
        <li><strong>What evidence maps the physical result to the game?</strong> Current official documentation, dated specialist evidence, or an unlabeled assumption?</li>
      </ol>

      <h2>Check this calculator too</h2>

      <p>Use the <a href="/methodology/">published formulas and assumptions</a> to align input definitions and output names before comparing results. If your rig does not match an assumption, record the mismatch instead of treating the two numbers as equivalent.</p>

      <p>The link below freezes a triple state with measured dimensions, resolution, bezel, manual 54.01° yaw, and the iRacing selection. Give those same normalized inputs to another calculator. Compare center span with center span and envelope with envelope. If the result still differs, the remaining discrepancy is narrow enough to investigate at the formula or projection layer.</p>

      <p>${LINKS.audit}</p>

      <p>A calculator disagreement becomes useful when it reveals an unnamed convention. Preserve the inputs, output label, formula assumptions, game evidence, and rounding boundary. Once those are visible, “which number is right?” becomes the more answerable question: “which number describes the quantity this renderer and this physical rig actually need?”</p>`,
    sources: [
      { url: SOURCES.iracingTriples, label: 'iRacing: Setting up three monitors', note: 'official geometry-calculator and three-projection evidence' },
      { url: SOURCES.accRelease18, label: 'ACC PC update v1.8', note: 'official current Triple Screen rendering-mode evidence' },
      { url: SOURCES.accConvention, label: 'Driver61 ACC FOV guide', note: 'dataset-listed evidence for ACC’s vertical convention' },
    ],
  },
];

// Keep presentation construction outside the authored guide objects so tests
// can inspect titles, descriptions, source registries, and raw prose directly.
export const GUIDE_PAGES = GUIDES.map((guide, index) => ({
  path: `/guides/${guide.slug}/`,
  title: guide.title,
  description: guide.description,
  body: guideBody({
    number: String(index + 1).padStart(2, '0'),
    title: guide.title,
    dek: guide.dek,
    content: guide.content,
    sources: guide.sources,
  }),
}));

const GUIDE_HUB_BODY = `<section class="page-intro guide-hub-intro">
      <p class="eyebrow">FOV setup / six guides</p>
      <h1>Get from rig measurements to the right game setting.</h1>
      <p class="dek">Measure your screen and seating position, identify the angle your game expects, and avoid common single, curved, and triple-screen mistakes.</p>
    </section>
    <section class="guides-grid" aria-label="Field-of-view guides">
${GUIDES.map((guide, index) => `      <article class="guide-card panel">
        <span>${String(index + 1).padStart(2, '0')} / Guide</span>
        <h2><a href="/guides/${guide.slug}/">${guide.title}</a></h2>
        <p>${guide.dek}</p>
      </article>`).join('\n')}
    </section>`;

export const GUIDE_HUB_PAGE = {
  path: '/guides/',
  title: 'Field-of-view setup guides',
  description: 'Six measurement-first guides to screen distance, game FOV conventions, triples, bezels, curved ultrawides, and calculator disagreements.',
  body: GUIDE_HUB_BODY,
};

export const GUIDE_SOURCES = SOURCES;
