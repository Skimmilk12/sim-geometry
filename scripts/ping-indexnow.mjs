// Submit every sitemap URL to IndexNow (Bing/Yandex/etc.). Run after a deploy.
// The key file is hosted at /<KEY>.txt (copied from public/ by the build).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const KEY = '487aad67fb2fc512a3e33bbc7b1d749c';
const HOST = 'simgeometry.com';

const sitemap = fs.readFileSync(path.join(ROOT, 'dist', 'sitemap.xml'), 'utf8');
const urls = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
if (urls.length === 0) throw new Error('no URLs in dist/sitemap.xml — build first');

const res = await fetch('https://api.indexnow.org/indexnow', {
  method: 'POST',
  headers: { 'content-type': 'application/json; charset=utf-8' },
  body: JSON.stringify({
    host: HOST,
    key: KEY,
    keyLocation: `https://${HOST}/${KEY}.txt`,
    urlList: urls,
  }),
});
console.log(`IndexNow: ${res.status} ${res.statusText} — submitted ${urls.length} URL(s)`);
if (!res.ok && res.status !== 202) process.exit(1);
