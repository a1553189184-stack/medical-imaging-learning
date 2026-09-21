import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const root = process.cwd();
const catalogScripts = ['cases.js','curriculum.js','expanded-sources.js','additional-groups.js','next-76-groups.js','next-200-groups.js','next-200-review.js','next-304-groups.js','next-502-groups.js','expanded-cases.js'];
const source = catalogScripts.map(file => fs.readFileSync(path.join(root,file),'utf8')).join('\n');
const { cases, sources } = JSON.parse(vm.runInNewContext(source + '\nJSON.stringify({cases:CASES,sources:EXPANDED_CASE_SOURCES})'));
const manifestPath = path.join(root,'library-data','authorized-library-manifest.json');
const manifest = JSON.parse(fs.readFileSync(manifestPath,'utf8'));
const systemMap = { chest:'胸部', ns:'神经', abdomen:'腹部', msk:'骨骼' };
const sourceById = new Map(sources.map(item => [item.id,item]));
const idFromImage = image => path.basename(image,path.extname(image));
const diagnosis = title => title.replace(/\s*·\s*开放病例\s*\d+$/,'').trim();
const normalize = value => String(value || '').replace(/[\s·•]/g,'').replace(/[（(][^）)]*开放病例[^）)]*[）)]/g,'').toLocaleLowerCase('zh-CN');
const isSpecificKey = key => key.length >= 3 && !/^(感染|炎症|肿瘤|外伤|骨折|转移|转移瘤|出血|梗阻|畸形|囊肿|结节)$/.test(key);
const isSafeContainedMatch = (recordKey,caseKey) => caseKey.includes(recordKey) && !(recordKey === '皮样囊肿' && caseKey.includes('表皮样囊肿'));
let linkedRecords = 0;
let linkedImages = 0;

for (const system of manifest.systems) {
  const file = path.join(root,system.file);
  const data = JSON.parse(fs.readFileSync(file,'utf8'));
  const atlasSystem = systemMap[system.key];
  if (!atlasSystem) continue;
  const recordsByName = new Map();
  for (const record of data.records) {
    const keys = new Set([record.name].concat(record.aliases || []).map(normalize).filter(Boolean));
    for (const key of keys) {
      if (!recordsByName.has(key)) recordsByName.set(key,[]);
      if (!recordsByName.get(key).includes(record)) recordsByName.get(key).push(record);
    }
  }
  const casesByDiagnosis = new Map();
  for (const item of cases.filter(item => item.system === atlasSystem)) {
    const key = normalize(diagnosis(item.title));
    if (!casesByDiagnosis.has(key)) casesByDiagnosis.set(key,[]);
    casesByDiagnosis.get(key).push(item);
  }

  const linkedIds = new Set();
  for (const [key,records] of recordsByName) {
    const exactMatches = casesByDiagnosis.get(key) || [];
    const containedMatches = exactMatches.length || !isSpecificKey(key) ? [] : Array.from(casesByDiagnosis.entries())
      .filter(([caseKey]) => isSafeContainedMatch(key,caseKey))
      .flatMap(([,items]) => items);
    const matches = exactMatches.length ? exactMatches : containedMatches;
    if (records.length !== 1 || !matches.length || records[0].images?.length || linkedIds.has(records[0].id)) continue;
    const record = records[0];
    const selected = matches.slice(0,3);
    record.images = selected.map(item => {
      const id = idFromImage(item.image);
      const audited = sourceById.get(id);
      if (!fs.existsSync(path.join(root,item.image))) throw new Error(`${record.name}: 本地病例图不存在 ${item.image}`);
      return {
        type: item.modality || '医学影像',
        caption: diagnosis(item.title),
        src: item.image,
        source: item.source || audited?.sourceTitle || '',
        sourceUrl: item.sourceUrl || audited?.sourceUrl || '',
        license: item.license || audited?.license || '',
        licenseUrl: audited?.licenseUrl || '',
        relation: exactMatches.length ? '同系统、同诊断名称的已审计病例图谱' : '同系统、诊断名称包含该疾病名称的已审计病例图谱'
      };
    });
    record.imageCount = record.images.length;
    linkedIds.add(record.id);
    linkedRecords += 1;
    linkedImages += record.images.length;
  }
  data.imageCount = new Set(data.records.flatMap(record => (record.images || []).map(image => image.src)).filter(Boolean)).size;
  data.coveredRecordCount = data.records.filter(record => record.images?.length).length;
  system.imageCount = data.imageCount;
  system.coveredRecordCount = data.coveredRecordCount;
  system.recordCount = data.records.length;
  system.categoryCount = data.categories.length;
  fs.writeFileSync(file,JSON.stringify(data));
}

manifest.totals = {
  systems: manifest.systems.length,
  categories: manifest.systems.reduce((sum,item) => sum + item.categoryCount,0),
  records: manifest.systems.reduce((sum,item) => sum + item.recordCount,0),
  images: manifest.systems.reduce((sum,item) => sum + item.imageCount,0),
  coveredRecords: manifest.systems.reduce((sum,item) => sum + (item.coveredRecordCount || 0),0)
};
fs.writeFileSync(manifestPath,JSON.stringify(manifest));

console.log(`从已审计病例图谱回填 ${linkedRecords} 个分类条目，共 ${linkedImages} 张病例影像。`);
