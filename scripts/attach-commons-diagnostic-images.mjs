import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';

const ROOT = path.resolve(import.meta.dirname, '..');
const API = 'https://commons.wikimedia.org/w/api.php';
const TARGET_SYSTEMS = new Set((process.env.IMAGE_SYSTEMS || 'chest,neck').split(','));
const LIMIT = Number(process.env.IMAGE_LIMIT || 40);
const CURATED = new Map([
  ['chest-nodule-tumor-part-solid-nodule', { title: 'File:CT of part solid lung nodule.png', modality: 'CT', note: '轴位肺窗同时显示磨玻璃与实性成分。' }],
  ['chest-ild-lam', { title: 'File:Lymphangioleiomyomatose - CT axial LF.jpg', modality: 'CT', note: '双肺弥漫、均匀分布的多发薄壁囊腔。' }],
  ['chest-airway-copd-emphysema', { title: 'File:Emphysema CT.JPG', modality: 'CT', note: '终末期肺气肿 CT 表现。' }],
  ['chest-airway-bullous-disease', { title: 'File:Bullus emphasemaCT.png', modality: 'CT', note: '肺大疱型肺气肿 CT 表现。' }],
  ['chest-infection-lung-abscess-necrotizing-pneumonia', { title: 'File:Pulmonaryabs.png', modality: 'CT', note: '右肺厚壁含液空腔，符合肺脓肿。' }],
  ['chest-infection-chronic-aspergillosis-aspergilloma', { title: 'File:Aspergilloma CT scan (5390986264).jpg', modality: 'CT', note: '肺曲菌球 CT 表现。' }],
  ['chest-pleura-wall-diaphragmatic-hernia', { title: 'File:PMC2739847 1749-7922-4-32-2.png', modality: 'CT', note: '左侧膈肌破裂后肠管疝入胸腔的轴位 CT。' }],
  ['chest-pleura-wall-pleural-plaques', { title: 'File:Asbestosis and cryptococcosis - Pleural plaques - CT scan Case 194 (5999300496).jpg', modality: 'CT', note: '多发钙化胸膜斑；原病例同时存在肺隐球菌病。' }],
  ['chest-vascular-pulmonary-infarction', { title: 'File:CT of lung infarction with reverse halo sign.png', modality: 'CT', note: '肺栓塞相关肺梗死，呈反晕征。' }]
]);
const manifestPath = path.join(ROOT, 'library-data', 'authorized-library-manifest.json');
const manifest = JSON.parse(await fs.readFile(manifestPath, 'utf8'));
if (process.argv.includes('--repair-rollback')) {
  const legacyWithoutRootCoverage = new Set(['maxillofacial', 'neck', 'oral', 'otology', 'pelvis']);
  for (const system of manifest.systems.filter(item => legacyWithoutRootCoverage.has(item.key))) {
    const filePath = path.join(ROOT, system.file);
    const data = JSON.parse(await fs.readFile(filePath, 'utf8'));
    delete data.coveredRecordCount;
    await fs.writeFile(filePath, JSON.stringify(data));
  }
  for (const key of ['maxillofacial', 'otology']) delete manifest.systems.find(item => item.key === key).coveredRecordCount;
  await fs.writeFile(manifestPath, JSON.stringify(manifest));
  console.log('Restored pre-import coverage metadata shape.');
  process.exit(0);
}
if (process.argv.includes('--rollback-generated')) {
  for (const system of manifest.systems) {
    const filePath = path.join(ROOT, system.file);
    const data = JSON.parse(await fs.readFile(filePath, 'utf8'));
    for (const record of data.records) {
      if ((record.images || []).some(image => String(image.src || '').startsWith('assets/authorized/web-search/'))) {
        record.images = [];
        record.imageCount = 0;
      }
    }
    data.imageCount = new Set(data.records.flatMap(record => (record.images || []).map(image => image.src)).filter(Boolean)).size;
    data.coveredRecordCount = data.records.filter(record => record.images?.length).length;
    system.imageCount = data.imageCount;
    system.coveredRecordCount = data.coveredRecordCount;
    await fs.writeFile(filePath, JSON.stringify(data));
  }
  manifest.totals.images = manifest.systems.reduce((sum, item) => sum + item.imageCount, 0);
  manifest.totals.coveredRecords = manifest.systems.reduce((sum, item) => sum + item.coveredRecordCount, 0);
  await fs.writeFile(manifestPath, JSON.stringify(manifest));
  await fs.rm(path.join(ROOT, 'assets', 'authorized', 'web-search'), { recursive: true, force: true });
  await fs.rm(path.join(ROOT, 'data', 'diagnostic-card-image-import-audit.json'), { force: true });
  console.log('Rolled back generated web-search images and metadata.');
  process.exit(0);
}
const used = new Set();
for (const system of manifest.systems) {
  const data = JSON.parse(await fs.readFile(path.join(ROOT, system.file), 'utf8'));
  for (const record of data.records) for (const image of record.images || []) {
    if (image.sourceUrl) used.add(image.sourceUrl);
    if (image.src) used.add(image.src);
  }
}

const plain = value => String(value || '').replace(/<br\s*\/?>/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/gi, ' ').replace(/&amp;/gi, '&').replace(/\s+/g, ' ').trim();
const normalized = value => plain(value).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const reject = /histopath|histolog|microscop|\bmag\b|magnification|oxyphil|cytolog|biopsy|stain|tumou?r cells|gross specimen|gross pathology|excision|resection|diagram|illustration|drawing|surgery|operative|clinical photograph|patient photograph|cadaver|autopsy|veterinary|canine|feline|dog |cat |rabbit|mouse |rat /i;
const allowed = /^(CC0|Public domain|PD|CC BY|CC BY-SA)/i;
const modalityTerms = {
  CT: /\b(ct|computed tomography|hrct|tomogram)\b/i,
  MRI: /\b(mri|magnetic resonance|t1|t2|flair|dwi)\b/i,
  US: /\b(ultrasound|ultrasonograph|sonogram|doppler)\b/i,
  'X-RAY': /\b(x[ -]?ray|radiograph|roentgen)\b/i,
  CTA: /\b(cta|angiograph|computed tomography)\b/i
};

function modalitiesFor(record) {
  const declared = String(record.modality || '').toUpperCase();
  const modes = [];
  if (/CT|CBCT/.test(declared) || record.imaging?.ct) modes.push('CT');
  if (/MRI|MR\b/.test(declared) || record.imaging?.mri) modes.push('MRI');
  if (/US|超声/.test(declared) || record.imaging?.us || record.imaging?.ultrasound) modes.push('US');
  if (/X-RAY|XRAY|RADIOGRAPH|平片|曲面/.test(declared) || record.imaging?.xray) modes.push('X-RAY');
  if (/CTA/.test(declared)) modes.unshift('CTA');
  return [...new Set(modes)];
}

async function search(record, modality) {
  const english = record.nameEn?.trim();
  if (!english || english.length < 4) return [];
  const query = `${english} ${modality}`;
  const body = new URLSearchParams({ action: 'query', format: 'json', formatversion: '2', generator: 'search', gsrsearch: `${query} filetype:bitmap`, gsrnamespace: '6', gsrlimit: '20', prop: 'imageinfo', iiprop: 'url|sha1|mime|size|extmetadata', iiurlwidth: '1200' });
  const response = await fetch(API, { method: 'POST', headers: { 'User-Agent': 'YingyanDiagnosticCardImageImporter/1.0', 'Content-Type': 'application/x-www-form-urlencoded' }, body });
  if (!response.ok) throw new Error(`Commons ${response.status}`);
  const json = await response.json();
  const phrase = normalized(english);
  return (json.query?.pages || []).map(page => {
    const info = page.imageinfo?.[0], meta = info?.extmetadata || {};
    if (!info) return null;
    const item = {
      title: page.title,
      description: plain(meta.ImageDescription?.value || meta.ObjectName?.value || page.title),
      sourceUrl: info.descriptionurl,
      downloadUrl: info.thumburl || info.url,
      originalUrl: info.url,
      sha1: info.sha1,
      width: info.width,
      height: info.height,
      mime: info.mime,
      license: plain(meta.LicenseShortName?.value || meta.License?.value),
      licenseUrl: meta.LicenseUrl?.value || '',
      artist: plain(meta.Artist?.value || 'Wikimedia Commons contributor'),
      credit: plain(meta.Credit?.value || '')
    };
    const haystack = normalized(`${item.title} ${item.description}`);
    const modalityOk = modalityTerms[modality].test(`${item.title} ${item.description}`);
    const exactDiagnosis = haystack.includes(phrase);
    const valid = /^image\/(jpeg|png)$/i.test(item.mime) && allowed.test(item.license) && Math.min(item.width, item.height) >= 300 && !reject.test(`${item.title} ${item.description}`) && !used.has(item.sourceUrl) && exactDiagnosis && modalityOk;
    return valid ? { ...item, matchedModality: modality } : null;
  }).filter(Boolean).sort((a, b) => (b.width * b.height) - (a.width * a.height));
}

async function exactFile(spec) {
  const params = new URLSearchParams({ action: 'query', format: 'json', formatversion: '2', titles: spec.title, prop: 'imageinfo', iiprop: 'url|sha1|mime|size|extmetadata', iiurlwidth: '1200' });
  const response = await fetch(`${API}?${params}` , { headers: { 'User-Agent': 'YingyanDiagnosticCardImageImporter/1.0' } });
  if (!response.ok) throw new Error(`Commons ${response.status}`);
  const page = (await response.json()).query?.pages?.[0], info = page?.imageinfo?.[0], meta = info?.extmetadata || {};
  if (!info) return null;
  const item = { title: page.title, description: plain(meta.ImageDescription?.value || meta.ObjectName?.value || page.title), sourceUrl: info.descriptionurl, downloadUrl: info.thumburl || info.url, originalUrl: info.url, sha1: info.sha1, width: info.width, height: info.height, mime: info.mime, license: plain(meta.LicenseShortName?.value || meta.License?.value), licenseUrl: meta.LicenseUrl?.value || '', artist: plain(meta.Artist?.value || 'Wikimedia Commons contributor'), credit: plain(meta.Credit?.value || ''), matchedModality: spec.modality, curatedNote: spec.note };
  return /^image\/(jpeg|png)$/i.test(item.mime) && allowed.test(item.license) && Math.min(item.width, item.height) >= 300 && !used.has(item.sourceUrl) ? item : null;
}

let attached = 0;
const audit = [];
for (const system of manifest.systems.filter(item => TARGET_SYSTEMS.has(item.key))) {
  const filePath = path.join(ROOT, system.file);
  const data = JSON.parse(await fs.readFile(filePath, 'utf8'));
  for (const record of data.records) {
    if (attached >= LIMIT || record.images?.length) continue;
    let candidates = [];
    const modalities = modalitiesFor(record);
    try {
      const curated = CURATED.get(record.id);
      if (curated) {
        const exact = await exactFile(curated);
        if (exact) candidates.push(exact);
      } else {
        for (const modality of modalities) candidates.push(...await search(record, modality));
      }
    } catch (error) { audit.push({ system: system.key, id: record.id, name: record.name, status: 'search-error', error: error.message }); continue; }
    if (!candidates.length) { audit.push({ system: system.key, id: record.id, name: record.name, status: 'no-high-confidence-match' }); continue; }
    const selected = candidates[0];
    const response = await fetch(selected.downloadUrl);
    if (!response.ok) { audit.push({ system: system.key, id: record.id, name: record.name, status: 'download-error', error: String(response.status) }); continue; }
    const bytes = Buffer.from(await response.arrayBuffer());
    const isPng = bytes.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10]));
    const isJpeg = bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
    if ((!isPng && !isJpeg) || bytes.length < 10000) { audit.push({ system: system.key, id: record.id, name: record.name, status: 'invalid-image' }); continue; }
    const relative = `assets/authorized/${system.key}/web-search/${record.id}.${isPng ? 'png' : 'jpg'}`;
    await fs.mkdir(path.dirname(path.join(ROOT, relative)), { recursive: true });
    await fs.writeFile(path.join(ROOT, relative), bytes);
    record.images = [{
      type: selected.matchedModality, caption: record.name, src: relative,
      source: selected.title.replace(/^File:/, ''), sourceUrl: selected.sourceUrl,
      license: selected.license, licenseUrl: selected.licenseUrl,
      relation: selected.curatedNote || `公开来源标题或说明明确包含“${record.nameEn}”，影像模态为 ${selected.matchedModality}`,
      sourceDescription: selected.description, artist: selected.artist, credit: selected.credit,
      originalUrl: selected.originalUrl, originalSha1: selected.sha1,
      localSha256: crypto.createHash('sha256').update(bytes).digest('hex')
    }];
    record.imageCount = 1;
    used.add(selected.sourceUrl); used.add(relative); attached += 1;
    audit.push({ system: system.key, id: record.id, name: record.name, status: 'attached', sourceUrl: selected.sourceUrl, sourceTitle: selected.title });
    console.log(`${attached}/${LIMIT} ${system.name} · ${record.name} <- ${selected.title}`);
    await new Promise(resolve => setTimeout(resolve, 250));
  }
  data.imageCount = new Set(data.records.flatMap(record => (record.images || []).map(image => image.src)).filter(Boolean)).size;
  data.coveredRecordCount = data.records.filter(record => record.images?.length).length;
  system.imageCount = data.imageCount; system.coveredRecordCount = data.coveredRecordCount;
  await fs.writeFile(filePath, JSON.stringify(data));
}
manifest.totals.images = manifest.systems.reduce((sum, item) => sum + item.imageCount, 0);
manifest.totals.coveredRecords = manifest.systems.reduce((sum, item) => sum + item.coveredRecordCount, 0);
await fs.writeFile(manifestPath, JSON.stringify(manifest));
await fs.writeFile(path.join(ROOT, 'data', 'diagnostic-card-image-import-audit.json'), JSON.stringify({ generatedAt: new Date().toISOString(), systems: [...TARGET_SYSTEMS], limit: LIMIT, attached, records: audit }, null, 2) + '\n');
console.log(`Attached ${attached} high-confidence diagnostic-card images.`);
