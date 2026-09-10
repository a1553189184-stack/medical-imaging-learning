import fs from 'node:fs/promises';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const input = JSON.parse(await fs.readFile(path.join(ROOT,'data','commons-candidates.json'),'utf8'));

const RULES = {
  'chest-pneumothorax': [5,/pneumothorax|pneumo(?!mediastinum)|pneumothorax/i],
  'chest-pleural-effusion': [6,/pleural effusion|effusion|erguss|ergu[sß]|hydrothorax/i],
  'chest-pneumonia': [9,/pneumonia|pneumonie|consolidation|pneumonitis/i],
  'chest-pulmonary-edema': [5,/pulmonary oedema|pulmonary edema|lungenoedem|edema|oedema/i],
  'chest-pulmonary-embolism': [5,/pulmonary embol|lungenembolie|saddle ?pe|embolus|embolie/i],
  'chest-tuberculosis': [3,/tuberculosis|tuberculose|tuberkulose|tbc|miliary tb/i],
  'chest-atelectasis': [5,/atelect|atelektase|atelektaza/i],
  'chest-covid': [5,/covid/i],
  'chest-cardiomegaly': [3,/cardiomeg|aumento del ict|mitral/i],
  'chest-sarcoidosis': [4,/sarcoid|sarkoid/i],

  'neuro-subdural': [6,/subdural|subdur/i],
  'neuro-epidural': [5,/epidural|extradural|edh/i],
  'neuro-intracerebral': [6,/intracerebral|intraparenchymal|hematoma cerebral|hemorrh|haemorrh/i],
  'neuro-subarachnoid': [8,/subarachnoid|sah|sab /i],
  'neuro-infarction': [5,/infarct|infarction|stroke|dense artery|dens media|insular ribbon/i],
  'neuro-meningioma': [6,/meningioma|meningeom/i],
  'neuro-glioblastoma': [6,/glioblastoma|gbm/i],
  'neuro-ms': [3,/multiple sclerosis|multiplen sklerose|ms lesion/i],
  'neuro-nph': [2,/normal pressure hydrocephalus|nph|hydrocephalus|hydrozephalus/i],
  'neuro-metastases': [3,/brain metast|cerebral metast|metastases|metastasis/i],

  'abdomen-appendicitis': [9,/appendic|perityphlit|stumpfappend/i],
  'abdomen-cholelithiasis': [7,/gall ?stone|gallbladder stone|cholelith|gallenstein|acoustic shadow/i],
  'abdomen-hydronephrosis': [5,/hydronephro|hydro\.jpg|dilated renal|dilated pelvi|pelvicalyceal/i],
  'abdomen-diverticulitis': [8,/diverticulitis|sigmadivertikulitis/i],
  'abdomen-hcc': [4,/hepatocellular|hcc/i],
  'abdomen-aaa': [7,/abdominal aortic aneurysm|aaa|aneurysm.?aorta|anevrysme de l.aorte/i],
  'abdomen-renal-cyst': [8,/renal cyst|kidney cyst|nierencyste/i],
  'abdomen-gallbladder-polyp': [2,/gall.?bladder polyp|gbpolyp|gallenblasen.*polyp/i],

  'bone-hip-fracture': [9,/hip fracture|femoral neck fracture|collum femoris|schenkelhals|shf |proximal femur fracture/i],
  'bone-ankle-fracture': [2,/ankle.*fracture|distal tibia fracture|salter-harris/i],
  'bone-clavicle-fracture': [6,/clavicle fracture|claviculafraktur|clavicular fracture|collar bone/i],
  'bone-distal-radius': [6,/distal radius|lower end.*radius|buckle fracture|greenstick fracture|colles|fatpad/i],
  'bone-shoulder-dislocation': [6,/shoulder.*disloc|glenohumeral.*disloc|luxation.*shoulder|schulterluxation|luxation epaule/i],
  'bone-scoliosis': [11,/scoliosis|skoliose/i],
  'bone-osteosarcoma': [2,/osteosarcoma|osteogenic sarcoma/i],
  'bone-tibia-fracture': [4,/tibia.*fracture|tibial fracture|tibiafraktur|fracture.*tibia|tuberositas tibiae|tillaux-fraktur|fractures involving the mid-tibial/i],
  'bone-compression-fracture': [2,/compression fracture|kompressionsfraktur/i],
  'bone-rheumatoid': [1,/rheumatoid arthritis|rheumatoide arthritis/i],
  'bone-femur-fracture': [1,/trochanter avulsion fracture|lesser trochanter avulsion fracture/i]
};

const EXISTING_SOURCE_FILES = new Set([
  '09-01-Pneumothorax.png','Pulmonary oedema.jpg','CTA Chest With Massive Pulmonary Embolism and Complete Occlusion.jpg',
  'CT scan of lung cancer with cavitation.png','CT Scan BGH.png','EpiduralHematoma.jpg',
  'Axial DIR MRI of a brain with multiple sclerosis lesions.jpg','Angioma epatico-RM.jpg',
  'CAT scan demonstrating acute appendicitis.jpg','Collesfracture.jpg','Effusionhalf.PNG',
  'X-ray of lobar pneumonia.jpg','Subduralandherniation.PNG',
  'Ultrasonography of hydronephrosis with dilated anechoic pelvis and calyces, along with cortical atrophy.jpg'
].map(value => `File:${value}`.toLocaleLowerCase()));

const HARD_REJECT = /canine|\bdog\b|\brabbit\b|veterinary|graphical scheme|diagram|hand-drawing|histopath|gross pathology|autopsy|rupture risk|normal .*radiograph|before and after chiropractic|same patient as in file:ultrasonography of hydronephrosis with dilated anechoic pelvis|appendicitis epiploica|segmentation|dopo rimozione|radiation treatment plan|harrington-spondylodese|post-operative scoliosis|contrast-enhanced ct scan \(coronal\)|appendicitis \(ct angiogram\)|gallenblasengummibaerchen|osteogenic sarcoma2|bäumchen et al|william scott-moncrieff|^clavicle fracture\.jpg/i;
const SOFT_REJECT = /annotation|\bmark\b|arrow|cropped|\bcrop\b|after drainage|after recompensation|chest tube|post.?operative|after operative|follow.?up|after fixation|external fixator|prosthe|internal fixation|healing|verschraubt/i;
const GENERIC = /^(medical (x-rays?|ultrasound image|radiology)|radiology|ultrasound scan\.? provided as-is|medical x-ray.*image may not be to scale)/i;

function normalizedText(item) {
  return `${item.title.replace(/^File:/i,'')} ${item.description}`.replace(/[_–—-]+/g,' ').replace(/\s+/g,' ').trim();
}

function score(item, include) {
  const title = item.title.replace(/^File:/i,'');
  const body = item.description || '';
  const all = `${title} ${body}`;
  if (HARD_REJECT.test(all) || EXISTING_SOURCE_FILES.has(item.title.toLocaleLowerCase())) return -Infinity;
  const titleMatch = include.test(title);
  include.lastIndex = 0;
  const bodyMatch = include.test(body);
  include.lastIndex = 0;
  if (!titleMatch && !bodyMatch) return -Infinity;
  let value = item.retrieval === 'category' ? 6 : 0;
  if (titleMatch) value += 10;
  if (bodyMatch) value += 8;
  if (body.length >= 35 && !GENERIC.test(body)) value += 3;
  if (/NPH CT (?:2[5-9]|3[0-5])\.png/i.test(item.title)) value += 6;
  if (SOFT_REJECT.test(all)) value -= 8;
  if (GENERIC.test(body)) value -= 8;
  if (Math.min(item.width,item.height) >= 600) value += 2;
  return value;
}

function derivativeKey(groupKey,item) {
  let title = item.title.toLocaleLowerCase()
    .replace(/^file:|\.[^.]+$/g,'')
    .replace(/(annotation|annotated|mark(?:ed)?|arrows?|cropped|crop)/g,'')
    .replace(/[ _]+/g,' ')
    .trim();
  // Collapse common naming conventions for projections, serial CT slices and
  // marked/unmarked derivatives from the same documented patient.
  const numberedCase = title.match(/^(\d{2})-\d{2}-/);
  if (numberedCase) return numberedCase[1];
  if (groupKey === 'neuro-infarction' && /^dens media sign/.test(title)) return 'dens media sign series';
  if (groupKey === 'neuro-infarction' && /^(ct and mr perfusion of cerebral infarction|ct of cerebral infarction|ct of insular ribbon sign)/.test(title)) return 'mirza gokhale stroke figure series';
  if (groupKey === 'neuro-intracerebral' && /^intracerebral hemorr(?:age|hage 2)/.test(title)) return 'postpartum intracerebral hemorrhage series';
  if (groupKey === 'neuro-subarachnoid' && /^sab bei aneurysma/.test(title)) return 'sab bei aneurysma series';
  if (groupKey === 'neuro-nph' && /^(nph ct|normal pressure hydrocephalus \d)/.test(title)) return 'nph ct stack';
  if (groupKey === 'neuro-nph' && /^normal pressure hydrocephalus versus atrophy/.test(title)) return 'nph versus atrophy comparison';
  if (groupKey === 'neuro-metastases' && /^(brain mri|(?:ct|mri) brain tumor)/.test(title)) return 'brain tumor teaching series';
  if (groupKey === 'neuro-meningioma' && /^tumor meningioma/.test(title)) return 'tumor meningioma series';
  if (groupKey === 'chest-pneumonia' && /^rll pneumonia/.test(title)) return 'rll pneumonia series';
  if (groupKey === 'chest-atelectasis' && /^thorax mit bds unterlappen-atelektase/.test(title)) return 'bilateral lower lobe atelectasis series';
  if (groupKey === 'abdomen-appendicitis' && /^perityphlitischer abszess/.test(title)) return 'perityphlitischer abszess series';
  if (groupKey === 'abdomen-diverticulitis') {
    const divertCase = title.match(/^(\d{2})-sigmadivertikulitis/);
    if (divertCase) return `sigmadiverticulitis ${divertCase[1]}`;
  }
  if (groupKey === 'abdomen-renal-cyst') {
    const renalSession = title.match(/renal cyst ultrasound (\d{12})/);
    if (renalSession) return `renal cyst ${renalSession[1]}`;
  }
  if (groupKey === 'abdomen-aaa' && /^aneurysmaorta/.test(title)) return 'aneurysmaorta derivative';
  if (groupKey === 'abdomen-hcc' && /^(triphasic ct scan|ct scan of hepatocellular carcinoma)/.test(title)) return 'pan hcc figure series';
  if (groupKey === 'abdomen-cholelithiasis') {
    const gallstoneDate = title.match(/^gallstone (\d{6})/);
    if (gallstoneDate) return `gallstone session ${gallstoneDate[1]}`;
  }
  if (groupKey === 'abdomen-gallbladder-polyp' && /^(gallbladder polyps|gbpolyp)/.test(title)) return title.startsWith('gbpolyp') ? 'gbpolyp' : 'gallbladder polyps';
  if (groupKey === 'bone-clavicle-fracture' && /^claviculafraktur (?:lateral|median)/.test(title)) return title.match(/^claviculafraktur (?:lateral|median)/)[0];
  if (groupKey === 'bone-shoulder-dislocation' && /^schulterluxation links/.test(title)) return 'schulterluxation links';
  if (groupKey === 'bone-distal-radius' && /^(dorsal tilt|radial inclination) of distal radius fracture/.test(title)) return 'distal radius measurement series';
  if (groupKey === 'bone-distal-radius' && /(fatpad-sign pathologisch|distale radiusfraktur laengs zu fatpadsign)/.test(title)) return 'pronator fatpad fracture series';
  if (groupKey === 'bone-tibia-fracture' && /^subtle tibia fracture/.test(title)) return 'subtle tibia fracture multimodality series';
  if (groupKey === 'bone-tibia-fracture' && /^(t1 mri of proximal metaphyseal|x-ray of occult metaphyseal)/.test(title)) return 'occult proximal tibia fracture series';
  if (groupKey === 'bone-scoliosis' && /^amanda-scoliosis/.test(title)) return 'amanda scoliosis series';
  title = title
    .replace(/\s+-\s+(?:ct|cr|mri?|mrt|roe|röntgen|x-?ray|us)\b.*$/i,'')
    .replace(/\s+(?:axial|sagittal|sag|coronal|cor|seitlich|lateral|ap|pa|y)\s*\d*$/i,'')
    .replace(/\s+\d{1,3}$/,'')
    .replace(/\b(nph ct|brain mri|msmri|tumor meningioma)\b.*$/i,'$1')
    .replace(/\b(gallbladder polyps|claviculafraktur lateral|schulterluxation links)\b.*$/i,'$1')
    .replace(/^skin folds (?:close to|over) a hip fracture$/i,'skin folds hip fracture')
    .replace(/[,.()\[\] –—-]+/g,' ')
    .replace(/\s+/g,' ')
    .trim();
  return title;
}

function descriptionKey(item) {
  const value = (item.description || '').toLocaleLowerCase()
    .replace(/^edit\s+/,'')
    .replace(/\b(annotation|annotated|mark(?:ed)?|arrows?|cropped|crop)\b/g,'')
    .replace(/original image/gi,'')
    .replace(/[^\p{L}\p{N}]+/gu,' ')
    .replace(/\s+/g,' ')
    .trim();
  return value.length >= 45 && !GENERIC.test(value) ? value : '';
}

const selected = [];
const usedSource = new Set(), usedSha1 = new Set(), usedDerivative = new Set(), usedDescription = new Set();
for (const group of input.groups) {
  const rule = RULES[group.key];
  if (!rule) continue;
  const [quota,include] = rule;
  const ranked = group.candidates
    .map(item => ({...item,qualityScore:score(item,include)}))
    .filter(item => Number.isFinite(item.qualityScore) && item.qualityScore >= 8)
    .sort((a,b) => b.qualityScore - a.qualityScore || a.title.localeCompare(b.title,'en'));
  const chosen = [];
  for (const item of ranked) {
    const key = derivativeKey(group.key,item);
    const descKey = descriptionKey(item), scopedDesc = descKey ? `${group.key}:${descKey}` : '';
    if (usedSource.has(item.sourceUrl) || usedSha1.has(item.originalSha1) || usedDerivative.has(`${group.key}:${key}`) || (scopedDesc && usedDescription.has(scopedDesc))) continue;
    chosen.push(item);
    usedSource.add(item.sourceUrl); usedSha1.add(item.originalSha1); usedDerivative.add(`${group.key}:${key}`);
    if (scopedDesc) usedDescription.add(scopedDesc);
    if (chosen.length === quota) break;
  }
  selected.push({...group,quota,chosen,shortfall:Math.max(0,quota-chosen.length)});
  console.log(`${group.key}: ${chosen.length}/${quota}`);
  chosen.forEach((item,index) => console.log(`  ${index+1}. [${item.qualityScore}] ${item.title} — ${item.description.slice(0,150)}`));
}

await fs.writeFile(path.join(ROOT,'data','selected-case-sources.json'), JSON.stringify({generatedAt:new Date().toISOString(),groups:selected},null,2) + '\n');
const total = selected.reduce((sum,group) => sum + group.chosen.length,0);
const shortfall = selected.reduce((sum,group) => sum + group.shortfall,0);
console.log(`Selected ${total}; shortfall ${shortfall}.`);
if (total !== 200 || shortfall) process.exitCode = 2;
