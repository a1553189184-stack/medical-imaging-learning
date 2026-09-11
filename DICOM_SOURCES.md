# DICOM 序列来源

序列阅片试验区使用 NCI Imaging Data Commons（IDC）索引中的 20 个去标识检查。网页不复制这些 DICOM 文件，而是把经过核对的 `StudyInstanceUID` 交给 OHIF Viewer，并通过 IDC 只读 DICOMweb 代理按需加载。

集合名称用于说明数据来源背景，不等同于对检查中每一幅图像的独立诊断。每个集合都必须按照其 DOI 页面、许可和 [IDC/TCIA 数据使用政策](https://www.cancerimagingarchive.net/data-usage-policies-and-restrictions/)引用。

| 系统 | IDC 集合 | 检查数 | 模态 | DOI | 许可 |
| --- | --- | ---: | --- | --- | --- |
| 胸部 | `covid_19_ar` | 2 | CR | [10.7937/tcia.2020.py71-5978](https://doi.org/10.7937/tcia.2020.py71-5978) | CC BY 4.0 |
| 胸部 | `tcga_lusc` | 2 | CT | [10.7937/k9/tcia.2016.tygkkfmq](https://doi.org/10.7937/k9/tcia.2016.tygkkfmq) | CC BY 3.0 |
| 胸部 | `tcga_luad` | 1 | CT | [10.7937/k9/tcia.2016.jgnihep5](https://doi.org/10.7937/k9/tcia.2016.jgnihep5) | CC BY 3.0 |
| 神经 | `icdc_glioma` | 2 | MRI | [10.7937/tcia.svqt-q016](https://doi.org/10.7937/tcia.svqt-q016) | CC BY 4.0 |
| 神经 | `upenn_gbm` | 2 | MRI / SEG | [10.5281/zenodo.8345959](https://doi.org/10.5281/zenodo.8345959) | CC BY 4.0 |
| 神经 | `vestibular_schwannoma_seg` | 1 | MRI / RT | [10.7937/tcia.9ytj-5q73](https://doi.org/10.7937/tcia.9ytj-5q73) | CC BY 4.0 |
| 腹部 | `c4kc_kits` | 2 | CT / SEG | [10.7937/tcia.2019.ix49e8nx](https://doi.org/10.7937/tcia.2019.ix49e8nx) | CC BY 3.0 |
| 腹部 | `tcga_lihc` | 2 | CT / MRI | [10.7937/k9/tcia.2016.immqw8uq](https://doi.org/10.7937/k9/tcia.2016.immqw8uq) | CC BY 3.0 |
| 腹部 | `pancreas_ct` | 1 | CT / SEG | [10.5281/zenodo.12130275](https://doi.org/10.5281/zenodo.12130275) | CC BY 4.0 |
| 骨骼 | `soft_tissue_sarcoma` | 2 | MRI / RTSTRUCT | [10.7937/k9/tcia.2015.7go2gsks](https://doi.org/10.7937/k9/tcia.2015.7go2gsks) | CC BY 3.0 |
| 骨骼 | `spine_mets_ct_seg` | 2 | CT / SEG | [10.7937/kh36-ds04](https://doi.org/10.7937/kh36-ds04) | CC BY 4.0 |
| 骨骼 | `cmb_mml` | 1 | MRI | [10.7937/szkb-sw39](https://doi.org/10.7937/szkb-sw39) | CC BY 4.0 |

逐检查的匿名受试者编号、体积、Study UID 和模态保存在 `dicom-series.js`。发布前可运行 `node scripts/audit-dicom-studies.mjs`，确认 20 个 UID 仍能由 IDC DICOMweb 查询。
