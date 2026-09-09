// Stable identifiers keep learning records attached to the same source image.
const CURRICULUM = [
  {
    id: 'pneumothorax', english: 'Right pneumothorax',
    tags: ['胸膜线', '肺纹理消失', '纵隔移位'],
    methods: [
      ['先判断临床稳定性', '结合呼吸困难、血压及单侧呼吸音判断。怀疑张力性气胸且不稳定时，应由急救团队立即处理，不等待影像确认。'],
      ['胸片确认胸膜腔积气', '按肺尖、外侧胸壁、肋膈角顺序寻找脏层胸膜线，检查线外是否缺乏肺纹理。'],
      ['疑难时补充检查', '病情稳定且胸片难以区分肺大疱或局限性气胸时，可结合超声或 CT；具体选择取决于临床情况。']
    ],
    tips: ['先确认侧别，再沿胸膜线连续追踪，避免把肋骨边缘当成胸膜线。', '同时看受压肺与纵隔；影像上的移位提示压力效应，张力性生理改变仍要结合临床。'],
    pitfalls: ['皮肤皱褶、床单边缘与肺大疱可造成假阳性。', '卧位胸片可能不出现典型肺尖胸膜线，要检查异常加深的肋膈角。'],
    recall: '胸膜线 → 线外无纹理 → 受压肺 → 临床有无张力性改变。',
    limitation: '来源标注为右侧气胸；低血压和年龄为教学设定，不能由这张胸片确认。',
    refs: [['MSD 专业版：气胸', 'https://www.msdmanuals.com/professional/pulmonary-disorders/mediastinal-and-pleural-disorders/pneumothorax'], ['MSD 专业版：张力性气胸', 'https://www.msdmanuals.com/professional/injuries-poisoning/thoracic-trauma/tension-pneumothorax']]
  },
  {
    id: 'pulmonary-edema', english: 'Cardiogenic pulmonary edema',
    tags: ['间质水肿', '肺泡水肿', 'Kerley B 线'],
    methods: [
      ['临床定位病因', '结合端坐呼吸、肺部湿啰音与既往心脏病史，评估是否为急性心力衰竭。'],
      ['胸片观察分布', '检查双肺间质及肺泡性阴影、心影、肺血管和胸腔积液，综合判断水肿模式。'],
      ['寻找心源性依据', '结合心电图、BNP 或 NT-proBNP 和超声心动图评估病因；肺部超声可辅助判断肺水肿与积液。']
    ],
    tips: ['把肺野和心脏一起看；弥漫性肺白影并不等于心力衰竭。', '判断心影大小时注意便携 AP 摄片的放大效应。'],
    pitfalls: ['ARDS、感染及肺泡出血均可能出现双肺阴影。', '有无积液或心影增大都不能单独作为确诊或排除依据。'],
    recall: '肺内分布 + 心影与血管 + 心功能证据。',
    limitation: '单张胸片不能确立水肿病因，也不能替代血流动力学和心功能评估。',
    refs: [['MSD 专业版：肺水肿', 'https://www.msdmanuals.com/professional/cardiovascular-disorders/heart-failure/pulmonary-edema']]
  },
  {
    id: 'pulmonary-embolism', english: 'Acute pulmonary embolism',
    tags: ['充盈缺损', 'CTPA', '右心负荷'],
    methods: [
      ['评估临床可能性', '病情稳定时，先结合症状和危险因素评估肺栓塞可能性；D-二聚体不能单独确诊。'],
      ['选择血管成像', 'CT 肺动脉成像（CTPA）用于确认血管内血栓；不适合检查者可由临床考虑通气/灌注显像等替代方式。'],
      ['完整序列追踪', '沿主干、叶段及更远分支观察充盈缺损，再评估右心和肺实质；单张截图无法评价全部血栓范围。']
    ],
    tips: ['先确认肺动脉对比剂充盈质量，避免在欠佳成像上武断判断。', '在连续层面确认缺损与管腔的关系，再结合心功能评估严重程度。'],
    pitfalls: ['运动、部分容积和对比剂混合伪影可模拟血栓。', '近期手术、感染等也会使 D-二聚体升高。'],
    recall: '临床风险 → CTPA 充盈缺损 → 范围与右心评估。',
    limitation: '本图为单层 CTPA，不用于测量血栓负荷或右室/左室比。',
    refs: [['ACR / RSNA：肺栓塞诊断与评估', 'https://www.radiologyinfo.org/en/info/pulmonary-embolism']]
  },
  {
    id: 'lung-cancer', english: 'Cavitating lung cancer',
    tags: ['空洞', '不规则厚壁', '组织学确诊'],
    methods: [
      ['CT 描述形态', '明确病灶所在肺叶、空洞壁与周围肺组织的关系，并与既往影像比较。'],
      ['结合感染与肿瘤线索', '综合病程、发热、吸烟史等信息；不规则空洞性肿块可提示恶性，但不能仅凭形态确认组织类型。'],
      ['取样与分期', '可根据位置选择支气管镜或影像引导活检；确诊后由临床安排 PET/CT 等分期检查。']
    ],
    tips: ['对比空洞内外壁及实性部分，记录可疑改变。', '在完整 CT 上另行检查气道、淋巴结和胸膜。'],
    pitfalls: ['感染性空洞也可以厚壁，壁厚不是单独的确诊标准。', '不能从这一张图推断鳞癌、腺癌或完整分期。'],
    recall: '影像提出恶性可能 → 与感染鉴别 → 组织学确认。',
    limitation: '病名依据图片来源；此截图没有提供病理报告或完整分期资料。',
    refs: [['ACR / RSNA：肺癌诊断与治疗', 'https://www.radiologyinfo.org/en/info/lung-cancer']]
  },
  {
    id: 'basal-ganglia-hemorrhage', english: 'Left basal ganglia hemorrhage',
    tags: ['高密度血肿', '脑内出血', '占位效应'],
    methods: [
      ['急诊头颅 CT', '急性局灶性神经功能障碍时，头颅 CT 可快速识别脑内出血并区分出血性与缺血性卒中。'],
      ['按部位和影响描述', '确定出血位于脑实质内，观察水肿、脑室受压及中线改变；体积和脑室破入需要完整序列。'],
      ['评估潜在病因', '结合病史及出血分布，按临床需要追加 CTA、MRI 或血管造影等检查。']
    ],
    tips: ['先认脑内还是脑外，再判断基底节、脑叶、小脑等部位。', '描述影像事实与推测病因应分开，不能仅凭基底节位置确认高血压病因。'],
    pitfalls: ['钙化及对比剂残留可能呈高密度，需结合病史和其他序列。', '没有标尺与完整序列时，不填写虚构的血肿体积或中线移位毫米数。'],
    recall: '位置 → 密度 → 水肿 → 脑室与中线 → 病因评估。',
    limitation: '该公开图分辨率有限，适合识别出血类型，不适合精确量化。',
    refs: [['ACR / RSNA：卒中诊断与评估', 'https://www.radiologyinfo.org/en/info/stroke']]
  },
  {
    id: 'epidural-hematoma', english: 'Acute epidural hematoma',
    tags: ['双凸透镜形', '脑外血肿', '颅脑外伤'],
    methods: [
      ['外伤后临床评估', '结合受伤机制、意识和瞳孔变化评估颅内损伤；中间清醒期并非每例都有。'],
      ['非增强头颅 CT', '寻找颅骨内侧典型透镜形高密度血肿，并在完整骨窗上检查相关骨折。'],
      ['评估占位效应', '观察脑室、脑池及中线；结合临床变化及时进行神经外科评估。']
    ],
    tips: ['先看血肿与颅骨的贴附关系，再与新月形硬膜下血肿比较。', '原图箭头只是位置提示，阅片仍需扫描整个可见脑部。'],
    pitfalls: ['不能因为没有典型清醒期就排除硬膜外血肿。', '单层图不能确认血肿完整边界、体积或排除其他外伤。'],
    recall: '外伤 + 脑外透镜形高密度 + 占位效应。',
    limitation: '原图带箭头，另有其他出血；本题聚焦箭头所示血肿类型。',
    refs: [['MSD 专业版：常见创伤性脑损伤类型', 'https://www.msdmanuals.com/professional/multimedia/table/common-types-of-traumatic-brain-injury']]
  },
  {
    id: 'multiple-sclerosis', english: 'Multiple sclerosis lesions',
    tags: ['DIR', '皮质旁病灶', '脱髓鞘'],
    methods: [
      ['确认临床综合征', '结合神经系统症状、体征及既往发作情况，判断是否存在脱髓鞘疾病的可能。'],
      ['完整 MRI 评估', '脑和必要时脊髓 MRI 用于观察分布；FLAIR 辅助显示白质病灶，DIR 可帮助观察皮质病灶。'],
      ['综合证据确认', '由专科按诊断标准整合影像、病程及必要的脑脊液等检查，并排除其他原因。']
    ],
    tips: ['先认序列，再分析病灶与皮质、脑室和脊髓的关系。', '原图为 DIR 皮质病灶示例，不能把它讲成展示强化或 Dawson 指征的图像。'],
    pitfalls: ['白质高信号并不等于多发性硬化。', '单张 DIR 不能判断病灶强化、活动性或满足全部诊断条件。'],
    recall: '临床表现 + 特征性分布 + 完整检查 + 排除替代诊断。',
    limitation: '图中已有箭头和圆圈，仅用于学习病灶分布。',
    refs: [['National MS Society：诊断评估', 'https://www.nationalmssociety.org/for-professionals/for-healthcare-professionals/diagnosing-ms/diagnostic-criteria-workup'], ['MSD 专业版：神经系统 MRI 序列', 'https://www.msdmanuals.com/professional/neurologic-disorders/neurologic-tests-and-procedures/magnetic-resonance-imaging-in-neurologic-disorders']]
  },
  {
    id: 'liver-hemangioma', english: 'Hepatic hemangioma',
    tags: ['外周结节样强化', '向心填充', '动态增强'],
    methods: [
      ['结合肝脏背景', '了解是否有肝硬化或肿瘤病史，并选择合适的增强影像评价。'],
      ['比较多时相', '在动态增强 CT、MRI 或超声中，观察外周不连续结节样强化和后续向心性填充。'],
      ['综合判定典型性', 'MRI 信号与增强模式共同支持血管瘤；不典型病变需进一步评估，不能照搬典型病例结论。']
    ],
    tips: ['按时相观察同一病灶的变化，区分逐渐填充与后期廓清。', '本图是 A–D 多图面板，要整体阅读，保留全部面板。'],
    pitfalls: ['快速充填或硬化性血管瘤可能缺少经典模式。', '不能只凭一幅亮的病灶图诊断，也不能自行推定未标明的序列参数。'],
    recall: '外周结节样强化 → 逐渐向心填充 → 结合背景与信号。',
    limitation: '这是来源提供的多面板静态图，不是可调阅的完整动态 MRI 序列。',
    refs: [['EASL：良性肝肿瘤指南（2016，影像特征）', 'https://easl.eu/wp-content/uploads/2016/10/EASL-CPG-on-Management-of-benign-liver-tumours.pdf']]
  },
  {
    id: 'appendicitis', english: 'Acute appendicitis',
    tags: ['阑尾增粗', '脂肪浸润', '右下腹痛'],
    methods: [
      ['结合症状与查体', '了解疼痛迁移、右下腹压痛及炎症指标，同时考虑其他急腹症。'],
      ['选择检查方法', '成人常使用腹盆腔 CT；儿童或孕妇可优先考虑超声，必要时按情况使用 MRI。'],
      ['完整追踪阑尾', '从盲肠起始处追踪到盲端，结合增粗、壁改变及周围炎症，并检查有无并发症。']
    ],
    tips: ['把阑尾直径与周围脂肪改变一起判断。', '本图约 17 mm 的数字来自原图标注，网页不能重新进行毫米测量。'],
    pitfalls: ['不能仅凭直径阈值确诊阑尾炎。', '没有看到脓肿的一张截图，不能用于排除穿孔或脓肿。'],
    recall: '找全阑尾 → 管壁与管径 → 周围炎症 → 并发症。',
    report: '所示右下腹图像见阑尾增粗伴周围炎性改变，支持急性阑尾炎；并发症需结合完整检查评价。',
    limitation: '单层 CT 不能评价阑尾全程，也不能排除其他腹盆腔病变。',
    refs: [['ACR / RSNA：阑尾炎诊断与评估', 'https://www.radiologyinfo.org/en/info/appendicitis']]
  },
  {
    id: 'colles-fracture', english: 'Distal radius fracture (Colles pattern)',
    tags: ['桡骨远端', '背侧成角', '腕关节正侧位'],
    methods: [
      ['查体与损伤机制', '了解跌倒时受力方式，检查腕部畸形，并评估感觉、血运和皮肤情况。'],
      ['多角度 X 线', '结合腕部正、侧位等投照识别骨折，观察远端骨块移位和成角方向。'],
      ['描述骨折形态', '记录关节面是否受累、桡骨短缩及伴随损伤；复杂骨折按临床需要进一步评价。']
    ],
    tips: ['侧位重点看背侧/掌侧方向，正位检查桡骨远端与尺骨。', '图中两个视角属于同一病例，要配合阅读。'],
    pitfalls: ['Colles 型为背侧移位/成角，Smith 型方向相反。', '不能因为发现桡骨骨折就忽略尺骨茎突和关节面。'],
    recall: '机制 → 两个视角 → 移位方向 → 关节面与伴随损伤。',
    limitation: '截图无可校准像素间距，不在网页中提供精确长度或角度结论。',
    refs: [['AAOS：桡骨远端骨折说明', 'https://orthoinfo.aaos.org/globalassets/pdfs/distal-radius-fractures-cpg_pls.pdf']]
  }
];
