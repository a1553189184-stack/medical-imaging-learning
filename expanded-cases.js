'use strict';

// Diagnostic teaching templates are diagnosis-specific; patient history is never
// invented. Every rendered case is joined to one independently audited Commons
// source record from expanded-sources.js.
const EXPANDED_REFS = {
  acr: ['ACR：Appropriateness Criteria 影像检查选择', 'https://www.acr.org/Clinical-Resources/Clinical-Tools-and-Reference/Appropriateness-Criteria'],
  chest: ['ACR：急性呼吸系统疾病影像评估', 'https://acsearch.acr.org/docs/69446/Narrative'],
  pe: ['RadiologyInfo：肺栓塞影像检查', 'https://www.radiologyinfo.org/en/info/pulmonary-embolism'],
  tb: ['CDC：结核病临床与实验室诊断', 'https://www.cdc.gov/tb/hcp/testing-diagnosis/clinical-and-laboratory-diagnosis.html'],
  covid: ['CDC：COVID-19 临床表现与影像注意事项', 'https://www.cdc.gov/covid/hcp/clinical-care/covid19-presentation.html'],
  sarcoid: ['ATS：结节病诊断与检测指南', 'https://www.thoracic.org/statements/guideline-implementation-tools/diagnosis-and-detection-of-sarcoidosis.php'],
  headTrauma: ['ACR：头部创伤影像评估', 'https://acsearch.acr.org/docs/69481/Narrative'],
  ms: ['MS Trust：2024 McDonald 诊断标准说明', 'https://mstrust.org.uk/a-z/mcdonald-criteria'],
  nph: ['Hydrocephalus Association：正常压力脑积水', 'https://www.hydroassoc.org/normal-pressure-hydrocephalus-2/'],
  rlq: ['ACR：右下腹痛影像评估', 'https://acsearch.acr.org/list/TopicNarrativePdf?topicId=21'],
  ruq: ['ACR：右上腹痛影像评估', 'https://acsearch.acr.org/docs/69474/Narrative/'],
  llq: ['ACR：左下腹痛影像评估', 'https://acsearch.acr.org/docs/69356/Narrative/'],
  hcc: ['EASL：肝细胞癌临床实践指南', 'https://easl.eu/publication/cpg-hepatocellular-carcinoma/'],
  aaa: ['SVS：腹主动脉瘤影像与评估', 'https://vascular.org/pmg/vascular-conditions/abdominal-aortic-aneurysms'],
  ankle: ['ACR：急性踝关节创伤影像评估', 'https://acsearch.acr.org/docs/69436/Narrative/'],
  clavicle: ['AAOS：锁骨骨折循证患者说明', 'https://orthoinfo.aaos.org/globalassets/pdfs/clavicle-fx-cpg_pls.pdf'],
  ra: ['American College of Rheumatology：类风湿关节炎', 'https://rheumatology.org/patients/rheumatoid-arthritis'],
  bronchiectasis: ['ERS：成人支气管扩张临床实践指南', 'https://publications.ersnet.org/lookup/doi/10.1183/13993003.01126-2025'],
  copd: ['GOLD：2026 COPD 全球策略', 'https://goldcopd.org/2026-gold-report-and-pocket-guide/'],
  ipf: ['ATS/ERS/JRS/ALAT：IPF 诊断指南工具', 'https://www.thoracic.org/statements/guideline-implementation-tools/diagnosis-of-ipf.php'],
  pericardial: ['ESC：心包疾病专业资料', 'https://www.escardio.org/communities/working-groups/myocardial-pericardial-diseases/'],
  aortic: ['ACC/AHA：主动脉疾病指南要点', 'https://www.acc.org/Latest-in-Cardiology/ten-points-to-remember/2022/11/01/12/17/2022-guideline-on-aortic-disease-1-gl-ad'],
  thymoma: ['NCI：胸腺瘤与胸腺癌专业版', 'https://www.cancer.gov/types/thymus-cancer/hp/thymoma-treatment-pdq'],
  hiatal: ['SAGES：食管裂孔疝指南', 'https://www.sages.org/publications/guidelines/guidelines-for-the-surgical-treatment-of-hiatal-hernias/'],
  svc: ['NCI：上腔静脉综合征', 'https://www.cancer.gov/about-cancer/treatment/side-effects/cardiopulmonary-hp-pdq']
};

const EXPANDED_GROUPS = {
  'chest-pneumothorax': {
    title:'气胸', english:'Pneumothorax', modality:'X-RAY', level:'入门', distractors:['肺大疱','胸腔积液','肺不张'], tags:['胸膜线','肺纹理消失','深沟征'],
    signs:['寻找脏层胸膜线及其外侧肺纹理是否消失','仰卧位要检查异常加深、透亮的肋膈角（深沟征）','同时评估肺受压、纵隔位置及胸腔引流装置'],
    basis:'来源将影像归为气胸；判断以胸膜线和胸膜线外无肺纹理为核心，仰卧片可只表现为深沟征。',
    differential:'肺大疱通常有薄壁并位于肺内；皮肤皱褶线外仍可见肺纹理。', pearl:'张力性气胸是临床诊断；循环或呼吸不稳定时不能等待影像确认。',
    method:'沿胸壁从肺尖扫到肋膈角，核对胸膜线两侧纹理，并根据立位或仰卧位调整征象。', next:'与肺大疱、皮肤皱褶鉴别；报告侧别、范围和占位效应，紧急程度必须结合临床。',
    tips:['不要只盯肺尖，仰卧患者重点看肋膈角。','调高对比度可辅助看胸膜线，但不能把噪声当线。'], pitfalls:['胸膜线外仍有血管纹理时先考虑伪影。','静态截图不能可靠估算气胸百分比。'], recall:'胸膜线 → 线外无纹理 → 体位特异征象 → 占位效应。', ref:'chest'
  },
  'chest-pleural-effusion': {
    title:'胸腔积液', english:'Pleural effusion', modality:'X-RAY', level:'入门', distractors:['肺不张','肺实变','气胸'], tags:['肋膈角变钝','弧形上缘','体位'],
    signs:['立位片观察肋膈角变钝和弧形液面','仰卧位可表现为单侧弥漫密度增高而无典型液面','检查是否伴肺实变、容积改变或纵隔移位'],
    basis:'来源明确标注胸腔积液；不同体位下液体分布差异是本组重点。', differential:'肺实变位于肺内且可见含气支气管；肺不张常伴容积减小，胸膜增厚也可使肋膈角变钝。', pearl:'影像确认有液体不等于确定病因，超声和胸液分析回答不同问题。',
    method:'先确认体位，再沿膈面、肋膈角和胸壁观察液体分布；必要时用超声确认与定位。', next:'评估是否分隔、是否伴肺部病变，并结合心、肝、肾、感染或肿瘤线索查因。',
    tips:['卧位积液可能向后分布，不一定出现弧形上缘。','侧位片对少量后肋膈角积液更敏感。'], pitfalls:['不能从单张未校准图准确换算积液毫升数。','不要把所有单侧白肺都直接诊断为积液。'], recall:'体位 → 肋膈角/弧形上缘 → 超声确认 → 病因评估。', ref:'chest'
  },
  'chest-pneumonia': {
    title:'肺炎性实变', english:'Pneumonia with air-space consolidation', modality:'X-RAY', level:'入门', distractors:['肺水肿','肺不张','肺部肿块'], tags:['实变','含气支气管','轮廓征'],
    signs:['识别局灶或多灶肺泡性密度增高','寻找含气支气管征并利用轮廓征辅助肺叶定位','检查胸腔积液、空洞或脓肿等并发征象'],
    basis:'来源将影像诊断为肺炎或肺炎并发改变；网页只训练实变识别，不凭胸片推断病原体。', differential:'肺不张常伴容积减小；肺水肿更常呈双侧分布并伴血管或心影改变；持续病灶需排除阻塞。', pearl:'“肺野位置”不等于“肺叶位置”，肺叶定位需结合侧位或断层解剖。',
    method:'先描述密度、分布和边界，再用心缘、膈面和叶间裂定位，最后检查并发症。', next:'结合感染症状与实验室结果；不吸收或形态不典型时应重新评估肿瘤、肺不张等原因。',
    tips:['先写“实变”，再在临床背景下提出肺炎。','多幅拼图要联合看正侧位，不把同一病灶算两处。'], pitfalls:['胸片不能可靠区分细菌与病毒。','仅凭一处高密度影不能排除肿瘤或肺梗死。'], recall:'实变分布 → 含气支气管/轮廓征 → 肺叶定位 → 并发症。', ref:'chest'
  },
  'chest-pulmonary-edema': {
    title:'肺水肿', english:'Pulmonary edema', modality:'X-RAY', level:'中级', distractors:['多灶肺炎','肺纤维化','气胸'], tags:['双肺阴影','间质征象','胸腔积液'],
    signs:['观察双肺间质性或肺泡性阴影及分布','检查肺血管重分布、间隔线和支气管袖口征','联合心影大小和双侧胸腔积液判断心源性线索'],
    basis:'来源明确标注肺水肿；影像模式需与容量状态、心功能和氧合情况联合解释。', differential:'ARDS和感染也可产生双肺阴影；心影不大不能完全排除心源性水肿，便携AP片又会放大心影。', pearl:'同一征象要同时看肺、心、血管和胸膜，不能只凭“蝙蝠翼”下结论。',
    method:'核对AP/PA和吸气程度后，按肺血流、间质、肺泡、心影、胸膜五项顺序阅读。', next:'比较既往片和治疗前后变化，结合超声心动图、BNP等资料判断机制。',
    tips:['便携AP片的心影放大要谨慎解释。','周围型或不对称水肿可不呈典型中央分布。'], pitfalls:['双肺白影不自动等于感染。','静态片不能单独区分心源性和非心源性水肿。'], recall:'肺血管 → 间质 → 肺泡 → 心影 → 胸膜。', ref:'chest'
  },
  'chest-pulmonary-embolism': {
    title:'肺动脉栓塞', english:'Pulmonary embolism', modality:'CTPA', level:'中级', distractors:['主动脉夹层','肺炎','心包积液'], tags:['充盈缺损','血管截断','肺梗死'],
    signs:['在肺动脉腔内寻找被对比剂包绕的低密度充盈缺损','连续追踪主干、叶段及亚段分支，区分血栓与流动伪影','检查右心负荷及楔形胸膜下肺梗死等伴随征象'],
    basis:'来源标注肺栓塞或肺梗死相关征象；直接血栓与间接肺梗死征象要分开描述。', differential:'流动伪影常边缘模糊；慢性血栓多偏心并可伴血管狭窄，急慢性判断需完整序列。', pearl:'发现栓子后仍要评估右心负荷，但单张截图不能完成风险分层。',
    method:'先确认肺动脉增强充分，再从主肺动脉按分支顺序追踪，并用相邻层面确认缺损。', next:'报告最中心累及层级、血栓负荷和右心征象；结合临床概率及实验室检查。',
    tips:['用多个相邻层面确认，避免把分叉和运动伪影当血栓。','肺窗与纵隔窗都要看，兼顾肺梗死和胸膜反应。'], pitfalls:['单个“Hampton hump”不是肺栓塞特异征。','网页拼图不能替代整套CTPA质量评价。'], recall:'增强质量 → 分支追踪 → 充盈缺损 → 右心与肺梗死。', ref:'pe'
  },
  'chest-tuberculosis': {
    title:'结核相关胸部改变', english:'Thoracic changes related to tuberculosis', modality:'X-RAY', level:'中级', distractors:['石棉相关胸膜斑','肺水肿','急性细菌性肺炎'], tags:['纤维瘢痕','胸膜钙化','容积减小'],
    signs:['观察上肺纤维瘢痕、肺门牵拉和容积减小','识别胸膜增厚或钙化及钙化肉芽肿','检查空洞、播散性小结节或活动性渗出改变'],
    basis:'本组来源多为结核后遗改变，而不是用胸片证明活动性结核。', differential:'既往感染、尘肺、胸膜感染或石棉暴露也可产生瘢痕和钙化；必须结合流行病学与微生物学。', pearl:'胸片可提示结核，但不能单独确诊活动性结核。',
    method:'区分活动性可疑改变与稳定后遗改变，并比较既往影像评估新旧变化。', next:'结合症状、暴露史、免疫状态和痰涂片/培养/分子检测，由临床完成结核评估。',
    tips:['描述部位、空洞、播散和容积变化，不用“像结核”代替征象。','胸膜钙化只说明既往过程，病因并非唯一。'], pitfalls:['不能把钙化瘢痕等同于当前传染性。','免疫抑制者和儿童影像可不典型。'], recall:'活动性征象/后遗改变 → 比较既往 → 微生物学确认。', ref:'tb'
  },
  'chest-atelectasis': {
    title:'肺不张', english:'Atelectasis', modality:'X-RAY', level:'中级', distractors:['肺炎','胸腔积液','肺水肿'], tags:['容积减小','裂移位','代偿性过度充气'],
    signs:['寻找肺叶或全肺容积减小','观察叶间裂、肺门、膈肌和纵隔向患侧移位','检查邻近肺代偿性过度充气及潜在阻塞线索'],
    basis:'来源将影像标注为肺不张；密度增高必须与容积减小共同判断。', differential:'肺炎实变通常不引起明显容积减小；大量积液可将纵隔推向对侧。', pearl:'先判断有没有“缩小”，再解释为什么“变白”。',
    method:'比较两侧肺容积，追踪裂、肺门和纵隔方向，并按肺叶解剖定位。', next:'寻找黏液栓、异物、肿块或术后等原因；持续或原因不明时需进一步检查。',
    tips:['纵隔向白肺侧移提示容积丢失。','侧位片有助确认上叶或下叶不张。'], pitfalls:['不要只凭高密度影诊断肺炎。','儿童或卧位片上体位和旋转可模拟纵隔偏移。'], recall:'变白 + 变小 → 裂/肺门移位 → 代偿 → 找阻塞原因。', ref:'chest'
  },
  'chest-covid': {
    title:'COVID-19相关肺炎', english:'COVID-19-related pneumonia', modality:'X-RAY', level:'中级', distractors:['心源性肺水肿','细菌性大叶肺炎','肺结核'], tags:['双侧阴影','外周分布','非特异性'],
    signs:['观察双侧、外周及下肺为主的片状肺泡性阴影','评估阴影范围和进展，并检查胸腔积液等非典型表现','与既往片比较变化而不是仅凭单次片判断病程'],
    basis:'来源病例已明确COVID-19肺炎；影像只用于识别和评估肺部受累，不能独立确诊感染。', differential:'流感等病毒性肺炎、机化性肺炎及肺水肿可有重叠表现。', pearl:'CDC明确指出胸片或CT不能单独用于诊断COVID-19。',
    method:'按双侧性、外周性、肺区分布和范围描述，同时记录不典型征象。', next:'结合抗原或核酸检测、氧合与临床病程；影像用于并发症和严重程度评估。',
    tips:['便携片质量波动大，比较时先核对投照条件。','“磨玻璃”主要是CT术语，胸片应描述模糊肺泡性阴影。'], pitfalls:['不能按影像外观推断病毒变异株。','没有影像异常不等于排除早期感染。'], recall:'分布与范围 → 比较进展 → 实验室确认 → 并发症。', ref:'covid'
  },
  'chest-cardiomegaly': {
    title:'心影增大', english:'Cardiomegaly on chest radiograph', modality:'X-RAY', level:'入门', distractors:['心包积气','肺气肿','纵隔气肿'], tags:['心胸比','PA/AP','吸气程度'],
    signs:['在直立PA胸片上评估心影横径与胸廓内径关系','核对AP投照、旋转和吸气不足造成的假性放大','同时观察肺血管、肺水肿和胸腔积液'],
    basis:'来源明确标注心影增大或心胸比增加；投照方式决定能否可靠使用心胸比。', differential:'AP便携片、吸气不足和旋转均可使心影显大；心包积液与心腔扩大不能只靠轮廓区分。', pearl:'“心影大”是影像描述，不等同于某一种心脏病。',
    method:'先核对投照与吸气质量，再测量或目测心胸比，最后检查肺循环改变。', next:'结合超声心动图、心电图和症状明确结构与功能原因。',
    tips:['PA片上常用心胸比，AP片避免机械套用阈值。','比较既往片时要保证体位和投照尽量一致。'], pitfalls:['不能由心影轮廓直接判断射血分数。','儿童、孕期及不同体型需结合具体情境。'], recall:'PA还是AP → 心胸比 → 肺循环 → 超声验证。', ref:'chest'
  },
  'chest-sarcoidosis': {
    title:'胸部结节病', english:'Thoracic sarcoidosis', modality:'X-RAY', level:'进阶', distractors:['淋巴瘤','肺结核','尘肺'], tags:['双肺门淋巴结','对称性','肺间质'],
    signs:['观察双侧肺门及纵隔淋巴结是否对称增大','检查肺内网结节、上中肺分布和纤维化改变','寻找不对称肿块、坏死或胸腔积液等非典型表现'],
    basis:'来源诊断为肺结节病或结节病相关肺门淋巴结病；典型分布只能支持，不能单独确诊。', differential:'淋巴瘤、结核、真菌感染和尘肺均可有肺门或纵隔淋巴结及肺内结节。', pearl:'结节病诊断需要相容临床、影像/组织学证据并排除其他肉芽肿性疾病。',
    method:'按淋巴结、肺实质和纤维化三个层次描述，并记录对称性与分布。', next:'结合全身受累线索；需要取样时按ATS建议选择合适淋巴结评估路径。',
    tips:['对称双肺门淋巴结是重要线索，但不是病理诊断。','CT可更好显示沿淋巴管分布的微结节。'], pitfalls:['不能把所有双肺门增大都称为结节病。','胸片分期不等同于疾病活动度或预后。'], recall:'淋巴结对称性 → 肺内分布 → 纤维化 → 排除替代诊断。', ref:'sarcoid'
  },
  'chest-bronchiectasis': {
    title:'支气管扩张', english:'Bronchiectasis', modality:'CT', level:'中级', distractors:['肺气肿','蜂窝肺','肺水肿'], tags:['支气管扩张','印戒征','不变细'],
    signs:['比较支气管内径与伴行动脉，寻找印戒征','观察支气管向外周走行时是否不再逐渐变细','记录柱状、曲张或囊状形态及黏液栓、树芽征和分布'],
    basis:'来源明确标注左下肺基底段支气管扩张；诊断核心是CT显示永久性支气管扩张，而不是单凭感染症状。', differential:'牵拉性支气管扩张伴周围纤维化和结构扭曲；急性感染可暂时使支气管显宽，轻度边界病例需结合完整薄层CT。', pearl:'先确认“扩张且不变细”，再按肺叶分布寻找潜在病因。',
    method:'用薄层CT连续追踪支气管，比较支气管-动脉比例、外周可见度及是否伴结构扭曲。', next:'报告范围、形态、黏液栓和活动性感染征象，并结合临床检查原发或继发原因。',
    tips:['不要只凭一个印戒样截面，要在连续层面确认。','老年、肺动脉偏细或高原环境可影响支气管-动脉比例。'], pitfalls:['肺纤维化中的牵拉扩张不应脱离纤维化单独解释。','网页拼图不能完成全肺严重度评分。'], recall:'管腔大于伴行动脉 → 不变细 → 外周可见 → 分布与病因。', ref:'bronchiectasis'
  },
  'chest-emphysema': {
    title:'肺气肿', english:'Pulmonary emphysema', modality:'CT', level:'中级', distractors:['支气管扩张','蜂窝肺','气胸'], tags:['低密度区','血管稀疏','肺大疱'],
    signs:['在肺窗寻找无明显壁的异常低密度区','评估小叶中心型、全小叶型或间隔旁型分布','检查血管纹理减少、肺大疱和过度充气等伴随改变'],
    basis:'来源为终末期肺气肿CT；影像可显示实质破坏，但COPD的临床诊断和气流受限确认依赖肺功能。', differential:'气胸位于脏层胸膜外；蜂窝肺囊腔常有可见壁、层叠和纤维化背景；肺囊肿通常边界更清楚。', pearl:'“低密度”要结合壁、分布和血管改变，不能把正常肺窗黑色区域都当肺气肿。',
    method:'核对肺窗后从肺尖到肺底比较低密度分布、血管稀疏和肺容积。', next:'完整评估应结合吸烟/暴露史、肺功能及并发肺大疱或肺癌风险。',
    tips:['窗位不一致会显著改变低密度区观感。','间隔旁型肺气肿常位于胸膜下，需与气胸分开。'], pitfalls:['单张CT不能做可靠定量。','影像严重程度与症状和肺功能并非完全一致。'], recall:'低密度无壁 → 血管稀疏 → 分布分型 → 肺功能确认气流受限。', ref:'copd'
  },
  'chest-pulmonary-fibrosis': {
    title:'胺碘酮相关肺纤维化', english:'Amiodarone-related pulmonary fibrosis', modality:'X-RAY', level:'进阶', distractors:['心源性肺水肿','多灶肺炎','淋巴管癌病'], tags:['网状影','肺容积','药物相关'],
    signs:['观察双肺网状或网结节状间质性阴影及分布','评估肺容积下降、结构扭曲和可能的牵拉性支气管扩张','比较既往片并检查叠加实变、胸腔积液或心影变化'],
    basis:'来源明确说明为胺碘酮诱导的肺纤维化胸片；本例不能套用为特发性肺纤维化。', differential:'肺水肿通常结合血管和胸膜改变；感染、其他药物毒性及结缔组织病相关间质病可重叠。', pearl:'“纤维化模式”与“纤维化病因”是两个层级，病因必须结合用药和完整HRCT。',
    method:'先描述间质影分布和肺容积，再用HRCT评价网格、牵拉支扩、蜂窝和替代诊断征象。', next:'核对药物暴露和时间关系，由临床综合排除感染、心衰及其他间质性肺病。',
    tips:['胸片对早期间质病敏感度有限。','比较既往片有助区分慢性纤维化和急性叠加病变。'], pitfalls:['不能见网状影就诊断IPF。','单张胸片不能认定药物因果关系。'], recall:'间质模式 → HRCT分型 → 暴露时间线 → 排除替代病因。', ref:'ipf'
  },
  'chest-pericardial-effusion': {
    title:'心包积液影像提示', english:'Imaging features suggesting pericardial effusion', modality:'X-RAY', level:'中级', distractors:['心腔扩大','心源性肺水肿','前纵隔肿块'], tags:['球形心影','心影增大','超声确认'],
    signs:['观察心影是否呈对称、光滑的球形或水瓶样扩大','核对PA/AP投照、旋转和吸气程度','同时评估肺血管、肺水肿和胸腔积液以寻找伴随线索'],
    basis:'来源标注心包积液；胸片只能提示心包液体，不能可靠区分心包积液与心腔扩大。', differential:'扩张型心肌病和瓣膜病也可造成心影增大；AP投照和吸气不足可造成假性放大。', pearl:'心包填塞是血流动力学诊断，心影大小不能判断是否存在填塞。',
    method:'先排除技术性放大，再描述心影轮廓和肺循环，随后用超声心动图确认积液及血流动力学影响。', next:'结合症状、血压和超声结果评估病因与紧急程度。',
    tips:['急性少量积液也可发生填塞而胸片心影不大。','慢性大量积液才更容易形成典型球形心影。'], pitfalls:['不能用心胸比估算心包液量。','肺野清晰并不能排除危险性心包积液。'], recall:'技术质量 → 球形心影提示 → 超声确认 → 血流动力学判断。', ref:'pericardial'
  },
  'chest-thymoma': {
    title:'前纵隔胸腺瘤', english:'Anterior mediastinal thymoma', modality:'CT', level:'进阶', distractors:['淋巴瘤','生殖细胞肿瘤','胸骨后甲状腺肿'], tags:['前纵隔','强化肿块','局部侵犯'],
    signs:['定位前纵隔肿块并观察其与胸腺床的关系','评估边缘、强化、坏死、钙化和脂肪间隙','检查心包、胸膜、肺和大血管受侵及胸膜种植'],
    basis:'来源为病理证实的胸腺瘤，并明确伴同期结节病所致双肺门淋巴结增大；肺门结节不能误当胸腺瘤转移。', differential:'前纵隔鉴别包括淋巴瘤、生殖细胞肿瘤、胸骨后甲状腺病变和胸腺增生。', pearl:'先完成纵隔分区和侵犯评估，CT形态不能替代组织学分型。',
    method:'增强CT多平面观察肿块分区、包膜完整性及与心包和血管的界面。', next:'结合肿瘤标志物、重症肌无力等临床线索，由胸部肿瘤团队完成分期和诊疗。',
    tips:['脂肪间隙消失不总等于明确侵犯。','化学位移MRI可辅助胸腺增生鉴别。'], pitfalls:['不能把本图双肺门淋巴结增大直接归为肿瘤转移。','单幅轴位图不能完成可切除性判断。'], recall:'前纵隔定位 → 组成/边缘 → 邻近侵犯 → 分期与病理。', ref:'thymoma'
  },
  'chest-aortic-dissection': {
    title:'Stanford B型主动脉夹层', english:'Stanford type B aortic dissection', modality:'CT', level:'进阶', distractors:['主动脉瘤伴附壁血栓','肺动脉栓塞','主动脉壁内血肿'], tags:['内膜片','真假腔','分支血管'],
    signs:['在降主动脉内寻找分隔真假腔的内膜片','沿全主动脉追踪夹层起止范围并判断是否累及升主动脉','评估分支血管灌注、破裂、心包或胸腔积血等并发症'],
    basis:'来源明确标注降主动脉Stanford B型夹层；分类取决于升主动脉是否受累，必须查看完整CTA。', differential:'壁内血肿表现为主动脉壁新月形增厚而无典型内膜片；附壁血栓通常不形成两个强化腔。', pearl:'发现内膜片后，真正决定紧急处置的是范围、破裂和器官灌注。',
    method:'从主动脉根部连续追踪到髂动脉，确认真假腔、入口和每支重要分支的起源。', next:'急性主动脉综合征需紧急多学科处理；报告应明确Stanford分类和复杂征象。',
    tips:['非心电门控升主动脉运动伪影可模拟夹层。','用多平面重建确认可疑内膜线。'], pitfalls:['所示拼图不能排除升主动脉受累。','不能只凭真假腔大小判断灌注。'], recall:'内膜片 → 升主动脉受累否 → 分支灌注 → 破裂征象。', ref:'aortic'
  },
  'chest-hiatal-hernia': {
    title:'食管裂孔疝', english:'Hiatal hernia on chest radiographs', modality:'X-RAY', level:'中级', distractors:['左下叶肺脓肿','膈疝','纵隔囊肿'], tags:['心后区','气液平面','侧位'],
    signs:['在心后区寻找含气或气液平面的胃泡样影','联合正位和侧位确认病变位于后纵隔','观察膈肌轮廓及是否有胃或其他腹腔结构进入胸腔'],
    basis:'来源为未标注的正侧位食管裂孔疝胸片；两幅投照属于同一次病例而非两个病例。', differential:'肺脓肿位于肺内并有厚壁和周围炎症；膈疝位置与疝内容不同；纵隔囊肿通常无气液面。', pearl:'正位心后区异常需要侧位定位，不能只凭一个气液面下结论。',
    method:'先在正位定位心后区异常，再在侧位确认后纵隔位置和与膈肌、食管裂孔的关系。', next:'按症状和临床问题选择上消化道造影、内镜或CT进一步评价。',
    tips:['侧位片能把心后区病变与肺内病变分开。','注意不要把正常胃泡误认为胸内胃。'], pitfalls:['胸片不能可靠完成裂孔疝分型。','两投照应联合解释，不能拆成两个独立病例。'], recall:'心后区气液面 → 侧位后纵隔 → 膈肌关系 → 进一步检查。', ref:'hiatal'
  },
  'chest-pneumomediastinum': {
    title:'纵隔气肿', english:'Pneumomediastinum', modality:'X-RAY', level:'中级', distractors:['气胸','心包积气','皮下气肿'], tags:['纵隔旁透亮线','连续膈征','颈部气体'],
    signs:['寻找勾勒主动脉、心缘或气管的线状透亮影','检查气体是否向颈部软组织延伸并伴皮下气肿','评估是否同时存在气胸、胸腔积液或其他食管/气道损伤线索'],
    basis:'来源明确标注主动脉和左颈总动脉旁的纵隔气体；箭头注释来自原文件。', differential:'气胸位于脏层胸膜外；心包积气多局限于心包反折以下；皮肤皱褶可产生伪线。', pearl:'纵隔气肿是征象，关键下一步是根据情境判断自发性、外伤性或食管气道破裂。',
    method:'沿纵隔轮廓、心缘、膈肌和颈部软组织系统寻找气体，并用CT确认范围和原因。', next:'如有剧烈呕吐、外伤、感染或不稳定表现，应紧急排查食管或气道损伤。',
    tips:['连续膈征指心影下方膈肌被气体连续勾勒。','侧位片和颈部软组织可显示正位不明显的气体。'], pitfalls:['不能把纵隔气肿自动等同于Boerhaave综合征。','胸片阴性不能排除少量纵隔气体。'], recall:'纵隔轮廓被气体勾勒 → 颈部/皮下 → 并发气胸 → 找原因。', ref:'chest'
  },
  'chest-svc-syndrome': {
    title:'上腔静脉综合征相关胸部CT', english:'CT findings associated with superior vena cava syndrome', modality:'CT', level:'进阶', distractors:['肺动脉栓塞','主动脉夹层','单纯肺门淋巴结增大'], tags:['上腔静脉受压','肺门肿块','侧支循环'],
    signs:['追踪上腔静脉是否受压、狭窄或闭塞','定位右肺门/纵隔肿块并评估与血管的关系','检查胸壁、奇静脉和纵隔侧支静脉及血栓'],
    basis:'来源明确说明右肺门肿块导致上腔静脉综合征；影像显示机械原因，综合征仍需结合临床表现。', differential:'上腔静脉血栓可无外压肿块；非肿瘤性纵隔纤维化也可造成狭窄。', pearl:'报告不能停在“有肿块”，必须交代上腔静脉通畅性、侧支和潜在病因。',
    method:'增强CT沿头臂静脉至右心房追踪上腔静脉，同时评价纵隔和侧支循环。', next:'结合面颈上肢肿胀、气道或脑水肿危险征象，尽快完成病因诊断和专科处理。',
    tips:['对比剂注射侧和流动伪影可影响静脉评价。','重建图像有助显示狭窄长度和侧支。'], pitfalls:['单张层面不能判定狭窄全长。','影像血管受压不等于已经出现完整临床综合征。'], recall:'SVC通畅性 → 外压/血栓 → 侧支 → 病因和紧急征象。', ref:'svc'
  },
  'chest-lung-abscess': {
    title:'肺脓肿', english:'Lung abscess', modality:'CT', level:'中级', distractors:['空洞性肺癌','肺结核空洞','感染性肺大疱'], tags:['厚壁空洞','气液平面','周围实变'],
    signs:['在肺内寻找厚壁空洞及气液平面','观察壁厚是否均匀、内缘是否光滑以及周围实变','检查多发病灶、胸膜受累和脓胸等并发症'],
    basis:'来源明确标注肺炎液化形成的肺脓肿，并同时展示软组织窗和肺窗。', differential:'空洞性肿瘤常壁不规则或结节样；结核及真菌感染需结合分布和微生物学；脓胸位于胸膜腔。', pearl:'先确认病灶位于肺实质还是胸膜腔，再讨论空洞病因。',
    method:'联合肺窗和纵隔窗评价空洞壁、内容物、周围肺和胸膜，并在相邻层面确认位置。', next:'结合感染症状、误吸风险和微生物检查；不典型或治疗反应差时重新排查阻塞和肿瘤。',
    tips:['气液平面并非肺脓肿特异征。','胸膜夹角和肺受压形态有助与脓胸区分。'], pitfalls:['不能凭一张空洞图推断病原体。','来源拼图中的上下图是同一病例不同窗位。'], recall:'肺内厚壁空洞 → 内容物/气液面 → 周围实变 → 排肿瘤和脓胸。', ref:'chest'
  },

  'neuro-subdural': {
    title:'硬膜下血肿', english:'Subdural hematoma', modality:'CT', level:'入门', distractors:['硬膜外血肿','蛛网膜下腔出血','脑梗死'], tags:['新月形','脑外','中线移位'], signs:['沿颅骨内板寻找新月形脑外积血','观察血肿密度、双侧性及是否跨越颅缝','评估脑沟、脑室、脑池和中线受压'], basis:'来源明确标注硬膜下血肿；形态和与脑表面的关系用于定位。', differential:'硬膜外血肿多呈双凸形；硬膜下积液密度近脑脊液，慢性血肿密度可降低。', pearl:'密度随时间和成分变化，不能仅凭截图精确判断出血天数。', method:'先分脑内与脑外，再看新月形分布和占位效应，最后检查对侧及后颅窝。', next:'结合外伤、抗凝和神经体征；显著占位或临床恶化需紧急评估。', tips:['不要只看箭头所指层面，要系统检查脑室和脑池。','双侧血肿可能使中线移位不明显。'], pitfalls:['单张图不能排除其他层面的出血。','“跨颅缝”与“跨硬膜反折”是不同概念。'], recall:'脑外 → 新月形 → 密度 → 占位效应。', ref:'headTrauma'
  },
  'neuro-epidural': {
    title:'硬膜外血肿', english:'Epidural hematoma', modality:'CT', level:'入门', distractors:['硬膜下血肿','脑内血肿','蛛网膜下腔出血'], tags:['双凸形','颅缝限制','颅骨骨折'], signs:['寻找贴近颅骨内板的双凸透镜形高密度影','检查相邻颅骨骨折及骨窗','评估脑室受压、中线移位和脑疝征象'], basis:'来源明确标注硬膜外血肿；双凸形与颅缝限制是典型线索。', differential:'硬膜下血肿沿脑表面呈新月形；骨下伪影需在相邻层面核对。', pearl:'硬膜外血肿可迅速扩大，影像占位与临床变化同样重要。', method:'脑窗定位脑外积血，骨窗寻找骨折，并在完整序列检查颅底和后颅窝。', next:'报告部位、最大厚度、占位及伴随损伤，按临床状态紧急处理。', tips:['双凸形是线索，不是所有硬膜外血肿都完美典型。','骨窗与脑窗必须配合。'], pitfalls:['不能因血肿体积看似小就忽略临床恶化。','婴幼儿和颅底血肿形态可不典型。'], recall:'双凸脑外血肿 → 骨折 → 占位 → 紧急度。', ref:'headTrauma'
  },
  'neuro-intracerebral': {
    title:'脑内出血', english:'Intracerebral hemorrhage', modality:'CT', level:'入门', distractors:['脑梗死','脑膜瘤','硬膜下血肿'], tags:['脑实质高密度','周围水肿','占位效应'], signs:['定位脑实质内高密度出血及其中心','检查脑室破入、蛛网膜下腔延伸和多发性','评估周围水肿、脑室受压和中线移位'], basis:'来源明确标注脑内或出血性卒中；本组重点是出血定位及并发影响。', differential:'钙化通常边界清楚且无急性水肿；出血性肿瘤需结合位置、强化和后续MRI。', pearl:'报告脑出血必须交代部位、范围、脑室破入和占位效应。', method:'从基底节、丘脑、脑叶、脑干和小脑依次定位，并检查脑室系统。', next:'结合血压、凝血、外伤和年龄；非典型部位或表现需寻找血管畸形、肿瘤等原因。', tips:['先确定出血中心，不要被脑室内血液带偏。','比较脑窗和相邻层面，避免把部分容积钙化当急性血肿。'], pitfalls:['不能从截图可靠计算血肿体积。','高密度并非只见于急性出血。'], recall:'中心部位 → 脑室破入 → 水肿/占位 → 病因线索。', ref:'acr'
  },
  'neuro-subarachnoid': {
    title:'蛛网膜下腔出血', english:'Subarachnoid hemorrhage', modality:'CT', level:'中级', distractors:['硬膜下血肿','脑内出血','静脉窦血栓'], tags:['脑池高密度','脑沟高密度','动脉瘤'], signs:['寻找基底池、侧裂池和脑沟内异常高密度','观察是否伴脑内或脑室内出血和脑积水','按分布判断动脉瘤性出血线索并结合CTA'], basis:'来源明确标注蛛网膜下腔出血；血液沿脑池与脑沟分布是定位核心。', differential:'脑膜强化、钙化和高血细胞比容可造成高密度；阴性CT不能在所有时点排除出血。', pearl:'疑似动脉瘤破裂时，发现出血只是第一步，还需寻找责任血管病变。', method:'先扫基底池和侧裂池，再查大脑凸面沟、脑室及后颅窝。', next:'结合起病时间与临床；按当地流程选择CTA、腰穿或进一步血管评估。', tips:['调整窗宽可帮助发现少量脑沟内血液。','同时检查急性脑积水。'], pitfalls:['单张层面不能证明出血范围。','不能把所有脑池高密度都归因于动脉瘤。'], recall:'脑池/脑沟高密度 → 脑室/脑积水 → CTA找病因。', ref:'acr'
  },
  'neuro-infarction': {
    title:'急性缺血性脑梗死', english:'Acute ischemic cerebral infarction', modality:'CT', level:'中级', distractors:['脑内出血','脑肿瘤','硬膜下血肿'], tags:['灰白质分界','致密动脉征','血管分布'], signs:['寻找岛叶带消失、豆状核模糊和脑沟变浅','识别致密动脉征并核对血管走行','按动脉供血区评估低密度、水肿及灌注异常'], basis:'来源明确标注脑梗死或早期缺血征象；CT首先排除出血，早期缺血可很轻微。', differential:'旧梗死有容积减小；肿瘤和炎症通常不严格遵循单一动脉供血区。', pearl:'正常平扫CT不能排除超早期缺血，诊疗时间窗由临床卒中流程决定。', method:'先排除出血，再对称比较灰白质分界，沿血管供区检查早期征象。', next:'结合最后正常时间、NIHSS及CTA/灌注或MRI，评估大血管闭塞和可挽救组织。', tips:['左右对称比较比孤立看一侧更容易发现早期改变。','致密动脉征需排除钙化和高血细胞比容。'], pitfalls:['不要等待明显低密度才考虑急性卒中。','单幅灌注图不能独立判断核心和半暗带。'], recall:'排出血 → 早期缺血征 → 血管区 → CTA/灌注。', ref:'acr'
  },
  'neuro-meningioma': {
    title:'脑膜瘤', english:'Meningioma', modality:'MRI', level:'中级', distractors:['神经鞘瘤','脑转移瘤','胶质母细胞瘤'], tags:['脑外肿块','宽基底','硬膜尾'], signs:['判断肿块是否位于脑外并与硬膜宽基底相连','观察强化、脑脊液裂和硬膜尾等支持征象','评估周围水肿、骨质改变及静脉窦关系'], basis:'来源明确标注脑膜瘤；静态图只展示典型脑外肿块模式。', differential:'硬膜转移、孤立性纤维性肿瘤和神经鞘瘤可相似；硬膜尾并非脑膜瘤特异。', pearl:'先判断脑内还是脑外，再讨论肿瘤类型。', method:'用多平面判断脑外征象、硬膜附着和与血管/静脉窦的关系。', next:'完整MRI需比较T1、T2、弥散和增强；术前评估还需骨质和血管信息。', tips:['脑脊液裂和皮质受压有助判断脑外来源。','硬膜尾只能增加可能性，不能单独定性。'], pitfalls:['不能从一张增强图确定WHO级别。','明显水肿不自动意味着恶性。'], recall:'脑外定位 → 硬膜附着 → 强化/硬膜尾 → 水肿与窦。', ref:'acr'
  },
  'neuro-glioblastoma': {
    title:'胶质母细胞瘤', english:'Glioblastoma', modality:'MRI', level:'进阶', distractors:['脑脓肿','脑转移瘤','低级别胶质瘤'], tags:['坏死性肿块','不规则强化','浸润性水肿'], signs:['观察厚薄不均的不规则环形或结节样强化','识别中央坏死、出血及跨胼胝体生长','评估周围T2/FLAIR异常和占位效应'], basis:'来源明确标注胶质母细胞瘤；影像呈侵袭性高级别胶质瘤模式，但病理仍是定性依据。', differential:'脑脓肿可有弥散受限，转移瘤常位于灰白质交界且可能多发，治疗后改变也可强化。', pearl:'“环形强化”不是诊断，必须分析壁、内部、分布和临床背景。', method:'联合T1增强、T2/FLAIR、DWI/ADC和灌注，区分肿瘤实性成分、坏死和水肿。', next:'建议神经肿瘤多学科评估和组织学/分子诊断；术后片需与基线比较。', tips:['活检靶点通常避开单纯坏死区。','跨胼胝体不是胶母独有，但提示浸润性过程。'], pitfalls:['不能凭影像确定IDH或MGMT状态。','复发与放射性坏死常需多参数评估。'], recall:'不规则强化 → 坏死/浸润 → 多参数MRI → 病理分型。', ref:'acr'
  },
  'neuro-ms': {
    title:'多发性硬化脱髓鞘病灶', english:'Multiple sclerosis lesions', modality:'MRI', level:'进阶', distractors:['脑小血管病','偏头痛相关白质灶','脑转移瘤'], tags:['脑室旁','皮质旁','时间与空间多发'], signs:['观察脑室旁、皮质/皮质旁、幕下和胼胝体病灶分布','比较T2/FLAIR及增强病灶，寻找时间多发证据','结合脊髓和视神经检查建立空间多发'], basis:'来源明确标注多发性硬化病灶；单张MRI不能独立完成MS诊断。', differential:'小血管病与偏头痛白质灶常分布不同；感染、血管炎和其他脱髓鞘病需临床排除。', pearl:'诊断核心是合适临床情境中的空间多发，并按现行标准评估时间或其他支持证据。', method:'按典型解剖区域计数和定位病灶，并比较既往与增强序列。', next:'由神经科结合病史、查体、脑脊液及其他检查应用McDonald标准。', tips:['病灶数量不等于疾病严重度。','中央静脉征需专门序列，普通截图不能自行认定。'], pitfalls:['任何白质高信号都不能叫MS。','增强与否只反映特定时间窗内的血脑屏障活动。'], recall:'典型部位 → 空间多发 → 时间证据 → 排除替代诊断。', ref:'ms'
  },
  'neuro-nph': {
    title:'正常压力脑积水影像模式', english:'Normal-pressure hydrocephalus imaging pattern', modality:'CT', level:'进阶', distractors:['弥漫性脑萎缩','梗阻性脑积水','脑白质病'], tags:['脑室扩大','DESH','萎缩鉴别'], signs:['识别与脑沟扩大不成比例的脑室扩大','观察高凸部脑沟变窄及外侧裂增宽等DESH线索','测量指标必须基于标准层面并结合完整检查'], basis:'来源明确标注NPH或NPH与萎缩对照；影像是诊断组成部分而非单独结论。', differential:'弥漫性脑萎缩通常脑室和脑沟同步增宽；其他脑积水需寻找梗阻或继发原因。', pearl:'NPH诊断需要步态、认知和排尿症状与影像及必要的脑脊液试验共同评估。', method:'评价脑室大小、脑沟分布、胼胝体角和脑室周围改变，避免只看一个比值。', next:'结合临床三联征并由专科评估腰穿/引流试验及分流获益可能。', tips:['“脑室大”先与脑萎缩比较。','截图上的测量示意不能替代标准层面测量。'], pitfalls:['不能只凭Evans指数确诊NPH。','脑室周围低密度也可来自小血管病。'], recall:'脑室扩大不成比例 → DESH线索 → 临床三联征 → 专科评估。', ref:'nph'
  },
  'neuro-metastases': {
    title:'脑转移瘤', english:'Brain metastasis', modality:'MRI', level:'进阶', distractors:['胶质母细胞瘤','脑脓肿','脑膜瘤'], tags:['灰白质交界','多发强化','血管源性水肿'], signs:['寻找灰白质交界或后循环区的强化结节/肿块','评估病灶数目、坏死、出血和周围血管源性水肿','检查脑膜、颅骨及后颅窝受累'], basis:'来源明确标注脑转移瘤或已知原发癌脑转移；个别病例可为单发。', differential:'胶质母细胞瘤、脓肿和原发脑肿瘤可呈环形强化；既往治疗会改变影像。', pearl:'多发病灶支持转移，但单发并不排除，最终需结合原发肿瘤与病理。', method:'增强MRI全脑搜索病灶并记录可测量病灶、脑膜受累和占位效应。', next:'结合原发肿瘤分期、既往治疗和病理；急性神经症状需先处理占位与出血风险。', tips:['后颅窝容易漏诊，需专门回看。','水肿范围不等于肿瘤真实浸润范围。'], pitfalls:['不能仅按环形强化区分转移与胶母。','治疗后新强化不一定代表进展。'], recall:'病灶数目/分布 → 水肿/出血 → 原发肿瘤 → 全脑分期。', ref:'acr'
  },

  'abdomen-appendicitis': {
    title:'急性阑尾炎及并发症', english:'Acute appendicitis and complications', modality:'CT', level:'中级', distractors:['盲肠憩室炎','末端回肠炎','输尿管结石'], tags:['阑尾增粗','周围脂肪浸润','阑尾周围脓肿'], signs:['从盲肠起始处追踪盲端管状阑尾','观察管径、壁增厚/强化和周围脂肪浸润','检查阑尾石、穿孔、脓肿及异位阑尾'], basis:'来源明确标注阑尾炎、残端阑尾炎、Amyand疝内阑尾炎或相关并发症。', differential:'盲肠憩室炎、末端回肠炎、妇科急症和输尿管结石可模拟右下腹痛。', pearl:'阑尾直径阈值不能单独确诊，必须结合壁与周围炎症。', method:'定位盲肠后连续追踪阑尾全程，并在多平面上确认炎症中心。', next:'报告并发症和解剖位置；检查方法需结合年龄、妊娠和临床风险选择。', tips:['异位阑尾可位于肝下或疝囊内。','有阑尾石不等于一定有阑尾炎。'], pitfalls:['单层截图不能排除穿孔。','不要把脂肪垂炎误称为阑尾炎。'], recall:'找全阑尾 → 壁/管径 → 周围炎症 → 并发症与异位。', ref:'rlq'
  },
  'abdomen-cholelithiasis': {
    title:'胆囊结石', english:'Cholelithiasis', modality:'US', level:'入门', distractors:['胆囊息肉','胆泥','胆囊腺肌症'], tags:['强回声','声影','移动性'], signs:['寻找胆囊腔内强回声灶及后方声影','改变体位观察结石是否移动','同时评估胆囊壁、胆囊周围液体和胆管扩张'], basis:'来源明确标注胆囊结石或结石伴胆泥；结石本身与急性胆囊炎要分开判断。', differential:'息肉通常附壁且不移动，多数无声影；胆泥可形成低水平回声并随体位缓慢移动。', pearl:'“有结石”不等于“有急性胆囊炎”。', method:'空腹状态下多切面扫查胆囊，结合体位变化和后方声影确认。', next:'若怀疑急性胆囊炎，结合压痛、壁厚、周围液体及实验室结果。', tips:['把焦点放在结石后方，声影更清楚。','胆囊颈部嵌顿结石可能不随体位移动。'], pitfalls:['气体和肠内容物可产生类似声影。','不能从单张图可靠判断超声Murphy征。'], recall:'强回声 → 声影 → 移动性 → 分开评估炎症。', ref:'ruq'
  },
  'abdomen-hydronephrosis': {
    title:'肾积水', english:'Hydronephrosis', modality:'US', level:'中级', distractors:['肾旁盂囊肿','单纯肾囊肿','肾实性肿块'], tags:['肾盂肾盏扩张','无回声','皮质变薄'], signs:['识别相互连通的肾盂和肾盏无回声扩张','评估扩张程度、肾实质厚度和双侧性','用彩色多普勒排除血管，并检查输尿管与膀胱'], basis:'来源明确标注肾积水及其程度或原因；肾积水是影像表现，不自动等于持续梗阻。', differential:'肾旁盂囊肿多不相互连通；肾血管可用多普勒识别，髓质锥体有固定解剖分布。', pearl:'早期梗阻可无明显扩张，扩张也可在无当前机械性梗阻时存在。', method:'纵横切面确认集合系统连续性，比较双肾并评估皮质。', next:'结合疼痛、感染、肾功能和膀胱状态，按需要追查结石或其他梗阻原因。', tips:['不要只看黑色面积，要看是否沿集合系统分支。','皮质变薄提示慢性影响，但不能直接换算肾功能。'], pitfalls:['单张肾图不能定位输尿管全程梗阻。','探头压力和膀胱充盈可改变外观。'], recall:'连通的集合系统扩张 → 皮质 → 双侧性 → 找原因。', ref:'acr'
  },
  'abdomen-diverticulitis': {
    title:'结肠憩室炎及并发症', english:'Colonic diverticulitis and complications', modality:'CT', level:'中级', distractors:['结肠癌','结肠炎','脂肪垂炎'], tags:['憩室','肠壁增厚','周围脂肪浸润'], signs:['定位发炎憩室及邻近节段性肠壁增厚','观察周围脂肪浸润与筋膜反应','检查脓肿、游离气体、瘘或梗阻'], basis:'来源明确标注乙状结肠憩室炎，部分病例含局限穿孔或脓肿。', differential:'结肠癌可有不对称短段增厚和淋巴结；结肠炎常累及较长节段；脂肪垂炎病灶中心在脂肪。', pearl:'找到“发炎的憩室”比只看到肠壁增厚更具定位价值。', method:'沿结肠追踪炎症中心，判断肠壁、憩室与周围脂肪的关系。', next:'分层报告并发症；急性期后是否需要结肠评估由临床按指南和风险决定。', tips:['肺窗样宽窗可帮助发现少量游离气体。','多平面重建有助确认脓肿与肠腔关系。'], pitfalls:['不能因有憩室就把所有壁增厚归因于憩室炎。','局限穿孔可能只有微量气体。'], recall:'发炎憩室 → 壁增厚 → 脂肪浸润 → 穿孔/脓肿。', ref:'llq'
  },
  'abdomen-hcc': {
    title:'肝细胞癌影像模式', english:'Hepatocellular carcinoma imaging pattern', modality:'CT', level:'进阶', distractors:['肝血管瘤','肝转移瘤','肝内胆管癌'], tags:['动脉期强化','廓清','肝硬化背景'], signs:['在多期增强中比较动脉期与门静脉/延迟期','寻找非周边性动脉期高强化、后期廓清和包膜','评估肝硬化背景、门静脉癌栓及肝内播散'], basis:'来源明确标注HCC；典型增强模式只应在合适高危人群和标准检查中应用。', differential:'血管瘤常外周结节样渐进填充；转移瘤和胆管癌增强模式不同但可重叠。', pearl:'“动脉期亮”本身不等于HCC，必须结合后续时相、病灶大小和宿主背景。', method:'核对是否包含合格多期增强，再逐时相观察同一病灶而非比较不同层面。', next:'按现行肝脏报告系统/指南分层，并评估肝内外分期；不典型者可能需要其他成像或组织学。', tips:['确认动脉期时相是否充分。','肝胆期低信号不等同于“廓清”。'], pitfalls:['不能在无肝硬化等背景时机械套用无创HCC标准。','截图不能完成病灶测量和分期。'], recall:'高危背景 → 动脉期高强化 → 后期廓清/包膜 → 分期。', ref:'hcc'
  },
  'abdomen-aaa': {
    title:'腹主动脉瘤', english:'Abdominal aortic aneurysm', modality:'CT', level:'中级', distractors:['主动脉夹层','腹膜后血肿','髂动脉瘤'], tags:['主动脉扩张','附壁血栓','破裂征象'], signs:['测量主动脉外壁到外壁的最大正交径','区分通畅管腔与附壁血栓，评估近端瘤颈和髂动脉','检查腹膜后血肿、造影剂外渗和周围脂肪改变'], basis:'来源明确标注腹主动脉瘤，部分病例为破裂或三维重建。', differential:'主动脉迂曲需正交测量；假性动脉瘤和夹层有不同壁与腔内表现。', pearl:'只量强化管腔会低估含附壁血栓的动脉瘤真实直径。', method:'在垂直于血管中心线的平面测外径，并从肾动脉到髂动脉完整评估。', next:'筛查/随访优先超声；症状性或拟手术患者按SVS建议使用CT/CTA并转血管专科。', tips:['轴位斜切会高估直径，需正交重建。','破裂风险判断不能只看一个直径。'], pitfalls:['静态截图上的像素不能重新精确测量。','无外渗不等于排除已封闭或即将破裂。'], recall:'外壁外壁正交径 → 血栓/瘤颈 → 破裂征象 → 临床紧急度。', ref:'aaa'
  },
  'abdomen-renal-cyst': {
    title:'单纯性肾囊肿', english:'Simple renal cyst', modality:'US', level:'入门', distractors:['肾积水','复杂性肾囊性肿块','实性肾肿瘤'], tags:['无回声','薄壁','后方增强'], signs:['确认圆形或椭圆形无回声病灶','观察壁薄、边界光滑且无分隔或壁结节','寻找后方回声增强并确认与集合系统不相通'], basis:'来源明确标注肾囊肿；本组用于识别简单囊性超声模式。', differential:'肾积水沿集合系统分支并相连；复杂囊肿可有分隔、钙化、壁结节或血流。', pearl:'只要出现复杂成分，就不应继续按“单纯囊肿”模板描述。', method:'多切面确认囊性特征，用彩色多普勒排除血管或实性成分。', next:'复杂囊性病变需要按临床问题选择增强CT/MRI进一步分级。', tips:['适当调节增益，避免把低回声实性病灶误判为无回声。','确认病灶是否与肾盂肾盏连通。'], pitfalls:['单张图不能完整评价所有壁面。','超声不能直接套用需要增强信息的Bosniak分级。'], recall:'无回声 → 薄壁光滑 → 后方增强 → 无血流/不连集合系统。', ref:'acr'
  },
  'abdomen-gallbladder-polyp': {
    title:'胆囊息肉样病变', english:'Gallbladder polypoid lesion', modality:'US', level:'中级', distractors:['胆囊结石','胆泥球','胆囊腺肌症'], tags:['附壁','不移动','无声影'], signs:['寻找附着胆囊壁的息肉样回声','体位改变后确认是否仍固定','观察后方声影、蒂、壁增厚及彩色血流'], basis:'所选来源明确标注胆囊息肉；网页只训练息肉样病变识别，不凭截图决定随访。', differential:'结石多移动并有声影；胆泥球可缓慢改变位置；腺肌症可有彗尾伪影。', pearl:'管理取决于大小、形态、增长和患者风险因素，单张未校准图不足以决策。', method:'多体位、多切面观察附壁关系、移动性和声影，记录最大径与形态。', next:'根据正式超声测量、既往变化和指南风险因素决定复查或专科评估。', tips:['体位变化是区分结石/胆泥的重要步骤。','彩色多普勒无血流并不能排除小息肉。'], pitfalls:['壁上伪影可模拟小息肉。','不要从截图读取设备标尺后自行下管理结论。'], recall:'附壁 → 不移动 → 无声影 → 正式测量与风险分层。', ref:'ruq'
  },

  'bone-hip-fracture': {
    title:'髋部骨折', english:'Hip fracture', modality:'X-RAY', level:'入门', distractors:['髋关节骨关节炎','股骨头坏死','髋关节脱位'], tags:['股骨颈','转子间','Shenton线'], signs:['寻找股骨颈或转子区皮质中断和骨折线','观察小梁中断、嵌插、旋转和肢体短缩','检查Shenton线、关节对位及骨盆其他损伤'], basis:'来源明确标注股骨颈、转子区或隐匿性髋部骨折。', differential:'血管沟和皮肤皱褶可模拟骨折；股骨头坏死与骨关节炎有不同的关节面改变。', pearl:'高临床怀疑而X线阴性时，不能用一张阴性片结束评估。', method:'联合骨盆正位和髋部侧位，沿股骨颈皮质与小梁逐段检查。', next:'报告骨折部位、移位/嵌插和关节对位；隐匿骨折按临床选择MRI或CT。', tips:['左右对比Shenton线和股骨颈小梁。','侧位片对嵌插和移位方向很重要。'], pitfalls:['皮肤褶皱可跨越骨皮质，需用另一投照确认。','不要忽略同侧骨盆和股骨远端。'], recall:'皮质/小梁 → 部位 → 移位嵌插 → 隐匿骨折路径。', ref:'acr'
  },
  'bone-ankle-fracture': {
    title:'踝部骨折', english:'Ankle fracture', modality:'X-RAY', level:'中级', distractors:['踝关节扭伤','距骨骨软骨损伤','跟骨骨折'], tags:['踝穴','骨骺','关节面'], signs:['检查内外后踝及远端胫腓骨皮质','评估踝穴对称性、内侧间隙和胫腓联合','儿童需沿骨骺板寻找Salter-Harris骨折'], basis:'来源明确标注踝部骨折，所选病例包含儿童骨骺损伤。', differential:'骨骺线和副骨可模拟骨折；韧带损伤可在骨片不明显时造成对位异常。', pearl:'骨折线之外，踝穴稳定性和关节面台阶决定描述完整性。', method:'至少结合正位、踝穴位和侧位，系统检查三踝与胫腓联合。', next:'报告关节面和骨骺受累；复杂或隐匿损伤按ACR路径选择CT/MRI。', tips:['儿童先确认骨骺是否闭合。','追踪腓骨全长，避免漏掉高位损伤。'], pitfalls:['不能只看最疼处。','投照旋转可造成假性踝穴不对称。'], recall:'三踝 → 踝穴 → 胫腓联合 → 关节面/骨骺。', ref:'ankle'
  },
  'bone-clavicle-fracture': {
    title:'锁骨骨折', english:'Clavicle fracture', modality:'X-RAY', level:'入门', distractors:['肩锁关节脱位','肱骨近端骨折','第一肋骨骨折'], tags:['锁骨中段','移位','短缩'], signs:['沿锁骨全长寻找皮质中断与骨折线','描述内中外段位置、移位、成角和短缩','检查肩锁/胸锁关节、肺尖及邻近肋骨'], basis:'来源明确标注锁骨骨折；病例包含不同部位和移位程度。', differential:'肩锁关节损伤以关节间隙和喙锁距离异常为主；重叠结构可模拟骨折线。', pearl:'发现锁骨骨折后仍需检查肺尖和神经血管风险线索。', method:'正位结合头倾位或其他合适投照，沿S形锁骨逐段检查。', next:'报告皮肤受压、开放伤和神经血管情况需依赖临床；影像描述移位和粉碎。', tips:['不要只看中段，外侧端骨折容易漏。','比较喙锁距离有助识别伴随肩锁损伤。'], pitfalls:['单一投照会低估短缩和移位。','网页图不能代替临床皮肤与血运检查。'], recall:'内中外段 → 移位/短缩 → 关节 → 肺尖。', ref:'clavicle'
  },
  'bone-distal-radius': {
    title:'桡骨远端骨折', english:'Distal radius fracture', modality:'X-RAY', level:'中级', distractors:['舟骨骨折','月骨脱位','尺骨远端骨折'], tags:['背侧倾斜','桡骨短缩','关节面'], signs:['寻找桡骨远端皮质和小梁中断','评估掌倾角/背侧倾斜、桡骨高度和尺偏角','检查关节面台阶、尺骨茎突及腕骨对位'], basis:'来源明确标注桡骨远端骨折，含嵌插、青枝或隆起型等不同模式。', differential:'Colles与Smith型移位方向相反；儿童骨骺与成人退变需避免误判。', pearl:'“有骨折”之后还要描述关节面、倾斜、短缩和腕骨对位。', method:'联合正侧位，先定位骨折，再按长度、角度、关节面和伴随损伤检查。', next:'复杂关节内骨折可按临床需要CT；神经血管和开放伤由临床评估。', tips:['侧位最适合判断掌背侧倾斜。','隆起骨折可能只有轻微皮质鼓起。'], pitfalls:['不能用未校准网页截图精确测角。','发现桡骨骨折后不要漏看远端尺骨和腕骨。'], recall:'骨折线 → 倾斜/短缩 → 关节面 → 腕骨对位。', ref:'acr'
  },
  'bone-shoulder-dislocation': {
    title:'盂肱关节脱位', english:'Glenohumeral dislocation', modality:'X-RAY', level:'中级', distractors:['肱骨近端骨折','肩锁关节脱位','肩袖撕裂'], tags:['肱骨头','肩胛Y位','前后脱位'], signs:['判断肱骨头与关节盂是否保持对位','结合AP、肩胛Y位或腋位确定前后方向','检查大结节、肱骨头和关节盂骨折及Hill-Sachs线索'], basis:'来源明确标注前、后、下方或慢性肩关节脱位。', differential:'肩锁关节脱位不改变盂肱对位；投照不正可造成假性半脱位。', pearl:'后脱位容易在单一AP片漏诊，必须用第二投照确认。', method:'先找关节盂中心与肱骨头位置，再用正交投照确定方向和伴随骨折。', next:'复位前后都需神经血管临床检查；影像复查确认对位和并发骨折。', tips:['“灯泡征”提示后脱位，但不能单独确认。','肩胛Y位上肱骨头应位于Y形交汇附近。'], pitfalls:['没有腋位时不要轻易排除后脱位。','疼痛性下垂可模拟半脱位。'], recall:'盂肱对位 → 第二投照 → 方向 → 伴随骨折。', ref:'acr'
  },
  'bone-osteosarcoma': {
    title:'骨肉瘤影像模式', english:'Osteosarcoma imaging pattern', modality:'X-RAY', level:'进阶', distractors:['骨髓炎','尤文肉瘤','骨巨细胞瘤'], tags:['侵袭性骨破坏','肿瘤骨','软组织肿块'], signs:['观察干骺端侵袭性溶骨/成骨混合改变','寻找肿瘤骨、骨膜反应和皮质破坏','评估软组织肿块及病变跨关节/神经血管关系'], basis:'来源明确标注人类骨肉瘤；影像模式提示侵袭性原发骨肿瘤。', differential:'骨髓炎和尤文肉瘤可有侵袭性骨膜反应；最终诊断依赖规范取样和病理。', pearl:'疑似恶性骨肿瘤应先完成分期成像规划，再由骨肿瘤团队安排活检路径。', method:'X线判断骨破坏、基质和骨膜反应，MRI评估髓内及软组织范围。', next:'进行局部分期和胸部转移评估，由骨肿瘤多学科完成病理诊断。', tips:['先判断生长速度和基质，再尝试命名。','活检通道会影响手术方案，不能随意取样。'], pitfalls:['“日光放射”并非每例都有，也非绝对特异。','网页静态图不能完成肿瘤分期。'], recall:'侵袭性 → 基质/骨膜 → MRI范围 → 分期与规范活检。', ref:'acr'
  },
  'bone-rheumatoid': {
    title:'类风湿关节炎骨改变', english:'Rheumatoid arthritis on radiographs', modality:'X-RAY', level:'进阶', distractors:['骨关节炎','痛风性关节炎','银屑病关节炎'], tags:['边缘侵蚀','均匀间隙变窄','关节周围骨量减少'], signs:['寻找对称性、均匀性关节间隙变窄','观察边缘性骨侵蚀和关节周围骨量减少','检查腕骨塌陷、半脱位和颈椎不稳等晚期改变'], basis:'来源明确标注类风湿关节炎伴显著骨破坏；单一晚期病例不能代表所有阶段。', differential:'骨关节炎多有非均匀间隙变窄和骨赘；痛风常有悬垂边缘侵蚀且骨量相对保留。', pearl:'RA诊断来自症状、查体、血液检查和影像的综合，不是X线单项。', method:'按双侧对称、间隙、侵蚀、骨量和对位顺序评价小关节与受累关节。', next:'早期X线可正常，持续怀疑时由风湿科结合超声/MRI和血清学评估。', tips:['比较双侧同名关节。','先描述侵蚀位置和分布，再给炎性关节病倾向。'], pitfalls:['退变性囊变不能一律叫侵蚀。','严重破坏阶段仍需结合临床排除感染。'], recall:'对称性 → 均匀变窄 → 边缘侵蚀 → 变形/半脱位。', ref:'ra'
  },
  'bone-scoliosis': {
    title:'脊柱侧弯', english:'Scoliosis', modality:'X-RAY', level:'中级', distractors:['单纯体位倾斜','椎体压缩骨折','腰椎滑脱'], tags:['站立全脊柱','Cobb角','椎体旋转'], signs:['在站立全脊柱片上识别主弯、代偿弯和顶椎','选择合适端椎并测量Cobb角','观察椎体旋转、冠状/矢状平衡及骨成熟度'], basis:'来源明确标注脊柱侧弯；部分图含测量线或术前术后拼图。', differential:'体位性倾斜在卧位或纠正体位可改变；长短腿和疼痛性姿势可造成代偿弯。', pearl:'网页缩略图只用于识别曲线，正式Cobb角必须在标准站立片上测量。', method:'先确认站立与覆盖范围，再定主弯和端椎，最后测量并评价整体平衡。', next:'结合年龄、骨成熟、症状和既往片比较进展，由脊柱专科决定随访。', tips:['每次随访尽量使用一致端椎以提高可比性。','冠状位曲线之外还要看矢状平衡。'], pitfalls:['不能把相机拍屏的角度当作真实Cobb角。','术后片与术前片目的不同，不能混作同一测量基线。'], recall:'标准站立片 → 主弯/端椎 → Cobb角 → 旋转与平衡。', ref:'acr'
  },
  'bone-compression-fracture': {
    title:'椎体压缩骨折', english:'Vertebral compression fracture', modality:'X-RAY', level:'中级', distractors:['椎体血管瘤','退行性楔形变','脊椎炎'], tags:['椎体高度丢失','楔形变','终板'], signs:['比较前中后柱椎体高度并寻找楔形或塌陷','观察终板中断、皮质皱褶和局部后凸','检查后壁受累及相邻多发骨折'], basis:'来源明确标注胸腰椎压缩骨折。', differential:'慢性退变楔形变和Scheuermann病可相似；病理性骨折需寻找骨破坏或软组织肿块。', pearl:'X线能显示形态，但判断急慢性常需既往片或MRI骨髓水肿。', method:'在正侧位逐椎比较高度和终板，定位最明显节段并评价后壁。', next:'外伤机制、骨质疏松和肿瘤史决定是否进一步CT/MRI。', tips:['侧位比正位更适合判断前缘高度丢失。','多发骨折时仍要逐个编号。'], pitfalls:['不能仅凭楔形确定为新鲜骨折。','后壁受累提示更复杂损伤，不能按单纯压缩处理。'], recall:'椎体高度 → 终板/皮质 → 后壁 → 急慢性与病因。', ref:'acr'
  },
  'bone-tibia-fracture': {
    title:'胫骨骨折', english:'Tibial fracture', modality:'X-RAY', level:'中级', distractors:['腓骨骨折','骨髓炎','骨肿瘤'], tags:['胫骨皮质','关节面','隐匿骨折'], signs:['沿胫骨全长寻找皮质/骨小梁中断或骨髓水肿','检查近端和远端关节面、骨骺及伴随腓骨损伤','描述移位、成角、旋转和软组织改变'], basis:'来源明确标注胫骨骨折，所选病例包含骨骺、撕脱和隐匿性骨折的X线或MRI。', differential:'营养血管沟和生长板可模拟骨折；应力反应早期X线可阴性。', pearl:'长骨骨折要包含上下关节；隐匿骨折需根据临床选择MRI或复查。', method:'正侧位沿全长检查；MRI病例通过T1低信号线和液敏序列骨髓水肿定位。', next:'报告是否开放、神经血管和筋膜室风险依赖临床，影像描述关节与骨骺受累。', tips:['不要只看一幅MRI序列。','儿童撕脱骨折要认识正常骨化中心。'], pitfalls:['水肿不是骨折线本身。','局部片可能遗漏同侧踝或膝损伤。'], recall:'全长皮质 → 上下关节 → 移位 → 隐匿骨折MRI。', ref:'acr'
  },
  'bone-femur-fracture': {
    title:'小转子撕脱骨折', english:'Lesser trochanter avulsion fracture', modality:'X-RAY', level:'中级', distractors:['股骨颈骨折','髂前上棘撕脱骨折','髋关节脱位'], tags:['小转子','撕脱骨片','年龄差异'], signs:['在小转子附着区寻找撕脱骨片','评估骨片移位和周围骨质是否正常','检查股骨颈、髋臼及其他骨盆撕脱部位'], basis:'来源明确标注青少年运动相关小转子撕脱骨折。', differential:'正常骨化中心需结合年龄和对侧；成人无明显外伤的小转子撕脱需警惕病理性骨折。', pearl:'同一种影像在青少年和成人的病因权重不同。', method:'骨盆/髋部正位定位骨片，结合侧位和对侧判断附着点与移位。', next:'结合年龄和损伤机制；成人不典型病例需进一步评估潜在骨病变。', tips:['先定位肌腱附着点再命名撕脱骨折。','检查是否还有多发骨盆撕脱。'], pitfalls:['不能把骨化中心误作游离骨片。','网页图不能评价肌腱完整性。'], recall:'年龄机制 → 小转子骨片 → 移位 → 成人排病理性。', ref:'acr'
  }
};

const EXPANDED_METHOD_START = {
  '胸部':'先确认投照体位、旋转、吸气和曝光质量，再按气道、肺、胸膜、心纵隔和骨骼顺序阅读。',
  '神经':'先确认CT或MRI及所示序列/窗位，随后对称比较，并按脑实质、脑外间隙、脑室脑池和骨质顺序检查。',
  '腹部':'先确认器官、切面、增强时相或超声方向，再从病灶位置、形态、内部和周围反应四方面描述。',
  '骨骼':'先确认侧别、投照与覆盖范围，至少联合两个正交方向检查骨皮质、小梁、关节对位和软组织。'
};
function expandedMethodStart(system, modality) {
  if (modality === 'X-RAY') return EXPANDED_METHOD_START[system];
  if (modality === 'CT' || modality === 'CTPA') {
    return '先确认本张 CT 图像的方向、解剖覆盖范围、窗位及是否使用对比剂，再按' + ({'胸部':'气道、肺、胸膜、心纵隔和骨骼','神经':'脑实质、脑外间隙、脑室脑池和骨质','腹部':'器官、肠管、血管和周围脂肪','骨骼':'骨皮质、关节面和软组织'}[system]) + '逐项检查；单张图不能代替完整层面。';
  }
  if (modality === 'MRI') return '先确认本张 MRI 图像的序列和方向，再定位异常信号、周围结构与占位效应；未显示的其他序列不能按已检查处理。';
  if (modality === 'MRA') return '先确认这是 MR 血管成像及其投影方向，再检查血管走行、狭窄或侧支；MIP 静态图不能代替完整原始层面。';
  if (modality === 'DSA') return '先确认数字减影血管造影的投影方向和所示造影时相，再检查供血动脉、侧支和血管病变；单帧不能代表完整动态检查。';
  if (modality === 'US') return '先确认超声图像的器官、切面和探头方向，再描述回声、边界和声影；静态图不能替代动态扫查。';
  return '先确认本图检查类型、切面、覆盖范围和来源说明，再进行系统性阅片。';
}

// Additional diagnosis groups are generated from the manually reviewed second
// expansion batch before source records are converted into cases.
Object.assign(EXPANDED_GROUPS, ADDITIONAL_GROUPS, NEXT_76_GROUPS, NEXT_200_GROUPS, NEXT_304_GROUPS, NEXT_502_GROUPS);

// Source-supported subtypes prevent distinct images from collapsing into one
// generic lesson. These labels only use details stated on each Commons page.
function specializedGroup(baseKey,title,english,patch) {
  return Object.assign({},EXPANDED_GROUPS[baseKey],{title:title,english:english},patch);
}
Object.assign(EXPANDED_GROUPS,{
  'bone-hip-garden-iii':specializedGroup('bone-hip-fracture','股骨颈骨折（Garden III）','Garden III femoral neck fracture',{
    distractors:['股骨颈无移位骨折','转子间骨折','髋关节脱位'],tags:['股骨颈','Garden III','部分移位'],
    signs:['确认股骨颈完全骨折线及头颈连续性中断','观察骨折端部分移位、旋转与短缩','评估股骨头位置、Shenton线及髋臼'],
    differential:'与Garden I/II无移位骨折、转子间骨折及投照旋转鉴别；分型需结合标准正位和侧位。',recall:'完全骨折 → 部分移位 → Garden III → 评估头颈血供风险。'}),
  'bone-hip-nondisplaced-medial':specializedGroup('bone-hip-fracture','内侧型无移位股骨颈骨折','Nondisplaced medial femoral neck fracture',{
    distractors:['转子间骨折','髋关节退变','髋臼骨折'],tags:['股骨颈内侧型','无移位','隐匿'],
    signs:['沿股骨颈皮质寻找细微中断或致密嵌插线','比较双侧Shenton线并观察头颈轴线','侧位确认骨折线且评估后倾'],
    differential:'骨小梁重叠与皮肤皱褶可模拟骨折；持续临床怀疑时不能以单张阴性正位片排除。',recall:'细微皮质/嵌插线 → 无明显移位 → 侧位或MRI确认。'}),
  'bone-hip-pertrochanteric':specializedGroup('bone-hip-fracture','转子间股骨骨折','Pertrochanteric femoral fracture',{
    distractors:['股骨颈骨折','转子下骨折','髋关节脱位'],tags:['转子间区','粉碎','内翻短缩'],
    signs:['定位骨折线是否经过大、小转子之间','描述粉碎程度、小转子骨片及内侧支撑','评估内翻、短缩和股骨头髋臼对位'],
    differential:'股骨颈骨折位于关节囊内；转子下骨折中心位于小转子下方。',recall:'转子间骨折线 → 粉碎/小转子 → 内侧支撑 → 移位。'}),
  'bone-hip-subcapital-occult':specializedGroup('bone-hip-fracture','隐匿或嵌插性头下型股骨颈骨折','Occult or impacted subcapital fracture',{
    distractors:['髋部软组织挫伤','髋关节骨关节炎','转子间骨折'],tags:['头下型','嵌插','隐匿骨折'],
    signs:['寻找股骨头下方细密骨折线或局灶骨小梁压缩','检查皮质是否仍近似连续及轻微头颈角改变','阴性或可疑X线需结合CT/MRI确认'],
    differential:'骨赘和骨小梁重叠可产生假线；MRI骨髓水肿与低信号骨折线支持隐匿骨折。',recall:'头下细线/压缩 → X线可隐匿 → CT或MRI确认。'}),
  'bone-hip-displaced-neck':specializedGroup('bone-hip-fracture','移位性股骨颈骨折','Displaced femoral neck fracture',{
    distractors:['无移位股骨颈骨折','转子间骨折','髋臼骨折'],tags:['股骨颈','移位','Garden IV'],
    signs:['确认股骨颈骨折并描述头颈骨折端分离','观察内翻、旋转、短缩及Shenton线中断','评估股骨头仍位于髋臼内以及其他骨盆损伤'],
    differential:'与转子间骨折按骨折中心区分；严重旋转的投照片不能替代正交位。',recall:'股骨颈骨折 → 明显移位 → Shenton线中断 → 评估并发风险。'}),
  'bone-hip-medial-neck':specializedGroup('bone-hip-fracture','内侧型股骨颈骨折','Medial femoral neck fracture',{
    distractors:['转子间骨折','转子下骨折','髋臼骨折'],tags:['股骨颈内侧型','关节囊内','正交位'],
    signs:['定位骨折线位于股骨颈内侧关节囊内区域','描述骨折端对位、头颈角及Shenton线','侧位补充判断前后移位并检查股骨头'],
    differential:'与头下型、经颈型和转子间骨折按骨折中心区分；来源未说明时不擅自追加Garden分型。',recall:'股骨颈内侧区 → 描述移位而不臆测分型 → 正交位确认。'}),
  'bone-hip-transcervical':specializedGroup('bone-hip-fracture','经颈型股骨颈骨折','Transcervical femoral neck fracture',{
    distractors:['头下型股骨颈骨折','转子间骨折','转子下骨折'],tags:['经颈型','股骨颈中段','关节囊内'],
    signs:['确认骨折线横过股骨颈中段','描述内翻、旋转、短缩及骨折端移位','观察股骨头髋臼对位并结合侧位'],
    differential:'头下型更靠近股骨头；基底颈型接近转子间线。来源未说明时不追加移位分级。',recall:'股骨颈中段骨折线 → 经颈型 → 描述实际移位。'}),
  'bone-hip-subtrochanteric':specializedGroup('bone-hip-fracture','转子下股骨螺旋骨折','Subtrochanteric spiral femoral fracture',{
    distractors:['转子间骨折','股骨颈骨折','病理性骨折'],tags:['转子下','螺旋骨折','股骨干近端'],
    signs:['定位骨折中心在小转子下方','沿股骨干近端追踪螺旋形骨折线','描述移位、成角、短缩并检查髋关节'],
    differential:'转子间骨折累及大小转子区；低能量非典型横行骨折需结合用药和骨质背景。',recall:'小转子下方 → 螺旋线 → 移位成角 → 检查全股骨。'}),

  'bone-clavicle-lateral':specializedGroup('bone-clavicle-fracture','锁骨外侧端骨折','Lateral clavicle fracture',{
    distractors:['肩锁关节脱位','锁骨中段骨折','肩峰骨折'],tags:['锁骨外侧端','肩锁关节','喙锁韧带'],
    signs:['确认骨折位于锁骨外侧三分之一','观察肩锁关节、喙锁间距与骨折端移位','检查肩峰及上位肋骨'],recall:'外侧三分之一 → 肩锁/喙锁关系 → 稳定性线索。'}),
  'bone-clavicle-midshaft':specializedGroup('bone-clavicle-fracture','锁骨中段骨折','Midshaft clavicle fracture',{
    distractors:['肩锁关节脱位','锁骨外侧端骨折','第一肋骨骨折'],tags:['锁骨中段','移位','短缩'],
    signs:['沿锁骨S形轮廓定位中段皮质中断','描述上下移位、重叠短缩和成角','评估皮肤顶压征象需结合临床并检查胸廓'],recall:'中段皮质中断 → 移位/短缩 → 胸廓伴随损伤。'}),
  'bone-clavicle-comminuted':specializedGroup('bone-clavicle-fracture','粉碎性锁骨骨折','Comminuted clavicle fracture',{
    distractors:['单纯线性锁骨骨折','肩锁关节脱位','肩胛骨骨折'],tags:['锁骨','粉碎','蝶形骨片'],
    signs:['识别两个以上骨折片并定位主要骨折区','描述蝶形骨片、移位、短缩和成角','检查肩锁/胸锁关节及同侧胸廓'],recall:'多骨片 → 主骨折端 → 短缩成角 → 邻近关节与胸廓。'}),
  'bone-clavicle-butterfly':specializedGroup('bone-clavicle-fracture','锁骨蝶形骨片骨折','Clavicle butterfly fracture',{
    distractors:['单纯横行骨折','肩锁关节脱位','陈旧骨折骨痂'],tags:['蝶形骨片','弯曲楔形','锁骨'],
    signs:['识别锁骨骨折处楔形蝶形骨片','描述主骨折端移位、短缩及骨片方向','检查皮肤、神经血管风险需结合临床'],recall:'楔形第三骨片 → 蝶形骨折 → 描述短缩与移位。'}),
  'bone-clavicle-scapula':specializedGroup('bone-clavicle-fracture','锁骨合并肩胛骨骨折','Combined clavicle and scapular fracture',{
    distractors:['单纯锁骨骨折','肩锁关节脱位','肱骨近端骨折'],tags:['锁骨骨折','肩胛骨骨折','肩胛带'],
    signs:['分别确认锁骨与肩胛骨皮质中断','评价肩胛颈、关节盂及肩胛带稳定性','检查同侧肋骨和胸部伴随损伤'],recall:'锁骨 + 肩胛骨双处损伤 → 评价悬肩复合体。'}),

  'bone-radius-dorsal-tilt':specializedGroup('bone-distal-radius','桡骨远端骨折伴背侧倾斜','Distal radius fracture with dorsal tilt',{
    distractors:['掌侧倾斜骨折','腕关节脱位','舟骨骨折'],tags:['桡骨远端','背侧倾斜','侧位测量'],
    signs:['侧位确定桡骨远端关节面向背侧倾斜','比较正常掌倾角并观察桡骨高度','检查关节内延伸与尺骨茎突'],recall:'侧位关节面 → 背倾 → 桡骨高度/关节内受累。'}),
  'bone-radius-fatpad':specializedGroup('bone-distal-radius','无移位桡骨远端骨折与旋前方脂肪垫征','Nondisplaced distal radius fracture with pronator fat-pad sign',{
    distractors:['腕部软组织肿胀','舟骨骨折','尺骨茎突骨折'],tags:['无移位','旋前方脂肪垫','隐匿骨折'],
    signs:['寻找细微桡骨远端皮质中断','观察旋前方脂肪垫隆起或移位','结合正侧位确认无明显成角或移位'],recall:'细微骨折线 + 异常旋前方脂肪垫 → 隐匿远端桡骨骨折。'}),
  'bone-radius-intraarticular':specializedGroup('bone-distal-radius','移位性关节内桡骨远端骨折','Displaced intra-articular distal radius fracture',{
    distractors:['关节外Colles骨折','舟骨骨折','腕骨脱位'],tags:['关节内','移位','关节面台阶'],
    signs:['追踪骨折线进入桡腕关节面','描述关节面台阶、间隙及骨片移位','评估桡骨短缩、倾斜和远端尺桡关节'],recall:'骨折线入关节 → 台阶/分离 → 桡骨短缩与DRUJ。'}),
  'bone-radius-buckle':specializedGroup('bone-distal-radius','儿童桡骨远端隆起骨折','Distal radius buckle fracture',{
    distractors:['青枝骨折','Salter–Harris骨折','正常骨骺'],tags:['儿童','隆起骨折','骨皮质皱褶'],
    signs:['寻找干骺端单侧皮质隆起或皱褶','确认无贯穿性骨折线和明显成角','检查尺骨伴随隆起骨折与骨骺'],recall:'干骺端皮质隆起 → 不完全骨折 → 无明显移位。'}),
  'bone-radius-greenstick':specializedGroup('bone-distal-radius','儿童桡骨青枝骨折','Distal radius greenstick fracture',{
    distractors:['隆起骨折','完全横行骨折','Salter–Harris骨折'],tags:['儿童','青枝骨折','单侧皮质中断'],
    signs:['确认一侧皮质中断而对侧皮质弯曲','描述成角方向及程度','检查尺骨伴随损伤和远端骨骺'],recall:'一侧断裂 + 对侧弯曲 → 青枝骨折 → 描述成角。'}),
  'bone-radius-salter-ii':specializedGroup('bone-distal-radius','桡骨远端 Salter–Harris II 骨折','Salter–Harris II distal radius fracture',{
    distractors:['Salter–Harris I骨折','青枝骨折','桡骨远端隆起骨折'],tags:['骨骺损伤','Salter–Harris II','Thurston-Holland骨片'],
    signs:['骨折线经过骨骺板并延伸至干骺端','寻找三角形干骺端骨片','描述骨骺移位并检查尺骨骨骺'],recall:'骨骺板 + 干骺端骨片 → Salter–Harris II。'}),
  'bone-radius-chauffeur':specializedGroup('bone-distal-radius','桡骨茎突 Chauffeur 骨折','Chauffeur fracture of the radius',{
    distractors:['舟骨骨折','Colles骨折','尺骨茎突骨折'],tags:['桡骨茎突','关节内','Chauffeur骨折'],
    signs:['定位骨折累及桡骨茎突','确认关节内延伸及骨片移位','检查舟骨、月骨与远端尺桡关节'],recall:'桡骨茎突骨片 → 关节内 → 检查腕骨排列。'}),

  'bone-shoulder-anterior':specializedGroup('bone-shoulder-dislocation','肩关节前脱位','Anterior shoulder dislocation',{
    distractors:['肩关节后脱位','下方脱位','肱骨近端骨折'],tags:['前下方脱位','盂下位','Hill-Sachs'],
    signs:['肱骨头位于关节盂前下方并失去同心对位','检查Hill-Sachs压陷及关节盂骨折','复位前后均评估肱骨近端和肩胛骨'],recall:'肱骨头前下方 → 失去对位 → 查Hill-Sachs/Bankart。'}),
  'bone-shoulder-posterior':specializedGroup('bone-shoulder-dislocation','肩关节后脱位','Posterior shoulder dislocation',{
    distractors:['肩关节前脱位','肱骨近端骨折','肩锁关节脱位'],tags:['后脱位','灯泡征','肩胛Y位'],
    signs:['正位寻找肱骨头内旋形成灯泡征','肩胛Y位或腋位确认肱骨头位于盂后方','检查反Hill-Sachs压陷与近端骨折'],recall:'固定内旋/灯泡征 → 腋位确认后脱位 → 查反Hill-Sachs。'}),
  'bone-shoulder-inferior':specializedGroup('bone-shoulder-dislocation','肩关节下方脱位（Luxatio erecta）','Inferior shoulder dislocation (luxatio erecta)',{
    distractors:['肩关节前脱位','肩关节后脱位','肱骨颈骨折'],tags:['下方脱位','上举固定','Luxatio erecta'],
    signs:['肱骨头位于关节盂下方','肱骨干呈固定上举姿势','检查肱骨头、关节盂骨折及神经血管风险'],recall:'肱骨头盂下 + 上举固定 → Luxatio erecta。'}),
  'bone-shoulder-chronic':specializedGroup('bone-shoulder-dislocation','慢性前上方肩关节脱位','Chronic anterosuperior shoulder dislocation',{
    distractors:['急性前脱位','肩袖撕裂关节病','肱骨近端骨折'],tags:['慢性脱位','前上方','假关节'],
    signs:['肱骨头长期位于关节盂前上方','观察与锁骨或肩峰间继发假关节改变','评估骨质重塑和关节盂缺损'],recall:'固定前上方脱位 → 骨质重塑/假关节 → 慢性。'}),

  'bone-scoliosis-idiopathic':specializedGroup('bone-scoliosis','青少年特发性脊柱侧弯','Adolescent idiopathic scoliosis',{
    distractors:['姿势性侧弯','先天性半椎体','神经肌肉性侧弯'],tags:['青少年','特发性','Cobb角'],
    signs:['站立全脊柱片确定主弯、顶椎和端椎','测量Cobb角并记录曲线方向与节段','观察椎体旋转、冠状平衡与骨成熟度'],recall:'站立片 → 主弯/端椎 → Cobb角 → 旋转与骨成熟。'}),
  'bone-scoliosis-lumbar-obliquity':specializedGroup('bone-scoliosis','腰椎侧弯伴骨盆倾斜','Lumbar scoliosis with pelvic obliquity',{
    distractors:['单纯体位倾斜','腰椎滑脱','髋关节挛缩'],tags:['腰椎侧弯','骨盆倾斜','冠状平衡'],
    signs:['确认腰椎弯曲方向与顶椎','比较双侧髂嵴高度并评价骨盆倾斜','区分结构性曲线与长短腿或体位代偿'],recall:'腰椎曲线 → 髂嵴高度 → 结构性或代偿性。'}),
  'bone-scoliosis-dystrophic':specializedGroup('bone-scoliosis','营养不良型脊柱侧弯','Dystrophic scoliosis',{
    distractors:['青少年特发性侧弯','姿势性侧弯','退变性侧弯'],tags:['营养不良型','短锐曲线','严重侧弯'],
    signs:['识别短节段、锐角度的严重胸椎曲线','观察椎体扇贝样改变、肋骨铅笔样变等营养不良征象','评价冠状/矢状失衡及快速进展风险'],recall:'短锐重度曲线 + 椎体/肋骨营养不良改变。'}),

  'bone-tibia-tubercle-avulsion':specializedGroup('bone-tibia-fracture','胫骨结节撕脱骨折','Tibial tubercle avulsion fracture',{
    distractors:['髌骨骨折','胫骨平台骨折','Osgood–Schlatter病'],tags:['胫骨结节','撕脱骨折','伸膝装置'],
    signs:['侧位识别胫骨结节骨片分离','描述骨片移位及是否延伸至骨骺/关节面','评估髌骨高度和伸膝装置'],recall:'胫骨结节骨片 → 移位 → 骨骺/关节面与伸膝装置。'}),
  'bone-tibia-occult':specializedGroup('bone-tibia-fracture','隐匿性胫骨近端骨折','Occult proximal tibial fracture',{
    distractors:['骨挫伤','骨髓炎','胫骨平台退变'],tags:['隐匿骨折','MRI','骨髓水肿'],
    signs:['液敏序列寻找骨髓水肿','T1序列确认低信号骨折线','在正交平面判断是否累及关节面'],recall:'液敏高信号水肿 + T1低信号线 → 隐匿骨折。'}),
  'bone-tibia-tillaux':specializedGroup('bone-tibia-fracture','Tillaux 骨折','Tillaux fracture',{
    distractors:['三平面骨折','Salter–Harris II骨折','外踝骨折'],tags:['Tillaux','前外侧骨骺','Salter–Harris III'],
    signs:['识别远端胫骨前外侧骨骺骨折片','确认骨折线从骨骺板进入关节面','评估关节面分离和移位'],recall:'青春期 + 前外侧骨骺 + 关节内 → Tillaux。'}),
  'bone-ankle-salter-iii':specializedGroup('bone-ankle-fracture','踝部 Salter–Harris III 骨折','Salter–Harris III ankle fracture',{
    distractors:['Salter–Harris II骨折','三平面骨折','踝关节扭伤'],tags:['Salter–Harris III','骨骺','关节内'],
    signs:['骨折线经过骨骺板并穿过骨骺进入关节面','评价关节面塌陷或die-punch骨片','描述移位并评估生长板'],recall:'骨骺板 → 骨骺 → 关节面 = Salter–Harris III。'}),
  'bone-ankle-salter-ii':specializedGroup('bone-ankle-fracture','踝部 Salter–Harris II 骨折','Salter–Harris II ankle fracture',{
    distractors:['Salter–Harris III骨折','Tillaux骨折','踝关节扭伤'],tags:['Salter–Harris II','干骺端骨片','骨骺早闭'],
    signs:['骨折线经过骨骺板并延伸至干骺端','侧位评价骨骺移位方向','随访比较双侧骨骺板并观察早闭'],recall:'骨骺板 + 干骺端 → Salter–Harris II → 随访骨骺早闭。'})
});

const SPECIALIZED_GROUP_BY_ID = {
  'bone-hip-fracture-01':'bone-hip-garden-iii','bone-hip-fracture-02':'bone-hip-nondisplaced-medial','bone-hip-fracture-08':'bone-hip-nondisplaced-medial',
  'bone-hip-fracture-03':'bone-hip-pertrochanteric','bone-hip-fracture-06':'bone-hip-pertrochanteric','bone-hip-fracture-12':'bone-hip-pertrochanteric','bone-hip-fracture-14':'bone-hip-pertrochanteric','bone-hip-fracture-19':'bone-hip-pertrochanteric','bone-hip-fracture-20':'bone-hip-pertrochanteric',
  'bone-hip-fracture-04':'bone-hip-subcapital-occult','bone-hip-fracture-15':'bone-hip-subcapital-occult','bone-hip-fracture-10':'bone-hip-subtrochanteric',
  'bone-hip-fracture-05':'bone-hip-displaced-neck','bone-hip-fracture-11':'bone-hip-displaced-neck','bone-hip-fracture-07':'bone-hip-medial-neck','bone-hip-fracture-17':'bone-hip-medial-neck','bone-hip-fracture-16':'bone-hip-transcervical','bone-hip-fracture-18':'bone-hip-transcervical',
  'bone-clavicle-fracture-01':'bone-clavicle-lateral','bone-clavicle-fracture-08':'bone-clavicle-lateral','bone-clavicle-fracture-10':'bone-clavicle-comminuted','bone-clavicle-fracture-13':'bone-clavicle-comminuted','bone-clavicle-fracture-14':'bone-clavicle-comminuted','bone-clavicle-fracture-11':'bone-clavicle-butterfly','bone-clavicle-fracture-12':'bone-clavicle-scapula',
  'bone-clavicle-fracture-03':'bone-clavicle-midshaft','bone-clavicle-fracture-09':'bone-clavicle-midshaft',
  'bone-distal-radius-01':'bone-radius-dorsal-tilt','bone-distal-radius-02':'bone-radius-fatpad','bone-distal-radius-07':'bone-radius-fatpad','bone-distal-radius-03':'bone-radius-intraarticular','bone-distal-radius-04':'bone-radius-buckle','bone-distal-radius-06':'bone-radius-buckle','bone-distal-radius-08':'bone-radius-buckle','bone-distal-radius-05':'bone-radius-greenstick','bone-distal-radius-09':'bone-radius-greenstick','bone-distal-radius-10':'bone-radius-salter-ii','bone-distal-radius-11':'bone-radius-chauffeur',
  'bone-shoulder-dislocation-01':'bone-shoulder-chronic','bone-shoulder-dislocation-02':'bone-shoulder-posterior','bone-shoulder-dislocation-04':'bone-shoulder-posterior','bone-shoulder-dislocation-12':'bone-shoulder-posterior','bone-shoulder-dislocation-05':'bone-shoulder-inferior','bone-shoulder-dislocation-07':'bone-shoulder-inferior',
  'bone-shoulder-dislocation-03':'bone-shoulder-anterior','bone-shoulder-dislocation-09':'bone-shoulder-anterior','bone-shoulder-dislocation-11':'bone-shoulder-anterior',
  'bone-scoliosis-01':'bone-scoliosis-idiopathic','bone-scoliosis-04':'bone-scoliosis-idiopathic','bone-scoliosis-12':'bone-scoliosis-idiopathic','bone-scoliosis-03':'bone-scoliosis-lumbar-obliquity','bone-scoliosis-07':'bone-scoliosis-lumbar-obliquity','bone-scoliosis-09':'bone-scoliosis-dystrophic',
  'bone-tibia-fracture-01':'bone-tibia-tubercle-avulsion','bone-tibia-fracture-02':'bone-tibia-occult','bone-tibia-fracture-03':'bone-tibia-occult','bone-tibia-fracture-04':'bone-tibia-tillaux','bone-ankle-fracture-01':'bone-ankle-salter-iii','bone-ankle-fracture-02':'bone-ankle-salter-ii'
};

function expandedModality(source, fallback) {
  // File title identifies the displayed image more reliably than a description
  // that may mention a different modality used elsewhere in the same workup.
  const title = source.sourceTitle;
  const titleMatches = [
    ['MRA', /\b(?:mra|mr angiograph\w*)\b/i],
    ['DSA', /\b(?:dsa|digital subtraction angiograph\w*)\b/i],
    ['CTPA', /\bctpa\b/i],
    ['CTA', /\bcta\b/i],
    ['MRI', /\b(?:mri|mrt|magnetic resonance|mr[- ]?(?:t1|t2)|flair|dwi)\b/i],
    ['US', /\b(?:ultrasound|ultrasonograph\w*|sonograph\w*|sonogram|echograph\w*)\b/i],
    ['CT', /\b(?:ct|computed tomography|computer tomography|tac craneo)\b/i],
    ['X-RAY', /\b(?:x[ -]?ray\w*|cxr|radiograph\w*|roentgen\w*|r[oö]ntgen\w*|breischluck|roe)\b/i]
  ].filter(function(entry) { return entry[1].test(title); }).map(function(entry) { return entry[0]; });
  if (/(?:^|[\s-])CR(?:[\s-]|\.)/.test(title) && !titleMatches.includes('X-RAY')) titleMatches.push('X-RAY');
  if (titleMatches.length === 1) return titleMatches[0];
  if (titleMatches.length > 1) return fallback;
  const description = source.sourceDescription;
  if (/\b(?:dsa|digital subtraction angiograph\w*)\b/i.test(description)) return 'DSA';
  if (/\b(?:mra|mr angiograph\w*)\b/i.test(description)) return 'MRA';
  if (/\b(?:ctpa|pulmonary ct angiograph\w*)\b/i.test(description)) return 'CTPA';
  if (/\b(?:cta|ct angiograph\w*)\b/i.test(description)) return 'CTA';
  if (/\b(?:mri|mrt|magnetic resonance)\b/i.test(description) && fallback === 'MRI') return 'MRI';
  if (/\b(?:ultrasound|ultrasonograph\w*|sonograph\w*)\b/i.test(description) && fallback === 'US') return 'US';
  if (/\b(?:computed tomography|ct scan)\b/i.test(description) && (fallback === 'CT' || fallback === 'CTPA' || fallback === 'CTA')) return 'CT';
  if (/\b(?:x[ -]?ray\w*|radiograph\w*|roentgen\w*|r[oö]ntgen\w*)\b/i.test(description) && fallback === 'CT') return 'X-RAY';
  return fallback;
}

function correctedTeachingMethod(source, group, modality) {
  if (source.id.includes('-1506-') && modality === 'X-RAY' && /多个MRI序列/.test(group.method)) {
    return '先核对本张 X 线片的投照、覆盖范围和解剖位置，再沿骨皮质、关节面与软组织识别异常；其他检查不能当作本图所见。';
  }
  return group.method;
}

function correctedNextStep(source, group) {
  if (source.id.includes('-1506-') && /规范骨肿瘤评估/.test(group.next) && !/肿瘤|瘤/.test(group.title)) {
    return '结合症状、损伤机制、既往影像及完整检查确认病变；是否补充 CT 或 MRI 应由具体临床问题决定。';
  }
  return group.next;
}
function expandedMixedModalities(source) {
  return /(\b(?:MR|MRI|MRT)\b.{0,15}\bCT\b|\bCT\b.{0,15}\b(?:MR|MRI|MRT)\b|\bUS\b.{0,15}\bCT\b|\bCT\b.{0,15}\bUS\b|\bRoe\b.{0,15}\bMR\b)/i.test(source.sourceTitle);
}
function expandedSigns(source, group) {
  if (source.id === 'neuro-new-moyamoya-01') return [
    '先把左侧患者 MRA 与右侧健康对照图区分，不能当作同一患者双侧',
    '在患者图上检查颈内动脉终末段、前中动脉及侧支血管显示',
    'MIP 投影需要结合原始层面；对照图不能写入患者报告'
  ];
  if (source.id === 'neuro-new-moyamoya-02') return [
    '确认这是右侧颈内动脉数字减影血管造影的单帧',
    '检查颈内动脉终末段、大脑前中动脉与侧支血管',
    '单帧不支持判断完整造影时相、狭窄程度或疾病分期'
  ];
  return group.signs;
}

const expandedSequence = {};
EXPANDED_CASE_SOURCES.forEach(function(source,index) {
  const teachingKey = SPECIALIZED_GROUP_BY_ID[source.id] || source.groupKey;
  const group = EXPANDED_GROUPS[teachingKey];
  if (!group) throw new Error('Missing teaching group: ' + source.groupKey);
  const diagnosis = group.title.replace(/（公开病例\s*\d+）/g,'');
  const sequence = (expandedSequence[diagnosis] || 0) + 1;
  expandedSequence[diagnosis] = sequence;
  const answer = index % 4;
  const options = group.distractors.slice();
  options.splice(answer,0,diagnosis);
  const modality = expandedModality(source,group.modality);
  const signs = expandedSigns(source,group);
  const title = diagnosis + ' · 开放病例 ' + String(sequence).padStart(2,'0');
  CASES.push({
    system:source.system, modality:modality, title:title,
    history:'公开来源未提供可核验的完整临床病史；本例只训练影像征象识别，不根据网页补造症状。',
    image:source.image, level:group.level, answer:answer, options:options,
    findings:signs, explain:group.basis.replace(/（公开病例\s*\d+）/g,''), differential:group.differential,
    pearl:group.pearl,
    report:'公开来源将此影像标注为“' + diagnosis + '”。报告练习应先在原图确认' + signs[0] + '，再核对' + signs[1] + '；未见完整序列和病史时，不应把教学核对项写成已证实的影像所见。',
    source:'Wikimedia Commons · ' + source.artist, license:source.license,
    licenseUrl:source.licenseUrl, sourceUrl:source.sourceUrl,
    sourceFile:source.sourceTitle, sourceEvidence:source.sourceDescription,
    sourceSha1:source.originalSha1, localSha256:source.localSha256
  });
  CURRICULUM.push({
    id:source.id, english:group.english,
    tags:group.tags.filter(function(tag) { return !['CT','CTA','CTPA','MRI','MRA','DSA','US','X-RAY','骨显像'].includes(tag); }).concat(modality,expandedMixedModalities(source) ? ['多模态拼图'] : []),
    methods:[
      ['确认检查与质量',expandedMethodStart(source.system,modality)],
      ['定位并识别',correctedTeachingMethod(source,group,modality)],
      ['鉴别与下一步',correctedNextStep(source,group)]
    ],
    tips:group.tips, pitfalls:group.pitfalls, recall:group.recall,
    limitation:'这是来源提供的单张或拼图式静态影像，不含完整DICOM序列、可校准像素间距和完整病史。诊断名称依据来源说明；本页不能替代放射科正式阅片或临床诊疗。' + (expandedMixedModalities(source) ? ' 文件名提示包含多种检查类型；上方类型仅为主要教学分类，拼图各面板须分别辨认。' : '') + (source.id === 'neuro-new-moyamoya-01' ? ' 本图右半是健康对照，不是患者的另一侧血管。' : ''),
    refs:[EXPANDED_REFS[group.ref],EXPANDED_REFS.acr].filter(function(ref,index,items){
      return index === items.findIndex(function(item){ return item[1] === ref[1]; });
    })
  });
});
