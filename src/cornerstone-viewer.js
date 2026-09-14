import { RenderingEngine, Enums as CoreEnums, init as initCornerstone } from '@cornerstonejs/core';
import dicomImageLoader from '@cornerstonejs/dicom-image-loader';
import {
  Enums as ToolEnums,
  ToolGroupManager,
  WindowLevelTool,
  PanTool,
  ZoomTool,
  StackScrollTool,
  LengthTool,
  addTool,
  annotation,
  init as initTools
} from '@cornerstonejs/tools';

const ENGINE_ID = 'yys-cornerstone-engine';
const VIEWPORT_ID = 'yys-dicom-stack';
const TOOL_GROUP_ID = 'yys-dicom-tools';
const supportedModalities = new Set(['CT', 'MR', 'CR', 'DX', 'MG', 'PT', 'NM', 'US']);
const toolMap = { window: WindowLevelTool, pan: PanTool, zoom: ZoomTool, length: LengthTool };

let initialized = false;
let renderingEngine;
let viewport;
let toolGroup;
let activeTool = 'window';
let serverRoot = '';
let currentStudy = null;
let loadToken = 0;

const dialog = document.querySelector('#cornerstoneDialog');
const element = document.querySelector('#cornerstoneViewport');
const status = document.querySelector('#cornerstoneStatus');
const errorBox = document.querySelector('#cornerstoneError');
const seriesSelect = document.querySelector('#cornerstoneSeries');
const position = document.querySelector('#cornerstonePosition');
const voi = document.querySelector('#cornerstoneVoi');

function dicomValue(record, tag, fallback = '') {
  const values = record && record[tag] && record[tag].Value;
  return Array.isArray(values) && values.length ? values[0] : fallback;
}

function safeText(value) {
  return String(value ?? '').replace(/[&<>"']/g, character => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[character]);
}

function setStatus(message) {
  status.textContent = message;
  status.hidden = false;
  errorBox.hidden = true;
}

function showError(error) {
  const message = error && error.message ? error.message : String(error);
  status.hidden = true;
  errorBox.hidden = false;
  errorBox.querySelector('p').textContent = message.includes('Failed to fetch')
    ? '无法连接 IDC DICOMweb。请检查网络后重试，或使用下方 OHIF 备用入口。'
    : `序列加载失败：${message}`;
}

async function fetchDicomJson(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);
  try {
    const response = await fetch(url, {
      headers: { Accept: 'application/dicom+json' },
      signal: controller.signal
    });
    if (!response.ok) throw new Error(`IDC 返回 HTTP ${response.status}`);
    return response.json();
  } catch (error) {
    if (error.name === 'AbortError') throw new Error('连接 IDC 超时');
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

function withTimeout(promise, milliseconds, message) {
  let timeout;
  return Promise.race([
    promise,
    new Promise((resolve, reject) => { timeout = setTimeout(() => reject(new Error(message)), milliseconds); })
  ]).finally(() => clearTimeout(timeout));
}

async function ensureInitialized() {
  if (initialized) return;
  setStatus('正在初始化医学影像引擎…');
  await initCornerstone();
  // Conservative pilot setting: a single decoder worker avoids corruption
  // seen with some compressed transfer syntaxes under parallel decoding.
  dicomImageLoader.init({ maxWebWorkers: 1 });
  await initTools();
  [WindowLevelTool, PanTool, ZoomTool, StackScrollTool, LengthTool].forEach(Tool => {
    try { addTool(Tool); } catch (error) {
      if (!String(error).includes('already')) throw error;
    }
  });

  renderingEngine = new RenderingEngine(ENGINE_ID);
  renderingEngine.enableElement({
    viewportId: VIEWPORT_ID,
    type: CoreEnums.ViewportType.STACK,
    element,
    defaultOptions: { background: [0.015, 0.02, 0.018] }
  });
  viewport = renderingEngine.getViewport(VIEWPORT_ID);
  toolGroup = ToolGroupManager.createToolGroup(TOOL_GROUP_ID);
  Object.values(toolMap).forEach(Tool => toolGroup.addTool(Tool.toolName));
  toolGroup.addTool(StackScrollTool.toolName);
  toolGroup.addViewport(VIEWPORT_ID, ENGINE_ID);
  toolGroup.setToolActive(StackScrollTool.toolName, {
    bindings: [{ mouseButton: ToolEnums.MouseBindings.Wheel }]
  });
  toolGroup.setToolActive(PanTool.toolName, {
    bindings: [{ mouseButton: ToolEnums.MouseBindings.Secondary }]
  });
  toolGroup.setToolActive(ZoomTool.toolName, {
    bindings: [{ mouseButton: ToolEnums.MouseBindings.Auxiliary }]
  });
  activateTool('window');
  element.addEventListener(CoreEnums.Events.STACK_NEW_IMAGE, updateOverlay);
  element.addEventListener(CoreEnums.Events.VOI_MODIFIED, updateOverlay);
  initialized = true;
}

function activateTool(name) {
  const Tool = toolMap[name];
  if (!toolGroup || !Tool) return;
  const previous = toolMap[activeTool];
  if (previous) toolGroup.setToolPassive(previous.toolName);
  toolGroup.setToolActive(Tool.toolName, {
    bindings: [{ mouseButton: ToolEnums.MouseBindings.Primary }]
  });
  activeTool = name;
  dialog.querySelectorAll('[data-cs-tool]').forEach(button => {
    const selected = button.dataset.csTool === name;
    button.classList.toggle('active', selected);
    button.setAttribute('aria-pressed', String(selected));
  });
}

function updateOverlay() {
  if (!viewport) return;
  const imageIds = viewport.getImageIds();
  const index = viewport.getCurrentImageIdIndex();
  position.textContent = imageIds.length ? `${index + 1} / ${imageIds.length}` : '— / —';
  const range = viewport.getProperties().voiRange;
  if (range && Number.isFinite(range.lower) && Number.isFinite(range.upper)) {
    voi.textContent = `W ${Math.round(range.upper - range.lower)} · L ${Math.round((range.upper + range.lower) / 2)}`;
  } else {
    voi.textContent = 'W/L 自动';
  }
}

function describeSeries(record, index) {
  const modality = dicomValue(record, '00080060', 'IMG');
  const description = dicomValue(record, '0008103E', `序列 ${index + 1}`);
  const number = dicomValue(record, '00200011', index + 1);
  return `${number} · ${modality} · ${description}`;
}

function isDiagnosticSeries(record) {
  const modality = String(dicomValue(record, '00080060')).toUpperCase();
  const description = String(dicomValue(record, '0008103E')).toUpperCase();
  return supportedModalities.has(modality) && !/(LOCALI[ZS]ER|SCOUT|SURVEY)/.test(description);
}

function buildImageIds(metadata, studyUid, seriesUid) {
  const sorted = metadata.slice().sort((a, b) =>
    Number(dicomValue(a, '00200013', 0)) - Number(dicomValue(b, '00200013', 0))
  );
  const imageIds = [];
  sorted.forEach(instance => {
    const sopUid = dicomValue(instance, '00080018');
    if (!sopUid) return;
    const frames = Math.max(1, Number(dicomValue(instance, '00280008', 1)) || 1);
    for (let frame = 1; frame <= frames; frame += 1) {
      const imageId = `wadors:${serverRoot}/studies/${encodeURIComponent(studyUid)}/series/${encodeURIComponent(seriesUid)}/instances/${encodeURIComponent(sopUid)}/frames/${frame}`;
      dicomImageLoader.wadors.metaDataManager.add(imageId, instance);
      imageIds.push(imageId);
    }
  });
  return imageIds;
}

async function loadSeries(seriesUid) {
  const token = ++loadToken;
  setStatus('正在读取序列元数据…');
  seriesSelect.disabled = true;
  try {
    const metadata = await fetchDicomJson(
      `${serverRoot}/studies/${encodeURIComponent(currentStudy.uid)}/series/${encodeURIComponent(seriesUid)}/metadata`
    );
    if (token !== loadToken) return;
    const imageIds = buildImageIds(metadata, currentStudy.uid, seriesUid);
    if (!imageIds.length) throw new Error('该序列没有可显示的影像帧');
    setStatus(`正在载入 ${imageIds.length} 个影像帧…`);
    await withTimeout(
      viewport.setStack(imageIds, Math.floor((imageIds.length - 1) / 2)),
      45000,
      '影像帧载入超时'
    );
    if (token !== loadToken) return;
    viewport.render();
    updateOverlay();
    status.hidden = true;
  } catch (error) {
    if (token === loadToken) showError(error);
  } finally {
    if (token === loadToken) seriesSelect.disabled = false;
  }
}

async function open(study) {
  if (!study || !study.uid) return;
  currentStudy = study;
  dialog.querySelector('#cornerstoneTitle').textContent = study.title;
  dialog.querySelector('#cornerstoneStudyMeta').textContent = `${study.system} · ${study.modality} · IDC ${study.collection} · ${study.subject}`;
  dialog.querySelector('#cornerstoneOhif').href = window.medicalImagingOhifUrl(study);
  if (!dialog.open) dialog.showModal();
  document.body.classList.add('dialog-open');
  try {
    await ensureInitialized();
    renderingEngine.resize(true, false);
    setStatus('正在查询检查内的序列…');
    const configResponse = await fetch(new URL('idc-dicomweb.json', location.href));
    if (!configResponse.ok) throw new Error('本站 DICOMweb 配置不可用');
    const config = await configResponse.json();
    serverRoot = config.servers.dicomWeb[0].qidoRoot.replace(/\/$/, '');
    const series = await fetchDicomJson(
      `${serverRoot}/studies/${encodeURIComponent(study.uid)}/series?includefield=all`
    );
    if (!series.length) throw new Error('IDC 未返回任何序列');
    seriesSelect.innerHTML = series.map((record, index) => {
      const uid = dicomValue(record, '0020000E');
      return `<option value="${safeText(uid)}">${safeText(describeSeries(record, index))}</option>`;
    }).join('');
    const preferred = series.find(isDiagnosticSeries) || series[0];
    seriesSelect.value = dicomValue(preferred, '0020000E');
    await loadSeries(seriesSelect.value);
  } catch (error) {
    showError(error);
  }
}

function close() {
  loadToken += 1;
  if (dialog.open) dialog.close();
  document.body.classList.remove('dialog-open');
}

seriesSelect.addEventListener('change', () => loadSeries(seriesSelect.value));
dialog.querySelector('#closeCornerstone').addEventListener('click', close);
dialog.querySelector('#retryCornerstone').addEventListener('click', () => open(currentStudy));
dialog.querySelector('[data-cs-action="reset"]').addEventListener('click', () => {
  if (!viewport) return;
  viewport.resetCamera();
  viewport.resetProperties();
  viewport.render();
  updateOverlay();
});
dialog.querySelector('[data-cs-action="clear"]').addEventListener('click', () => {
  annotation.state.removeAllAnnotations();
  if (viewport) viewport.render();
});
dialog.querySelectorAll('[data-cs-tool]').forEach(button => {
  button.addEventListener('click', () => activateTool(button.dataset.csTool));
});
dialog.addEventListener('close', () => document.body.classList.remove('dialog-open'));
dialog.addEventListener('click', event => {
  if (event.target === dialog) close();
});
window.addEventListener('resize', () => {
  if (initialized && dialog.open) renderingEngine.resize(true, false);
});

window.CornerstonePilot = { open, close };
