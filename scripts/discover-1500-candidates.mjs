/**
 * Find fresh, diagnosis-labelled Commons candidates for the 1,500-case atlas.
 *
 * Discovery is deliberately separate from selection: this file records only
 * source metadata. assemble-1506.mjs applies the stricter term, file, licence
 * and perceptual-duplicate gates before anything enters the public catalog.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import vm from 'node:vm';

const ROOT = path.resolve(import.meta.dirname, '..');
const OUTPUT = path.join(ROOT, 'data', 'candidates-1500.json');
const CHECKPOINT = path.join(ROOT, 'data', 'candidates-1500.checkpoint.json');
const CATALOG_SCRIPTS = [
  'cases.js', 'curriculum.js', 'expanded-sources.js', 'additional-groups.js',
  'next-76-groups.js', 'next-200-groups.js', 'next-200-review.js',
  'next-304-groups.js', 'expanded-cases.js'
];
const SYSTEMS = [['胸部', 'chest-'], ['神经', 'neuro-'], ['腹部', 'abdomen-'], ['骨骼', 'bone-']];
const API = 'https://commons.wikimedia.org/w/api.php';
const REJECT = /annotation|annotated|\bmark\b|arrows?|diagram|scheme|schematic|drawing|histolog|histopath|pathologic|micrograph|gross pathology|autopsy|specimen|cytology|cells or tissue|veterinary|\bdog\b|\bcat\b|canine|feline|operative photograph|surgery photo|mummy|historic|historical|tactical|normal chest|\bno[nr]?mal\b|segmentation|treatment plan|\bkein\b|\bwithout\b|\bno\b/i;
const STOP_WORDS = new Set(['with', 'without', 'disease', 'syndrome', 'imaging', 'image', 'pattern', 'radiograph', 'computed', 'tomography', 'magnetic', 'resonance', 'acute', 'chronic', 'primary', 'secondary', 'other', 'left', 'right', 'brain', 'chest', 'bone', 'spine']);
const GENERIC_SINGLE_TERMS = new Set(['pulmonary', 'thoracic', 'cardiac', 'cerebral', 'abdominal', 'carcinoma', 'cancer', 'fracture', 'arthritis', 'infection', 'injury', 'lesion', 'tumor', 'tumour', 'disease', 'syndrome', 'fibrosis', 'pneumonia', 'infarction', 'hemorrhage', 'haemorrhage', 'dislocation', 'metastasis', 'metastases']);

const plain = value => String(value || '')
  .replace(/<[^>]*>/g, ' ')
  .replace(/&nbsp;|&#160;/g, ' ')
  .replace(/&amp;/g, '&')
  .replace(/\s+/g, ' ')
  .trim();

function termsFor(english) {
  return [...new Set((String(english || '').toLowerCase().match(/[a-z]{4,}/g) || [])
    .filter(term => !STOP_WORDS.has(term)))];
}

function directMatch(topic, item) {
  const text = `${item.title} ${item.description}`.toLowerCase();
  const terms = termsFor(topic.english);
  const hits = terms.filter(term => text.includes(term));
  const distinctive = hits.filter(term => term.length >= 7 && !GENERIC_SINGLE_TERMS.has(term));
  return { terms, hits, matchCount: hits.length, required: Math.min(2, terms.length), distinctive };
}

function acceptable(item) {
  return /^image\/(jpeg|png)$/i.test(item.mime || '')
    && /CC0|public domain|CC BY/i.test(item.license || '')
    && Math.min(Number(item.width) || 0, Number(item.height) || 0) >= 480
    && String(item.description || '').trim().length >= 8
    && !REJECT.test(`${item.title} ${item.description}`);
}

async function loadCatalog() {
  const source = (await Promise.all(CATALOG_SCRIPTS.map(file => fs.readFile(path.join(ROOT, file), 'utf8')))).join('\n');
  return JSON.parse(vm.runInNewContext(`${source}\nJSON.stringify({groups:EXPANDED_GROUPS})`));
}

async function query(topic, queryText, attempt = 0) {
  const params = new URLSearchParams({
    action: 'query', format: 'json', formatversion: '2', generator: 'search',
    gsrsearch: `${queryText} filetype:bitmap`, gsrnamespace: '6', gsrlimit: '50',
    prop: 'imageinfo', iiprop: 'url|sha1|mime|size|extmetadata', iiurlwidth: '1400', origin: '*'
  });
  const response = await fetch(`${API}?${params}`, {
    headers: { 'User-Agent': 'MedicalImagingLearningAudit/6.0 (https://github.com/a1553189184-stack/medical-imaging-learning)' }
  });
  if (!response.ok) {
    if ((response.status === 429 || response.status >= 500) && attempt < 7) {
      await new Promise(resolve => setTimeout(resolve, 1800 * (attempt + 1)));
      return query(topic, queryText, attempt + 1);
    }
    throw new Error(`${response.status} ${topic.english}`);
  }
  const json = await response.json();
  const candidates = [];
  for (const page of json.query?.pages || []) {
    const info = page.imageinfo?.[0];
    const meta = info?.extmetadata || {};
    if (!info) continue;
    const item = {
      title: page.title, sourceUrl: info.descriptionurl, originalUrl: info.url,
      downloadUrl: info.thumburl || info.url, originalSha1: info.sha1,
      width: info.width, height: info.height, mime: info.mime,
      license: plain(meta.LicenseShortName?.value || meta.License?.value),
      licenseUrl: meta.LicenseUrl?.value || '', artist: plain(meta.Artist?.value || 'Wikimedia Commons contributor'),
      credit: plain(meta.Credit?.value || ''),
      description: plain(meta.ImageDescription?.value || meta.ObjectName?.value || page.title)
    };
    if (!acceptable(item)) continue;
    const evidence = directMatch(topic, item);
    if (evidence.matchCount < evidence.required && !evidence.distinctive.length) continue;
    candidates.push({ ...item, matchTerms: evidence.hits });
  }
  return candidates;
}

const catalog = await loadCatalog();
const manifest = JSON.parse(await fs.readFile(path.join(ROOT, 'data', 'expanded-case-sources.json'), 'utf8'));
const used = new Set(manifest.records.flatMap(record => [record.sourceUrl, record.originalSha1]));
const topics = [];
for (const [system, prefix] of SYSTEMS) {
  const seen = new Set();
  for (const [key, group] of Object.entries(catalog.groups)) {
    // The 1,004 batch is source-specific clones. Search each canonical teaching
    // group once; this avoids multiplying a single diagnosis into filler cases.
    if (!key.startsWith(prefix) || /-1004-/.test(key) || !group.english || seen.has(group.english)) continue;
    seen.add(group.english);
    topics.push({ system, key, zh: group.title, english: group.english, modality: group.modality || 'X-RAY' });
  }
}

let output = new Array(topics.length);
try {
  const checkpoint = JSON.parse(await fs.readFile(CHECKPOINT, 'utf8'));
  if (!process.argv.includes('--refresh') && Array.isArray(checkpoint.topics) && checkpoint.topics.length === topics.length) output = checkpoint.topics;
} catch { /* first run */ }
let checkpointWrite = Promise.resolve();
async function persistCheckpoint() {
  // Windows can reject simultaneous open-for-write calls. Serialize the two
  // workers' checkpoints so a transient file lock never loses discovery work.
  checkpointWrite = checkpointWrite.then(() => fs.writeFile(CHECKPOINT, JSON.stringify({ topics: output }, null, 2) + '\n'));
  await checkpointWrite;
}
async function discoverOne(topic, index) {
  const modalityHint = /MRI/.test(topic.modality) ? 'MRI' : /CT/.test(topic.modality) ? 'CT' : /US/.test(topic.modality) ? 'ultrasound' : 'x-ray';
  const queries = [`"${topic.english}" radiology`, `${topic.english} ${modalityHint}`];
  const bySha = new Map();
  for (const queryText of queries) {
    for (const item of await query(topic, queryText)) {
      if (!used.has(item.sourceUrl) && !used.has(item.originalSha1) && !bySha.has(item.originalSha1)) bySha.set(item.originalSha1, item);
    }
    await new Promise(resolve => setTimeout(resolve, 130));
  }
  const candidates = [...bySha.values()]
    .sort((left, right) => (right.matchTerms.length - left.matchTerms.length) || ((right.width * right.height) - (left.width * left.height)))
    .slice(0, 30);
  output[index] = { ...topic, candidates };
  await persistCheckpoint();
  console.log(`${index + 1}/${topics.length} ${topic.system}:${topic.english} ${candidates.length}`);
}

// Metadata lookups are independent. A small fixed worker pool avoids a long
// serial scrape while staying well below Commons' normal API burst tolerance.
let nextIndex = 0;
const workers = Array.from({ length: 2 }, async () => {
  while (nextIndex < topics.length) {
    const index = nextIndex;
    nextIndex += 1;
    if (output[index]) continue;
    await discoverOne(topics[index], index);
  }
});
await Promise.all(workers);

await fs.writeFile(OUTPUT, JSON.stringify({
  generatedAt: new Date().toISOString(),
  provenance: 'Two diagnosis-specific Commons searches per canonical teaching group; each stored candidate passes static media, licence, size, rejection-pattern and either a two-term source-label match or a distinctive non-generic diagnosis-token match.',
  topics: output
}, null, 2) + '\n');
await fs.rm(CHECKPOINT, { force: true });
console.log(`Wrote ${output.length} topics to ${path.relative(ROOT, OUTPUT)}.`);
