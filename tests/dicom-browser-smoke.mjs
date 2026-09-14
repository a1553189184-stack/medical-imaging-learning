import assert from 'node:assert/strict';
import fs from 'node:fs';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';

const siteUrl = process.env.SITE_URL || 'http://127.0.0.1:4173/?view=dicom';
const candidates = process.platform === 'win32' ? [
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
] : ['/usr/bin/google-chrome','/usr/bin/chromium','/usr/bin/chromium-browser'];
const chrome = candidates.find(candidate => fs.existsSync(candidate));
assert.ok(chrome, 'Chrome or Edge is required for DICOM browser testing');

const debuggingPort = await new Promise((resolve, reject) => {
  const server = net.createServer();
  server.once('error', reject);
  server.listen(0, '127.0.0.1', () => {
    const port = server.address().port;
    server.close(() => resolve(port));
  });
});
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'dicom-browser-'));
const browser = spawn(chrome, [
  '--headless=new', '--no-first-run', '--no-default-browser-check',
  '--use-angle=swiftshader', `--remote-debugging-port=${debuggingPort}`,
  `--user-data-dir=${profile}`, siteUrl
], { stdio: 'ignore' });

const delay = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds));
let socket;
try {
  let target;
  for (let attempt = 0; attempt < 60; attempt += 1) {
    try {
      const targets = await fetch(`http://127.0.0.1:${debuggingPort}/json/list`).then(response => response.json());
      target = targets.find(item => item.type === 'page' && item.url.startsWith('http://127.0.0.1:4173/'));
      if (target) break;
    } catch {}
    await delay(100);
  }
  assert.ok(target, 'browser target did not become ready');
  socket = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = reject; });
  let sequence = 0;
  const pending = new Map();
  const runtimeErrors = [];
  const networkNotes = [];
  socket.onmessage = event => {
    const message = JSON.parse(event.data);
    if (message.id && pending.has(message.id)) {
      const task = pending.get(message.id);
      pending.delete(message.id);
      if (message.error) task.reject(new Error(message.error.message)); else task.resolve(message.result);
    }
    if (message.method === 'Runtime.exceptionThrown') runtimeErrors.push(message.params.exceptionDetails.text);
    if (message.method === 'Network.responseReceived' && message.params.response.url.includes('imaging.datacommons')) {
      networkNotes.push(`${message.params.response.status} ${message.params.response.mimeType} ${message.params.response.url.slice(-90)}`);
    }
    if (message.method === 'Network.loadingFailed') networkNotes.push(`FAILED ${message.params.errorText}`);
  };
  const command = (method, params = {}) => new Promise((resolve, reject) => {
    const id = ++sequence;
    pending.set(id, { resolve, reject });
    socket.send(JSON.stringify({ id, method, params }));
  });
  const evaluate = async expression => {
    const result = await command('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
    if (result.exceptionDetails) throw new Error(result.exceptionDetails.text);
    return result.result.value;
  };
  await command('Runtime.enable');
  await command('Network.enable');
  await command('Page.enable');
  for (let attempt = 0; attempt < 60; attempt += 1) {
    if (await evaluate("document.querySelectorAll('[data-dicom-open]').length === 20")) break;
    await delay(100);
  }
  // The third pilot is a CT stack; this verifies real multi-slice behavior,
  // not merely that a single CR image can be painted.
  await evaluate("document.querySelectorAll('[data-dicom-open]')[2].click()");
  let loaded = false;
  let lastState;
  for (let attempt = 0; attempt < 240; attempt += 1) {
    const state = await evaluate(`({
      open: document.querySelector('#cornerstoneDialog').open,
      error: !document.querySelector('#cornerstoneError').hidden,
      ready: document.querySelector('#cornerstoneStatus').hidden && !!document.querySelector('#cornerstoneViewport canvas'),
      position: document.querySelector('#cornerstonePosition').textContent,
      status: document.querySelector('#cornerstoneStatus').textContent,
      canvas: !!document.querySelector('#cornerstoneViewport canvas'),
      notice: document.querySelector('#notice').textContent,
      api: !!window.CornerstonePilot,
      moduleError: window.cornerstoneModuleError || ''
    })`);
    lastState = state;
    if (!state.open) { await delay(250); continue; }
    if (state.error) throw new Error(await evaluate("document.querySelector('#cornerstoneError').textContent"));
    if (state.ready && !state.position.startsWith('—')) { loaded = true; break; }
    await delay(250);
  }
  assert.equal(loaded, true, `real IDC image did not render within 60 seconds: ${JSON.stringify(lastState)}; runtime=${runtimeErrors.join(' | ')}; network=${networkNotes.join(' | ')}`);
  assert.ok(await evaluate("document.querySelector('#cornerstoneSeries').options.length >= 1"));
  assert.match(await evaluate("document.querySelector('#cornerstonePosition').textContent"), /^\d+ \/ \d+$/);
  assert.ok(await evaluate("Number(document.querySelector('#cornerstonePosition').textContent.split('/')[1]) > 1"));
  await evaluate("document.querySelector('[data-cs-tool=length]').click()");
  assert.equal(await evaluate("document.querySelector('[data-cs-tool=length]').getAttribute('aria-pressed')"), 'true');
  if (process.env.DICOM_SCREENSHOT) {
    const screenshot = await command('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(process.env.DICOM_SCREENSHOT, Buffer.from(screenshot.data, 'base64'));
  }
  await command('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  assert.equal(await evaluate("document.querySelector('#cornerstoneDialog').getBoundingClientRect().width <= 390"), true);
  assert.equal(await evaluate("document.documentElement.scrollWidth <= window.innerWidth"), true);
  assert.deepEqual(runtimeErrors, []);
  console.log('Cornerstone3D opened a real IDC series and activated measurement tools.');
} finally {
  if (socket && socket.readyState < 2) socket.close();
  browser.kill();
  await Promise.race([new Promise(resolve => browser.once('exit', resolve)), delay(2000)]);
  fs.rmSync(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
}
