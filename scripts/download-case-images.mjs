import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';

const ROOT = path.resolve(import.meta.dirname, '..');
const source = JSON.parse(await fs.readFile(path.join(ROOT,'data','selected-case-sources.json'),'utf8'));
const OUT = path.join(ROOT,'assets','images','expanded');
const USER_AGENT = 'MedicalImagingLearningAudit/1.0 (https://github.com/a1553189184-stack/medical-imaging-learning)';
const delay = ms => new Promise(resolve => setTimeout(resolve,ms));
let previousById = new Map();
try {
  const previous = JSON.parse(await fs.readFile(path.join(ROOT,'data','expanded-case-sources.json'),'utf8'));
  previousById = new Map(previous.records.map(record => [record.id,record]));
} catch {}

async function download(url,attempt=0) {
  const response = await fetch(url,{headers:{'User-Agent':USER_AGENT}});
  if ((response.status === 429 || response.status >= 500) && attempt < 6) {
    await delay((attempt + 1) * 3000);
    return download(url,attempt + 1);
  }
  if (!response.ok) throw new Error(`${response.status} ${url}`);
  return {bytes:Buffer.from(await response.arrayBuffer()),contentType:(response.headers.get('content-type') || '').split(';')[0]};
}

await fs.mkdir(OUT,{recursive:true});
const jobs = [];
for (const group of source.groups) {
  group.chosen.forEach((item,index) => jobs.push({group,index,item}));
}

let cursor = 0, done = 0;
const records = new Array(jobs.length);
async function worker() {
  while (cursor < jobs.length) {
    const jobIndex = cursor++;
    const {group,index,item} = jobs[jobIndex];
    const id = `${group.key}-${String(index + 1).padStart(2,'0')}`;
    const previous = previousById.get(id);
    let bytes, contentType;
    if (previous?.sourceUrl === item.sourceUrl) {
      try {
        bytes = await fs.readFile(path.join(ROOT,...previous.image.split('/')));
        contentType = previous.mime;
      } catch {}
    }
    if (!bytes) ({bytes,contentType} = await download(item.downloadUrl));
    const png = bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]));
    const jpeg = bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
    if (!png && !jpeg) throw new Error(`Unsupported image bytes: ${item.title} (${contentType})`);
    if (bytes.length < 10000) throw new Error(`Image too small: ${item.title}`);
    const ext = png ? 'png' : 'jpg';
    const relativeImage = `assets/images/expanded/${id}.${ext}`;
    await fs.writeFile(path.join(ROOT,...relativeImage.split('/')),bytes);
    records[jobIndex] = {
      id,groupKey:group.key,system:group.system,image:relativeImage,
      sourceTitle:item.title.replace(/^File:/,''),sourceUrl:item.sourceUrl,
      sourceDescription:item.description,artist:item.artist,credit:item.credit,
      license:item.license,licenseUrl:item.licenseUrl,
      originalUrl:item.originalUrl,originalSha1:item.originalSha1,
      localSha256:crypto.createHash('sha256').update(bytes).digest('hex'),
      localBytes:bytes.length,width:item.width,height:item.height,mime:item.mime,
      retrieval:item.retrieval,qualityScore:item.qualityScore
    };
    done++;
    if (done % 10 === 0 || done === jobs.length) console.log(`${done}/${jobs.length}`);
  }
}

await Promise.all(Array.from({length:4},worker));
const expected = new Set(records.map(record => path.basename(record.image)));
for (const filename of await fs.readdir(OUT)) {
  if (!expected.has(filename) && /^(chest|neuro|abdomen|bone)-[a-z0-9-]+-\d{2}\.(?:png|jpe?g)$/i.test(filename)) {
    await fs.unlink(path.join(OUT,filename));
  }
}
await fs.writeFile(path.join(ROOT,'data','expanded-case-sources.json'),JSON.stringify({generatedAt:new Date().toISOString(),count:records.length,records},null,2) + '\n');
console.log(`Downloaded ${records.length} images (${Math.round(records.reduce((sum,item)=>sum+item.localBytes,0)/1024/1024)} MiB).`);
