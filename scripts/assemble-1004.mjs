/**
 * Append a source-audited, diagnosis-linked 304-case expansion.
 *
 * This deliberately selects only images already returned by either a Commons
 * diagnosis category or a diagnosis-specific Commons search for a teaching
 * group that exists in the catalog. It does not invent patient history,
 * stage, pathology or image-specific findings.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import vm from 'node:vm';

const ROOT = path.resolve(import.meta.dirname, '..');
const MANIFEST_PATH = path.join(ROOT, 'data', 'expanded-case-sources.json');
// Allocation is deliberately uneven: it follows the number of source-label-matched,
// non-annotated images available for each system instead of padding a weak system.
const TARGETS = { '胸部': 57, '神经': 78, '腹部': 75, '骨骼': 94 };
const MAX_PER_TEACHING_GROUP = 5;
const PREFIX = { '胸部': 'chest', '神经': 'neuro', '腹部': 'abdomen', '骨骼': 'bone' };
const SYSTEMS = Object.keys(TARGETS);
const REJECT = /annotation|annotated|\bmark\b|arrows?|diagram|scheme|schematic|drawing|histolog|histopath|pathologic|micrograph|gross pathology|autopsy|specimen|cytology|cells or tissue|veterinary|\bdog\b|\bcat\b|canine|feline|operative photograph|surgery photo|mummy|historic|historical|tactical|normal chest|\bno[nr]?mal\b|segmentation|treatment plan|\bkein\b|\bwithout\b|\bno\b/i;
// Different Commons exports of the same underlying image can have distinct
// original SHA-1s. These were rejected after perceptual-hash review.
const REJECTED_SHA1 = new Set([
  '02f5567e26e63dddb2a3c1edee554b1cdcb808b2','e2228e61ea56a9d30aec7cfe9a257a4273506b88',
  '5077021c36e3b6ba3fd7f2c4df48d13ba2ab7a24','1b3be9fe6701203cdcd24092a23432e813ad45a2',
  '15ca925599c6841096b625e183f113d477948180','2d705a58a932f6eb1d71b5422c841101ca9431aa',
  '50b60f11e59965b81741c7d0e6f0274e62077a27','26681ea91e6aa8fabd0fe97e08153384d3a69a98',
  'de57112c7b0e9a8a39e8d3d685d113f349e9a5ee','a464bfa04593ad76556c4b5feed555d03bfbfd9a',
  '39a6fb99298b0a1be69f55456293c1863421bfce','c60b0832a81561b7656669c5b343ddddb7790cce',
  '32db68900121547eb6af6b3abefa1516f2ff8af6','fbcc7a77b90941166f96304064c41566a3711f36',
  '80377e233ba0b34d29fe2aace70024acb9bb3bff','cadb91940e1fbfc8a53106fd5dcb60c0ab9c843c',
  'b8d56384cc7cc00d2b18313863df9d467631a527','f8fadea926239afffb0138f25880d09f81bb52a6',
  '5092f2b1c1459c7d1992b61ce4e273ee50240cad','7daacfbdcda3e04071884544c48aa76731d34b15',
  '643b7c1827d03a10052e80a9347678c6b50d39d5'
]);
const STOP_WORDS = new Set(['with', 'without', 'disease', 'syndrome', 'imaging', 'image', 'pattern', 'radiograph', 'computed', 'tomography', 'magnetic', 'resonance', 'acute', 'chronic', 'primary', 'secondary', 'other', 'left', 'right']);

function diagnosisTitle(caseItem) {
  return caseItem.title.replace(/ · 开放病例 \d+$/, '');
}

function modalityFor(item, fallback) {
  const text = `${item.title} ${item.description}`;
  if (/MRCP|MRT|MRI|\bMR\b/i.test(text)) return 'MRI';
  if (/CT|CCT|computed tomography/i.test(text)) return 'CT';
  if (/ultrasound|sonograph|\bUS\b/i.test(text)) return 'US';
  if (/scinti|bone scan/i.test(text)) return '骨显像';
  return fallback || 'X-RAY';
}

function isImageCandidate(item) {
  return /^image\/(jpeg|png)$/i.test(item.mime || '')
    && /CC0|public domain|CC BY/i.test(item.license || '')
    && Math.min(Number(item.width) || 0, Number(item.height) || 0) >= 480
    && String(item.description || '').trim().length >= 8
    && !REJECTED_SHA1.has(item.originalSha1)
    && !REJECT.test(`${item.title} ${item.description}`);
}

function specificMatch(topic, item) {
  const text = `${item.title} ${item.description}`.toLowerCase();
  const terms = String(topic.en || '').toLowerCase().match(/[a-z]{5,}/g) || [];
  return terms.filter(term => !STOP_WORDS.has(term)).some(term => text.includes(term));
}

async function catalog() {
  const files = ['cases.js', 'curriculum.js', 'expanded-sources.js', 'additional-groups.js', 'next-76-groups.js', 'next-200-groups.js', 'next-200-review.js', 'next-304-groups.js', 'expanded-cases.js'];
  const source = (await Promise.all(files.map(file => fs.readFile(path.join(ROOT, file), 'utf8')))).join('\n');
  return JSON.parse(vm.runInNewContext(`${source}\nJSON.stringify({cases:CASES,groups:EXPANDED_GROUPS})`));
}

async function download(url, attempt = 0) {
  try {
    const response = await fetch(url, { headers: { 'User-Agent': 'MedicalImagingLearningAudit/5.0 (https://github.com/a1553189184-stack/medical-imaging-learning)' } });
    if ((response.status === 429 || response.status >= 500) && attempt < 7) {
      await new Promise(resolve => setTimeout(resolve, 1800 * (attempt + 1)));
      return download(url, attempt + 1);
    }
    if (!response.ok) throw new Error(`${response.status} ${url}`);
    return Buffer.from(await response.arrayBuffer());
  } catch (error) {
    if (attempt >= 7) throw error;
    await new Promise(resolve => setTimeout(resolve, 1800 * (attempt + 1)));
    return download(url, attempt + 1);
  }
}

const manifest = JSON.parse(await fs.readFile(MANIFEST_PATH, 'utf8'));
if (manifest.count !== manifest.records.length) throw new Error('Source manifest count mismatch');
const existing = await catalog();
if (existing.cases.length !== 700 || manifest.records.length !== 686) {
  throw new Error('This append-only script is intentionally pinned to the verified 700-case catalog.');
}
const sourceById = new Map(manifest.records.map(record => [record.id, record]));
const titleToGroup = new Map();
for (const caseItem of existing.cases) {
  const id = path.basename(caseItem.image, path.extname(caseItem.image));
  const source = sourceById.get(id);
  if (source) titleToGroup.set(diagnosisTitle(caseItem), source.groupKey);
}
const groupCounts = new Map(manifest.records.map(record => record.groupKey).map(key => [key, 0]));
for (const record of manifest.records) groupCounts.set(record.groupKey, (groupCounts.get(record.groupKey) || 0) + 1);
const usedUrls = new Set(manifest.records.map(record => record.sourceUrl));
const usedSha1 = new Set(manifest.records.map(record => record.originalSha1));

const poolBySystem = Object.fromEntries(SYSTEMS.map(system => [system, new Map()]));
function addCandidate(system, baseKey, topic, item, origin) {
  if (!SYSTEMS.includes(system) || !existing.groups[baseKey] || !isImageCandidate(item)) return;
  if (usedUrls.has(item.sourceUrl) || usedSha1.has(item.originalSha1)) return;
  // A category can contain mimics, normal comparisons or procedural images.
  // Require a direct diagnosis-term match even for category membership.
  if (!specificMatch(topic, item)) return;
  const bucket = poolBySystem[system].get(baseKey) || [];
  if (bucket.some(candidate => candidate.item.originalSha1 === item.originalSha1)) return;
  bucket.push({ system, baseKey, topic, item, origin, directMatch: specificMatch(topic, item) });
  poolBySystem[system].set(baseKey, bucket);
}

const commons = JSON.parse(await fs.readFile(path.join(ROOT, 'data', 'commons-candidates.json'), 'utf8')).groups;
for (const topic of commons) {
  const baseKey = topic.key;
  const matchingTopic = { ...topic, en: existing.groups[baseKey]?.english || topic.search };
  for (const item of topic.candidates || []) addCandidate(topic.system, baseKey, matchingTopic, item, 'diagnosis-category');
}
const alternates = JSON.parse(await fs.readFile(path.join(ROOT, 'data', 'existing-alternate-candidates.json'), 'utf8')).topics;
for (const topic of alternates) {
  const baseKey = titleToGroup.get(topic.zh);
  for (const item of topic.candidates || []) addCandidate(topic.system, baseKey, topic, item, 'topic-search');
}
// The 700-case source discovery contains additional, directly labelled images
// for 70 already-established teaching topics. Reuse only those whose English
// diagnosis exactly maps to a hand-selected 700 teaching group.
const nextTopicGroups = new Map();
for (const [key, group] of Object.entries(existing.groups)) {
  if (/^(chest|neuro|abdomen|bone)-700-/.test(key) && group.english) {
    const keys = nextTopicGroups.get(group.english) || [];
    keys.push(key);
    nextTopicGroups.set(group.english, keys);
  }
}
const nextTopics = JSON.parse(await fs.readFile(path.join(ROOT, 'data', 'next-200-candidates.json'), 'utf8')).topics;
for (const topic of nextTopics) {
  const baseKey = nextTopicGroups.get(topic.en)?.[0];
  for (const item of topic.candidates || []) addCandidate(topic.system, baseKey, topic, item, 'topic-search');
}

const selected = [];
for (const system of SYSTEMS) {
  const buckets = [...poolBySystem[system].entries()]
    .map(([key, candidates]) => [key, candidates.sort((a, b) => {
      if (a.directMatch !== b.directMatch) return Number(b.directMatch) - Number(a.directMatch);
      if (a.origin !== b.origin) return a.origin === 'topic-search' ? -1 : 1;
      return (b.item.width * b.item.height) - (a.item.width * a.item.height);
    })])
    .sort((a, b) => (groupCounts.get(a[0]) || 0) - (groupCounts.get(b[0]) || 0));
  const perGroup = new Map(buckets.map(([key]) => [key, 0]));
  let cursor = 0;
  while (selected.filter(entry => entry.system === system).length < TARGETS[system]) {
    let added = false;
    for (let turns = 0; turns < buckets.length; turns += 1) {
      const [key, candidates] = buckets[cursor % buckets.length];
      cursor += 1;
      if (perGroup.get(key) >= MAX_PER_TEACHING_GROUP || !candidates.length) continue;
      const candidate = candidates.shift();
      if (usedUrls.has(candidate.item.sourceUrl) || usedSha1.has(candidate.item.originalSha1)) continue;
      usedUrls.add(candidate.item.sourceUrl);
      usedSha1.add(candidate.item.originalSha1);
      perGroup.set(key, perGroup.get(key) + 1);
      selected.push(candidate);
      added = true;
      break;
    }
    if (!added) throw new Error(`Only selected ${selected.filter(entry => entry.system === system).length}/${TARGETS[system]} acceptable ${system} images`);
  }
}
if (selected.length !== 304) throw new Error(`Expected 304 selections, got ${selected.length}`);
console.table(SYSTEMS.map(system => ({ system, selected: selected.filter(entry => entry.system === system).length, teachingGroups: new Set(selected.filter(entry => entry.system === system).map(entry => entry.baseKey)).size })));
if (process.argv.includes('--plan')) {
  console.log(JSON.stringify(selected.map((entry, index) => ({ index, system: entry.system, baseKey: entry.baseKey, sourceTitle: entry.item.title, sourceSha1: entry.item.originalSha1 }))));
  process.exit(0);
}

const additions = [];
const groups = {};
const sequence = Object.fromEntries(SYSTEMS.map(system => [system, 0]));
for (let index = 0; index < selected.length; index += 1) {
  const selection = selected[index];
  const { item, baseKey, system } = selection;
  sequence[system] += 1;
  const id = `${PREFIX[system]}-1004-${String(sequence[system]).padStart(3, '0')}`;
  const extensionHint = /\.png$/i.test(item.title) ? 'png' : 'jpg';
  const plannedImage = path.join(ROOT, 'assets', 'images', 'expanded', `${id}.${extensionHint}`);
  let bytes;
  try {
    bytes = await fs.readFile(plannedImage);
  } catch {
    bytes = await download(item.downloadUrl);
  }
  const png = bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  const jpeg = bytes[0] === 255 && bytes[1] === 216;
  if ((!png && !jpeg) || bytes.length < 20_000) throw new Error(`Invalid or undersized image: ${item.title}`);
  const image = `assets/images/expanded/${id}.${png ? 'png' : 'jpg'}`;
  await fs.writeFile(path.join(ROOT, ...image.split('/')), bytes);
  const base = existing.groups[baseKey];
  const modality = modalityFor(item, base.modality);
  const sourceDescription = String(item.description || '').trim();
  groups[id] = {
    ...base,
    title: `${base.title}（公开病例 ${String(sequence[system]).padStart(2, '0')}）`,
    modality,
    tags: [...new Set([...(base.tags || []), modality, '公开来源核验'])],
    basis: `本图由公开来源的${selection.origin === 'diagnosis-category' ? '诊断分类' : '病名检索结果'}归入“${base.title}”教学主题。来源说明：${sourceDescription}。不补造症状、分期、病理或未展示的征象；以下内容作为该诊断的阅片核对清单。`,
    limitation: '此公开静态图只支持来源文字与可见征象的学习；诊断、范围及管理仍需完整检查和临床信息确认。'
  };
  additions.push({
    id, groupKey: id, system, image,
    sourceTitle: item.title.replace(/^File:/i, ''), sourceUrl: item.sourceUrl, sourceDescription,
    artist: item.artist, credit: item.credit, license: item.license, licenseUrl: item.licenseUrl,
    originalUrl: item.originalUrl, originalSha1: item.originalSha1,
    localSha256: crypto.createHash('sha256').update(bytes).digest('hex'), localBytes: bytes.length,
    width: item.width, height: item.height, mime: item.mime,
    retrieval: selection.origin, qualityScore: 'diagnosis-linked-source-and-contact-sheet-review',
    sourceAudit: selection.directMatch ? 'source-label-matches-topic' : 'diagnosis-category-membership'
  });
  if ((index + 1) % 10 === 0) console.log(`Downloaded ${index + 1}/${selected.length}`);
  await new Promise(resolve => setTimeout(resolve, 180));
}

manifest.records.push(...additions);
manifest.count = manifest.records.length;
manifest.generatedAt = new Date().toISOString();
manifest.expansion1004 = {
  count: additions.length, targets: TARGETS,
  provenance: 'Only existing diagnosis-linked Commons categories or source-label-matched diagnosis searches; non-radiology/annotated/pathology images excluded.'
};
await fs.writeFile(MANIFEST_PATH, JSON.stringify(manifest, null, 2) + '\n');
await fs.writeFile(path.join(ROOT, 'next-304-groups.js'), `// Generated by scripts/assemble-1004.mjs; one source-linked teaching group per appended image.\nconst NEXT_304_GROUPS = ${JSON.stringify(groups, null, 2)};\n`);
await fs.writeFile(path.join(ROOT, 'data', 'expansion-1004-selection.json'), JSON.stringify({ generatedAt: new Date().toISOString(), additions }, null, 2) + '\n');
console.log(`Appended ${additions.length} audited records; manifest now contains ${manifest.count}.`);
