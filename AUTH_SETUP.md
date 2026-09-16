# 影研社账户系统配置

网站已集成 Supabase Auth。认证由 Supabase 处理，网页不保存密码；GitHub Pages 只部署公开的项目 URL 与 publishable/anon key。不要把 `service_role` key、GitHub Client Secret 或任何私钥提交到仓库。

## 1. 创建认证项目

1. 在 [Supabase](https://supabase.com/dashboard) 创建一个项目。
2. 打开 **Connect**，复制项目 URL 与 `sb_publishable_...`（或兼容的 anon）浏览器公钥。
3. 编辑根目录 `auth-config.js`，填写这两个公开值。保持 `cloudBackupEnabled: false` 可只启用登录，不上传学习记录。
4. 提交并推送该文件。浏览器公钥可公开；权限安全来自 RLS，绝不可使用 `service_role` key。

## 2. 配置重定向与登录方式

在 **Authentication → URL Configuration** 设置：

- Site URL：`https://yingyan-image-lab.vercel.app/`
- Redirect URLs：`https://yingyan-image-lab.vercel.app/**`
- 本地测试另加：`http://127.0.0.1:4173/**`

在 **Authentication → Providers** 启用 Email。页面采用邮件登录链接，不收集或存储密码。

若启用 GitHub，在 GitHub 注册 OAuth App：

- Homepage URL：`https://yingyan-image-lab.vercel.app/`
- Authorization callback URL：`https://<你的-project-ref>.supabase.co/auth/v1/callback`

将 GitHub OAuth App 的 Client ID 和 Client Secret 仅填入 Supabase 的 GitHub provider 设置。不要填写到 `auth-config.js`。确认 GitHub provider 已启用后，再将 `auth-config.js` 的 `githubProviderEnabled` 改为 `true` 并重新部署。

## 3. 可选：跨设备学习记录

登录本身不自动上传原有学习记录。若希望让学习者主动“同步本机学习记录”和“恢复云端备份”，在 Supabase SQL Editor 执行 [learning-backups.sql](supabase/learning-backups.sql)，再把 `auth-config.js` 的 `cloudBackupEnabled` 改为 `true`。

该表启用 Row Level Security：匿名访客无访问权限，已登录用户仅能读取和写入 `user_id = auth.uid()` 的一行备份。备份可能包含学习笔记，因此页面提示用户不要写入患者可识别信息。传输使用 HTTPS；如需端到端加密、团队共享或医疗机构合规评估，应另行设计后端密钥管理与数据治理。

## 验收

1. 无配置时，页面显示“访客模式 · 本机保存”，登录弹窗说明服务尚未配置，原有学习功能不受影响。
2. 配置后，用邮箱接收链接登录，刷新页面仍是登录状态。
3. GitHub OAuth 登录回到原页面，账户名显示在顶部和侧栏。
4. 启用云端备份后，用户 A 不能读取用户 B 的 `learning_backups` 数据；用另一浏览器登录同一账户可手动恢复记录。
