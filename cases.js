const CASES = [
{system:'胸部',modality:'X-RAY',title:'右侧气胸',history:'67 岁男性，突发呼吸困难、胸痛，血压下降。',image:'assets/images/pneumothorax.png',level:'入门',answer:1,options:['右肺大疱','右侧气胸','右侧胸腔积液','右肺不张'],explain:'右侧胸膜腔透亮、胸膜线外肺纹理消失，右肺受压萎陷，支持气胸。教学情境中的血压下降提示需紧急评估张力性生理改变，但不能只凭胸片确定。',findings:['右侧脏层胸膜线可见，线外肺纹理消失','右肺明显受压萎陷','同时观察纵隔位置与受压情况，结合临床评估'],differential:'肺大疱可见薄壁，应结合位置和肺纹理判断；皮肤皱褶线外仍可见肺纹理。',pearl:'张力性气胸是临床诊断。患者不稳定时不应等待影像检查才减压。',report:'右侧气胸，右肺受压萎陷。若伴呼吸或循环不稳定，应立即由临床评估张力性气胸并处理。',source:'Wikimedia Commons · Hellerhoff',license:'CC BY-SA 3.0',sourceUrl:'https://commons.wikimedia.org/wiki/File:09-01-Pneumothorax.png'},
{system:'胸部',modality:'X-RAY',title:'心源性肺水肿',history:'76 岁男性，夜间阵发性呼吸困难，双下肢水肿。',image:'assets/images/pulmonary-edema.jpg',level:'入门',answer:0,options:['心源性肺水肿','双肺多灶感染','肺纤维化','气胸'],explain:'双肺弥漫性间质及肺泡性阴影、心影增大和左侧胸腔积液支持心源性肺水肿。',findings:['双肺弥漫性模糊肺泡及间质性阴影','心影增大','左侧肋膈角变钝，提示胸腔积液'],differential:'ARDS 通常心影不大；感染多呈局灶或不对称分布，需结合发热和炎症指标。',pearl:'判断肺水肿应同时观察心影、肺血流分布、间隔线和胸腔积液。',report:'双肺间质及肺泡性水肿，伴心影增大及左侧胸腔积液，符合充血性心力衰竭表现。',source:'Wikimedia Commons · Frank Gaillard',license:'CC BY-SA 3.0',sourceUrl:'https://commons.wikimedia.org/wiki/File:Pulmonary_oedema.jpg'},
{system:'胸部',modality:'CTPA',title:'急性肺动脉栓塞',history:'54 岁女性，术后第 5 天突发胸闷、心动过速，D-二聚体升高。',image:'assets/images/pulmonary-embolism.jpg',level:'中级',answer:2,options:['主动脉夹层','肺炎','急性肺动脉栓塞','心包积液'],explain:'双侧肺动脉内可见被对比剂包绕的低密度充盈缺损，为急性肺栓塞直接征象。',findings:['主肺动脉分叉及双侧肺动脉内充盈缺损','部分血栓周围可见对比剂环绕','需继续评估右心室大小及室间隔形态'],differential:'流动伪影边缘较模糊，常见于上腔静脉邻近；慢性血栓多偏心并与血管壁成钝角。',pearl:'发现血栓后必须继续评估右心负荷和肺梗死，以支持风险分层。',report:'双侧肺动脉急性栓塞，累及主肺动脉分叉。建议结合右心功能和生物标志物进行风险分层。',source:'Wikimedia Commons · Rvahudson',license:'CC BY-SA 4.0',sourceUrl:'https://commons.wikimedia.org/wiki/File:CTA_Chest_With_Massive_Pulmonary_Embolism_and_Complete_Occlusion.jpg'},
{system:'胸部',modality:'CT',title:'左下叶空洞性肺癌',history:'69 岁女性，咳嗽、体重下降，既往长期吸烟。',image:'assets/images/lung-cancer.png',level:'中级',answer:3,options:['肺脓肿','肺结核','肺隔离症','空洞性肺癌'],explain:'左下叶见厚壁不规则空洞性肿块，壁结节样增厚，恶性可能性高。',findings:['左下叶近肺门区软组织肿块','病灶内空洞形成，壁厚且不规则','邻近支气管受累'],differential:'肺脓肿常见液平和急性感染症状；结核空洞常位于上叶并伴卫星灶或树芽征。',pearl:'空洞壁越厚且越不规则，恶性风险越高，但最终仍需组织学确诊。',report:'左下叶空洞性肿块，影像高度怀疑原发性肺癌。建议增强 CT、分期检查及组织学取样。',source:'Wikimedia Commons · Jmarchn',license:'CC0',sourceUrl:'https://commons.wikimedia.org/wiki/File:CT_scan_of_lung_cancer_with_cavitation.png'},
{system:'神经',modality:'CT',title:'左侧基底节区脑出血',history:'62 岁男性，高血压病史，突发右侧肢体无力、失语。',image:'assets/images/basal-ganglia-hemorrhage.png',level:'入门',answer:2,options:['脑膜瘤','大脑中动脉梗死','左侧基底节区脑出血','硬膜下血肿'],explain:'左侧基底节区见高密度血肿并有周围水肿和占位效应。',findings:['左侧基底节区不规则高密度血肿','周围可见低密度水肿带','左侧侧脑室受压，正中结构右移'],differential:'钙化通常边界清楚且无水肿；出血性肿瘤常位置不典型并伴不成比例的水肿。',pearl:'描述脑出血要依次交代部位、大小、脑室破入、占位效应和脑疝征象。',report:'左侧基底节区急性脑出血，伴明显占位效应及轻度中线右移。',source:'Wikimedia Commons · Dahlqvist 等',license:'CC BY 2.0',sourceUrl:'https://commons.wikimedia.org/wiki/File:CT_Scan_BGH.png'},
{system:'神经',modality:'CT',title:'急性硬膜外血肿',history:'19 岁男性，车祸后短暂清醒，随后意识水平下降。',image:'assets/images/epidural-hematoma.jpg',level:'入门',answer:0,options:['硬膜外血肿','硬膜下血肿','蛛网膜下腔出血','脑梗死'],explain:'左侧颞顶部双凸透镜形高密度影伴明显占位效应，符合硬膜外血肿。',findings:['左侧颞顶部双凸透镜形高密度影','血肿边界受颅缝限制','左侧侧脑室受压并伴中线右移'],differential:'硬膜下血肿通常呈新月形，可跨颅缝，但受硬膜反折限制。',pearl:'硬膜外血肿可快速扩大；显著占位效应和临床恶化需紧急神经外科处理。',report:'左侧急性硬膜外血肿，伴明显占位效应及中线右移。建议神经外科紧急会诊。',source:'Wikimedia Commons · James Heilman, MD',license:'CC BY-SA 4.0',sourceUrl:'https://commons.wikimedia.org/wiki/File:EpiduralHematoma.jpg'},
{system:'神经',modality:'MRI',title:'多发性硬化斑块',history:'31 岁女性，反复视力下降与肢体麻木，本次症状加重。',image:'assets/images/multiple-sclerosis.jpg',level:'进阶',answer:3,options:['脑小血管病','脑转移瘤','偏头痛相关灶','多发性硬化'],explain:'DIR 轴位图像显示多发皮质旁及皮质病灶，分布支持脱髓鞘病变。',findings:['双侧大脑半球多发皮质旁高信号病灶','部分病灶累及皮质','病灶空间分布符合炎性脱髓鞘过程'],differential:'小血管病多位于深部白质，较少累及胼胝体下缘和皮质；转移瘤常伴显著水肿及强化。',pearl:'多发性硬化诊断核心是时间和空间多发，单张影像不能独立完成诊断。',report:'幕上多发皮质及皮质旁脱髓鞘样病灶，结合临床考虑多发性硬化；建议完整序列及增强评估活动性。',source:'Wikimedia Commons · Favaretto 等',license:'CC BY 4.0',sourceUrl:'https://commons.wikimedia.org/wiki/File:Axial_DIR_MRI_of_a_brain_with_multiple_sclerosis_lesions.jpg'},
{system:'腹部',modality:'MRI',title:'肝海绵状血管瘤',history:'48 岁女性，体检发现肝右叶占位，无肝炎病史。',image:'assets/images/liver-hemangioma.jpg',level:'中级',answer:0,options:['肝血管瘤','肝细胞癌','肝脓肿','肝转移瘤'],explain:'动态增强序列显示外周结节样强化并逐渐向中心填充，符合肝血管瘤。',findings:['边界清楚的肝内占位','早期外周不连续结节样强化','后期逐渐向心性填充'],differential:'HCC 常表现动脉期整体强化及后期廓清；转移瘤一般不呈典型血池样渐进填充。',pearl:'观察强化随时间变化的模式，比只看某一个时相更重要。',report:'肝内病灶呈典型渐进性向心填充，符合海绵状血管瘤。',source:'Wikimedia Commons · Nils Albiin',license:'CC BY 2.5',sourceUrl:'https://commons.wikimedia.org/wiki/File:Angioma_epatico-RM.jpg'},
{system:'腹部',modality:'CT',title:'急性阑尾炎',history:'27 岁男性，转移性右下腹痛伴恶心 12 小时。',image:'assets/images/appendicitis.jpg',level:'入门',answer:1,options:['盲肠憩室炎','急性阑尾炎','末端回肠炎','输尿管结石'],explain:'右下腹阑尾明显增粗，测量约 17 mm，并伴周围炎性改变。',findings:['阑尾直径明显增大，约 17 mm','阑尾壁增厚','阑尾周围脂肪间隙模糊'],differential:'盲肠憩室炎的炎症中心位于憩室；末端回肠炎表现为较长节段肠壁增厚。',pearl:'阑尾直径大于 6 mm 不能单独诊断，必须结合壁改变和周围炎症。',report:'CT 表现符合急性阑尾炎，未见明确脓肿或游离气体。',source:'Wikimedia Commons · James Heilman, MD',license:'CC BY-SA 3.0',sourceUrl:'https://commons.wikimedia.org/wiki/File:CAT_scan_demonstrating_acute_appendicitis.jpg'},
{system:'骨骼',modality:'X-RAY',title:'桡骨远端 Colles 骨折',history:'71 岁女性，跌倒后手掌撑地，腕部肿痛畸形。',image:'assets/images/colles-fracture.jpg',level:'入门',answer:3,options:['舟骨骨折','月骨脱位','Smith 骨折','Colles 骨折'],explain:'桡骨远端骨折伴远端骨块向背侧移位和成角，符合 Colles 骨折。',findings:['桡骨远端干骺端骨折','远端骨块背侧移位及背侧成角','可见桡骨高度下降'],differential:'Smith 骨折的远端骨块向掌侧移位；Barton 骨折累及关节面并伴腕骨脱位。',pearl:'报告应描述关节面受累、移位方向、桡骨高度和倾斜角。',report:'左侧桡骨远端 Colles 型骨折，伴背侧成角及轻度短缩。',source:'Wikimedia Commons · Lucien Monfils',license:'CC BY-SA 3.0',sourceUrl:'https://commons.wikimedia.org/wiki/File:Collesfracture.jpg'}
];

// Append new cases to preserve older bookmarks, URLs, notes and first-attempt scores.
CASES.push(
  {
    system:'胸部', modality:'X-RAY', title:'左侧胸腔积液', level:'入门',
    history:'成人，逐渐出现活动后气短，查体发现左下胸叩诊浊音。',
    image:'assets/images/pleural-effusion.png', answer:2,
    options:['左侧气胸','左上叶肺不张','左侧胸腔积液','双肺肺水肿'],
    findings:['左侧中下胸部均匀致密影','左侧肋膈角及膈面显示不清','液体上缘呈外高内低的弧形轮廓'],
    explain:'立位胸片显示左侧下胸部均匀增白和弧形上缘，支持胸腔积液。原图圆圈标出主要异常区域。',
    differential:'肺实变主要位于肺内，可有含气支气管；肺不张常伴容积减小。胸膜增厚也可使肋膈角变钝，超声有助区分。',
    pearl:'确认“有液体”和判断“为什么有液体”是两个不同问题。',
    report:'左侧胸腔积液影。建议结合胸部超声和临床资料评估积液范围及病因。',
    source:'Wikimedia Commons · James Heilman, MD', license:'CC BY-SA 3.0',
    sourceUrl:'https://commons.wikimedia.org/wiki/File:Effusionhalf.PNG'
  },
  {
    system:'胸部', modality:'X-RAY', title:'右肺中叶肺炎', level:'入门',
    history:'成人，发热、咳嗽伴咳痰，胸片发现右侧肺野局灶性阴影。',
    image:'assets/images/lobar-pneumonia.jpg', answer:0,
    options:['右肺中叶肺炎','右侧气胸','双肺弥漫性肺水肿','左侧胸腔积液'],
    findings:['右侧中下肺野局灶性实变影','病灶呈片状，密度高于周围含气肺组织','原始资料将病灶定位于右肺中叶'],
    explain:'胸片所示局灶性实变，结合教学情境中的发热与咳痰，支持肺炎。肺叶定位依据原图说明，不把正位上的“下肺野”直接等同于“下叶”。',
    differential:'肺不张需观察肺容积和叶间裂改变；肿瘤或阻塞后改变也可表现为局灶性阴影，需结合病程和复查。',
    pearl:'影像支持肺炎，但不能只凭一张胸片推断病原菌。',
    report:'右肺局灶性实变，结合临床考虑肺炎；病灶位于右中叶（依据来源资料），建议结合完整检查与病程评价。',
    source:'Wikimedia Commons · Mikael Häggström, MD', license:'CC0',
    sourceUrl:'https://commons.wikimedia.org/wiki/File:X-ray_of_lobar_pneumonia.jpg'
  },
  {
    system:'神经', modality:'CT', title:'左侧硬膜下血肿', level:'中级',
    history:'成人，头部外伤后头痛加重，逐渐出现嗜睡。',
    image:'assets/images/subdural-hematoma.png', answer:1,
    options:['硬膜外血肿','硬膜下血肿','脑内血肿','正常头颅 CT'],
    findings:['左侧额顶颅骨内侧新月形脑外积血','左侧脑实质及侧脑室受压','中线结构向右移位'],
    explain:'原图箭头指向左侧颅骨内侧的脑外血肿，沿大脑表面铺展，伴明显占位效应，符合硬膜下血肿。',
    differential:'硬膜外血肿通常呈双凸透镜形；硬膜下积液的密度更接近脑脊液，仍需结合病史及完整序列鉴别。',
    pearl:'先辨脑内与脑外，再看形态与占位效应；意识恶化不能只当作影像练习题处理。',
    report:'左侧额顶硬膜下血肿，伴脑室受压及中线右移。建议紧急临床与神经外科评估。',
    source:'Wikimedia Commons · James Heilman, MD', license:'CC BY-SA 3.0',
    sourceUrl:'https://commons.wikimedia.org/wiki/File:Subduralandherniation.PNG'
  },
  {
    system:'腹部', modality:'US', title:'肾积水伴皮质变薄', level:'中级',
    history:'成人，反复腰部不适，接受泌尿系统超声检查。',
    image:'assets/images/hydronephrosis.jpg', answer:3,
    options:['单纯肾囊肿','正常肾窦','实性肾肿瘤','肾积水'],
    findings:['肾盂及多个肾盏呈无回声扩张','扩张区域位于集合系统，呈分支样分布','肾皮质变薄，需进一步评价肾实质及功能'],
    explain:'图示集合系统多处无回声扩张并伴皮质变薄，符合肾积水的超声表现。原图测量线标示一个肾盏，不是整个肾脏的长度。',
    differential:'肾旁盂囊肿可模拟积水，需多切面确认是否与集合系统相通；血管需要彩色多普勒辅助识别。',
    pearl:'肾积水是影像表现，并不直接等于结石或已证实的机械性梗阻。',
    report:'所示肾脏集合系统扩张，伴皮质变薄。建议结合完整泌尿系检查、肾功能及临床症状查明原因。',
    source:'Wikimedia Commons · Kristoffer Lindskov Hansen、Michael Bachmann Nielsen、Caroline Ewertsen', license:'CC BY 4.0',
    sourceUrl:'https://commons.wikimedia.org/wiki/File:Ultrasonography_of_hydronephrosis_with_dilated_anechoic_pelvis_and_calyces,_along_with_cortical_atrophy.jpg'
  }
);
