import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const root = path.resolve(import.meta.dirname, '..');
const apply = process.argv.includes('--apply');
const sourceScripts = [
  'cases.js', 'curriculum.js', 'expanded-sources.js', 'additional-groups.js',
  'next-76-groups.js', 'next-200-groups.js', 'next-200-review.js',
  'next-304-groups.js', 'next-502-groups.js', 'expanded-cases.js',
];
const context = vm.createContext({ structuredClone: global.structuredClone });
for (const file of sourceScripts) vm.runInContext(fs.readFileSync(path.join(root, file), 'utf8'), context, { filename: file });
const cases = vm.runInContext('CASES', context);

// Exact wording alone is insufficient when the library entry specifies an anatomic site.
// Keep these candidates out until a site-concordant image is available.
const exclusions = new Map([
  ['abdomen-v2-0377', '条目限定结肠受累，候选图主要显示末段回肠'],
  ['abdomen-v2-1092', '腹壁条目与颅内表皮样囊肿候选图部位不符'],
  ['ns-skull-base-chondrosarcoma', '颅底条目与四肢骨候选图部位不符'],
  ['oral-cysts-11', '颌骨条目与长骨候选图部位不符'],
  ['oral-cysts-12', '颌骨条目与长骨候选图部位不符'],
  ['pelvis-v2-192', '骨盆条目与未证实骨盆部位的候选图不符'],
  ['pelvis-v2-194', '骨盆条目与未证实骨盆部位的候选图不符'],
  ['pelvis-v2-195', '骨盆条目与未证实骨盆部位的候选图不符'],
]);

function normalize(value) {
  return String(value || '')
    .toLocaleLowerCase()
    .replace(/\s*·\s*开放病例\s*\d+$/u, '')
    .replace(/\s*病例\s*\d+$/u, '')
    .replace(/[（(][^）)]*[）)]/gu, '')
    .replace(/[^a-z0-9\u4e00-\u9fff]/gu, '');
}

const casesByName = new Map();
for (const item of cases) {
  if (!item.image || !fs.existsSync(path.join(root, item.image))) continue;
  for (const name of [item.title, item.english]) {
    const key = normalize(name);
    if (key.length < 3) continue;
    const entries = casesByName.get(key) || [];
    if (!entries.some((candidate) => candidate.image === item.image)) entries.push(item);
    casesByName.set(key, entries);
  }
}

const manifestPath = path.join(root, 'library-data', 'authorized-library-manifest.json');
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
const report = [];
const rejected = [];
for (const system of manifest.systems) {
  const libraryPath = path.join(root, system.file);
  const library = JSON.parse(fs.readFileSync(libraryPath, 'utf8'));
  let changed = false;
  for (const record of library.records) {
    if ((record.images || []).length) continue;
    const keys = [...new Set([record.name, record.nameEn, ...(record.aliases || [])].map(normalize).filter((key) => key.length >= 3))];
    const candidates = [...new Map(keys.flatMap((key) => casesByName.get(key) || []).map((item) => [item.image, item])).values()];
    if (!candidates.length) continue;
    if (exclusions.has(record.id)) {
      rejected.push({ system: system.key, recordId: record.id, recordName: record.name, reason: exclusions.get(record.id) });
      continue;
    }
    const safe = candidates.filter((item) => item.source && item.sourceUrl && item.license && item.modality);
    if (!safe.length) continue;
    const selected = safe.slice(0, 3);
    report.push({ system: system.key, recordId: record.id, recordName: record.name, candidates: selected.map((item) => ({ title: item.title, modality: item.modality, image: item.image, source: item.source, license: item.license, sourceUrl: item.sourceUrl })) });
    if (!apply) continue;
    record.images = selected.map((item) => ({
      type: item.modality,
      src: item.image,
      caption: `${record.name} · 站内核验病例图`,
      source: item.source,
      sourceUrl: item.sourceUrl,
      license: item.license,
      relation: `病例图诊断名称与疾病条目“${record.name}”的规范名称或别名严格一致`,
      verificationStatus: 'exact-name-and-modality-reviewed',
    }));
    record.imageCount = record.images.length;
    changed = true;
  }
  if (apply && changed) {
    library.imageCount = new Set(library.records.flatMap((record) => (record.images || []).map((image) => image.src))).size;
    library.coveredRecordCount = library.records.filter((record) => (record.images || []).length).length;
    fs.writeFileSync(libraryPath, `${JSON.stringify(library)}\n`);
    system.imageCount = library.imageCount;
    system.coveredRecordCount = library.coveredRecordCount;
  }
}

if (apply) {
  manifest.totals.images = manifest.systems.reduce((sum, system) => sum + system.imageCount, 0);
  manifest.totals.coveredRecords = manifest.systems.reduce((sum, system) => sum + (system.coveredRecordCount || 0), 0);
  manifest.latestExactCaseImageLink = {
    linkedAt: new Date().toISOString(),
    recordCount: report.length,
    imageReferenceCount: report.reduce((sum, item) => sum + item.candidates.length, 0),
    rule: '站内病例诊断名称/英文名与疾病规范名称或别名严格一致，且来源、许可、模态、文件均完整',
    rejectedCount: rejected.length,
    rejected,
  };
  fs.writeFileSync(manifestPath, `${JSON.stringify(manifest)}\n`);
}

console.log(JSON.stringify({ apply, recordCount: report.length, imageReferenceCount: report.reduce((sum, item) => sum + item.candidates.length, 0), rejectedCount: rejected.length, rejected, report }, null, 2));
