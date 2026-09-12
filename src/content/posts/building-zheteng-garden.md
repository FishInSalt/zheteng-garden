---
author: 折腾怪
pubDatetime: 2026-09-12T12:00:00.000Z
title: 从零搭建「折腾花园」：Astro 技术博客实践
slug: building-zheteng-garden
featured: true
draft: false
tags:
  - 博客搭建
  - Astro
  - Markdown
  - Cloudflare
description: 从 AstroPaper 开始，完成中文适配、文章与专题、静态搜索、Cloudflare 自动部署和访问统计，把搭建博客的过程变成第一篇学习笔记。
---

我想要一个地方，记录平时学到的知识：一次排查问题的过程、一段值得保留的代码，以及对某个技术选择的理解。于是有了「折腾花园」。

这篇文章记录本站从本地开发到公网发布的完整过程，包括中文适配、Markdown 写作、全文搜索、GitHub 自动部署和访问统计。网站已经部署到 [zheteng-garden.pages.dev](https://zheteng-garden.pages.dev/)，使用 Cloudflare Pages 提供的域名，不需要租用云服务器。

## 先决定博客要解决什么问题

第一版围绕两个动作设计：方便写，方便找。

- 写作使用 Markdown，沿用本地编辑器和 Git。
- 文章按发布时间排列，用标签和全文搜索查找。
- 有关联的文章整理成专题目录。
- 保留代码高亮、代码复制、文章目录和 RSS。
- 生成静态页面，通过托管平台发布。

网站不需要登录后才能阅读。文章也是在构建时生成的，因此这部分不需要长期运行的 Node.js 服务或数据库。

综合前面的选型，采用 **Astro + AstroPaper + GitHub + Cloudflare Pages**。AstroPaper 提供博客的基础能力，本站在此基础上调整中文界面、排版和内容组织。依赖版本以仓库里的 `pnpm-lock.yaml` 为准。

VitePress 的默认主题适合章节明确的技术文档。我的内容会先以独立文章积累，再慢慢整理成专题，所以选择更便于定制博客布局的 Astro。两者都能静态部署，区别主要在内容组织和默认体验。

## 从 AstroPaper 创建项目

本次使用的主题基线是 AstroPaper 6.1.0，源码提交为 `35cfa7fbe0b897306d27670d3819e55d5205f3dd`。它的依赖清单使用 Astro 7。复现本站时应使用本站仓库的锁文件，不要将其他 Astro 大版本教程里的配置直接照搬。

主题要求 Node.js 至少为 22.12.0；本站用 `.nvmrc` 指定 Node.js 24，并在 `package.json` 里声明 pnpm 11.19.0。

新建自己的同类项目，可以从主题开始：

```bash
# 这是从上游主题开始的初始化方式
pnpm create astro@latest --template satnaing/astro-paper
```

如果使用已经完成定制的本站源码，只需要在项目目录执行：

```bash
pnpm install --frozen-lockfile
pnpm dev
```

`--frozen-lockfile` 会按锁文件安装依赖。这样本地和构建平台更容易使用一致的依赖版本。

项目中最常改动的文件是：

```text
astro-paper.config.ts         # 名称、作者、网址、功能开关
astro.config.ts               # Astro、语言、Markdown 配置
src/content/posts/           # 技术文章
src/content/pages/about.md   # 关于页面
src/pages/topics/index.astro # 专题目录
src/i18n/lang/zh-CN.ts        # 中文界面文案
src/styles/theme.css         # 明暗主题颜色与字体
src/styles/global.css        # 布局和阅读样式
```

## 完成中文界面和阅读排版

第一步是把博客名称设为「折腾花园」，作者设为「折腾怪」，语言使用 `zh-CN`，时区使用 `Asia/Shanghai`。

本站将主要配置集中在 `astro-paper.config.ts`。下面是其中的关键部分：

```ts
const siteUrl =
  process.env.SITE_URL ||
  process.env.CF_PAGES_URL ||
  "http://localhost:4321";

site: {
  url: siteUrl,
  title: "折腾花园",
  author: "折腾怪",
  lang: "zh-CN",
  timezone: "Asia/Shanghai",
}
```

这里的环境变量从构建进程读取。部署时在 Cloudflare 的项目设置中填写 `SITE_URL`；本地要验证某个线上地址，可以在构建命令前显式设置它。仅把变量写进一个未加载的文件，并不会让 `process.env` 自动获得这个值。

还需要同步修改 `astro.config.ts` 的语言配置，并增加中文翻译文件。仅改变 HTML 的 `lang`，不会自动把菜单、分页、搜索按钮变成中文。

排版上，正文使用系统中文无衬线字体，代码使用等宽字体。本站移除了主题的远程 Google 字体配置，以及依赖该字体的默认动态分享图路由。这样构建与阅读都不依赖额外的字体请求。后续需要分享封面时，可以再加入自己的图片。

颜色使用蓝灰底色与蓝色链接，明暗主题分别配置。正文限制行宽、增加中文行高；文章标题、代码块、表格和导航都要检查手机上的表现。代码块内部横向滚动是允许的，整个页面被代码撑宽则需要修正。

## 用 Markdown 写第一篇文章

文章放在 `src/content/posts/` 下，每篇文章有一段 frontmatter 和正文。例如：

```yaml
---
author: 折腾怪
pubDatetime: 2026-09-12T12:00:00.000Z
title: 一次值得记录的学习
slug: a-learning-note
featured: false
draft: false
tags:
  - 学习笔记
description: 用一句话说明这篇文章解决了什么问题。
---
```

日期使用 ISO 8601 格式，这里的 `Z` 表示 UTC，页面会按上海时区显示。标题和摘要用于文章列表与搜索结果，`draft: true` 的文章会被过滤，不进入公开文章列表、RSS 和搜索索引。

本站主题也会过滤发布时间尚未到来的文章。由于页面是静态生成的，**到了预定时间还需要重新构建**，文章才会出现在站点中。

正文建议围绕四件事展开：

1. 当时遇到了什么问题。
2. 为什么选择这个方法。
3. 可以复现的操作或代码。
4. 结果、边界和后续改进。

固定链接一旦对外分享，就尽量保持稳定。本站的路由还会使用文章所在子目录，因此发布后不要随意移动文章文件；确实要改路径时，补上重定向。

## 让内容可以被找到

首页按时间展示真实文章数量，不放虚构的阅读量。文章页包含作者、发布日期、可折叠目录和代码复制按钮。

专题目前采用简单的目录页：筛选含有「博客搭建」标签的文章，集中显示到「个人博客搭建」专题。这样第一篇内容就有明确归属，也保留了以后扩展更多专题的空间。

全文搜索沿用主题的 **Pagefind**。它在构建后读取生成的 HTML，创建浏览器可加载的搜索索引，不需要单独运行搜索服务器。

本站的构建顺序是：

```text
Astro 类型检查
    ↓
Astro 生成静态页面
    ↓
Pagefind 建立索引
    ↓
将索引复制到本地开发可读取的位置
```

对应命令是：

```bash
pnpm build
pnpm preview --host 127.0.0.1 --port 4321
```

要验证搜索，应先运行一次完整构建，再打开预览。只启动开发服务器不能证明最新文章已经进入搜索索引；修改正文后也需要重新构建索引。

RSS 输出到 `/rss.xml`，Sitemap 输出到 `/sitemap-index.xml`。它们与页面的 canonical 地址都依赖站点网址，因此正式发布前必须设置正确的 `SITE_URL`。

## 连接 GitHub 和 Cloudflare Pages

本站使用私有 GitHub 仓库 `FishInSalt/zheteng-garden` 保存源码，Cloudflare Pages 项目名为 `zheteng-garden`。GitHub 的 `main` 分支连接到生产环境，推送提交后会自动构建发布。

先将项目保存到 GitHub。源码仓库可以保持私有，网站页面仍可以公开访问。仓库中应保留文章、源码和锁文件，不提交 `node_modules`、`dist`、本地环境文件和访问令牌。

在 Cloudflare 的 Workers & Pages 中创建 **Pages** 项目，选择导入 Git 仓库，再选择这个博客仓库。只授予该仓库所需的访问权限。

构建配置如下：

| 配置项         | 值                                 |
| -------------- | ---------------------------------- |
| 生产分支       | `main`                             |
| 项目根目录     | 仓库根目录                         |
| 构建命令       | `pnpm build`                       |
| 输出目录       | `dist`                             |
| `NODE_VERSION` | `24`                               |
| `PNPM_VERSION` | `11.19.0`                          |
| `SITE_URL`     | `https://zheteng-garden.pages.dev` |

最后三项填写在 Pages 的构建环境变量中。不同构建镜像的包管理器检测方式可能不同，应以日志为准：本站首次云端构建实际使用 Node.js 24.13.1 和 pnpm 11.19.0，构建与发布均成功。GitHub Actions 也会按 `.nvmrc` 和 `packageManager` 安装环境并运行构建，首次检查已经通过。

Pages 会在推送新提交后构建并发布。本站当前使用平台分配的 `pages.dev` 地址，尚未绑定自定义域名。以后有自己的域名时，可以在项目的 Custom domains 中添加，再按提示完成 DNS 配置。

使用自定义域名后，把生产环境 `SITE_URL` 改成该域名并重新部署。检查文章 canonical、RSS 和 Sitemap 都指向新地址。不要只改浏览器入口，却保留模板作者的网址或本地网址。

纯静态模式不需要添加 Cloudflare SSR 适配器，也不需要运行一个常驻的 Node.js 进程。这里部署的是生成的文件。

## 启用访客统计

第一版选择 Cloudflare Web Analytics，用来了解访问趋势和哪些文章有人阅读。

按照 Cloudflare 的 Pages 文档，在项目的 **Metrics → Web Analytics** 中点击 **Enable**，之后再部署一次。Cloudflare 会在下一次部署时注入统计脚本，仓库无需手工写入统计 token。

本站已经在 Pages 后台开启 Web Analytics，并通过推送本文的部署记录更新触发新的发布，使统计配置生效。日后可以从同一位置进入 **View Web Analytics**，查看页面浏览、访问来源和热门页面等汇总数据。刚启用时，后台可能需要等待一段时间才出现数据。

如果采用这种自动注入方式，就不要同时在布局里粘贴同一套统计脚本，以免重复上报。部署后应在页面和统计后台确认统计已经启用，而不是只看配置开关。

访问统计不等于完整的服务器访问日志。广告拦截、网络请求失败等情况会影响前端统计；它也不适合用来证明某个具体的人访问过网站。如果需要逐次请求的时间、IP、路径和状态码，应另行配置托管平台的日志能力。

## 验证真正会用到的功能

除了成功构建，还应检查这些用户实际会走的路径：

- 首页能打开第一篇文章；文章标题、署名和日期正确。
- 专题和标签能找到这篇文章，没有遗留主题示例内容。
- 搜索中文关键词和 `Astro` 都能找到结果，清空和无结果状态正常。
- 明暗主题可以切换，刷新后仍保留选择。
- 手机导航可展开，长代码与表格不会撑宽整页。
- 目录跳转、代码复制、404 页面、RSS 和 Sitemap 可用。
- 正式部署后，链接、统计脚本和域名都经过实际验证。

这次本地完整构建检查了 55 个文件，Astro 报告没有错误、警告或提示；生成了 13 个 HTML 页面，Pagefind 为首篇文章建立了中文索引。浏览器测试覆盖了中文搜索、无结果状态、主题切换、目录跳转和代码复制，也检查了 390 像素宽手机视图。GitHub 上的构建检查通过后，Cloudflare 完成了首次生产部署。

源文件里保留了主题的 MIT 许可证，项目说明也记录了上游来源。部署所需的账号授权、域名和环境变量与文章内容分开管理，方便以后迁移。

## 后续怎么写下去

日常流程可以保持为：写 Markdown，本地预览，提交 Git，再由平台发布。

修改站点样式和升级依赖可以集中处理，普通写作只需新增文章。有几篇彼此相关的内容时，再回到专题目录进行整理。

「折腾花园」的第一篇文章就写自己的搭建过程。以后每解决一个值得记住的问题，就给这里多添一篇。

## 参考资料

- [AstroPaper 源码与说明](https://github.com/satnaing/astro-paper)
- [Astro 内容集合](https://docs.astro.build/en/guides/content-collections/)
- [Astro 部署到 Cloudflare](https://docs.astro.build/en/guides/deploy/cloudflare/)
- [Cloudflare Pages：启用 Web Analytics](https://developers.cloudflare.com/pages/how-to/web-analytics/)
- [Pagefind 文档](https://pagefind.app/docs/)
