/** Teaching data, not a real model trace or a prediction of cache hits. */
export const loginInputPieces = [
  {
    id: "instructions",
    label: "系统指令与工具定义",
    tokens: 8000,
    detail: "任务规则和 read、edit、bash 等工具的定义。",
  },
  {
    id: "request",
    label: "用户任务（登录排查）",
    tokens: 200,
    detail: "用户输错密码后，页面没有出现错误提示。",
  },
  {
    id: "read-call",
    label: "第 1 次模型输出：读取文件的工具调用",
    tokens: 100,
    detail: "模型生成 read 调用；Agent 执行后再把结果发给模型。",
  },
  {
    id: "code",
    label: "读文件结果：登录组件代码",
    tokens: 1700,
    detail: "包括登录组件的代码与工具返回信息；已加入对话历史。",
  },
  {
    id: "edit-call",
    label: "第 2 次模型输出：分析与修改请求",
    tokens: 500,
    detail: "模型分析错误处理，并生成修改文件的工具参数。",
  },
  {
    id: "edit-result",
    label: "修改工具的执行结果",
    tokens: 300,
    detail: "Agent 已修改文件，工具返回修改是否成功等信息。",
  },
  {
    id: "test-call",
    label: "第 3 次模型输出：运行测试的工具调用",
    tokens: 100,
    detail: "模型生成 bash 调用，请求运行登录相关测试。",
  },
  {
    id: "test-result",
    label: "测试工具的执行结果",
    tokens: 600,
    detail: "包括测试输出与通过情况，供模型生成最终说明。",
  },
] as const;

export const loginModelCalls = [
  {
    id: "read",
    title: "请求读文件",
    requestTitle: "发送排查任务",
    responseTitle: "请求读文件",
    responseDetail: "读取登录组件代码，检查错误提示的实现。",
    inputPieceCount: 2,
    cachedPieceCount: 0,
    outputTokens: 100,
    outputTitle: "请求读取登录组件",
    outputPreview: 'read({"path":"src/pages/Login.tsx"})',
    actionTitle: "Agent 执行读文件工具",
    actionDetail: "返回登录组件代码。",
    toolResultLabel: "登录组件代码",
    toolResultTokens: 1700,
  },
  {
    id: "edit",
    title: "分析并请求修改",
    requestTitle: "发送登录组件代码",
    responseTitle: "分析结果并请求修改",
    responseDetail: "",
    inputPieceCount: 4,
    cachedPieceCount: 3,
    outputTokens: 500,
    outputTitle: "分析原因，请求修改代码",
    outputPreview:
      "错误被捕获后没有写入页面状态。\n调用 edit，为错误处理添加页面提示。",
    actionTitle: "Agent 执行修改工具",
    actionDetail: "返回文件修改结果。",
    toolResultLabel: "文件修改结果",
    toolResultTokens: 300,
  },
  {
    id: "test",
    title: "请求运行测试",
    requestTitle: "发送文件修改结果",
    responseTitle: "请求运行测试",
    responseDetail: "运行登录相关测试，验证修改结果。",
    inputPieceCount: 6,
    cachedPieceCount: 5,
    outputTokens: 100,
    outputTitle: "请求运行登录测试",
    outputPreview: 'bash({"command":"npm test -- login"})',
    actionTitle: "Agent 执行测试工具",
    actionDetail: "返回测试输出和通过情况。",
    toolResultLabel: "测试结果",
    toolResultTokens: 600,
  },
  {
    id: "answer",
    title: "说明修复结果",
    requestTitle: "发送测试结果",
    responseTitle: "修复说明",
    responseDetail: "",
    inputPieceCount: 8,
    cachedPieceCount: 7,
    outputTokens: 300,
    outputTitle: "说明修复结果",
    outputPreview: "已补充密码错误时的页面提示，登录相关测试通过。",
    actionTitle: "Agent 展示最终回答",
    actionDetail: "展示最终回答，任务结束。",
    toolResultLabel: "",
    toolResultTokens: 0,
  },
] as const;

export const loginCallReports = loginModelCalls.map(call => {
  const parts = loginInputPieces.slice(0, call.inputPieceCount);
  const cacheReadTokens = parts
    .slice(0, call.cachedPieceCount)
    .reduce((total, part) => total + part.tokens, 0);
  const totalInput = parts.reduce((total, part) => total + part.tokens, 0);
  return {
    totalInput,
    inputTokens: totalInput - cacheReadTokens,
    cacheReadTokens,
    outputTokens: call.outputTokens,
  };
});

export const loginCallTotals = loginCallReports.reduce(
  (totals, report) => ({
    inputTokens: totals.inputTokens + report.inputTokens,
    cacheReadTokens: totals.cacheReadTokens + report.cacheReadTokens,
    outputTokens: totals.outputTokens + report.outputTokens,
  }),
  { inputTokens: 0, cacheReadTokens: 0, outputTokens: 0 }
);
