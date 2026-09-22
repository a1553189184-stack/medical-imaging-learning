import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const root=path.resolve(import.meta.dirname,'..');
const apply=process.argv.includes('--apply');
const sourceScripts=['cases.js','curriculum.js','expanded-sources.js','additional-groups.js','next-76-groups.js','next-200-groups.js','next-200-review.js','next-304-groups.js','next-502-groups.js','expanded-cases.js'];
const context=vm.createContext({structuredClone:global.structuredClone});
for(const file of sourceScripts) vm.runInContext(fs.readFileSync(path.join(root,file),'utf8'),context,{filename:file});
const cases=vm.runInContext('CASES',context);

const mappings=new Map([
  ['ns-immunocompromised-2-隐球菌感染',{prefixes:['中枢神经系统隐球菌病'],limit:1,rationale:'病例明确为中枢神经系统隐球菌病，与隐球菌性脑膜脑炎条目一致'}],
  ['ns-neurodegenerative-1-cjd',{prefixes:['克雅氏病'],limit:1,rationale:'病例为典型CJD弥散成像表现；不用于变异型CJD条目'}],
  ['ns-hemorrhagic-cerebrovascular-caa-related-hemorrhage',{prefixes:['脑淀粉样血管病'],limit:2,rationale:'SWI/GRE病例显示CAA相关出血性标志；不以单图推断临床分型'}],
  ['ns-cerebral-arterial-moyamoya-disease-and-syndrome',{prefixes:['烟雾病'],limit:2,rationale:'MRA和DSA病例明确为烟雾病；作为该疾病/综合征谱系的血管影像示例'}],
  ['ns-toxic-metabolic-5-渗透性脱髓鞘综合征',{prefixes:['中央脑桥髓鞘溶解','脑桥外髓鞘溶解'],limit:3,rationale:'中央脑桥及脑桥外髓鞘溶解均属于渗透性脱髓鞘综合征谱系'}],
  ['zymsk-0085',{prefixes:['Paget骨病'],limit:1,rationale:'Paget骨病与畸形性骨炎为同一疾病，诊断及骨盆部位明确'}],
  ['zymsk-0086',{prefixes:['石骨症骨盆X线','石骨症骨中骨征'],limit:3,rationale:'石骨症与大理石骨病同义，病例展示骨盆硬化及骨中骨征'}],
  ['a14',{prefixes:['焦磷酸钙沉积病软骨钙化'],limit:1,rationale:'软骨钙化是CPPD的典型影像表现，诊断与条目一致'}],
]);

const manifestPath=path.join(root,'library-data','authorized-library-manifest.json');
const manifest=JSON.parse(fs.readFileSync(manifestPath,'utf8'));
const report=[];
for(const system of manifest.systems){
  const libraryPath=path.join(root,system.file);
  const library=JSON.parse(fs.readFileSync(libraryPath,'utf8'));
  let changed=false;
  for(const record of library.records){
    const mapping=mappings.get(record.id);
    if(!mapping||(record.images||[]).length) continue;
    const selected=cases.filter(item=>mapping.prefixes.some(prefix=>item.title?.startsWith(prefix))&&item.image&&item.source&&item.sourceUrl&&item.license&&item.modality&&fs.existsSync(path.join(root,item.image))).slice(0,mapping.limit);
    if(!selected.length) throw new Error(`${record.id}: reviewed mapping has no source case`);
    report.push({system:system.key,recordId:record.id,recordName:record.name,rationale:mapping.rationale,images:selected.map(item=>item.image)});
    if(!apply) continue;
    record.images=selected.map(item=>({type:item.modality,src:item.image,caption:`${record.name} · ${item.title.replace(/\s*·\s*开放病例\s*\d+$/u,'')}`,source:item.source,sourceUrl:item.sourceUrl,license:item.license,relation:`疾病条目“${record.name}”与病例亚型/谱系经人工复核：${mapping.rationale}`,verificationStatus:'reviewed-spectrum-or-subtype-match-batch3'}));
    record.imageCount=record.images.length;
    changed=true;
  }
  if(apply&&changed){
    library.imageCount=new Set(library.records.flatMap(record=>(record.images||[]).map(image=>image.src))).size;
    library.coveredRecordCount=library.records.filter(record=>(record.images||[]).length).length;
    fs.writeFileSync(libraryPath,`${JSON.stringify(library)}\n`);
    system.imageCount=library.imageCount;
    system.coveredRecordCount=library.coveredRecordCount;
  }
}
if(apply){
  if(report.length!==mappings.size) throw new Error(`expected ${mappings.size}, linked ${report.length}`);
  manifest.totals.images=manifest.systems.reduce((sum,system)=>sum+system.imageCount,0);
  manifest.totals.coveredRecords=manifest.systems.reduce((sum,system)=>sum+(system.coveredRecordCount||0),0);
  manifest.latestReviewedCaseImageLinkBatch3={linkedAt:new Date().toISOString(),recordCount:report.length,imageReferenceCount:report.reduce((sum,item)=>sum+item.images.length,0),rule:'同义诊断或明确谱系匹配，且病例影像部位、模态、来源和许可完整',records:report};
  fs.writeFileSync(manifestPath,`${JSON.stringify(manifest)}\n`);
}
console.log(JSON.stringify({apply,recordCount:report.length,imageReferenceCount:report.reduce((sum,item)=>sum+item.images.length,0),report},null,2));
