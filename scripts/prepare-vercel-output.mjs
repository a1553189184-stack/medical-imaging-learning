import { cp, mkdir, readdir, rm } from 'node:fs/promises';
import { extname, join } from 'node:path';

// The main learning application intentionally remains plain HTML/JS while the
// optional Cornerstone viewer has its own Vite build. Vercel needs one complete
// static output directory in addition to api/*.js serverless functions.
const root = process.cwd();
const output = join(root, 'dist');
const rootEntries = await readdir(root, { withFileTypes: true });

await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });
await cp(join(root, 'assets'), join(output, 'assets'), { recursive: true });
await cp(join(root, 'library-data'), join(output, 'library-data'), { recursive: true });

for (const entry of rootEntries) {
  if (!entry.isFile()) continue;
  const extension = extname(entry.name).toLowerCase();
  if (!['.html', '.js', '.css', '.svg', '.txt', '.xml', '.json', '.png', '.jpg', '.jpeg', '.webp', '.ico', '.woff', '.woff2'].includes(extension)) continue;
  await cp(join(root, entry.name), join(output, entry.name));
}

console.log('Prepared Vercel static output in dist/.');
