import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const imageDir = path.resolve(root, 'assets', 'images', 'expanded');
const thumbnailDir = path.resolve(root, 'assets', 'thumbnails', 'expanded');
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'data', 'expanded-case-sources.json'), 'utf8'));
const liveImages = new Set(manifest.records.map(record => path.resolve(root, record.image)));
const liveThumbnails = new Set(manifest.records.map(record => path.resolve(root, record.image.replace(/^assets\/images\//, 'assets/thumbnails/').replace(/\.[^.]+$/, '.webp'))));
const batchPattern = /^(chest|neuro|abdomen|bone)-1506-\d{3}\.(jpg|jpeg|png|webp)$/i;
const candidates = [];
for (const [directory, live] of [[imageDir, liveImages], [thumbnailDir, liveThumbnails]]) {
  if (!fs.existsSync(directory)) continue;
  for (const filename of fs.readdirSync(directory)) {
    if (!batchPattern.test(filename)) continue;
    const target = path.resolve(directory, filename);
    if (path.dirname(target) !== directory || live.has(target)) continue;
    candidates.push(target);
  }
}
const totalBytes = candidates.reduce((sum, target) => sum + fs.statSync(target).size, 0);
console.log(JSON.stringify({orphanFiles: candidates.length, bytes: totalBytes, directory: imageDir}));
if (process.argv.includes('--apply')) {
  for (const target of candidates) fs.unlinkSync(target);
  console.log(`Removed ${candidates.length} unused, unpublished batch files.`);
}
