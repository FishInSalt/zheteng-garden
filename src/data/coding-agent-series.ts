/** Reading order follows conceptual dependencies, not commit order. */
export const codingAgentChapters = [
  {
    number: "00",
    title: "为什么开发 imp",
    question: "背景、架构全貌与系列导读",
    postId: "coding-agent-00-under-the-hood",
  },
  {
    number: "01",
    title: "最小 Agent 与执行循环",
    question: "怎样反复调用模型和工具，让任务继续进行？",
    postId: "coding-agent-01-agent-loop",
  },
  {
    number: "02 上",
    title: "模型接入：请求与消息转换",
    question: "怎样把消息、工具说明和执行结果发给模型？",
    postId: "coding-agent-02-model-protocol",
  },
  {
    number: "02 下",
    title: "模型接入：流式响应与组装",
    question: "怎样把响应片段组装成循环可用的完整回复？",
    postId: "coding-agent-02-streaming",
  },
  {
    number: "03",
    title: "工具系统：定义、调用与反馈",
    question: "怎样通过统一接口接入工具、执行请求并返回结果？",
    postId: "coding-agent-03-tools",
  },
  {
    number: "04",
    title: "上下文管理：信息组织与历史压缩",
    question: "每次给模型什么信息，内容过长时怎么办？",
    postId: "coding-agent-04-context",
  },
  {
    number: "05",
    title: "会话与持久化：保存记录，恢复任务",
    question: "怎样保存任务记录，并在重新打开后恢复历史？",
    postId: "coding-agent-05-sessions",
  },
  {
    number: "06",
    title: "交互与运行控制",
    question: "怎样处理用户输入、反馈运行进展，并响应中断？",
    postId: "coding-agent-06-interaction",
  },
  {
    number: "07",
    title: "终端界面——回答与状态怎样实时刷新",
    question: "终端怎样逐段显示回答，并实时刷新工具和子代理状态？",
    postId: "coding-agent-07-ui",
  },
  {
    number: "08",
    title: "权限与信任——怎样控制 Agent 的执行风险",
    question: "怎样控制项目资源加载和工具执行的风险，并限制操作可能造成的影响？",
    postId: "coding-agent-08-trust",
  },
  {
    number: "09",
    title: "扩展机制",
    question: "怎样增加新工具、命令和自定义处理逻辑？",
    postId: "coding-agent-09-extensions",
  },
  {
    number: "10",
    title: "子代理与并发协作",
    question: "怎样委派任务、控制预算并处理文件竞争？",
    postId: "coding-agent-10-subagents",
  },
  {
    number: "11",
    title: "测试与评估",
    question: "怎样检查各模块是否按预期工作，以及 Agent 是否完成了任务？",
    postId: "coding-agent-11-evaluation",
  },
] as const;

/** Dates describe checked-in milestones; they do not estimate development effort. */
export const impMilestones = [
  {
    date: "2026-08-25",
    period: "2026.08.25",
    title: "跑通最小闭环，补齐文件工具",
    work: "接入模型、实现执行循环与 print 模式；从 bash/read 扩展到 edit/write、搜索、文件锁、项目规范和日志。",
    lesson: "先让模型真正完成一次文件操作，再处理编辑的可靠性。",
    commits: [
      { id: "46a75481545644ef7964326ee67cd5c57d221696", label: "最小 Agent" },
      {
        id: "8d133466c0c533b233b39020953c43518312c7b9",
        label: "工具与工程基础",
      },
    ],
  },
  {
    date: "2026-08-27",
    period: "08.27—08.28",
    title: "让任务能够保存和继续",
    work: "加入 JSONL 会话、恢复、token 统计与自动摘要；修复中断后的消息配对和压缩切点问题。",
    lesson: "保存历史，还要保证恢复后的历史能再次发送给模型。",
    commits: [
      { id: "514271ce7b826249b170c84fabd1f7b9a094c839", label: "会话与压缩" },
      { id: "9b432c61b36c9eb83a5ee516e9272a94fdef64ba", label: "恢复路径修复" },
    ],
  },
  {
    date: "2026-08-30",
    period: "08.30",
    title: "从一次性命令走向持续交互",
    work: "实现交互式 REPL，接入多轮输入、斜杠命令、流式显示与中断处理。",
    lesson: "输入、执行与退出必须在同一个任务生命周期里配合。",
    commits: [
      { id: "4f136e797362226eed32f0da58f11385c2932a34", label: "交互模式" },
    ],
  },
  {
    date: "2026-09-01",
    period: "09.01",
    title: "把新能力接入扩展系统",
    work: "完成扩展加载、工具与命令注册、上下文注入和事件钩子；加入权限拦截案例。",
    lesson: "明确扩展的接入位置，才能控制故障影响与执行边界。",
    commits: [
      {
        id: "7719ae11f257891f09f2ad04671056575fedd670",
        label: "扩展钩子与权限门",
      },
    ],
  },
  {
    date: "2026-09-03",
    period: "09.03—09.07",
    title: "委派子任务，并处理协作边界",
    work: "加入子代理、并发与命名配置，再补 worktree、子上下文压缩、交互确认、项目信任与审查修复。",
    lesson: "上下文独立、文件独立和权限隔离是不同的问题。",
    commits: [
      { id: "2a3ec71186aac3e3f6ea6438609dcba1257d0fb2", label: "子代理" },
      { id: "a1a4621783385937a384f64b5e9e312124c8adfa", label: "worktree" },
    ],
  },
  {
    date: "2026-09-08",
    period: "09.08—09.12",
    title: "完善终端体验与多模型接入",
    work: "迁移到 pi-tui，完善状态与折叠显示；加入多种模型接入、会话分支、输入队列，以及思考内容的显示控制。",
    lesson: "功能越多，越需要保持核心协议与交互状态的一致性。",
    commits: [
      { id: "07a398276d870dd5808e2d09b5258af66488347c", label: "TUI 迁移" },
      { id: "22cf44874afec0ac2d407a2b2cc082f57eebd400", label: "多模型接入" },
    ],
  },
] as const;
