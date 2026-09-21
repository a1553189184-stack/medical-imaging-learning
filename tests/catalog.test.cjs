const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const {createHash} = require('node:crypto');

const root = path.resolve(__dirname,'..');
const catalogScripts = ['cases.js','curriculum.js','expanded-sources.js','additional-groups.js','next-76-groups.js','next-200-groups.js','next-200-review.js','next-304-groups.js','next-502-groups.js','expanded-cases.js'];
const source = catalogScripts.map(file => fs.readFileSync(path.join(root,file),'utf8')).join('\n');
const data = vm.runInNewContext(source + '\nJSON.stringify({cases:CASES,curriculum:CURRICULUM,sources:EXPANDED_CASE_SOURCES})');
const {cases,curriculum,sources} = JSON.parse(data);
const dicomStudies = JSON.parse(vm.runInNewContext(fs.readFileSync(path.join(root,'dicom-series.js'),'utf8') + '\nJSON.stringify(DICOM_STUDIES)'));
const medicalReviews = JSON.parse(vm.runInNewContext(fs.readFileSync(path.join(root,'medical-reviews.js'),'utf8') + '\nJSON.stringify(MEDICAL_REVIEWS)'));
const legacyCaseIds = JSON.parse(vm.runInNewContext(fs.readFileSync(path.join(root,'legacy-case-ids.js'),'utf8') + '\nJSON.stringify(LEGACY_CASE_IDS)'));
const casePackages = JSON.parse(vm.runInNewContext(fs.readFileSync(path.join(root,'case-packages.js'),'utf8') + '\nJSON.stringify(CASE_PACKAGES)'));
const getId = c => path.basename(c.image,path.extname(c.image));
const expanded = cases.filter(c => c.image.startsWith('assets/images/expanded/'));
const latestChestIds = ['chest-bronchiectasis-01','chest-emphysema-01','chest-pulmonary-fibrosis-01','chest-pericardial-effusion-01','chest-thymoma-01','chest-aortic-dissection-01','chest-hiatal-hernia-01','chest-pneumomediastinum-01','chest-svc-syndrome-01','chest-lung-abscess-01'];
const sha256 = value => createHash('sha256').update(value).digest('hex');
const canonical = value => {
  if(Array.isArray(value)) return '['+value.map(canonical).join(',')+']';
  if(value && typeof value==='object') return '{'+Object.keys(value).sort().map(key=>JSON.stringify(key)+':'+canonical(value[key])).join(',')+'}';
  return JSON.stringify(value);
};

test('account integration exposes only publishable configuration and has isolated cloud-backup policy', () => {
  const config = fs.readFileSync(path.join(root,'auth-config.js'),'utf8');
  const auth = fs.readFileSync(path.join(root,'auth.js'),'utf8');
  const page = fs.readFileSync(path.join(root,'index.html'),'utf8');
  const setup = fs.readFileSync(path.join(root,'AUTH_SETUP.md'),'utf8');
  const policy = fs.readFileSync(path.join(root,'supabase','learning-backups.sql'),'utf8');
  assert.match(config,/supabaseUrl:\s*'https:\/\/[a-z0-9-]+\.supabase\.co'/i);
  assert.match(config,/supabasePublishableKey:\s*'sb_publishable_[A-Za-z0-9_-]+'/);
  assert.match(config,/cloudBackupEnabled:\s*true/);
  assert.doesNotMatch(config,/service_role_[A-Za-z0-9._-]{20,}|sb_secret_[A-Za-z0-9._-]{20,}/);
  assert.match(auth,/signInWithOtp/);
  assert.match(auth,/signInWithOAuth/);
  assert.match(auth,/provider:\s*'github'/);
  assert.match(auth,/cloudBackupEnabled/);
  assert.match(page,/id="authDialog"/);
  assert.match(page,/auth-config\.js/);
  assert.match(policy,/enable row level security/i);
  assert.match(policy,/revoke all on table public\.learning_backups from anon/i);
  assert.match(policy,/auth\.uid\(\)/i);
  assert.match(setup,/service_role/i);
});

test('public search discovery and serverless deployment artifacts are present', () => {
  const page = fs.readFileSync(path.join(root,'index.html'),'utf8');
  const robots = fs.readFileSync(path.join(root,'robots.txt'),'utf8');
  const sitemap = fs.readFileSync(path.join(root,'sitemap.xml'),'utf8');
  const deployment = fs.readFileSync(path.join(root,'DEPLOYMENT.md'),'utf8');
  const health = fs.readFileSync(path.join(root,'api','health.js'),'utf8');
  const status = fs.readFileSync(path.join(root,'api','site-status.js'),'utf8');
  assert.match(page,/<link rel="canonical" href="https:\/\/yingyan-image-lab\.vercel\.app\/"/);
  assert.match(page,/application\/ld\+json/);
  assert.match(robots,/Allow: \//);
  assert.match(robots,/Sitemap: https:\/\/yingyan-image-lab\.vercel\.app\/sitemap\.xml/);
  assert.match(sitemap,/<loc>https:\/\/yingyan-image-lab\.vercel\.app\/<\/loc>/);
  assert.match(health,/timestamp: new Date\(\)\.toISOString\(\)/);
  assert.match(status,/PUBLIC_SITE_URL/);
  assert.match(deployment,/Google Search Console/);
});

test('catalog has 1,114 cases after study-level deduplication', () => {
  assert.equal(cases.length,1114);
  assert.equal(expanded.length,1100);
  const totals = Object.fromEntries(['胸部','神经','腹部','骨骼'].map(system => [system,cases.filter(c => c.system===system).length]));
  assert.deepEqual(totals,{胸部:285,神经:261,腹部:260,骨骼:308});
  assert.deepEqual(Object.fromEntries(Object.keys(totals).map(system=>[system,expanded.filter(c=>c.system===system).length])),{胸部:279,神经:257,腹部:257,骨骼:307});
  const latest = sources.filter(record=>latestChestIds.includes(record.id));
  assert.equal(latest.length,10);
  assert.equal(new Set(latest.map(record=>record.groupKey)).size,10);
  assert.ok(latestChestIds.every(id=>cases.some(c=>getId(c)===id && c.system==='胸部')));
  const finalBatch=sources.filter(record=>record.qualityScore==='manual-source-match'||record.qualityScore==='manual-source-and-image-match');
  assert.equal(finalBatch.length,75);
  assert.deepEqual(Object.fromEntries(Object.keys(totals).map(system=>[system,finalBatch.filter(c=>c.system===system).length])),{胸部:19,神经:19,腹部:18,骨骼:19});
  assert.equal(new Set(finalBatch.map(record=>record.groupKey)).size,75);
  assert.equal(new Set(finalBatch.map(record=>record.sourceTitle)).size,75);
  assert.ok(finalBatch.every(record=>!/histolog|histopath|micrograph|gross pathology|autopsy|specimen|cells or tissue/i.test(`${record.sourceTitle} ${record.sourceDescription}`)));
  const expansion700=sources.filter(record=>record.qualityScore==='source-and-contact-sheet-review');
  assert.equal(expansion700.length,189);
  assert.equal(new Set(expansion700.map(record=>record.groupKey)).size,189);
  assert.equal(new Set(expansion700.map(record=>record.sourceTitle)).size,189);
  const expansion700Cases=cases.filter(c=>expansion700.some(record=>record.id===getId(c)));
  assert.equal(expansion700Cases.length,189);
  assert.ok(expansion700Cases.every(c=>c.findings.length>=3 && !c.findings.some(item=>item.startsWith('识别与'))));
  assert.ok(expansion700.every(record=>!/histolog|histopath|micrograph|gross pathology|autopsy|specimen|cells or tissue/i.test(`${record.sourceTitle} ${record.sourceDescription}`)));
  const expansion1004=sources.filter(record=>record.qualityScore==='diagnosis-linked-source-and-contact-sheet-review');
  assert.equal(expansion1004.length,252);
  assert.equal(new Set(expansion1004.map(record=>record.groupKey)).size,252);
  assert.equal(new Set(expansion1004.map(record=>record.sourceTitle)).size,252);
  assert.ok(expansion1004.every(record=>record.sourceAudit==='source-label-matches-topic'||record.sourceAudit==='direct-source-label-match-after-perceptual-review'));
  assert.ok(expansion1004.every(record=>record.width>=480 && record.height>=480 && record.sourceDescription.length>=8));
  assert.ok(expansion1004.every(record=>!/annotation|annotated|diagram|scheme|drawing|histolog|histopath|micrograph|gross pathology|autopsy|specimen|cytology|cells or tissue|veterinary|\bdog\b|\bcat\b|operative photograph|surgery photo/i.test(`${record.sourceTitle} ${record.sourceDescription}`)));
  const expansionCurated=sources.filter(record=>record.id.includes('-1506-'));
  assert.equal(expansionCurated.length,178);
  assert.deepEqual(Object.fromEntries(Object.keys(totals).map(system=>[system,expansionCurated.filter(c=>c.system===system).length])),{胸部:48,神经:37,腹部:41,骨骼:52});
  assert.equal(new Set(expansionCurated.map(record=>record.sourceUrl)).size,178);
  assert.equal(new Set(expansionCurated.map(record=>record.localSha256)).size,178);
  assert.ok(expansionCurated.every(record=>record.qualityScore==='source-title-checked-and-one-image-per-study' && record.sourceAudit==='manual-curation-after-perceptual-and-study-review'));
  assert.ok(expansionCurated.every(record=>record.width>=480 && record.height>=480 && record.sourceDescription.length>=8));
  assert.ok(!expansionCurated.some(record=>/Hautfalten|parastomal hernia|xanthogranulomatous pyelonephritis cd68|Radiopaedia 154713-127660/i.test(record.sourceTitle)));
});

test('bone cases are split into source-supported teaching subtypes', () => {
  const diagnosis = c => c.title.split(' · 开放病例')[0];
  const diversity = Object.fromEntries(['胸部','神经','腹部','骨骼'].map(system=>[system,new Set(cases.filter(c=>c.system===system).map(diagnosis)).size]));
  assert.deepEqual(diversity,{胸部:113,神经:104,腹部:114,骨骼:129});
  for(const title of ['股骨颈骨折（Garden III）','转子间股骨骨折','肩关节后脱位','儿童桡骨青枝骨折','Tillaux 骨折']) assert.ok(cases.some(c=>diagnosis(c)===title),title);
});

test('semantic audit corrections do not regress', () => {
  assert.equal(new Set(cases.map(item=>item.title)).size,cases.length,'display titles must be unique');
  assert.ok(cases.every(item=>!/（公开病例\s*\d+）/.test(item.title)),'batch counters must not impersonate case identity');
  const byId = new Map(cases.map(item=>[getId(item),item]));
  assert.equal(byId.get('bone-1506-089').modality,'X-RAY');
  assert.equal(byId.get('bone-1506-049').modality,'X-RAY');
  assert.equal(byId.get('neuro-new-moyamoya-01').modality,'MRA');
  assert.equal(byId.get('neuro-new-moyamoya-02').modality,'DSA');
  assert.equal(byId.get('neuro-new-cerebral-aneurysm-01').modality,'CT');
  assert.equal(byId.get('chest-700-34').modality,'X-RAY');
  assert.equal(byId.get('chest-1004-001').modality,'X-RAY');
  assert.match(byId.get('chest-1004-001').title,/左侧半胸不透明影/);
  assert.ok(!/印戒征|支气管内径/.test(byId.get('chest-1004-001').findings[0]));
  assert.match(byId.get('bone-1506-027').title,/术后内固定/);
  assert.match(byId.get('neuro-1506-025').title,/治疗前后/);
  for(const id of ['chest-1004-037','chest-1004-045','chest-1004-023','abdomen-next-budd-chiari-01','neuro-1004-061']) assert.ok(!byId.has(id),`${id} is excluded after review`);
  assert.equal(legacyCaseIds.length,1184);
  assert.equal(new Set(legacyCaseIds).size,1184);
  assert.ok(legacyCaseIds.includes('chest-1004-037'));
  assert.ok(legacyCaseIds.includes('chest-1004-045'));
  const lessonById = new Map(curriculum.map(item=>[item.id,item]));
  for(const source of sources) {
    const item=byId.get(source.id);
    const lesson=lessonById.get(source.id);
    const modalityTags=lesson.tags.filter(tag=>['CT','CTA','CTPA','MRI','MRA','DSA','US','X-RAY','骨显像'].includes(tag));
    assert.deepEqual(modalityTags,[item.modality],`${source.id} modality tag must match its image`);
    if(item.modality!=='X-RAY' && item.system==='胸部') assert.ok(!/投照体位|曝光质量/.test(lesson.methods[0][1]),`${source.id} chest first step`);
    if(item.modality!=='X-RAY' && item.system==='骨骼') assert.ok(!/至少联合两个正交方向/.test(lesson.methods[0][1]),`${source.id} bone first step`);
  }
  for(const source of sources.filter(item=>item.id.includes('-1506-'))) {
    const item=byId.get(source.id);
    const lesson=lessonById.get(source.id);
    if(item.modality==='X-RAY') assert.ok(!/多个MRI序列/.test(lesson.methods[1][1]),`${source.id} X-ray method`);
    if(!/肿瘤|瘤/.test(item.title)) assert.ok(!/规范骨肿瘤评估/.test(lesson.methods[2][1]),`${source.id} next step`);
  }
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
  assert.equal(manifest.count,1100);
  assert.equal(manifest.records.length,1100);
  assert.equal(sources.length,1100);
  assert.equal(manifest.expansion1506.count,178);
  assert.deepEqual(manifest.expansion1506.bySystem,{胸部:48,神经:37,腹部:41,骨骼:52});
  const strictStudyKey = title => title.toLocaleLowerCase().replace(/\.(?:jpe?g|png)$/i,'').replace(/\s+rgbc[a-z](?: ce)?$/i,'').replace(/[ -]\d{1,4}$/,'').replace(/\s+/g,' ').trim();
  assert.equal(new Set(sources.map(record=>strictStudyKey(record.sourceTitle))).size,sources.length,'one image per strict source study stem');
  for(const key of ['id','image','sourceUrl','originalSha1','localSha256']) {
    assert.equal(new Set(sources.map(record=>record[key])).size,1100,`${key} must be unique`);
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
  assert.ok(totalBytes < 18 * 1024 * 1024,'thumbnail payload stays below 18 MB');
});

test('all cases have deterministic versioned packages covering content, lesson and image bytes', () => {
  assert.equal(casePackages.length,1114);
  assert.equal(new Set(casePackages.map(record=>record.id)).size,1114);
  const packageById = new Map(casePackages.map(record=>[record.id,record]));
  const lessonById = new Map(curriculum.map(lesson=>[lesson.id,lesson]));
  for(const item of cases) {
    const id=getId(item), lesson=lessonById.get(id), record=packageById.get(id);
    assert.ok(record,id);
    const caseCore={id,title:item.title,system:item.system,modality:item.modality,level:item.level,history:item.history,options:item.options,answer:item.answer,findings:item.findings,explain:item.explain,report:item.report,source:item.source,sourceUrl:item.sourceUrl,license:item.license,licenseUrl:item.licenseUrl||''};
    const lessonCore={id,english:lesson.english,recall:lesson.recall,methods:lesson.methods,tips:lesson.tips,pitfalls:lesson.pitfalls,differential:lesson.differential,pearl:lesson.pearl,limitation:lesson.limitation,refs:lesson.refs};
    assert.equal(record.schemaVersion,'1.0');
    assert.match(record.contentVersion,/^\d{4}\.\d{2}\.\d+$/);
    assert.equal(record.caseSha256,sha256(canonical(caseCore)),id+' case content');
    assert.equal(record.lessonSha256,sha256(canonical(lessonCore)),id+' lesson content');
    assert.equal(record.imageSha256,sha256(fs.readFileSync(path.join(root,item.image))),id+' image');
    assert.equal(record.packageSha256,sha256(canonical({schemaVersion:'1.0',contentVersion:record.contentVersion,id,caseSha256:record.caseSha256,lessonSha256:record.lessonSha256,imageSha256:record.imageSha256})),id+' package');
  }
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
  for(const id of ['quickTen','loadMoreCases','queueSearch','queueDiagnosis','queueSampleSize','exportProgress','importProgress','dicomList','findingDraft','reasoningCoach','reasoningCount','reportLocation','reportFindings','reportImpression','reportAdvice','scoreReport','openComparison','compareDialog','reportCount','learnerLevel','requestHint','hintPanel','hintCount','prescriptionList','startPrescription','studyPrescription','reviewPlanList','dueReviewCount','startDueReviews','studyDueReviews','systemPerformance','discussionDirection','discussionObservation','discussionCapture','discussionCard','copyDiscussionCard']) assert.match(html,new RegExp(`id="${id}"`));
  assert.match(app,/const stablePrefix = 'yys-honest-v2'/);
  assert.match(app,/function exportLearningRecord/);
  assert.match(app,/function importLearningRecord/);
  assert.match(app,/function sampleByDiagnosis/);
  assert.match(app,/function scoreCurrentReport/);
  assert.match(app,/function showComparison/);
  assert.match(app,/function requestHint/);
  assert.match(app,/function renderReasoningCoach/);
  assert.match(app,/function prescriptionSignal/);
  assert.match(app,/function buildPrescription/);
  assert.match(app,/function startPrescription/);
  assert.match(app,/function scheduleReview/);
  assert.match(app,/function dueReviewQueue/);
  assert.match(app,/function firstAnswerEventsByCase/);
  assert.match(app,/function renderSystemPerformance/);
  assert.match(app,/function startSystemMistakes/);
  assert.match(app,/reviewPlanKey/);
  assert.match(html,/未答题病例不会被标成/);
  assert.match(app,/reasoning_checkpoint_completed/);
  assert.match(app,/function recordLearningEvent/);
  assert.match(app,/packageSha256/);
  assert.match(app,/cornerstone\/viewer\.js\?v=atlas18/);
  const viewerSource = fs.readFileSync(path.join(root,'src','cornerstone-viewer.js'),'utf8');
  assert.match(viewerSource,/RectangleROITool/);
  assert.match(viewerSource,/EllipticalROITool/);
  assert.match(viewerSource,/function captureDiscussionLayer/);
  assert.match(viewerSource,/function buildDiscussionCard/);
  assert.match(html,/不判断临床正确性/);
  assert.match(html,/不同公开病例/);
});

test('radiography SOP is complete, structured and locally auditable', () => {
  const html = fs.readFileSync(path.join(root,'index.html'),'utf8');
  const sopSource = fs.readFileSync(path.join(root,'sop-data.js'),'utf8');
  const sop = JSON.parse(vm.runInNewContext(sopSource + '\nJSON.stringify({protocols:SOP_PROTOCOLS,reasons:SOP_REJECT_REASONS,workflow:SOP_WORKFLOW})'));
  assert.equal(sop.protocols.length,16);
  assert.equal(new Set(sop.protocols.map(item=>item.id)).size,16);
  assert.equal(new Set(sop.protocols.map(item=>item.sys)).size,6);
  assert.equal(sop.workflow.length,6);
  assert.ok(sop.reasons.length >= 10);
  for(const item of sop.protocols) {
    for(const field of ['id','sys','name','view','position','landmark','cr','sid','tech','aec','collimation','breath']) assert.ok(item[field],`${item.id}.${field}`);
    assert.ok(item.criteria.length >= 5,`${item.id}.criteria`);
    assert.ok(item.errors.length >= 5,`${item.id}.errors`);
  }
  assert.match(html,/data-view="sop"/);
  assert.match(html,/id="sopContent"/);
  assert.match(html,/sop-data\.js/);
  assert.match(html,/sop\.js/);
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
