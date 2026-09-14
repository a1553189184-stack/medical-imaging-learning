/** Replace three derivative/near-identical exports found by pHash review. */
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';

const ROOT = path.resolve(import.meta.dirname, '..');
const replacements = [
  { id: 'chest-1004-056', oldSha1: '50e783468de30e0dbc83547552fdee3dc77aab87', newSha1: 'b67221e31bf4cbc1c7826770685fc9966a64aa29' },
  { id: 'neuro-1004-076', oldSha1: '853c47b3b94402269fef9bf5eb9d6bbeb6ef0a3c', newSha1: 'e366a0b1537a3fcffab6b8f678f66cf51d39308f' },
  { id: 'bone-1004-065', oldSha1: 'e7271d77cd9995d407ef18545116409412cfe99f', newSha1: 'c0c2eb674058834b3fd473e759a8e6bfc88658f2' }
];
const sourceFiles = ['data/commons-candidates.json', 'data/existing-alternate-candidates.json', 'data/next-200-candidates.json'];
const candidates = new Map();
for (const file of sourceFiles) {
  const data = JSON.parse(await fs.readFile(path.join(ROOT, file), 'utf8'));
  for (const topic of data.groups || data.topics || []) for (const item of topic.candidates || []) candidates.set(item.originalSha1, item);
}
const manifestPath = path.join(ROOT, 'data', 'expanded-case-sources.json');
const manifest = JSON.parse(await fs.readFile(manifestPath, 'utf8'));
if (manifest.count !== 990 || manifest.records.length !== 990) throw new Error('Unexpected manifest state');
for (const replacement of replacements) {
  const record = manifest.records.find(item => item.id === replacement.id);
  const item = candidates.get(replacement.newSha1);
  if (!record || !item) throw new Error(`Replacement precondition failed: ${replacement.id}`);
  if (record.originalSha1 === replacement.newSha1) continue;
  if (record.originalSha1 !== replacement.oldSha1) throw new Error(`Unexpected source state: ${replacement.id}`);
  const response = await fetch(item.downloadUrl, { headers: { 'User-Agent': 'MedicalImagingLearningAudit/5.0' } });
  if (!response.ok) throw new Error(`${response.status} ${replacement.id}`);
  const bytes = Buffer.from(await response.arrayBuffer());
  const png = bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  const jpeg = bytes[0] === 255 && bytes[1] === 216;
  if ((!png && !jpeg) || bytes.length < 20_000) throw new Error(`Invalid replacement image: ${replacement.id}`);
  const image = `assets/images/expanded/${replacement.id}.${png ? 'png' : 'jpg'}`;
  if (record.image !== image) await fs.rm(path.join(ROOT, record.image), { force: true });
  await fs.writeFile(path.join(ROOT, image), bytes);
  Object.assign(record, {
    image, sourceTitle: item.title.replace(/^File:/i, ''), sourceUrl: item.sourceUrl, sourceDescription: item.description,
    artist: item.artist, credit: item.credit, license: item.license, licenseUrl: item.licenseUrl, originalUrl: item.originalUrl,
    originalSha1: item.originalSha1, localSha256: crypto.createHash('sha256').update(bytes).digest('hex'), localBytes: bytes.length,
    width: item.width, height: item.height, mime: item.mime, sourceAudit: 'direct-source-label-match-after-perceptual-review'
  });
  console.log(`Replaced ${replacement.id} with ${record.sourceTitle}`);
}
manifest.generatedAt = new Date().toISOString();
await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
const selectionPath = path.join(ROOT, 'data', 'expansion-1004-selection.json');
const selection = JSON.parse(await fs.readFile(selectionPath, 'utf8'));
selection.additions = manifest.records.slice(-304);
selection.generatedAt = new Date().toISOString();
await fs.writeFile(selectionPath, JSON.stringify(selection, null, 2) + '\n');
