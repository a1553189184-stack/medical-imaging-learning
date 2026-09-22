import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const root = path.resolve(import.meta.dirname, '..');
const apply = process.argv.includes('--apply');
const sourceScripts = ['cases.js','curriculum.js','expanded-sources.js','additional-groups.js','next-76-groups.js','next-200-groups.js','next-200-review.js','next-304-groups.js','next-502-groups.js','expanded-cases.js'];
const context = vm.createContext({ structuredClone: global.structuredClone });
for (const file of sourceScripts) vm.runInContext(fs.readFileSync(path.join(root,file),'utf8'),context,{ filename:file });
const cases = vm.runInContext('CASES',context);

// Manually reviewed subtype/spectrum links. These are intentionally not inferred at runtime.
const mappings = new Map([
  ['chest-vascular-ards-diffuse-alveolar-damage',{ prefix:'斑疹伤寒相关ARDS', limit:1, rationale:'影像明确为ARDS；病因是斑疹伤寒，不用于推断ARDS病因' }],
  ['zymsk-0045',{ prefix:'Lisfranc骨折脱位', limit:3, rationale:'Lisfranc骨折脱位属于Lisfranc损伤谱系，部位与诊断一致' }],
  ['ns-congenital-0-chiari畸形',{ prefix:'Chiari I型畸形', limit:3, rationale:'Chiari I型是Chiari畸形谱系的明确亚型' }],
  ['ns-congenital-1-dandy-walker畸形',{ prefix:'Dandy-Walker变异', limit:1, rationale:'Dandy-Walker变异属于该畸形谱系，按亚型标注' }],
  ['ns-cerebral-small-vessel-hereditary-cerebral-small-vessel-diseases',{ prefix:'CADASIL', limit:1, rationale:'CADASIL是遗传性脑小血管病的明确代表类型' }],
  ['ns-neurodegenerative-wilson-disease',{ prefix:'Wilson病大熊猫脸征', limit:1, rationale:'病例显示Wilson病典型中脑MRI征象，诊断与部位一致' }],
]);

const manifestPath = path.join(root,'library-data','authorized-library-manifest.json');
const manifest = JSON.parse(fs.readFileSync(manifestPath,'utf8'));
const report = [];
for (const system of manifest.systems) {
  const libraryPath = path.join(root,system.file);
  const library = JSON.parse(fs.readFileSync(libraryPath,'utf8'));
  let changed = false;
  for (const record of library.records) {
    const mapping = mappings.get(record.id);
    if (!mapping || (record.images || []).length) continue;
    const selected = cases.filter(item => item.title?.startsWith(mapping.prefix) && item.image && item.source && item.sourceUrl && item.license && item.modality && fs.existsSync(path.join(root,item.image))).slice(0,mapping.limit);
    if (!selected.length) throw new Error(`${record.id}: reviewed mapping has no available source case`);
    report.push({ system:system.key, recordId:record.id, recordName:record.name, rationale:mapping.rationale, images:selected.map(item => item.image) });
    if (!apply) continue;
    record.images = selected.map(item => ({
      type:item.modality,
      src:item.image,
      caption:`${record.name} · ${item.title.replace(/\s*·\s*开放病例\s*\d+$/u,'')}`,
      source:item.source,
      sourceUrl:item.sourceUrl,
      license:item.license,
      relation:`疾病条目“${record.name}”与病例亚型/谱系经人工复核：${mapping.rationale}`,
      verificationStatus:'reviewed-spectrum-or-subtype-match',
    }));
    record.imageCount = record.images.length;
    changed = true;
  }
  if (apply && changed) {
    library.imageCount = new Set(library.records.flatMap(record => (record.images || []).map(image => image.src))).size;
    library.coveredRecordCount = library.records.filter(record => (record.images || []).length).length;
    fs.writeFileSync(libraryPath,`${JSON.stringify(library)}\n`);
    system.imageCount = library.imageCount;
    system.coveredRecordCount = library.coveredRecordCount;
  }
}

if (apply) {
  if (report.length !== mappings.size) throw new Error(`expected ${mappings.size} reviewed mappings, linked ${report.length}`);
  manifest.totals.images = manifest.systems.reduce((sum,system) => sum + system.imageCount,0);
  manifest.totals.coveredRecords = manifest.systems.reduce((sum,system) => sum + (system.coveredRecordCount || 0),0);
  manifest.latestReviewedCaseImageLink = {
    linkedAt:new Date().toISOString(),
    recordCount:report.length,
    imageReferenceCount:report.reduce((sum,item) => sum + item.images.length,0),
    rule:'同系统病例经人工确认属于疾病条目的明确亚型、谱系或典型表现，并保留具体病因/亚型边界',
    records:report,
  };
  fs.writeFileSync(manifestPath,`${JSON.stringify(manifest)}\n`);
}

console.log(JSON.stringify({ apply, recordCount:report.length, imageReferenceCount:report.reduce((sum,item) => sum + item.images.length,0), report },null,2));
