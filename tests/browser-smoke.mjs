import assert from 'node:assert/strict';
import fs from 'node:fs';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';

const siteUrl = process.env.SITE_URL || 'http://127.0.0.1:4173/?view=viewer&case=0&mode=quiz';
const siteOrigin = new URL(siteUrl).origin;
const chromeCandidates = process.platform === 'win32' ? [
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
] : ['/usr/bin/google-chrome','/usr/bin/chromium','/usr/bin/chromium-browser'];
const chrome = chromeCandidates.find(candidate => fs.existsSync(candidate));
assert.ok(chrome,'Chrome or Edge is required for browser smoke testing');

const port = await new Promise((resolve,reject) => {
  const server = net.createServer();
  server.once('error',reject);
  server.listen(0,'127.0.0.1',() => {
    const selected = server.address().port;
    server.close(() => resolve(selected));
  });
});
const profile = fs.mkdtempSync(path.join(os.tmpdir(),'image-lab-browser-'));
const browser = spawn(chrome,[
  '--headless=new','--disable-gpu','--no-first-run','--no-default-browser-check',
  `--remote-debugging-port=${port}`,`--user-data-dir=${profile}`,siteUrl
],{stdio:'ignore'});

const delay = ms => new Promise(resolve => setTimeout(resolve,ms));
let socket;
try {
  let target;
  for(let attempt=0;attempt<50;attempt++) {
    try {
      const targets = await fetch(`http://127.0.0.1:${port}/json/list`).then(response => response.json());
      target = targets.find(item => item.type==='page' && item.url.startsWith(siteOrigin));
      if(target) break;
    } catch {}
    await delay(100);
  }
  assert.ok(target,'browser target did not become ready');
  socket = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve,reject) => { socket.onopen=resolve; socket.onerror=reject; });
  let sequence=0;
  const pending=new Map();
  const runtimeErrors=[];
  socket.onmessage=event => {
    const message=JSON.parse(event.data);
    if(message.id && pending.has(message.id)) {
      const task=pending.get(message.id); pending.delete(message.id);
      if(message.error) task.reject(new Error(message.error.message)); else task.resolve(message.result);
    }
    if(message.method==='Runtime.exceptionThrown') runtimeErrors.push(message.params.exceptionDetails.text);
  };
  const command=(method,params={}) => new Promise((resolve,reject) => {
    const id=++sequence; pending.set(id,{resolve,reject});
    socket.send(JSON.stringify({id,method,params}));
  });
  const evaluate=async expression => {
    const result=await command('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});
    if(result.exceptionDetails) throw new Error(result.exceptionDetails.text);
    return result.result.value;
  };
  await command('Runtime.enable');
  await command('Page.enable');
  for(let attempt=0;attempt<50;attempt++) {
    if((await evaluate("document.querySelector('#viewerIndex')?.textContent || ''")).includes('病例编号')) break;
    await delay(100);
  }
  assert.equal(await evaluate("document.querySelector('#findingsPane').hidden"),false);
  assert.equal(await evaluate("document.querySelector('#hintPanel').hidden"),true);
  await evaluate("document.querySelector('#requestHint').click()");
  const hint=await evaluate("document.querySelector('#hintPanel').textContent");
  assert.match(hint,/提示 1/);
  assert.doesNotMatch(hint,/气胸/);
  await evaluate("document.querySelector('[data-reasoning-step=diagnosis]').click()");
  assert.doesNotMatch(await evaluate("document.querySelector('#reasoningCoach').textContent"),/气胸/);
  await evaluate("document.querySelector('#reasoningResponse').value='右侧胸腔及右肺外周';document.querySelector('#reasoningResponse').dispatchEvent(new Event('input',{bubbles:true}));document.querySelector('[data-coach-move=\"1\"]').click()");
  await evaluate("document.querySelector('#reasoningResponse').value='可疑胸膜线，外周肺纹理减少';document.querySelector('#reasoningResponse').dispatchEvent(new Event('input',{bubbles:true}));document.querySelector('[data-coach-move=\"1\"]').click()");
  await evaluate("document.querySelector('#reasoningResponse').value='巨大肺大疱；需确认胸膜线及其外周纹理';document.querySelector('#reasoningResponse').dispatchEvent(new Event('input',{bubbles:true}));document.querySelector('#completeReasoning').click()");
  assert.match(await evaluate("document.querySelector('#reasoningCoach').textContent"),/已完成检查点/);
  if(process.env.TRAINING_SCREENSHOT) {
    await evaluate("document.querySelector('.case-panel').scrollIntoView({block:'start'})");
    await delay(150);
    const screenshot=await command('Page.captureScreenshot',{format:'png'});
    fs.writeFileSync(process.env.TRAINING_SCREENSHOT,Buffer.from(screenshot.data,'base64'));
  }
  await evaluate("document.querySelector('[data-answer=\"0\"]').click();document.querySelector('#submitAnswer').click()");
  assert.match(await evaluate("document.querySelector('#feedback').textContent"),/参考答案/);
  assert.match(await evaluate("document.querySelector('#reasoningCoach').textContent"),/本例参考路径/);
  await evaluate("document.querySelector('[data-reasoning-step=report]').click();document.querySelector('#reportLocation').value='右侧胸腔';document.querySelector('#reportFindings').value='右侧胸腔透亮度增高，可见胸膜线，外周肺纹理减少，右肺受压。';document.querySelector('#reportImpression').value='考虑右侧气胸。';document.querySelector('#reportAdvice').value='建议结合临床评估并复查胸部影像。';document.querySelector('#scoreReport').click()");
  assert.match(await evaluate("document.querySelector('#reportFeedback').textContent"),/\/ 100/);
  assert.equal(await evaluate("document.querySelector('#reportReference').hidden"),false);
  assert.equal(await evaluate("document.querySelector('.package-seal code')?.textContent.length"),13);
  const events=await evaluate("JSON.parse(localStorage.getItem('yys-honest-v2-learning-events'))");
  assert.ok(events.some(event=>event.type==='hint_requested'));
  assert.ok(events.some(event=>event.type==='reasoning_checkpoint_completed' && event.checkpointCount===3));
  assert.ok(events.some(event=>event.type==='answer_submitted'));
  assert.ok(events.some(event=>event.type==='report_scored'));
  assert.ok(events.every(event=>!Object.keys(event).some(key=>/text|image|prompt|note|report/i.test(key))));
  await evaluate("document.querySelector('[data-view=progress]').click()");
  assert.match(await evaluate("document.querySelector('#prescriptionList').textContent"),/气胸/);
  assert.equal(await evaluate("document.querySelector('#startPrescription').disabled"),false);
  await evaluate("document.querySelector('#startPrescription').click()");
  assert.match(await evaluate("document.querySelector('#queueSummary').textContent"),/自定义顺序/);
  assert.match(await evaluate("document.querySelector('#queueSummary').textContent"),/10 题/);
  await command('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});
  assert.equal(await evaluate("document.documentElement.scrollWidth <= window.innerWidth"),true);
  assert.deepEqual(runtimeErrors,[]);
  console.log('Browser workflow, privacy boundary and mobile width checks passed.');
} finally {
  if(socket && socket.readyState<2) socket.close();
  browser.kill();
  await Promise.race([new Promise(resolve => browser.once('exit',resolve)),delay(2000)]);
  fs.rmSync(profile,{recursive:true,force:true,maxRetries:5,retryDelay:100});
}
