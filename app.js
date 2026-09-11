'use strict';
const cases = CASES.map(function(c) {
  const id = c.image.split('/').pop().replace(/\.[^.]+$/, '');
  return Object.assign({}, c, CURRICULUM.find(function(item) { return item.id === id; }));
});
const byId = new Map(cases.map(function(c) { return [c.id, c]; }));
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
cases.forEach(function(c, i) {
  try {
    const stable = localStorage.getItem(stablePrefix + '-note-' + c.id);
    const legacy = localStorage.getItem(storagePrefix + '-note-' + i);
    notes[c.id] = stable !== null ? stable : (legacy || '');
    if (stable === null && legacy) localStorage.setItem(stablePrefix + '-note-' + c.id, legacy);
  } catch { notes[c.id] = ''; }
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
  answers: {}
};
session.cursor = Math.max(0, Math.min(Number.isInteger(storedSession.cursor) ? storedSession.cursor : 0, session.queue.length - 1));
if (storedSession.answers && typeof storedSession.answers === 'object') {
  Object.entries(storedSession.answers).forEach(function(entry) {
    const c = byId.get(entry[0]);
    if (c && Number.isInteger(entry[1]) && entry[1] >= 0 && entry[1] < c.options.length) session.answers[c.id] = entry[1];
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
const isMistake = function(c) { return Boolean(attempts[c.id] && attempts[c.id].lastAnswer !== c.answer); };
const mistakeIds = function() { return cases.filter(isMistake).map(function(c) { return c.id; }); };
let currentView = 'home', detailId = ids[0], selected = null, recallOpen = true;
let atlasSystem = 'all', atlasLimit = 48, noticeTimer, draftRows = [], draftSelected = new Set(), dicomSystem = 'all';
let tool = 'contrast', zoom = 1, contrast = 1, inverted = false, imageMarks = [];
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
    url.searchParams.set('case', cases.indexOf(c));
    if (currentView === 'viewer') url.searchParams.set('mode', session.mode);
  }
  history.replaceState(null, '', url);
}
function showView(view, updateUrl = true) {
  if (!['home','cases','caseDetail','viewer','dicom','progress'].includes(view)) view = 'home';
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
  if (view === 'progress') updateStats();
  if (updateUrl) updateLocation();
  window.scrollTo(0, 0);
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
      (modality === 'all' || c.modality === modality || (modality === 'CT' && c.modality === 'CTPA')) &&
      (level === 'all' || c.level === level) &&
      (status === 'all' || (status === 'completed' && completed.includes(c.id)) ||
        (status === 'unanswered' && !completed.includes(c.id)) || (status === 'reviewed' && reviewed.includes(c.id)) || (status === 'mistakes' && isMistake(c))) &&
      (!query || searchText.includes(query));
  });
}
function diagnosisName(c) { return c.title.replace(/\s*·\s*开放病例\s*\d+$/, ''); }
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
      '<a href="?view=caseDetail&amp;case=' + i + '" data-detail="' + c.id + '" class="atlas-photo" aria-label="查看' + esc(c.title) + '详情">' +
      '<img src="' + thumbFor(c) + '" alt="' + esc(c.title) + '" loading="lazy" decoding="async"><span>' + esc(c.modality) + '</span></a>' +
      '<div class="atlas-card-body"><div class="atlas-card-meta"><span>' + c.system + ' · ' + c.level + '</span>' +
      '<button class="bookmark" data-favorite="' + c.id + '" aria-label="' + (isFav ? '取消收藏' : '收藏') + esc(c.title) + '" aria-pressed="' + isFav + '">' + (isFav ? '★' : '☆') + '</button></div>' +
      '<h2><a href="?view=caseDetail&amp;case=' + i + '" data-detail="' + c.id + '">' + esc(c.title) + '</a></h2><p class="english-name">' + esc(c.english) + '</p>' +
      tags(c) + '<p class="atlas-clue"><b>诊断要点</b>' + esc(c.recall) + '</p>' +
      '<div class="case-status">' + (completed.includes(c.id) ? '<span>已答题</span>' : '<span>未答题</span>') + (reviewed.includes(c.id) ? '<span>已背题</span>' : '') + (isMistake(c) ? '<span class="needs-review">待复习错题</span>' : '') + '</div>' +
      '<div class="card-buttons"><button class="soft-button" data-detail="' + c.id + '">诊断方法与详情</button><button class="soft-button" data-study="' + c.id + '">背题</button><button class="soft-button" data-quiz="' + c.id + '">答题</button></div></div></article>';
  }).join('') || '<div class="empty-state"><b>没有符合条件的病例</b><p>试着减少筛选条件，或搜索另一种征象。</p><button class="soft-button" data-clear>重置筛选</button></div>';
}
function ohifUrl(study) {
  const url = new URL('https://viewer.ohif.org/viewer/dicomwebproxy');
  url.searchParams.set('url', new URL('idc-dicomweb.json', location.href).href);
  url.searchParams.set('StudyInstanceUIDs', study.uid);
  return url.href;
}
function renderDicomStudies() {
  const studies = DICOM_STUDIES.filter(function(study) { return dicomSystem === 'all' || study.system === dicomSystem; });
  $('#dicomList').innerHTML = studies.map(function(study) {
    return '<article class="dicom-card"><div class="dicom-card-top"><span>' + esc(study.system) + '</span><b>' + esc(study.modality) + '</b></div>' +
      '<h2>' + esc(study.title) + '</h2><p>IDC 集合 <code>' + esc(study.collection) + '</code></p>' +
      '<dl><div><dt>匿名编号</dt><dd>' + esc(study.subject) + '</dd></div><div><dt>解剖范围</dt><dd>' + esc(study.body) + '</dd></div><div><dt>检查体积</dt><dd>约 ' + study.size + ' MB</dd></div></dl>' +
      '<div class="dicom-links"><a class="primary" href="' + esc(ohifUrl(study)) + '" target="_blank" rel="noopener">在 OHIF 打开序列 ↗</a><a href="https://doi.org/' + esc(study.doi) + '" target="_blank" rel="noopener">数据集 DOI</a></div>' +
      '<small>' + esc(study.license) + ' · Study UID 已核对</small></article>';
  }).join('');
}
const licenseLinks = {'CC BY-SA 2.0':'https://creativecommons.org/licenses/by-sa/2.0/','CC BY-SA 2.5':'https://creativecommons.org/licenses/by-sa/2.5/','CC BY-SA 3.0':'https://creativecommons.org/licenses/by-sa/3.0/','CC BY-SA 4.0':'https://creativecommons.org/licenses/by-sa/4.0/','CC BY 2.0':'https://creativecommons.org/licenses/by/2.0/','CC BY 2.5':'https://creativecommons.org/licenses/by/2.5/','CC BY 3.0':'https://creativecommons.org/licenses/by/3.0/','CC BY 4.0':'https://creativecommons.org/licenses/by/4.0/','CC0':'https://creativecommons.org/publicdomain/zero/1.0/','Public domain':'https://commons.wikimedia.org/wiki/Commons:Public_domain'};
function creditHTML(c) {
  const licenseUrl = c.licenseUrl || licenseLinks[c.license] || c.sourceUrl;
  return '<a href="' + c.sourceUrl + '" target="_blank" rel="noopener">' + esc(c.source) + ' ↗</a><a href="' + licenseUrl + '" target="_blank" rel="noopener">' + esc(c.license) + '</a>';
}
function knowledgeHTML(c) {
  const list = function(items) { return '<ul>' + items.map(function(t) { return '<li>' + esc(t) + '</li>'; }).join('') + '</ul>'; };
  const review = MEDICAL_REVIEWS[c.id];
  const reviewState = review && review.status === 'approved' ? '<div class="review-state approved"><b>医学已审</b><span>' + esc(review.reviewer) + ' · ' + esc(review.credentials) + ' · ' + esc(review.reviewedAt) + ' · ' + esc(review.contentVersion) + '</span></div>' : '<div class="review-state source-verified"><b>' + (c.sourceEvidence ? '来源核验完成' : '基础教学病例') + '</b><span>放射科医师逐例审校：待完成</span></div>';
  const evidence = c.sourceEvidence ? '<section class="source-evidence"><h3>00 · 本图独立证据与审校状态</h3>' + reviewState + '<dl><div><dt>原始文件</dt><dd>' + esc(c.sourceFile) + '</dd></div><div><dt>本图来源说明</dt><dd lang="en">' + esc(c.sourceEvidence) + '</dd></div><div><dt>图像指纹</dt><dd><code>SHA-1 ' + esc(c.sourceSha1) + '</code></dd></div></dl><p>本图的文件、诊断标签和原文说明均独立保存；通用阅片方法按同病种复用。未提供的信息不会补写为患者事实，完成专家审校前不标记为“医学已审”。</p></section>' : '<section class="source-evidence"><h3>00 · 审校状态</h3>' + reviewState + '</section>';
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
  $('#detailContent').innerHTML = '<div class="detail-heading"><span class="eyebrow">' + c.system + ' / ' + c.modality + ' / ' + c.level + '</span><h1>' + esc(c.title) + '</h1><p>' + esc(c.english) + '</p>' + tags(c) + '</div>' +
    '<div class="detail-grid"><div class="detail-visual"><figure><img src="' + c.image + '" alt="' + esc(c.title) + '"><figcaption>' + creditHTML(c) + '<span>保留原图标注，按比例显示。</span></figcaption></figure>' +
    '<div class="detail-actions"><button class="primary" data-study="' + id + '">背诵本例</button><button class="soft-button" data-quiz="' + id + '">练习本例</button><button class="soft-button" data-favorite="' + id + '" aria-pressed="' + favorites.includes(c.id) + '">' + (favorites.includes(c.id) ? '★ 已收藏' : '☆ 收藏') + '</button></div>' +
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
  selected = null;
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
  selected = hasAnswer(c) ? session.answers[c.id] : null;
  recallOpen = true;
  $('#sessionSummary').hidden = true;
  $$('.mode-tabs button').forEach(function(b) { b.setAttribute('aria-pressed', b.dataset.mode === session.mode); });
  $('#orderMode').value = session.order;
  $('#reshuffle').hidden = session.order !== 'random';
  $('#queueSummary').textContent = session.queue.length + ' 题 · ' + ({ordered:'题库顺序',random:'随机顺序',custom:'自定义顺序'}[session.order]);
  $('#modeHint').textContent = session.mode === 'study' ?
    '背题：直接阅读诊断、技巧和方法；可收起答案自测，标记已背。背题不计入答题正确率。' :
    '答题：选择后提交查看解析。原图可能带位置标注；首次提交计入正确率，可自由跳题。';
  $('#viewerModality').textContent = c.modality + ' · ' + c.system;
  $('#caseHistory').textContent = c.history;
  $('#activeScan').alt = '病例 ' + String(index + 1).padStart(2, '0') + ' 教学影像';
  $('#imageError').hidden = true;
  $('#activeScan').src = c.image;
  $('#caseNote').value = notes[c.id] || '';
  $('#noteSaved').textContent = storageAvailable ? '自动保存' : '仅当前页面保留';
  $('#viewerIndex').textContent = '病例编号 ' + String(index + 1).padStart(2,'0');
  $('#queuePosition').textContent = '第 ' + (session.cursor + 1) + ' / ' + session.queue.length + ' 题';
  $('#prevCase').disabled = session.cursor === 0;
  $('#nextCase').textContent = session.cursor === session.queue.length-1 ? '本轮小结' : '下一题 →';
  updateFavorite();
  renderAnswerPanel();
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
  $('#dailyCount').textContent = completed.length;
  $('#sideTotal').textContent = cases.length;
  $('#sideProgress').style.width = (completed.length / cases.length * 100) + '%';
  $('#reviewedCount').textContent = reviewed.length;
  const wrong = mistakeIds();
  $('#wrongCount').textContent = wrong.length;
  $('#everWrongCount').textContent = Object.values(attempts).filter(function(item) { return item.wrong > 0; }).length;
  $('#studyWrong').disabled = $('#reviewWrong').disabled = wrong.length === 0;
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
    reviewed:reviewed.slice(), notes:Object.assign({},notes), attempts:Object.assign({},attempts),
    session:{queue:session.queue.slice(),cursor:session.cursor,mode:session.mode,order:session.order,answers:Object.assign({},session.answers)}
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
    if (payload.notes && typeof payload.notes === 'object') Object.entries(payload.notes).forEach(function(entry) {
      if (byId.has(entry[0]) && typeof entry[1] === 'string' && entry[1].trim()) notes[entry[0]] = entry[1].slice(0,20000);
    });
    if (payload.attempts && typeof payload.attempts === 'object') Object.entries(payload.attempts).forEach(function(entry) {
      const c = byId.get(entry[0]);
      if (c && validAttemptRecord(entry[1],c) && (!attempts[entry[0]] || entry[1].count >= attempts[entry[0]].count)) attempts[entry[0]] = entry[1];
    });
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
    }
    save(stablePrefix + '-favorites',favorites);
    save(stablePrefix + '-completed',completed);
    save(storagePrefix + '-correct',correct);
    save(storagePrefix + '-reviewed',reviewed);
    save(attemptsKey,attempts);
    Object.entries(notes).forEach(function(entry) { if (entry[1].trim()) localStorage.setItem(stablePrefix + '-note-' + entry[0],entry[1]); });
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
  renderTraining();
  updateLocation();
}
function setMode(mode) {
  if (session.mode === mode) return;
  session.mode = mode;
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
  renderAnswerPanel(); updateStats();
};
$('#openCurrentDetail').onclick = function() { showDetail(currentCase().id); };
$('#prevCase').onclick = function() { moveQuestion(-1); };
$('#nextCase').onclick = function() {
  if (session.cursor === session.queue.length-1) summary(); else moveQuestion(1);
};
$('#jumpCase').onchange = function(e) { session.cursor = Number(e.target.value); renderTraining(); updateLocation(); };
$$('[data-mode]').forEach(function(b) { b.onclick = function() { setMode(b.dataset.mode); }; });
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
$('#loadMoreCases').onclick = function() { atlasLimit += 48; renderCases(); };
$('#quizFiltered').onclick = function() { startTraining(filteredCases().map(function(c) { return c.id; }), 'quiz'); };
$('#studyFiltered').onclick = function() { startTraining(filteredCases().map(function(c) { return c.id; }), 'study'); };
$('#quickTen').onclick = function() { startTraining(sample(filteredCases().map(function(c) { return c.id; }),10), 'quiz','custom'); };
$('#studyWrong').onclick = function() { startTraining(mistakeIds(), 'study'); };
$('#reviewWrong').onclick = function() { startTraining(mistakeIds(), 'quiz'); };
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
  const el = e.target.closest('[data-detail],[data-quiz],[data-study],[data-favorite],[data-clear],[data-summary-config]');
  if (!el || el.disabled) return;
  e.preventDefault();
  if (el.dataset.detail) showDetail(el.dataset.detail);
  else if (el.dataset.quiz) startAt(el.dataset.quiz, 'quiz');
  else if (el.dataset.study) startAt(el.dataset.study, 'study');
  else if (el.dataset.favorite) toggleFavorite(el.dataset.favorite);
  else if (el.hasAttribute('data-clear')) clearFilters();
  else openQueue();
});
document.addEventListener('keydown', function(e) {
  if ($('#queueDialog').open) return;
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
  const requested = cases[index];
  if (requested) {
    if (params.get('view') === 'caseDetail') { showDetail(requested.id); return; }
    if (!session.queue.includes(requested.id)) session.queue = ids.slice();
    session.cursor = session.queue.indexOf(requested.id);
    if (['quiz','study'].includes(params.get('mode'))) session.mode = params.get('mode');
    renderTraining(); showView('viewer'); return;
  }
  renderTraining();
  showView(['home','cases','viewer','dicom','progress'].includes(params.get('view')) ? params.get('view') : 'home');
}
window.addEventListener('popstate',route);
updateStats();
renderCases();
renderDicomStudies();
route();
