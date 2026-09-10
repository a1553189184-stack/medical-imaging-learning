const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const {createHash} = require('node:crypto');
const root = path.resolve(__dirname,'..');
const data = vm.runInNewContext(fs.readFileSync(path.join(root,'cases.js'),'utf8') + '\n' + fs.readFileSync(path.join(root,'curriculum.js'),'utf8') + '\nJSON.stringify({cases:CASES,curriculum:CURRICULUM})');
const {cases,curriculum} = JSON.parse(data);
const getId = c => path.basename(c.image,path.extname(c.image));

test('case metadata, diagnosis content and real local images match one-to-one', () => {
  assert.equal(new Set(cases.map(getId)).size,cases.length);
  assert.equal(new Set(curriculum.map(c=>c.id)).size,curriculum.length);
  assert.equal(cases.length,curriculum.length);
  for(const c of cases) {
    const lesson = curriculum.find(item=>item.id===getId(c));
    assert.ok(lesson, c.title + ' has curriculum');
    for(const field of ['title','system','modality','history','explain','report','source','license']) assert.ok(c[field]);
    assert.equal(c.options.length,4);
    assert.ok(Number.isInteger(c.answer) && c.answer>=0 && c.answer<c.options.length);
    for(const field of ['findings']) assert.ok(c[field].length>=3);
    for(const field of ['english','recall','limitation']) assert.ok(lesson[field]);
    assert.ok(lesson.methods.length>=3 && lesson.methods.every(step=>step.length===2 && step.every(Boolean)));
    assert.ok(lesson.tips.length>=2 && lesson.pitfalls.length>=2 && lesson.refs.length>=1);
    assert.equal(new URL(c.sourceUrl).protocol,'https:');
    assert.ok(lesson.refs.every(ref=>new URL(ref[1]).protocol==='https:'));
    assert.ok(c.image.startsWith('assets/images/') && !c.image.includes('..'));
    const bytes = fs.readFileSync(path.join(root,c.image));
    assert.ok(bytes.length>10000);
    assert.ok(bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])) || (bytes[0]===255 && bytes[1]===216 && bytes[2]===255), c.image + ' is PNG or JPEG');
  }
});

test('original ten IDs keep their order for old URLs and records', () => {
  assert.deepEqual(cases.slice(0,10).map(getId),['pneumothorax','pulmonary-edema','pulmonary-embolism','lung-cancer','basal-ganglia-hemorrhage','epidural-hematoma','multiple-sclerosis','liver-hemangioma','appendicitis','colles-fracture']);
});

test('four new images are byte-identical to Commons originals', () => {
  const hashes = {'pleural-effusion.png':'ac1d79df646a717b668d9ca40b008748ab50387e','lobar-pneumonia.jpg':'f8e927b2bfc4246de8c2356b5495818a429afbbe','subdural-hematoma.png':'da86d03e22343cdc284ed9c5d96b5c37ba3e182a','hydronephrosis.jpg':'a87be26c8e0db46d6ff17a5b5c7c7c77040f7b6d'};
  for(const [name,hash] of Object.entries(hashes)) assert.equal(createHash('sha1').update(fs.readFileSync(path.join(root,'assets/images',name))).digest('hex'),hash,name);
});
