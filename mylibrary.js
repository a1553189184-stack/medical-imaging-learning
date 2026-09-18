'use strict';
// 我的影像库：本地 DICOM 导入 + 个人病例 + 知识卡片（Flashcard）+ 每日学习计划
// 设计参考：知影 App 的"个人影像库 + 知识卡片 + 先复习再学习"模式
// 数据全部保存在本机：元数据/卡片/计划在 localStorage，DICOM 文件二进制在 IndexedDB

const LIB_PREFIX = 'yys-mylib-v1';
const LIB_DB_NAME = 'yys-mylib-db';
const LIB_STORE = 'files';

const lib = function (s) { return document.querySelector(s); };
const lib$$ = function (s) { return Array.from(document.querySelectorAll(s)); };
const libEsc = function (v) {
  return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
  });
};
function libUid() {
  return (globalThis.crypto && globalThis.crypto.randomUUID)
    ? globalThis.crypto.randomUUID()
    : 'c-' + Date.now() + '-' + Math.random().toString(16).slice(2);
}

// ---------- IndexedDB：存 DICOM 文件二进制 ----------
let libDbPromise = null;
function libOpenDb() {
  if (libDbPromise) return libDbPromise;
  libDbPromise = new Promise(function (resolve, reject) {
    const req = indexedDB.open(LIB_DB_NAME, 1);
    req.onupgradeneeded = function () {
      const db = req.result;
      if (!db.objectStoreNames.contains(LIB_STORE)) db.createObjectStore(LIB_STORE, { keyPath: 'id' });
    };
    req.onsuccess = function () { resolve(req.result); };
    req.onerror = function () { reject(req.error); };
  });
  return libDbPromise;
}
async function libIdbPut(id, files) {
  const db = await libOpenDb();
  return new Promise(function (resolve, reject) {
    const tx = db.transaction(LIB_STORE, 'readwrite');
    tx.objectStore(LIB_STORE).put({ id: id, files: files });
    tx.oncomplete = function () { resolve(); };
    tx.onerror = function () { reject(tx.error); };
  });
}
async function libIdbGet(id) {
  const db = await libOpenDb();
  return new Promise(function (resolve, reject) {
    const req = db.transaction(LIB_STORE).objectStore(LIB_STORE).get(id);
    req.onsuccess = function () { resolve(req.result ? req.result.files : null); };
    req.onerror = function () { reject(req.error); };
  });
}
async function libIdbDelete(id) {
  const db = await libOpenDb();
  return new Promise(function (resolve, reject) {
    const tx = db.transaction(LIB_STORE, 'readwrite');
    tx.objectStore(LIB_STORE).delete(id);
    tx.oncomplete = function () { resolve(); };
    tx.onerror = function () { reject(tx.error); };
  });
}

// ---------- localStorage：元数据 / 卡片 / 计划 ----------
function libRead(key, fallback) {
  try {
    const raw = localStorage.getItem(LIB_PREFIX + key);
    return raw === null ? fallback : JSON.parse(raw);
  } catch { return fallback; }
}
function libSave(key, value) {
  try { localStorage.setItem(LIB_PREFIX + key, JSON.stringify(value)); } catch {}
}

function sanitizeCase(c) {
  if (!c || typeof c !== 'object' || typeof c.id !== 'string') return null;
  return {
    id: c.id,
    title: typeof c.title === 'string' ? c.title.slice(0, 120) : '未命名病例',
    system: ['胸部', '神经', '腹部', '骨骼', '其他'].includes(c.system) ? c.system : '其他',
    modality: typeof c.modality === 'string' ? c.modality.slice(0, 20) : 'DICOM',
    note: typeof c.note === 'string' ? c.note.slice(0, 8000) : '',
    fileCount: Math.max(0, Number(c.fileCount) || 0),
    createdAt: typeof c.createdAt === 'string' ? c.createdAt.slice(0, 40) : new Date().toISOString()
  };
}
function sanitizeCard(card) {
  if (!card || typeof card !== 'object' || typeof card.id !== 'string') return null;
  return {
    id: card.id,
    caseId: typeof card.caseId === 'string' ? card.caseId : '',
    front: typeof card.front === 'string' ? card.front.slice(0, 500) : '',
    back: typeof card.back === 'string' ? card.back.slice(0, 4000) : '',
    grade: ['again', 'hard', 'good', 'easy'].includes(card.grade) ? card.grade : 'again',
    due: typeof card.due === 'string' ? card.due.slice(0, 40) : new Date().toISOString(),
    lapses: Math.max(0, Number(card.lapses) || 0),
    createdAt: typeof card.createdAt === 'string' ? card.createdAt.slice(0, 40) : new Date().toISOString()
  };
}

let myCases = (libRead('-cases', []) || []).map(sanitizeCase).filter(Boolean);
let myCards = (libRead('-cards', []) || []).map(sanitizeCard).filter(Boolean);
let myPlan = Object.assign(
  { dailyNew: 10, dailyReview: 20, lastActiveDate: '', newDoneToday: 0, reviewDoneToday: 0 },
  libRead('-plan', {})
);

function libPersist() {
  libSave('-cases', myCases);
  libSave('-cards', myCards);
  libSave('-plan', myPlan);
}

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}
function rolloverDaily() {
  const today = todayKey();
  if (myPlan.lastActiveDate !== today) {
    myPlan.lastActiveDate = today;
    myPlan.newDoneToday = 0;
    myPlan.reviewDoneToday = 0;
  }
}

// ---------- 导入 DICOM ----------
const libSystems = ['胸部', '神经', '腹部', '骨骼', '其他'];

function handleImportDicom(fileList) {
  const files = Array.from(fileList || []).filter(function (f) {
    return f && f.size > 0;
  });
  if (!files.length) {
    libToast('请选择至少一个 .dcm 文件');
    return;
  }
  // 让用户先填写元信息
  const title = prompt('给这个检查起个名字（例如：左膝关节 MRI - 某同学）：', '本地 DICOM 检查 ' + new Date().toLocaleString());
  if (title === null) return;
  const systemPick = prompt('所属系统：1=胸部 2=神经 3=腹部 4=骨骼 5=其他（输入数字）', '4');
  const sysIdx = Math.max(1, Math.min(5, Number(systemPick) || 5)) - 1;
  const caseId = libUid();
  const record = {
    id: caseId,
    title: title.trim() || '未命名病例',
    system: libSystems[sysIdx],
    modality: guessModality(files),
    note: '',
    fileCount: files.length,
    createdAt: new Date().toISOString()
  };
  myCases.unshift(record);
  libPersist();
  libIdbPut(caseId, files).then(function () {
    renderMyLibrary();
    libToast('已导入 ' + files.length + ' 个文件');
    // 立即打开查看
    openCaseInViewer(record, files);
  }).catch(function (e) {
    console.error('IndexedDB 写入失败', e);
    libToast('文件保存失败：' + (e && e.message ? e.message : e));
  });
}

function guessModality(files) {
  const names = files.map(function (f) { return f.name.toLowerCase(); }).join(' ');
  if (/mr|mri/.test(names)) return 'MRI';
  if (/ct/.test(names)) return 'CT';
  if (/xr|x-ray|dr|cr/.test(names)) return 'X 线';
  if (/us|ultra/.test(names)) return '超声';
  if (/pt|pet/.test(names)) return 'PET';
  return 'DICOM';
}

// ---------- 打开病例（复用已构建的 CornerstonePilot.openLocalFiles） ----------
let cornerstoneLibPromise = null;
function openCaseInViewer(record, filesOverride) {
  const open = function (files) {
    if (!files || !files.length) {
      libToast('该病例的影像文件未找到（可能已被浏览器清除）。请重新导入。');
      return;
    }
    cornerstoneLibPromise = cornerstoneLibPromise || import('./assets/cornerstone/viewer.js?v=mylib1');
    cornerstoneLibPromise.then(function () {
      window.CornerstonePilot.openLocalFiles(files, {
        title: record.title,
        system: record.system,
        modality: record.modality
      });
    }).catch(function (e) {
      cornerstoneLibPromise = null;
      console.error('Cornerstone 加载失败', e);
      libToast('影像引擎加载失败，请刷新重试');
    });
  };
  if (filesOverride) {
    open(filesOverride);
  } else {
    libIdbGet(record.id).then(open).catch(function () {
      libToast('读取本地文件失败');
    });
  }
}

// ---------- 删除病例 ----------
function deleteCase(caseId) {
  const rec = myCases.find(function (c) { return c.id === caseId; });
  if (!rec) return;
  if (!confirm('删除病例「' + rec.title + '」及其 ' + rec.fileCount + ' 个本地文件？此操作不可撤销。')) return;
  myCases = myCases.filter(function (c) { return c.id !== caseId; });
  myCards = myCards.filter(function (card) { return card.caseId !== caseId; });
  libPersist();
  libIdbDelete(caseId).catch(function (e) { console.error(e); });
  renderMyLibrary();
}

// ---------- 新增知识卡片 ----------
function addCardForCase(caseId) {
  const front = prompt('卡片正面（问题/提示）：', '这个病例的关键影像征象是什么？');
  if (front === null) return;
  const back = prompt('卡片背面（答案/要点）：', '');
  if (back === null) return;
  const card = {
    id: libUid(),
    caseId: caseId,
    front: front.trim(),
    back: back.trim(),
    grade: 'again',
    due: new Date().toISOString(),
    lapses: 0,
    createdAt: new Date().toISOString()
  };
  myCards.push(card);
  libPersist();
  renderMyLibrary();
}

// ---------- 间隔重复（SM-2 简化） ----------
const GRADE_INTERVAL = { again: 0.5, hard: 1, good: 3, easy: 7 }; // 天
function scheduleCard(card, grade) {
  card.grade = grade;
  if (grade === 'again') {
    card.lapses = (card.lapses || 0) + 1;
    card.due = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 分钟后
  } else {
    const mult = { hard: 0.6, good: 1, easy: 1.4 }[grade];
    const base = (GRADE_INTERVAL[grade] || 1) * Math.max(1, card.lapses || 0 + 1);
    card.due = new Date(Date.now() + base * 24 * 60 * 60 * 1000 * mult).toISOString();
  }
}

// ---------- 今日队列 ----------
function dueToday() {
  const now = new Date().toISOString();
  return myCards.filter(function (c) { return c.due <= now; });
}
function newCards() {
  return myCards.filter(function (c) { return !c.seen; });
}

// ---------- 卡片学习会话 ----------
let sessionCards = [];
let sessionIdx = 0;
let sessionMode = 'review'; // review | new

function startReviewSession() {
  const due = dueToday();
  if (!due.length) {
    libToast('今日没有到期的复习卡片');
    return;
  }
  sessionMode = 'review';
  sessionCards = due;
  sessionIdx = 0;
  showCardDialog();
}
function startNewSession() {
  const fresh = newCards().slice(0, Math.max(1, myPlan.dailyNew));
  if (!fresh.length) {
    libToast('没有新卡片可学');
    return;
  }
  sessionMode = 'new';
  sessionCards = fresh;
  sessionIdx = 0;
  showCardDialog();
}

function showCardDialog() {
  const dialog = lib('#cardDialog');
  if (!dialog) return;
  renderCurrentCard();
  if (!dialog.open) dialog.showModal();
}
function closeCardDialog() {
  const dialog = lib('#cardDialog');
  if (dialog && dialog.open) dialog.close();
  libPersist();
  renderMyLibrary();
}
function renderCurrentCard() {
  const card = sessionCards[sessionIdx];
  const frontEl = lib('#cardFront');
  const backEl = lib('#cardBack');
  const progressEl = lib('#cardProgress');
  const revealBtn = lib('#cardReveal');
  const gradeRow = lib('#cardGradeRow');
  if (!card) {
    frontEl.innerHTML = '<b>本轮完成 🎉</b>';
    backEl.innerHTML = '';
    progressEl.textContent = sessionCards.length + ' / ' + sessionCards.length;
    revealBtn.hidden = true;
    gradeRow.hidden = true;
    return;
  }
  const caseRec = myCases.find(function (c) { return c.id === card.caseId; });
  frontEl.innerHTML = '<span class="eyebrow">' + libEsc(caseRec ? caseRec.title : '独立卡片') + '</span><p>' + libEsc(card.front) + '</p>';
  backEl.innerHTML = '<p>' + libEsc(card.back || '（无背面内容）') + '</p>';
  backEl.hidden = true;
  progressEl.textContent = (sessionIdx + 1) + ' / ' + sessionCards.length;
  revealBtn.hidden = false;
  gradeRow.hidden = true;
  revealBtn.onclick = function () {
    backEl.hidden = false;
    revealBtn.hidden = true;
    gradeRow.hidden = false;
  };
  gradeRow.querySelectorAll('button[data-grade]').forEach(function (btn) {
    btn.onclick = function () {
      const grade = btn.dataset.grade;
      scheduleCard(card, grade);
      card.seen = true;
      if (sessionMode === 'review') myPlan.reviewDoneToday += 1;
      else myPlan.newDoneToday += 1;
      libPersist();
      sessionIdx += 1;
      renderCurrentCard();
    };
  });
}

// ---------- 渲染个人影像库视图 ----------
function renderMyLibrary() {
  rolloverDaily();
  const list = lib('#myCaseList');
  if (!list) return;

  // 统计
  const due = dueToday();
  const fresh = newCards();
  lib('#libDueCount').textContent = due.length;
  lib('#libNewCount').textContent = fresh.length;
  lib('#libCaseCount').textContent = myCases.length;
  lib('#libCardCount').textContent = myCards.length;
  lib('#libTodayNew').textContent = myPlan.newDoneToday + ' / ' + myPlan.dailyNew;
  lib('#libTodayReview').textContent = myPlan.reviewDoneToday + ' / ' + myPlan.dailyReview;

  // 病例列表
  if (!myCases.length) {
    list.innerHTML = '<div class="lib-empty"><b>还没有导入病例</b><p>点击上方"导入 DICOM 文件"，选择本机的 .dcm 影像文件，即可建立你的个人影像库。</p></div>';
  } else {
    list.innerHTML = myCases.map(function (c) {
      const cardCount = myCards.filter(function (card) { return card.caseId === c.id; }).length;
      return '<article class="lib-card">' +
        '<div class="lib-card-head"><b>' + libEsc(c.title) + '</b><span class="lib-badge">' + libEsc(c.system) + ' · ' + libEsc(c.modality) + '</span></div>' +
        '<div class="lib-card-meta">' + c.fileCount + ' 个文件 · ' + cardCount + ' 张卡片 · ' + libEsc((c.createdAt || '').slice(0, 10)) + '</div>' +
        (c.note ? '<p class="lib-note">' + libEsc(c.note) + '</p>' : '') +
        '<div class="lib-card-actions">' +
          '<button class="soft-button" data-lib-open="' + c.id + '">打开阅片</button>' +
          '<button class="soft-button" data-lib-card="' + c.id + '">+ 知识卡片</button>' +
          '<button class="soft-button" data-lib-edit-note="' + c.id + '">编辑笔记</button>' +
          '<button class="soft-button" data-lib-delete="' + c.id + '">删除</button>' +
        '</div>' +
      '</article>';
    }).join('');
  }
}

// ---------- 事件绑定 ----------
function bindLibrary() {
  // 导入按钮
  const importBtn = lib('#libImportBtn');
  const fileInput = lib('#libDicomFileInput');
  if (importBtn && fileInput) {
    importBtn.addEventListener('click', function () { fileInput.click(); });
    fileInput.addEventListener('change', function () {
      handleImportDicom(fileInput.files);
      fileInput.value = '';
    });
  }
  // 设置每日目标
  const newInput = lib('#libDailyNew');
  const reviewInput = lib('#libDailyReview');
  if (newInput) {
    newInput.value = myPlan.dailyNew;
    newInput.addEventListener('change', function () {
      myPlan.dailyNew = Math.max(1, Math.min(100, Number(newInput.value) || 10));
      newInput.value = myPlan.dailyNew;
      libPersist();
      renderMyLibrary();
    });
  }
  if (reviewInput) {
    reviewInput.value = myPlan.dailyReview;
    reviewInput.addEventListener('change', function () {
      myPlan.dailyReview = Math.max(1, Math.min(200, Number(reviewInput.value) || 20));
      reviewInput.value = myPlan.dailyReview;
      libPersist();
      renderMyLibrary();
    });
  }
  // 开始学习按钮
  const startReview = lib('#libStartReview');
  const startNew = lib('#libStartNew');
  if (startReview) startReview.addEventListener('click', startReviewSession);
  if (startNew) startNew.addEventListener('click', startNewSession);
  // 关闭卡片对话框
  const closeCard = lib('#closeCardDialog');
  if (closeCard) closeCard.addEventListener('click', closeCardDialog);
  // 病例操作（事件委托）
  document.addEventListener('click', function (e) {
    const openBtn = e.target.closest('[data-lib-open]');
    if (openBtn) {
      const rec = myCases.find(function (c) { return c.id === openBtn.dataset.libOpen; });
      if (rec) openCaseInViewer(rec);
      return;
    }
    const cardBtn = e.target.closest('[data-lib-card]');
    if (cardBtn) { addCardForCase(cardBtn.dataset.libCard); return; }
    const noteBtn = e.target.closest('[data-lib-edit-note]');
    if (noteBtn) {
      const rec = myCases.find(function (c) { return c.id === noteBtn.dataset.libEditNote; });
      if (rec) {
        const note = prompt('笔记（可记录征象、鉴别诊断、复习要点）：', rec.note || '');
        if (note !== null) {
          rec.note = note;
          libPersist();
          renderMyLibrary();
        }
      }
      return;
    }
    const delBtn = e.target.closest('[data-lib-delete]');
    if (delBtn) { deleteCase(delBtn.dataset.libDelete); return; }
  });
}

function libToast(msg) {
  const notice = lib('#notice');
  if (!notice) { console.log('[lib]', msg); return; }
  notice.textContent = msg;
  notice.classList.add('visible');
  clearTimeout(libToast._t);
  libToast._t = setTimeout(function () { notice.classList.remove('visible'); }, 2500);
}

// ---------- 初始化 ----------
document.addEventListener('DOMContentLoaded', function () {
  bindLibrary();
  renderMyLibrary();
});
// 如果 DOM 已就绪（脚本在 body 末尾）
if (document.readyState !== 'loading') {
  bindLibrary();
  renderMyLibrary();
}
window.__myLib = { render: renderMyLibrary };
