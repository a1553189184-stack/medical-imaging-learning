import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const apkPublic = process.argv[2];
const apkFile = process.argv[3];
if (!apkPublic || !apkFile) throw new Error('Usage: node scripts/import-apk-disease-topic-images.mjs <apk-public-dir> <apk-file>');

const sourceFile = path.join(apkPublic, 'disease-topics-20260905.js');
const source = fs.readFileSync(sourceFile, 'utf8');
const libraryPath = path.join('library-data', 'authorized-msk-library.json');
const manifestPath = path.join('library-data', 'authorized-library-manifest.json');
const library = JSON.parse(fs.readFileSync(libraryPath, 'utf8'));
const records = new Map(library.records.map((record) => [record.id, record]));

const bases = new Map([...source.matchAll(/const\s+(base\w*)\s*=\s*'([^']+)'\s*;/g)].map((match) => [match[1], match[2]]));
const imagePattern = /\{\s*src:\s*(base\w*)\s*\+\s*'([^']+)'\s*,\s*caption:\s*'([^']+)'\s*\}/g;

function imagesIn(block) {
  return [...block.matchAll(imagePattern)].map((match) => ({
    relative: `${bases.get(match[1])}${match[2]}`,
    caption: match[3],
  }));
}

function balancedObject(start) {
  let depth = 0;
  let quote = '';
  let escaped = false;
  for (let index = start; index < source.length; index += 1) {
    const char = source[index];
    if (quote) {
      if (escaped) escaped = false;
      else if (char === '\\') escaped = true;
      else if (char === quote) quote = '';
      continue;
    }
    if (char === "'" || char === '"' || char === '`') quote = char;
    else if (char === '{') depth += 1;
    else if (char === '}' && --depth === 0) return source.slice(start, index + 1);
  }
  throw new Error(`Unbalanced object at offset ${start}`);
}

const topicVariables = new Map();
for (const match of source.matchAll(/const\s+(\w+Topic)\s*=\s*Object\.freeze\(\s*\{/g)) {
  const objectStart = source.indexOf('{', match.index);
  topicVariables.set(match[1], imagesIn(balancedObject(objectStart)));
}

const mappings = new Map();
for (const match of source.matchAll(/'([^']+)'\s*:\s*(\w+Topic)\s*[,}]/g)) {
  if (topicVariables.has(match[2])) mappings.set(match[1], topicVariables.get(match[2]));
}
for (const match of source.matchAll(/'([^']+)'\s*:\s*\{/g)) {
  const objectStart = source.indexOf('{', match.index);
  const images = imagesIn(balancedObject(objectStart));
  if (images.length) mappings.set(match[1], images);
}

let addedImages = 0;
let coveredRecords = 0;
let skippedMissingFiles = 0;
const copied = new Set();
const importedByRecord = {};
for (const [recordId, images] of mappings) {
  const record = records.get(recordId);
  if (!record) throw new Error(`Topic image target missing from MSK library: ${recordId}`);
  const existing = new Set((record.images || []).map((image) => image.src));
  let recordAdded = 0;
  for (const image of images) {
    const sourcePath = path.join(apkPublic, image.relative);
    if (!fs.existsSync(sourcePath)) {
      skippedMissingFiles += 1;
      continue;
    }
    const destinationRelative = `assets/authorized/msk/${image.relative.replaceAll('\\', '/')}`;
    const destinationPath = path.join(destinationRelative);
    if (!copied.has(destinationRelative)) {
      fs.mkdirSync(path.dirname(destinationPath), { recursive: true });
      fs.copyFileSync(sourcePath, destinationPath);
      copied.add(destinationRelative);
    }
    if (existing.has(destinationRelative)) continue;
    (record.images ||= []).push({
      type: '教学图解',
      src: destinationRelative,
      caption: image.caption,
      source: '知影 App 疾病专题（所有者授权）',
      relation: `新版 App 专题中与“${record.name}”疾病 ID 直接关联的影像或教学图解`,
    });
    existing.add(destinationRelative);
    recordAdded += 1;
    addedImages += 1;
  }
  record.imageCount = (record.images || []).length;
  if (recordAdded) {
    coveredRecords += 1;
    importedByRecord[recordId] = recordAdded;
  }
}

const uniqueImages = new Set(library.records.flatMap((record) => (record.images || []).map((image) => image.src)));
library.imageCount = uniqueImages.size;
library.coveredRecordCount = library.records.filter((record) => (record.images || []).length).length;
library.import.latestImageIntegration = {
  source: 'Zhiying_LAB_full_access.apk / disease-topics-20260905.js',
  integratedAt: new Date().toISOString(),
  mappingRule: '仅导入专题脚本中以现有疾病 ID 直接关联且 APK 内真实存在的图片',
  addedImages,
  coveredRecords,
  skippedMissingFiles,
};
fs.writeFileSync(libraryPath, `${JSON.stringify(library)}\n`);

const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
const system = manifest.systems.find((entry) => entry.key === 'msk');
system.imageCount = library.imageCount;
system.coveredRecordCount = library.coveredRecordCount;
manifest.totals.images = manifest.systems.reduce((sum, entry) => sum + entry.imageCount, 0);
manifest.totals.coveredRecords = manifest.systems.reduce((sum, entry) => sum + (entry.coveredRecordCount || 0), 0);
manifest.latestImageIntegration = {
  source: 'Zhiying_LAB_full_access.apk',
  apkSha256: crypto.createHash('sha256').update(fs.readFileSync(apkFile)).digest('hex'),
  integratedAt: new Date().toISOString(),
  addedImages,
  coveredRecords,
  skippedMissingFiles,
  importedByRecord,
};
fs.writeFileSync(manifestPath, `${JSON.stringify(manifest)}\n`);

console.log(JSON.stringify({ mappings: mappings.size, addedImages, coveredRecords, skippedMissingFiles, copiedFiles: copied.size, imageCount: library.imageCount }, null, 2));
