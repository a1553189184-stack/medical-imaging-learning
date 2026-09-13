import fs from 'node:fs/promises';
import path from 'node:path';
import vm from 'node:vm';

const ROOT=path.resolve(import.meta.dirname,'..');
const files=['cases.js','curriculum.js','expanded-sources.js','additional-groups.js','next-76-groups.js','expanded-cases.js'];
const source=(await Promise.all(files.map(file=>fs.readFile(path.join(ROOT,file),'utf8')))).join('\n');
const data=JSON.parse(vm.runInNewContext(`${source}\nJSON.stringify({cases:CASES,curriculum:CURRICULUM})`));
const manifest=JSON.parse(await fs.readFile(path.join(ROOT,'data','expanded-case-sources.json'),'utf8'));
const used=new Set(manifest.records.flatMap(r=>[r.sourceUrl,r.originalSha1]));
const lessonById=new Map(data.curriculum.map(x=>[x.id,x]));
const topics=[];
for(const system of ['胸部','神经','腹部','骨骼']){
  const seen=new Set();
  for(const c of data.cases.filter(x=>x.system===system)){
    const id=path.basename(c.image,path.extname(c.image)),lesson=lessonById.get(id),zh=c.title.split(' · 开放病例')[0],en=lesson?.english;
    if(en&&!seen.has(zh)){seen.add(zh);topics.push({system,zh,en,modality:c.modality})}
  }
}
const plain=v=>String(v||'').replace(/<[^>]*>/g,' ').replace(/&nbsp;|&#160;/g,' ').replace(/&amp;/g,'&').replace(/\s+/g,' ').trim();
const reject=/histolog|histopath|micrograph|gross pathology|autopsy|specimen|cytology|cells or tissue|diagram|scheme|drawing|veterinary|\bdog\b|\bcat\b|surgery photo|operative photograph/i;
const API='https://commons.wikimedia.org/w/api.php';
async function search(topic){const p=new URLSearchParams({action:'query',format:'json',formatversion:'2',generator:'search',gsrsearch:`${topic.en} radiology`,gsrnamespace:'6',gsrlimit:'30',prop:'imageinfo',iiprop:'url|sha1|mime|size|extmetadata',iiurlwidth:'1200',origin:'*'});const response=await fetch(`${API}?${p}`,{headers:{'User-Agent':'MedicalImagingLearningAudit/4.0 (https://github.com/a1553189184-stack/medical-imaging-learning)'}});if(!response.ok)throw new Error(`${response.status} ${topic.en}`);const json=await response.json(),found=[];for(const page of json.query?.pages||[]){const info=page.imageinfo?.[0],m=info?.extmetadata||{};if(!info)continue;const item={title:page.title,sourceUrl:info.descriptionurl,originalUrl:info.url,downloadUrl:info.thumburl||info.url,originalSha1:info.sha1,width:info.width,height:info.height,mime:info.mime,license:plain(m.LicenseShortName?.value||m.License?.value),licenseUrl:m.LicenseUrl?.value||'',artist:plain(m.Artist?.value||'Wikimedia Commons contributor'),credit:plain(m.Credit?.value||''),description:plain(m.ImageDescription?.value||m.ObjectName?.value||page.title)};if(/^image\/(jpeg|png)$/i.test(item.mime)&&/CC0|public domain|CC BY/i.test(item.license)&&Math.min(item.width,item.height)>=250&&!reject.test(`${item.title} ${item.description}`)&&!used.has(item.sourceUrl)&&!used.has(item.originalSha1)&&!found.some(x=>x.originalSha1===item.originalSha1))found.push(item)}return {...topic,candidates:found.slice(0,20)}}
const results=[];
for(let i=0;i<topics.length;i++){const row=await search(topics[i]);results.push(row);console.log(`${i+1}/${topics.length} ${row.system}:${row.zh} ${row.candidates.length}`);await new Promise(r=>setTimeout(r,100))}
await fs.writeFile(path.join(ROOT,'data','existing-alternate-candidates.json'),JSON.stringify({generatedAt:new Date().toISOString(),topics:results},null,2)+'\n');
