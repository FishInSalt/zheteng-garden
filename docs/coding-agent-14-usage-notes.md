# 第 14 篇：用量统计核对记录

本文档记录定稿的源码依据与验证边界，不作为文章正文。

## 范围与基线

- 定稿核对日期：2026-10-17。
- Ink 基线：`f9d001ce25abcfd4ac94111e424a6012d65b89f0`，包含 `73f38e3` 的会话累计 CH 改动；核对时源码工作区干净。
- 核心问题：怎样从每次模型调用的报告记录和汇总会话消耗，再按产生用量的模型及 Token 类别估算费用？
- 场景：排查登录页未显示密码错误提示。所有 Token 数量、工具内容及费率均为教学数据，不是真实模型日志、厂商报价或账单。
- 文章、交互时间线和来源归属图已经过用户逐节审阅。定稿保留七节，最后两句话收束全文。

## 源码证据

以下路径相对于 Ink 的 `src/`。

| 文章结论 | 源码与符号 | 条件和限制 |
| --- | --- | --- |
| 统一普通输入、输出、缓存读取与写入 | `core/messages.ts` 的 `Usage`；provider 适配器 | 缓存计数可选；数量来自服务报告，不从可见回答长度推算 |
| DeepSeek 复用 Chat Completions，并从完整输入减去缓存命中 | `provider/deepseek.ts`；`provider/openai-completions.ts` | 当前未转换缓存写入；响应内用 `Math.max` 保留较大计数，不把流式片段相加 |
| Anthropic 单独映射缓存创建与读取计数 | `provider/anthropic.ts` | 字段转换不等于请求已配置原生缓存策略 |
| 缺报按可识别数值字段的存在性判断 | provider 的 `sawUsage`／`hasNumericUsage` | 显式零是已知报告；存在部分字段不表示所有类别齐全 |
| 单次报告随模型回复与模型身份保存 | `core/loop.ts` 的 `streamAssistant`／`runAgentLoop`；`runner.ts`；`core/session/store.ts` | 启用会话保存；助手消息先保存，再执行该消息请求的工具 |
| 主会话全部记录、各分支共同参与汇总 | `runner.ts` 的 `usageTotals`；`core/usage-totals.ts` | 使用完整 entries，不遍历当前压缩上下文；没有会话时返回 null |
| 主回复、主摘要和子代理分别归入 parent、summarizer、child | `core/usage-totals.ts` 的 `applyEntry`／`snapshot` | 主摘要来自 compaction／branchSummary；不扫描子会话文件 |
| 子代理按本次运行的新报告记账 | `core/subagent.ts`；`core/usage-ledger.ts`；`core/tools/task.ts` | 恢复新运行使用空账本和新 attemptId；自身压缩用量随 TaskRecord 合计交回 |
| 同一次子代理运行的重复记录只算一次 | `core/usage-totals.ts` | 按 attemptId 去重，不对不同请求中重复发送的内容去重 |
| 失败、硬退出或记录未保存可能漏计 | `runner.ts`；`core/compaction.ts`；`core/tools/task.ts` | 缺报提示只覆盖程序识别到的问题；没有提示不能证明完整 |
| 按声明的完整模型身份分组计价 | `core/usage-totals.ts` 的 `addToModel`／`priceUsageTotals` | 主回复和摘要取 modelReference，子代理取 binding.reference；缺身份不猜测价格 |
| 单价按提供商隔离，目录优先、静态表兜底 | `provider/models.ts` 的 `costFor` | 使用查看时可用的费率，没有历史价格快照；尚未建模按单次请求长度变化的阶梯价格 |
| 缺价格、缺用量和订阅分别提示 | `format.ts` 的 `usageMoneySegment`；`repl/repl.ts` | 未定价数量不等于零消耗；订阅金额不代表额外扣款或月费 |
| CH 使用整个会话累计的原始输入计数 | `repl/repl.ts` 的 `refreshFooter` | R / (普通输入 + R + W)，不含输出，不平均各次百分比；正输入且 R 为零显示 0.0%，零输入不显示 |

## 官方协议资料

- [DeepSeek Chat Completions 接口](https://api-docs.deepseek.com/zh-cn/api/create-chat-completion/)：完整输入、缓存命中／未命中，以及 include_usage 的流末尾统计。
- [DeepSeek 上下文硬盘缓存](https://api-docs.deepseek.com/zh-cn/guides/kv_cache/)：默认缓存、前缀匹配、构建时间与尽力而为的命中。
- [OpenAI Prompt caching](https://developers.openai.com/api/docs/guides/prompt-caching)：缓存输入与缓存写入采用相应费率；不能将完整输入按普通单价计费后再次叠加缓存费用。当前 Ink 两个 OpenAI 适配器尚未转换对应的缓存写入计数。

## 教学数字与计价口径

四次主调用的普通输入／缓存读取／输出分别为：

| 调用 | 普通输入 | 缓存读取 | 输出 | 完整输入 |
| --- | ---: | ---: | ---: | ---: |
| 1 | 8,200 | 0 | 100 | 8,200 |
| 2 | 1,700 | 8,300 | 500 | 10,000 |
| 3 | 300 | 10,500 | 100 | 10,800 |
| 4 | 600 | 10,900 | 300 | 11,500 |

- 主调用合计：10,800／29,700／1,000。
- 子代理本次运行含自身上下文压缩：5,000／6,000／900。
- 额外主会话压缩：4,000／0／300。
- 会话合计：19,800／35,700／2,200。各报告没有单独的缓存写入量，按零参与汇总，不表示服务从未创建缓存。
- 模型 A 教学费率为普通输入 2、缓存读 0.2、输出 8；B 为 1、0.1、4，单位均为美元／百万 Token；不另设缓存创建费。
- A 组 14,800／29,700／1,300，费用 $0.04594；B 组 5,000／6,000／900，费用 $0.00920；合计 $0.05514。
- 第二次主调用 $0.00906，首次 $0.0172。A→B→C 的独立教学例子合计 $0.154，不纳入登录排查会话。
- 累计 CH = 35,700 / (19,800 + 35,700 + 0) ≈ 64.3%。显示为 `↑20k ↓2.2k R36k CH64.3% $0.055`。

## 定稿复核与验证边界

- 已分段核对报告解析、保存、账本、TaskRecord、全部会话记录汇总、按模型估价及界面格式；未发现旧单条回复 CH 口径遗留。
- 已使用 Node 原生 TypeScript 导入共享教学数据，断言四次报告、相邻请求组成、来源与模型分组、金额和 CH；全部通过。这是数据演算检查，不是真实 Agent 执行。
- 当前沙箱禁止临时 loopback 监听，定向 TUI 测试停在初始化并已终止；不将源码和测试用例阅读称为测试运行通过。
- 没有修改 Ink，没有调用真实模型，也没有核对真实账单。
- 正式发布从远端 main 的独立工作区准备，只纳入第 14 篇及必要依赖。正文相对审定稿仅改变发布状态和首次发布时间。


## 正式发布检查（2026-10-17）

- `npm run lint`、`npm run format:check` 通过；设置 `SITE_URL=https://zheteng-garden.pages.dev` 的 `npm run build` 通过，Astro 0 errors、0 warnings、1 个既有 hint，构建 41 页，Pagefind 索引 18 篇。
- 文章 canonical、56 个不同站内路径／锚点、首页、专题、RSS、站点地图与搜索片段均核对通过。未将第 10 章下篇或第 15 篇草稿带入产物。
- 浏览器验证四次调用切换、完整历史和字段报告默认展示、图内没有复制按钮；1600、1280、390、320 像素宽度的明暗主题均无整页横向溢出。320 像素禁用 JavaScript 后保留全部四次调用，浏览器无错误或警告；实际搜索可以检索到本篇。
- 发布范围独立审查通过：正文、两个图示、共享数据、图内复制按钮跳过判断及本篇目录更新一致，未包含其他在途内容。
- 发布前另对照 Ink 新增 `056ab28`：仅涉及 Codex 工具参数组装，未改变本篇核对的用量映射、汇总、价格或 CH 路径，因此保留已审计基线 `f9d001c`。
