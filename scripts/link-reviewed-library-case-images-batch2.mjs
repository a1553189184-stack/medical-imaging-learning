import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const root = path.resolve(import.meta.dirname,'..');
const apply = process.argv.includes('--apply');
const sourceScripts = ['cases.js','curriculum.js','expanded-sources.js','additional-groups.js','next-76-groups.js','next-200-groups.js','next-200-review.js','next-304-groups.js','next-502-groups.js','expanded-cases.js'];
const context = vm.createContext({ structuredClone:global.structuredClone });
for(const file of sourceScripts) vm.runInContext(fs.readFileSync(path.join(root,file),'utf8'),context,{ filename:file });
const cases = vm.runInContext('CASES',context);

const mappings = new Map([
  ['abdomen-biliary-pancreas-spleen-choledocholithiasis-and-cholangitis',{ prefixes:['胆总管结石MRCP'], limit:1, rationale:'MRCP病例明确显示胆总管结石；仅作为条目中结石性梗阻亚型示例' }],
  ['abdomen-v2-0035',{ prefixes:['Budd-Chiari综合征'], limit:1, rationale:'病例诊断、肝静脉流出道部位与Budd-Chiari综合征一致' }],
  ['abdomen-v2-1016',{ prefixes:['Budd-Chiari综合征'], limit:1, rationale:'病例诊断与肝静脉/下腔静脉流出道梗阻条目一致' }],
  ['abdomen-v2-1027',{ prefixes:['Budd-Chiari综合征'], limit:1, rationale:'病例作为Budd-Chiari谱系示例，不据单图推断具体阻塞分型' }],
  ['abdomen-liver-hepatic-abscess',{ prefixes:['肺炎克雷伯菌性肝脓肿','肝脓肿'], limit:3, rationale:'病例明确为化脓性肝脓肿；保留肺炎克雷伯菌病因标注' }],
  ['abdomen-liver-cirrhosis-and-portal-hypertension',{ prefixes:['肝硬化'], limit:3, rationale:'病例显示肝硬化形态；不以单图替代病因和门静脉高压分期' }],
  ['abdomen-v2-1010',{ prefixes:['肝硬化'], limit:3, rationale:'病例显示肝硬化影像表现，与条目部位和诊断一致' }],
  ['chest-infection-invasive-aspergillosis',{ prefixes:['侵袭性肺曲霉病'], limit:1, rationale:'病例明确为侵袭性肺曲霉病，与条目诊断一致' }],
  ['chest-infection-chronic-aspergillosis-aspergilloma',{ prefixes:['曲霉球'], limit:1, rationale:'曲霉球是慢性肺曲霉病的明确影像亚型' }],
  ['chest-pleura-wall-hemothorax',{ prefixes:['大量右侧血胸','大量左侧血胸','外伤性血胸'], limit:3, rationale:'病例均明确为血胸，侧别与外伤背景保留在标题中' }],
  ['chest-pleura-wall-diaphragmatic-hernia',{ prefixes:['Morgagni疝','Bochdalek疝','先天性膈疝'], limit:3, rationale:'病例分别展示膈疝的明确亚型，不据单图概括全部膈疝' }],
  ['maxillofacial-craniofacial-fibrous-dysplasia',{ prefixes:['广泛颅面骨纤维异常增殖症','颅面骨纤维异常增殖症CT/MRI'], limit:2, rationale:'颅面部位和骨纤维结构不良诊断均一致' }],
  ['zymsk-0001',{ prefixes:['Ollier病'], limit:2, rationale:'Ollier病即多发性内生软骨瘤病，与条目同义' }],
  ['zymsk-0059',{ prefixes:['Brodie脓肿'], limit:1, rationale:'Brodie脓肿是亚急性骨髓炎的典型局灶型表现' }],
  ['ns-developmental-midline-holoprosencephaly',{ prefixes:['全前脑畸形'], limit:1, rationale:'病例属于全前脑畸形谱系；不据单图外推具体严重度分型' }],
]);

const manifestPath = path.join(root,'library-data','authorized-library-manifest.json');
const manifest = JSON.parse(fs.readFileSync(manifestPath,'utf8'));
const report = [];
for(const system of manifest.systems){
  const libraryPath = path.join(root,system.file);
  const library = JSON.parse(fs.readFileSync(libraryPath,'utf8'));
  let changed = false;
  for(const record of library.records){
    const mapping = mappings.get(record.id);
    if(!mapping || (record.images || []).length) continue;
    const selected = cases.filter(item => mapping.prefixes.some(prefix => item.title?.startsWith(prefix)) && item.image && item.source && item.sourceUrl && item.license && item.modality && fs.existsSync(path.join(root,item.image))).slice(0,mapping.limit);
    if(!selected.length) throw new Error(`${record.id}: reviewed mapping has no available source case`);
    report.push({ system:system.key, recordId:record.id, recordName:record.name, rationale:mapping.rationale, images:selected.map(item=>item.image) });
    if(!apply) continue;
    record.images = selected.map(item=>({
      type:item.modality, src:item.image,
      caption:`${record.name} · ${item.title.replace(/\s*·\s*开放病例\s*\d+$/u,'')}`,
      source:item.source, sourceUrl:item.sourceUrl, license:item.license,
      relation:`疾病条目“${record.name}”与病例亚型/谱系经人工复核：${mapping.rationale}`,
      verificationStatus:'reviewed-spectrum-or-subtype-match-batch2',
    }));
    record.imageCount = record.images.length;
    changed = true;
  }
  if(apply && changed){
    library.imageCount = new Set(library.records.flatMap(record=>(record.images||[]).map(image=>image.src))).size;
    library.coveredRecordCount = library.records.filter(record=>(record.images||[]).length).length;
    fs.writeFileSync(libraryPath,`${JSON.stringify(library)}\n`);
    system.imageCount = library.imageCount;
    system.coveredRecordCount = library.coveredRecordCount;
  }
}
if(apply){
  if(report.length !== mappings.size) throw new Error(`expected ${mappings.size} reviewed mappings, linked ${report.length}`);
  manifest.totals.images = manifest.systems.reduce((sum,system)=>sum+system.imageCount,0);
  manifest.totals.coveredRecords = manifest.systems.reduce((sum,system)=>sum+(system.coveredRecordCount||0),0);
  manifest.latestReviewedCaseImageLinkBatch2 = { linkedAt:new Date().toISOString(), recordCount:report.length, imageReferenceCount:report.reduce((sum,item)=>sum+item.images.length,0), rule:'同系统、同解剖部位且诊断明确；亚型图仅作为对应谱系示例并保留诊断边界', records:report };
  fs.writeFileSync(manifestPath,`${JSON.stringify(manifest)}\n`);
}
console.log(JSON.stringify({ apply,recordCount:report.length,imageReferenceCount:report.reduce((sum,item)=>sum+item.images.length,0),report },null,2));
