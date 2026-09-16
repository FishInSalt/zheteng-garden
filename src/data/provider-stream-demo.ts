/** Stable code listing shared by all scenarios; helpers are explained in section 2. */
const providerCodeSections = [
  {
    id: "setup",
    code: "// provider.stream 内的核心流程；省略思考内容与用量统计。\nconst blocks = [];\nlet textBlock = null;\nconst toolByIndex = new Map();\nconst toolRawByIndex = new Map();\nlet stopReason = null;\nlet sawFinish = false;\n",
  },
  {
    id: "receive",
    code: "for await (const sse of abortSafe(\n  parseSse(response.body), request.signal\n)) {",
  },
  { id: "abort", code: "  if (request.signal?.aborted) return;" },
  { id: "choice", code: "  const choice = sse.data.choices?.[0];\n" },
  {
    id: "text",
    code: '  const content = choice?.delta?.content;\n  if (typeof content === "string" && content !== "") {\n    if (textBlock === null) {\n      textBlock = { type: "text", text: "" };\n      blocks.push(textBlock);\n    }\n    textBlock.text += content;\n    yield { type: "text_delta", text: content };\n  }\n',
  },
  {
    id: "tool",
    code: "  for (const tc of choice?.delta?.tool_calls ?? []) {\n    let block = toolByIndex.get(tc.index);\n    const name = tc.function?.name;",
  },
  {
    id: "newTool",
    code: '    if (block === undefined) {\n      block = {\n        type: "toolCall",\n        id: String(tc.id ?? `call_${tc.index}`),\n        name: String(name ?? ""), arguments: {},\n      };\n      toolByIndex.set(tc.index, block);\n      blocks.push(block);\n      toolRawByIndex.set(tc.index, "");\n      yield { type: "tool_call_start", id: block.id, name: block.name };',
  },
  {
    id: "toolName",
    code: '    } else if (name !== undefined && block.name === "") {\n      block.name = String(name);\n    }',
  },
  {
    id: "params",
    code: '    const fragment = tc.function?.arguments ?? "";\n    if (fragment !== "") {\n      toolRawByIndex.set(\n        tc.index, (toolRawByIndex.get(tc.index) ?? "") + fragment\n      );\n      yield { type: "tool_call_delta", id: block.id, jsonDelta: fragment };\n    }',
  },
  { id: "toolEnd", code: "  }\n" },
  {
    id: "finish",
    code: "  if (choice?.finish_reason != null) {\n    sawFinish = true;\n    stopReason = mapFinishReason(choice.finish_reason);\n  }",
  },
  { id: "loopEnd", code: "}\n" },
  {
    id: "parse",
    code: 'for (const [index, raw] of toolRawByIndex) {\n  const ours = toolByIndex.get(index);\n  if (ours !== undefined) {\n    ours.arguments = raw.trim() === "" ? {} : safeParseJson(raw);\n  }\n}\n',
  },
  { id: "endAbort", code: "if (request.signal?.aborted) return;" },
  {
    id: "missingFinish",
    code: 'if (!sawFinish) throw new Error("响应可能已被截断");',
  },
  {
    id: "emit",
    code: 'yield {\n  type: "message_end",\n  message: { role: "assistant", blocks, stopReason },\n};',
  },
] as const;
export type ProviderCodeSection = (typeof providerCodeSections)[number]["id"];
export const providerCodeLines = providerCodeSections
  .flatMap(section =>
    section.code.split("\n").map(text => ({ section: section.id, text }))
  )
  .map((line, index) => ({ ...line, number: index + 1 }));

export function describeActiveLines(
  sections: readonly ProviderCodeSection[]
): string {
  const numbers = providerCodeLines
    .filter(line => sections.includes(line.section))
    .map(line => line.number);
  const ranges: string[] = [];
  for (let i = 0; i < numbers.length; i++) {
    const start = numbers[i];
    let end = start;
    while (numbers[i + 1] === end + 1) end = numbers[++i];
    ranges.push(start === end ? `${start}` : `${start}–${end}`);
  }
  return `高亮：第 ${ranges.join("、")} 行`;
}

/** Teaching fixtures derived from the provider's assembly steps; no network I/O. */
interface ToolDelta {
  index: number;
  id?: string;
  function?: { name?: string; arguments?: string };
}
interface Chunk {
  choices: Array<{
    delta: { content?: string; tool_calls?: ToolDelta[] };
    finish_reason?: string;
  }>;
}
type Input = { chunk: Chunk } | { end: true } | { abort: true };
interface Block {
  type: "text" | "toolCall";
  text?: string;
  id?: string;
  name?: string;
  arguments?: unknown;
}
export interface ProviderStep {
  title: string;
  detail: string;
  activeSections: ProviderCodeSection[];
  incoming: string;
  cache: string;
  output: string;
  outcome: "waiting" | "ready" | "error" | "aborted";
}
const pretty = (value: unknown) => JSON.stringify(value, null, 2);
const call = (index: number, fragment: string, id?: string): Input => ({
  chunk: {
    choices: [
      {
        delta: {
          tool_calls: [
            {
              index,
              ...(id ? { id } : {}),
              function: {
                ...(id ? { name: "read" } : {}),
                arguments: fragment,
              },
            },
          ],
        },
      },
    ],
  },
});
const finish: Input = {
  chunk: { choices: [{ delta: {}, finish_reason: "tool_calls" }] },
};

function assemble(inputs: Input[]): ProviderStep[] {
  const blocks: Block[] = [];
  let textBlock: Block | undefined;
  const calls = new Map<number, Block>();
  const raw = new Map<number, string>();
  let sawFinish = false;
  let stopReason: string | null = null;
  const steps: ProviderStep[] = [
    {
      title: "等待第一条事件",
      detail: "HTTP 请求已成功。从完整 SSE 事件开始演示，不模拟网络字节拆分。",
      activeSections: ["receive"],
      incoming: "尚未收到事件",
      cache: "尚无文本或工具参数",
      output: "尚未产出 message_end；不会把片段作为完整消息写入 history。",
      outcome: "waiting",
    },
  ];
  for (const input of inputs) {
    let title = "";
    let detail = "";
    let activeSections: ProviderCodeSection[] = [];
    let incoming = "";
    let outcome: ProviderStep["outcome"] = "waiting";
    let output = "尚未产出 message_end；不会把片段作为完整消息写入 history。";
    if ("abort" in input) {
      title = "用户中断，结束接收";
      detail =
        "已有片段不构成完整回复。streamAssistant 检查中断信号后返回 null。";
      activeSections = ["abort"];
      incoming = "AbortSignal：aborted = true";
      outcome = "aborted";
      output = "不产出 message_end；执行循环以 aborted 结束。";
    } else if ("end" in input) {
      incoming = "响应流读取结束（不是新的 JSON 事件）";
      for (const [index, value] of raw) {
        const block = calls.get(index)!;
        try {
          block.arguments = value.trim() === "" ? {} : JSON.parse(value);
        } catch {
          block.arguments = {
            _parseError: "tool arguments were not valid JSON",
            raw: value.slice(0, 500),
          };
        }
      }
      if (!sawFinish) {
        title = "缺少结束原因，拒绝交付";
        detail =
          "即使参数已经能解析，也没有收到 finish_reason，接入层抛出截断错误。";
        activeSections = ["parse", "missingFinish"];
        outcome = "error";
        output = "抛出错误；不产出 message_end，不保存部分 assistant。";
      } else {
        title = "解析参数，交出完整回复";
        detail =
          "参数字符串变成对象。循环现在才能取得 assistant，后续仍要校验工具参数。";
        activeSections = ["parse", "emit"];
        outcome = "ready";
        output = pretty({
          type: "message_end",
          message: { role: "assistant", blocks, stopReason },
        });
      }
    } else {
      incoming = pretty(input.chunk);
      const choice = input.chunk.choices[0];
      const content = choice?.delta.content;
      if (content) {
        if (!textBlock) {
          textBlock = { type: "text", text: "" };
          blocks.push(textBlock);
        }
        textBlock.text += content;
        title = "保存文本，先交给显示层";
        detail = "text_delta 可以用于显示，但这次模型回复还没结束。";
        activeSections.push("text");
      }
      for (const tc of choice?.delta.tool_calls ?? []) {
        let block = calls.get(tc.index);
        const isNew = !block;
        if (!block) {
          block = {
            type: "toolCall",
            id: tc.id ?? `call_${tc.index}`,
            name: tc.function?.name ?? "",
            arguments: {},
          };
          calls.set(tc.index, block);
          raw.set(tc.index, "");
          blocks.push(block);
        }
        raw.set(
          tc.index,
          (raw.get(tc.index) ?? "") + (tc.function?.arguments ?? "")
        );
        title = `${isNew ? "建立" : "继续拼接"} index ${tc.index} 的工具请求`;
        detail = isNew
          ? `保存调用 ID ${block.id}。arguments 先作为字符串累积，尚不执行工具。`
          : `片段只追加到 index ${tc.index}；其他请求的参数保持原样。`;
        activeSections.push(
          "tool",
          ...(isNew ? ["newTool" as const] : []),
          "params"
        );
      }
      if (choice?.finish_reason) {
        sawFinish = true;
        stopReason = "tool_use";
        title = "记下结束原因，继续读到流结束";
        detail =
          "finish_reason 为 tool_calls。此时还可能有用量事件，本例接着进入流结束。";
        activeSections.push("finish");
      }
    }
    const cache = pretty({
      text: textBlock?.text ?? "",
      toolParameters: Array.from(raw, ([index, argumentsText]) => ({
        index,
        id: calls.get(index)?.id,
        name: calls.get(index)?.name,
        raw: argumentsText,
      })),
      sawFinish,
    });
    steps.push({
      title,
      detail,
      activeSections,
      incoming,
      cache,
      output,
      outcome,
    });
  }
  return steps;
}
export const providerScenarios = [
  {
    id: "normal",
    label: "读取 README",
    steps: assemble([
      { chunk: { choices: [{ delta: { content: "我先读一下 README。" } }] } },
      call(0, '{"path":"REA', "t1"),
      call(0, 'DME.md"}'),
      finish,
      { end: true },
    ]),
  },
  {
    id: "interleaved",
    label: "两次读取交错到达",
    steps: assemble([
      call(0, '{"path":"REA', "t1"),
      call(1, '{"path":"pack', "t2"),
      call(0, 'DME.md"}'),
      call(1, 'age.json"}'),
      finish,
      { end: true },
    ]),
  },
  {
    id: "truncated",
    label: "缺少结束原因",
    steps: assemble([
      call(0, '{"path":"REA', "t1"),
      call(0, 'DME.md"}'),
      { end: true },
    ]),
  },
  {
    id: "aborted",
    label: "用户中断",
    steps: assemble([call(0, '{"path":"REA', "t1"), { abort: true }]),
  },
];
