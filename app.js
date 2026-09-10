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
let favorites = validIndices(read(storagePrefix + '-favorites', []));
let completed = validIndices(read(storagePrefix + '-completed', []));
let correct = Math.max(0, Math.min(Number(read(storagePrefix + '-correct', 0)) || 0, completed.length));
let reviewed = validIds(read(storagePrefix + '-reviewed', []));
const notes = {};
cases.forEach(function(c, i) {
  try { notes[c.id] = localStorage.getItem(storagePrefix + '-note-' + i) || ''; } catch { notes[c.id] = ''; }
});
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
let atlasSystem = 'all', noticeTimer, draftRows = [], draftSelected = new Set();
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
  if (!['home','cases','caseDetail','viewer','progress'].includes(view)) view = 'home';
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
  if (view === 'progress') updateStats();
  if (updateUrl) updateLocation();
  window.scrollTo(0, 0);
}
function filteredCases() {
  const query = $('#globalSearch').value.trim().toLocaleLowerCase();
  return cases.filter(function(c, i) {
    const searchText = [c.title,c.english,c.system,c.modality,c.history,c.explain,c.differential,c.pearl,c.recall]
      .concat(c.tags,c.findings,c.tips,c.pitfalls,c.methods.flat()).join(' ').toLocaleLowerCase();
    const modality = $('#modalityFilter').value;
    const level = $('#levelFilter').value;
    const status = $('#statusFilter').value;
    return (atlasSystem === 'all' || c.system === atlasSystem || (atlasSystem === 'favorite' && favorites.includes(i))) &&
      (modality === 'all' || c.modality === modality || (modality === 'CT' && c.modality === 'CTPA')) &&
      (level === 'all' || c.level === level) &&
      (status === 'all' || (status === 'completed' && completed.includes(i)) ||
        (status === 'unanswered' && !completed.includes(i)) || (status === 'reviewed' && reviewed.includes(c.id)) || (status === 'mistakes' && isMistake(c))) &&
      (!query || searchText.includes(query));
  });
}
function tags(c) { return '<div class="case-tags">' + c.tags.map(function(t) { return '<span>' + esc(t) + '</span>'; }).join('') + '</div>'; }
function renderCases() {
  const list = filteredCases();
  $('#caseTotal').textContent = cases.length;
  $('#filterCount').textContent = '显示 ' + list.length + ' / ' + cases.length + ' 例';
  $('#studyFiltered').disabled = $('#quizFiltered').disabled = list.length === 0;
  $('#caseList').innerHTML = list.map(function(c) {
    const i = cases.indexOf(c), isFav = favorites.includes(i);
    return '<article class="atlas-card" data-id="' + c.id + '">' +
      '<a href="?view=caseDetail&amp;case=' + i + '" data-detail="' + c.id + '" class="atlas-photo" aria-label="查看' + esc(c.title) + '详情">' +
      '<img src="' + c.image + '" alt="' + esc(c.title) + '" loading="lazy"><span>' + esc(c.modality) + '</span></a>' +
      '<div class="atlas-card-body"><div class="atlas-card-meta"><span>' + c.system + ' · ' + c.level + '</span>' +
      '<button class="bookmark" data-favorite="' + c.id + '" aria-label="' + (isFav ? '取消收藏' : '收藏') + esc(c.title) + '" aria-pressed="' + isFav + '">' + (isFav ? '★' : '☆') + '</button></div>' +
      '<h2><a href="?view=caseDetail&amp;case=' + i + '" data-detail="' + c.id + '">' + esc(c.title) + '</a></h2><p class="english-name">' + esc(c.english) + '</p>' +
      tags(c) + '<p class="atlas-clue"><b>诊断要点</b>' + esc(c.recall) + '</p>' +
      '<div class="case-status">' + (completed.includes(i) ? '<span>已答题</span>' : '<span>未答题</span>') + (reviewed.includes(c.id) ? '<span>已背题</span>' : '') + (isMistake(c) ? '<span class="needs-review">待复习错题</span>' : '') + '</div>' +
      '<div class="card-buttons"><button class="soft-button" data-detail="' + c.id + '">诊断方法与详情</button><button class="soft-button" data-study="' + c.id + '">背题</button><button class="soft-button" data-quiz="' + c.id + '">答题</button></div></div></article>';
  }).join('') || '<div class="empty-state"><b>没有符合条件的病例</b><p>试着减少筛选条件，或搜索另一种征象。</p><button class="soft-button" data-clear>重置筛选</button></div>';
}
const licenseLinks = {'CC BY-SA 3.0':'https://creativecommons.org/licenses/by-sa/3.0/','CC BY-SA 4.0':'https://creativecommons.org/licenses/by-sa/4.0/','CC BY 2.0':'https://creativecommons.org/licenses/by/2.0/','CC BY 2.5':'https://creativecommons.org/licenses/by/2.5/','CC BY 4.0':'https://creativecommons.org/licenses/by/4.0/','CC0':'https://creativecommons.org/publicdomain/zero/1.0/'};
function creditHTML(c) {
  return '<a href="' + c.sourceUrl + '" target="_blank" rel="noopener">' + esc(c.source) + ' ↗</a><a href="' + licenseLinks[c.license] + '" target="_blank" rel="noopener">' + c.license + '</a>';
}
function knowledgeHTML(c) {
  const list = function(items) { return '<ul>' + items.map(function(t) { return '<li>' + esc(t) + '</li>'; }).join('') + '</ul>'; };
  return '<div class="knowledge">' +
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
    '<div class="detail-actions"><button class="primary" data-study="' + id + '">背诵本例</button><button class="soft-button" data-quiz="' + id + '">练习本例</button><button class="soft-button" data-favorite="' + id + '" aria-pressed="' + favorites.includes(i) + '">' + (favorites.includes(i) ? '★ 已收藏' : '☆ 收藏') + '</button></div>' +
    '<div class="panel context-panel"><h3>教学情境</h3><p>' + esc(c.history) + '</p><small>情境为教学编写，不代表原图患者病史。</small></div>' +
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
  const index = cases.indexOf(c);
  if (!completed.includes(index)) {
    if (selected === c.answer) correct++;
    completed.push(index);
    save(storagePrefix + '-completed', completed);
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
  const saved = favorites.includes(cases.indexOf(currentCase()));
  $('#favoriteCase').textContent = saved ? '★ 已收藏' : '☆ 收藏';
  $('#favoriteCase').classList.toggle('saved', saved);
  $('#favoriteCase').setAttribute('aria-pressed', saved);
}
function toggleFavorite(id) {
  const i = cases.indexOf(byId.get(id));
  if (i < 0) return;
  favorites = favorites.includes(i) ? favorites.filter(function(n) { return n !== i; }) : favorites.concat(i);
  save(storagePrefix + '-favorites', favorites);
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
    const done = completed.filter(function(i) { return cases[i].system === row.dataset.system; }).length;
    row.querySelector('i').style.width = (total ? done / total * 100 : 0) + '%';
    row.querySelector('span').textContent = done + ' / ' + total;
  });
}
function openQueue() {
  draftRows = session.queue.concat(ids.filter(function(id) { return !session.queue.includes(id); }));
  draftSelected = new Set(session.queue);
  $('#draftMode').value = session.mode;
  $('#draftOrder').value = 'custom';
  renderDraft();
  $('#queueDialog').showModal();
}
function renderDraft() {
  let count = 0;
  $('#queueList').innerHTML = draftRows.map(function(id, index) {
    const c = byId.get(id), checked = draftSelected.has(id);
    if (checked) count++;
    return '<li data-id="' + id + '" class="' + (checked ? 'chosen' : '') + '"><span class="queue-number">' + (checked ? count : '—') + '</span>' +
      '<label><input type="checkbox" data-select="' + id + '"' + (checked ? ' checked' : '') + '><span><b>' + esc(c.title) + '</b><small>' + c.system + ' · ' + c.modality + '</small></span></label>' +
      '<div><button class="soft-button" data-move="-1" data-id="' + id + '" aria-label="上移' + esc(c.title) + '"' + (index === 0 ? ' disabled' : '') + '>↑</button>' +
      '<button class="soft-button" data-move="1" data-id="' + id + '" aria-label="下移' + esc(c.title) + '"' + (index === draftRows.length - 1 ? ' disabled' : '') + '>↓</button></div></li>';
  }).join('');
  $('#selectionCount').textContent = '已选择 ' + draftSelected.size + ' / ' + cases.length + ' 题';
  $('#applyQueue').disabled = draftSelected.size === 0;
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
    const key = storagePrefix + '-note-' + cases.indexOf(c);
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
$$('[data-preset]').forEach(function(b) { b.onclick = function() {
  const preset = b.dataset.preset;
  const chosen = preset === 'all' ? ids : preset === 'filtered' ? filteredCases().map(function(c) { return c.id; }) :
    preset === 'favorites' ? favorites.map(function(i) { return cases[i].id; }) : preset === 'mistakes' ? mistakeIds() : [];
  draftSelected = new Set(chosen);
  draftRows = chosen.concat(ids.filter(function(id) { return !draftSelected.has(id); }));
  renderDraft();
}; });
function clearFilters() {
  atlasSystem = 'all';
  $('#globalSearch').value = '';
  ['#modalityFilter','#levelFilter','#statusFilter'].forEach(function(s) { $(s).value = 'all'; });
  $$('.filters button').forEach(function(b) { b.classList.toggle('active',b.dataset.filter === 'all'); });
  renderCases();
}
$('#clearFilters').onclick = clearFilters;
$$('.filters button').forEach(function(b) { b.onclick = function() {
  atlasSystem = b.dataset.filter;
  $$('.filters button').forEach(function(x) { x.classList.toggle('active',x === b); });
  renderCases();
}; });
['#modalityFilter','#levelFilter','#statusFilter'].forEach(function(s) { $(s).onchange = renderCases; });
$('#globalSearch').oninput = function() { showView('cases'); };
$('#quizFiltered').onclick = function() { startTraining(filteredCases().map(function(c) { return c.id; }), 'quiz'); };
$('#studyFiltered').onclick = function() { startTraining(filteredCases().map(function(c) { return c.id; }), 'study'); };
$('#studyWrong').onclick = function() { startTraining(mistakeIds(), 'study'); };
$('#reviewWrong').onclick = function() { startTraining(mistakeIds(), 'quiz'); };
$('#randomCase').onclick = function() { startTraining(filteredCases().map(function(c) { return c.id; }), 'quiz', 'random'); };
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
  showView(['home','cases','viewer','progress'].includes(params.get('view')) ? params.get('view') : 'home');
}
window.addEventListener('popstate',route);
updateStats();
renderCases();
route();
