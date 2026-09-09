# 影研社（Image Lab）

一个面向医学生和住院医师的医学影像学习网站原型。无需构建工具，直接打开 `index.html` 即可使用。

## 功能

- 学习首页、课程进度和每日病例
- 按系统筛选与搜索病例
- 病例收藏、收藏夹筛选与随机挑战
- 模拟阅片工作台：调窗、缩放、反相、标注
- 多选诊断题、即时解析与本地进度保存
- 每例独立阅片笔记、完成状态和键盘快捷键
- 桌面、平板和移动端自适应

## 运行

推荐使用本地静态服务器：

```bash
npx serve .
```

浏览器打开命令输出的本地地址即可。

## 开源设计参考

- [OHIF Viewer](https://github.com/OHIF/Viewers)：专业阅片工作台的信息层级与工具组织
- [Cornerstone3D](https://github.com/cornerstonejs/cornerstone3D)：Web 医学影像交互能力与 DICOMweb 扩展方向
- [RadGame](https://github.com/siavashraissi/RadGame)：病例驱动、游戏化反馈的影像教学方式

当前原型使用程序化合成影像占位图，不含患者数据，也不用于临床诊断。生产版本可接入 Cornerstone3D、经过去标识化的 DICOM 教学库、用户认证与后端题库。
