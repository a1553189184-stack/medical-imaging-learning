import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const root = path.resolve(import.meta.dirname, '..');
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'data/expanded-case-sources.json'), 'utf8'));
const groupFile = fs.readFileSync(path.join(root, 'next-502-groups.js'), 'utf8');
const curatedGroups = JSON.parse(groupFile.slice(groupFile.indexOf('{'), groupFile.lastIndexOf(';')));
const catalogScripts = ['cases.js','curriculum.js','expanded-sources.js','additional-groups.js','next-76-groups.js','next-200-groups.js','next-200-review.js','next-304-groups.js','next-502-groups.js','expanded-cases.js'];
const catalogData = JSON.parse(vm.runInNewContext(catalogScripts.map(file=>fs.readFileSync(path.join(root,file),'utf8')).join('\n')+'\nJSON.stringify({cases:CASES,lessons:CURRICULUM})'));
const catalog = catalogData.cases;
const casesById = new Map(catalog.map(item=>[path.basename(item.image,path.extname(item.image)),item]));
const lessonsById = new Map(catalogData.lessons.map(item=>[item.id,item]));
const patterns = [
  ['MRA', /\b(mra|mr angiograph\w*)\b/i],
  ['DSA', /\b(dsa|digital subtraction angiograph\w*)\b/i],
  ['CTPA', /\bctpa\b/i],
  ['CTA', /\bcta\b/i],
  ['MRI', /\b(mri|mrt|magnetic resonance|mr[- ]?(?:t1|t2)|flair|dwi)\b/i],
  ['US', /\b(ultrasound|ultrasonograph\w*|sonograph\w*|sonogram|echograph\w*|fibroscan)\b/i],
  ['CT', /\b(ct|computed tomography|computer tomography|tac craneo)\b/i],
  ['X-RAY', /\b(x[ -]?ray\w*|cxr|radiograph\w*|roentgen\w*|r[oö]ntgen\w*|breischluck|roe)\b/i],
];
function inferredFromTitle(title) {
  const found = patterns.filter(([, pattern]) => pattern.test(title)).map(([modality]) => modality);
  if (/(?:^|[\s-])CR(?:[\s-]|\.)/.test(title) && !found.includes('X-RAY')) found.push('X-RAY');
  return found.length === 1 ? found[0] : null;
}

const flags = [];
const titleCounts = new Map();
const shaCounts = new Map();
const studyCounts = new Map();
function strictStudyKey(title) {
  return title.toLocaleLowerCase().replace(/\.(?:jpe?g|png)$/i,'').replace(/\s+rgbc[a-z](?: ce)?$/i,'').replace(/[ -]\d{1,4}$/,'').replace(/\s+/g,' ').trim();
}
for (const source of manifest.records) {
  const group = curatedGroups[source.id];
  const item = casesById.get(source.id);
  const modalityTags = (lessonsById.get(source.id)?.tags||[]).filter(tag=>['CT','CTA','CTPA','MRI','MRA','DSA','US','X-RAY','骨显像'].includes(tag));
  if (item && (modalityTags.length!==1 || modalityTags[0]!==item.modality)) {
    flags.push({type:'modality-tag-conflict',id:source.id,caseModality:item.modality,tags:modalityTags});
  }
  const titleModality = inferredFromTitle(source.sourceTitle);
  if (titleModality && item && titleModality !== item.modality) {
    flags.push({type:'modality-title-conflict',id:source.id,sourceTitle:source.sourceTitle,titleModality,caseModality:item.modality,groupModality:group?.modality});
  }
  if (!titleModality && item && /\b(?:dsa|digital subtraction angiograph\w*)\b/i.test(source.sourceDescription) && item.modality!=='DSA') flags.push({type:'dsa-description-conflict',id:source.id,caseModality:item.modality});
  if (group && /\b(after surgery|post[ -]?operat\w*|post[ -]?surg\w*|prosthe\w*|implant\w*|ORIF)\b/i.test(source.sourceDescription + ' ' + source.sourceTitle) && !/术后|治疗前后/.test(item?.title||'')) {
    flags.push({type:'treatment-image-review',id:source.id,sourceTitle:source.sourceTitle,sourceDescription:source.sourceDescription.slice(0,180)});
  }
  if (group && /（公开病例\s*\d+）/.test(item?.title||'')) {
    flags.push({type:'misleading-placeholder-title',id:source.id,title:group.title});
  }
  const key = source.sourceTitle.toLocaleLowerCase();
  titleCounts.set(key,(titleCounts.get(key)||[]).concat(source.id));
  const studyKey=strictStudyKey(source.sourceTitle);
  studyCounts.set(studyKey,(studyCounts.get(studyKey)||[]).concat(source.id));
  if (source.localSha256) shaCounts.set(source.localSha256,(shaCounts.get(source.localSha256)||[]).concat(source.id));
  if (!fs.existsSync(path.join(root,source.image))) flags.push({type:'missing-image',id:source.id,image:source.image});
  if (!source.sourceUrl.startsWith('https://commons.wikimedia.org/wiki/File:')) flags.push({type:'bad-source-url',id:source.id,sourceUrl:source.sourceUrl});
  if (!/^(CC0|CC BY|Public Domain)/i.test(source.license)) flags.push({type:'unsupported-license',id:source.id,license:source.license});
}
for (const [title,ids] of titleCounts) if (ids.length>1) flags.push({type:'duplicate-source-title',title,ids});
for (const [study,ids] of studyCounts) if (ids.length>1) flags.push({type:'same-study-slice-cluster',study,ids});
for (const [sha,ids] of shaCounts) if (ids.length>1) flags.push({type:'duplicate-image-sha256',sha,ids});
const displayTitles = new Map();
for (const item of catalog) {
  const key = item.title.toLocaleLowerCase();
  displayTitles.set(key,(displayTitles.get(key)||[]).concat(path.basename(item.image,path.extname(item.image))));
}
for (const [title,ids] of displayTitles) if (ids.length>1) flags.push({type:'duplicate-display-title',title,ids});
const byType = Object.fromEntries([...new Set(flags.map(f=>f.type))].map(type=>[type,flags.filter(f=>f.type===type).length]));
console.log(JSON.stringify({records:manifest.records.length,byType,flags:flags.filter(f=>f.type!=='misleading-placeholder-title').slice(0,150)},null,2));
