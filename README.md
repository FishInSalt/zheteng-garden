# 折腾有记

折腾客的个人技术博客。基于 Astro 7 和 AstroPaper 6.1，Markdown / MDX 写作，静态生成，Pagefind 搜索。

- 在线博客：[折腾有记](https://zheteng-garden.pages.dev/)
- 搭建记录：[从零搭建「折腾有记」：Astro 技术博客实践](https://zheteng-garden.pages.dev/posts/building-zheteng-garden/)
- 源码仓库：[FishInSalt/zheteng-garden](https://github.com/FishInSalt/zheteng-garden)（公开）

Cloudflare Pages 已连接此仓库，推送 `main` 会自动发布。当前使用平台提供的域名，尚未绑定自定义域名。

本仓库作为网站发布仓库，只保存愿意公开的文章、代码和资源。`draft: true` 只控制网站是否展示文章，不会隐藏公开仓库中的文件；私人笔记和未准备公开的草稿应保存在仓库之外。

## 本地运行

建议 Node.js 24（见 `.nvmrc`）和 pnpm 11.19.0（见 `package.json`）。

```bash
pnpm install --frozen-lockfile
pnpm dev
```

访问终端显示的本地地址。验证搜索前先构建：

```bash
pnpm build
pnpm preview --host 127.0.0.1 --port 4321
```

构建会运行 Astro 类型检查、生成静态页并建立 Pagefind 索引。开发模式下的搜索索引来自上一次构建，更新文章后需要再次构建。

## 写文章

在 `src/content/posts/` 新建 Markdown 或 MDX 文件。参考已有的 `building-zheteng-garden.md`，填写标题、作者、日期、摘要和标签。`draft: true` 会排除公开输出；未来日期的文章需在到期后重新构建才会发布。

文章的固定链接还与文件所在子目录有关，发布后尽量不要移动文件。专题目录位于 `src/pages/topics/index.astro`，按“博客搭建”和“Coding Agent”标签分别收录文章，并按首次发布时间从早到晚排列。草稿不会出现在专题中。

首篇技术博客：`src/content/posts/building-zheteng-garden.md`。

Coding Agent 系列面向有使用经验、想理解原理的读者，按核心模块解释实现思路，以 imp 源码作为实例。章节按理解依赖排列，通过小场景、带注释的源码、模拟运行和异常处理展开。选题、各章展示清单与写作约定见 [系列规划](docs/coding-agent-series.md)，开篇文章为 `src/content/posts/coding-agent-00-under-the-hood.mdx`。

系列使用 MDX 引用 `src/components/series/` 中的图示与交互演示，章节目录位于 `src/data/coding-agent-series.ts`。文章页采用左侧文章列表、中间正文、右侧目录的布局，适配明暗主题与手机。00、01、02 上下篇、03、04、05、06、07 及 08 已设为正式文章；01 提供四种 Agent 循环的逐步演示，02 下提供四种流式接收场景，并联动高亮完整核心代码，07 提供工具状态、子代理和等待动画三种终端效果演示。这些演示均不调用在线模型或执行命令。目录只链接已发布文章，未发布章节显示为计划。后续草稿在开发模式也会过滤，可用临时副本预览，详见系列规划。

## 改配置

- `astro-paper.config.ts`：名称、署名、介绍、GitHub 地址、分页与功能开关。
- `src/styles/theme.css`：明暗主题色与字体。
- `src/styles/global.css`：页面布局和中文排版。
- `src/content/pages/about.md`：个人介绍。
- `src/i18n/lang/zh-CN.ts`：中文界面文案。

默认站点网址为 `http://localhost:4321`。线上构建按 `SITE_URL`、`CF_PAGES_URL` 的顺序读取网址。环境变量从构建进程读取；`.env.example` 只是变量参考，不是自动生效的配置。

例如在本地验证正式域名的构建（替换成自己的域名）：

```bash
SITE_URL=https://your-domain.example pnpm build
```

## 部署到 Cloudflare Pages

1. 将源码推送到自己的 GitHub 仓库，仓库可以是私有的。
2. Cloudflare → Workers & Pages → 创建 Pages 项目 → 导入 Git 仓库。
3. 生产分支 `main`，根目录为仓库根目录，构建命令 `pnpm build`，输出目录 `dist`。
4. 构建环境指定 `NODE_VERSION=24`、`PNPM_VERSION=11.19.0`，并确认日志中的实际版本。
5. `SITE_URL` 设置为正式网址（包括 `https://`）。首次未设置时可使用 Pages 提供的 `CF_PAGES_URL`；确认生产地址后应明确设置 `SITE_URL`。
6. 部署后检查首页、文章、中文搜索、RSS、Sitemap 和 canonical 地址。
7. 如有域名，在 Custom domains 中添加并按提示配置 DNS，然后修改 `SITE_URL` 并重新部署。

使用 Pages 的 Git 集成自动部署；`.github/workflows/ci.yml` 只负责校验构建，不是部署工作流。纯静态模式无需 Cloudflare SSR 适配器。

## 访问统计

在 Pages 项目的 Metrics → Web Analytics 中启用，再部署一次。Cloudflare 会自动注入统计脚本。代码里没有手动植入 token，避免自动注入与手动脚本重复计数。

本站已在 Pages 后台启用 Web Analytics。查看数据：Cloudflare → Workers & Pages → `zheteng-garden` → Metrics → View Web Analytics。

启用后请实际检查统计后台是否收到访问数据。统计依赖浏览器上报，不等同于完整的服务器访问日志。

## Git 和文件

需要提交源码、Markdown、`pnpm-lock.yaml`；`node_modules/`、`dist/`、`.astro/`、生成的搜索索引和本地环境文件已忽略。

使用了自定义 pnpm store 时，后续安装和执行命令应保持相同的 store 配置；也可以用 `npm run build` 执行现有依赖中的构建脚本，无需改用 npm 安装依赖。

## 依赖维护

上线时已将 Astro 更新到 7.3.2，并更新兼容范围内的依赖。`pnpm-workspace.yaml` 中将旧版 `@astrojs/internal-helpers@0.10.0` 定向覆盖到 0.10.4，修复可选依赖链中的 YAML/TOML 解析器告警；上游修复依赖声明后可移除此覆盖。升级后运行 `pnpm audit` 和 `pnpm build`，再检查文章与搜索。

## 来源与许可证

基于 [AstroPaper](https://github.com/satnaing/astro-paper)，上游基线提交 `35cfa7fbe0b897306d27670d3819e55d5205f3dd`。保留了上游 MIT 许可证。主要定制包括中文界面、品牌与阅读排版、专题目录、文章目录、无外部字体依赖，以及博客搭建文章。

`LICENSE` 适用于代码及主题。`src/content/` 中本次新增文章与个人介绍的著作权归作者所有。
