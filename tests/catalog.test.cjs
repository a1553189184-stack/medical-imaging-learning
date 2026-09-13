const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const {createHash} = require('node:crypto');

const root = path.resolve(__dirname,'..');
const catalogScripts = ['cases.js','curriculum.js','expanded-sources.js','additional-groups.js','next-76-groups.js','next-200-groups.js','next-200-review.js','expanded-cases.js'];
const source = catalogScripts.map(file => fs.readFileSync(path.join(root,file),'utf8')).join('\n');
const data = vm.runInNewContext(source + '\nJSON.stringify({cases:CASES,curriculum:CURRICULUM,sources:EXPANDED_CASE_SOURCES})');
const {cases,curriculum,sources} = JSON.parse(data);
const dicomStudies = JSON.parse(vm.runInNewContext(fs.readFileSync(path.join(root,'dicom-series.js'),'utf8') + '\nJSON.stringify(DICOM_STUDIES)'));
const medicalReviews = JSON.parse(vm.runInNewContext(fs.readFileSync(path.join(root,'medical-reviews.js'),'utf8') + '\nJSON.stringify(MEDICAL_REVIEWS)'));
const getId = c => path.basename(c.image,path.extname(c.image));
const expanded = cases.filter(c => c.image.startsWith('assets/images/expanded/'));
const latestChestIds = ['chest-bronchiectasis-01','chest-emphysema-01','chest-pulmonary-fibrosis-01','chest-pericardial-effusion-01','chest-thymoma-01','chest-aortic-dissection-01','chest-hiatal-hernia-01','chest-pneumomediastinum-01','chest-svc-syndrome-01','chest-lung-abscess-01'];

test('catalog has 700 cases with 50 new cases in every system', () => {
  assert.equal(cases.length,700);
  assert.equal(expanded.length,686);
  const totals = Object.fromEntries(['胸部','神经','腹部','骨骼'].map(system => [system,cases.filter(c => c.system===system).length]));
  assert.deepEqual(totals,{胸部:185,神经:173,腹部:172,骨骼:170});
  assert.deepEqual(Object.fromEntries(Object.keys(totals).map(system=>[system,expanded.filter(c=>c.system===system).length])),{胸部:179,神经:169,腹部:169,骨骼:169});
  const latest = sources.filter(record=>latestChestIds.includes(record.id));
  assert.equal(latest.length,10);
  assert.equal(new Set(latest.map(record=>record.groupKey)).size,10);
  assert.ok(latestChestIds.every(id=>cases.some(c=>getId(c)===id && c.system==='胸部')));
  const secondBatch=sources.slice(210,410);
  assert.equal(secondBatch.length,200);
  assert.deepEqual(Object.fromEntries(Object.keys(totals).map(system=>[system,secondBatch.filter(c=>c.system===system).length])),{胸部:50,神经:50,腹部:50,骨骼:50});
  const finalBatch=sources.slice(410,486);
  assert.equal(finalBatch.length,76);
  assert.deepEqual(Object.fromEntries(Object.keys(totals).map(system=>[system,finalBatch.filter(c=>c.system===system).length])),{胸部:19,神经:19,腹部:19,骨骼:19});
  assert.equal(new Set(finalBatch.map(record=>record.groupKey)).size,76);
  assert.equal(new Set(finalBatch.map(record=>record.sourceTitle)).size,76);
  assert.equal(new Set(cases.slice(-76).map(c=>c.title.split(' · 开放病例')[0])).size,76);
  assert.ok(finalBatch.every(record=>!/histolog|histopath|micrograph|gross pathology|autopsy|specimen|cells or tissue/i.test(`${record.sourceTitle} ${record.sourceDescription}`)));
  const expansion700=sources.slice(486);
  assert.equal(expansion700.length,200);
  assert.deepEqual(Object.fromEntries(Object.keys(totals).map(system=>[system,expansion700.filter(c=>c.system===system).length])),{胸部:50,神经:50,腹部:50,骨骼:50});
  assert.equal(new Set(expansion700.map(record=>record.groupKey)).size,200);
  assert.equal(new Set(expansion700.map(record=>record.sourceTitle)).size,200);
  assert.equal(new Set(cases.slice(-200).map(c=>c.title.split(' · 开放病例')[0])).size,200);
  assert.ok(cases.slice(-200).every(c=>c.findings.length>=3 && !c.findings.some(item=>item.startsWith('识别与'))));
  assert.ok(expansion700.every(record=>!/histolog|histopath|micrograph|gross pathology|autopsy|specimen|cells or tissue/i.test(`${record.sourceTitle} ${record.sourceDescription}`)));
});

test('bone cases are split into source-supported teaching subtypes', () => {
  const diagnosis = c => c.title.split(' · 开放病例')[0];
  const diversity = Object.fromEntries(['胸部','神经','腹部','骨骼'].map(system=>[system,new Set(cases.filter(c=>c.system===system).map(diagnosis)).size]));
  assert.deepEqual(diversity,{胸部:113,神经:111,腹部:115,骨骼:126});
  for(const title of ['股骨颈骨折（Garden III）','转子间股骨骨折','肩关节后脱位','儿童桡骨青枝骨折','Tillaux 骨折']) assert.ok(cases.some(c=>diagnosis(c)===title),title);
});

test('case metadata, diagnosis content and local images match one-to-one', () => {
  assert.equal(new Set(cases.map(getId)).size,cases.length);
  assert.equal(new Set(cases.map(c=>c.image)).size,cases.length);
  assert.equal(new Set(curriculum.map(c=>c.id)).size,curriculum.length);
  assert.equal(cases.length,curriculum.length);
  for(const c of cases) {
    const lesson = curriculum.find(item=>item.id===getId(c));
    assert.ok(lesson, c.title + ' has curriculum');
    for(const field of ['title','system','modality','history','explain','report','source','license']) assert.ok(c[field],`${getId(c)}.${field}`);
    assert.equal(c.options.length,4);
    assert.ok(Number.isInteger(c.answer) && c.answer>=0 && c.answer<c.options.length);
    assert.ok(c.findings.length>=3);
    for(const field of ['english','recall','limitation']) assert.ok(lesson[field],`${getId(c)}.${field}`);
    assert.ok(lesson.methods.length>=3 && lesson.methods.every(step=>step.length===2 && step.every(Boolean)));
    assert.ok(lesson.tips.length>=2 && lesson.pitfalls.length>=2 && lesson.refs.length>=1);
    assert.equal(new URL(c.sourceUrl).protocol,'https:');
    assert.ok(lesson.refs.every(ref=>new URL(ref[1]).protocol==='https:'));
    assert.ok(c.image.startsWith('assets/images/') && !c.image.includes('..'));
    const bytes = fs.readFileSync(path.join(root,c.image));
    assert.ok(bytes.length>10000);
    const isPng = bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]));
    const isJpeg = bytes[0]===255 && bytes[1]===216 && bytes[2]===255;
    assert.ok(isPng || isJpeg,c.image + ' is PNG or JPEG');
  }
});

test('expanded image sources are complete, distinct and cryptographically verified', () => {
  const manifest = JSON.parse(fs.readFileSync(path.join(root,'data','expanded-case-sources.json'),'utf8'));
  assert.equal(manifest.count,686);
  assert.equal(manifest.records.length,686);
  assert.equal(sources.length,686);
  assert.ok(manifest.records.slice(410,486).every(record=>record.qualityScore==='manual-source-match'||record.qualityScore==='manual-source-and-image-match'));
  assert.ok(manifest.records.slice(486).every(record=>record.qualityScore==='source-and-contact-sheet-review'));
  for(const key of ['id','image','sourceUrl','originalSha1','localSha256']) {
    assert.equal(new Set(sources.map(record=>record[key])).size,686,`${key} must be unique`);
  }
  const sourceById = new Map(sources.map(record=>[record.id,record]));
  for(const c of expanded) {
    const id = getId(c);
    const record = sourceById.get(id);
    assert.ok(record,`${id} has source record`);
    assert.equal(c.sourceUrl,record.sourceUrl);
    assert.equal(c.sourceSha1,record.originalSha1);
    assert.equal(c.localSha256,record.localSha256);
    assert.ok(c.sourceFile && c.sourceEvidence && c.licenseUrl);
    assert.equal(createHash('sha256').update(fs.readFileSync(path.join(root,c.image))).digest('hex'),record.localSha256,id);
  }
});

test('original ten IDs keep their order for old URLs and records', () => {
  assert.deepEqual(cases.slice(0,10).map(getId),['pneumothorax','pulmonary-edema','pulmonary-embolism','lung-cancer','basal-ganglia-hemorrhage','epidural-hematoma','multiple-sclerosis','liver-hemangioma','appendicitis','colles-fracture']);
});

test('four earlier additions remain byte-identical to Commons originals', () => {
  const hashes = {'pleural-effusion.png':'ac1d79df646a717b668d9ca40b008748ab50387e','lobar-pneumonia.jpg':'f8e927b2bfc4246de8c2356b5495818a429afbbe','subdural-hematoma.png':'da86d03e22343cdc284ed9c5d96b5c37ba3e182a','hydronephrosis.jpg':'a87be26c8e0db46d6ff17a5b5c7c7c77040f7b6d'};
  for(const [name,hash] of Object.entries(hashes)) assert.equal(createHash('sha1').update(fs.readFileSync(path.join(root,'assets/images',name))).digest('hex'),hash,name);
});

test('every atlas image has a lightweight WebP thumbnail', () => {
  let totalBytes = 0;
  for(const c of cases) {
    const relative = c.image.replace(/^assets\/images\//,'').replace(/\.[^.]+$/,'.webp');
    const file = path.join(root,'assets','thumbnails',relative);
    const bytes = fs.readFileSync(file);
    totalBytes += bytes.length;
    assert.equal(bytes.subarray(0,4).toString(),'RIFF',relative);
    assert.equal(bytes.subarray(8,12).toString(),'WEBP',relative);
  }
  assert.ok(totalBytes < 10 * 1024 * 1024,'thumbnail payload stays below 10 MB');
});

test('DICOM trial has five distinct IDC studies per system', () => {
  assert.equal(dicomStudies.length,20);
  assert.equal(new Set(dicomStudies.map(item=>item.uid)).size,20);
  assert.deepEqual(Object.fromEntries(['胸部','神经','腹部','骨骼'].map(system=>[system,dicomStudies.filter(item=>item.system===system).length])),{胸部:5,神经:5,腹部:5,骨骼:5});
  for(const study of dicomStudies) {
    assert.match(study.uid,/^[0-9.]+$/);
    assert.match(study.doi,/^10\./);
    assert.ok(study.collection && study.subject && study.modality && study.license && study.size>0);
  }
  const config = JSON.parse(fs.readFileSync(path.join(root,'idc-dicomweb.json'),'utf8'));
  const server = config.servers.dicomWeb[0];
  assert.match(server.qidoRoot,/^https:\/\/proxy\.imaging\.datacommons\.cancer\.gov\//);
  assert.equal(server.qidoRoot,server.wadoRoot);
  const app = fs.readFileSync(path.join(root,'app.js'),'utf8');
  assert.match(app,/searchParams\.set\('studyInstanceUIDs', study\.uid\)/);
  assert.doesNotMatch(app,/searchParams\.set\('StudyInstanceUIDs', study\.uid\)/);
});

test('advanced study controls and stable-record migration are wired', () => {
  const html = fs.readFileSync(path.join(root,'index.html'),'utf8');
  const app = fs.readFileSync(path.join(root,'app.js'),'utf8');
  for(const id of ['quickTen','loadMoreCases','queueSearch','queueDiagnosis','queueSampleSize','exportProgress','importProgress','dicomList','findingDraft','reportLocation','reportFindings','reportImpression','reportAdvice','scoreReport','openComparison','compareDialog','reportCount']) assert.match(html,new RegExp(`id="${id}"`));
  assert.match(app,/const stablePrefix = 'yys-honest-v2'/);
  assert.match(app,/function exportLearningRecord/);
  assert.match(app,/function importLearningRecord/);
  assert.match(app,/function sampleByDiagnosis/);
  assert.match(app,/function scoreCurrentReport/);
  assert.match(app,/function showComparison/);
  assert.match(html,/不判断临床正确性/);
  assert.match(html,/不同公开病例/);
});

test('medical-review registry cannot silently mark unknown cases approved', () => {
  const knownIds = new Set(cases.map(getId));
  for(const [id,review] of Object.entries(medicalReviews)) {
    assert.ok(knownIds.has(id),id);
    assert.equal(review.status,'approved');
    for(const field of ['reviewer','credentials','reviewedAt','contentVersion']) assert.ok(review[field],`${id}.${field}`);
    assert.match(review.reviewedAt,/^\d{4}-\d{2}-\d{2}$/);
  }
});
