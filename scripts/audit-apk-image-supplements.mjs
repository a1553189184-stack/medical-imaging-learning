import fs from 'node:fs';
import path from 'node:path';

const apkPublic = process.argv[2];
if (!apkPublic) throw new Error('Usage: node scripts/audit-apk-image-supplements.mjs <apk-public-dir>');

const configs = [
  ['abdomen', 'abdomen_word_images_20260919.js'],
  ['chest', 'chest_image_fill_20260919.js'],
  ['ns', 'ns_image_fill_20260919.js'],
  ['pelvis', 'pelvis_word_images_20260919.js'],
];

function readImageGroups(file) {
  const source = fs.readFileSync(file, 'utf8');
  const groupsMarker = 'const IMAGE_GROUPS = ';
  const rowsMarker = /const IMAGE_ROWS\s*=\s*/;
  const groupsStart = source.indexOf(groupsMarker);
  const rowsMatch = rowsMarker.exec(source);
  const jsonStart = groupsStart >= 0 ? groupsStart + groupsMarker.length : rowsMatch ? rowsMatch.index + rowsMatch[0].length : -1;
  if (jsonStart < 0) throw new Error(`Image mapping not found: ${file}`);
  const end = source.indexOf(';', jsonStart);
  const parsed = JSON.parse(source.slice(jsonStart, end));
  if (!Array.isArray(parsed)) return parsed;
  return parsed.reduce((groups, row) => {
    (groups[row.diseaseId] ||= []).push(row);
    return groups;
  }, {});
}

const report = [];
for (const [system, script] of configs) {
  const library = JSON.parse(fs.readFileSync(path.join('library-data', `authorized-${system}-library.json`), 'utf8'));
  const records = new Map(library.records.map((record) => [record.id, record]));
  const groups = readImageGroups(path.join(apkPublic, script));
  let imageCount = 0;
  let missingFileCount = 0;
  const missingIds = [];
  const mappings = [];
  for (const [id, images] of Object.entries(groups)) {
    imageCount += images.length;
    const record = records.get(id);
    if (!record) missingIds.push(id);
    for (const image of images) {
      if (!fs.existsSync(path.join(apkPublic, image.src))) missingFileCount += 1;
    }
    mappings.push({ id, name: record?.name ?? null, images: images.length, captions: [...new Set(images.map((image) => image.caption))].slice(0, 3) });
  }
  report.push({ system, script, targetCount: Object.keys(groups).length, imageCount, missingFileCount, missingIds, mappings });
}

const reuseSource = fs.readFileSync(path.join(apkPublic, 'verified-existing-image-reuse-20260912.js'), 'utf8');
const payloadMarker = 'const payload = ';
const payloadStart = reuseSource.indexOf(payloadMarker) + payloadMarker.length;
const payloadEnd = reuseSource.indexOf(';', payloadStart);
const payload = JSON.parse(reuseSource.slice(payloadStart, payloadEnd));
const allRecords = new Map();
for (const file of fs.readdirSync('library-data').filter((name) => /^authorized-.+-library\.json$/.test(name) && name !== 'authorized-library-manifest.json')) {
  const library = JSON.parse(fs.readFileSync(path.join('library-data', file), 'utf8'));
  for (const record of library.records) allRecords.set(record.id, { system: library.key, record });
}
report.push({
  reuse: true,
  mappingCount: payload.mappings.length,
  imageCount: payload.mappings.reduce((sum, mapping) => sum + mapping.images.length, 0),
  usableMappings: payload.mappings.filter((mapping) => allRecords.has(mapping.targetId) && mapping.images.every((image) => fs.existsSync(path.join(apkPublic, image.src)))).map((mapping) => ({
    targetId: mapping.targetId,
    targetName: mapping.targetName,
    system: allRecords.get(mapping.targetId).system,
    images: mapping.images.length,
    basis: mapping.basis,
  })),
});

process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
