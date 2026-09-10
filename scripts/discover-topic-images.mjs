import fs from 'node:fs/promises';
import path from 'node:path';

const ROOT=path.resolve(import.meta.dirname,'..');
const API='https://commons.wikimedia.org/w/api.php';
const manifest=JSON.parse(await fs.readFile(path.join(ROOT,'data','expanded-case-sources.json'),'utf8'));
const used=new Set(manifest.records.flatMap(x=>[x.sourceUrl,x.originalSha1]));
let previousByKey=new Map();
try{const previous=JSON.parse(await fs.readFile(path.join(ROOT,'data','topic-image-candidates.json'),'utf8'));previousByKey=new Map(previous.topics.map(x=>[x.key,x]));}catch{}
const topics=[];
const add=(system,rows)=>rows.forEach(([key,title,english,modality,query])=>topics.push({system,key,title,english,modality,query}));

add('胸部',[
['lung-adenocarcinoma','肺腺癌','Lung adenocarcinoma','CT','lung adenocarcinoma CT'],['squamous-lung-cancer','肺鳞状细胞癌','Squamous cell lung carcinoma','CT','squamous cell lung carcinoma CT'],
['small-cell-lung-cancer','小细胞肺癌','Small-cell lung cancer','CT','small cell lung cancer CT'],['pulmonary-nodule','肺结节','Pulmonary nodule','CT','pulmonary nodule CT'],
['lung-metastases','肺转移瘤','Pulmonary metastases','CT','lung metastases CT'],['mesothelioma','恶性胸膜间皮瘤','Malignant pleural mesothelioma','CT','mesothelioma CT chest'],
['pleural-plaque','胸膜斑','Pleural plaque','X-RAY','pleural plaques radiograph'],['asbestosis','石棉肺','Asbestosis','X-RAY','asbestosis chest radiograph'],
['silicosis','矽肺','Silicosis','X-RAY','silicosis chest radiograph'],['coal-pneumoconiosis','煤工尘肺','Coal workers pneumoconiosis','X-RAY','coal workers pneumoconiosis radiograph'],
['aspergilloma','曲霉球','Aspergilloma','CT','aspergilloma CT'],['invasive-aspergillosis','侵袭性肺曲霉病','Invasive pulmonary aspergillosis','CT','invasive pulmonary aspergillosis CT'],
['cystic-fibrosis','囊性纤维化肺病','Cystic fibrosis lung disease','X-RAY','cystic fibrosis chest radiograph'],['ards','急性呼吸窘迫综合征','Acute respiratory distress syndrome','X-RAY','ARDS chest radiograph'],
['aspiration-pneumonia','吸入性肺炎','Aspiration pneumonia','X-RAY','aspiration pneumonia radiograph'],['empyema','脓胸','Pleural empyema','CT','empyema CT chest'],
['hemothorax','血胸','Hemothorax','X-RAY','hemothorax chest radiograph'],['pulmonary-hypertension','肺动脉高压','Pulmonary hypertension','X-RAY','pulmonary hypertension chest radiograph'],
['pulmonary-artery-aneurysm','肺动脉瘤','Pulmonary artery aneurysm','CT','pulmonary artery aneurysm CT'],['eisenmenger','艾森曼格综合征','Eisenmenger syndrome','X-RAY','Eisenmenger syndrome chest radiograph'],
['tetralogy-fallot','法洛四联症','Tetralogy of Fallot','X-RAY','Tetralogy of Fallot chest radiograph'],['dextrocardia','右位心','Dextrocardia','X-RAY','dextrocardia chest radiograph'],
['situs-inversus','内脏反位','Situs inversus','X-RAY','situs inversus chest radiograph'],['scimitar-syndrome','弯刀综合征','Scimitar syndrome','X-RAY','scimitar syndrome radiograph'],
['pulmonary-sequestration','肺隔离症','Pulmonary sequestration','CT','pulmonary sequestration CT'],['congenital-diaphragmatic-hernia','先天性膈疝','Congenital diaphragmatic hernia','X-RAY','congenital diaphragmatic hernia radiograph'],
['morgagni-hernia','Morgagni疝','Morgagni hernia','CT','Morgagni hernia CT'],['bochdalek-hernia','Bochdalek疝','Bochdalek hernia','CT','Bochdalek hernia CT'],
['tracheal-stenosis','气管狭窄','Tracheal stenosis','CT','tracheal stenosis CT'],['tracheal-foreign-body','气管异物','Tracheal foreign body','X-RAY','tracheal foreign body radiograph'],
['bronchial-foreign-body','支气管异物','Bronchial foreign body','X-RAY','bronchial foreign body radiograph'],['bronchogenic-cyst','支气管源性囊肿','Bronchogenic cyst','CT','bronchogenic cyst CT'],
['pneumatocele','肺气囊','Pneumatocele','X-RAY','pneumatocele chest radiograph'],['pulmonary-contusion','肺挫伤','Pulmonary contusion','CT','pulmonary contusion CT'],
['flail-chest','连枷胸','Flail chest','X-RAY','flail chest radiograph'],['rib-fracture','肋骨骨折','Rib fracture','X-RAY','rib fracture radiograph'],
['sternal-fracture','胸骨骨折','Sternal fracture','CT','sternal fracture CT'],['pectus-excavatum','漏斗胸','Pectus excavatum','CT','pectus excavatum CT'],
['pectus-carinatum','鸡胸','Pectus carinatum','X-RAY','pectus carinatum radiograph'],['mediastinal-teratoma','纵隔畸胎瘤','Mediastinal teratoma','CT','mediastinal teratoma CT'],
['mediastinal-lymphoma','纵隔淋巴瘤','Mediastinal lymphoma','CT','mediastinal lymphoma CT'],['retrosternal-goiter','胸骨后甲状腺肿','Retrosternal goiter','CT','retrosternal goiter CT'],
['esophageal-perforation','食管穿孔','Esophageal perforation','X-RAY','esophageal perforation radiograph'],['achalasia','贲门失弛缓症','Achalasia','X-RAY','achalasia barium swallow'],
['zenker-diverticulum','Zenker憩室','Zenker diverticulum','X-RAY','Zenker diverticulum barium swallow'],['esophageal-cancer','食管癌','Esophageal cancer','X-RAY','esophageal cancer barium swallow'],
['diaphragmatic-eventration','膈膨升','Diaphragmatic eventration','X-RAY','diaphragmatic eventration radiograph'],['diaphragmatic-paralysis','膈肌麻痹','Diaphragmatic paralysis','X-RAY','diaphragmatic paralysis radiograph'],
['alveolar-proteinosis','肺泡蛋白沉积症','Pulmonary alveolar proteinosis','CT','pulmonary alveolar proteinosis CT'],['lymphangitic-carcinomatosis','癌性淋巴管炎','Pulmonary lymphangitic carcinomatosis','CT','pulmonary lymphangitic carcinomatosis CT']]);

add('神经',[
['pituitary-adenoma','垂体腺瘤','Pituitary adenoma','MRI','pituitary adenoma MRI'],['craniopharyngioma','颅咽管瘤','Craniopharyngioma','MRI','craniopharyngioma MRI'],
['vestibular-schwannoma','前庭神经鞘瘤','Vestibular schwannoma','MRI','vestibular schwannoma MRI'],['trigeminal-schwannoma','三叉神经鞘瘤','Trigeminal schwannoma','MRI','trigeminal schwannoma MRI'],
['cerebral-aneurysm','颅内动脉瘤','Intracranial aneurysm','CTA','cerebral aneurysm angiography'],['brain-avm','脑动静脉畸形','Brain arteriovenous malformation','MRI','brain arteriovenous malformation MRI'],
['cavernous-malformation','脑海绵状血管畸形','Cerebral cavernous malformation','MRI','cerebral cavernous malformation MRI'],['developmental-venous-anomaly','发育性静脉异常','Developmental venous anomaly','MRI','developmental venous anomaly MRI'],
['venous-sinus-thrombosis','脑静脉窦血栓','Cerebral venous sinus thrombosis','MRI','cerebral venous sinus thrombosis MRI'],['moyamoya','烟雾病','Moyamoya disease','CTA','moyamoya angiography'],
['carotid-dissection','颈动脉夹层','Carotid artery dissection','CTA','carotid artery dissection CTA'],['dural-avf','硬脑膜动静脉瘘','Dural arteriovenous fistula','CTA','dural arteriovenous fistula angiography'],
['hydrocephalus','脑积水','Hydrocephalus','CT','hydrocephalus CT brain'],['brain-abscess','脑脓肿','Brain abscess','MRI','brain abscess MRI'],
['cerebral-toxoplasmosis','脑弓形虫病','Cerebral toxoplasmosis','MRI','cerebral toxoplasmosis MRI'],['herpes-encephalitis','单纯疱疹病毒性脑炎','Herpes simplex encephalitis','MRI','herpes encephalitis MRI'],
['pres','可逆性后部脑病综合征','Posterior reversible encephalopathy syndrome','MRI','PRES brain MRI'],['adem','急性播散性脑脊髓炎','Acute disseminated encephalomyelitis','MRI','ADEM brain MRI'],
['nmosd','视神经脊髓炎谱系病','Neuromyelitis optica spectrum disorder','MRI','neuromyelitis optica MRI'],['cadasil','CADASIL','CADASIL','MRI','CADASIL brain MRI'],
['cerebral-atrophy','脑萎缩','Cerebral atrophy','CT','cerebral atrophy CT'],['alzheimer','阿尔茨海默病影像模式','Alzheimer disease imaging pattern','MRI','Alzheimer disease brain MRI'],
['frontotemporal-dementia','额颞叶变性影像模式','Frontotemporal dementia imaging pattern','MRI','frontotemporal dementia MRI'],['parkinson-datscan','帕金森病DAT显像','Parkinson disease dopamine transporter scan','SPECT','Parkinson disease DaTscan'],
['huntington','亨廷顿病影像模式','Huntington disease imaging pattern','MRI','Huntington disease brain MRI'],['oligodendroglioma','少突胶质细胞瘤','Oligodendroglioma','MRI','oligodendroglioma MRI'],
['astrocytoma','星形细胞瘤','Astrocytoma','MRI','astrocytoma MRI brain'],['ependymoma','室管膜瘤','Ependymoma','MRI','ependymoma MRI brain'],
['medulloblastoma','髓母细胞瘤','Medulloblastoma','MRI','medulloblastoma MRI'],['pineal-tumor','松果体区肿瘤','Pineal region tumor','MRI','pineal tumor MRI'],
['hemangioblastoma','血管母细胞瘤','Hemangioblastoma','MRI','hemangioblastoma MRI brain'],['central-neurocytoma','中枢神经细胞瘤','Central neurocytoma','MRI','central neurocytoma MRI'],
['choroid-plexus-papilloma','脉络丛乳头状瘤','Choroid plexus papilloma','MRI','choroid plexus papilloma MRI'],['dysembryoplastic-neuroepithelial-tumor','胚胎发育不良性神经上皮肿瘤','Dysembryoplastic neuroepithelial tumor','MRI','DNET brain MRI'],
['sega','室管膜下巨细胞星形细胞瘤','Subependymal giant cell astrocytoma','MRI','subependymal giant cell astrocytoma MRI'],['chiari-malformation','Chiari I型畸形','Chiari I malformation','MRI','Chiari I malformation MRI'],
['dandy-walker','Dandy-Walker畸形','Dandy-Walker malformation','MRI','Dandy Walker malformation MRI'],['corpus-callosum-agenesis','胼胝体发育不全','Agenesis of corpus callosum','MRI','agenesis corpus callosum MRI'],
['holoprosencephaly','前脑无裂畸形','Holoprosencephaly','MRI','holoprosencephaly MRI'],['lissencephaly','无脑回畸形','Lissencephaly','MRI','lissencephaly MRI'],
['polymicrogyria','多小脑回畸形','Polymicrogyria','MRI','polymicrogyria MRI'],['tuberous-sclerosis','结节性硬化症脑部改变','Tuberous sclerosis brain findings','MRI','tuberous sclerosis brain MRI'],
['neurofibromatosis-2','2型神经纤维瘤病','Neurofibromatosis type 2','MRI','neurofibromatosis type 2 MRI'],['sturge-weber','Sturge-Weber综合征','Sturge-Weber syndrome','CT','Sturge Weber brain CT'],
['rasmussen-encephalitis','Rasmussen脑炎','Rasmussen encephalitis','MRI','Rasmussen encephalitis MRI'],['periventricular-leukomalacia','脑室周围白质软化','Periventricular leukomalacia','MRI','periventricular leukomalacia MRI'],
['spinal-cord-compression','脊髓压迫','Spinal cord compression','MRI','spinal cord compression MRI'],['cervical-disc-herniation','颈椎间盘突出','Cervical disc herniation','MRI','cervical disc herniation MRI'],
['spinal-epidural-abscess','脊柱硬膜外脓肿','Spinal epidural abscess','MRI','spinal epidural abscess MRI'],['syringomyelia','脊髓空洞症','Syringomyelia','MRI','syringomyelia MRI']]);

add('腹部',[
['acute-pancreatitis','急性胰腺炎','Acute pancreatitis','CT','acute pancreatitis CT'],['chronic-pancreatitis','慢性胰腺炎','Chronic pancreatitis','CT','chronic pancreatitis CT'],
['pancreatic-cancer','胰腺导管腺癌','Pancreatic ductal adenocarcinoma','CT','pancreatic adenocarcinoma CT'],['pancreatic-pseudocyst','胰腺假性囊肿','Pancreatic pseudocyst','CT','pancreatic pseudocyst CT'],
['ipmn','胰腺导管内乳头状黏液性肿瘤','Intraductal papillary mucinous neoplasm','MRI','IPMN pancreas MRI'],['acute-cholecystitis','急性胆囊炎','Acute cholecystitis','US','acute cholecystitis ultrasound'],
['choledocholithiasis','胆总管结石','Choledocholithiasis','US','choledocholithiasis ultrasound'],['cholangiocarcinoma','胆管癌','Cholangiocarcinoma','CT','cholangiocarcinoma CT'],
['biliary-obstruction','胆道梗阻','Biliary obstruction','CT','biliary obstruction CT'],['hepatic-steatosis','肝脂肪变','Hepatic steatosis','US','hepatic steatosis ultrasound'],
['cirrhosis','肝硬化','Liver cirrhosis','CT','liver cirrhosis CT'],['portal-hypertension','门静脉高压','Portal hypertension','CT','portal hypertension CT'],
['splenomegaly','脾大','Splenomegaly','CT','splenomegaly CT'],['splenic-infarction','脾梗死','Splenic infarction','CT','splenic infarction CT'],
['splenic-rupture','脾破裂','Splenic rupture','CT','splenic rupture CT'],['liver-abscess','肝脓肿','Liver abscess','CT','liver abscess CT'],
['renal-abscess','肾脓肿','Renal abscess','CT','renal abscess CT'],['pyelonephritis','急性肾盂肾炎','Acute pyelonephritis','CT','acute pyelonephritis CT'],
['renal-cell-carcinoma','肾细胞癌','Renal cell carcinoma','CT','renal cell carcinoma CT'],['renal-angiomyolipoma','肾血管平滑肌脂肪瘤','Renal angiomyolipoma','CT','renal angiomyolipoma CT'],
['polycystic-kidney','多囊肾','Polycystic kidney disease','CT','polycystic kidney CT'],['renal-stone','肾结石','Renal calculus','CT','renal stone CT'],
['ureteral-stone','输尿管结石','Ureteral calculus','CT','ureteral stone CT'],['bladder-stone','膀胱结石','Bladder calculus','X-RAY','bladder stone radiograph'],
['bladder-cancer','膀胱癌','Bladder cancer','CT','bladder cancer CT'],['adrenal-adenoma','肾上腺腺瘤','Adrenal adenoma','CT','adrenal adenoma CT'],
['pheochromocytoma','嗜铬细胞瘤','Pheochromocytoma','CT','pheochromocytoma CT'],['adrenal-myelolipoma','肾上腺髓样脂肪瘤','Adrenal myelolipoma','CT','adrenal myelolipoma CT'],
['small-bowel-obstruction','小肠梗阻','Small bowel obstruction','CT','small bowel obstruction CT'],['large-bowel-obstruction','大肠梗阻','Large bowel obstruction','CT','large bowel obstruction CT'],
['intussusception','肠套叠','Intussusception','US','intussusception ultrasound'],['sigmoid-volvulus','乙状结肠扭转','Sigmoid volvulus','X-RAY','sigmoid volvulus radiograph'],
['cecal-volvulus','盲肠扭转','Cecal volvulus','X-RAY','cecal volvulus radiograph'],['pneumoperitoneum','气腹','Pneumoperitoneum','X-RAY','pneumoperitoneum radiograph'],
['bowel-perforation','消化道穿孔','Bowel perforation','CT','bowel perforation CT'],['crohn-disease','克罗恩病','Crohn disease','CT','Crohn disease CT'],
['ulcerative-colitis','溃疡性结肠炎','Ulcerative colitis','X-RAY','ulcerative colitis radiograph'],['toxic-megacolon','中毒性巨结肠','Toxic megacolon','X-RAY','toxic megacolon radiograph'],
['mesenteric-ischemia','肠系膜缺血','Mesenteric ischemia','CTA','mesenteric ischemia CT'],['sma-syndrome','肠系膜上动脉综合征','Superior mesenteric artery syndrome','CT','superior mesenteric artery syndrome CT'],
['abdominal-wall-hernia','腹壁疝','Abdominal wall hernia','CT','abdominal wall hernia CT'],['inguinal-hernia','腹股沟疝','Inguinal hernia','US','inguinal hernia ultrasound'],
['umbilical-hernia','脐疝','Umbilical hernia','CT','umbilical hernia CT'],['gastric-cancer','胃癌','Gastric cancer','CT','gastric cancer CT'],
['gist','胃肠道间质瘤','Gastrointestinal stromal tumor','CT','gastrointestinal stromal tumor CT'],['colon-cancer','结肠癌','Colon cancer','CT','colon cancer CT'],
['rectal-cancer','直肠癌','Rectal cancer','MRI','rectal cancer MRI'],['ovarian-torsion','卵巢扭转','Ovarian torsion','US','ovarian torsion ultrasound'],
['ectopic-pregnancy','异位妊娠','Ectopic pregnancy','US','ectopic pregnancy ultrasound'],['endometrioma','卵巢子宫内膜异位囊肿','Ovarian endometrioma','US','endometrioma ultrasound']]);

add('骨骼',[
['humerus-fracture','肱骨骨折','Humerus fracture','X-RAY','humerus fracture radiograph'],['scaphoid-fracture','舟骨骨折','Scaphoid fracture','X-RAY','scaphoid fracture radiograph'],
['metacarpal-fracture','掌骨骨折','Metacarpal fracture','X-RAY','metacarpal fracture radiograph'],['phalanx-fracture','指骨骨折','Phalanx fracture','X-RAY','phalanx fracture radiograph'],
['patellar-fracture','髌骨骨折','Patellar fracture','X-RAY','patellar fracture radiograph'],['pelvic-fracture','骨盆骨折','Pelvic fracture','X-RAY','pelvic fracture radiograph'],
['rib-fracture','肋骨骨折','Rib fracture','X-RAY','rib fracture radiograph'],['sternal-fracture','胸骨骨折','Sternal fracture','X-RAY','sternal fracture radiograph'],
['elbow-dislocation','肘关节脱位','Elbow dislocation','X-RAY','elbow dislocation radiograph'],['hip-dislocation','髋关节脱位','Hip dislocation','X-RAY','hip dislocation radiograph'],
['knee-osteoarthritis','膝骨关节炎','Knee osteoarthritis','X-RAY','knee osteoarthritis radiograph'],['hip-osteoarthritis','髋骨关节炎','Hip osteoarthritis','X-RAY','hip osteoarthritis radiograph'],
['cervical-spondylosis','颈椎病影像改变','Cervical spondylosis','X-RAY','cervical spondylosis radiograph'],['ankylosing-spondylitis','强直性脊柱炎','Ankylosing spondylitis','X-RAY','ankylosing spondylitis radiograph'],
['psoriatic-arthritis','银屑病关节炎','Psoriatic arthritis','X-RAY','psoriatic arthritis radiograph'],['gout','痛风性关节炎','Gouty arthritis','X-RAY','gout arthritis radiograph'],
['septic-arthritis','化脓性关节炎','Septic arthritis','X-RAY','septic arthritis radiograph'],['osteomyelitis','骨髓炎','Osteomyelitis','X-RAY','osteomyelitis radiograph'],
['brodie-abscess','Brodie脓肿','Brodie abscess','X-RAY','Brodie abscess radiograph'],['ewing-sarcoma','尤文肉瘤','Ewing sarcoma','X-RAY','Ewing sarcoma radiograph'],
['chondrosarcoma','软骨肉瘤','Chondrosarcoma','X-RAY','chondrosarcoma radiograph'],['enchondroma','内生软骨瘤','Enchondroma','X-RAY','enchondroma radiograph'],
['osteochondroma','骨软骨瘤','Osteochondroma','X-RAY','osteochondroma radiograph'],['giant-cell-tumor','骨巨细胞瘤','Giant cell tumor of bone','X-RAY','giant cell tumor bone radiograph'],
['chondroblastoma','软骨母细胞瘤','Chondroblastoma','X-RAY','chondroblastoma radiograph'],['osteoblastoma','成骨细胞瘤','Osteoblastoma','X-RAY','osteoblastoma radiograph'],
['osteoid-osteoma','骨样骨瘤','Osteoid osteoma','CT','osteoid osteoma CT'],['simple-bone-cyst','单纯性骨囊肿','Unicameral bone cyst','X-RAY','unicameral bone cyst radiograph'],
['aneurysmal-bone-cyst','动脉瘤样骨囊肿','Aneurysmal bone cyst','X-RAY','aneurysmal bone cyst radiograph'],['fibrous-dysplasia','骨纤维异常增殖症','Fibrous dysplasia','X-RAY','fibrous dysplasia radiograph'],
['paget-disease','Paget骨病','Paget disease of bone','X-RAY','Paget disease bone radiograph'],['osteopetrosis','石骨症','Osteopetrosis','X-RAY','osteopetrosis radiograph'],
['osteogenesis-imperfecta','成骨不全','Osteogenesis imperfecta','X-RAY','osteogenesis imperfecta radiograph'],['rickets','佝偻病','Rickets','X-RAY','rickets radiograph'],
['scurvy','坏血病骨改变','Scurvy bone findings','X-RAY','scurvy radiograph'],['brown-tumor','甲状旁腺功能亢进棕色瘤','Brown tumor of hyperparathyroidism','X-RAY','brown tumor hyperparathyroidism radiograph'],
['femoral-head-avn','股骨头缺血性坏死','Femoral head osteonecrosis','MRI','femoral head avascular necrosis MRI'],['scfe','股骨头骨骺滑脱','Slipped capital femoral epiphysis','X-RAY','slipped capital femoral epiphysis radiograph'],
['perthes-disease','Legg-Calvé-Perthes病','Legg-Calvé-Perthes disease','X-RAY','Perthes disease radiograph'],['developmental-hip-dysplasia','发育性髋关节发育不良','Developmental dysplasia of the hip','X-RAY','developmental dysplasia hip radiograph'],
['clubfoot','马蹄内翻足','Clubfoot','X-RAY','clubfoot radiograph'],['hallux-valgus','拇外翻','Hallux valgus','X-RAY','hallux valgus radiograph'],
['achilles-rupture','跟腱断裂','Achilles tendon rupture','US','Achilles tendon rupture ultrasound'],['acl-tear','前交叉韧带撕裂','Anterior cruciate ligament tear','MRI','ACL tear MRI'],
['meniscal-tear','半月板撕裂','Meniscal tear','MRI','meniscal tear MRI'],['rotator-cuff-tear','肩袖撕裂','Rotator cuff tear','MRI','rotator cuff tear MRI'],
['biceps-tendon-rupture','肱二头肌腱断裂','Biceps tendon rupture','US','biceps tendon rupture ultrasound'],['carpal-tunnel','腕管综合征超声','Carpal tunnel syndrome ultrasound','US','carpal tunnel syndrome ultrasound'],
['sacroiliitis','骶髂关节炎','Sacroiliitis','MRI','sacroiliitis MRI'],['spondylolisthesis','腰椎滑脱','Spondylolisthesis','X-RAY','spondylolisthesis radiograph']]);

const reject=/histopath|histolog|microscop|gross specimen|gross pathology|diagram|illustration|drawing|surgery|operative|ultrasound probe|clinical photograph|patient photograph|cadaver|autopsy|veterinary|canine|feline|dog |cat |rabbit|mouse |rat |pet scan|spectrogram/i;
const allowed=/^(CC0|Public domain|PD|CC BY|CC BY-SA)/i;
const plain=s=>(s||'').replace(/<br\s*\/?>/gi,' ').replace(/<[^>]+>/g,' ').replace(/&nbsp;|&amp;/gi,' ').replace(/\s+/g,' ').trim();
async function query(topic,attempt=0){
  const body=new URLSearchParams({action:'query',format:'json',formatversion:'2',generator:'search',gsrsearch:`${topic.query} filetype:bitmap`,gsrnamespace:'6',gsrlimit:'25',prop:'imageinfo',iiprop:'url|sha1|mime|size|extmetadata',iiurlwidth:'1200'});
  const response=await fetch(API,{method:'POST',headers:{'User-Agent':'MedicalImagingLearningAudit/2.0','Content-Type':'application/x-www-form-urlencoded'},body});
  if((response.status===429||response.status>=500)&&attempt<8){const wait=(Number(response.headers.get('retry-after'))||Math.min(30,4*(attempt+1)))*1000;await new Promise(r=>setTimeout(r,wait));return query(topic,attempt+1)}
  if(!response.ok)throw new Error(`${response.status} ${topic.key}`);
  const json=await response.json();
  return (json.query?.pages||[]).map(page=>{const info=page.imageinfo?.[0],meta=info?.extmetadata||{};return info?{title:page.title,sourceUrl:info.descriptionurl,originalUrl:info.url,downloadUrl:info.thumburl||info.url,originalSha1:info.sha1,width:info.width,height:info.height,mime:info.mime,license:plain(meta.LicenseShortName?.value||meta.License?.value),licenseUrl:meta.LicenseUrl?.value||'',artist:plain(meta.Artist?.value||'Wikimedia Commons contributor'),credit:plain(meta.Credit?.value||''),description:plain(meta.ImageDescription?.value||meta.ObjectName?.value||page.title)}:null}).filter(Boolean)
    .filter(x=>/^image\/(jpeg|png)$/i.test(x.mime)&&allowed.test(x.license)&&Math.min(x.width,x.height)>=300&&!reject.test(`${x.title} ${x.description}`)&&!used.has(x.sourceUrl)&&!used.has(x.originalSha1));
}

let cursor=0;const results=new Array(topics.length);
async function worker(){while(cursor<topics.length){const i=cursor++,topic=topics[i],previous=previousByKey.get(topic.key);if(previous?.candidates?.length){results[i]={...topic,candidates:previous.candidates};continue}await new Promise(r=>setTimeout(r,1200));try{const candidates=await query(topic);results[i]={...topic,candidates};console.log(`${i+1}/${topics.length} ${topic.system} ${topic.title}: ${candidates.length}`)}catch(error){results[i]={...topic,candidates:[],error:error.message};console.error(error.message)}}}
await worker();
await fs.writeFile(path.join(ROOT,'data','topic-image-candidates.json'),JSON.stringify({generatedAt:new Date().toISOString(),topics:results},null,2)+'\n');
console.log('Topics with candidates:',results.filter(x=>x.candidates.length).length,'/',results.length);
