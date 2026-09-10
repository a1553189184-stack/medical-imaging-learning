import fs from 'node:fs/promises';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const API = 'https://commons.wikimedia.org/w/api.php';
const USER_AGENT = 'MedicalImagingLearningAudit/1.0 (https://github.com/a1553189184-stack/medical-imaging-learning)';
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

// Each group must resolve to at least five independently licensed source files.
// A search fallback is used only for categories that contain fewer than five direct files.
const GROUPS = [
  ['chest-pneumothorax','胸部','X-rays of pneumothorax','pneumothorax radiograph'],
  ['chest-pleural-effusion','胸部','X-rays of pleural effusion','pleural effusion radiograph'],
  ['chest-pneumonia','胸部','X-rays of pneumonia','pneumonia chest radiograph'],
  ['chest-pulmonary-edema','胸部','X-rays of pulmonary edema','pulmonary edema radiograph'],
  ['chest-pulmonary-embolism','胸部','CT images of pulmonary embolism','pulmonary embolism CT'],
  ['chest-tuberculosis','胸部','X-rays of tuberculosis','pulmonary tuberculosis radiograph'],
  ['chest-atelectasis','胸部','X-rays of atelectasis','atelectasis radiograph'],
  ['chest-covid','胸部','X-rays of COVID-19','COVID-19 chest radiograph'],
  ['chest-cardiomegaly','胸部','X-rays of cardiomegaly','cardiomegaly chest radiograph'],
  ['chest-sarcoidosis','胸部','X-rays of sarcoidosis','pulmonary sarcoidosis radiograph'],

  ['neuro-subdural','神经','CT images of subdural hematoma','subdural hematoma CT'],
  ['neuro-epidural','神经','CT images of epidural hematoma','epidural hematoma CT'],
  ['neuro-intracerebral','神经','CT images of intracerebral hemorrhage','intracerebral hemorrhage CT'],
  ['neuro-subarachnoid','神经','CT images of subarachnoid hemorrhage','subarachnoid hemorrhage CT'],
  ['neuro-infarction','神经','CT images of cerebral infarction','cerebral infarction CT'],
  ['neuro-meningioma','神经','MRI of brain meningioma','brain meningioma MRI'],
  ['neuro-glioblastoma','神经','MRI of glioblastoma','glioblastoma MRI'],
  ['neuro-ms','神经','MRI of multiple sclerosis in brain','multiple sclerosis brain MRI'],
  ['neuro-nph','神经','CT images of normal pressure hydrocephalus','normal pressure hydrocephalus CT'],
  ['neuro-metastases','神经','MRI of brain metastases','brain metastases MRI'],

  ['abdomen-appendicitis','腹部','CT images of appendicitis','appendicitis CT'],
  ['abdomen-cholelithiasis','腹部','Ultrasound images of cholelithiasis','cholelithiasis ultrasound'],
  ['abdomen-hydronephrosis','腹部','Ultrasound images of hydronephrosis','hydronephrosis ultrasound'],
  ['abdomen-diverticulitis','腹部','CT images of diverticulitis','diverticulitis CT'],
  ['abdomen-hcc','腹部','CT images of hepatocellular carcinoma','hepatocellular carcinoma CT'],
  ['abdomen-aaa','腹部','CT images of abdominal aortic aneurysms','abdominal aortic aneurysm CT'],
  ['abdomen-renal-cyst','腹部','Ultrasound images of renal cyst','renal cyst ultrasound'],
  ['abdomen-gallbladder-polyp','腹部','Ultrasound images of gallbladder polyps','gallbladder polyp ultrasound'],
  ['abdomen-pancreatitis','腹部','CT images of pancreatitis','pancreatitis CT MRI ultrasound'],
  ['abdomen-liver-cyst','腹部','Ultrasound images of liver cysts','liver cyst ultrasound CT MRI'],

  ['bone-hip-fracture','骨骼','X-rays of hip fractures','hip fracture radiograph'],
  ['bone-ankle-fracture','骨骼','X-rays of fractures of the human ankles','ankle fracture radiograph'],
  ['bone-clavicle-fracture','骨骼','X-rays of fractures of the human clavicle','clavicle fracture radiograph'],
  ['bone-distal-radius','骨骼','X-rays of fractures of lower end of the human radius','distal radius fracture radiograph'],
  ['bone-shoulder-dislocation','骨骼','X-rays of the glenohumeral joint dislocation','shoulder dislocation radiograph'],
  ['bone-osteosarcoma','骨骼','X-rays of osteosarcoma','osteosarcoma radiograph'],
  ['bone-rheumatoid','骨骼','X-rays of rheumatoid arthritis','rheumatoid arthritis radiograph'],
  ['bone-scoliosis','骨骼','X-rays of scoliosis','scoliosis radiograph'],
  ['bone-compression-fracture','骨骼','X-rays of compression fractures','vertebral compression fracture radiograph'],
  ['bone-humerus-fracture','骨骼','X-rays of fractures of the human humerus','humerus fracture radiograph'],
  ['bone-tibia-fracture','骨骼','X-rays of fractures of the human tibia','tibia fracture radiograph'],
  ['bone-femur-fracture','骨骼','X-rays of fractures of the human femur','femoral shaft fracture radiograph'],
  ['bone-knee-osteoarthritis','骨骼','X-rays of osteoarthritis of the knee','knee osteoarthritis radiograph']
].map(([key,system,category,search]) => ({key,system,category,search}));

const ALLOWED_LICENSES = /^(CC0|Public domain|PD|CC BY(?:-SA)?(?: \d\.\d)?|GFDL)/i;
const REJECT_TITLE = /\.(svg|gif|tif|tiff|pdf|webm|ogg)$/i;

function plain(value='') {
  return value
    .replace(/<br\s*\/?\s*>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#0*39;|&apos;/gi, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

async function request(params, attempt=0) {
  const body = new URLSearchParams({action:'query',format:'json',formatversion:'2',maxlag:'5',...params});
  const response = await fetch(API, {method:'POST',headers:{'User-Agent':USER_AGENT,'Content-Type':'application/x-www-form-urlencoded'},body});
  if ((response.status === 429 || response.status >= 500) && attempt < 7) {
    const seconds = Number(response.headers.get('retry-after')) || Math.min(60, 4 * (attempt + 1));
    await delay(seconds * 1000);
    return request(params, attempt + 1);
  }
  if (!response.ok) throw new Error(`${response.status} ${await response.text()}`);
  const json = await response.json();
  if (json.error?.code === 'maxlag' && attempt < 7) {
    await delay(Math.min(60, 4 * (attempt + 1)) * 1000);
    return request(params, attempt + 1);
  }
  if (json.error) throw new Error(JSON.stringify(json.error));
  await delay(1500);
  return json;
}

function normalize(page) {
  const info = page.imageinfo?.[0];
  if (!info) return null;
  const meta = info.extmetadata || {};
  const license = plain(meta.LicenseShortName?.value || meta.License?.value);
  const mime = info.mime || '';
  if (!/^image\/(jpeg|png)$/i.test(mime) || REJECT_TITLE.test(page.title) || !ALLOWED_LICENSES.test(license)) return null;
  if ((info.width || 0) < 400 || (info.height || 0) < 300) return null;
  return {
    pageId: page.pageid,
    title: page.title,
    sourceUrl: info.descriptionurl,
    originalUrl: info.url,
    downloadUrl: info.thumburl || info.url,
    originalSha1: info.sha1,
    width: info.width,
    height: info.height,
    mime,
    license,
    licenseUrl: meta.LicenseUrl?.value || '',
    artist: plain(meta.Artist?.value || 'Wikimedia Commons contributor'),
    credit: plain(meta.Credit?.value || ''),
    description: plain(meta.ImageDescription?.value || meta.ObjectName?.value || page.title)
  };
}

async function fromCategory(category) {
  const json = await request({
    generator:'categorymembers', gcmtitle:`Category:${category}`, gcmnamespace:'6', gcmlimit:'100',
    prop:'imageinfo', iiprop:'url|sha1|mime|size|extmetadata', iiurlwidth:'1200'
  });
  return (json.query?.pages || []).map(normalize).filter(Boolean).map(item => ({...item,retrieval:'category'}));
}

async function fromSearch(search) {
  const json = await request({
    generator:'search', gsrsearch:`${search} filetype:bitmap`, gsrnamespace:'6', gsrlimit:'40',
    prop:'imageinfo', iiprop:'url|sha1|mime|size|extmetadata', iiurlwidth:'1200'
  });
  return (json.query?.pages || []).map(normalize).filter(Boolean).map(item => ({...item,retrieval:'search'}));
}

const result = [];
for (const [index, group] of GROUPS.entries()) {
  let candidates = [];
  try { candidates = await fromCategory(group.category); }
  catch (error) { console.error(`category failed ${group.key}: ${error.message}`); }
  // Search is always merged with the exact category. Categories often contain
  // several projections or consecutive slices from one patient; the wider pool
  // is needed for case-series-level deduplication later.
  try { candidates.push(...await fromSearch(group.search)); }
  catch (error) { console.error(`search failed ${group.key}: ${error.message}`); }
  const seen = new Set();
  candidates = candidates.filter(item => {
    const signature = `${item.sourceUrl}|${item.originalSha1}`;
    if (seen.has(signature)) return false;
    seen.add(signature);
    return true;
  });
  result.push({...group,candidates});
  console.log(`${String(index + 1).padStart(2,'0')}/${GROUPS.length} ${group.key}: ${candidates.length}`);
}

await fs.mkdir(path.join(ROOT,'data'), {recursive:true});
await fs.writeFile(path.join(ROOT,'data','commons-candidates.json'), JSON.stringify({generatedAt:new Date().toISOString(),groups:result},null,2) + '\n');
console.log(`Wrote ${result.reduce((sum,g) => sum + g.candidates.length,0)} candidates.`);
