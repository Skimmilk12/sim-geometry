// Build-safety primitives, unit-testable without running a build.
import path from 'node:path';
import os from 'node:os';

/**
 * A BUILD_OUT target is deletable only if it is the repo's own dist/ or a
 * throwaway sg-build-* directory under the OS tmpdir. Everything else —
 * roots, the repo, its ancestors, source dirs, arbitrary paths — is rejected.
 */
export function validateBuildOut(rootDir, outDir) {
  const root = path.resolve(rootDir);
  const out = path.resolve(outDir);
  if (out === path.join(root, 'dist')) return out;
  const tmp = path.resolve(os.tmpdir());
  const relTmp = path.relative(tmp, out);
  if (!relTmp.startsWith('..') && !path.isAbsolute(relTmp)
    && relTmp.split(path.sep)[0].startsWith('sg-build-')) return out;
  throw new RangeError(
    `refusing to build into ${out}: BUILD_OUT must be the repo dist/ or an sg-build-* dir under the OS tmpdir`,
  );
}

/** Canonical page path: '/' or lowercase slash-delimited segments with trailing slash. */
export function validatePagePath(p) {
  if (p === '/') return p;
  if (!/^\/[a-z0-9-]+(\/[a-z0-9-]+)*\/$/.test(p)) {
    throw new RangeError(`invalid page path ${JSON.stringify(p)}: must be '/' or lowercase '/seg/.../' with trailing slash`);
  }
  return p;
}

/** Resolve a page path to its output file, guaranteed to stay inside outDir. */
export function pageOutputFile(outDir, pagePath) {
  validatePagePath(pagePath);
  const rel = pagePath === '/' ? 'index.html'
    : path.join(pagePath.replace(/^\/|\/$/g, ''), 'index.html');
  const file = path.resolve(outDir, rel);
  const check = path.relative(path.resolve(outDir), file);
  if (check.startsWith('..') || path.isAbsolute(check)) {
    throw new RangeError(`page path ${pagePath} escapes the output directory`);
  }
  return file;
}

/** Tracks every destination the build writes; duplicate destinations are a build error. */
export class Manifest {
  constructor() { this.map = new Map(); }
  claim(destRelPath, source) {
    const key = destRelPath.replaceAll('\\', '/');
    if (this.map.has(key)) {
      throw new Error(`output collision: ${key} written by both "${this.map.get(key)}" and "${source}"`);
    }
    this.map.set(key, source);
  }
  size() { return this.map.size; }
}

/** Every built:true nav/footer destination must resolve to a registered page path. */
export function validateNav(site, pages) {
  const registered = new Set(pages.map((p) => p.path));
  for (const item of [...site.nav, ...site.footNav]) {
    if (item.built && !registered.has(item.href)) {
      throw new Error(`nav item "${item.label}" marks built:true but no page is registered at ${item.href}`);
    }
  }
  const seen = new Set();
  for (const p of pages) {
    if (seen.has(p.path)) throw new Error(`duplicate page path ${p.path}`);
    seen.add(p.path);
  }
}
