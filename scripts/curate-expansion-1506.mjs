import fs from 'node:fs';
import path from 'node:path';

// One representative image per identifiable study. These IDs were selected
// against the Commons file title and description; images that only mention a
// diagnosis in the history, depict another disease, or repeat a patient's
// neighbouring slices are intentionally excluded.
const representatives = {
  chest: [2, 3, 4, 5, 9, 10, 11, 12, 14, 20, 22, 25, 26, 28, 29, 30, 32, 33, 34, 37, 38, 40, 42, 43, 44, 47, 48, 52, 54, 61, 63, 64, 66, 69, 70, 73, 74, 76, 77, 82, 86, 89, 90, 92, 99, 100, 103, 106],
  neuro: [1, 3, 5, 8, 9, 10, 13, 14, 15, 16, 18, 19, 20, 22, 23, 24, 25, 27, 29, 30, 32, 33, 37, 38, 46, 48, 52, 55, 58, 61, 67, 71, 84, 86, 95, 104, 132],
  abdomen: [3, 4, 6, 7, 8, 9, 10, 11, 14, 15, 16, 18, 21, 22, 23, 24, 27, 29, 31, 32, 35, 37, 39, 40, 45, 48, 49, 55, 59, 64, 66, 71, 72, 73, 75, 80, 82, 84, 88, 90, 108],
  bone: [2, 3, 4, 5, 11, 12, 14, 17, 21, 22, 23, 24, 26, 27, 30, 31, 32, 33, 34, 35, 36, 41, 46, 49, 50, 51, 56, 58, 59, 60, 65, 66, 69, 70, 72, 73, 74, 77, 84, 85, 89, 91, 93, 94, 99, 101, 104, 108, 109, 112, 114, 125],
};

const root = path.resolve(import.meta.dirname, '..');
const manifestPath = path.join(root, 'data', 'expanded-case-sources.json');
const selectionPath = path.join(root, 'data', 'expansion-1506-selection.json');
const groupsPath = path.join(root, 'next-502-groups.js');
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
const groupSource = fs.readFileSync(groupsPath, 'utf8');
const groups = JSON.parse(groupSource.slice(groupSource.indexOf('{'), groupSource.lastIndexOf(';')));
const selected = new Set(Object.entries(representatives).flatMap(([system, numbers]) => numbers.map(number => `${system}-1506-${String(number).padStart(3, '0')}`)));
const attempted = new Set(Object.entries({chest: 106, neuro: 132, abdomen: 132, bone: 132}).flatMap(([system, count]) => Array.from({length: count}, (_, index) => `${system}-1506-${String(index + 1).padStart(3, '0')}`)));
const actual = new Set(manifest.records.filter(record => record.id.includes('-1506-')).map(record => record.id));
const missing = [...selected].filter(id => !actual.has(id));
if (missing.length) throw new Error(`Selected case IDs are missing: ${missing.join(', ')}`);
if (selected.size !== Object.values(representatives).reduce((sum, numbers) => sum + numbers.length, 0)) throw new Error('Duplicate curated ID');

function inferredModality(record, fallback) {
  const title = record.sourceTitle.toLowerCase();
  const description = record.sourceDescription.toLowerCase();
  const terms = [title, description];
  const tests = [
    ['MRI', /\b(mri|mrt|magnetic resonance|mr t1|mr t2|t1.?weighted|t2.?weighted|flair|dwi)\b/i],
    ['US', /\b(ultrasound|ultrasonography|sonography|sonogram|echography|fibroscan|us scan|us image)\b/i],
    ['CT', /\b(ct|computed tomography|computer tomography|ctpa|tac craneo)\b/i],
    ['X-RAY', /\b(x.?ray|cxr|radiograph|roentgen|roentgenbild|breischluck|roe|röntgen)\b/i],
  ];
  if (/(?:^|[\s-])CR(?:[\s-]|\.)/.test(title)) return 'X-RAY';
  for (const text of terms) {
    for (const [modality, pattern] of tests) if (pattern.test(text)) return modality;
  }
  return fallback;
}

const removed = [];
manifest.records = manifest.records.filter(record => {
  if (!record.id.includes('-1506-')) return true;
  if (!selected.has(record.id)) {
    removed.push(record.id);
    delete groups[record.id];
    return false;
  }
  const group = groups[record.id];
  if (!group) throw new Error(`Missing group ${record.id}`);
  if (!/CC0|public domain|CC BY/i.test(record.license) || !record.sourceUrl.startsWith('https://commons.wikimedia.org/')) throw new Error(`Bad license or source: ${record.id}`);
  if (Math.min(record.width, record.height) < 480 || record.localBytes < 8000 || !fs.existsSync(path.join(root, record.image))) throw new Error(`Bad image: ${record.id}`);
  const modality = inferredModality(record, group.modality);
  group.modality = modality;
  group.tags = [...new Set(group.tags.filter(tag => !['CT', 'CTPA', 'MRI', 'US', 'X-RAY'].includes(tag)).concat(modality))];
  if (!['bone-1506-027', 'neuro-1506-025'].includes(record.id)) {
    group.basis = `公开来源将本影像描述为“${record.sourceTitle}”。病例说明：${record.sourceDescription}。本图作为“${group.title.split('（公开病例')[0]}”的单例阅片训练材料；教学要点是核对清单，不代替对原图的独立判读。`;
  }
  record.qualityScore = 'source-title-checked-and-one-image-per-study';
  record.sourceAudit = 'manual-curation-after-perceptual-and-study-review';
  return true;
});

manifest.count = manifest.records.length;
manifest.expansion1506.count = selected.size;
delete manifest.expansion1506.minimumPerSystem;
manifest.expansion1506.requestedTarget = manifest.expansion1506.requestedTarget || manifest.expansion1506.target;
delete manifest.expansion1506.target;
manifest.expansion1506.bySystem = Object.fromEntries(Object.entries(representatives).map(([system, numbers]) => [{chest: '胸部', neuro: '神经', abdomen: '腹部', bone: '骨骼'}[system], numbers.length]));
manifest.expansion1506.qualityGate = manifest.expansion1506.qualityGate || 'Only source-consistent representative study images retained; incidental mentions, misleading images and same-study slices excluded.';
manifest.generatedAt = new Date().toISOString();

const selection = JSON.parse(fs.readFileSync(selectionPath, 'utf8'));
selection.additions = manifest.records.filter(record => record.id.includes('-1506-'));
selection.curatedRemovedIds = [...attempted].filter(id => !selected.has(id));
selection.qualityGate = manifest.expansion1506.qualityGate;
fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
fs.writeFileSync(groupsPath, `// Curated representative source images; generated by curate-expansion-1506.mjs.\nconst NEXT_502_GROUPS = ${JSON.stringify(groups, null, 2)};\n`);
fs.writeFileSync(selectionPath, JSON.stringify(selection, null, 2) + '\n');
console.log(JSON.stringify({retained: selected.size, removed: removed.length, total: manifest.count + 14, bySystem: manifest.expansion1506.bySystem}));
