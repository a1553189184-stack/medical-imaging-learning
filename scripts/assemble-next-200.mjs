import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';

const ROOT=path.resolve(import.meta.dirname,'..');
const topicData=JSON.parse(await fs.readFile(path.join(ROOT,'data','topic-image-candidates.json'),'utf8'));
const oldData=JSON.parse(await fs.readFile(path.join(ROOT,'data','commons-candidates.json'),'utf8'));
const manifest=JSON.parse(await fs.readFile(path.join(ROOT,'data','expanded-case-sources.json'),'utf8'));
const T=Object.fromEntries(topicData.topics.map(t=>[`${t.system}:${t.key}`,t]));
const G=Object.fromEntries(oldData.groups.map(g=>[g.key,g]));
const picks=[];
const addNew=(system,rows)=>rows.forEach(([key,title])=>picks.push({system,type:'new',key,title}));
const addOld=(system,rows)=>rows.forEach(([key,title])=>picks.push({system,type:'old',key,title}));

addNew('胸部',[
['lung-adenocarcinoma','File:Adenokarzinom der Lunge im Roentgenbild 63M - CT axial - 001.jpg'],['squamous-lung-cancer','File:Basaloid squamous cell carcinoma CT scan Case 275 (9571653129).jpg'],
['small-cell-lung-cancer','File:Chest CT limited stage small cell lung carcinoma.jpg'],['pulmonary-nodule','File:Solitary pulmonary nodule CT arrow.jpg'],['lung-metastases','File:LungMets2008.jpg'],
['mesothelioma','File:MesotheliomaCT.jpg'],['aspergilloma','File:Aspergilloma CT scan (5390986264).jpg'],['invasive-aspergillosis','File:CT of a subpleural nodule.png'],
['empyema','File:Hydro pneumothorax.jpg'],['tetralogy-fallot','File:Boot-shaped heart.jpg'],['dextrocardia','File:Dextrocardia on chest radiograph.jpg'],
['pulmonary-sequestration','File:Pulmonary-sequestration-003.jpg'],['morgagni-hernia','File:Lipomatoese Morgagni-Hernie 56W - CR und CT - 001.jpg'],['morgagni-hernia','File:Morgagni Hernia.PNG'],
['bochdalek-hernia','File:Bochdalek-Hernie links 77W - CR seitlich CT sagittal und axial - 001 - Annotation.jpg'],['pulmonary-contusion','File:Pulmonary contusion pseudocyst CT.jpg'],
['pulmonary-contusion','File:Lungenkontusion mit diffusen Einblutungen rechts mehr als links und schmalem Seropneumothorax 22M - CT - 001.jpg'],['sternal-fracture','File:Sternal fracture CT.jpg'],
['pectus-excavatum','File:CT image of Female with Pectus Excavatum Showing Haller Index of 6.94.jpg'],['pectus-excavatum','File:Pectus excavatum CT.jpg'],
['achalasia','File:Radiology 0009 Nevit.jpg'],['achalasia','File:Achalasie Stadium 1 mit typischem Tropfen.jpg'],['esophageal-cancer','File:Barium swallow of malignancy oesophagus 01.jpg'],
['esophageal-cancer','File:Radiology 0002 Nevit.jpg'],['small-cell-lung-cancer','File:Small cell carcinoma - CT scan (6327961286).jpg']]);
addOld('胸部',[
['chest-pneumothorax','File:Pneumothorax bei Lobus venae azygos 97M - CR ap - 001.jpg'],['chest-pneumothorax','File:Pneumothorax CXR.jpg'],['chest-pneumothorax','File:Pneumothorax im liegen.jpg'],['chest-pneumothorax','File:Seropneumothorax rechts 64W - CR pa - 001.jpg'],
['chest-pleural-effusion','File:Massive Effusion2008.jpg'],['chest-pleural-effusion','File:Mediastinalshift durch grossen Pleuraerguss trotz liegender Thoraxdrainage 85W - CR ap - 001.jpg'],['chest-pleural-effusion','File:Mediastinalshift nach rechts bei grossem Pleuraerguss links 77W - CR ap - 001.jpg'],
['chest-pneumonia','File:Severe Pneumonia Caused by Legionella pneumophila Serogroup 11, Italy.jpg'],['chest-pneumonia','File:X-ray lung consolidation.jpg'],['chest-pneumonia','File:X-ray of ground glass opacities of pneumocystis pneumonia.jpg'],['chest-pneumonia','File:02-01-Infiltrat pa.png'],
['chest-pulmonary-edema','File:Lungenoedem etwas asymmetrisch und Rekompensation nach 3 Tagen 74W - CR pa - 001.jpg'],['chest-pulmonary-edema','File:Pulmonaryedema09.JPG'],['chest-pulmonary-edema','File:Reexpansionsoedem der Lunge links nach Entlastung eines Pleuraergusses 99W - CR - 001.jpg'],['chest-pulmonary-edema','File:Lungenoedem bei kardiogenem Schock 73M - CR ap - 001.jpg'],
['chest-pulmonary-embolism','File:Kavathrombose und Lungenembolie bei Tumorleiden 57W - CT KM - 001.jpg'],['chest-pulmonary-embolism','File:Lungenarterienembolie in der Computertomographie.jpg'],['chest-pulmonary-embolism','File:Lungenarterienembolie mit sekundaerer Verkalkung des Embolus 69M - CT - 001.jpg'],['chest-pulmonary-embolism','File:Lungenembolie aus Schnittbildern viel Arbeit Ausrufungszeichen.jpg'],['chest-pulmonary-embolism','File:Lungenembolie Computertomographie.png'],['chest-pulmonary-embolism','File:Netzartige Residuen nach alter Lungenembolie 87W - CT - 001.jpg'],
['chest-atelectasis','File:Unterlappenatelektase rechts pa.jpg'],['chest-atelectasis','File:Atelectasia1.jpg'],['chest-covid','File:Covid19-Pneumonie 58M - CR pa - 001.jpg'],['chest-covid','File:Schwere Covid-19-Pneumonie mit Beatmung 72W - CR ap - 001.jpg']]);

addNew('神经',[
['pituitary-adenoma','File:Acromegaly pituitary macroadenoma.JPEG'],['craniopharyngioma','File:Craniopharyngioma2.jpg'],['vestibular-schwannoma','File:Akustikus-Schwannon links intrameatal MRT T1KM axial - Annotation.jpg'],['vestibular-schwannoma','File:Akustikus-Schwannon rechts MRT T1KM axial 001.jpg'],
['cerebral-aneurysm','File:Aneurysma A cerebri media.jpg'],['cerebral-aneurysm','File:CT angiography showing aneurysm at the ACOM.jpg'],['brain-avm','File:001 Arteriovenous Malformation CT axial 01.png'],['developmental-venous-anomaly','File:Developmental venous anomaly Cerebellum - T1KM axial 12 mm rekonstruiert.jpg'],
['venous-sinus-thrombosis','File:Ricostruzione 3D con mancanza di opacizzazione del seno trasverso sinistro.jpg'],['venous-sinus-thrombosis','File:MBq sinusvenenthrombose.jpg'],['moyamoya','File:MRA Moya-moya-disease.JPG'],['moyamoya','File:Moyamoya02.jpg'],
['venous-sinus-thrombosis','File:Sinusvenenthrombose CT-MR.jpg'],
['hydrocephalus','File:CT brain scan of child with medulloblastoma and resulting hydrocephalus.jpg'],['hydrocephalus','File:MBq Hydrocephalus.jpg'],['brain-abscess','File:Brain Abscess at MRI (T1 + contrast) -- showing a small ring-enhancing lesion with mild surrounding edema adjacent to the ventricular catheter and ventricular dilatation..jpg'],['brain-abscess','File:Brain abscess - MRI T1 KM axial.jpg'],
['cerebral-toxoplasmosis','File:BrainToxoplasmosis MRI 10 07.png'],['cadasil','File:CADASIL.jpg'],['cerebral-atrophy','File:CT of medial temporal lobe (MTA), posterior atrophy (PA) and frontal cortical atrophy (fGCA).png'],['huntington','File:Huntington.jpg'],
['oligodendroglioma','File:Oligodendroglioma 007.jpg'],['oligodendroglioma','File:OligodendrogliomaMRI.png'],['astrocytoma','File:405615R-PA-HYPOTHALAMIC.jpg'],['astrocytoma','File:MRI Slices - 2007 and 2014 of astrocytoma patient - Steven Keating.jpg'],
['medulloblastoma','File:AFIP405851R-MEDULLOBLASTOMA.jpg'],['pineal-tumor','File:PTPR MRI.jpg'],['pineal-tumor','File:Tumor Germinoma PinealGland1.JPG'],['central-neurocytoma','File:Neurocytoma T1 KM axial.jpg'],
['sega','File:MRI of brain with sub-ependymal giant cell astrocytoma.jpg'],['chiari-malformation','File:MRI of human brain with type-1 Arnold-Chiari malformation and herniated cerebellum.jpg'],['chiari-malformation','File:Chiari-1-Malformation asymmetrisch 1M - MR T2 sagittal - 001.jpg'],
['lissencephaly','File:Lissencephaly MRI.jpg'],['polymicrogyria','File:KuznieckySyndrome.png'],['sturge-weber','File:Sturge-Weber CT.jpg'],['rasmussen-encephalitis','File:MRI Rasmussen\'s encephalitis.png'],
['cervical-disc-herniation','File:C5-C6-herniation.jpg'],['spinal-epidural-abscess','File:MRI of the lumbar spine with abscess in the posterior epidural space, causing cauda equina syndrome.jpg'],['syringomyelia','File:Syringomyelia2.jpg']]);
addOld('神经',[
['neuro-intracerebral','File:Frontale Kontusionsblutung als Contre coup 01.png'],['neuro-intracerebral','File:Head CT stroke.jpg'],
['neuro-subarachnoid','File:Traumatische SAB 001.png'],['neuro-subarachnoid','File:SubarachnoidP.png'],['neuro-subarachnoid','File:Basale Subarachnoidalblutung bei Anterioraneurysma 43M - CT axial - 001.jpg'],
['neuro-infarction','File:Dens media sign mit Mediainfarkt - CCT 001 new.jpg'],['neuro-infarction','File:CT of cerebral infarction.png'],['neuro-infarction','File:Sagittal view at M2 segment of right MCA dot sign.png'],
['neuro-meningioma','File:Meningioma-MRT.jpg'],['neuro-glioblastoma','File:Glioblastoma multiforme - MRT T1KM ax.jpg'],['neuro-metastases','File:HirnmetastaseMR001.jpg']]);

addNew('腹部',[
['acute-pancreatitis','File:Akute exsudative Pankreatitis - CT axial.jpg'],['chronic-pancreatitis','File:Chronische Pankreatitis mit Verkalkungen - CT axial.jpg'],['chronic-pancreatitis','File:Multiple Pankreasverkalkungen bei chronischer Pankreatitis 79W - CT und CR - 001.jpg'],['pancreatic-cancer','File:Pankreas-Ca im CT - Coeliacusblockade.png'],['pancreatic-pseudocyst','File:Pancreatic Pseudocyst.PNG'],
['acute-cholecystitis','File:Acute cholecystitis as seen on ultrasound axial view.jpg'],['choledocholithiasis','File:Ultrasound of stone within the distal common bile duct.jpg'],['cholangiocarcinoma','File:Arterial and portal venous phase CT of cholangiocarcinoma.jpg'],['biliary-obstruction','File:Obstructivebiliarydilation.png'],
['hepatic-steatosis','File:Ultrasound of grade 2 fatty right liver lobe.jpg'],['cirrhosis','File:CT abdomen - liver cirrhosis - 01.JPG'],['portal-hypertension','File:Fundusvarizen.jpg'],['splenomegaly','File:Splenomegalie bei CLL (labeled).jpg'],
['splenic-infarction','File:Splenic infarction.png'],['splenic-rupture','File:CT Spleen Rupture.jpg'],['liver-abscess','File:Emphysematous liver abscess as shown on CT and ultrasound in axial view.png'],['pyelonephritis','File:Akute Pyelonephritis links mit Minderperfusion der linken Niere 52M - CT - 001.jpg'],
['renal-cell-carcinoma','File:CT scan image of PRCC in a 54-year-old woman.png'],['renal-angiomyolipoma','File:Angiomyolipom Niere rechts CT axial.png'],['polycystic-kidney','File:CT scan autosomal dominant polycystic kidney disease.jpg'],['renal-stone','File:Non-contrast coronal CT of multiple bilateral renal calculi.jpg'],
['ureteral-stone','File:PstoneUVJ.png'],['bladder-cancer','File:BilateralHydro.png'],['pheochromocytoma','File:Phaeochromozytoma CT coronal labelled.jpg'],['adrenal-myelolipoma','File:Myelolipom rechts CT axial 1.png'],
['small-bowel-obstruction','File:PSBOCT.png'],['intussusception','File:Ultrasound of pseudokidney sign in intussusception.jpg'],['bowel-perforation','File:CT scan coronal section gastric volvulus with perforation at fundus.jpg'],['crohn-disease','File:Ileitis terminalis bei langjaehrigem Morbus Crohn 63W - CT und MRT - 001.jpg'],
['mesenteric-ischemia','File:Mesenteriale Ischaemie mit Pneumatosis intestinalis und Gas in Mesenterial- und Lebervenen 80M - CT - 001.jpg'],['inguinal-hernia','File:Ultrasonography of inguinal hernia, cross-section.jpg'],['umbilical-hernia','File:Inkarzerierte Duenndarmschlinge in einer Nabelhernie bei Patient mit Aszites bei Leberzirrhose 56M - US und Vor-CT - 001.jpg'],
['gist','File:CT image of a GIST tumor in the gastric cardia.jpg'],['colon-cancer','File:RectalCancerStagingInPETCT+arrow.jpg'],['ectopic-pregnancy','File:Blob sign of ectopic pregnancy (hy).png'],['endometrioma','File:Endometrioma ground glass appearance.jpg']]);
addOld('腹部',[
['abdomen-appendicitis','File:Perityphlitischer Abszess in der CT - ax.jpg'],['abdomen-appendicitis','File:Retrozoekale Appendizitis 52M - CT sagittal KM - 001.jpg'],['abdomen-appendicitis','File:Contrast-enhanced CT scan (coronal) of abdomen and pelvis showing acute appendicitis.jpg'],
['abdomen-cholelithiasis','File:Ultrasound Scan ND 202.jpg'],['abdomen-cholelithiasis','File:Ultrasound of gall bladder with calculus.jpg'],['abdomen-cholelithiasis','File:Gallstone 0414092204515.jpg'],
['abdomen-diverticulitis','File:01-Sigmadivertikulitis CT cor 001 Perforation.png'],['abdomen-diverticulitis','File:02-Sigmadivertikulitis CT cor 001 Verdickte Wand Umgebungsreaktion.png'],['abdomen-diverticulitis','File:03-Sigmadivertikulitis CT ax 001 Kleiner Abszess.png'],
['abdomen-hcc','File:CT scan of hepatocellular carcinoma, without and with IV contrast.jpg'],
['abdomen-renal-cyst','File:Renal cyst ultrasound 110303120332 1216041.jpg'],['abdomen-renal-cyst','File:Renal cyst ultrasound 110316115548 1205200.jpg'],['abdomen-renal-cyst','File:Renal cyst ultrasound 110321134902 1351400.jpg'],
['abdomen-gallbladder-polyp','File:Gallbladder polyps 110848156.jpg']]);

addNew('骨骼',[
['humerus-fracture','File:Healing supracondylar fracture.jpg'],['scaphoid-fracture','File:X-ray of occult scaphoid fracture.jpg'],['scaphoid-fracture','File:X-ray of subtle scaphoid fracture.jpg'],['metacarpal-fracture','File:Avulsion fracture of the left first metacarpal.jpg'],
['elbow-dislocation','File:The fracture and dislocation of bones in an elbow joint, vie Wellcome V0029541.jpg'],['brodie-abscess','File:BrodieAbscessRadiograph.jpg'],['osteochondroma','File:Osteochondroma X-ray.jpg'],['osteoid-osteoma','File:Osteoidosteom Fibula CT KF.png'],
['rickets','File:RicketsChestXray.jpg'],['femoral-head-avn','File:Osteonecrosis femur 2img.jpg'],['perthes-disease','File:Roe-perthes.jpg'],
['hallux-valgus','File:Projectional radiograph of bunion.jpg'],['achilles-rupture','File:Achillessehnenruptur Sono.jpg'],['meniscal-tear','File:Proton density MRI of a grade 2 medial meniscal tear.jpg'],['rotator-cuff-tear','File:2 MRI. Complete tear and rupture of the supraspinatus tendon. Wide transmural damage (2.4 x 2.4 cm)..jpg'],
['biceps-tendon-rupture','File:Panoramic ultrasonography of biceps tendon rupture.jpg'],['osteoid-osteoma','File:OsteoidOsteomCholinePETCT.jpg']]);
addOld('骨骼',[
['bone-hip-fracture','File:Subtroch1.png'],['bone-hip-fracture','File:Fracture du col du fémur.jpg'],['bone-hip-fracture','File:Fracture pertrochantérienne.jpg'],['bone-hip-fracture','File:Neck of Femur fracture Right side in a 80 years old female patient.png'],['bone-hip-fracture','File:Skin folds over a hip fracture.jpg'],['bone-hip-fracture','File:X-ray of subtle compressive hip fracture.jpg'],['bone-hip-fracture','File:Transzervikale Femurfraktur rechts 82W - CR ap - 001.jpg'],['bone-hip-fracture','File:Mediale Schenkelhalsfraktur links 83W - CR Huefte axial - 001.jpg'],['bone-hip-fracture','File:Transzervikale Femurfraktur links 56M - CR ap - 001.jpg'],['bone-hip-fracture','File:Unverschobene pertrochantaere Femurfraktur rechts 79W - CR ap - 001.jpg'],['bone-hip-fracture','File:PertrochantaereFemurfraktur.jpg'],
['bone-clavicle-fracture','File:Clavicle fracture.jpg'],['bone-clavicle-fracture','File:Claviculafraktur lateral.png'],['bone-clavicle-fracture','File:Claviculafraktur median.jpg'],['bone-clavicle-fracture','File:Clavicle Pre-op.png'],['bone-clavicle-fracture','File:Butterflyclav.png'],['bone-clavicle-fracture','File:FracturedGlenoid.png'],['bone-clavicle-fracture','File:Закрытый оскольчатый перелом правой ключицы со смещением отломков.jpg'],['bone-clavicle-fracture','File:Fracture de la clavicule gauche.png'],
['bone-distal-radius','File:Pronator quadratus - fatpad-sign pathologisch bei Fraktur Erwachsener.png'],['bone-distal-radius','File:Radiology 1300573 Nevit.jpg'],['bone-distal-radius','File:Radiology ND 0125 ABF.jpg'],['bone-distal-radius','File:Aitken 1 distaler Radius - 12jm - Roe 2Eb - 001.jpg'],['bone-distal-radius','File:Chauffeur-Fraktur und PSU bei Ulnavorschub mit Impaktation 83W - CR ap - 001.jpg'],['bone-distal-radius','File:The bones of the hand of Mrs F. Bridgeman, wearing a ring Wellcome L0047928.jpg'],
['bone-shoulder-dislocation','File:Inferiourdislocation.JPG'],['bone-shoulder-dislocation','File:Dislocated shoulder X-ray 01.png'],['bone-shoulder-dislocation','File:Schulterluxation links Y 01.jpg'],['bone-shoulder-dislocation','File:Lussazione prima e dopo.png'],['bone-shoulder-dislocation','File:AnterDisAP.png'],['bone-shoulder-dislocation','File:Lightbulb sign - posterior shoulder dislocation - Roe vor und nach Reposition 001 - Annotation.jpg'],
['bone-scoliosis','File:Wiki pre-op.jpg'],['bone-scoliosis','File:Initial diagnosis of scoliosis with adams test and x-rays.jpg']]);

const counts=Object.fromEntries(['胸部','神经','腹部','骨骼'].map(system=>[system,picks.filter(x=>x.system===system).length]));
if(Object.values(counts).some(n=>n!==50))throw new Error(`Pick counts must be 50 each: ${JSON.stringify(counts)}`);
const usedUrl=new Set(manifest.records.map(x=>x.sourceUrl)),usedSha=new Set(manifest.records.map(x=>x.originalSha1));
const maxByGroup={};for(const r of manifest.records){const n=Number(r.id.match(/-(\d+)$/)?.[1]||0);maxByGroup[r.groupKey]=Math.max(maxByGroup[r.groupKey]||0,n)}
const resolved=[];
for(const pick of picks){
  const parent=pick.type==='new'?T[`${pick.system}:${pick.key}`]:G[pick.key];
  if(!parent)throw new Error(`Missing parent ${pick.key}`);
  const candidates=pick.type==='new'?parent.candidates:parent.candidates;
  const item=candidates.find(x=>x.title===pick.title);
  if(!item)throw new Error(`Missing candidate ${pick.key}: ${pick.title}`);
  if(usedUrl.has(item.sourceUrl)||usedSha.has(item.originalSha1))throw new Error(`Duplicate source: ${pick.title}`);
  usedUrl.add(item.sourceUrl);usedSha.add(item.originalSha1);
  const groupKey=pick.type==='new'?`${pick.system==='胸部'?'chest':pick.system==='神经'?'neuro':pick.system==='腹部'?'abdomen':'bone'}-new-${pick.key}`:pick.key;
  const seq=(maxByGroup[groupKey]||0)+1;maxByGroup[groupKey]=seq;
  resolved.push({...pick,parent,item,groupKey,id:`${groupKey}-${String(seq).padStart(2,'0')}`});
}

async function download(url,attempt=0){const response=await fetch(url,{headers:{'User-Agent':'MedicalImagingLearningAudit/2.0'}});if((response.status===429||response.status>=500)&&attempt<12){const wait=Math.min(60,(Number(response.headers.get('retry-after'))||10*(attempt+1)))*1000;console.log(`rate limited; waiting ${Math.round(wait/1000)}s`);await new Promise(r=>setTimeout(r,wait));return download(url,attempt+1)}if(!response.ok)throw new Error(`${response.status} ${url}`);return Buffer.from(await response.arrayBuffer())}
function commonsThumb(title){const name=title.replace(/^File:/i,'');return `https://commons.wikimedia.org/w/thumb.php?f=${encodeURIComponent(name)}&w=1200`}
const records=[];let done=0;
for(const row of resolved){
  const expectedExt=row.item.mime==='image/png'?'png':'jpg',expectedPath=path.join(ROOT,'assets','images','expanded',`${row.id}.${expectedExt}`);
  let bytes;try{bytes=await fs.readFile(expectedPath);if(bytes.length<10000)bytes=null}catch{}
  if(!bytes){await new Promise(r=>setTimeout(r,600));bytes=await download(commonsThumb(row.item.title))}
  const png=bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])),jpg=bytes[0]===255&&bytes[1]===216&&bytes[2]===255;
  if(!png&&!jpg)throw new Error(`Bad image ${row.item.title}`);if(bytes.length<10000)throw new Error(`Small image ${row.item.title}`);
  const image=`assets/images/expanded/${row.id}.${png?'png':'jpg'}`;await fs.writeFile(path.join(ROOT,...image.split('/')),bytes);
  records.push({id:row.id,groupKey:row.groupKey,system:row.system,image,sourceTitle:row.item.title.replace(/^File:/,''),sourceUrl:row.item.sourceUrl,sourceDescription:row.item.description,artist:row.item.artist,credit:row.item.credit,license:row.item.license,licenseUrl:row.item.licenseUrl,originalUrl:row.item.originalUrl,originalSha1:row.item.originalSha1,localSha256:crypto.createHash('sha256').update(bytes).digest('hex'),localBytes:bytes.length,width:row.item.width,height:row.item.height,mime:row.item.mime,retrieval:row.item.retrieval||'search',qualityScore:row.item.qualityScore||null});
  done++;if(done%20===0)console.log(`${done}/200`);
}
manifest.records.push(...records);manifest.count=manifest.records.length;manifest.generatedAt=new Date().toISOString();
await fs.writeFile(path.join(ROOT,'data','expanded-case-sources.json'),JSON.stringify(manifest,null,2)+'\n');

const newGroups={};
for(const row of resolved.filter(x=>x.type==='new')){
  if(newGroups[row.groupKey])continue;
  const t=row.parent,base={
    '胸部':{d:['肺炎性实变','肺不张','胸腔积液'],tags:['定位','分布'],observe:'按气道、肺实质、胸膜、心纵隔和骨骼顺序评估病变位置、范围及伴随征象',method:'先确认投照或序列质量，再定位异常并分析密度、形态、分布及邻近结构',next:'结合完整胸部检查、既往影像与临床资料，必要时补充CT、增强或专科检查'},
    '神经':{d:['急性脑梗死','脑内出血','脑膜瘤'],tags:['定位','占位效应'],observe:'按脑实质、脑外间隙、脑室脑池、血管和骨质顺序评估位置、信号及占位效应',method:'先确认序列或窗位，再判断病变位于脑内、脑外或血管，并用相邻层面和多序列核对',next:'结合神经定位、起病过程和完整MRI/CT序列，按需进行增强、血管成像或病理评估'},
    '腹部':{d:['急性炎症','良性囊性病变','恶性肿瘤'],tags:['器官定位','周围反应'],observe:'确认受累器官和切面，分析病灶形态、内部、强化或回声及周围脂肪和血管改变',method:'先定位器官与病灶中心，再比较不同增强时相或多切面超声表现并检查并发症',next:'结合症状、实验室指标和完整多期检查，必要时补充MRI、超声或内镜评估'},
    '骨骼':{d:['关节脱位','退行性关节病','骨与软组织感染'],tags:['解剖定位','对位'],observe:'沿骨皮质、小梁、关节面和软组织逐项观察，并确认病变部位、范围及对位关系',method:'至少结合两个正交方向或多个MRI序列，定位异常后分析边界、基质、骨膜反应和软组织',next:'结合年龄、损伤或症状背景与完整检查，必要时补充CT、MRI或规范骨肿瘤评估'}
  }[row.system];
  const distractors=base.d.filter(x=>x!==t.title).slice(0,3);while(distractors.length<3)distractors.push(['其他胸部病变','其他神经病变','其他腹部病变','其他骨关节病变'][['胸部','神经','腹部','骨骼'].indexOf(row.system)]);
  newGroups[row.groupKey]={title:t.title,english:t.english,modality:t.modality,level:'中级',distractors,tags:[t.title,t.modality,...base.tags],signs:[`确认${t.title}的主要影像异常与原始来源描述一致`,base.observe,'检查病变范围、邻近结构受累和需要紧急处理的并发征象'],basis:`原始来源明确将该影像标注为“${t.title}”；本例仅训练与该来源相符的影像模式，不补造未公开病史。`,differential:`需与${distractors.join('、')}等结合病变中心、形态、分布及完整序列鉴别。`,pearl:`先完成解剖定位和征象描述，再提出${t.title}；来源标签不能替代临床综合诊断。`,method:base.method,next:base.next,tips:['先独立描述可见征象，再查看来源诊断，避免标签先入为主。','在相邻层面或正交投照确认异常，避免把单层伪影当病变。'],pitfalls:['静态图片不能替代完整DICOM序列、测量和增强时相评价。','不得根据未公开信息推断病理分级、病因或治疗方案。'],recall:`定位 → 核对${t.title}核心征象 → 评估范围与并发症 → 完整检查确认。`,ref:'acr'};
}
const js=`// Generated by scripts/assemble-next-200.mjs.\nconst ADDITIONAL_GROUPS = ${JSON.stringify(newGroups,null,2)};\n`;
await fs.writeFile(path.join(ROOT,'additional-groups.js'),js);
console.log('Appended',records.length,'records.',counts,'New total:',manifest.count,'New groups:',Object.keys(newGroups).length);
