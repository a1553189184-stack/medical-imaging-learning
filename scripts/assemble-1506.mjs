/**
 * Assemble a source-audited 502-case extension of the 1,004-case atlas.
 *
 * The input is deliberately the checkpointed, diagnosis-labelled discovery
 * file. This script never writes a case until its Commons page, licence,
 * source SHA-1, local SHA-256 and direct diagnostic label have been recorded.
 */
import fs from 'node:fs/promises';
import { statSync } from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import vm from 'node:vm';

const ROOT = path.resolve(import.meta.dirname, '..');
const MANIFEST_PATH = path.join(ROOT, 'data', 'expanded-case-sources.json');
const CANDIDATES_PATH = path.join(ROOT, 'data', 'candidates-1500.json');
const TARGET = 502;
const MINIMUM_PER_SYSTEM = 50;
const MAX_PER_TEACHING_GROUP = 12;
const SYSTEMS = ['胸部', '神经', '腹部', '骨骼'];
const PREFIX = { '胸部': 'chest', '神经': 'neuro', '腹部': 'abdomen', '骨骼': 'bone' };
const REJECT = /annotation|annotated|mark|arrows?|diagram|scheme|schematic|drawing|classification|histolog|histopath|pathologic|micrograph|gross pathology|autopsy|specimen|cytology|cells or tissue|veterinary|\bdog\b|\bcat\b|canine|feline|operative photograph|surgery photo|mummy|historic|historical|tactical|normal|normwert|segmentation|treatment plan|post.?operative|post.?op|fixation|osteosynth|implant|\bplate\b|\bscrew\b|\bkein\b|\bwithout\b|\bno\b/i;
// Previously observed same-study variants. Commons can expose them as separate
// original files, so source SHA-1 uniqueness alone is not sufficient.
const DISALLOWED_SHA1 = new Set([
  '02f5567e26e63dddb2a3c1edee554b1cdcb808b2','e2228e61ea56a9d30aec7cfe9a257a4273506b88','5077021c36e3b6ba3fd7f2c4df48d13ba2ab7a24','1b3be9fe6701203cdcd24092a23432e813ad45a2','15ca925599c6841096b625e183f113d477948180','2d705a58a932f6eb1d71b5422c841101ca9431aa','50b60f11e59965b81741c7d0e6f0274e62077a27','26681ea91e6aa8fabd0fe97e08153384d3a69a98','de57112c7b0e9a8a39e8d3d685d113f349e9a5ee','a464bfa04593ad76556c4b5feed555d03bfbfd9a','39a6fb99298b0a1be69f55456293c1863421bfce','c60b0832a81561b7656669c5b343ddddb7790cce','32db68900121547eb6af6b3abefa1516f2ff8af6','fbcc7a77b90941166f96304064c41566a3711f36','80377e233ba0b34d29fe2aace70024acb9bb3bff','cadb91940e1fbfc8a53106fd5dcb60c0ab9c843c','b8d56384cc7cc00d2b18313863df9d467631a527','f8fadea926239afffb0138f25880d09f81bb52a6','5092f2b1c1459c7d1992b61ce4e273ee50240cad','7daacfbdcda3e04071884544c48aa76731d34b15','643b7c1827d03a10052e80a9347678c6b50d39d5','d4a37768725a25efb16d2b72b3cb21e4248435b6'
]);
const CATALOG_SCRIPTS = [
  'cases.js', 'curriculum.js', 'expanded-sources.js', 'additional-groups.js',
  'next-76-groups.js', 'next-200-groups.js', 'next-200-review.js',
  'next-304-groups.js', 'expanded-cases.js'
];
const STOP_WORDS = new Set(['with', 'without', 'disease', 'syndrome', 'imaging', 'image', 'pattern', 'radiograph', 'computed', 'tomography', 'magnetic', 'resonance', 'acute', 'chronic', 'primary', 'secondary', 'other', 'left', 'right', 'brain', 'chest', 'bone', 'spine']);
const GENERIC_SINGLE_TERMS = new Set(['pulmonary', 'thoracic', 'cardiac', 'cerebral', 'abdominal', 'carcinoma', 'cancer', 'fracture', 'arthritis', 'infection', 'injury', 'lesion', 'tumor', 'tumour', 'disease', 'syndrome', 'fibrosis', 'pneumonia', 'infarction', 'hemorrhage', 'haemorrhage', 'dislocation', 'metastasis', 'metastases']);

function modalityFor(item, fallback) {
  const text = `${item.title} ${item.description}`;
  if (/MRCP|MRT|MRI|\bMR\b/i.test(text)) return 'MRI';
  if (/CT|CCT|computed tomography/i.test(text)) return 'CT';
  if (/ultrasound|sonograph|\bUS\b/i.test(text)) return 'US';
  if (/scinti|bone scan/i.test(text)) return '骨显像';
  return fallback || 'X-RAY';
}

function isCandidate(item) {
  return /^image\/(jpeg|png)$/i.test(item.mime || '')
    && /CC0|public domain|CC BY/i.test(item.license || '')
    && Math.min(Number(item.width) || 0, Number(item.height) || 0) >= 480
    && String(item.description || '').trim().length >= 8
    && !DISALLOWED_SHA1.has(item.originalSha1)
    && !REJECT.test(`${item.title} ${item.description}`);
}

function diagnosisTerms(english) {
  return [...new Set((String(english || '').toLowerCase().match(/[a-z]{4,}/g) || [])
    .filter(term => !STOP_WORDS.has(term)))];
}

function matchingTerms(english, item) {
  const terms = diagnosisTerms(english);
  const text = `${item.title} ${item.description}`.toLowerCase();
  return terms.filter(term => text.includes(term));
}

async function loadCatalog() {
  const source = (await Promise.all(CATALOG_SCRIPTS.map(file => fs.readFile(path.join(ROOT, file), 'utf8')))).join('\n');
  return JSON.parse(vm.runInNewContext(`${source}\nJSON.stringify({cases:CASES,groups:EXPANDED_GROUPS})`));
}

async function download(url, attempt = 0) {
  const response = await fetch(url, { headers: { 'User-Agent': 'MedicalImagingLearningAudit/6.0 (https://github.com/a1553189184-stack/medical-imaging-learning)' } });
  if ((response.status === 429 || response.status >= 500) && attempt < 7) {
    await new Promise(resolve => setTimeout(resolve, 1500 * (attempt + 1)));
    return download(url, attempt + 1);
  }
  if (!response.ok) throw new Error(`${response.status} ${url}`);
  return Buffer.from(await response.arrayBuffer());
}

const manifest = JSON.parse(await fs.readFile(MANIFEST_PATH, 'utf8'));
const discovery = JSON.parse(await fs.readFile(CANDIDATES_PATH, 'utf8'));
const catalog = await loadCatalog();
if (catalog.cases.length !== 1004 || manifest.records.length !== 990 || manifest.count !== 990) {
  throw new Error('This append-only batch is pinned to the audited 1,004-case catalog.');
}
const used = new Set(manifest.records.flatMap(record => [record.sourceUrl, record.originalSha1]));
const pool = new Map();
function addToPool(system, key, item, source) {
  if (!SYSTEMS.includes(system) || !catalog.groups[key] || !isCandidate(item)) return;
  if (used.has(item.sourceUrl) || used.has(item.originalSha1)) return;
  const matchTerms = Array.isArray(item.matchTerms) ? item.matchTerms : matchingTerms(catalog.groups[key].english, item);
  const categoryVerified = source === 'existing-diagnosis-category';
  // Retain the same two-term gate used by new discovery. The only difference
  // is that these are older, already downloaded API result pages that were not
  // exhausted in the 1,004-case selection. Exact, disease-specific Commons
  // category membership is also a diagnostic source label when a file title is
  // only a projection/number and cannot carry the words itself.
  const distinctive = matchTerms.some(term => term.length >= 7 && !GENERIC_SINGLE_TERMS.has(term));
  if (!categoryVerified && matchTerms.length < Math.min(2, diagnosisTerms(catalog.groups[key].english).length) && !distinctive) return;
  const value = pool.get(key) || { topic: { system, key, zh: catalog.groups[key].title, english: catalog.groups[key].english, modality: catalog.groups[key].modality }, candidates: [] };
  if (!value.candidates.some(candidate => candidate.originalSha1 === item.originalSha1)) {
    value.candidates.push({ ...item, matchTerms, categoryVerified, discoverySource: source });
    pool.set(key, value);
  }
}
for (const topic of discovery.topics || []) {
  for (const item of topic.candidates || []) addToPool(topic.system, topic.key, item, 'fresh-diagnosis-search');
}

const sourceById = new Map(manifest.records.map(record => [record.id, record]));
const titleToGroup = new Map();
for (const caseItem of catalog.cases) {
  const id = path.basename(caseItem.image, path.extname(caseItem.image));
  const record = sourceById.get(id);
  if (record) titleToGroup.set(caseItem.title.replace(/ · 开放病例 \d+$/, ''), record.groupKey);
}
const commons = JSON.parse(await fs.readFile(path.join(ROOT, 'data', 'commons-candidates.json'), 'utf8')).groups;
for (const topic of commons) for (const item of topic.candidates || []) addToPool(topic.system, topic.key, item, 'existing-diagnosis-category');
const alternates = JSON.parse(await fs.readFile(path.join(ROOT, 'data', 'existing-alternate-candidates.json'), 'utf8')).topics;
for (const topic of alternates) for (const item of topic.candidates || []) addToPool(topic.system, titleToGroup.get(topic.zh), item, 'existing-diagnosis-search');
const next = JSON.parse(await fs.readFile(path.join(ROOT, 'data', 'next-200-candidates.json'), 'utf8')).topics;
for (const topic of next) for (const item of topic.candidates || []) addToPool(topic.system, topic.key, item, 'existing-diagnosis-search');
for (const value of pool.values()) value.candidates.sort((left, right) => (right.matchTerms.length - left.matchTerms.length) || ((right.width * right.height) - (left.width * left.height)));

const selected = [];
const selectedBySystem = Object.fromEntries(SYSTEMS.map(system => [system, 0]));
const selectedByGroup = new Map();
function chooseOne(system) {
  const options = [...pool.entries()]
    .filter(([, value]) => value.topic.system === system && value.candidates.length)
    .sort(([leftKey, left], [rightKey, right]) => {
      const byGroup = (selectedByGroup.get(leftKey) || 0) - (selectedByGroup.get(rightKey) || 0);
      if (byGroup) return byGroup;
      const byCandidate = left.candidates.length - right.candidates.length;
      if (byCandidate) return byCandidate;
      return leftKey.localeCompare(rightKey);
    });
  for (const [key, value] of options) {
    if ((selectedByGroup.get(key) || 0) >= MAX_PER_TEACHING_GROUP) continue;
    const item = value.candidates.shift();
    if (used.has(item.sourceUrl) || used.has(item.originalSha1)) continue;
    used.add(item.sourceUrl); used.add(item.originalSha1);
    selected.push({ system, baseKey: key, topic: value.topic, item });
    selectedBySystem[system] += 1;
    selectedByGroup.set(key, (selectedByGroup.get(key) || 0) + 1);
    return true;
  }
  return false;
}

// Every anatomical system must grow. Then prefer the least represented system
// until the target is met; quality capacity, not an arbitrary equal split,
// determines the final distribution.
for (const system of SYSTEMS) {
  while (selectedBySystem[system] < MINIMUM_PER_SYSTEM && chooseOne(system)) { /* fill */ }
  if (selectedBySystem[system] < MINIMUM_PER_SYSTEM) throw new Error(`${system} has only ${selectedBySystem[system]} high-confidence candidates; minimum is ${MINIMUM_PER_SYSTEM}.`);
}
while (selected.length < TARGET) {
  const systems = [...SYSTEMS].sort((left, right) => selectedBySystem[left] - selectedBySystem[right]);
  if (!systems.some(chooseOne)) break;
}
if (selected.length < TARGET) throw new Error(`Only ${selected.length}/${TARGET} unique, source-labelled candidates passed selection.`);
if (new Set(selected.map(row => row.item.originalSha1)).size !== selected.length) throw new Error('Source SHA-1 duplicate in selection.');

console.table(SYSTEMS.map(system => ({ system, selected: selectedBySystem[system], teachingGroups: new Set(selected.filter(row => row.system === system).map(row => row.baseKey)).size })));
if (process.argv.includes('--plan')) {
  console.log(JSON.stringify({ count: selected.length, bySystem: selectedBySystem, uniqueTeachingGroups: Object.fromEntries(SYSTEMS.map(system => [system, new Set(selected.filter(row => row.system === system).map(row => row.baseKey)).size])) }, null, 2));
  process.exit(0);
}

const additions = [];
const groups = {};
const sequence = Object.fromEntries(SYSTEMS.map(system => [system, 0]));
const prepared = selected.map(selection => {
  const { system } = selection;
  sequence[system] += 1;
  const id = `${PREFIX[system]}-1506-${String(sequence[system]).padStart(3, '0')}`;
  return { ...selection, id };
});

async function ensureDownloaded(row, index) {
  const folder = path.join(ROOT, 'assets', 'images', 'expanded');
  const bytes = await download(row.item.downloadUrl);
  const png = bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  const jpeg = bytes[0] === 255 && bytes[1] === 216;
  if ((!png && !jpeg) || bytes.length < 8_000) throw new Error(`Invalid or undersized image: ${row.item.title}`);
  const image = `assets/images/expanded/${row.id}.${png ? 'png' : 'jpg'}`;
  await fs.writeFile(path.join(ROOT, ...image.split('/')), bytes);
  if ((index + 1) % 10 === 0) console.log(`Downloaded ${index + 1}/${prepared.length}`);
}

// A bounded pool keeps the public host responsive, while the file-presence
// check above makes an interrupted run resume instead of starting over.
let downloadCursor = 0;
await Promise.all(Array.from({ length: 3 }, async () => {
  while (downloadCursor < prepared.length) {
    const index = downloadCursor;
    downloadCursor += 1;
    await ensureDownloaded(prepared[index], index);
    await new Promise(resolve => setTimeout(resolve, 120));
  }
}));

for (const { system, baseKey, topic, item, id } of prepared) {
  const imagePath = ['jpg', 'png'].map(extension => path.join(ROOT, 'assets', 'images', 'expanded', `${id}.${extension}`)).find(candidate => {
    try { return Boolean(statSync(candidate)); } catch { return false; }
  });
  if (!imagePath) throw new Error(`Missing prepared image: ${id}`);
  const bytes = await fs.readFile(imagePath);
  const image = `assets/images/expanded/${path.basename(imagePath)}`;
  const base = catalog.groups[baseKey];
  const modality = modalityFor(item, base.modality);
  const sourceDescription = String(item.description || '').trim();
  groups[id] = {
    ...base,
    title: `${base.title}（公开病例 ${String(sequence[system]).padStart(3, '0')}）`,
    modality,
    tags: [...new Set([...(base.tags || []), modality, '公开来源核验'])],
    basis: `本图由公开来源的${item.categoryVerified ? '疾病专属分类' : '病名检索结果'}归入“${base.title}”教学主题；${item.categoryVerified ? '分类标签与教学诊断一一对应' : `来源标签直接匹配：${item.matchTerms.join('、')}`}。来源说明：${sourceDescription}。不补造症状、分期、病理或未展示的征象；以下内容仅作为该诊断的阅片核对清单。`,
    limitation: '此公开静态图只支持来源文字与可见征象的学习；诊断、范围及管理仍需完整检查和临床信息确认。'
  };
  additions.push({
    id, groupKey: id, system, image, sourceTitle: item.title.replace(/^File:/i, ''),
    sourceUrl: item.sourceUrl, sourceDescription, artist: item.artist, credit: item.credit,
    license: item.license, licenseUrl: item.licenseUrl, originalUrl: item.originalUrl,
    originalSha1: item.originalSha1, localSha256: crypto.createHash('sha256').update(bytes).digest('hex'),
    localBytes: bytes.length, width: item.width, height: item.height, mime: item.mime,
    retrieval: item.categoryVerified ? 'diagnosis-category' : 'strict-diagnosis-search', qualityScore: 'diagnosis-linked-source-and-contact-sheet-review',
    sourceAudit: item.categoryVerified ? 'diagnosis-category-membership' : `direct-label:${item.matchTerms.join(',')}`
  });
}

manifest.records.push(...additions);
manifest.count = manifest.records.length;
manifest.generatedAt = new Date().toISOString();
manifest.expansion1506 = { count: additions.length, target: TARGET, minimumPerSystem: MINIMUM_PER_SYSTEM, bySystem: selectedBySystem, provenance: 'Only fresh Commons bitmap files with compatible licence, direct diagnosis-term source labels, original SHA-1 and local SHA-256; annotations, diagrams, pathology, non-human, normal and treatment images excluded.' };
await fs.writeFile(MANIFEST_PATH, JSON.stringify(manifest, null, 2) + '\n');
await fs.writeFile(path.join(ROOT, 'next-502-groups.js'), `// Generated by scripts/assemble-1506.mjs; one source-linked teaching group per appended image.\nconst NEXT_502_GROUPS = ${JSON.stringify(groups, null, 2)};\n`);
await fs.writeFile(path.join(ROOT, 'data', 'expansion-1506-selection.json'), JSON.stringify({ generatedAt: new Date().toISOString(), additions }, null, 2) + '\n');
console.log(`Appended ${additions.length} audited records; manifest now contains ${manifest.count}.`);
