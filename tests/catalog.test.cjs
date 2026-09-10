const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const {createHash} = require('node:crypto');

const root = path.resolve(__dirname,'..');
const catalogScripts = ['cases.js','curriculum.js','expanded-sources.js','expanded-cases.js'];
const source = catalogScripts.map(file => fs.readFileSync(path.join(root,file),'utf8')).join('\n');
const data = vm.runInNewContext(source + '\nJSON.stringify({cases:CASES,curriculum:CURRICULUM,sources:EXPANDED_CASE_SOURCES})');
const {cases,curriculum,sources} = JSON.parse(data);
const getId = c => path.basename(c.image,path.extname(c.image));
const expanded = cases.filter(c => c.image.startsWith('assets/images/expanded/'));

test('catalog has 50 new unique cases for every anatomical system', () => {
  assert.equal(cases.length,214);
  assert.equal(expanded.length,200);
  const totals = Object.fromEntries(['胸部','神经','腹部','骨骼'].map(system => [system,cases.filter(c => c.system===system).length]));
  assert.deepEqual(totals,{胸部:56,神经:54,腹部:53,骨骼:51});
  for(const system of Object.keys(totals)) assert.equal(expanded.filter(c => c.system===system).length,50,system);
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
  assert.equal(manifest.count,200);
  assert.equal(manifest.records.length,200);
  assert.equal(sources.length,200);
  for(const key of ['id','image','sourceUrl','originalSha1','localSha256']) {
    assert.equal(new Set(sources.map(record=>record[key])).size,200,`${key} must be unique`);
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
