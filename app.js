'use strict';
const cases = CASES.map(function(c) {
  const id = c.image.split('/').pop().replace(/\.[^.]+$/, '');
  return Object.assign({}, c, CURRICULUM.find(function(item) { return item.id === id; }));
});
const byId = new Map(cases.map(function(c) { return [c.id, c]; }));
const packageById = new Map(CASE_PACKAGES.map(function(item) { return [item.id,item]; }));
const ids = cases.map(function(c) { return c.id; });
const $ = function(s) { return document.querySelector(s); };
const $$ = function(s) { return Array.from(document.querySelectorAll(s)); };
const esc = function(value) { return String(value).replace(/[&<>"']/g, function(c) { return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; }); };
const storagePrefix = 'yys-honest-v1';
const stablePrefix = 'yys-honest-v2';
const sessionKey = 'yys-training-v2';
let storageAvailable = true;
function read(key, fallback) {
  try { const raw = localStorage.getItem(key); return raw === null ? fallback : JSON.parse(raw); }
  catch { return fallback; }
}
function save(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); }
  catch {
    storageAvailable = false;
    $('.local-mode').textContent = '临时模式 · 刷新后可能丢失记录';
    $('#noteSaved').textContent = '仅当前页面保留';
  }
}
const validLearnerLevels = ['student','resident','advanced'];
const validLearningEventTypes = ['hint_requested','answer_submitted','report_scored','reviewed_changed','reasoning_checkpoint_completed'];
const storedLearnerLevel = read(stablePrefix + '-learner-level','student');
let learnerLevel = validLearnerLevels.includes(storedLearnerLevel) ? storedLearnerLevel : 'student';
function sanitizeLearningEvent(event) {
  if (!event || typeof event !== 'object' || typeof event.id !== 'string' || !byId.has(event.caseId) ||
      !validLearningEventTypes.includes(event.type) || typeof event.createdAt !== 'string' || !validLearnerLevels.includes(event.learnerLevel)) return null;
  const clean = {id:event.id.slice(0,100),type:event.type,caseId:event.caseId,packageSha256:typeof event.packageSha256 === 'string' ? event.packageSha256.slice(0,64) : '',learnerLevel:event.learnerLevel,mode:event.mode === 'study' ? 'study' : 'quiz',createdAt:event.createdAt.slice(0,40)};
  if (Number.isInteger(event.hintLevel) && event.hintLevel >= 1 && event.hintLevel <= 3) clean.hintLevel = event.hintLevel;
  if (Number.isInteger(event.hintsUsed) && event.hintsUsed >= 0 && event.hintsUsed <= 3) clean.hintsUsed = event.hintsUsed;
  if (Number.isInteger(event.answerIndex) && event.answerIndex >= 0 && event.answerIndex <= 3) clean.answerIndex = event.answerIndex;
  if (typeof event.correct === 'boolean') clean.correct = event.correct;
  if (Number.isFinite(event.score)) clean.score = Math.max(0,Math.min(100,event.score));
  if (Number.isInteger(event.checkpointCount) && event.checkpointCount >= 1 && event.checkpointCount <= 3) clean.checkpointCount = event.checkpointCount;
  if (typeof event.reviewed === 'boolean') clean.reviewed = event.reviewed;
  return clean;
}
let learningEvents = read(stablePrefix + '-learning-events',[]);
if (!Array.isArray(learningEvents)) learningEvents = [];
learningEvents = learningEvents.map(sanitizeLearningEvent).filter(Boolean).slice(-5000);
function recordLearningEvent(type,c,detail) {
  const packageRecord = packageById.get(c.id);
  const event = Object.assign({
    id:(globalThis.crypto && globalThis.crypto.randomUUID ? globalThis.crypto.randomUUID() : Date.now() + '-' + Math.random().toString(16).slice(2)),
    type:type,caseId:c.id,packageSha256:packageRecord ? packageRecord.packageSha256 : '',
    learnerLevel:learnerLevel,mode:session.mode,createdAt:new Date().toISOString()
  },detail || {});
  learningEvents.push(event);
  if (learningEvents.length > 5000) learningEvents = learningEvents.slice(-5000);
  save(stablePrefix + '-learning-events',learningEvents);
}
function validIndices(value) {
  return Array.isArray(value) ? Array.from(new Set(value.filter(function(i) { return Number.isInteger(i) && i >= 0 && i < cases.length; }))) : [];
}
function validIds(value) {
  return Array.isArray(value) ? Array.from(new Set(value.filter(function(id) { return byId.has(id); }))) : [];
}
function migrateLegacyIndices(key) {
  return validIndices(read(storagePrefix + key, [])).map(function(i) { return cases[i].id; });
}
let favorites = validIds(read(stablePrefix + '-favorites', migrateLegacyIndices('-favorites')));
let completed = validIds(read(stablePrefix + '-completed', migrateLegacyIndices('-completed')));
let correct = Math.max(0, Math.min(Number(read(storagePrefix + '-correct', 0)) || 0, completed.length));
let reviewed = validIds(read(storagePrefix + '-reviewed', []));
const notes = {};
const findingDrafts = {};
const reportDrafts = {};
const reasoningDrafts = {};
cases.forEach(function(c, i) {
  try {
    const stable = localStorage.getItem(stablePrefix + '-note-' + c.id);
    const legacy = localStorage.getItem(storagePrefix + '-note-' + i);
    notes[c.id] = stable !== null ? stable : (legacy || '');
    if (stable === null && legacy) localStorage.setItem(stablePrefix + '-note-' + c.id, legacy);
    findingDrafts[c.id] = localStorage.getItem(stablePrefix + '-finding-' + c.id) || '';
    const storedReport = read(stablePrefix + '-report-' + c.id, {});
    reportDrafts[c.id] = storedReport && typeof storedReport === 'object' ? {
      location:typeof storedReport.location === 'string' ? storedReport.location.slice(0,2000) : '',
      findings:typeof storedReport.findings === 'string' ? storedReport.findings.slice(0,20000) : '',
      impression:typeof storedReport.impression === 'string' ? storedReport.impression.slice(0,10000) : '',
      advice:typeof storedReport.advice === 'string' ? storedReport.advice.slice(0,10000) : '',
      score:Number.isFinite(storedReport.score) ? Math.max(0,Math.min(100,storedReport.score)) : null
    } : {location:'',findings:'',impression:'',advice:'',score:null};
    const storedReasoning = read(stablePrefix + '-reasoning-' + c.id, {});
    const reasoningResponses = storedReasoning && Array.isArray(storedReasoning.responses) ? [0,1,2].map(function(index) { return typeof storedReasoning.responses[index] === 'string' ? storedReasoning.responses[index].slice(0,4000) : ''; }) : ['','',''];
    const reasoningComplete = reasoningResponses.every(function(response) { return response.trim().length >= 6; });
    reasoningDrafts[c.id] = {
      responses:reasoningResponses,
      completedAt:reasoningComplete && storedReasoning && typeof storedReasoning.completedAt === 'string' ? storedReasoning.completedAt.slice(0,40) : null,
      eventRecorded:Boolean(reasoningComplete && storedReasoning && storedReasoning.eventRecorded === true)
    };
  } catch {
    notes[c.id] = '';
    findingDrafts[c.id] = '';
    reportDrafts[c.id] = {location:'',findings:'',impression:'',advice:'',score:null};
    reasoningDrafts[c.id] = {responses:['','',''],completedAt:null,eventRecorded:false};
  }
});
save(stablePrefix + '-favorites', favorites);
save(stablePrefix + '-completed', completed);
const loaded = read(sessionKey, {});
const storedSession = loaded && typeof loaded === 'object' ? loaded : {};
const savedQueue = validIds(storedSession.queue);
const session = {
  queue: savedQueue.length ? savedQueue : ids.slice(),
  cursor: 0,
  mode: storedSession.mode === 'study' ? 'study' : 'quiz',
  order: ['ordered','random','custom'].includes(storedSession.order) ? storedSession.order : 'ordered',
  answers: {},
  hints: {}
};
session.cursor = Math.max(0, Math.min(Number.isInteger(storedSession.cursor) ? storedSession.cursor : 0, session.queue.length - 1));
if (storedSession.answers && typeof storedSession.answers === 'object') {
  Object.entries(storedSession.answers).forEach(function(entry) {
    const c = byId.get(entry[0]);
    if (c && Number.isInteger(entry[1]) && entry[1] >= 0 && entry[1] < c.options.length) session.answers[c.id] = entry[1];
  });
}
if (storedSession.hints && typeof storedSession.hints === 'object') {
  Object.entries(storedSession.hints).forEach(function(entry) {
    if (byId.has(entry[0]) && Number.isInteger(entry[1]) && entry[1] >= 0 && entry[1] <= 3) session.hints[entry[0]] = entry[1];
  });
}
const attemptsKey = storagePrefix + '-attempts-v1';
const storedAttempts = read(attemptsKey, {}), attempts = {};
if (storedAttempts && typeof storedAttempts === 'object' && !Array.isArray(storedAttempts)) {
  Object.entries(storedAttempts).forEach(function(entry) {
    const c = byId.get(entry[0]), item = entry[1];
    if (!c || !item || typeof item !== 'object') return;
    if (Number.isSafeInteger(item.count) && item.count > 0 && Number.isSafeInteger(item.wrong) && item.wrong >= 0 && item.wrong <= item.count &&
        Number.isInteger(item.lastAnswer) && item.lastAnswer >= 0 && item.lastAnswer < c.options.length) {
      attempts[c.id] = {count:item.count, wrong:item.wrong, lastAnswer:item.lastAnswer};
    }
  });
}
// Recover only answers actually stored by the previous version, never infer a wrong case from an aggregate score.
Object.entries(session.answers).forEach(function(entry) {
  if (!attempts[entry[0]]) attempts[entry[0]] = {count:1, wrong:entry[1] === byId.get(entry[0]).answer ? 0 : 1, lastAnswer:entry[1]};
});
save(attemptsKey, attempts);
const reviewPlanKey = stablePrefix + '-review-plan';
function validReviewPlanRecord(value) {
  return value && typeof value === 'object' && Number.isInteger(value.streak) && value.streak >= 0 && value.streak <= 100 &&
    Number.isInteger(value.intervalDays) && value.intervalDays >= 0 && value.intervalDays <= 30 && typeof value.dueDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value.dueDate);
}
const storedReviewPlan = read(reviewPlanKey, {}), reviewPlan = {};
if (storedReviewPlan && typeof storedReviewPlan === 'object' && !Array.isArray(storedReviewPlan)) Object.entries(storedReviewPlan).forEach(function(entry) {
  if (byId.has(entry[0]) && validReviewPlanRecord(entry[1])) reviewPlan[entry[0]] = entry[1];
});
const isMistake = function(c) { return Boolean(attempts[c.id] && attempts[c.id].lastAnswer !== c.answer); };
const mistakeIds = function() { return cases.filter(isMistake).map(function(c) { return c.id; }); };
let currentView = 'home', detailId = ids[0], selected = null, recallOpen = true, reasoningStep = 'findings', reasoningPromptIndex = 0;
const AUTHORIZED_LIBRARY_VERSION = '20260922g';
let authorizedDiseaseManifest = null, authorizedDiseaseLibraries = {}, diseaseLibraryLimit = 60, diseaseLibraryLoading = {}, diseaseLibrarySystem = 'abdomen';
let atlasSystem = 'all', atlasLimit = 48, noticeTimer, draftRows = [], draftSelected = new Set(), dicomSystem = 'all';
let tool = 'contrast', zoom = 1, contrast = 1, inverted = false, imageMarks = [];
let comparePrimaryId = ids[0], compareSecondaryId = null;
let cornerstoneModulePromise = null;
const currentCase = function() { return byId.get(session.queue[session.cursor]); };
const hasAnswer = function(c) { return Object.prototype.hasOwnProperty.call(session.answers, c.id); };
const persistSession = function() { save(sessionKey, session); };
function notify(message) {
  clearTimeout(noticeTimer);
  $('#notice').textContent = message;
  $('#notice').classList.add('visible');
  noticeTimer = setTimeout(function() { $('#notice').classList.remove('visible'); }, 3000);
}
function updateLocation() {
  const url = new URL(location.href);
  url.search = '';
  if (currentView !== 'home') url.searchParams.set('view', currentView);
  if (currentView === 'viewer' || currentView === 'caseDetail') {
    const c = currentView === 'viewer' ? currentCase() : byId.get(detailId);
    url.searchParams.set('caseId', c.id);
    if (currentView === 'viewer') url.searchParams.set('mode', session.mode);
  }
  history.replaceState(null, '', url);
}
function showView(view, updateUrl = true) {
  if (!['home','cases','caseDetail','viewer','dicom','diseaseLibrary','sop','mylibrary','progress'].includes(view)) view = 'home';
  currentView = view;
  $$('.view').forEach(function(el) { el.classList.toggle('active', el.id === view); });
  $$('.nav-item').forEach(function(el) {
    const active = el.dataset.view === (view === 'caseDetail' ? 'cases' : view);
    el.classList.toggle('active', active);
    if (active) el.setAttribute('aria-current','page'); else el.removeAttribute('aria-current');
  });
  $('.sidebar').classList.remove('open');
  $('.menu').setAttribute('aria-expanded','false');
  if (view === 'cases') renderCases();
  if (view === 'dicom') renderDicomStudies();
  if (view === 'diseaseLibrary') renderDiseaseLibrary();
  if (view === 'sop' && window.SopCenter) window.SopCenter.render();
  if (view === 'progress') updateStats();
  if (view === 'mylibrary' && window.__myLib) window.__myLib.render();
  if (updateUrl) updateLocation();
  window.scrollTo(0, 0);
}
function loadAuthorizedDiseaseManifest() {
  if (authorizedDiseaseManifest) return Promise.resolve(authorizedDiseaseManifest);
  return fetch('library-data/authorized-library-manifest.json?v=' + AUTHORIZED_LIBRARY_VERSION)
    .then(function(response) { if (!response.ok) throw new Error('授权分类清单暂不可用'); return response.json(); })
    .then(function(data) {
      if (!data || !Array.isArray(data.systems)) throw new Error('授权分类清单格式无效');
      authorizedDiseaseManifest = data;
      return data;
    });
}
function loadAuthorizedDiseaseLibrary(systemKey) {
  if (authorizedDiseaseLibraries[systemKey]) return Promise.resolve(authorizedDiseaseLibraries[systemKey]);
  if (!diseaseLibraryLoading[systemKey]) {
    diseaseLibraryLoading[systemKey] = loadAuthorizedDiseaseManifest().then(function(manifest) {
      const system = manifest.systems.find(function(item) { return item.key === systemKey; });
      if (!system) throw new Error('未找到所选系统');
      return fetch(system.file + '?v=' + AUTHORIZED_LIBRARY_VERSION).then(function(response) { if (!response.ok) throw new Error(system.name + '分类内容暂不可用'); return response.json(); });
    }).then(function(data) {
      if (!data || !Array.isArray(data.records) || !Array.isArray(data.categories)) throw new Error('授权分类内容格式无效');
      authorizedDiseaseLibraries[systemKey] = data;
      return data;
    });
  }
  return diseaseLibraryLoading[systemKey];
}
function setLibraryOptions(select, items, current, allLabel) {
  select.innerHTML = '<option value="all">' + esc(allLabel) + '</option>' + items.map(function(item) {
    return '<option value="' + esc(item.id) + '">' + esc(item.name) + (Number.isFinite(item.count) ? '（' + item.count + '）' : '') + '</option>';
  }).join('');
  select.value = items.some(function(item) { return item.id === current; }) ? current : 'all';
}
function cleanLibraryText(value) { return String(value == null ? '' : value).replace(/\*\*/g,'').trim(); }
function librarySummary(record) {
  const candidates = [record.brief,record.summary,typeof record.detail === 'string' ? record.detail : '',record.definitionBoundary];
  return cleanLibraryText(candidates.find(function(value) { return value && typeof value === 'string'; }) || '进入详情查看完整教学内容。');
}
function renderLibraryValue(value) {
  if (value == null || value === '') return '';
  if (Array.isArray(value)) {
    if (!value.length) return '';
    return '<ul>' + value.map(function(item) { return '<li>' + renderLibraryValue(item) + '</li>'; }).join('') + '</ul>';
  }
  if (typeof value === 'object') {
    return Object.keys(value).filter(function(key) { return value[key] != null && value[key] !== '' && (!Array.isArray(value[key]) || value[key].length); }).map(function(key) {
      return '<h4>' + esc(key) + '</h4>' + renderLibraryValue(value[key]);
    }).join('');
  }
  return '<p>' + esc(cleanLibraryText(value)).replace(/\n/g,'<br>') + '</p>';
}
function renderLibrarySection(title, values) {
  const content = values.map(function(value) { return renderLibraryValue(value); }).filter(Boolean).join('');
  return content ? '<section class="disease-detail-section"><h3>' + esc(title) + '</h3>' + content + '</section>' : '';
}
function openDiseaseLibraryRecord(recordId) {
  const data = authorizedDiseaseLibraries[diseaseLibrarySystem];
  if (!data) return;
  const record = data.records.find(function(item) { return item.id === recordId; });
  if (!record) return;
  const images = Array.isArray(record.images) ? record.images : [];
  const meta = [record.location,record.modality].concat(Array.isArray(record.modalities) ? record.modalities : []).concat(record.status || []).filter(Boolean);
  $('#diseaseLibraryDialogPath').textContent = [data.system,record.category,record.groupName].filter(Boolean).join(' · ');
  $('#diseaseLibraryDialogTitle').textContent = record.name || '疾病详情';
  $('#diseaseLibraryDialogEnglish').textContent = record.nameEn || '';
  const gallery = images.length ? '<section class="disease-detail-section"><h3>关联影像（' + images.length + '）</h3><div class="disease-detail-gallery">' + images.map(function(image) {
    const caption = image.caption || image.type || record.name;
    const source = image.sourceUrl ? '<br><a href="' + esc(image.sourceUrl) + '" target="_blank" rel="noopener noreferrer">' + esc(image.source || '查看影像来源') + '</a>' + (image.license ? ' · ' + esc(image.license) : '') : '';
    return '<figure><img loading="lazy" src="' + esc(image.src) + '" alt="' + esc(caption) + '"><figcaption>' + esc([image.type,image.caption].filter(Boolean).join(' · ') || record.name) + source + '</figcaption></figure>';
  }).join('') + '</div></section>' : '';
  $('#diseaseLibraryDialogBody').innerHTML =
    (meta.length ? '<div class="disease-detail-meta">' + Array.from(new Set(meta)).map(function(item) { return '<span>' + esc(item) + '</span>'; }).join('') + '</div>' : '') +
    '<div class="disease-detail-summary">' + esc(librarySummary(record)) + '</div>' +
    renderLibrarySection('临床背景与流行病学',[record.epidemiology,record.clinical,record.clinicalContext,record.locationAndMechanism]) +
    renderLibrarySection('影像表现与诊断要点',[record.imaging,record.detail,record.specialSigns,record.namedSigns,record.assessment]) +
    renderLibrarySection('鉴别诊断',[record.differential,record.differentialDiagnosis]) +
    renderLibrarySection('报告、处理与易错点',[record.reporting,record.reportingChecklist,record.treatment,record.evidenceBoundary,record.definitionBoundary]) +
    gallery +
    renderLibrarySection('参考资料与内容依据',[record.refs,record.references,record.source]);
  $('#diseaseLibraryDialog').showModal();
}
function renderDiseaseLibrary() {
  const target = $('#diseaseLibraryResults');
  const status = $('#diseaseLibraryStatus');
  if (!target || !status) return;
  status.textContent = '正在加载授权分类内容…';
  loadAuthorizedDiseaseManifest().then(function(manifest) {
    const systemSelect = $('#diseaseLibrarySystem');
    if (!systemSelect.options.length) {
      systemSelect.innerHTML = manifest.systems.map(function(system) { return '<option value="' + esc(system.key) + '">' + esc(system.name) + '（' + system.recordCount + '）</option>'; }).join('');
      systemSelect.value = diseaseLibrarySystem;
    }
    const systemNav = $('#diseaseLibrarySystems');
    systemNav.innerHTML = manifest.systems.map(function(system) {
      return '<button class="disease-library-system' + (system.key === diseaseLibrarySystem ? ' active' : '') + '" data-library-system-key="' + esc(system.key) + '"><b>' + esc(system.name) + '</b><small>' + system.recordCount + ' 项</small></button>';
    }).join('');
    var coveredTotal = manifest.totals.coveredRecords;
    if (!Number.isFinite(coveredTotal)) coveredTotal = manifest.systems.reduce(function (sum, item) { return sum + (item.coveredRecordCount || 0); }, 0);
    $('#diseaseLibraryOverview').innerHTML = '<div><strong>' + manifest.totals.records + '</strong><span>疾病条目</span></div><div><strong>' + manifest.totals.categories + '</strong><span>专业分类</span></div><div><strong>' + coveredTotal + '</strong><span>已有配图</span></div>';
    return loadAuthorizedDiseaseLibrary(diseaseLibrarySystem).then(function(data) { return { manifest:manifest, data:data }; });
  }).then(function(result) {
    const manifest = result.manifest, data = result.data;
    const categorySelect = $('#diseaseLibraryCategory');
    const groupSelect = $('#diseaseLibraryGroup');
    if (categorySelect.dataset.system !== data.key) {
      categorySelect.dataset.system = data.key;
      setLibraryOptions(categorySelect,data.categories,'all','全部分类');
      setLibraryOptions(groupSelect,[],'all','全部疾病组');
    }
    const selectedCategory = data.categories.find(function(item) { return item.id === categorySelect.value; });
    const availableGroups = selectedCategory ? selectedCategory.groups : data.categories.reduce(function(all,item) { return all.concat(item.groups || []); },[]);
    const groupSignature = data.key + ':' + categorySelect.value;
    if (groupSelect.dataset.scope !== groupSignature) {
      const previousGroup = groupSelect.value;
      groupSelect.dataset.scope = groupSignature;
      setLibraryOptions(groupSelect,availableGroups,previousGroup,'全部疾病组');
    }
    const query = $('#diseaseLibrarySearch').value.trim().toLocaleLowerCase();
    const categoryId = categorySelect.value, groupId = groupSelect.value;
    const matches = data.records.filter(function(record) {
      if (!record._searchText) record._searchText = JSON.stringify(record).toLocaleLowerCase();
      return (categoryId === 'all' || record.categoryId === categoryId) && (groupId === 'all' || record.groupId === groupId) && (!query || record._searchText.includes(query));
    }).map(function(record,index) {
      return { record:record, index:index };
    }).sort(function(a,b) {
      const aHasImages = Array.isArray(a.record.images) && a.record.images.length > 0;
      const bHasImages = Array.isArray(b.record.images) && b.record.images.length > 0;
      return Number(bHasImages) - Number(aHasImages) || a.index - b.index;
    }).map(function(item) {
      return item.record;
    });
    const shown = matches.slice(0,diseaseLibraryLimit);
    const selectedGroup = availableGroups.find(function(item) { return item.id === groupId; });
    $('#diseaseLibraryTrail').innerHTML = '<span>' + esc(data.system) + '</span><b>›</b><span>' + esc(selectedCategory ? selectedCategory.name : '全部分类') + '</span><b>›</b><span>' + esc(selectedGroup ? selectedGroup.name : '全部疾病组') + '</span>';
    const covered = data.coveredRecordCount == null ? data.records.filter(function(record) { return record.images && record.images.length; }).length : data.coveredRecordCount;
    status.textContent = data.system + '共 ' + data.categoryCount + ' 个分类、' + data.recordCount + ' 个疾病条目，其中 ' + covered + ' 项已有病例配图（' + data.imageCount + ' 张）；当前匹配 ' + matches.length + ' 项，已按配图优先排列。全库共 ' + manifest.totals.records + ' 项。';
    target.innerHTML = shown.map(function(record,index) {
      const images = Array.isArray(record.images) ? record.images : [];
      const imageLoading = index < 12 ? 'eager' : 'lazy';
      const imagePriority = index < 4 ? ' fetchpriority="high"' : '';
      const media = images.length ? '<div class="disease-library-media"><img class="disease-library-preview" loading="' + imageLoading + '"' + imagePriority + ' src="' + esc(images[0].src) + '" alt="' + esc(images[0].caption || images[0].type || record.name) + '"></div>' : '<div class="disease-library-placeholder"><b>' + esc((record.name || '影').slice(0,1)) + '</b><span>影像待核验补充</span></div>';
      return '<article class="disease-library-card">' + media + '<div class="disease-library-copy"><span>' + esc(record.category) + ' · ' + esc(record.groupName || '未分组') + '</span><h2>' + esc(record.name) + '</h2>' + (record.nameEn ? '<p>' + esc(record.nameEn) + '</p>' : '') + '<p class="disease-library-brief">' + esc(librarySummary(record)) + '</p></div><small>' + (images.length ? '已核验病例影像 · ' + images.length + ' 张' : '完整诊断知识条目') + '</small><button class="soft-button disease-library-open" data-library-record="' + esc(record.id) + '">打开诊断卡片</button></article>';
    }).join('') || '<div class="empty-state"><b>没有符合条件的疾病</b><p>尝试缩短关键词，或切换系统、分类和疾病组。</p></div>';
    $('#loadMoreDiseaseLibrary').hidden = shown.length >= matches.length;
  }).catch(function(error) {
    status.textContent = '授权分类内容加载失败：' + error.message;
    target.innerHTML = '';
  });
}
function filteredCases() {
  const query = $('#globalSearch').value.trim().toLocaleLowerCase();
  return cases.filter(function(c, i) {
    const searchText = [c.title,c.english,c.system,c.modality,c.history,c.explain,c.differential,c.pearl,c.recall,c.sourceEvidence || '',c.sourceFile || '']
      .concat(c.tags,c.findings,c.tips,c.pitfalls,c.methods.flat()).join(' ').toLocaleLowerCase();
    const modality = $('#modalityFilter').value;
    const level = $('#levelFilter').value;
    const status = $('#statusFilter').value;
    return (atlasSystem === 'all' || c.system === atlasSystem || (atlasSystem === 'favorite' && favorites.includes(c.id))) &&
      (modality === 'all' || c.modality === modality || (modality === 'CT' && ['CTA','CTPA'].includes(c.modality)) || (modality === 'MRI' && c.modality === 'MRA')) &&
      (level === 'all' || c.level === level) &&
      (status === 'all' || (status === 'completed' && completed.includes(c.id)) ||
        (status === 'unanswered' && !completed.includes(c.id)) || (status === 'reviewed' && reviewed.includes(c.id)) || (status === 'mistakes' && isMistake(c))) &&
      (!query || searchText.includes(query));
  });
}
function diagnosisName(c) { return c.title.replace(/\s*·\s*开放病例\s*\d+$/, ''); }
function redactDiagnosis(c,text) {
  const terms = [diagnosisName(c),c.options[c.answer],c.english].filter(Boolean).sort(function(a,b) { return b.length-a.length; });
  return terms.reduce(function(result,term) {
    return result.split(term).join('目标病变');
  },String(text));
}
function hintFor(c,level) {
  const levelOpeners = {
    student:'先不要命名疾病，按解剖位置和基本影像特征组织观察。',
    resident:'先建立影像表型，再用支持征象和反对征象缩小诊断范围。',
    advanced:'同时考虑最可能诊断、危险替代诊断和下一步验证方式。'
  };
  if (level === 1) return levelOpeners[learnerLevel] + ' 当前检查为 ' + c.modality + '，请先完成“' + redactDiagnosis(c,c.methods[0][0]) + '”。';
  if (level === 2) return '聚焦路径：' + redactDiagnosis(c,c.methods[0][1]) + ' 写下至少一个阳性征象和一个需要主动排除的征象。';
  return '进阶线索：' + redactDiagnosis(c,c.tips[0]) + ' 易错提醒：' + redactDiagnosis(c,c.pitfalls[0]) + ' 这一提示可能明显缩小答案范围。';
}
function renderHintPanel(c) {
  const used = session.hints[c.id] || 0;
  $('#hintUsage').textContent = used ? '已使用 ' + used + ' / 3 级' : '尚未使用提示';
  $('#requestHint').textContent = used >= 3 ? '已显示全部提示' : '获取第 ' + (used + 1) + ' 级提示';
  $('#requestHint').disabled = used >= 3 || session.mode === 'study';
  $('#requestHint').hidden = session.mode === 'study';
  $('#hintPanel').hidden = used === 0;
  $('#hintPanel').innerHTML = used ? Array.from({length:used},function(_,index) {
    return '<p><b>提示 ' + (index + 1) + '</b>' + esc(hintFor(c,index + 1)) + '</p>';
  }).join('') : '';
}
function requestHint() {
  const c = currentCase(), used = session.hints[c.id] || 0;
  if (session.mode !== 'quiz' || used >= 3) return;
  session.hints[c.id] = used + 1;
  persistSession();
  recordLearningEvent('hint_requested',c,{hintLevel:used + 1});
  renderHintPanel(c);
  updateStats();
}
function currentReasoningDraft(c) {
  return reasoningDrafts[c.id] || (reasoningDrafts[c.id] = {responses:['','',''],completedAt:null,eventRecorded:false});
}
function reasoningPrompts(c) {
  const firstMethod = c.methods[0] || ['系统定位','先确认异常所在的解剖区域。'];
  return [
    {
      label:'定位',
      question:'先不命名疾病：在这例 ' + c.modality + ' 影像中，异常位于哪里？请写明侧别、器官或解剖分区。',
      placeholder:'例如：左侧、某叶/节段、骨端或关节面……',
      reference:redactDiagnosis(c,firstMethod[0] + '：' + firstMethod[1])
    },
    {
      label:'表型',
      question:'哪些影像特征最有区分度？至少写出两个，并说明形态、密度/信号或分布。',
      placeholder:'征象 1……；征象 2……；伴随征象……',
      reference:c.findings.slice(0,3).join('；')
    },
    {
      label:'鉴别',
      question:'写出一个最需要排除的替代诊断，并说明支持它和反对它的依据。',
      placeholder:'替代诊断……；支持点……；反对点……',
      reference:c.differential + ' 易错提醒：' + c.pitfalls[0]
    }
  ];
}
function reasoningCompletedCount(draft) {
  return draft.responses.filter(function(response) { return response.trim().length >= 6; }).length;
}
function renderReasoningCoach(c) {
  const prompts = reasoningPrompts(c), draft = currentReasoningDraft(c), prompt = prompts[reasoningPromptIndex];
  const count = reasoningCompletedCount(draft), reveal = mayRevealCase(c);
  $('#reasoningCoach').innerHTML = '<div class="coach-head"><div><span>病例专属追问</span><b>先推理，再看参考路径</b></div><strong id="reasoningProgress">' + count + ' / 3</strong></div>' +
    '<div class="coach-tabs" role="tablist" aria-label="推理检查点">' + prompts.map(function(item,index) {
      const filled = draft.responses[index].trim().length >= 6;
      return '<button role="tab" data-reasoning-prompt="' + index + '" aria-selected="' + (index === reasoningPromptIndex) + '"' + (filled ? ' class="filled"' : '') + '><span>' + (filled ? '✓' : '0' + (index + 1)) + '</span>' + esc(item.label) + '</button>';
    }).join('') + '</div>' +
    '<label for="reasoningResponse"><span>' + esc(prompt.label) + '追问</span>' + esc(prompt.question) + '<textarea id="reasoningResponse" maxlength="4000" placeholder="' + esc(prompt.placeholder) + '">' + esc(draft.responses[reasoningPromptIndex]) + '</textarea></label>' +
    (reveal ? '<div class="coach-reference"><b>本例参考路径</b><p>' + esc(prompt.reference) + '</p><small>用于逐项核对，不是自动判分。</small></div>' : '<p class="coach-locked">提交诊断判断后显示本例参考路径；当前内容只保存在本机。</p>') +
    '<div class="coach-actions"><button class="soft-button" data-coach-move="-1"' + (reasoningPromptIndex === 0 ? ' disabled' : '') + '>上一问</button>' +
    (reasoningPromptIndex < 2 ? '<button class="soft-button" data-coach-move="1">下一问</button>' : '<button class="soft-button" id="completeReasoning"' + (count < 3 ? ' disabled' : '') + '>' + (draft.completedAt ? '✓ 已完成检查点' : '完成推理检查点') + '</button>') + '</div>';
}
function saveReasoningResponse(c,value) {
  const draft = currentReasoningDraft(c);
  draft.responses[reasoningPromptIndex] = value.slice(0,4000);
  if (reasoningCompletedCount(draft) < 3) draft.completedAt = null;
  save(stablePrefix + '-reasoning-' + c.id,draft);
  const progress = $('#reasoningProgress');
  if (progress) progress.textContent = reasoningCompletedCount(draft) + ' / 3';
  const completeButton = $('#completeReasoning');
  if (completeButton) completeButton.disabled = reasoningCompletedCount(draft) < 3;
}
function completeReasoningCheckpoint() {
  const c = currentCase(), draft = currentReasoningDraft(c);
  if (reasoningCompletedCount(draft) < 3) return;
  draft.completedAt = new Date().toISOString();
  if (!draft.eventRecorded) {
    draft.eventRecorded = true;
    recordLearningEvent('reasoning_checkpoint_completed',c,{checkpointCount:3});
  }
  save(stablePrefix + '-reasoning-' + c.id,draft);
  renderReasoningCoach(c);
  updateStats();
}
function relatedCases(c) {
  const ownDiagnosis = diagnosisName(c);
  return cases.filter(function(item) { return item.id !== c.id && item.sourceUrl !== c.sourceUrl; }).map(function(item) {
    const sharedTags = (c.tags || []).filter(function(tag) { return (item.tags || []).includes(tag); }).length;
    const sameDiagnosis = diagnosisName(item) === ownDiagnosis;
    const score = (sameDiagnosis ? 100 : 0) + (item.system === c.system ? 18 : 0) + sharedTags * 12 + (item.modality !== c.modality ? 3 : 0);
    return {item:item,score:score,sameDiagnosis:sameDiagnosis};
  }).filter(function(entry) { return entry.sameDiagnosis || entry.score >= 30; }).sort(function(a,b) {
    return b.score - a.score || cases.indexOf(a.item) - cases.indexOf(b.item);
  }).slice(0,5).map(function(entry) { return entry.item; });
}
function comparisonFigure(c, label) {
  return '<img src="' + esc(c.image) + '" alt="' + esc(label + '：' + c.title) + '"><figcaption><b>' + esc(label) + '</b><span>' + esc(c.title) + '</span><small>' + esc(c.modality + ' · ' + c.system) + '</small><a href="' + esc(c.sourceUrl) + '" target="_blank" rel="noopener">查看独立来源 ↗</a></figcaption>';
}
function showComparison(id, selectedId) {
  const primary = byId.get(id), related = primary ? relatedCases(primary) : [];
  if (!primary || !related.length) { notify('本例暂时没有合适的同主题对照影像。'); return; }
  comparePrimaryId = primary.id;
  compareSecondaryId = related.some(function(c) { return c.id === selectedId; }) ? selectedId : related[0].id;
  const secondary = byId.get(compareSecondaryId);
  $('#comparePrimary').innerHTML = comparisonFigure(primary,'当前病例');
  $('#compareSecondary').innerHTML = comparisonFigure(secondary,'对照病例');
  $('#compareChoices').innerHTML = related.map(function(c) {
    return '<button data-compare-choice="' + esc(c.id) + '" aria-pressed="' + (c.id === secondary.id) + '"><img src="' + esc(thumbFor(c)) + '" alt=""><span>' + esc(c.title) + '</span><small>' + esc(c.modality) + '</small></button>';
  }).join('');
  if (!$('#compareDialog').open) $('#compareDialog').showModal();
}
function setReasoningStep(step) {
  if (!['findings','diagnosis','report'].includes(step)) return;
  reasoningStep = step;
  $$('[data-reasoning-step]').forEach(function(button) {
    const active = button.dataset.reasoningStep === step;
    button.setAttribute('aria-selected',active);
    button.tabIndex = active ? 0 : -1;
  });
  $('#findingsPane').hidden = step !== 'findings';
  $('#diagnosisPane').hidden = step !== 'diagnosis';
  $('#reportPane').hidden = step !== 'report';
  $('#caseQuestion').textContent = step === 'findings' ? '你观察到了什么？' : step === 'diagnosis' ?
    (session.mode === 'study' ? '诊断与记忆要点' : '最可能的诊断是什么？') : '写一份可复核的影像报告';
}
function saveFindingDraft() {
  const c = currentCase(), value = $('#findingDraft').value.slice(0,20000);
  findingDrafts[c.id] = value;
  try {
    if (value.trim()) localStorage.setItem(stablePrefix + '-finding-' + c.id,value);
    else localStorage.removeItem(stablePrefix + '-finding-' + c.id);
    $('#findingSaved').textContent = '已保存';
  } catch { $('#findingSaved').textContent = '仅当前页面保留'; }
}
function currentReportDraft() {
  const c = currentCase();
  return reportDrafts[c.id] || (reportDrafts[c.id] = {location:'',findings:'',impression:'',advice:'',score:null});
}
function mayRevealCase(c) { return session.mode === 'study' || hasAnswer(c); }
function collectReportDraft() {
  const draft = currentReportDraft();
  draft.location = $('#reportLocation').value.slice(0,2000);
  draft.findings = $('#reportFindings').value.slice(0,20000);
  draft.impression = $('#reportImpression').value.slice(0,10000);
  draft.advice = $('#reportAdvice').value.slice(0,10000);
  return draft;
}
function saveReportDraft() {
  const c = currentCase(), draft = collectReportDraft();
  draft.score = null;
  save(stablePrefix + '-report-' + c.id,draft);
  $('#reportFeedback').className = 'report-feedback';
  $('#reportFeedback').innerHTML = '';
  $('#reportReference').hidden = true;
  $('#reportReference').innerHTML = '';
  updateStats();
}
function reportDiagnosisMatched(c, impression) {
  const normalized = impression.replace(/[\s·（）()、，。:：/\-]/g,'').toLocaleLowerCase();
  const candidates = [diagnosisName(c),c.options[c.answer]].concat(c.tags || []).map(function(term) {
    return String(term).replace(/开放病例\d+|影像表现|表现|征象|胸片|x线|ct|mri|超声/gi,'').replace(/[\s·（）()、，。:：/\-]/g,'').toLocaleLowerCase();
  }).filter(function(term) { return term.length >= 2; }).sort(function(a,b) { return b.length-a.length; });
  return candidates.some(function(term) { return normalized.includes(term) || (term.length >= 5 && normalized.includes(term.slice(0,4))); });
}
function scoreCurrentReport() {
  const c = currentCase(), draft = collectReportDraft(), checks = [];
  let score = 0;
  function award(ok, points, label) { if (ok) score += points; checks.push((ok ? '✓ ' : '○ ') + label + '（' + points + '分）'); }
  award(draft.location.trim().length >= 4,15,'病灶定位明确');
  award(draft.findings.trim().length >= 25,25,'影像所见达到基本描述长度');
  award(draft.impression.trim().length >= 4,15,'填写诊断印象');
  award(reportDiagnosisMatched(c,draft.impression),20,'命中参考诊断名称或核心术语');
  award(draft.advice.trim().length >= 6,10,'给出下一步建议');
  award(/鉴别|考虑|不除外|可能|建议|结合/.test(draft.impression + draft.advice),10,'包含鉴别或条件化表达');
  award((findingDrafts[c.id] || '').trim().length >= 12,5,'先完成独立所见草稿');
  draft.score = score;
  save(stablePrefix + '-report-' + c.id,draft);
  $('#reportFeedback').className = 'report-feedback ' + (score >= 80 ? 'strong' : score >= 55 ? 'partial' : 'weak');
  const reveal = mayRevealCase(c);
  $('#reportFeedback').innerHTML = '<strong>结构与参考命中度 ' + score + ' / 100</strong><ul>' + checks.map(function(item) { return '<li>' + esc(item) + '</li>'; }).join('') + '</ul><small>此分数不理解同义词，也不评价医学正确性。' + (reveal ? '请继续与参考报告逐项核对。' : '提交诊断判断后才能查看参考报告。') + '</small>';
  $('#reportReference').hidden = !reveal;
  $('#reportReference').innerHTML = reveal ? '<h3>核对清单</h3><ul>' + c.findings.map(function(item) { return '<li>' + esc(item) + '</li>'; }).join('') + '</ul><h3>参考表达</h3><blockquote>' + esc(c.report) + '</blockquote>' : '';
  recordLearningEvent('report_scored',c,{score:score});
  updateStats();
}
function loadReportWorkspace(c) {
  const draft = currentReportDraft();
  $('#reportLocation').value = draft.location;
  $('#reportFindings').value = draft.findings;
  $('#reportImpression').value = draft.impression;
  $('#reportAdvice').value = draft.advice;
  if (draft.score === null) {
    $('#reportFeedback').className = 'report-feedback';
    $('#reportFeedback').innerHTML = '';
    $('#reportReference').hidden = true;
    $('#reportReference').innerHTML = '';
  } else {
    $('#reportFeedback').className = 'report-feedback ' + (draft.score >= 80 ? 'strong' : draft.score >= 55 ? 'partial' : 'weak');
    $('#reportFeedback').innerHTML = '<strong>上次结构与参考命中度 ' + draft.score + ' / 100</strong><small>修改后可重新检查；分数不代表医学正确性。</small>';
    const reveal = mayRevealCase(c);
    $('#reportReference').hidden = !reveal;
    $('#reportReference').innerHTML = reveal ? '<h3>核对清单</h3><ul>' + c.findings.map(function(item) { return '<li>' + esc(item) + '</li>'; }).join('') + '</ul><h3>参考表达</h3><blockquote>' + esc(c.report) + '</blockquote>' : '';
  }
}
function thumbFor(c) {
  const filename = c.image.split('/').pop().replace(/\.[^.]+$/, '.webp');
  return 'assets/thumbnails/' + (c.image.includes('/expanded/') ? 'expanded/' : '') + filename;
}
function tags(c) { return '<div class="case-tags">' + c.tags.map(function(t) { return '<span>' + esc(t) + '</span>'; }).join('') + '</div>'; }
function renderCases() {
  const list = filteredCases();
  const visible = list.slice(0, atlasLimit);
  $('#caseTotal').textContent = cases.length;
  $('#filterCount').textContent = '显示 ' + visible.length + ' / ' + list.length + ' 例 · 全库 ' + cases.length + ' 例';
  $('#studyFiltered').disabled = $('#quizFiltered').disabled = list.length === 0;
  $('#loadMoreCases').hidden = visible.length >= list.length;
  $('#caseList').innerHTML = visible.map(function(c) {
    const i = cases.indexOf(c), isFav = favorites.includes(c.id);
    return '<article class="atlas-card" data-id="' + c.id + '">' +
      '<a href="?view=caseDetail&amp;caseId=' + encodeURIComponent(c.id) + '" data-detail="' + c.id + '" class="atlas-photo" aria-label="查看' + esc(c.title) + '详情">' +
      '<img src="' + thumbFor(c) + '" alt="' + esc(c.title) + '" loading="lazy" decoding="async"><span>' + esc(c.modality) + '</span></a>' +
      '<div class="atlas-card-body"><div class="atlas-card-meta"><span>' + c.system + ' · ' + c.level + '</span>' +
      '<button class="bookmark" data-favorite="' + c.id + '" aria-label="' + (isFav ? '取消收藏' : '收藏') + esc(c.title) + '" aria-pressed="' + isFav + '">' + (isFav ? '★' : '☆') + '</button></div>' +
      '<h2><a href="?view=caseDetail&amp;caseId=' + encodeURIComponent(c.id) + '" data-detail="' + c.id + '">' + esc(c.title) + '</a></h2><p class="english-name">' + esc(c.english) + '</p>' +
      tags(c) + '<p class="atlas-clue"><b>诊断要点</b>' + esc(c.recall) + '</p>' +
      '<div class="case-status">' + (completed.includes(c.id) ? '<span>已答题</span>' : '<span>未答题</span>') + (reviewed.includes(c.id) ? '<span>已背题</span>' : '') + (isMistake(c) ? '<span class="needs-review">待复习错题</span>' : '') + '</div>' +
      '<div class="card-buttons"><button class="soft-button" data-detail="' + c.id + '">诊断方法与详情</button><button class="soft-button" data-study="' + c.id + '">背题</button><button class="soft-button" data-quiz="' + c.id + '">答题</button></div></div></article>';
  }).join('') || '<div class="empty-state"><b>没有符合条件的病例</b><p>试着减少筛选条件，或搜索另一种征象。</p><button class="soft-button" data-clear>重置筛选</button></div>';
}
function ohifUrl(study) {
  const url = new URL('https://viewer.ohif.org/viewer/dicomwebproxy');
  url.searchParams.set('url', new URL('idc-dicomweb.json', location.href).href);
  // The dynamic dicomwebproxy route uses a lower-case initial, unlike OHIF's
  // regular viewer route. Keep this exact spelling or the proxy drops the UID.
  url.searchParams.set('studyInstanceUIDs', study.uid);
  return url.href;
}
window.medicalImagingOhifUrl = ohifUrl;
function renderDicomStudies() {
  const studies = DICOM_STUDIES.filter(function(study) { return dicomSystem === 'all' || study.system === dicomSystem; });
  $('#dicomList').innerHTML = studies.map(function(study) {
    return '<article class="dicom-card"><div class="dicom-card-top"><span>' + esc(study.system) + '</span><b>' + esc(study.modality) + '</b></div>' +
      '<h2>' + esc(study.title) + '</h2><p>IDC 集合 <code>' + esc(study.collection) + '</code></p>' +
      '<dl><div><dt>匿名编号</dt><dd>' + esc(study.subject) + '</dd></div><div><dt>解剖范围</dt><dd>' + esc(study.body) + '</dd></div><div><dt>检查体积</dt><dd>约 ' + study.size + ' MB</dd></div></dl>' +
      '<div class="dicom-links"><button class="primary" data-dicom-open="' + esc(study.uid) + '">站内打开序列</button><a href="' + esc(ohifUrl(study)) + '" target="_blank" rel="noopener">OHIF 备用 ↗</a><a href="https://doi.org/' + esc(study.doi) + '" target="_blank" rel="noopener">数据集 DOI</a></div>' +
      '<small>' + esc(study.license) + ' · Study UID 已核对</small></article>';
  }).join('');
}
const licenseLinks = {'CC BY-SA 2.0':'https://creativecommons.org/licenses/by-sa/2.0/','CC BY-SA 2.5':'https://creativecommons.org/licenses/by-sa/2.5/','CC BY-SA 3.0':'https://creativecommons.org/licenses/by-sa/3.0/','CC BY-SA 4.0':'https://creativecommons.org/licenses/by-sa/4.0/','CC BY 2.0':'https://creativecommons.org/licenses/by/2.0/','CC BY 2.5':'https://creativecommons.org/licenses/by/2.5/','CC BY 3.0':'https://creativecommons.org/licenses/by/3.0/','CC BY 4.0':'https://creativecommons.org/licenses/by/4.0/','CC0':'https://creativecommons.org/publicdomain/zero/1.0/','Public domain':'https://commons.wikimedia.org/wiki/Commons:Public_domain'};
function creditHTML(c) {
  const licenseUrl = c.licenseUrl || licenseLinks[c.license] || c.sourceUrl;
  return '<a href="' + c.sourceUrl + '" target="_blank" rel="noopener">' + esc(c.source) + ' ↗</a><a href="' + licenseUrl + '" target="_blank" rel="noopener">' + esc(c.license) + '</a>';
}
function packageSealHTML(c) {
  const record = packageById.get(c.id);
  if (!record) return '<div class="package-seal invalid"><b>病例包缺失</b><span>该病例未进入版本化完整性清单</span></div>';
  return '<div class="package-seal"><b>病例包 v' + esc(record.schemaVersion) + '</b><span>内容版本 ' + esc(record.contentVersion) + ' · SHA-256 <code title="' + esc(record.packageSha256) + '">' + esc(record.packageSha256.slice(0,12)) + '…</code></span><small>指纹同时覆盖病例内容、教学计划和本地影像文件；医学审校状态单独记录，不由哈希代替。</small></div>';
}
function knowledgeHTML(c) {
  const list = function(items) { return '<ul>' + items.map(function(t) { return '<li>' + esc(t) + '</li>'; }).join('') + '</ul>'; };
  const review = MEDICAL_REVIEWS[c.id];
  const reviewState = review && review.status === 'approved' ? '<div class="review-state approved"><b>医学已审</b><span>' + esc(review.reviewer) + ' · ' + esc(review.credentials) + ' · ' + esc(review.reviewedAt) + ' · ' + esc(review.contentVersion) + '</span></div>' : '<div class="review-state source-verified"><b>' + (c.sourceEvidence ? '来源核验完成' : '基础教学病例') + '</b><span>放射科医师逐例审校：待完成</span></div>';
  const evidence = c.sourceEvidence ? '<section class="source-evidence"><h3>00 · 本图独立证据与审校状态</h3>' + reviewState + packageSealHTML(c) + '<dl><div><dt>原始文件</dt><dd>' + esc(c.sourceFile) + '</dd></div><div><dt>本图来源说明</dt><dd lang="en">' + esc(c.sourceEvidence) + '</dd></div><div><dt>图像指纹</dt><dd><code>SHA-1 ' + esc(c.sourceSha1) + '</code></dd></div></dl><p>本图的文件、诊断标签和原文说明均独立保存；通用阅片方法按同病种复用。未提供的信息不会补写为患者事实，完成专家审校前不标记为“医学已审”。</p></section>' : '<section class="source-evidence"><h3>00 · 审校状态</h3>' + reviewState + packageSealHTML(c) + '</section>';
  return '<div class="knowledge">' + evidence +
    '<section><h3>01 · 关键征象与要点</h3>' + list(c.findings) + '<p>' + esc(c.explain) + '</p></section>' +
    '<section><h3>02 · 诊断方法</h3><ol class="method-steps">' + c.methods.map(function(step) { return '<li><h4>' + esc(step[0]) + '</h4><p>' + esc(step[1]) + '</p></li>'; }).join('') + '</ol></section>' +
    '<section><h3>03 · 阅片技巧</h3>' + list(c.tips) + '</section>' +
    '<section><h3>04 · 鉴别诊断与易错点</h3><p>' + esc(c.differential) + '</p>' + list(c.pitfalls) + '</section>' +
    '<section><h3>05 · 报告表达练习</h3><blockquote>' + esc(c.report) + '</blockquote><p class="image-limit">' + esc(c.limitation) + '</p></section>' +
    '<section><h3>06 · 参考资料</h3><ul class="reference-list">' + c.refs.map(function(ref) { return '<li><a href="' + ref[1] + '" target="_blank" rel="noopener">' + esc(ref[0]) + ' ↗</a></li>'; }).join('') + '</ul></section></div>';
}
function showDetail(id) {
  const c = byId.get(id);
  if (!c) return;
  detailId = id;
  const i = cases.indexOf(c);
  const comparisonButton = relatedCases(c).length ? '<button class="soft-button" data-compare="' + id + '">同主题影像对照</button>' : '';
  $('#detailContent').innerHTML = '<div class="detail-heading"><span class="eyebrow">' + c.system + ' / ' + c.modality + ' / ' + c.level + '</span><h1>' + esc(c.title) + '</h1><p>' + esc(c.english) + '</p>' + tags(c) + '</div>' +
    '<div class="detail-grid"><div class="detail-visual"><figure><img src="' + c.image + '" alt="' + esc(c.title) + '"><figcaption>' + creditHTML(c) + '<span>保留原图标注，按比例显示。</span></figcaption></figure>' +
    '<div class="detail-actions"><button class="primary" data-study="' + id + '">背诵本例</button><button class="soft-button" data-quiz="' + id + '">练习本例</button>' + comparisonButton + '<button class="soft-button" data-favorite="' + id + '" aria-pressed="' + favorites.includes(c.id) + '">' + (favorites.includes(c.id) ? '★ 已收藏' : '☆ 收藏') + '</button></div>' +
    '<div class="panel context-panel"><h3>' + (c.sourceEvidence ? '病例信息边界' : '教学情境') + '</h3><p>' + esc(c.history) + '</p><small>' + (c.sourceEvidence ? '不虚构患者病史；来源原文在右侧“来源核验”中展示。' : '情境为教学编写，不代表原图患者病史。') + '</small></div>' +
    '<div class="memory-line"><span>回忆线索</span><p>' + esc(c.recall) + '</p></div></div>' +
    '<div class="detail-knowledge">' + knowledgeHTML(c) + '</div></div>' +
    '<div class="detail-pagination"><button class="soft-button" data-detail="' + ids[Math.max(0, i-1)] + '"' + (i === 0 ? ' disabled' : '') + '>← 上一病例</button><span>' + (i+1) + ' / ' + cases.length + '</span><button class="soft-button" data-detail="' + ids[Math.min(ids.length-1, i+1)] + '"' + (i === ids.length-1 ? ' disabled' : '') + '>下一病例 →</button></div>';
  showView('caseDetail');
}
function shuffle(array) {
  const result = array.slice();
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i],result[j]] = [result[j],result[i]];
  }
  return result;
}
function sample(array, count) { return shuffle(array).slice(0, Math.min(count, array.length)); }
function localDateKey(date) {
  const value = date || new Date();
  const local = new Date(value.getTime() - value.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0,10);
}
function addLocalDays(dateKey, days) {
  const date = new Date(dateKey + 'T12:00:00');
  date.setDate(date.getDate() + days);
  return localDateKey(date);
}
function scheduleReview(c, isCorrect) {
  const previous = reviewPlan[c.id] || {streak:0,intervalDays:0,dueDate:localDateKey()};
  const intervals = [1,3,7,14,30];
  const streak = isCorrect ? previous.streak + 1 : 0;
  const intervalDays = isCorrect ? intervals[Math.min(streak - 1,intervals.length - 1)] : 0;
  reviewPlan[c.id] = {streak:streak,intervalDays:intervalDays,dueDate:addLocalDays(localDateKey(),intervalDays)};
  save(reviewPlanKey,reviewPlan);
}
function dueReviewQueue() {
  const today = localDateKey();
  return Object.keys(reviewPlan).filter(function(id) { return reviewPlan[id].dueDate <= today && byId.has(id); }).sort(function(a,b) {
    const left = reviewPlan[a], right = reviewPlan[b];
    return Number(isMistake(byId.get(b))) - Number(isMistake(byId.get(a))) || left.dueDate.localeCompare(right.dueDate) || a.localeCompare(b);
  });
}
function reviewDueLabel(record) {
  const today = localDateKey(), tomorrow = addLocalDays(today,1);
  if (record.dueDate < today) return '已到期';
  if (record.dueDate === today) return '今日到期';
  if (record.dueDate === tomorrow) return '明日复习';
  return record.dueDate + ' 复习';
}
function renderReviewPlan() {
  const records = Object.entries(reviewPlan).filter(function(entry) { return byId.has(entry[0]); }).map(function(entry) { return {id:entry[0],record:entry[1],case:byId.get(entry[0])}; });
  const today = localDateKey(), inSevenDays = addLocalDays(today,7), due = dueReviewQueue();
  $('#dueReviewCount').textContent = due.length;
  $('#upcomingReviewCount').textContent = records.filter(function(item) { return item.record.dueDate > today && item.record.dueDate <= inSevenDays; }).length;
  $('#stableReviewCount').textContent = records.filter(function(item) { return item.record.intervalDays >= 14; }).length;
  $('#studyDueReviews').disabled = $('#startDueReviews').disabled = due.length === 0;
  const ordered = records.sort(function(a,b) { return a.record.dueDate.localeCompare(b.record.dueDate) || b.record.intervalDays - a.record.intervalDays || a.id.localeCompare(b.id); });
  if (!ordered.length) {
    $('#reviewPlanList').innerHTML = '<div class="review-plan-empty"><b>尚未生成复习计划</b><span>从下一次答题开始建立计划；已有旧版答题记录不会被倒推成虚假的复习日期。</span></div>';
    return;
  }
  $('#reviewPlanList').innerHTML = ordered.slice(0,6).map(function(item) {
    const status = isMistake(item.case) ? '最近答错' : reviewDueLabel(item.record);
    return '<article class="review-plan-item"><div><span>' + esc(item.case.system) + ' · ' + esc(item.case.modality) + '</span><h3>' + esc(diagnosisName(item.case)) + '</h3><p>连续答对 ' + item.record.streak + ' 次 · 当前间隔 ' + item.record.intervalDays + ' 天</p></div><b class="' + (item.record.dueDate <= today ? 'due-now' : '') + '">' + esc(status) + '</b></article>';
  }).join('');
}
function firstAnswerEventsByCase() {
  return learningEvents.filter(function(event) { return event.type === 'answer_submitted' && typeof event.correct === 'boolean'; }).reduce(function(result,event) {
    const existing = result[event.caseId];
    if (!existing || event.createdAt < existing.createdAt) result[event.caseId] = event;
    return result;
  },{});
}
function renderSystemPerformance() {
  const firstAnswers = firstAnswerEventsByCase();
  const systems = ['胸部','神经','腹部','骨骼'];
  $('#systemPerformance').innerHTML = systems.map(function(system) {
    const systemCases = cases.filter(function(c) { return c.system === system; });
    const initial = systemCases.map(function(c) { return firstAnswers[c.id]; }).filter(Boolean);
    const initialCorrect = initial.filter(function(event) { return event.correct; }).length;
    const currentMistakes = systemCases.filter(isMistake);
    const accuracy = initial.length ? Math.round(initialCorrect / initial.length * 100) + '%' : '—';
    const evidence = initial.length ? '首答正确 ' + initialCorrect + ' / ' + initial.length + ' · 当前错题 ' + currentMistakes.length : '暂无逐题首答记录';
    return '<article class="system-performance-item"><div><span>' + esc(system) + '影像</span><h3>' + accuracy + '</h3><p>' + esc(evidence) + '</p></div><button class="soft-button" data-system-mistakes="' + esc(system) + '"' + (currentMistakes.length ? '' : ' disabled') + '>复习当前错题</button></article>';
  }).join('');
}
function startSystemMistakes(system) {
  const queue = cases.filter(function(c) { return c.system === system && isMistake(c); }).map(function(c) { return c.id; });
  if (!queue.length) { notify('该系统当前没有待复习错题。'); return; }
  startTraining(queue,'quiz','custom');
}
let prescriptionGroups = [];
function hintCountsByCase() {
  return learningEvents.filter(function(event) { return event.type === 'hint_requested'; }).reduce(function(result,event) {
    result[event.caseId] = (result[event.caseId] || 0) + 1;
    return result;
  },{});
}
function prescriptionSignal(c, hintCounts) {
  const attempt = attempts[c.id];
  if (!attempt || !attempt.count) return {score:0,reasons:[]};
  const reasons = [];
  let score = 0;
  if (attempt.lastAnswer !== c.answer) { score += 8; reasons.push('最近答错'); }
  if (attempt.wrong > 0) { score += Math.min(attempt.wrong,3) * 2; reasons.push('历史答错 ' + attempt.wrong + ' 次'); }
  const hintCount = hintCounts[c.id] || 0;
  if (hintCount >= 2) { score += 2; reasons.push('使用 ' + hintCount + ' 次提示'); }
  const report = reportDrafts[c.id];
  if (report && Number.isFinite(report.score) && report.score < 55) { score += 1; reasons.push('报告结构分 ' + report.score + ' 分'); }
  const reasoning = reasoningDrafts[c.id];
  if (!reasoning || !reasoning.completedAt) { score += 1; reasons.push('推理追问未完成'); }
  return {score:score,reasons:reasons};
}
function buildPrescription() {
  const hintCounts = hintCountsByCase();
  const signals = cases.map(function(c) { return Object.assign({case:c},prescriptionSignal(c,hintCounts)); }).filter(function(item) { return item.score > 0; });
  const groupMap = new Map();
  signals.forEach(function(item) {
    const key = item.case.system + '|' + diagnosisName(item.case);
    const group = groupMap.get(key) || {key:key,system:item.case.system,diagnosis:diagnosisName(item.case),items:[],score:0,reasons:new Set()};
    group.items.push(item); group.score += item.score; item.reasons.forEach(function(reason) { group.reasons.add(reason); });
    groupMap.set(key,group);
  });
  prescriptionGroups = Array.from(groupMap.values()).map(function(group) {
    group.items.sort(function(a,b) { return b.score - a.score || a.case.id.localeCompare(b.case.id); });
    group.ids = group.items.map(function(item) { return item.case.id; });
    group.queueIds = group.ids.concat(cases.filter(function(c) {
      return c.system === group.system && diagnosisName(c) === group.diagnosis && !group.ids.includes(c.id);
    }).map(function(c) { return c.id; }));
    group.reasonText = Array.from(group.reasons).slice(0,3).join(' · ');
    return group;
  }).sort(function(a,b) { return b.score - a.score || b.items.length - a.items.length || a.diagnosis.localeCompare(b.diagnosis); });
  const selected = [];
  prescriptionGroups.forEach(function(group) { group.ids.forEach(function(id) { if (!selected.includes(id) && selected.length < 10) selected.push(id); }); });
  prescriptionGroups.forEach(function(group) { group.queueIds.forEach(function(id) { if (!selected.includes(id) && selected.length < 10) selected.push(id); }); });
  prescriptionGroups.forEach(function(group) { cases.filter(function(c) { return c.system === group.system; }).forEach(function(c) {
    if (!selected.includes(c.id) && selected.length < 10) selected.push(c.id);
  }); });
  return {groups:prescriptionGroups,ids:selected};
}
function renderPrescription() {
  const prescription = buildPrescription();
  $('#startPrescription').disabled = prescription.ids.length === 0;
  $('#studyPrescription').disabled = prescription.ids.length === 0;
  if (!prescription.groups.length) {
    $('#prescriptionList').innerHTML = '<div class="prescription-empty"><b>尚无可识别的复习信号</b><span>完成答题后，这里会按真实记录显示建议复习的主题；未开始的病例不会被推断为薄弱项。</span></div>';
    return;
  }
  $('#prescriptionList').innerHTML = prescription.groups.slice(0,6).map(function(group) {
    return '<article class="prescription-item"><div><span class="prescription-system">' + esc(group.system) + '</span><h3>' + esc(group.diagnosis) + '</h3><p>' + esc(group.reasonText) + '</p></div><div><b>' + group.items.length + ' 例需回顾</b><button class="soft-button" data-prescription-topic="' + esc(group.key) + '">练此主题</button></div></article>';
  }).join('');
}
function startPrescription(mode, key) {
  const prescription = buildPrescription();
  const group = key ? prescription.groups.find(function(item) { return item.key === key; }) : null;
  const queue = group ? group.queueIds : prescription.ids;
  if (!queue.length) { notify('完成一些答题后，学习处方才会出现。'); return; }
  startTraining(queue,mode,'custom');
}
function weaknessQueue() {
  return ids.filter(function(id) { return attempts[id] && attempts[id].count; }).sort(function(a,b) {
    const left = attempts[a], right = attempts[b];
    const leftScore = (isMistake(byId.get(a)) ? 1000 : 0) + left.wrong / left.count * 100 + left.wrong * 5;
    const rightScore = (isMistake(byId.get(b)) ? 1000 : 0) + right.wrong / right.count * 100 + right.wrong * 5;
    return rightScore - leftScore;
  }).slice(0,20);
}
function startTraining(queue, mode, order = 'ordered', firstId = null) {
  queue = validIds(queue);
  if (!queue.length) { notify('请先选择至少一个病例。'); return; }
  session.queue = order === 'random' ? shuffle(queue) : queue.slice();
  session.mode = mode;
  session.order = order;
  session.cursor = firstId && session.queue.includes(firstId) ? session.queue.indexOf(firstId) : 0;
  session.answers = {};
  session.hints = {};
  selected = null;
  reasoningStep = mode === 'study' ? 'diagnosis' : 'findings';
  persistSession();
  renderTraining();
  showView('viewer');
}
function startAt(id, mode) {
  const matched = filteredCases().map(function(c) { return c.id; });
  startTraining(matched.includes(id) ? matched : ids, mode, 'ordered', id);
}
function renderTraining() {
  const c = currentCase(), index = cases.indexOf(c);
  reasoningPromptIndex = 0;
  selected = hasAnswer(c) ? session.answers[c.id] : null;
  recallOpen = true;
  $('#sessionSummary').hidden = true;
  $$('.mode-tabs button').forEach(function(b) { b.setAttribute('aria-pressed', b.dataset.mode === session.mode); });
  $('#orderMode').value = session.order;
  $('#learnerLevel').value = learnerLevel;
  $('#reshuffle').hidden = session.order !== 'random';
  $('#queueSummary').textContent = session.queue.length + ' 题 · ' + ({ordered:'题库顺序',random:'随机顺序',custom:'自定义顺序'}[session.order]);
  $('#modeHint').textContent = session.mode === 'study' ?
    '背题：直接阅读诊断、技巧和方法；病例追问同步显示参考路径，可收起答案自测。背题不计入答题正确率。' :
    '答题：先完成定位、表型和鉴别追问，再选择诊断；提交后核对本例参考路径。首次提交计入正确率。';
  $('#viewerModality').textContent = c.modality + ' · ' + c.system;
  $('#caseHistory').textContent = c.history;
  $('#activeScan').alt = '病例 ' + String(index + 1).padStart(2, '0') + ' 教学影像';
  $('#imageError').hidden = true;
  $('#activeScan').src = c.image;
  $('#caseNote').value = notes[c.id] || '';
  $('#findingDraft').value = findingDrafts[c.id] || '';
  $('#findingSaved').textContent = storageAvailable ? '自动保存' : '仅当前页面保留';
  loadReportWorkspace(c);
  renderHintPanel(c);
  $('#noteSaved').textContent = storageAvailable ? '自动保存' : '仅当前页面保留';
  $('#viewerIndex').textContent = '病例编号 ' + String(index + 1).padStart(2,'0');
  $('#queuePosition').textContent = '第 ' + (session.cursor + 1) + ' / ' + session.queue.length + ' 题';
  $('#prevCase').disabled = session.cursor === 0;
  $('#nextCase').textContent = session.cursor === session.queue.length-1 ? '本轮小结' : '下一题 →';
  updateFavorite();
  renderAnswerPanel();
  setReasoningStep(session.mode === 'study' ? 'diagnosis' : reasoningStep);
  resetImage();
  $('.case-panel').scrollTop = 0;
  persistSession();
}
function renderAnswerPanel() {
  const c = currentCase(), study = session.mode === 'study', answered = hasAnswer(c);
  const visible = study ? recallOpen : answered;
  $('#viewerTitle').textContent = visible ? c.title : '病例 ' + String(cases.indexOf(c)+1).padStart(2,'0');
  $('#caseQuestion').textContent = study ? '诊断与记忆要点' : '你观察到了什么？';
  $('#questionBlock').hidden = false;
  $('#questionBlock > b').textContent = study ? '诊断选项 · 阅读对照' : '请选择最可能的诊断';
  $('#jumpCase').innerHTML = session.queue.map(function(id, position) {
    const item = byId.get(id);
    const label = study && recallOpen ? item.title : '病例 ' + String(cases.indexOf(item)+1).padStart(2,'0') + ' · ' + item.system;
    return '<option value="' + position + '">' + (position + 1) + '. ' + esc(label) + '</option>';
  }).join('');
  $('#jumpCase').value = session.cursor;
  $('#submitAnswer').hidden = study || answered;
  $('#toggleRecall').hidden = !study;
  $('#markReviewed').hidden = !study;
  $('#toggleRecall').textContent = recallOpen ? '收起答案，尝试回忆' : '展开答案与解析';
  $('#markReviewed').textContent = reviewed.includes(c.id) ? '✓ 已背 · 取消标记' : '标记已背';
  $('#markReviewed').setAttribute('aria-pressed', reviewed.includes(c.id));
  $('#feedback').className = 'feedback';
  $('#feedback').textContent = '';
  $('#answers').innerHTML = c.options.map(function(option, i) {
    const classes = ['answer'];
    if (!study && selected === i) classes.push('selected');
    if (visible && i === c.answer) classes.push('correct-answer');
    if (!study && answered && selected === i && i !== c.answer) classes.push('wrong-answer');
    return '<button class="' + classes.join(' ') + '" data-answer="' + i + '" aria-pressed="' + (!study && selected === i) + '"' + (answered || study ? ' disabled' : '') + '><span class="answer-letter">' + 'ABCD'[i] + '</span><span>' + esc(option) + '</span></button>';
  }).join('');
  if (!study && answered) {
    const ok = session.answers[c.id] === c.answer;
    $('#feedback').className = 'feedback ' + (ok ? 'correct' : 'wrong');
    $('#feedback').textContent = (ok ? '判断正确。' : '本次选择不正确。') + '参考答案：' + 'ABCD'[c.answer] + ' · ' + c.options[c.answer];
  }
  $('#studyAnswer').innerHTML = study && visible ? '<div class="memory-line"><span>参考诊断 · ' + 'ABCD'[c.answer] + '</span><h3>' + esc(c.title) + '</h3><p>' + esc(c.recall) + '</p></div>' : '';
  $('#learningReveal').innerHTML = visible ? knowledgeHTML(c) : '';
  $('#trainingCredit').innerHTML = visible ? creditHTML(c) : '<span>作答后显示完整图片来源及诊断参考资料。</span>';
  $('#openComparison').hidden = !visible || relatedCases(c).length === 0;
  renderReasoningCoach(c);
  if (currentReportDraft().score !== null) loadReportWorkspace(c);
  const record = attempts[c.id];
  $('#attemptStatus').textContent = record ? '已记录 ' + record.count + ' 次作答 · 错 ' + record.wrong + ' 次 · ' + (isMistake(c) ? '待复习' : '最近答对') : '本例暂无逐题作答记录';
}
function submitAnswer() {
  const c = currentCase();
  if (session.mode !== 'quiz' || hasAnswer(c)) return;
  if (selected === null) {
    $('#feedback').className = 'feedback wrong';
    $('#feedback').textContent = '请先选择一个诊断。';
    return;
  }
  session.answers[c.id] = selected;
  const previous = attempts[c.id] || {count:0,wrong:0};
  attempts[c.id] = {count:previous.count + 1, wrong:previous.wrong + (selected === c.answer ? 0 : 1), lastAnswer:selected};
  save(attemptsKey, attempts);
  scheduleReview(c,selected === c.answer);
  recordLearningEvent('answer_submitted',c,{answerIndex:selected,correct:selected === c.answer,hintsUsed:session.hints[c.id] || 0});
  if (!completed.includes(c.id)) {
    if (selected === c.answer) correct++;
    completed.push(c.id);
    save(stablePrefix + '-completed', completed);
    save(storagePrefix + '-correct', correct);
  }
  persistSession();
  renderAnswerPanel();
  updateStats();
}
function moveQuestion(delta) {
  const next = session.cursor + delta;
  if (next < 0 || next >= session.queue.length) return;
  session.cursor = next;
  reasoningStep = session.mode === 'study' ? 'diagnosis' : 'findings';
  renderTraining();
  updateLocation();
}
function summary() {
  const answered = session.queue.filter(function(id) { return Object.prototype.hasOwnProperty.call(session.answers,id); });
  const right = answered.filter(function(id) { return session.answers[id] === byId.get(id).answer; }).length;
  const learned = session.queue.filter(function(id) { return reviewed.includes(id); }).length;
  $('#sessionSummary').innerHTML = '<h2>本轮学习小结</h2><p>' + (session.mode === 'study' ?
    '本轮选择 ' + session.queue.length + ' 例，其中已标记背诵 ' + learned + ' 例。' :
    '本轮已答 ' + answered.length + ' / ' + session.queue.length + ' 题，正确 ' + right + ' 题，未答 ' + (session.queue.length - answered.length) + ' 题。') +
    '</p><p>可以回到任意题继续学习，也可以重新选择题目。</p><button class="soft-button" data-summary-config>重新选题</button>';
  $('#sessionSummary').hidden = false;
  $('#sessionSummary').scrollIntoView({behavior:'smooth',block:'center'});
}
function updateFavorite() {
  const saved = favorites.includes(currentCase().id);
  $('#favoriteCase').textContent = saved ? '★ 已收藏' : '☆ 收藏';
  $('#favoriteCase').classList.toggle('saved', saved);
  $('#favoriteCase').setAttribute('aria-pressed', saved);
}
function toggleFavorite(id) {
  if (!byId.has(id)) return;
  favorites = favorites.includes(id) ? favorites.filter(function(item) { return item !== id; }) : favorites.concat(id);
  save(stablePrefix + '-favorites', favorites);
  updateFavorite(); updateStats();
  if (currentView === 'cases') renderCases();
  if (currentView === 'caseDetail') showDetail(detailId);
}
function updateStats() {
  $('#solvedCount').textContent = completed.length;
  $('#accuracy').textContent = completed.length ? Math.round(correct / completed.length * 100) + '%' : '—';
  $('#favoriteCount').textContent = favorites.length;
  $('#noteCount').textContent = Object.values(notes).filter(function(s) { return s.trim(); }).length;
  $('#reportCount').textContent = Object.values(reportDrafts).filter(function(draft) {
    return draft && [draft.location,draft.findings,draft.impression,draft.advice].some(function(value) { return value && value.trim(); });
  }).length;
  $('#reasoningCount').textContent = Object.values(reasoningDrafts).filter(function(draft) { return draft && draft.completedAt; }).length;
  $('#hintCount').textContent = learningEvents.filter(function(event) { return event.type === 'hint_requested'; }).length;
  $('#dailyCount').textContent = completed.length;
  $('#sideTotal').textContent = cases.length;
  $('#sideProgress').style.width = (completed.length / cases.length * 100) + '%';
  $('#reviewedCount').textContent = reviewed.length;
  const wrong = mistakeIds();
  $('#wrongCount').textContent = wrong.length;
  $('#everWrongCount').textContent = Object.values(attempts).filter(function(item) { return item.wrong > 0; }).length;
  $('#studyWrong').disabled = $('#reviewWrong').disabled = wrong.length === 0;
  renderReviewPlan();
  renderSystemPerformance();
  renderPrescription();
  $$('[data-catalog-total]').forEach(function(el) { el.textContent = cases.length; });
  $$('[data-system-total]').forEach(function(el) { el.textContent = cases.filter(function(c) { return c.system === el.dataset.systemTotal; }).length; });
  $$('.master-row').forEach(function(row) {
    const total = cases.filter(function(c) { return c.system === row.dataset.system; }).length;
    const done = completed.filter(function(id) { return byId.get(id) && byId.get(id).system === row.dataset.system; }).length;
    row.querySelector('i').style.width = (total ? done / total * 100 : 0) + '%';
    row.querySelector('span').textContent = done + ' / ' + total;
  });
}
function exportLearningRecord() {
  const payload = {
    format:'image-lab-learning-record', version:2, exportedAt:new Date().toISOString(),
    catalogSize:cases.length,
    favorites:favorites.slice(), completed:completed.slice(), correct:correct,
    reviewed:reviewed.slice(), notes:Object.assign({},notes), findings:Object.assign({},findingDrafts),
    reports:Object.assign({},reportDrafts), reasoning:Object.assign({},reasoningDrafts), attempts:Object.assign({},attempts), reviewPlan:Object.assign({},reviewPlan), learnerLevel:learnerLevel,
    events:learningEvents.slice(),
    session:{queue:session.queue.slice(),cursor:session.cursor,mode:session.mode,order:session.order,answers:Object.assign({},session.answers),hints:Object.assign({},session.hints)}
  };
  const blob = new Blob([JSON.stringify(payload,null,2)],{type:'application/json'});
  const url = URL.createObjectURL(blob), link = document.createElement('a');
  link.href = url;
  link.download = '影研社-学习记录-' + new Date().toISOString().slice(0,10) + '.json';
  link.click();
  setTimeout(function() { URL.revokeObjectURL(url); },0);
  notify('学习记录已导出。');
}
function validAttemptRecord(value, c) {
  return value && typeof value === 'object' && Number.isSafeInteger(value.count) && value.count > 0 &&
    Number.isSafeInteger(value.wrong) && value.wrong >= 0 && value.wrong <= value.count &&
    Number.isInteger(value.lastAnswer) && value.lastAnswer >= 0 && value.lastAnswer < c.options.length;
}
async function importLearningRecord(file) {
  try {
    const payload = JSON.parse(await file.text());
    if (!payload || payload.format !== 'image-lab-learning-record' || payload.version !== 2) throw new Error('文件格式或版本不受支持');
    favorites = validIds([].concat(favorites,payload.favorites || []));
    completed = validIds([].concat(completed,payload.completed || []));
    reviewed = validIds([].concat(reviewed,payload.reviewed || []));
    correct = Math.max(correct,Math.min(Number(payload.correct) || 0,completed.length));
    if (validLearnerLevels.includes(payload.learnerLevel)) learnerLevel = payload.learnerLevel;
    if (payload.notes && typeof payload.notes === 'object') Object.entries(payload.notes).forEach(function(entry) {
      if (byId.has(entry[0]) && typeof entry[1] === 'string' && entry[1].trim()) notes[entry[0]] = entry[1].slice(0,20000);
    });
    if (payload.findings && typeof payload.findings === 'object') Object.entries(payload.findings).forEach(function(entry) {
      if (byId.has(entry[0]) && typeof entry[1] === 'string' && entry[1].trim()) findingDrafts[entry[0]] = entry[1].slice(0,20000);
    });
    if (payload.reports && typeof payload.reports === 'object') Object.entries(payload.reports).forEach(function(entry) {
      if (!byId.has(entry[0]) || !entry[1] || typeof entry[1] !== 'object') return;
      const imported = entry[1];
      reportDrafts[entry[0]] = {
        location:typeof imported.location === 'string' ? imported.location.slice(0,2000) : '',
        findings:typeof imported.findings === 'string' ? imported.findings.slice(0,20000) : '',
        impression:typeof imported.impression === 'string' ? imported.impression.slice(0,10000) : '',
        advice:typeof imported.advice === 'string' ? imported.advice.slice(0,10000) : '',
        score:Number.isFinite(imported.score) ? Math.max(0,Math.min(100,imported.score)) : null
      };
    });
    if (payload.reasoning && typeof payload.reasoning === 'object') Object.entries(payload.reasoning).forEach(function(entry) {
      if (!byId.has(entry[0]) || !entry[1] || typeof entry[1] !== 'object') return;
      const imported = entry[1], existing = currentReasoningDraft(byId.get(entry[0]));
      const responses = Array.isArray(imported.responses) ? [0,1,2].map(function(index) { return typeof imported.responses[index] === 'string' ? imported.responses[index].slice(0,4000) : existing.responses[index]; }) : existing.responses;
      const complete = responses.every(function(response) { return response.trim().length >= 6; });
      reasoningDrafts[entry[0]] = {
        responses:responses,
        completedAt:complete && typeof imported.completedAt === 'string' ? imported.completedAt.slice(0,40) : (complete ? existing.completedAt : null),
        eventRecorded:complete && (imported.eventRecorded === true || existing.eventRecorded)
      };
    });
    if (payload.attempts && typeof payload.attempts === 'object') Object.entries(payload.attempts).forEach(function(entry) {
      const c = byId.get(entry[0]);
      if (c && validAttemptRecord(entry[1],c) && (!attempts[entry[0]] || entry[1].count >= attempts[entry[0]].count)) attempts[entry[0]] = entry[1];
    });
    if (payload.reviewPlan && typeof payload.reviewPlan === 'object') Object.entries(payload.reviewPlan).forEach(function(entry) {
      const current = reviewPlan[entry[0]], imported = entry[1];
      if (byId.has(entry[0]) && validReviewPlanRecord(imported) && (!current || imported.dueDate < current.dueDate || imported.streak > current.streak)) reviewPlan[entry[0]] = imported;
    });
    if (Array.isArray(payload.events)) {
      const existingEventIds = new Set(learningEvents.map(function(event) { return event.id; }));
      payload.events.forEach(function(event) {
        const clean = sanitizeLearningEvent(event);
        if (!clean || existingEventIds.has(clean.id)) return;
        learningEvents.push(clean); existingEventIds.add(clean.id);
      });
      learningEvents = learningEvents.slice(-5000);
    }
    const importedSession = payload.session && typeof payload.session === 'object' ? payload.session : {};
    const importedQueue = validIds(importedSession.queue);
    if (importedQueue.length) {
      session.queue = importedQueue;
      session.cursor = Math.max(0,Math.min(Number(importedSession.cursor) || 0,importedQueue.length - 1));
      session.mode = importedSession.mode === 'study' ? 'study' : 'quiz';
      session.order = ['ordered','random','custom'].includes(importedSession.order) ? importedSession.order : 'ordered';
      session.answers = {};
      if (importedSession.answers && typeof importedSession.answers === 'object') Object.entries(importedSession.answers).forEach(function(entry) {
        const c = byId.get(entry[0]);
        if (c && Number.isInteger(entry[1]) && entry[1] >= 0 && entry[1] < c.options.length) session.answers[entry[0]] = entry[1];
      });
      session.hints = {};
      if (importedSession.hints && typeof importedSession.hints === 'object') Object.entries(importedSession.hints).forEach(function(entry) {
        if (byId.has(entry[0]) && Number.isInteger(entry[1]) && entry[1] >= 0 && entry[1] <= 3) session.hints[entry[0]] = entry[1];
      });
    }
    save(stablePrefix + '-favorites',favorites);
    save(stablePrefix + '-completed',completed);
    save(storagePrefix + '-correct',correct);
    save(storagePrefix + '-reviewed',reviewed);
    save(attemptsKey,attempts);
    save(reviewPlanKey,reviewPlan);
    save(stablePrefix + '-learner-level',learnerLevel);
    save(stablePrefix + '-learning-events',learningEvents);
    Object.entries(notes).forEach(function(entry) { if (entry[1].trim()) localStorage.setItem(stablePrefix + '-note-' + entry[0],entry[1]); });
    Object.entries(findingDrafts).forEach(function(entry) { if (entry[1].trim()) localStorage.setItem(stablePrefix + '-finding-' + entry[0],entry[1]); });
    Object.entries(reportDrafts).forEach(function(entry) {
      const draft = entry[1];
      if ([draft.location,draft.findings,draft.impression,draft.advice].some(function(value) { return value.trim(); })) save(stablePrefix + '-report-' + entry[0],draft);
    });
    Object.entries(reasoningDrafts).forEach(function(entry) {
      if (entry[1].responses.some(function(value) { return value.trim(); })) save(stablePrefix + '-reasoning-' + entry[0],entry[1]);
    });
    persistSession();
    updateStats(); renderCases(); renderTraining();
    notify('导入完成，记录已按病例 ID 合并。');
  } catch (error) {
    notify('导入失败：' + error.message);
  }
}
function openQueue() {
  draftRows = session.queue.concat(ids.filter(function(id) { return !session.queue.includes(id); }));
  draftSelected = new Set(session.queue);
  $('#draftMode').value = session.mode;
  $('#draftOrder').value = 'custom';
  $('#queueSearch').value = '';
  $('#queueSystem').value = 'all';
  refreshQueueDiagnoses();
  renderDraft();
  $('#queueDialog').showModal();
}
function queueMatches(c, includeDiagnosis = true) {
  const query = $('#queueSearch').value.trim().toLocaleLowerCase();
  const system = $('#queueSystem').value;
  const diagnosis = $('#queueDiagnosis').value;
  const text = [c.id,c.title,c.english,c.system,c.modality].concat(c.tags || []).join(' ').toLocaleLowerCase();
  return (system === 'all' || c.system === system) && (!query || text.includes(query)) &&
    (!includeDiagnosis || diagnosis === 'all' || diagnosisName(c) === diagnosis);
}
function refreshQueueDiagnoses() {
  const select = $('#queueDiagnosis'), current = select.value;
  const diagnoses = Array.from(new Set(cases.filter(function(c) { return queueMatches(c,false); }).map(diagnosisName))).sort(function(a,b) { return a.localeCompare(b,'zh-CN'); });
  select.innerHTML = '<option value="all">全部病种</option>' + diagnoses.map(function(name) { return '<option>' + esc(name) + '</option>'; }).join('');
  select.value = diagnoses.includes(current) ? current : 'all';
}
function renderDraft() {
  const visibleRows = draftRows.filter(function(id) { return queueMatches(byId.get(id)); });
  $('#queueList').innerHTML = visibleRows.map(function(id) {
    const index = draftRows.indexOf(id);
    const c = byId.get(id), checked = draftSelected.has(id);
    const count = checked ? draftRows.slice(0,index + 1).filter(function(item) { return draftSelected.has(item); }).length : '—';
    return '<li data-id="' + id + '" draggable="true" class="' + (checked ? 'chosen' : '') + '"><span class="drag-handle" title="拖动排序">⠿</span><span class="queue-number">' + count + '</span>' +
      '<label><input type="checkbox" data-select="' + id + '"' + (checked ? ' checked' : '') + '><span><b>' + esc(c.title) + '</b><small>' + c.system + ' · ' + c.modality + '</small></span></label>' +
      '<div><button class="soft-button" data-move="-1" data-id="' + id + '" aria-label="上移' + esc(c.title) + '"' + (index === 0 ? ' disabled' : '') + '>↑</button>' +
      '<button class="soft-button" data-move="1" data-id="' + id + '" aria-label="下移' + esc(c.title) + '"' + (index === draftRows.length - 1 ? ' disabled' : '') + '>↓</button></div></li>';
  }).join('') || '<li class="queue-empty">没有符合条件的病例，请调整搜索或筛选。</li>';
  $('#selectionCount').textContent = '已选择 ' + draftSelected.size + ' / ' + cases.length + ' 题 · 当前显示 ' + visibleRows.length + ' 题';
  $('#applyQueue').disabled = draftSelected.size === 0;
}
function sampleByDiagnosis() {
  const size = $('#queueSampleSize').value;
  const candidates = cases.filter(function(c) { return queueMatches(c); });
  const grouped = new Map();
  candidates.forEach(function(c) {
    const name = diagnosisName(c);
    if (!grouped.has(name)) grouped.set(name, []);
    grouped.get(name).push(c.id);
  });
  const chosen = [];
  grouped.forEach(function(group) { chosen.push.apply(chosen, size === 'all' ? group : sample(group, Number(size))); });
  draftSelected = new Set(chosen);
  draftRows = chosen.concat(ids.filter(function(id) { return !draftSelected.has(id); }));
  $('#draftOrder').value = 'custom';
  renderDraft();
  notify('已从 ' + grouped.size + ' 个病种抽取 ' + chosen.length + ' 题。');
}
function applyDraft() {
  let queue = draftRows.filter(function(id) { return draftSelected.has(id); });
  if (!queue.length) return;
  const order = $('#draftOrder').value;
  if (order === 'ordered') queue = ids.filter(function(id) { return draftSelected.has(id); });
  const mode = $('#draftMode').value;
  $('#queueDialog').close();
  startTraining(queue, mode, order);
}
function setOrder(order) {
  if (order === 'custom') {
    $('#orderMode').value = session.order;
    openQueue();
    return;
  }
  const currentId = currentCase().id;
  session.queue = order === 'random' ? shuffle(session.queue) : ids.filter(function(id) { return session.queue.includes(id); });
  session.cursor = order === 'random' ? 0 : session.queue.indexOf(currentId);
  session.order = order;
  reasoningStep = session.mode === 'study' ? 'diagnosis' : 'findings';
  renderTraining();
  updateLocation();
}
function setMode(mode) {
  if (session.mode === mode) return;
  session.mode = mode;
  reasoningStep = mode === 'study' ? 'diagnosis' : 'findings';
  renderTraining();
  updateLocation();
}
function resetImage() {
  zoom = 1; contrast = 1; inverted = false; imageMarks = []; tool = 'contrast';
  $('#annotations').innerHTML = '';
  updateImage();
}
function updateImage() {
  $('#imageStage').style.transform = 'scale(' + zoom + ')';
  $('#activeScan').style.filter = 'contrast(' + contrast + ') invert(' + (inverted ? 1 : 0) + ')';
  $('#contrastValue').textContent = Math.round(contrast * 100) + '%';
  $('#zoomValue').textContent = Math.round(zoom * 100) + '%';
  $$('.tool').forEach(function(b) {
    const active = b.dataset.tool === 'invert' ? inverted : b.dataset.tool === tool;
    b.classList.toggle('active',active);
    b.setAttribute('aria-pressed',active);
  });
}
function fitImage() {
  const img = $('#activeScan'), viewport = $('#viewport'), stage = $('#imageStage');
  if (!img.naturalWidth || !viewport.clientWidth || !viewport.clientHeight) return;
  const ratio = Math.min((viewport.clientWidth - 32) / img.naturalWidth, (viewport.clientHeight - 80) / img.naturalHeight);
  stage.style.width = Math.max(1, img.naturalWidth * ratio) + 'px';
  stage.style.height = Math.max(1, img.naturalHeight * ratio) + 'px';
}
$('#activeScan').addEventListener('load', fitImage);
$('#activeScan').addEventListener('error', function() { $('#imageError').hidden = false; });
new ResizeObserver(fitImage).observe($('#viewport'));
$('#viewport').addEventListener('wheel', function(e) {
  if (tool === 'annotate') return;
  e.preventDefault();
  if (tool === 'zoom') zoom = Math.max(0.5,Math.min(4, zoom - e.deltaY * 0.001));
  else contrast = Math.max(0.25,Math.min(3, contrast - e.deltaY * 0.001));
  updateImage();
}, {passive:false});
$('#imageStage').addEventListener('click', function(e) {
  if (tool !== 'annotate') return;
  const box = $('#imageStage').getBoundingClientRect();
  imageMarks.push({x:(e.clientX-box.left)/box.width*100, y:(e.clientY-box.top)/box.height*100});
  $('#annotations').innerHTML = imageMarks.map(function(mark) { return '<i class="annotation" style="left:' + mark.x + '%;top:' + mark.y + '%"></i>'; }).join('');
});
$$('.tool').forEach(function(b) { b.onclick = function() {
  if (b.dataset.tool === 'invert') inverted = !inverted; else tool = b.dataset.tool;
  updateImage();
}; });
$('#resetViewer').onclick = resetImage;
$('#caseNote').addEventListener('input', function(e) {
  const c = currentCase(), value = e.target.value;
  notes[c.id] = value;
  try {
    const key = stablePrefix + '-note-' + c.id;
    if (value.trim()) localStorage.setItem(key,value); else localStorage.removeItem(key);
    $('#noteSaved').textContent = '已保存';
  } catch { $('#noteSaved').textContent = '仅当前页面保留'; }
  updateStats();
});
$$('[data-reasoning-step]').forEach(function(button) {
  button.onclick = function() { setReasoningStep(button.dataset.reasoningStep); };
});
$('#findingDraft').addEventListener('input', saveFindingDraft);
$('#requestHint').onclick = requestHint;
$('#continueDiagnosis').onclick = function() { saveFindingDraft(); setReasoningStep('diagnosis'); };
$('#reasoningCoach').addEventListener('input', function(e) {
  if (e.target.id === 'reasoningResponse') saveReasoningResponse(currentCase(),e.target.value);
});
$('#reasoningCoach').addEventListener('click', function(e) {
  const promptButton = e.target.closest('[data-reasoning-prompt]');
  const moveButton = e.target.closest('[data-coach-move]');
  if (promptButton) reasoningPromptIndex = Number(promptButton.dataset.reasoningPrompt);
  else if (moveButton) reasoningPromptIndex = Math.max(0,Math.min(2,reasoningPromptIndex + Number(moveButton.dataset.coachMove)));
  else if (e.target.closest('#completeReasoning')) { completeReasoningCheckpoint(); return; }
  else return;
  renderReasoningCoach(currentCase());
  $('#reasoningResponse').focus();
});
['#reportLocation','#reportFindings','#reportImpression','#reportAdvice'].forEach(function(selector) {
  $(selector).addEventListener('input',saveReportDraft);
});
$('#scoreReport').onclick = scoreCurrentReport;
$('#openComparison').onclick = function() { showComparison(currentCase().id); };
$('#closeComparison').onclick = function() { $('#compareDialog').close(); };
$('#compareChoices').onclick = function(e) {
  const button = e.target.closest('[data-compare-choice]');
  if (button) showComparison(comparePrimaryId,button.dataset.compareChoice);
};
$('#submitAnswer').onclick = submitAnswer;
$('#answers').onclick = function(e) {
  const button = e.target.closest('[data-answer]');
  if (!button || hasAnswer(currentCase()) || session.mode !== 'quiz') return;
  selected = Number(button.dataset.answer);
  renderAnswerPanel();
};
$('#favoriteCase').onclick = function() { toggleFavorite(currentCase().id); };
$('#toggleRecall').onclick = function() { recallOpen = !recallOpen; renderAnswerPanel(); };
$('#markReviewed').onclick = function() {
  const id = currentCase().id;
  reviewed = reviewed.includes(id) ? reviewed.filter(function(x) { return x !== id; }) : reviewed.concat(id);
  save(storagePrefix + '-reviewed',reviewed);
  recordLearningEvent('reviewed_changed',currentCase(),{reviewed:reviewed.includes(id)});
  renderAnswerPanel(); updateStats();
};
$('#openCurrentDetail').onclick = function() { showDetail(currentCase().id); };
$('#prevCase').onclick = function() { moveQuestion(-1); };
$('#nextCase').onclick = function() {
  if (session.cursor === session.queue.length-1) summary(); else moveQuestion(1);
};
$('#jumpCase').onchange = function(e) {
  session.cursor = Number(e.target.value);
  reasoningStep = session.mode === 'study' ? 'diagnosis' : 'findings';
  renderTraining(); updateLocation();
};
$$('[data-mode]').forEach(function(b) { b.onclick = function() { setMode(b.dataset.mode); }; });
$('#learnerLevel').onchange = function(e) {
  if (!validLearnerLevels.includes(e.target.value)) return;
  learnerLevel = e.target.value;
  save(stablePrefix + '-learner-level',learnerLevel);
  renderHintPanel(currentCase());
};
$('#orderMode').onchange = function(e) { setOrder(e.target.value); };
$('#reshuffle').onclick = function() { setOrder('random'); };
$('#configureQueue').onclick = openQueue;
$('#closeQueue').onclick = function() { $('#queueDialog').close(); };
$('#applyQueue').onclick = applyDraft;
$('#queueList').addEventListener('change', function(e) {
  const id = e.target.dataset.select;
  if (!id) return;
  if (e.target.checked) draftSelected.add(id); else draftSelected.delete(id);
  renderDraft();
  $('#queueList input[data-select="' + id + '"]').focus();
});
$('#queueList').addEventListener('click', function(e) {
  const b = e.target.closest('[data-move]');
  if (!b) return;
  const index = draftRows.indexOf(b.dataset.id), next = index + Number(b.dataset.move);
  if (next < 0 || next >= draftRows.length) return;
  [draftRows[index],draftRows[next]] = [draftRows[next],draftRows[index]];
  $('#draftOrder').value = 'custom';
  renderDraft();
  const focus = $('#queueList button[data-id="' + b.dataset.id + '"][data-move="' + b.dataset.move + '"]');
  if (!focus.disabled) focus.focus();
});
let draggedQueueId = null;
$('#queueList').addEventListener('dragstart', function(e) {
  const row = e.target.closest('li[data-id]');
  if (!row || !draftSelected.has(row.dataset.id)) { e.preventDefault(); return; }
  draggedQueueId = row.dataset.id;
  row.classList.add('dragging');
  e.dataTransfer.effectAllowed = 'move';
});
$('#queueList').addEventListener('dragend', function(e) {
  const row = e.target.closest('li[data-id]');
  if (row) row.classList.remove('dragging');
  draggedQueueId = null;
});
$('#queueList').addEventListener('dragover', function(e) {
  if (draggedQueueId && e.target.closest('li[data-id]')) e.preventDefault();
});
$('#queueList').addEventListener('drop', function(e) {
  const target = e.target.closest('li[data-id]');
  if (!draggedQueueId || !target || target.dataset.id === draggedQueueId) return;
  e.preventDefault();
  const from = draftRows.indexOf(draggedQueueId), to = draftRows.indexOf(target.dataset.id);
  draftRows.splice(to,0,draftRows.splice(from,1)[0]);
  $('#draftOrder').value = 'custom';
  renderDraft();
});
$('#queueSearch').oninput = function() { refreshQueueDiagnoses(); renderDraft(); };
$('#queueSystem').onchange = function() { refreshQueueDiagnoses(); renderDraft(); };
$('#queueDiagnosis').onchange = renderDraft;
$('#sampleDiagnosis').onclick = sampleByDiagnosis;
$$('[data-preset]').forEach(function(b) { b.onclick = function() {
  const preset = b.dataset.preset;
  let chosen = preset === 'all' ? ids : preset === 'filtered' ? filteredCases().map(function(c) { return c.id; }) :
    preset === 'favorites' ? favorites.slice() : preset === 'mistakes' ? mistakeIds() :
    preset === 'quick10' ? sample(filteredCases().map(function(c) { return c.id; }),10) : preset === 'weak' ? weaknessQueue() : [];
  if (preset === 'weak' && !chosen.length) { notify('完成一些答题后，薄弱项组卷才会出现。'); return; }
  draftSelected = new Set(chosen);
  draftRows = chosen.concat(ids.filter(function(id) { return !draftSelected.has(id); }));
  $('#draftOrder').value = preset === 'all' || preset === 'filtered' ? 'ordered' : 'custom';
  renderDraft();
}; });
function clearFilters() {
  atlasSystem = 'all';
  atlasLimit = 48;
  $('#globalSearch').value = '';
  ['#modalityFilter','#levelFilter','#statusFilter'].forEach(function(s) { $(s).value = 'all'; });
  $$('.filters button').forEach(function(b) { b.classList.toggle('active',b.dataset.filter === 'all'); });
  renderCases();
}
$('#clearFilters').onclick = clearFilters;
$$('.filters button').forEach(function(b) { b.onclick = function() {
  atlasSystem = b.dataset.filter;
  atlasLimit = 48;
  $$('.filters button').forEach(function(x) { x.classList.toggle('active',x === b); });
  renderCases();
}; });
['#modalityFilter','#levelFilter','#statusFilter'].forEach(function(s) { $(s).onchange = function() { atlasLimit = 48; renderCases(); }; });
$('#globalSearch').oninput = function() { atlasLimit = 48; showView('cases'); };
$('#diseaseLibrarySearch').oninput = function() { diseaseLibraryLimit = 60; renderDiseaseLibrary(); };
$('#diseaseLibrarySystem').onchange = function() { diseaseLibrarySystem = this.value; diseaseLibraryLimit = 60; $('#diseaseLibraryCategory').dataset.system = ''; $('#diseaseLibraryGroup').dataset.scope = ''; renderDiseaseLibrary(); };
$('#diseaseLibraryCategory').onchange = function() { diseaseLibraryLimit = 60; $('#diseaseLibraryGroup').dataset.scope = ''; renderDiseaseLibrary(); };
$('#diseaseLibraryGroup').onchange = function() { diseaseLibraryLimit = 60; renderDiseaseLibrary(); };
$('#loadMoreDiseaseLibrary').onclick = function() { diseaseLibraryLimit += 60; renderDiseaseLibrary(); };
$('#closeDiseaseLibraryDialog').onclick = function() { $('#diseaseLibraryDialog').close(); };
$('#loadMoreCases').onclick = function() { atlasLimit += 48; renderCases(); };
$('#quizFiltered').onclick = function() { startTraining(filteredCases().map(function(c) { return c.id; }), 'quiz'); };
$('#studyFiltered').onclick = function() { startTraining(filteredCases().map(function(c) { return c.id; }), 'study'); };
$('#quickTen').onclick = function() { startTraining(sample(filteredCases().map(function(c) { return c.id; }),10), 'quiz','custom'); };
$('#studyWrong').onclick = function() { startTraining(mistakeIds(), 'study'); };
$('#reviewWrong').onclick = function() { startTraining(mistakeIds(), 'quiz'); };
$('#studyDueReviews').onclick = function() { startTraining(dueReviewQueue(), 'study','custom'); };
$('#startDueReviews').onclick = function() { startTraining(dueReviewQueue(), 'quiz','custom'); };
$('#studyPrescription').onclick = function() { startPrescription('study'); };
$('#startPrescription').onclick = function() { startPrescription('quiz'); };
$('#randomCase').onclick = function() { startTraining(filteredCases().map(function(c) { return c.id; }), 'quiz', 'random'); };
$$('[data-dicom-filter]').forEach(function(b) { b.onclick = function() {
  dicomSystem = b.dataset.dicomFilter;
  $$('[data-dicom-filter]').forEach(function(item) { item.classList.toggle('active',item === b); });
  renderDicomStudies();
}; });
$('#exportProgress').onclick = exportLearningRecord;
$('#importProgress').onclick = function() { $('#importProgressFile').click(); };
$('#importProgressFile').onchange = function(e) {
  const file = e.target.files && e.target.files[0];
  if (file) importLearningRecord(file);
  e.target.value = '';
};
$('.menu').onclick = function() { $('.sidebar').classList.toggle('open'); $('.menu').setAttribute('aria-expanded',$('.sidebar').classList.contains('open')); };
$('.brand').onclick = function(e) { e.preventDefault(); showView('home'); };
$$('.nav-item').forEach(function(b) { b.onclick = function() {
  if (b.dataset.view === 'viewer') renderTraining();
  showView(b.dataset.view);
}; });
$$('[data-go]').forEach(function(b) { b.onclick = function() { showView(b.dataset.go); }; });
$$('[data-open-case]').forEach(function(el) { el.onclick = function() { startTraining(ids, 'quiz', 'ordered', ids[Number(el.dataset.openCase)]); }; });
$$('[data-library-system]').forEach(function(el) {
  function openSystem() {
    clearFilters();
    atlasSystem = el.dataset.librarySystem;
    $$('.filters button').forEach(function(b) { b.classList.toggle('active',b.dataset.filter === atlasSystem); });
    showView('cases');
  }
  el.onclick = openSystem;
  el.onkeydown = function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openSystem(); } };
});
document.addEventListener('click', function(e) {
  const librarySystemButton = e.target.closest('[data-library-system-key]');
  if (librarySystemButton) { e.preventDefault(); diseaseLibrarySystem = librarySystemButton.dataset.librarySystemKey; $('#diseaseLibrarySystem').value = diseaseLibrarySystem; diseaseLibraryLimit = 60; $('#diseaseLibraryCategory').dataset.system = ''; $('#diseaseLibraryGroup').dataset.scope = ''; renderDiseaseLibrary(); return; }
  const libraryRecordButton = e.target.closest('[data-library-record]');
  if (libraryRecordButton) { e.preventDefault(); openDiseaseLibraryRecord(libraryRecordButton.dataset.libraryRecord); return; }
  const dicomButton = e.target.closest('[data-dicom-open]');
  if (dicomButton) {
    const study = DICOM_STUDIES.find(function(item) { return item.uid === dicomButton.dataset.dicomOpen; });
    if (!study) return;
    dicomButton.disabled = true;
    dicomButton.textContent = '正在启动…';
    cornerstoneModulePromise = cornerstoneModulePromise || import('./assets/cornerstone/viewer.js?v=atlas18');
    cornerstoneModulePromise.then(function() {
      window.CornerstonePilot.open(study);
    }).catch(function(error) {
      cornerstoneModulePromise = null;
      console.error('Cornerstone viewer module failed to load',error);
      window.cornerstoneModuleError = error && error.stack ? error.stack : String(error);
      notify('影像引擎载入失败，请刷新后重试或使用 OHIF 备用入口。');
    }).finally(function() {
      dicomButton.disabled = false;
      dicomButton.textContent = '站内打开序列';
    });
    return;
  }
  const prescriptionButton = e.target.closest('[data-prescription-topic]');
  if (prescriptionButton) { e.preventDefault(); startPrescription('quiz',prescriptionButton.dataset.prescriptionTopic); return; }
  const systemMistakesButton = e.target.closest('[data-system-mistakes]');
  if (systemMistakesButton) { e.preventDefault(); startSystemMistakes(systemMistakesButton.dataset.systemMistakes); return; }
  const el = e.target.closest('[data-detail],[data-quiz],[data-study],[data-favorite],[data-compare],[data-clear],[data-summary-config]');
  if (!el || el.disabled) return;
  e.preventDefault();
  if (el.dataset.detail) showDetail(el.dataset.detail);
  else if (el.dataset.quiz) startAt(el.dataset.quiz, 'quiz');
  else if (el.dataset.study) startAt(el.dataset.study, 'study');
  else if (el.dataset.favorite) toggleFavorite(el.dataset.favorite);
  else if (el.dataset.compare) showComparison(el.dataset.compare);
  else if (el.hasAttribute('data-clear')) clearFilters();
  else openQueue();
});
document.addEventListener('keydown', function(e) {
  if ($('#queueDialog').open || $('#compareDialog').open || $('#cornerstoneDialog').open) return;
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); $('#globalSearch').focus(); return; }
  if (currentView !== 'viewer' || e.target.matches('input,textarea,select') || e.ctrlKey || e.metaKey || e.altKey) return;
  if (e.key === 'ArrowRight') { e.preventDefault(); moveQuestion(1); }
  if (e.key === 'ArrowLeft') { e.preventDefault(); moveQuestion(-1); }
  if (e.key.toLowerCase() === 'r') resetImage();
  if (e.key.toLowerCase() === 'a') { tool = 'annotate'; updateImage(); }
  if (session.mode === 'quiz' && !hasAnswer(currentCase()) && /^[1-4]$/.test(e.key)) { selected = Number(e.key)-1; renderAnswerPanel(); }
});
function route() {
  const params = new URLSearchParams(location.search), raw = params.get('case');
  const index = raw !== null && /^\d+$/.test(raw) ? Number(raw) : -1;
  const stableId = params.get('caseId') || (index>=0 ? LEGACY_CASE_IDS[index] : null);
  const requested = stableId ? byId.get(stableId) : null;
  if (requested) {
    if (params.get('view') === 'caseDetail') { showDetail(requested.id); return; }
    if (!session.queue.includes(requested.id)) session.queue = ids.slice();
    session.cursor = session.queue.indexOf(requested.id);
    if (['quiz','study'].includes(params.get('mode'))) session.mode = params.get('mode');
    renderTraining(); showView('viewer'); return;
  }
  if (stableId && !requested) {
    renderTraining(); showView('cases');
    notify('此旧链接指向的病例已因质量复核下架，请在病例图谱中选择其他病例。');
    return;
  }
  renderTraining();
  showView(['home','cases','viewer','dicom','diseaseLibrary','sop','mylibrary','progress'].includes(params.get('view')) ? params.get('view') : 'home');
}
window.addEventListener('popstate',route);
updateStats();
renderCases();
renderDicomStudies();
route();
