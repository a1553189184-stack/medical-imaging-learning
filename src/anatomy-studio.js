import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

const $ = selector => document.querySelector(selector);
const $$ = selector => [...document.querySelectorAll(selector)];
const asset = path => new URL(`assets/anatomy/${path}`, document.baseURI).href;
const systems = {
  skeletal: ['骨骼', '#e7dac1'], nervous: ['神经', '#e6a772'], cardiac: ['心脏', '#d46b71'],
  respiratory: ['呼吸', '#93bdd1'], digestive: ['消化', '#c6a76c'], urinary: ['泌尿', '#bd91bc'], arterial: ['动脉', '#e37d72']
};
const translations = {
  'Skin':'体表', 'Frontal bone':'额骨', 'Occipital bone':'枕骨', 'Mandible':'下颌骨',
  'Left parietal bone':'左顶骨', 'Right parietal bone':'右顶骨', 'Left hip bone':'左髋骨', 'Right hip bone':'右髋骨',
  'Left femur':'左股骨', 'Right femur':'右股骨', 'Sternum':'胸骨', 'Sacrum':'骶骨', 'Coccyx':'尾骨',
  'Pancreas':'胰腺', 'Stomach':'胃', 'Gallbladder':'胆囊', 'Esophagus':'食管', 'Duodenum':'十二指肠', 'Caudate lobe of liver':'肝尾状叶',
  'Appendix':'阑尾', 'Rectum':'直肠', 'Ascending colon':'升结肠', 'Descending colon':'降结肠', 'Transverse colon':'横结肠',
  'Left kidney':'左肾', 'Right kidney':'右肾', 'Urinary bladder':'膀胱', 'Trachea':'气管',
  'Left main bronchus':'左主支气管', 'Right main bronchus proper':'右主支气管',
  'Cerebellum':'小脑', 'Midbrain':'中脑', 'Pons':'脑桥', 'Medulla oblongata':'延髓', 'Spinal cord':'脊髓',
  'Wall of ventricle':'心室壁', 'Wall of left atrium':'左心房壁', 'Wall of right atrium':'右心房壁',
  'Cavity of left ventricle':'左心室腔', 'Cavity of right ventricle':'右心室腔', 'Body of sternum':'胸骨体',
  'Ascending aorta':'升主动脉', 'Arch of aorta':'主动脉弓', 'Descending thoracic aorta':'胸降主动脉', 'Abdominal aorta':'腹主动脉'
};
const ordinals = {first:1,second:2,third:3,fourth:4,fifth:5,sixth:6,seventh:7,eighth:8,ninth:9,tenth:10,eleventh:11,twelfth:12};
function chineseName(name) {
  if (translations[name]) return translations[name];
  const paired = name.match(/^(Left|Right) (clavicle|fibula|humerus|patella|scapula|tibia|ureter)$/i);
  if (paired) return `${paired[1] === 'Left' ? '左' : '右'}${{clavicle:'锁骨',fibula:'腓骨',humerus:'肱骨',patella:'髌骨',scapula:'肩胛骨',tibia:'胫骨',ureter:'输尿管'}[paired[2].toLowerCase()]}`;
  const rib = name.match(/^(Left|Right) (\w+) rib$/i);
  if (rib) return `${rib[1] === 'Left' ? '左' : '右'}第${ordinals[rib[2].toLowerCase()] || rib[2]}肋`;
  const disc = name.match(/^Intervertebral disk of (\w+) (cervical|thoracic|lumbar) vertebra$/i);
  if (disc) return `第${ordinals[disc[1].toLowerCase()] || disc[1]}${{cervical:'颈',thoracic:'胸',lumbar:'腰'}[disc[2].toLowerCase()]}椎椎间盘`;
  const vertebra = name.match(/^(\w+) (cervical|thoracic|lumbar) vertebra$/i);
  if (vertebra) return `第${ordinals[vertebra[1].toLowerCase()] || vertebra[1]}${{cervical:'颈',thoracic:'胸',lumbar:'腰'}[vertebra[2].toLowerCase()]}椎`;
  if (name.startsWith('Hepatovenous segment ')) return `肝段 ${name.split(' ').at(-1)}`;
  if (name.startsWith('White matter of ')) return name.includes('left') ? '左大脑半球白质' : '右大脑半球白质';
  return name;
}

const landmarks = {
  chest: [
    [15,'上腹部','肝脏、脾脏与肾上极'], [45,'膈肌与肺底','观察膈肌两侧及肺下叶'],
    [75,'心脏与肺门','比较心脏、肺门和椎体'], [105,'上纵隔','追踪主动脉弓与气管'],
    [130,'胸廓入口','辨认锁骨、气管和肺尖']
  ],
  head: [
    [10,'外侧层面','从外向内观察头皮与颅骨'], [35,'大脑半球','观察皮质与白质轮廓'],
    [65,'近中线矢状面','辨认胼胝体、小脑和脑干'], [95,'对侧半球','比较脑沟与脑室邻近结构'],
    [120,'外侧层面','观察颞部与颅骨外侧']
  ]
};

let initialized = false;
let modelReady = false;
let sliceReady = false;
let scene, camera, renderer, controls, meshes = [], metadata, partRecords = [];
let activeSystems = new Set(Object.keys(systems));
let selectedId = null;
let isolatedId = null;
const hiddenParts = new Set(), translucentParts = new Set();
let playback = null;
let dataset = 'chest', windowName = 'soft', sliceIndex = 75, zoom = 1, panX = 0, panY = 0;
const modelTarget = new THREE.Vector3(0, .86, 0);

function selectTab(which) {
  const model = which === 'model';
  if (model) stopPlayback();
  $('#anatomyPanelModel').hidden = !model;
  $('#anatomyPanelSlices').hidden = model;
  $$('.anatomy-panel').forEach(panel => panel.classList.toggle('active', panel.id === (model ? 'anatomyPanelModel' : 'anatomyPanelSlices')));
  $('#anatomyTabModel').classList.toggle('active', model);
  $('#anatomyTabSlices').classList.toggle('active', !model);
  $('#anatomyTabModel').setAttribute('aria-selected', String(model));
  $('#anatomyTabSlices').setAttribute('aria-selected', String(!model));
  if (model && !modelReady) initModel();
  if (!model && !sliceReady) initSlices();
  if (model && renderer) resize();
}

function resize() {
  if (!renderer) return;
  const stage = $('#anatomyStage');
  const width = stage.clientWidth, height = stage.clientHeight;
  if (!width || !height) return;
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  renderer.setSize(width, height, false);
}

function updateModelVisibility() {
  for (const mesh of meshes) {
    const {id, system} = mesh.userData;
    const skin = system === 'integumentary';
    mesh.visible = !hiddenParts.has(id) && (!isolatedId || id === isolatedId) && (skin ? $('#anatomySkin').checked : activeSystems.has(system));
    const translucent = skin || translucentParts.has(id);
    if (mesh.material.transparent !== translucent) {mesh.material.transparent = translucent;mesh.material.needsUpdate = true;}
    mesh.material.opacity = skin ? .13 : translucent ? .22 : 1;
    mesh.material.depthWrite = !translucent;
  }
  renderStructureList();
}

function refreshPresets() {
  $$('#threeDBody [data-anatomy-preset]').forEach(button => {
    const value = button.dataset.anatomyPreset;
    const active = value === 'all' ? activeSystems.size === Object.keys(systems).length :
      value === 'skeletal' ? activeSystems.size === 1 && activeSystems.has('skeletal') :
      activeSystems.size === Object.keys(systems).length - 1 && !activeSystems.has('skeletal');
    button.classList.toggle('active', active);
    button.setAttribute('aria-pressed', String(active));
  });
}

function renderSystemButtons() {
  const target = $('#anatomySystems');
  target.replaceChildren();
  for (const [key, [label]] of Object.entries(systems)) {
    const button = document.createElement('button');
    button.type = 'button'; button.textContent = label;
    button.className = activeSystems.has(key) ? 'active' : '';
    button.setAttribute('aria-pressed', String(activeSystems.has(key)));
    button.onclick = () => {
      if (activeSystems.has(key)) activeSystems.delete(key); else activeSystems.add(key);
      button.classList.toggle('active', activeSystems.has(key));
      button.setAttribute('aria-pressed', String(activeSystems.has(key)));
      refreshPresets();
      updateModelVisibility();
    };
    target.append(button);
  }
  refreshPresets();
}

function renderStructureList() {
  const target = $('#anatomyStructureList');
  const query = $('#anatomySearch').value.trim().toLocaleLowerCase();
  target.replaceChildren();
  const visible = partRecords.filter(part => part.system !== 'integumentary' && activeSystems.has(part.system) && (`${part.name} ${chineseName(part.name)} ${systems[part.system]?.[0] || ''}`).toLocaleLowerCase().includes(query));
  if (!visible.length) { const empty = document.createElement('p'); empty.className = 'anatomy-list-empty'; empty.textContent = '没有匹配的结构。'; target.append(empty); return; }
  for (const part of visible) {
    const button = document.createElement('button'); button.type = 'button';
    button.className = selectedId === part.id ? 'active' : '';
    button.textContent = chineseName(part.name);
    const small = document.createElement('small'); small.textContent = part.name; button.append(small);
    if (hiddenParts.has(part.id)) {button.classList.add('is-hidden');button.title='当前已隐藏，点击可重新显示';}
    if (isolatedId === part.id) button.classList.add('is-isolated');
    button.onclick = () => selectPart(part.id, true);
    target.append(button);
  }
}

function selectPart(id, focus) {
  if (id && isolatedId && isolatedId !== id) {isolatedId = null; updateModelVisibility();}
  selectedId = id;
  const part = partRecords.find(item => item.id === id);
  if (part && hiddenParts.delete(id)) updateModelVisibility();
  for (const mesh of meshes) mesh.material.emissive.set(mesh.userData.id === id ? '#2a9b77' : '#000000');
  const box = $('#anatomySelection');
  box.replaceChildren();
  if (part) {
    const title = document.createElement('b'); title.textContent = chineseName(part.name);
    const detail = document.createElement('span'); detail.textContent = `${part.name} · ${systems[part.system]?.[0] || '体表'} · 成人参考模型`;
    box.append(title, detail);
    if (focus) {
      const bounds = new THREE.Box3(new THREE.Vector3(...part.bounds[0]), new THREE.Vector3(...part.bounds[1]));
      const center = bounds.getCenter(new THREE.Vector3());
      const distance = Math.min(2.2, Math.max(.32, bounds.getSize(new THREE.Vector3()).length() * 4));
      controls.target.copy(center); camera.position.copy(center).add(new THREE.Vector3(distance*.7, distance*.28, distance)); controls.update();
    }
  } else {
    const title = document.createElement('b'); title.textContent = '选择一个结构';
    const detail = document.createElement('span'); detail.textContent = '可在模型中点击，也可从列表选择。';
    box.append(title, detail);
  }
  $('#anatomyIsolate').disabled = !part;
  $('#anatomyHide').disabled = !part;
  $('#anatomyTranslucent').disabled = !part;
  $('#anatomyIsolate').textContent = isolatedId === id ? '退出单独显示' : '单独显示';
  $('#anatomyTranslucent').textContent = translucentParts.has(id) ? '恢复不透明' : '半透明';
  $('#anatomyIsolate').setAttribute('aria-pressed', String(Boolean(part && isolatedId === id)));
  $('#anatomyTranslucent').setAttribute('aria-pressed', String(Boolean(part && translucentParts.has(id))));
  renderStructureList();
}

async function initModel() {
  modelReady = true;
  const loading = $('#anatomyLoading');
  try {
    const [manifestResponse, bodyResponse] = await Promise.all([fetch(asset('model/body.json')), fetch(asset('model/body.bin'))]);
    if (!manifestResponse.ok || !bodyResponse.ok) throw new Error('三维数据暂时不可用');
    const manifest = await manifestResponse.json();
    const buffer = await bodyResponse.arrayBuffer();
    partRecords = manifest.parts;
    scene = new THREE.Scene(); scene.background = new THREE.Color('#0b171a');
    camera = new THREE.PerspectiveCamera(38, 1, .01, 20);
    camera.position.set(.7, 1.02, 2.25);
    renderer = new THREE.WebGLRenderer({antialias:true, alpha:false, powerPreference:'high-performance'});
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    $('#anatomyStage').append(renderer.domElement);
    scene.add(new THREE.HemisphereLight('#e7f6ff', '#465653', 2));
    const light = new THREE.DirectionalLight('#fff6e8', 2.2); light.position.set(1.2, 2.5, 2); scene.add(light);
    const fill = new THREE.DirectionalLight('#7bbfc2', .9); fill.position.set(-1, 1.2, -1); scene.add(fill);
    controls = new OrbitControls(camera, renderer.domElement);
    controls.target.copy(modelTarget); controls.enableDamping = true; controls.dampingFactor = .08;
    controls.minDistance = .16; controls.maxDistance = 5; controls.update();
    for (const part of partRecords) {
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(buffer, part.positions, part.vertexCount * 3), 3));
      geometry.setAttribute('normal', new THREE.BufferAttribute(new Int16Array(buffer, part.normals, part.vertexCount * 3), 3, true));
      geometry.setIndex(new THREE.BufferAttribute(new Uint32Array(buffer, part.indices, part.indexCount), 1));
      const skin = part.system === 'integumentary';
      const material = new THREE.MeshStandardMaterial({color:skin ? '#9cb7a8' : (systems[part.system]?.[1] || '#c5d5cc'), roughness:.65, metalness:.03, side:THREE.DoubleSide, transparent:skin, opacity:skin ? .13 : 1, depthWrite:!skin});
      const mesh = new THREE.Mesh(geometry, material);
      mesh.userData = {id:part.id, system:part.system};
      scene.add(mesh); meshes.push(mesh);
    }
    renderSystemButtons(); updateModelVisibility();
    $('#anatomySearch').oninput = renderStructureList;
    $('#anatomySkin').onchange = updateModelVisibility;
    $('#anatomyReset').onclick = () => {controls.target.copy(modelTarget); camera.position.set(.7,1.02,2.25); controls.update(); selectPart(null,false);};
    $$('#threeDBody [data-anatomy-view]').forEach(button => button.onclick = () => {
      controls.target.copy(modelTarget);
      const view = button.dataset.anatomyView;
      camera.position.set(...(view === 'back' ? [0,.86,-2.35] : view === 'side' ? [2.35,.86,0] : [0,.86,2.35]));
      controls.update();
    });
    $$('#threeDBody [data-anatomy-preset]').forEach(button => button.onclick = () => {
      const preset = button.dataset.anatomyPreset;
      activeSystems = new Set(preset === 'skeletal' ? ['skeletal'] : Object.keys(systems).filter(key => preset !== 'organs' || key !== 'skeletal'));
      isolatedId = null;
      $('#anatomySkin').checked = preset === 'all';
      renderSystemButtons(); updateModelVisibility(); selectPart(null,false);
    });
    $('#anatomyIsolate').onclick = () => {if (!selectedId) return; isolatedId = isolatedId === selectedId ? null : selectedId; updateModelVisibility(); selectPart(selectedId,false);};
    $('#anatomyHide').onclick = () => {if (!selectedId) return; hiddenParts.add(selectedId); isolatedId = null; updateModelVisibility(); selectPart(null,false);};
    $('#anatomyTranslucent').onclick = () => {if (!selectedId) return; if (translucentParts.has(selectedId)) translucentParts.delete(selectedId); else translucentParts.add(selectedId); updateModelVisibility(); selectPart(selectedId,false);};
    $('#anatomyRestore').onclick = () => {hiddenParts.clear();translucentParts.clear();isolatedId=null;activeSystems=new Set(Object.keys(systems));$('#anatomySkin').checked=true;renderSystemButtons();updateModelVisibility();selectPart(null,false);};
    const ray = new THREE.Raycaster();
    const hitPart = event => {
      const rect = renderer.domElement.getBoundingClientRect();
      const pointer = new THREE.Vector2((event.clientX-rect.left)/rect.width*2-1,-(event.clientY-rect.top)/rect.height*2+1);
      ray.setFromCamera(pointer,camera);
      return ray.intersectObjects(meshes.filter(mesh => mesh.visible && mesh.userData.system !== 'integumentary'),false)[0]?.object.userData.id;
    };
    let down = null;
    const hover = $('#anatomyHover');
    renderer.domElement.addEventListener('pointerdown', event => {down = [event.clientX,event.clientY]; hover.hidden = true;});
    renderer.domElement.addEventListener('pointermove', event => {
      if (down || event.buttons) {hover.hidden=true;return;}
      const id = hitPart(event);
      const part = partRecords.find(item => item.id === id);
      hover.hidden = !part;
      if (part) {hover.textContent = `${chineseName(part.name)} · ${part.name}`; hover.style.left = `${event.offsetX+14}px`; hover.style.top = `${event.offsetY+14}px`;}
    });
    renderer.domElement.addEventListener('pointerleave', () => {hover.hidden=true;down=null;});
    renderer.domElement.addEventListener('pointerup', event => {
      if (!down) return;
      const clicked = Math.hypot(event.clientX-down[0],event.clientY-down[1]) <= 5;
      down = null;
      if (clicked) {const id=hitPart(event);if (id) selectPart(id,false);}
    });
    new ResizeObserver(resize).observe($('#anatomyStage'));
    resize(); loading.hidden = true;
    const animate = () => {requestAnimationFrame(animate); if ($('#anatomyPanelModel').hidden) return; controls.update(); renderer.render(scene,camera);};
    animate();
  } catch (error) { loading.textContent = `模型加载失败：${error.message}。请刷新页面重试。`; modelReady = false; }
}

function updateZoom() {
  $('#anatomySliceImage').style.transform = `translate(${panX}px, ${panY}px) scale(${zoom})`;
}
function stopPlayback() {
  if (playback) {clearInterval(playback);playback=null;}
  const button=$('#anatomySlicePlay');
  if (button) {button.textContent='▶ 连续播放';button.setAttribute('aria-pressed','false');}
}
function showSlice() {
  if (!metadata) return;
  const info = metadata[dataset];
  sliceIndex = Math.max(0, Math.min(info.count - 1, sliceIndex));
  if (playback && sliceIndex === info.count - 1) stopPlayback();
  const view = dataset === 'chest' ? windowName : 'sagittal';
  const src = asset(`slices/${dataset}/${view}/${String(sliceIndex).padStart(3,'0')}.webp`);
  const image = $('#anatomySliceImage');
  const status = $('#anatomySliceStatus'); status.hidden = false; status.textContent = '正在加载层面…';
  image.onload = () => {status.hidden = true;};
  image.onerror = () => {status.hidden = false; status.textContent = '此层暂时无法显示，请切换其他层面。';};
  image.src = src;
  image.alt = `${info.title}，第 ${sliceIndex+1} / ${info.count} 层`;
  $('#anatomySliceRange').value = String(sliceIndex);
  $('#anatomySliceTitle').textContent = info.title;
  $('#anatomySliceCounter').textContent = `${sliceIndex+1} / ${info.count}`;
  $('#anatomySlicePosition').textContent = `第 ${sliceIndex+1} / ${info.count} 层 · 层距约 ${info.spacingMm} mm`;
  $('#anatomyOrientation').textContent = dataset === 'chest' ? '轴位 · 图像左侧为受检者右侧' : '矢状位 · 图像左侧为前方';
  const near = landmarks[dataset].reduce((best,item) => Math.abs(item[0]-sliceIndex) < Math.abs(best[0]-sliceIndex) ? item : best);
  $('#anatomySliceDescription').textContent = `当前位于「${near[1]}」附近。${near[2]}；可逐层观察结构连续变化。`;
  $$('#anatomyLandmarks button').forEach(button => button.classList.toggle('active', Number(button.dataset.slice) === near[0]));
  for (const offset of [-1,1]) {const next = sliceIndex+offset; if (next >= 0 && next < info.count) {const preload = new Image(); preload.src = asset(`slices/${dataset}/${view}/${String(next).padStart(3,'0')}.webp`);}}
}
function renderLandmarks() {
  const target = $('#anatomyLandmarks'); target.replaceChildren();
  for (const [index,title,description] of landmarks[dataset]) {
    const button = document.createElement('button'); button.type='button'; button.dataset.slice=String(index);
    button.textContent=title;
    const small=document.createElement('small'); small.textContent=`第 ${index+1} 层 · ${description}`; button.append(small);
    button.onclick=()=>{sliceIndex=index;showSlice();}; target.append(button);
  }
}
function setDataset(name) {
  stopPlayback();
  dataset=name; sliceIndex=name==='chest'?75:65; windowName='soft'; zoom=1;panX=0;panY=0;updateZoom();
  $$('#threeDBody [data-anatomy-dataset]').forEach(button=>button.classList.toggle('active',button.dataset.anatomyDataset===name));
  $('#anatomyWindowGroup').hidden=name!=='chest';
  $$('#threeDBody [data-anatomy-window]').forEach(button=>button.classList.toggle('active',button.dataset.anatomyWindow==='soft'));
  $('#anatomySliceRange').max=String(metadata[name].count-1);
  renderLandmarks(); showSlice();
}
async function initSlices() {
  sliceReady=true;
  try {
    const response=await fetch(asset('slices/slices.json'));
    if(!response.ok) throw new Error('无法读取断层目录');
    metadata=await response.json();
    $$('#threeDBody [data-anatomy-dataset]').forEach(button=>button.onclick=()=>setDataset(button.dataset.anatomyDataset));
    $$('#threeDBody [data-anatomy-window]').forEach(button=>button.onclick=()=>{windowName=button.dataset.anatomyWindow;$$('#threeDBody [data-anatomy-window]').forEach(item=>item.classList.toggle('active',item===button));showSlice();});
    $('#anatomySliceRange').oninput=event=>{sliceIndex=Number(event.target.value);showSlice();};
    $('#anatomySlicePrev').onclick=()=>{sliceIndex--;showSlice();};
    $('#anatomySliceNext').onclick=()=>{sliceIndex++;showSlice();};
    $('#anatomySlicePlay').onclick=()=>{
      if (playback) {stopPlayback();return;}
      if (sliceIndex >= metadata[dataset].count-1) sliceIndex=0;
      playback=setInterval(()=>{sliceIndex++;showSlice();},360);
      $('#anatomySlicePlay').textContent='Ⅱ 暂停播放';
      $('#anatomySlicePlay').setAttribute('aria-pressed','true');
      showSlice();
    };
    document.addEventListener('visibilitychange',()=>{if(document.hidden)stopPlayback();});
    $('#anatomyZoomIn').onclick=()=>{zoom=Math.min(3,zoom+.25);updateZoom();};
    $('#anatomyZoomOut').onclick=()=>{zoom=Math.max(1,zoom-.25);if(zoom===1){panX=0;panY=0;}updateZoom();};
    $('#anatomyZoomReset').onclick=()=>{zoom=1;panX=0;panY=0;updateZoom();};
    const stage=$('#anatomySliceStage');
    stage.addEventListener('wheel',event=>{event.preventDefault();sliceIndex+=Math.sign(event.deltaY);showSlice();},{passive:false});
    stage.addEventListener('keydown',event=>{if(event.key==='ArrowRight'||event.key==='ArrowDown'){sliceIndex++;showSlice();event.preventDefault();}if(event.key==='ArrowLeft'||event.key==='ArrowUp'){sliceIndex--;showSlice();event.preventDefault();}});
    let drag=null;
    stage.addEventListener('pointerdown',event=>{if(zoom<=1)return;drag=[event.clientX,event.clientY,panX,panY];stage.setPointerCapture(event.pointerId);});
    stage.addEventListener('pointermove',event=>{if(!drag)return;panX=drag[2]+event.clientX-drag[0];panY=drag[3]+event.clientY-drag[1];updateZoom();});
    stage.addEventListener('pointerup',()=>{drag=null;});
    setDataset('chest');
  }catch(error){$('#anatomySliceStatus').hidden=false;$('#anatomySliceStatus').textContent=`断层数据加载失败：${error.message}`;sliceReady=false;}
}

export function mount() {
  if (initialized) { if (!$('#anatomyPanelModel').hidden) resize(); return; }
  initialized=true;
  $('#anatomyTabModel').onclick=()=>selectTab('model');
  $('#anatomyTabSlices').onclick=()=>selectTab('slices');
  selectTab('model');
}
