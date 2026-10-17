# 第 10 章下篇：子代理续跑核对记录

本文档保存实现依据与验证结果，不进入网站正文；本文件随文章源码公开。

## 范围与基线

- 初次核对日期：2026-10-16；定稿与发布检查：2026-10-18。
- Ink：0.4.0，提交 `f00d480539030105bd8890e7b33cec34c4875db1`；开始核对时源码工作区干净，本次不修改 Ink。
- 文章：`src/content/posts/coding-agent-10-child-resume.mdx`，发布时设为 `draft: false`。当前标题《子代理续跑——怎样恢复历史并继续执行？》，沿用目录既有问题与 postId。
- 读者问题：已有子会话之后，还需要怎样核对运行条件、修复中断记录并协调写入，才能继续执行？
- 前置：05 的会话保存与有效上下文，10 上的委派和基础 resume 入口，10 中的并发、文件锁与 worktree。下篇不重复持久化格式、调度器与副本创建、清理的完整实现。
- 场景：继续调查登录测试，修改文件的中断案例用于解释未知工具结果。参数、消息顺序与路径结构示意均标为教学示例，不是实际模型运行日志。
- 单篇完成：条件核对 → 租约 → 历史修复 → 新一轮运行。六节各自围绕读者问题，静态流程图辅助建立顺序，无在线模型调用或新增交互框架。

- 后续只读复核基线：`76d65cd067e0825700638c3fc42ab3cc853d17a2`，覆盖系统提示词、租约、历史修复、结果提取和返回路径；本次不修改 Ink。

## 实现证据

路径相对于 Ink 仓库。设计文档只用于定位已知限制，最终说法以当前实现和直接调用者为准。

| 文章结论 | 来源文件与符号 | 条件或限制 | 验证方式 |
| --- | --- | --- | --- |
| resume 必须有非空新要求、持久化开关和父会话，不能同时传 agent/worktree | `src/core/child-resume.ts:checkResumeArgs`；`tools/task.ts:execute` resume 分支 | 显式 `worktree: false` 也拒绝；resume 是 ID 不是任意文件路径 | 源码；child-resume 参数测试 |
| 启动条件写入子会话头部，终态 TaskRecord 随工具结果存入父会话 | `child-launch.ts:buildChildLaunch`；`tools/task.ts` 新建分支及 `finish`；`task-record.ts:buildTaskRecord`；`loop.ts:runTool` | 没有 launch 的旧子会话可读但不能续跑；taskRecord 不发送给模型 | 源码；child-launch/task-record 测试 |
| 查找校验子会话目录、唯一 ID、父子归属、结构和 launch | `child-launch.ts:findChildByLaunch`、`effectiveHistoryProblem` | 子文件符号链接会被拒绝；结构检查不是普通会话兼容读取的通用规则 | 源码；child-launch 测试 |
| 父会话全部条目的 launched 运行记录提供 settled 状态，成功不是前提 | `child-launch.ts:validateChildContinuation`；`task-record.ts:collectTaskRecords` | 无记录不能判断仍在运行还是写回前退出；已有旧终态不代替当下租约检查 | 源码；child-launch-validation/child-resume 测试 |
| 版本、系统与角色正文、来源、扩展、工具集合及目录等进行比较 | `child-launch.ts:validateChildContinuation`；`child-resume.ts:assembleCurrentChildEnvironment`；`runner.ts:getLaunchEnvironment` | 当前环境事实来自已加载值；不是每次重新读取全部配置；只归一化匹配整行格式的日期 | 源码；条件变化矩阵测试 |
| 模型沿用启动绑定，接入分组只比较名字 | `child-resume.ts:providerMismatch`；`tools/task.ts` 捕获 liveProvider 与 `launch.model` | 不比较完整 BASE_URL；不能写成已验证完整服务端点相同；同分组主模型切换不改变子模型 | 源码；child-resume provider mismatch/captured provider 测试 |
| 指纹不保证工具行为与完整执行环境一致 | `child-launch.ts:ExtensionModuleIdentity/canonicalTools`；`runner.ts:getLaunchEnvironment`；设计 SA-06 §7 / SA-07 §7.5 | 不覆盖扩展传递导入、同名远端工具行为、依赖、源码和外部服务；当前权限继续检查 | 源码；child-resume T6b |
| worktree 身份检查容许基线之后的正常提交，要求目录实际可执行且位于副本内部 | `worktree.ts:probeWorktreeIdentity`；`child-launch.ts:cwdDirectoryProblem/cwdInsideWorktree` | 创建 reflog 不可用时跳过该项并给诊断；目录被删则不能原地继续 | 源码；child-launch-validation worktree / child-resume F2 测试 |
| 租约协调同一子会话，不锁全仓库源文件 | `child-lease.ts:acquireChildLease/scanForBlocker`；`tools/task.ts` resume 分支 | 同机本地文件系统假设；两竞争者可能都拒绝，有限重试，不保证当轮有赢家 | 源码；lease 单元及多进程测试 |
| 可解析同机残留必须进程不活跃且超过宽限期才能回收，心跳异常触发取消 | `child-lease.ts:scanForBlocker/startHeartbeat/release`；`tools/task.ts` attemptAbort | 新鲜损坏候选阻塞，过期损坏候选可清理；跨机器候选拒绝；取消不回滚 | 源码；lease 测试 |
| 持有租约后重新查找，核对路径、launch、不为空，后续使用重开的 store | `tools/task.ts` reopened / canonicalJson 比较 | 保证看见在第一次查找和取租约之间完成的另一轮，不使用旧内存 leaf | 源码；child-resume SA-08/F1-a/F1-b |
| 先只读检查工具配对，之后修尾部、补 unknown，再重建有效历史 | `child-resume.ts:scanToolPairs/buildContinuationHistory`；`session/store.ts:repairTornFinalLine` | 只补最后 assistant 批次，后面只能有 toolResult；重复 ID/结果、结果先于对应调用、跨轮缺口拒绝；批内结果乱序合法 | 源码；child-resume T14/T16/T17/F5 |
| 无效尾行按字节截断，有效但缺换行的末行补换行保留 | `session/store.ts:repairTornFinalLine` | 配对拒绝先发生，拒绝不修文件；不能推广为普通会话自动修复 | 源码；child-resume R2 |
| 恢复不重放工具，用已有有效历史与新 prompt 启动新循环 | `tools/task.ts:runSubagent` resume 参数；`subagent.ts:history/launchLoop` | 有压缩则使用摘要和 retainedTail；initialFloor 带回估算边界 | 源码；child-resume R1/T13/T22 |
| 返回文本限定为本次产生，旧报告不作为本次结果 | `subagent.ts:seeded/settled` | 无新文本时返回无文本，部分文本仍可能是进展说明 | 源码；child-resume T31/T32 |
| 新 attempt 保留 childId，超时与 thinking 可重新解析，worktree 续跑不自动删除 | `tools/task.ts:attemptId/resumeTimeout/resumeThinking/finish`、结果组合 | 仍沿用当前工具前置检查；结果返回不等于自动合并代码 | 源码；child-resume T26/T26b/SA-09 |


## 验证范围

- 2026-10-16 曾执行 Ink 的 7 个定向测试文件，共 156 项通过；测试使用 scripted provider 与本地夹具，不代表真实模型任务实测。
- 本次发布保留用户确认的正文和静态流程图，不重跑 Ink 测试或调用真实模型。发布检查针对文章格式、站点构建、导航、链接、搜索与页面显示。
- 首次正式发布时间设为 `2026-10-17T16:51:26Z`，北京时间 2026-10-18；草稿编写日期不作为首次发布日期。

## 发布前验证（2026-10-18）

- 从最新 origin/main 建立隔离发布分支，仅纳入本篇正文、流程图、精简的实现核对记录、目录与 README，以及上、中篇通往下篇的链接；用户确认的文章正文与流程图逐字保留，仅修改正式发布元信息。
- npm run lint、npm run format:check 和正式 SITE_URL 下的 npm run build 均通过；Pagefind 索引 19 篇文章。
- 本页 47 个站内链接与锚点、canonical、首页、专题、标签页、RSS、sitemap、上中篇回链和 JSON 示例通过；第 15 篇仍未发布。
- 1600、1280、390、320 像素的明暗主题共 8 种显示检查通过：页面无横向溢出、标题和流程图在内容区内、5 个步骤完整、无页面脚本异常，宽表在手机单独滚动；禁用 JavaScript 时仍可读取 6 个主节和 5 个步骤。
- 使用本地正式构建的 Pagefind 模块检索“子代理续跑”，能够命中本篇标题和摘要。
