import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';

const ROOT = path.resolve(import.meta.dirname,'..');
const API = 'https://commons.wikimedia.org/w/api.php';
const USER_AGENT = 'MedicalImagingLearningAudit/1.1 (https://github.com/a1553189184-stack/medical-imaging-learning)';
const additions = [
  ['chest-bronchiectasis-01','chest-bronchiectasis','File:Bronchiektasen links basal 51M - CT coronar - 001.jpg'],
  ['chest-emphysema-01','chest-emphysema','File:Emphysema CT.JPG'],
  ['chest-pulmonary-fibrosis-01','chest-pulmonary-fibrosis','File:IPF amiodarone.JPG'],
  ['chest-pericardial-effusion-01','chest-pericardial-effusion','File:PericardialeffusionCXR.PNG'],
  ['chest-thymoma-01','chest-thymoma','File:Anterior mediastinal mass thymoma.jpg'],
  ['chest-aortic-dissection-01','chest-aortic-dissection','File:Descending (Type B Stanford) Aortic Dissection.PNG'],
  ['chest-hiatal-hernia-01','chest-hiatal-hernia','File:X-ray of hiatal hernia.jpg'],
  ['chest-pneumomediastinum-01','chest-pneumomediastinum','File:CXR Pneumomediastinum.jpg'],
  ['chest-svc-syndrome-01','chest-svc-syndrome','File:SVCCT.PNG'],
  ['chest-lung-abscess-01','chest-lung-abscess','File:Pulmonaler Abszess - CT ax WT LF.jpg']
];

function plain(value='') {
  return value.replace(/<br\s*\/?\s*>/gi,' ').replace(/<[^>]+>/g,' ').replace(/&nbsp;/gi,' ')
    .replace(/&amp;/gi,'&').replace(/&quot;/gi,'"').replace(/&#0*39;|&apos;/gi,"'")
    .replace(/\s+/g,' ').trim();
}

async function fetchMetadata(title) {
  const params = new URLSearchParams({
    action:'query',format:'json',formatversion:'2',titles:title,prop:'imageinfo',
    iiprop:'url|sha1|mime|size|extmetadata',iiurlwidth:'1400'
  });
  const response = await fetch(`${API}?${params}`,{headers:{'User-Agent':USER_AGENT}});
  if(!response.ok) throw new Error(`${title}: metadata HTTP ${response.status}`);
  const page = (await response.json()).query?.pages?.[0];
  const info = page?.imageinfo?.[0], meta = info?.extmetadata || {};
  if(!info || page.missing) throw new Error(`${title}: Commons file not found`);
  const license = plain(meta.LicenseShortName?.value || meta.License?.value);
  if(!/^image\/(jpeg|png)$/i.test(info.mime)) throw new Error(`${title}: unsupported ${info.mime}`);
  if(!/^(CC0|Public domain|PD|CC BY(?:-SA)?(?: \d\.\d)?|GFDL)/i.test(license)) throw new Error(`${title}: unsupported license ${license}`);
  if(info.width < 400 || info.height < 300) throw new Error(`${title}: source resolution too small`);
  return {
    sourceTitle:page.title.replace(/^File:/i,''), sourceUrl:info.descriptionurl,
    sourceDescription:plain(meta.ImageDescription?.value || meta.ObjectName?.value || page.title),
    artist:plain(meta.Artist?.value || 'Wikimedia Commons contributor'), credit:plain(meta.Credit?.value || ''),
    license, licenseUrl:meta.LicenseUrl?.value || (license==='Public domain' ? 'https://commons.wikimedia.org/wiki/Commons:Public_domain' : ''),
    originalUrl:info.url, downloadUrl:info.thumburl || info.url, originalSha1:info.sha1,
    width:info.width,height:info.height,mime:info.mime
  };
}

const manifestPath = path.join(ROOT,'data','expanded-case-sources.json');
const manifest = JSON.parse(await fs.readFile(manifestPath,'utf8'));
const existingIds = new Set(manifest.records.map(record=>record.id));
const existingUrls = new Set(manifest.records.map(record=>record.sourceUrl));
const existingSha1 = new Set(manifest.records.map(record=>record.originalSha1));
if(additions.some(([id])=>existingIds.has(id))) throw new Error('Chest additions are already present; refusing to append twice.');

const records = [];
for(const [id,groupKey,title] of additions) {
  const metadata = await fetchMetadata(title);
  if(existingUrls.has(metadata.sourceUrl) || existingSha1.has(metadata.originalSha1)) throw new Error(`${id}: duplicate source`);
  const extension = metadata.mime === 'image/png' ? '.png' : '.jpg';
  const image = `assets/images/expanded/${id}${extension}`;
  const response = await fetch(metadata.downloadUrl,{headers:{'User-Agent':USER_AGENT}});
  if(!response.ok) throw new Error(`${id}: image HTTP ${response.status}`);
  const payload = Buffer.from(await response.arrayBuffer());
  if(payload.length < 10000) throw new Error(`${id}: image is unexpectedly small`);
  await fs.writeFile(path.join(ROOT,image),payload);
  const record = {
    id,groupKey,system:'胸部',image,
    sourceTitle:metadata.sourceTitle,sourceUrl:metadata.sourceUrl,sourceDescription:metadata.sourceDescription,
    artist:metadata.artist,credit:metadata.credit,license:metadata.license,licenseUrl:metadata.licenseUrl,
    originalUrl:metadata.originalUrl,originalSha1:metadata.originalSha1,
    localSha256:createHash('sha256').update(payload).digest('hex'),localBytes:payload.length,
    width:metadata.width,height:metadata.height,mime:metadata.mime,retrieval:'curated-file',qualityScore:40
  };
  records.push(record);
  existingUrls.add(record.sourceUrl); existingSha1.add(record.originalSha1);
  console.log(`${id}: ${record.sourceTitle} | ${record.license} | ${record.width}x${record.height}`);
}

manifest.records.push(...records);
manifest.count = manifest.records.length;
manifest.generatedAt = new Date().toISOString();
await fs.writeFile(manifestPath,JSON.stringify(manifest,null,2)+'\n');
console.log(`Appended ${records.length}; manifest now contains ${manifest.count} records.`);
