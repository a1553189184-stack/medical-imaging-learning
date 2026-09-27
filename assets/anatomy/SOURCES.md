# 影研社 3D 人体与断层解剖数据

## 三维解剖

- 原始数据：BodyParts3D 4.0，© The Database Center for Life Science，CC BY 4.0。
- 官方数据与许可：https://dbarchive.biosciencedbc.jp/en/bodyparts3d/download.html 、https://dbarchive.biosciencedbc.jp/en/bodyparts3d/lic.html
- 网页几何中间来源：https://github.com/ashemag/human-atlas （模型来源与转换方法见其 `public/ATTRIBUTION.md`）。
- 本站改动：使用 `scripts/build-anatomy-model.mjs` 从开放网页几何数据筛选 129 个结构，重打包位置、法向量与索引；新增中文检索、系统显隐、选中聚焦与影像学习界面。成人男性参考模型，不代表所有解剖变异。

## 断层影像

- 来源：3D Slicer SampleData 中的 CTChest 和 MRHead。数据登记代码：https://github.com/Slicer/Slicer/blob/main/Modules/Scripted/SampleData/SampleData.py
- CTChest 源文件 SHA-256：`4507b664690840abb6cb9af2d919377ffc4ef75b167cb6fd0f747befdb12e38e`；139 层，轴位。
- MRHead 源文件 SHA-256：`cc211f0dfd9a05ca3841ce1141b292898b2dd2d3f08286affadf823a7e58df93`；130 层，矢状位。
- 本站改动：`scripts/build-anatomy-slices.py` 将原始体数据转换为逐层 WebP，CT 提供软组织窗和肺窗。层面顺序与原始 NRRD 第三轴一致。与三维人体模型不是同一受检者，也未配准。

## 用户提供的图谱

《人体断层解剖学图谱》《奈特人体神经解剖彩色图谱》《解剖图谱》仅用于学习分区、层面和术语。本站未复制书页、插图或扫描图像。

本模块用于正常解剖教学，不用于临床诊断或测量。
