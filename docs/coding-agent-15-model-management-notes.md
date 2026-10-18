# 第 15 篇：模型管理核对记录

本文档保存实现依据与验证结果，不进入网站正文；本文件随文章源码公开。

## 范围与基线

- 定稿与发布日期：2026-10-18。标题《模型管理——多家大模型提供商的配置与切换》，沿用既有 postId，发布时设为 `draft: false`。
- 初次源码核对基线：Ink 0.4.0，`f00d480539030105bd8890e7b33cec34c4875db1`；后续局部核对基线：`76d65cd067e0825700638c3fc42ab3cc853d17a2`。本次发布前只读确认源码工作区干净，没有修改 Ink。
- 用户主线为 `/login` 保存各分组凭据、`/model` 选择和切换、应用接入配置、适配能力差异，再区分重启后新建与恢复会话的选择；公司网关为扩展，末节总结收束。
- OpenAI ChatGPT 入口与 DeepSeek API 入口为贯穿示例。模型 ID 数组明确为教学示意，不是实时查询记录；凭据存在、候选列出及缓存能力信息都不能证明当前账号有权限或真实请求成功。
- 第 02 篇保留消息转换与流式解析原理，第 04、05、08、13 篇分别衔接压缩、会话、信任与图片处理；本文不重讲这些实现。
- 静态图示只依赖已跟踪的 `series-visual.css`，无外部资源或在线模型调用。

## 实现依据与边界

以下路径相对于 Ink 仓库；执行代码优先于过时的文件注释。

| 文章结论 | 实现入口 | 条件与边界 |
| --- | --- | --- |
| 分组指定登录方式，凭据可共存 | `provider/login-targets.ts:LOGIN_TARGETS`、`auth-store.ts:saveApiKey/readCompat`、`codex-auth.ts` | OAuth 与 API Key 分开保存；新增 Key 合并既有对象，未验证远端权限 |
| API Key 优先读取保存值，再读取环境变量 | `provider/auth-store.ts:resolveApiKey` | 按分组读取；环境变量不会覆盖同分组已保存的 Key |
| 模型选择器先筛选分组，再汇集候选并交出完整引用 | `repl/commands.ts:buildModelList/switchModel`、`provider/discover.ts:familyConfigured/discoverModels` | 列表查询与实际调用分开；自定义地址查询失败不补入官方候选，当前引用保留，仍可直接指定 ID |
| 模型列表与能力信息有不同读取用途 | `provider/discover.ts`、`catalog.ts:catalogEntryFor/catalogModelIds` | ChatGPT 入口从 pi 目录取候选；其他示例入口查询模型列表 API；教学数组非完整清单 |
| 完整模型引用解析为分组和模型 ID，选择接入实现 | `provider/resolve.ts:parseModelRef/createProviderFor`、`runner.ts:prepareModel` | 同分组复用对象，跨分组创建；创建接入对象不等于发送请求 |
| DeepSeek 复用 Chat Completions，认证配置仍属于自己的分组 | `provider/deepseek.ts`、`openai-completions.ts:createOpenAICompletionsProvider` | API Key 与地址在创建时读取；ChatGPT 接入实现于请求前读取或刷新 OAuth |
| 切换先准备、按条件持久化，再更新当前配置 | `runner.ts:setModel/applyModel`、`session/store.ts:setModel` | 先保存接入分组和模型 ID；写入失败不执行后续 apply；更新配置不清空对话历史 |
| 正在执行的一轮继续使用已捕获配置 | `runner.ts:runTurn/runTurnOrRecoverFromOverflow/runTurnInner` | 主执行启动时捕获模型、接入对象与压缩设置；本轮自动压缩沿用捕获值，下一次主执行使用新配置 |
| 能力差异影响图片、思考控制与压缩阈值 | `provider/vision.ts`、`thinking.ts`、`models.ts`、`compaction-settings.ts` | 缺记录时各模块分别后备；换小窗口不会立即缩短历史，摘要请求仍可能超限 |
| 能力目录启动加载，并在需要时异步检查更新 | `provider/catalog.ts:loadCatalogCache/refreshCatalog`、`cli.ts`、`repl/commands.ts` | 无每四小时轮询；不等待远程更新完成；临时网络失败保留旧记录，404/501 的无目录路径另有处理 |
| 新建与恢复会话的模型选择不同 | `cli.ts:requestedModel/parseArgs`、`runner.ts:restoreModelFromSession/newSession` | 新建来源为 `-m`、`INK_MODEL`、已信任项目、全局、内置值；恢复时显式 `-m` 优先于保存的选择，环境变量与默认值不覆盖已有记录；运行中 `/new` 沿用当前模型 |
| 网关可复用兼容接入实现，但不是独立命名分组 | `provider/openai-completions.ts`、`resolve.ts`、`repl/commands.ts:buildModelList`、`catalog.ts` | 基地址追加调用路径；同分组共享地址与凭据，模型 ID 原样作为请求 model；能力信息不按网关地址区分 |

## 发布与验证范围

- 从最新远端 `main` 的 `bd2c57bd399893268e4c66224b5d48e85c284fb5` 建立独立发布工作区，只纳入本篇正文、图示、核对记录、目录与 README 共 6 个文件。
- 用户确认的正文与静态图示逐字保留，仅修改正式发布时间、修改时间及草稿状态。
- 本轮检查针对文章格式、站点构建、导航、链接、搜索与显示，不重跑 Ink 模拟测试，不读取真实凭据，不执行真实模型任务。


## 发布前验证（2026-10-18）

- 全仓 `npm run lint`、`npm run format:check` 与正式 `SITE_URL` 下的 `npm run build` 通过；Astro 为 0 errors、0 warnings、1 个既有 Props 提示，Pagefind 索引 20 篇文章。
- 本页 55 个站内目标与锚点有效；canonical 为正式文章 URL，首页、文章列表、专题、Coding Agent 标签、RSS 与站点地图均收录本篇。
- 应用内浏览器检查 1600、1280、390、320 像素宽度：八个主节和图示三个步骤完整，整页无横向溢出，宽表区域独立滚动。临时视口覆盖已重置。
- 正式构建的站内搜索检索“模型管理”，命中本篇标题、正文片段和小节链接。
- 独立发布范围复核通过：正文仅正式元信息改变，图示逐字保留；README、系列目录与规划只有本篇变化；精简笔记没有真实凭据、账号标识或本机绝对路径。
