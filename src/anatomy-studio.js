import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

const $ = selector => document.querySelector(selector);
const $$ = selector => [...document.querySelectorAll(selector)];
const asset = path => new URL(`assets/anatomy/${path}`, document.baseURI).href;
const systems = {
  skeletal: ['骨骼', '#e7dac1'], nervous: ['神经', '#e6a772'], cardiac: ['心脏', '#d46b71'],
  respiratory: ['呼吸', '#93bdd1'], digestive: ['消化', '#c6a76c'], urinary: ['泌尿', '#bd91bc'], arterial: ['动脉', '#e37d72'], venous: ['静脉', '#7f9fcb'], peripheralNerve: ['周围神经示意', '#f0c970']
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
const boneNames = {
  radius:'桡骨', ulna:'尺骨', maxilla:'上颌骨', 'nasal bone':'鼻骨', 'zygomatic bone':'颧骨',
  'temporal bone':'颞骨', 'palatine bone':'腭骨', calcaneus:'跟骨', talus:'距骨',
  scaphoid:'舟骨', lunate:'月骨', triquetral:'三角骨', pisiform:'豌豆骨',
  trapezium:'大多角骨', trapezoid:'小多角骨', capitate:'头状骨', hamate:'钩骨',
  'cuboid bone':'骰骨', 'medial cuneiform bone':'内侧楔骨', 'intermediate cuneiform bone':'中间楔骨',
  'lateral cuneiform bone':'外侧楔骨', 'navicular bone':'足舟骨', 'hip bone':'髋骨',
  'first metacarpal bone':'第一掌骨', 'second metacarpal bone':'第二掌骨', 'third metacarpal bone':'第三掌骨',
  'fourth metacarpal bone':'第四掌骨', 'fifth metacarpal bone':'第五掌骨',
  'first metatarsal bone':'第一跖骨', 'second metatarsal bone':'第二跖骨', 'third metatarsal bone':'第三跖骨',
  'fourth metatarsal bone':'第四跖骨', 'fifth metatarsal bone':'第五跖骨'
};
const vesselAndNerveNames = {
  'internal carotid artery':'颈内动脉','common carotid artery':'颈总动脉','external carotid artery':'颈外动脉',
  'vertebral artery':'椎动脉','subclavian artery':'锁骨下动脉','axillary artery':'腋动脉',
  'brachial artery':'肱动脉','radial artery':'桡动脉','ulnar artery':'尺动脉',
  'femoral artery':'股动脉','popliteal artery':'腘动脉','anterior tibial artery':'胫前动脉',
  'posterior tibial artery':'胫后动脉','renal artery':'肾动脉','ophthalmic artery':'眼动脉',
  'anterior cerebral artery':'大脑前动脉','middle cerebral artery':'大脑中动脉','posterior cerebral artery':'大脑后动脉',
  'internal jugular vein':'颈内静脉','external jugular vein':'颈外静脉','subclavian vein':'锁骨下静脉',
  'axillary vein':'腋静脉','brachial vein':'肱静脉','cephalic vein':'头静脉','basilic vein':'贵要静脉',
  'femoral vein':'股静脉','popliteal vein':'腘静脉','renal vein':'肾静脉','radial vein':'桡静脉',
  'ulnar vein':'尺静脉','great saphenous vein':'大隐静脉','small saphenous vein':'小隐静脉',
  'dorsalis pedis artery':'足背动脉','deep palmar arch':'掌深弓','portal vein':'门静脉',
  'optic nerve':'视神经','ophthalmic nerve':'眼神经',
  'oculomotor nerve':'动眼神经','trochlear nerve':'滑车神经','frontal nerve':'额神经',
  'lacrimal nerve':'泪腺神经','nasociliary nerve':'鼻睫神经','supra-orbital nerve':'眶上神经',
  'supratrochlear nerve':'滑车上神经','thalamus':'丘脑','hippocampus':'海马',
  'caudate nucleus':'尾状核','putamen':'壳核','amygdala':'杏仁核','internal capsule':'内囊',
  'globus pallidus':'苍白球','median nerve':'正中神经','ulnar nerve':'尺神经',
  'radial nerve':'桡神经','sciatic nerve':'坐骨神经','tibial nerve':'胫神经',
  'common fibular nerve':'腓总神经','femoral nerve':'股神经'
};
const otherNames = {
  'Corpus callosum':'胼胝体','Optic chiasm':'视交叉','Hypothalamus':'下丘脑','Basilar artery':'基底动脉',
  'Anterior communicating artery':'前交通动脉','Superior mesenteric artery':'肠系膜上动脉',
  'Hepatic portal vein':'肝门静脉','Ethmoid':'筛骨','Sphenoid bone':'蝶骨','Vomer':'犁骨',
  'Hyoid bone':'舌骨','Atlas':'寰椎','Axis':'枢椎','Manubrium':'胸骨柄','Xiphoid process':'剑突',
  'Cerebral aqueduct':'中脑导水管','Anterior commissure':'前连合','Posterior commissure':'后连合',
  'Left portal vein':'左门静脉','Right portal vein':'右门静脉','Pre-hepatic portal vein':'肝前门静脉',
  'Cricoid cartilage':'环状软骨','Thyroid cartilage':'甲状软骨','Tentorium cerebelli':'小脑幕'
};
const ordinals = {first:1,second:2,third:3,fourth:4,fifth:5,sixth:6,seventh:7,eighth:8,ninth:9,tenth:10,eleventh:11,twelfth:12};
function chineseName(name) {
  if (translations[name]) return translations[name];
  if (otherNames[name]) return otherNames[name];
  if (vesselAndNerveNames[name.toLowerCase()]) return vesselAndNerveNames[name.toLowerCase()];
  const side = name.match(/^(Left|Right) (.+)$/i);
  if (side) {
    const prefix = side[1].toLowerCase() === 'left' ? '左' : '右';
    const base = side[2].toLowerCase();
    if (boneNames[base]) return prefix + boneNames[base];
    if (vesselAndNerveNames[base]) return prefix + vesselAndNerveNames[base];
  }
  const phalanx = name.match(/^(Distal|Middle|Proximal) phalanx of (left|right) (.+)$/i);
  if (phalanx) {
    const digit = {'thumb':'拇指','index finger':'食指','middle finger':'中指','ring finger':'环指','little finger':'小指','big toe':'拇趾','second toe':'第二趾','third toe':'第三趾','fourth toe':'第四趾','little toe':'第五趾'}[phalanx[3].toLowerCase()];
    if (digit) return `${phalanx[2].toLowerCase()==='left'?'左':'右'}${digit}${{distal:'远节',middle:'中节',proximal:'近节'}[phalanx[1].toLowerCase()]}${phalanx[3].includes('toe')?'趾骨':'指骨'}`;
  }
  const tooth=name.match(/^(Left|Right) (upper|lower) (?:(first|second|central|lateral) )?secondary (molar|premolar|incisor|canine) tooth$/i);
  if (tooth) return `${tooth[1]==='Left'?'左':'右'}${tooth[2]==='upper'?'上':'下'}${{first:'第一',second:'第二',central:'中切',lateral:'侧切'}[tooth[3]]||''}${{molar:'恒磨牙',premolar:'前磨牙',incisor:'牙',canine:'尖牙'}[tooth[4]]}`;
  const navicular=name.match(/^Navicular bone of (left|right) foot$/i);
  if(navicular)return `${navicular[1]==='left'?'左':'右'}足舟骨`;
  const sesamoid=name.match(/^Sesamoid bone of (left|right) foot$/i);
  if(sesamoid)return `${sesamoid[1]==='left'?'左':'右'}足籽骨`;
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
  ],
  headAxial: [
    [70,'大脑凸面','观察额叶、顶叶和枕叶皮质'], [110,'大脑深部','观察双侧大脑半球与脑室周围'],
    [150,'后颅窝','观察小脑与眼眶'], [190,'颌面部','观察牙列、咽腔和颈部']
  ],
  abdomen: [
    [70,'骨盆下部','观察股骨头和直肠'], [120,'骨盆上部','观察髂骨与肠袢'],
    [170,'腰椎中段','观察腹主动脉、腰大肌和肠袢'], [220,'双肾层面','观察肝脏与双肾'],
    [270,'肝脾层面','观察肝脏、脾脏和胃']
  ]
};
const regionMatchers = {
  forearm: part => /(?:radius|ulna|radial|ulnar|carpi|pronator)/i.test(part.name),
  hand: part => /(?:carpal|metacarpal|finger|thumb|palmar|scaphoid|lunate|triquetral|pisiform|trapezium|trapezoid|capitate|hamate)/i.test(part.name),
  foot: part => /(?:tarsal|metatarsal|toe|calcaneus|talus|navicular bone|cuneiform bone|cuboid bone|dorsalis pedis)/i.test(part.name),
  face: part => /(?:maxilla|mandible|nasal bone|zygomatic|palatine bone|vomer|tooth|optic nerve|ophthalmic nerve|lacrimal nerve|frontal bone)/i.test(part.name),
  vessels: part => part.system === 'arterial' || part.system === 'venous',
  nerves: part => part.system === 'nervous' || part.system === 'peripheralNerve'
};
const schematicNerveRoutes = {
  'median nerve': [[.08,1.46,.01],[.14,1.37,.018],[.17,1.26,.035],[.215,1.11,.038],[.235,1.00,.035],[.255,.89,.04],[.285,.83,.042]],
  'ulnar nerve': [[.08,1.46,.01],[.14,1.37,.012],[.165,1.25,-.018],[.205,1.11,-.038],[.218,1.00,.005],[.233,.89,.015],[.265,.82,.02]],
  'radial nerve': [[.09,1.45,.005],[.16,1.34,-.03],[.20,1.24,-.05],[.225,1.13,-.025],[.265,1.01,.0],[.275,.90,-.018],[.300,.83,-.017]],
  'femoral nerve': [[.055,1.01,.015],[.08,.90,.035],[.095,.80,.04],[.10,.68,.045],[.10,.55,.035]],
  'sciatic nerve': [[.055,.92,-.07],[.085,.82,-.07],[.10,.70,-.075],[.10,.58,-.072],[.095,.46,-.065]],
  'tibial nerve': [[.095,.46,-.065],[.075,.37,-.055],[.07,.25,-.052],[.075,.12,-.045],[.078,.06,-.035]],
  'common fibular nerve': [[.095,.46,-.064],[.11,.39,-.055],[.115,.33,-.035],[.11,.23,-.005],[.10,.12,.012]]
};
const featuredNames = [
  'Left radius','Left ulna','Left scaphoid','Left first metacarpal bone','Left talus','Left calcaneus',
  'Left maxilla','Left zygomatic bone','Mandible','Frontal bone','Left optic nerve','Corpus callosum',
  'Left thalamus','Cerebellum','Left brachial artery','Left radial artery','Left ulnar artery',
  'Left femoral artery','Left anterior tibial artery','Left cephalic vein','Left great saphenous vein',
  'Pancreas','Stomach','Left kidney','Right kidney','Trachea',
  'Left median nerve','Left ulnar nerve','Left radial nerve','Left sciatic nerve'
];

let initialized = false;
let modelReady = false;
let sliceReady = false;
let scene, camera, renderer, controls, meshes = [], metadata, annotations, partRecords = [];
let activeSystems = new Set(Object.keys(systems));
let selectedId = null;
let activeRegion = null;
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
  const featured = !query && !activeRegion && activeSystems.size === Object.keys(systems).length;
  const source = featured ? featuredNames.map(name=>partRecords.find(part=>part.name===name)).filter(Boolean) : partRecords;
  const visible = source.filter(part => part.system !== 'integumentary' && activeSystems.has(part.system) && (!activeRegion || regionMatchers[activeRegion](part)) && (`${part.name} ${chineseName(part.name)} ${systems[part.system]?.[0] || ''}`).toLocaleLowerCase().includes(query));
  if (activeRegion === 'nerves') visible.sort((a,b)=>Number(Boolean(b.schematic))-Number(Boolean(a.schematic)));
  if (!visible.length) { const empty = document.createElement('p'); empty.className = 'anatomy-list-empty'; empty.textContent = '没有匹配的结构。'; target.append(empty); return; }
  const summary=document.createElement('p');summary.className='anatomy-list-summary';summary.textContent=featured ? '常用结构 · 搜索或选择部位可查看全部' : visible.length>100 ? `找到 ${visible.length} 个结构 · 显示前 100 个；输入名称可精确查找` : `${visible.length} 个结构`;
  target.append(summary);
  for (const part of visible.slice(0,100)) {
    const button = document.createElement('button'); button.type = 'button';
    button.className = selectedId === part.id ? 'active' : '';
    const translated=chineseName(part.name);
    button.textContent = translated;
    const small = document.createElement('small'); small.textContent = translated === part.name ? systems[part.system]?.[0] || '' : part.name; button.append(small);
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
  const pickLabel = $('#anatomyPickLabel');
  pickLabel.hidden = !part;
  if (part) pickLabel.textContent = `${chineseName(part.name)} · ${part.name}`;
  if (part && hiddenParts.delete(id)) updateModelVisibility();
  for (const mesh of meshes) mesh.material.emissive.set(mesh.userData.id === id ? '#2a9b77' : '#000000');
  const box = $('#anatomySelection');
  box.replaceChildren();
  if (part) {
    const title = document.createElement('b'); title.textContent = chineseName(part.name);
    const detail = document.createElement('span'); detail.textContent = part.schematic ? `${part.name} · 教学示意走行，非真实神经分割` : `${part.name} · ${systems[part.system]?.[0] || '体表'} · 成人参考模型`;
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
    partRecords = [...manifest.parts];
    $('#anatomyCount').textContent = `${partRecords.length} 个三维结构 · 868 个断层层面`;
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
    for (const [nerve,route] of Object.entries(schematicNerveRoutes)) {
      for (const [side,sign] of [['Left',1],['Right',-1]]) {
        const points=route.map(([x,y,z])=>new THREE.Vector3(x*sign,y,z));
        const curve=new THREE.CatmullRomCurve3(points);
        const geometry=new THREE.TubeGeometry(curve,36,.0025,6,false);
        const material=new THREE.MeshStandardMaterial({color:systems.peripheralNerve[1],roughness:.6,emissive:'#604716',emissiveIntensity:.2});
        const id=`schematic:${side}:${nerve}`;
        const mesh=new THREE.Mesh(geometry,material);mesh.userData={id,system:'peripheralNerve'};
        scene.add(mesh);meshes.push(mesh);
        const bounds=new THREE.Box3().setFromObject(mesh);
        partRecords.push({id,name:`${side} ${nerve}`,system:'peripheralNerve',bounds:[bounds.min.toArray(),bounds.max.toArray()],schematic:true});
      }
    }
    $('#anatomyCount').textContent = `${manifest.parts.length} 个三维结构 + 14 条周围神经示意 · 868 个断层层面`;
    renderSystemButtons(); updateModelVisibility();
    $('#anatomySearch').oninput = renderStructureList;
    $('#anatomySkin').onchange = updateModelVisibility;
    $('#anatomyReset').onclick = () => {controls.target.copy(modelTarget); camera.position.set(.7,1.02,2.25); controls.update(); selectPart(null,false);};
    $$('#threeDBody [data-anatomy-region]').forEach(button => button.onclick = () => {
      const region = button.dataset.anatomyRegion;
      activeRegion = activeRegion === region ? null : region;
      $$('#threeDBody [data-anatomy-region]').forEach(item => {const active=item.dataset.anatomyRegion===activeRegion;item.classList.toggle('active',active);item.setAttribute('aria-pressed',String(active));});
      if (activeRegion) {
        const matched = partRecords.filter(part => regionMatchers[activeRegion](part) && part.system !== 'integumentary');
        for (const part of matched) activeSystems.add(part.system);
        renderSystemButtons(); updateModelVisibility();
        if (!['vessels','nerves'].includes(activeRegion)) {
          const left = matched.filter(part => part.name.startsWith('Left '));
          const regionParts = left.length ? left : matched;
          const box = new THREE.Box3();
          for (const part of regionParts) box.union(new THREE.Box3(new THREE.Vector3(...part.bounds[0]),new THREE.Vector3(...part.bounds[1])));
          if (!box.isEmpty()) {const center=box.getCenter(new THREE.Vector3());const distance=Math.min(1.4,Math.max(.3,box.getSize(new THREE.Vector3()).length()*2.3));controls.target.copy(center);camera.position.copy(center).add(new THREE.Vector3(distance*.5,distance*.2,distance));controls.update();}
        }
      }
      renderStructureList();
    });
    $$('#threeDBody [data-anatomy-view]').forEach(button => button.onclick = () => {
      controls.target.copy(modelTarget);
      const view = button.dataset.anatomyView;
      camera.position.set(...(view === 'back' ? [0,.86,-2.35] : view === 'side' ? [2.35,.86,0] : [0,.86,2.35]));
      controls.update();
    });
    $$('#threeDBody [data-anatomy-preset]').forEach(button => button.onclick = () => {
      const preset = button.dataset.anatomyPreset;
      activeSystems = new Set(preset === 'skeletal' ? ['skeletal'] : Object.keys(systems).filter(key => preset !== 'organs' || key !== 'skeletal'));
      activeRegion=null;$$('#threeDBody [data-anatomy-region]').forEach(item=>{item.classList.remove('active');item.setAttribute('aria-pressed','false');});
      isolatedId = null;
      $('#anatomySkin').checked = preset === 'all';
      renderSystemButtons(); updateModelVisibility(); selectPart(null,false);
    });
    $('#anatomyIsolate').onclick = () => {if (!selectedId) return; isolatedId = isolatedId === selectedId ? null : selectedId; updateModelVisibility(); selectPart(selectedId,false);};
    $('#anatomyHide').onclick = () => {if (!selectedId) return; hiddenParts.add(selectedId); isolatedId = null; updateModelVisibility(); selectPart(null,false);};
    $('#anatomyTranslucent').onclick = () => {if (!selectedId) return; if (translucentParts.has(selectedId)) translucentParts.delete(selectedId); else translucentParts.add(selectedId); updateModelVisibility(); selectPart(selectedId,false);};
    $('#anatomyRestore').onclick = () => {hiddenParts.clear();translucentParts.clear();isolatedId=null;activeRegion=null;$$('#threeDBody [data-anatomy-region]').forEach(item=>{item.classList.remove('active');item.setAttribute('aria-pressed','false');});activeSystems=new Set(Object.keys(systems));$('#anatomySkin').checked=true;renderSystemButtons();updateModelVisibility();selectPart(null,false);};
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
    const animate = () => {requestAnimationFrame(animate); if ($('#anatomyPanelModel').hidden || !$('#threeDBody').classList.contains('active')) return; controls.update(); renderer.render(scene,camera);};
    animate();
  } catch (error) { loading.textContent = `模型加载失败：${error.message}。请刷新页面重试。`; modelReady = false; }
}

function updateZoom() {
  $('#anatomySliceImageWrap').style.transform = `translate(${panX}px, ${panY}px) scale(${zoom})`;
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
  const view = dataset === 'chest' || dataset === 'abdomen' ? windowName : dataset === 'headAxial' ? 'axial' : 'sagittal';
  const folder = dataset === 'headAxial' ? 'head' : dataset;
  const src = asset(`slices/${folder}/${view}/${String(sliceIndex).padStart(3,'0')}.webp`);
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
  $('#anatomyOrientation').textContent = dataset === 'head' ? '矢状位 · 图像左侧为前方' : '轴位 · 图像左侧为受检者右侧';
  const near = landmarks[dataset].reduce((best,item) => Math.abs(item[0]-sliceIndex) < Math.abs(best[0]-sliceIndex) ? item : best);
  $('#anatomySliceDescription').textContent = `当前位于「${near[1]}」附近。${near[2]}；可逐层观察结构连续变化。`;
  $$('#anatomyLandmarks button').forEach(button => button.classList.toggle('active', Number(button.dataset.slice) === near[0]));
  renderSliceAnnotations();
  for (const offset of [-1,1]) {const next = sliceIndex+offset; if (next >= 0 && next < info.count) {const preload = new Image(); preload.src = asset(`slices/${folder}/${view}/${String(next).padStart(3,'0')}.webp`);}}
}
function renderSliceAnnotations() {
  const target = $('#anatomySliceMarkers'); target.replaceChildren();
  const points = annotations?.[dataset]?.[sliceIndex] || [];
  const output = $('#anatomySliceAnnotation');
  output.replaceChildren();
  const title=document.createElement('b');title.textContent=points.length ? `本层已核对 ${points.length} 处结构` : '本层暂无结构标记';
  const detail=document.createElement('span');detail.textContent=points.length ? '点击影像上的圆点，查看对应结构名称。' : '可继续逐层浏览；仅在人工核对的代表层面显示名称。';
  output.append(title,detail);
  for (let i=0;i<points.length;i++) {
    const [x,y,name,english]=points[i];
    const button=document.createElement('button');button.type='button';button.className='anatomy-slice-marker';
    button.style.left=`${x*100}%`;button.style.top=`${y*100}%`;button.textContent=String(i+1);
    button.title=name;button.setAttribute('aria-label',`${name} ${english}`);
    button.onclick=event=>{event.stopPropagation();output.replaceChildren();const label=document.createElement('b');label.textContent=name;const sub=document.createElement('span');sub.textContent=`${english} · 第 ${sliceIndex+1} 层 · 人工核对点位`;output.append(label,sub);$$('#anatomySliceMarkers button').forEach(item=>item.classList.toggle('active',item===button));};
    target.append(button);
  }
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
  dataset=name; sliceIndex={chest:75,abdomen:220,headAxial:110,head:65}[name]; windowName='soft'; zoom=1;panX=0;panY=0;updateZoom();
  $$('#threeDBody [data-anatomy-dataset]').forEach(button=>button.classList.toggle('active',button.dataset.anatomyDataset===name));
  $('#anatomyWindowGroup').hidden=!['chest','abdomen'].includes(name);
  $$('#threeDBody [data-anatomy-window]').forEach(button=>{button.hidden=!metadata[name].views.includes(button.dataset.anatomyWindow);button.classList.toggle('active',button.dataset.anatomyWindow==='soft');});
  $('#anatomySliceRange').max=String(metadata[name].count-1);
  renderLandmarks(); showSlice();
}
async function initSlices() {
  sliceReady=true;
  try {
    const [response,annotationResponse]=await Promise.all([fetch(asset('slices/slices.json')),fetch(asset('slices/annotations.json'))]);
    if(!response.ok || !annotationResponse.ok) throw new Error('无法读取断层目录或标记');
    metadata=await response.json();annotations=await annotationResponse.json();
    $('#anatomyCount').textContent=`${partRecords.filter(part=>!part.schematic).length || 655} 个三维结构 + 14 条周围神经示意 · ${Object.values(metadata).reduce((sum,item)=>sum+item.count,0)} 个断层层面`;
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
    $('#anatomySliceImageWrap').addEventListener('click',event=>{
      if(event.target.closest('button'))return;
      const rect=$('#anatomySliceImageWrap').getBoundingClientRect();
      const x=(event.clientX-rect.left)/rect.width,y=(event.clientY-rect.top)/rect.height;
      const buttons=[...$('#anatomySliceMarkers').children];
      const points=annotations?.[dataset]?.[sliceIndex]||[];
      let nearest=-1,distance=Infinity;
      points.forEach((point,index)=>{const next=Math.hypot((point[0]-x)*rect.width,(point[1]-y)*rect.height);if(next<distance){distance=next;nearest=index;}});
      if(nearest>=0 && distance<=Math.max(20,rect.width*.06)) buttons[nearest].click();
      else {const output=$('#anatomySliceAnnotation');output.replaceChildren();const title=document.createElement('b');title.textContent='此处没有已核对的名称';const detail=document.createElement('span');detail.textContent='请选择圆点标记；本站不会根据灰度自动猜测解剖结构。';output.append(title,detail);}
    });
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
  new MutationObserver(()=>{if(!$('#threeDBody').classList.contains('active'))stopPlayback();else if(!$('#anatomyPanelModel').hidden)resize();}).observe($('#threeDBody'),{attributes:true,attributeFilter:['class']});
  selectTab('model');
}
