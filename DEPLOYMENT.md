# 生产部署与搜索收录

## 当前公开站点

GitHub Pages 仍在 `https://a1553189184-stack.github.io/medical-imaging-learning/` 提供公开访问。项目新增 `robots.txt`、`sitemap.xml`、canonical URL 和结构化数据，搜索引擎可以发现和抓取首页。收录不是即时动作，也无法由网站代码保证排名。

## 升级为动态 Web 应用

仓库已提供 Vercel Serverless Functions：

- `/api/health`：不缓存的运行状态；
- `/api/site-status`：当前部署 URL、站点地图与运行时间。

在 Vercel 导入 GitHub 仓库 `a1553189184-stack/medical-imaging-learning`，选择 Production 部署。不要设置构建命令；根目录的 `index.html` 会作为前端入口，`api/*.js` 自动作为 Node Serverless Functions 部署。

部署生成的 `https://<project>.vercel.app` 可以立即用于 API 验收。生产正式域名建议绑定自己的域名，例如 `www.yingyanshe.cn`；绑定后：

1. 在 Vercel 按提示添加 DNS 记录。
2. 把 `index.html`、`robots.txt`、`sitemap.xml` 和 `PUBLIC_SITE_URL` 中的 GitHub Pages 地址统一替换为正式 HTTPS 域名。
3. 在 Supabase Auth 的 Site URL / Redirect URLs 中加入正式域名及 `/**`。
4. 在 Google Search Console 与 Bing Webmaster Tools 通过 DNS 验证域名并提交 `https://<正式域名>/sitemap.xml`。

Google 可从 Search Console 的 URL Inspection 请求抓取首页；Bing 可从 Webmaster Tools 提交同一 sitemap。两者何时收录、显示何种标题或排名由其抓取和质量系统决定，不能承诺具体时间。

## 认证与用户数据

Vercel 负责动态 API 运行；Supabase 负责认证和经 RLS 保护的用户学习记录。按 [AUTH_SETUP.md](AUTH_SETUP.md) 配置 Supabase。只把 Supabase publishable/anon key 放在 `auth-config.js`；`service_role` key 仅能保存为 Vercel/Supabase 的服务器端环境变量，不能进入 Git 仓库或浏览器。
