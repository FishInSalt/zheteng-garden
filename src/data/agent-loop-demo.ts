export interface LoopMessage {
  role: "user" | "assistant" | "toolResult";
  text: string;
}
interface LoopStep {
  title: string;
  detail: string;
  line: number;
  turns: number;
  append?: LoopMessage[];
  stop?: "completed" | "max_iterations" | "aborted";
}
interface LoopScenario {
  id: string;
  label: string;
  limit: number;
  steps: LoopStep[];
}

export const loopCode = [
  "history.push(user);",
  "while (true) {",
  "  if (signal?.aborted) return aborted;",
  "  const assistant = await streamAssistant({ request: { messages: history, tools, ... }, ... });",
  "  if (assistant === null) return aborted;",
  "  history.push(assistant); turns++;",
  "  const toolCalls = assistant.blocks.filter(...);",
  "  if (toolCalls.length === 0) return completed;",
  "  if (turns >= maxIterations) {",
  "    // 补齐未执行结果，并写入 history",
  "    return max_iterations;",
  "  }",
  "  const results = [];",
  "  await executeToolBatch(..., results);",
  "  fillMissingToolResults(toolCalls, results, ...);",
  '  history.push({ role: "toolResult", results });',
  "}",
];

const user: LoopStep = {
  title: "保存用户请求",
  detail: "请求先进入 history。模型调用尚未开始。",
  line: 1,
  turns: 0,
  append: [{ role: "user", text: "读取 README.md，告诉我项目怎样启动。" }],
};
const request: LoopStep = {
  title: "第一次调用模型",
  detail: "把用户请求、系统指令和工具定义交给模型。此时还没有文件内容。",
  line: 4,
  turns: 0,
};
const read: LoopStep = {
  title: "模型请求读取文件",
  detail:
    "收到第 1 次完整回复，写入 assistant 消息，turns 变为 1。工具请求本身还没有读取文件。",
  line: 6,
  turns: 1,
  append: [
    { role: "assistant", text: 'toolCall t1 · read({ path: "README.md" })' },
  ],
};
const execute: LoopStep = {
  title: "执行工具调用",
  detail:
    "read 返回“启动命令：npm run dev”。结果暂存在本批调用的 results 中，还没有写入 history。",
  line: 14,
  turns: 1,
};
const feedback: LoopStep = {
  title: "把工具结果加入消息历史",
  detail:
    "工具结果通过 t1 对应之前的请求。下一次调用模型时，这条结果会随历史一起发送。",
  line: 16,
  turns: 1,
  append: [{ role: "toolResult", text: "t1 · 启动命令：npm run dev" }],
};
const callAgain: LoopStep = {
  title: "带着新信息再调用模型",
  detail:
    "执行循环把包含工具结果的 history 再次交给模型接入层。模型这一次能看到读取到的文件内容。",
  line: 4,
  turns: 1,
};
const answer: LoopStep = {
  title: "保存最终回复",
  detail: "第 2 次完整回复只有文本，没有新的工具请求。",
  line: 6,
  turns: 2,
  append: [
    { role: "assistant", text: "README 中给出的启动命令是 npm run dev。" },
  ],
};
const done: LoopStep = {
  title: "本次运行结束",
  detail:
    "没有工具请求，返回 completed。这个状态说明本次运行正常结束；答案是否正确还需要验证。",
  line: 8,
  turns: 2,
  stop: "completed",
};

export const loopScenarios: LoopScenario[] = [
  {
    id: "normal",
    label: "正常结束",
    limit: 4,
    steps: [user, request, read, execute, feedback, callAgain, answer, done],
  },
  {
    id: "error",
    label: "工具报错后重试",
    limit: 4,
    steps: [
      user,
      request,
      {
        ...read,
        detail: "模型第 1 次回复给出了一个不存在的路径。",
        append: [
          {
            role: "assistant",
            text: 'toolCall t1 · read({ path: "README.txt" })',
          },
        ],
      },
      {
        ...execute,
        title: "读取失败",
        detail:
          "工具返回文件不存在的错误。执行循环把错误当作一条可反馈的结果。",
      },
      {
        ...feedback,
        title: "错误进入历史",
        detail:
          "isError 标记失败，t1 标记是哪一次调用失败。后续路径由模型根据错误信息重新选择。",
        append: [
          {
            role: "toolResult",
            text: "t1 · isError: true · README.txt 不存在",
          },
        ],
      },
      {
        ...callAgain,
        detail:
          "模型收到失败结果，可以据此调整下一步；这个模拟场景预设它会更正路径。",
      },
      {
        ...read,
        title: "模型更正路径",
        detail: "第 2 次回复中的请求有自己的 ID t2。重试是一次新的工具调用。",
        turns: 2,
        append: [
          {
            role: "assistant",
            text: 'toolCall t2 · read({ path: "README.md" })',
          },
        ],
      },
      { ...execute, turns: 2 },
      {
        ...feedback,
        turns: 2,
        detail: "成功结果对应 t2；t1 的错误仍留在历史中。",
        append: [{ role: "toolResult", text: "t2 · 启动命令：npm run dev" }],
      },
      { ...callAgain, turns: 2 },
      {
        ...answer,
        turns: 3,
        detail: "第 3 次回复给出文本答案，不再请求工具。",
      },
      { ...done, turns: 3 },
    ],
  },
  {
    id: "limit",
    label: "达到轮次上限",
    limit: 1,
    steps: [
      user,
      request,
      read,
      {
        title: "发现已达到上限",
        detail:
          "maxIterations = 1，第 1 次回复仍请求工具。执行循环在执行工具之前检查上限。",
        line: 9,
        turns: 1,
      },
      {
        title: "补齐未执行结果并停止",
        detail:
          "read 没有执行。为 t1 补上未执行的结果，然后返回 max_iterations。",
        line: 11,
        turns: 1,
        stop: "max_iterations",
        append: [
          {
            role: "toolResult",
            text: "t1 · isError: true · 未执行：已达到轮次上限",
          },
        ],
      },
    ],
  },
  {
    id: "abort",
    label: "两次工具执行之间中断",
    limit: 4,
    steps: [
      {
        ...user,
        append: [
          {
            role: "user",
            text: "读取 README.md 和 package.json，告诉我项目怎样启动。",
          },
        ],
      },
      { ...request, detail: "把用户要求和 read 工具的定义交给模型。" },
      {
        ...read,
        title: "模型一次请求两个工具",
        detail:
          "一条 assistant 消息请求读取两个文件，turns 只加 1。本场景按顺序执行这两个调用。",
        append: [
          {
            role: "assistant",
            text: 'toolCall t1 · read({ path: "README.md" })\ntoolCall t2 · read({ path: "package.json" })',
          },
        ],
      },
      {
        ...execute,
        title: "第一个工具完成后收到中断",
        detail:
          "t1 已返回 README 中的启动说明；中断信号在读取 package.json 前生效，批次停止。",
      },
      {
        title: "为未执行的 t2 补结果",
        detail:
          "保留 t1 的真实结果，为 t2 生成明确的未执行错误。此时结果仍在本批调用的 results 中。",
        line: 15,
        turns: 1,
      },
      {
        ...feedback,
        title: "写入完整的一批结果",
        detail: "同一条 toolResult 消息中包含两项结果。t1 和 t2 都有对应记录。",
        append: [
          {
            role: "toolResult",
            text: "t1 · 启动命令：npm run dev\nt2 · isError: true · 未执行：已中断",
          },
        ],
      },
      {
        title: "检测中断并退出",
        detail:
          "回到循环入口，返回 aborted。没有再次调用模型，也不会补写一段虚构的最终回答。",
        line: 3,
        turns: 1,
        stop: "aborted",
      },
    ],
  },
];
