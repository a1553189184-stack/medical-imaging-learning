# 影研社 3D 人体与断层解剖数据

## 三维解剖

- 原始数据：BodyParts3D 4.0，© The Database Center for Life Science，CC BY 4.0。
- 官方数据与许可：https://dbarchive.biosciencedbc.jp/en/bodyparts3d/download.html 、https://dbarchive.biosciencedbc.jp/en/bodyparts3d/lic.html
- 网页几何中间来源：https://github.com/ashemag/human-atlas （模型来源与转换方法见其 `public/ATTRIBUTION.md`）。
- 本站改动：使用 `scripts/build-anatomy-model.mjs` 从开放网页几何数据筛选 655 个结构，重打包位置、法向量与索引；包含前臂、手足小骨、面颅骨、主要血管、脑和头面神经。四肢周围神经网格在该来源中不完整，本站另外沿模型骨性标志手工绘制 14 条**教学示意曲线**（双侧正中、尺、桡、股、坐骨、胫和腓总神经），独立列为“周围神经示意”图层，不能用于精确定位、手术或诊断。成人男性参考模型，不代表所有解剖变异。

## 断层影像

- 来源：3D Slicer SampleData 中的 CTChest、MRHead 和 CTLiver。数据登记及许可说明：https://github.com/Slicer/Slicer/blob/main/Modules/Scripted/SampleData/SampleData.py
- CTChest 源文件 SHA-256：`4507b664690840abb6cb9af2d919377ffc4ef75b167cb6fd0f747befdb12e38e`；139 层，轴位。
- MRHead 源文件 SHA-256：`cc211f0dfd9a05ca3841ce1141b292898b2dd2d3f08286affadf823a7e58df93`；130 层，矢状位。
- CTLiver 源文件 SHA-256：`e16eae0ae6fefa858c5c11e58f0f1bb81834d81b7102e021571056324ef6f37e`；来自 Medical Segmentation Decathlon Task03_Liver 的 `imagesTr/liver_100.nii.gz`，许可 CC BY-SA 4.0，含肝脏病灶。本站输出腹盆部轴位 343 层，每 2 个原始层面取 1 层，相邻本站层面约 1.4 mm。本站改编切片沿用 CC BY-SA 4.0。
- 本站改动：`scripts/build-anatomy-slices.py` 将原始体数据转换为逐层 WebP；胸部 CT 提供软组织窗和肺窗，腹盆部 CT 提供软组织窗和骨窗；MRHead 另重建 256 层横断面。`slices/annotations.json` 只记录人工核对的代表层面点位，未标注的层面不自动推断名称。各数据集与三维人体模型不是同一受检者，也未配准。

## 用户提供的图谱

《人体断层解剖学图谱》《奈特人体神经解剖彩色图谱》《解剖图谱》仅用于学习分区、层面和术语。本站未复制书页、插图或扫描图像。

本模块用于正常解剖教学，不用于临床诊断或测量。
