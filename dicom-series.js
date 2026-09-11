'use strict';

// Curated from the NCI Imaging Data Commons v24 index. These are independent,
// de-identified studies opened in OHIF through IDC's read-only DICOMweb proxy.
// Collection membership is context, not a per-image diagnostic assertion.
const DICOM_STUDIES = [
  {system:'胸部',title:'COVID-19 胸部影像 01',collection:'covid_19_ar',subject:'COVID-19-AR-16434356',modality:'CR',body:'CHEST',size:5.6,uid:'1.3.6.1.4.1.14519.5.2.1.9999.103.1440529507365620961029596952895',doi:'10.7937/tcia.2020.py71-5978',license:'CC BY 4.0'},
  {system:'胸部',title:'COVID-19 胸部影像 02',collection:'covid_19_ar',subject:'COVID-19-AR-16406521',modality:'CR',body:'CHEST',size:6.2,uid:'1.3.6.1.4.1.14519.5.2.1.9999.103.1461751306580534101228829584765',doi:'10.7937/tcia.2020.py71-5978',license:'CC BY 4.0'},
  {system:'胸部',title:'肺鳞癌集合 CT 01',collection:'tcga_lusc',subject:'TCGA-34-5240',modality:'CT',body:'LUNG',size:16.5,uid:'1.3.6.1.4.1.14519.5.2.1.6450.4012.251905430824245964574646229634',doi:'10.7937/k9/tcia.2016.tygkkfmq',license:'CC BY 3.0'},
  {system:'胸部',title:'肺鳞癌集合 CT 02',collection:'tcga_lusc',subject:'TCGA-60-2721',modality:'CT',body:'LUNG',size:27.2,uid:'1.3.6.1.4.1.14519.5.2.1.3023.4012.821965139612499309910569777644',doi:'10.7937/k9/tcia.2016.tygkkfmq',license:'CC BY 3.0'},
  {system:'胸部',title:'肺腺癌集合 CT',collection:'tcga_luad',subject:'TCGA-17-Z016',modality:'CT',body:'CHEST',size:0.5,uid:'1.3.6.1.4.1.14519.5.2.1.7777.9002.379892319686532123515666165164',doi:'10.7937/k9/tcia.2016.jgnihep5',license:'CC BY 3.0'},

  {system:'神经',title:'脑胶质瘤多序列 MRI 01',collection:'icdc_glioma',subject:'GLIOMA01-i_B70F',modality:'MRI',body:'HEAD',size:12.0,uid:'1.3.6.1.4.1.14519.5.2.1.135473408767376676403387371231283047350',doi:'10.7937/tcia.svqt-q016',license:'CC BY 4.0'},
  {system:'神经',title:'脑胶质瘤多序列 MRI 02',collection:'icdc_glioma',subject:'GLIOMA01-i_E952',modality:'MRI',body:'HEAD',size:14.3,uid:'1.3.6.1.4.1.14519.5.2.1.117926907228339261453178550732951473986',doi:'10.7937/tcia.svqt-q016',license:'CC BY 4.0'},
  {system:'神经',title:'胶质母细胞瘤 MRI + SEG 01',collection:'upenn_gbm',subject:'UPENN-GBM-00486',modality:'MRI / SEG',body:'HEADNECK',size:3.4,uid:'1.3.6.1.4.1.14519.5.2.1.124357940058321710023130047237089653999',doi:'10.5281/zenodo.8345959',license:'CC BY 4.0'},
  {system:'神经',title:'胶质母细胞瘤 MRI + SEG 02',collection:'upenn_gbm',subject:'UPENN-GBM-00486',modality:'MRI / SEG',body:'HEADNECK',size:3.4,uid:'1.3.6.1.4.1.14519.5.2.1.182161995617763549966721911916922179485',doi:'10.5281/zenodo.8345959',license:'CC BY 4.0'},
  {system:'神经',title:'前庭神经鞘瘤 MRI / 放疗结构',collection:'vestibular_schwannoma_seg',subject:'VS-SEG-131',modality:'MRI / RT',body:'IAC',size:92.6,uid:'1.3.6.1.4.1.14519.5.2.1.14474984920490690366585601336497235213',doi:'10.7937/tcia.9ytj-5q73',license:'CC BY 4.0'},

  {system:'腹部',title:'肾肿瘤 CT + 分割 01',collection:'c4kc_kits',subject:'KiTS-00113',modality:'CT / SEG',body:'ABDOMEN',size:25.6,uid:'1.3.6.1.4.1.14519.5.2.1.6919.4624.334792369365591915280309106908',doi:'10.7937/tcia.2019.ix49e8nx',license:'CC BY 3.0'},
  {system:'腹部',title:'肾肿瘤 CT + 分割 02',collection:'c4kc_kits',subject:'KiTS-00070',modality:'CT / SEG',body:'ABDOMEN',size:33.9,uid:'1.3.6.1.4.1.14519.5.2.1.6919.4624.176302853980195039205634621220',doi:'10.7937/tcia.2019.ix49e8nx',license:'CC BY 3.0'},
  {system:'腹部',title:'肝细胞癌集合 CT',collection:'tcga_lihc',subject:'TCGA-DD-A1EJ',modality:'CT',body:'LIVER',size:4.0,uid:'1.3.6.1.4.1.14519.5.2.1.3344.4008.267907254715037292433972747932',doi:'10.7937/k9/tcia.2016.immqw8uq',license:'CC BY 3.0'},
  {system:'腹部',title:'肝细胞癌集合 MRI',collection:'tcga_lihc',subject:'TCGA-DD-A3A0',modality:'MRI',body:'LIVER',size:4.1,uid:'1.3.6.1.4.1.14519.5.2.1.3344.4008.130981350480025856864319518013',doi:'10.7937/k9/tcia.2016.immqw8uq',license:'CC BY 3.0'},
  {system:'腹部',title:'胰腺 CT + 器官分割',collection:'pancreas_ct',subject:'PANCREAS_0080',modality:'CT / SEG',body:'PANCREAS',size:97.7,uid:'1.2.826.0.1.3680043.2.1125.1.60401621965073299400071712795433179',doi:'10.5281/zenodo.12130275',license:'CC BY 4.0'},

  {system:'骨骼',title:'四肢软组织肉瘤 MRI 01',collection:'soft_tissue_sarcoma',subject:'STS_035',modality:'MRI / RTSTRUCT',body:'EXTREMITY',size:6.6,uid:'1.3.6.1.4.1.14519.5.2.1.5168.1900.517248714345382849111607475793',doi:'10.7937/k9/tcia.2015.7go2gsks',license:'CC BY 3.0'},
  {system:'骨骼',title:'四肢软组织肉瘤 MRI 02',collection:'soft_tissue_sarcoma',subject:'STS_024',modality:'MRI / RTSTRUCT',body:'EXTREMITY',size:6.9,uid:'1.3.6.1.4.1.14519.5.2.1.5168.1900.253622165559798911097040476621',doi:'10.7937/k9/tcia.2015.7go2gsks',license:'CC BY 3.0'},
  {system:'骨骼',title:'脊柱转移瘤 CT + 分割 01',collection:'spine_mets_ct_seg',subject:'13800',modality:'CT / SEG',body:'SPINE',size:126.5,uid:'1.3.6.1.4.1.14519.5.2.1.141265557749994688235436797481295066966',doi:'10.7937/kh36-ds04',license:'CC BY 4.0'},
  {system:'骨骼',title:'脊柱转移瘤 CT + 分割 02',collection:'spine_mets_ct_seg',subject:'13843',modality:'CT / SEG',body:'SPINE',size:136.4,uid:'1.3.6.1.4.1.14519.5.2.1.298138167721442899055280853832160857126',doi:'10.7937/kh36-ds04',license:'CC BY 4.0'},
  {system:'骨骼',title:'多发性骨髓瘤腰椎 MRI',collection:'cmb_mml',subject:'MSB-08093',modality:'MRI',body:'LSPINE',size:7.2,uid:'1.3.6.1.4.1.14519.5.2.1.33978370154313858374549088884026971868',doi:'10.7937/szkb-sw39',license:'CC BY 4.0'}
];
